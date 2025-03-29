import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';
import { log } from './vite';
import { storage } from './storage';
import { CompressionFormat, LibraryGame } from '@shared/schema';
import { Request, Response } from 'express';

/**
 * Compression job status tracker
 */
interface CompressionJob {
  appId: string;
  title: string;
  status: 'pending' | 'compressing' | 'completed' | 'failed';
  progress: number;
  format: CompressionFormat;
  startTime: Date;
  endTime?: Date;
  error?: string;
  outputPath?: string;
  totalBytes?: number;
  compressedBytes?: number;
}

// Track active compression jobs
const activeCompressionJobs = new Map<string, CompressionJob>();

/**
 * Enhanced Game Compressor class with progress tracking
 */
export class GameCompressor {
  /**
   * Get the status of all compression jobs
   */
  static getCompressionJobs(): CompressionJob[] {
    return Array.from(activeCompressionJobs.values());
  }

  /**
   * Get a specific compression job by app ID
   */
  static getCompressionJob(appId: string): CompressionJob | undefined {
    return activeCompressionJobs.get(appId);
  }

  /**
   * Compress a game from the library with progress tracking
   */
  static async compressGame(
    appId: string, 
    format: CompressionFormat = 'zip',
    compressionLevel: number = 6
  ): Promise<string | null> {
    try {
      // Check if there's already a compression job for this game
      if (activeCompressionJobs.has(appId)) {
        const existingJob = activeCompressionJobs.get(appId);
        if (existingJob && ['pending', 'compressing'].includes(existingJob.status)) {
          log(`Compression already in progress for appId: ${appId}`, 'compressor');
          return null;
        }
      }

      // Get the game from the library
      const game = await storage.getLibraryGameByAppId(appId);
      
      if (!game) {
        log(`Game with appId ${appId} not found in library`, 'compressor');
        return null;
      }
      
      // Check if the game installation path exists
      if (!fs.existsSync(game.installPath)) {
        log(`Game installation path does not exist: ${game.installPath}`, 'compressor');
        return null;
      }
      
      // Create directory for compressed files if it doesn't exist
      const compressedDir = path.join(path.dirname(game.installPath), 'compressed');
      if (!fs.existsSync(compressedDir)) {
        fs.mkdirSync(compressedDir, { recursive: true });
      }
      
      // Define the output file path
      const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
      const sanitizedTitle = game.title.replace(/[^a-zA-Z0-9]/g, '_');
      const outputPath = path.join(compressedDir, `${sanitizedTitle}_${timestamp}.${format}`);
      
      // Create a file to stream archive data to
      const output = fs.createWriteStream(outputPath);
      
      // Create archive based on format
      const archive = this.createArchive(format, compressionLevel);
      
      // Initialize the compression job status
      const compressionJob: CompressionJob = {
        appId,
        title: game.title,
        status: 'pending',
        progress: 0,
        format,
        startTime: new Date(),
        outputPath
      };
      
      activeCompressionJobs.set(appId, compressionJob);
      
      // Update job status to compressing
      compressionJob.status = 'compressing';
      activeCompressionJobs.set(appId, compressionJob);
      
      // Get the total size of files to compress
      const totalSize = await this.calculateDirectorySize(game.installPath);
      compressionJob.totalBytes = totalSize;
      activeCompressionJobs.set(appId, compressionJob);
      
      // Listen for all archive data to be written
      return new Promise<string | null>((resolve, reject) => {
        // Track progress
        let processedBytes = 0;
        
        archive.on('entry', (entry) => {
          if (entry.stats && entry.stats.size) {
            processedBytes += entry.stats.size;
            if (compressionJob.totalBytes) {
              compressionJob.progress = Math.min(99, Math.floor((processedBytes / compressionJob.totalBytes) * 100));
              compressionJob.compressedBytes = processedBytes;
              activeCompressionJobs.set(appId, compressionJob);
            }
          }
        });
        
        output.on('close', async () => {
          try {
            // Get file sizes
            const stats = fs.statSync(outputPath);
            const sizeInBytes = stats.size;
            const formattedSize = this.formatBytes(sizeInBytes);
            
            // Update the job status
            compressionJob.status = 'completed';
            compressionJob.progress = 100;
            compressionJob.endTime = new Date();
            activeCompressionJobs.set(appId, compressionJob);
            
            // Update the game in the library with compression info
            await storage.updateGameCompressionInfo(appId, {
              isCompressed: true,
              compressedSize: formattedSize,
              compressedPath: outputPath,
              compressionType: format,
              compressionDate: new Date()
            });
            
            log(`Compression complete: ${outputPath} (${formattedSize})`, 'compressor');
            resolve(outputPath);
          } catch (error) {
            log(`Error updating compression info: ${error}`, 'compressor');
            
            // Update the job status to failed
            compressionJob.status = 'failed';
            compressionJob.error = error instanceof Error ? error.message : String(error);
            compressionJob.endTime = new Date();
            activeCompressionJobs.set(appId, compressionJob);
            
            resolve(outputPath); // Still return the path even if the DB update fails
          }
        });
        
        archive.on('error', (err) => {
          log(`Archive error: ${err}`, 'compressor');
          
          // Update the job status to failed
          compressionJob.status = 'failed';
          compressionJob.error = err.message;
          compressionJob.endTime = new Date();
          activeCompressionJobs.set(appId, compressionJob);
          
          reject(err);
        });
        
        // Pipe archive data to the file
        archive.pipe(output);
        
        // Add the directory contents to the archive
        archive.directory(game.installPath, false);
        
        // Finalize the archive
        archive.finalize();
      });
    } catch (error) {
      log(`Error compressing game: ${error}`, 'compressor');
      
      // Update the job status to failed if it exists
      const compressionJob = activeCompressionJobs.get(appId);
      if (compressionJob) {
        compressionJob.status = 'failed';
        compressionJob.error = error instanceof Error ? error.message : String(error);
        compressionJob.endTime = new Date();
        activeCompressionJobs.set(appId, compressionJob);
      }
      
      return null;
    }
  }
  
  /**
   * Create an appropriate archive based on the format
   */
  private static createArchive(format: CompressionFormat, level: number): archiver.Archiver {
    switch (format) {
      case 'zip':
        return archiver('zip', { zlib: { level } });
      case 'tar':
        return archiver('tar', { gzip: true, gzipOptions: { level } });
      case '7z': 
        // 7z format isn't directly supported by archiver
        // Would need a different library or external process call
        // Falling back to zip for now
        return archiver('zip', { zlib: { level } });
      default:
        return archiver('zip', { zlib: { level } });
    }
  }
  
  /**
   * Format bytes to human-readable format
   */
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  /**
   * Calculate the total size of a directory recursively
   */
  private static async calculateDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;
    
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        totalSize += await this.calculateDirectorySize(filePath);
      } else {
        totalSize += stats.size;
      }
    }
    
    return totalSize;
  }
}

/**
 * Get a list of all compressed games in the library
 */
export async function getCompressedGames(): Promise<LibraryGame[]> {
  const allGames = await storage.getAllLibraryGames();
  return allGames.filter(game => game.isCompressed);
}

/**
 * Handle file download request for compressed game
 */
export function handleCompressedGameDownload(req: Request, res: Response) {
  const { path: filePath } = req.query;
  
  if (!filePath || typeof filePath !== 'string') {
    return res.status(400).json({ message: 'Missing file path parameter' });
  }
  
  // Verify that the file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'File not found' });
  }
  
  // Get file details
  const stats = fs.statSync(filePath);
  const fileName = path.basename(filePath);
  
  // Set appropriate headers
  res.setHeader('Content-Length', stats.size);
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  
  // Stream the file to the response
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
  
  fileStream.on('error', (error) => {
    log(`Error streaming file: ${error}`, 'compressor');
    res.end();
  });
}

/**
 * Get compression job status
 */
export function getCompressionJobStatus(req: Request, res: Response) {
  const { appId } = req.params;
  
  if (!appId) {
    return res.status(400).json({ message: 'Missing app ID parameter' });
  }
  
  const job = GameCompressor.getCompressionJob(appId);
  
  if (!job) {
    return res.status(404).json({ message: 'Compression job not found' });
  }
  
  res.json(job);
}

/**
 * Get all compression jobs
 */
export function getAllCompressionJobs(_req: Request, res: Response) {
  const jobs = GameCompressor.getCompressionJobs();
  res.json(jobs);
}