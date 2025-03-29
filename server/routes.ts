import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import * as fs from 'fs';
import * as path from 'path';
import { storage } from "./storage";
import { z } from "zod";
import { insertGameSchema, insertDownloadSchema, insertSettingsSchema, CompressionFormat } from "@shared/schema";
import { extractAppIdFromUrl, getGameInfo } from "./game-info";
import { downloadGame, cancelDownload, pauseDownload, testSteamCmdConnection, submitSteamGuard } from "./steamcmd";
import { 
  GameCompressor, 
  getCompressedGames, 
  handleCompressedGameDownload,
  getCompressionJobStatus,
  getAllCompressionJobs
} from "./compressor";
import { log } from "./vite";

// For active downloads management
const activeDownloadJobs = new Map<number, NodeJS.Timeout>();

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // ===== Game Info Routes =====
  
  // Get game info from Steam store URL or app ID
  app.get('/api/games/info', async (req: Request, res: Response) => {
    try {
      const { url } = req.query;
      
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ message: 'Steam URL or App ID is required' });
      }
      
      const appId = extractAppIdFromUrl(url);
      
      if (!appId) {
        return res.status(400).json({ message: 'Invalid Steam URL or App ID' });
      }
      
      const gameInfo = await getGameInfo(appId);
      
      if (!gameInfo) {
        return res.status(404).json({ message: 'Game information not found' });
      }
      
      // Store the game info in our database
      const game = await storage.upsertGame(gameInfo);
      
      res.json(game);
    } catch (error) {
      log(`Error in /api/games/info: ${error instanceof Error ? error.message : String(error)}`, 'api');
      res.status(500).json({ message: 'Failed to fetch game information' });
    }
  });

  // ===== Download Management Routes =====
  
  // Get all downloads
  app.get('/api/downloads', async (_req: Request, res: Response) => {
    try {
      const downloads = await storage.getAllDownloads();
      res.json(downloads);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch downloads' });
    }
  });
  
  // Get active downloads
  app.get('/api/downloads/active', async (_req: Request, res: Response) => {
    try {
      const downloads = await storage.getActiveDownloads();
      res.json(downloads);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch active downloads' });
    }
  });
  
  // Get queued downloads
  app.get('/api/downloads/queued', async (_req: Request, res: Response) => {
    try {
      const downloads = await storage.getQueuedDownloads();
      res.json(downloads);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch queued downloads' });
    }
  });
  
  // Add game to download queue
  app.post('/api/downloads', async (req: Request, res: Response) => {
    try {
      const downloadData = insertDownloadSchema.safeParse(req.body);
      
      if (!downloadData.success) {
        return res.status(400).json({ message: 'Invalid download data' });
      }
      
      // Check if the game is already in the queue
      const existingDownload = await storage.getDownloadByAppId(downloadData.data.appId);
      
      if (existingDownload) {
        return res.status(409).json({ 
          message: 'This game is already in your download queue',
          download: existingDownload
        });
      }
      
      const download = await storage.createDownload(downloadData.data);
      
      // Process download queue after adding
      processDownloadQueue();
      
      res.status(201).json(download);
    } catch (error) {
      res.status(500).json({ message: 'Failed to add download to queue' });
    }
  });
  
  // Update download queue order
  app.post('/api/downloads/queue/reorder', async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        order: z.array(z.number())
      });
      
      const data = schema.safeParse(req.body);
      
      if (!data.success) {
        return res.status(400).json({ message: 'Invalid queue order data' });
      }
      
      const success = await storage.updateDownloadQueue(data.data.order);
      
      if (!success) {
        return res.status(500).json({ message: 'Failed to update queue order' });
      }
      
      res.json({ message: 'Queue order updated successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to update queue order' });
    }
  });
  
  // Pause download
  app.post('/api/downloads/:id/pause', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const downloadId = parseInt(id);
      
      if (isNaN(downloadId)) {
        return res.status(400).json({ message: 'Invalid download ID' });
      }
      
      const download = await storage.getDownloadById(downloadId);
      
      if (!download) {
        return res.status(404).json({ message: 'Download not found' });
      }
      
      if (download.status !== 'downloading') {
        return res.status(400).json({ message: 'Can only pause active downloads' });
      }
      
      // Pause the actual download
      pauseDownload(downloadId);
      
      // Update the download status in storage
      const updatedDownload = await storage.updateDownload(downloadId, { status: 'paused' });
      
      // Clear the active job if it exists
      const interval = activeDownloadJobs.get(downloadId);
      if (interval) {
        clearInterval(interval);
        activeDownloadJobs.delete(downloadId);
      }
      
      // Process queue to start next download
      processDownloadQueue();
      
      res.json(updatedDownload);
    } catch (error) {
      res.status(500).json({ message: 'Failed to pause download' });
    }
  });
  
  // Resume download
  app.post('/api/downloads/:id/resume', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const downloadId = parseInt(id);
      
      if (isNaN(downloadId)) {
        return res.status(400).json({ message: 'Invalid download ID' });
      }
      
      const download = await storage.getDownloadById(downloadId);
      
      if (!download) {
        return res.status(404).json({ message: 'Download not found' });
      }
      
      if (download.status !== 'paused') {
        return res.status(400).json({ message: 'Can only resume paused downloads' });
      }
      
      // Update download status to queued
      await storage.updateDownload(downloadId, { status: 'queued', queuePosition: 0 });
      
      // Process queue to start next download
      processDownloadQueue();
      
      res.json({ message: 'Download queued for resumption' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to resume download' });
    }
  });
  
  // Cancel download
  app.post('/api/downloads/:id/cancel', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const downloadId = parseInt(id);
      
      if (isNaN(downloadId)) {
        return res.status(400).json({ message: 'Invalid download ID' });
      }
      
      const download = await storage.getDownloadById(downloadId);
      
      if (!download) {
        return res.status(404).json({ message: 'Download not found' });
      }
      
      // Cancel the actual download process if it's active
      if (download.status === 'downloading') {
        cancelDownload(downloadId);
        
        // Clear the active job if it exists
        const interval = activeDownloadJobs.get(downloadId);
        if (interval) {
          clearInterval(interval);
          activeDownloadJobs.delete(downloadId);
        }
      }
      
      // Update the download status in storage
      await storage.updateDownload(downloadId, { status: 'canceled' });
      
      // Process queue to start next download
      processDownloadQueue();
      
      res.json({ message: 'Download canceled successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to cancel download' });
    }
  });
  
  // Remove download from queue/history
  app.delete('/api/downloads/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const downloadId = parseInt(id);
      
      if (isNaN(downloadId)) {
        return res.status(400).json({ message: 'Invalid download ID' });
      }
      
      const download = await storage.getDownloadById(downloadId);
      
      if (!download) {
        return res.status(404).json({ message: 'Download not found' });
      }
      
      // Cancel the download if it's active
      if (download.status === 'downloading') {
        cancelDownload(downloadId);
        
        // Clear the active job if it exists
        const interval = activeDownloadJobs.get(downloadId);
        if (interval) {
          clearInterval(interval);
          activeDownloadJobs.delete(downloadId);
        }
      }
      
      // Delete the download
      await storage.deleteDownload(downloadId);
      
      // Process queue to start next download
      processDownloadQueue();
      
      res.json({ message: 'Download removed successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to remove download' });
    }
  });

  // ===== Game Library Routes =====
  
  // Get all library games
  app.get('/api/library', async (_req: Request, res: Response) => {
    try {
      const games = await storage.getAllLibraryGames();
      res.json(games);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch library games' });
    }
  });
  
  // Get a specific game from the library
  app.get('/api/library/:appId', async (req: Request, res: Response) => {
    try {
      const { appId } = req.params;
      
      if (!appId) {
        return res.status(400).json({ message: 'App ID is required' });
      }
      
      const game = await storage.getLibraryGameByAppId(appId);
      
      if (!game) {
        return res.status(404).json({ message: 'Game not found in library' });
      }
      
      res.json(game);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch library game' });
    }
  });
  
  // Delete a game from the library
  app.delete('/api/library/:appId', async (req: Request, res: Response) => {
    try {
      const { appId } = req.params;
      
      if (!appId) {
        return res.status(400).json({ message: 'App ID is required' });
      }
      
      const game = await storage.getLibraryGameByAppId(appId);
      
      if (!game) {
        return res.status(404).json({ message: 'Game not found in library' });
      }
      
      // Delete game files if they exist
      if (game.installPath && fs.existsSync(game.installPath)) {
        fs.rmSync(game.installPath, { recursive: true, force: true });
      }
      
      // Delete compressed file if it exists
      if (game.isCompressed && game.compressedPath && fs.existsSync(game.compressedPath)) {
        fs.unlinkSync(game.compressedPath);
      }
      
      // Remove from database
      await storage.deleteLibraryGame(appId);
      
      res.json({ message: 'Game removed from library successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to remove game from library' });
    }
  });

  // ===== Compression Routes =====
  
  // Get all compressed games
  app.get('/api/library/compressed', async (_req: Request, res: Response) => {
    try {
      const compressedGames = await getCompressedGames();
      res.json(compressedGames);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch compressed games' });
    }
  });
  
  // Start compressing a game
  app.post('/api/library/:appId/compress', async (req: Request, res: Response) => {
    try {
      const { appId } = req.params;
      
      if (!appId) {
        return res.status(400).json({ message: 'App ID is required' });
      }
      
      const game = await storage.getLibraryGameByAppId(appId);
      
      if (!game) {
        return res.status(404).json({ message: 'Game not found in library' });
      }
      
      // Validate compression format
      const schema = z.object({
        format: z.enum(['zip', 'tar', '7z']).optional(),
        compressionLevel: z.number().min(1).max(9).optional()
      });
      
      const result = schema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ message: 'Invalid compression options' });
      }
      
      // Get settings for default values
      const settings = await storage.getSettings();
      
      // Start compression in the background
      const format = result.data.format || settings.compressionFormat as CompressionFormat || 'zip';
      const compressionLevel = result.data.compressionLevel || settings.compressionLevel || 6;
      
      // Don't await the compression, let it run in the background
      GameCompressor.compressGame(appId, format, compressionLevel);
      
      res.status(202).json({ 
        message: 'Compression started', 
        appId,
        format,
        compressionLevel
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to start compression' });
    }
  });
  
  // Get compression job status
  app.get('/api/library/compress/status/:appId', getCompressionJobStatus);
  
  // Get all compression jobs
  app.get('/api/library/compress/status', getAllCompressionJobs);
  
  // Download a compressed game file
  app.get('/api/library/compressed/download', handleCompressedGameDownload);

  // ===== Settings Routes =====
  
  // Get settings
  app.get('/api/settings', async (_req: Request, res: Response) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch settings' });
    }
  });
  
  // Update settings
  app.put('/api/settings', async (req: Request, res: Response) => {
    try {
      const settingsData = insertSettingsSchema.safeParse(req.body);
      
      if (!settingsData.success) {
        return res.status(400).json({ message: 'Invalid settings data' });
      }
      
      const settings = await storage.updateSettings(settingsData.data);
      
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update settings' });
    }
  });
  
  // ===== SteamCMD Routes =====
  
  // Test steamcmd connection
  app.post('/api/steamcmd/test', async (_req: Request, res: Response) => {
    try {
      const result = await testSteamCmdConnection();
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: 'Failed to test steamcmd connection' });
    }
  });
  
  // Submit Steam Guard code
  app.post('/api/steamcmd/steamguard', async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        code: z.string(),
        downloadId: z.number().optional()
      });
      
      const result = schema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ message: 'Invalid Steam Guard data' });
      }
      
      const { code, downloadId } = result.data;
      
      await submitSteamGuard(code, downloadId);
      
      res.json({ message: 'Steam Guard code submitted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to submit Steam Guard code' });
    }
  });

  return httpServer;
}

function initializeDownloadManager() {
  // Reset any active downloads to queued state on startup
  storage.resetActiveDownloads().then(() => {
    // Start processing the queue
    processDownloadQueue();
  });
}

async function processDownloadQueue() {
  try {
    // Check if there's already a download in progress
    const activeDownloads = await storage.getActiveDownloads();
    
    if (activeDownloads.length > 0) {
      return; // Already downloading
    }
    
    // Get settings for max concurrent downloads
    const settings = await storage.getSettings();
    const maxConcurrent = settings.maxConcurrentDownloads || 1;
    
    // Get next download in queue
    const queuedDownloads = await storage.getQueuedDownloads();
    
    if (queuedDownloads.length === 0) {
      return; // No downloads in queue
    }
    
    // Start download(s) up to the max concurrent limit
    const toStart = queuedDownloads.slice(0, maxConcurrent);
    
    for (const download of toStart) {
      await startDownload(download.id);
    }
  } catch (error) {
    log(`Error processing download queue: ${error}`, 'download-manager');
  }
}

async function startDownload(downloadId: number) {
  try {
    // Mark download as in progress
    await storage.updateDownload(downloadId, { status: 'downloading' });
    
    // Get the download info
    const download = await storage.getDownloadById(downloadId);
    
    if (!download) {
      throw new Error(`Download ${downloadId} not found`);
    }
    
    // Set up progress tracking interval
    const interval = setInterval(async () => {
      // Check if the download still exists and is still in progress
      const currentDownload = await storage.getDownloadById(downloadId);
      
      if (!currentDownload || currentDownload.status !== 'downloading') {
        clearInterval(interval);
        activeDownloadJobs.delete(downloadId);
        return;
      }
      
      // Check progress from steamcmd
      
    }, 2000); // Check every 2 seconds
    
    // Store the interval for later cancellation
    activeDownloadJobs.set(downloadId, interval);
    
    // Start the actual download process
    downloadGame(downloadId, download.appId)
      .then(async (success) => {
        // Clear the interval
        clearInterval(interval);
        activeDownloadJobs.delete(downloadId);
        
        if (success) {
          // Mark download as completed
          await storage.updateDownload(downloadId, { 
            status: 'completed',
            progress: 100,
            completedAt: new Date()
          });
          
          // Add to library
          await storage.addGameToLibrary({
            appId: download.appId,
            title: download.title,
            installPath: download.downloadPath!,
            installSize: download.estimatedSize,
            installedAt: new Date()
          });
          
          // Get settings to check for auto-compression
          const settings = await storage.getSettings();
          
          // Auto-compress if enabled
          if (settings.autoCompress) {
            GameCompressor.compressGame(
              download.appId, 
              settings.compressionFormat as CompressionFormat,
              settings.compressionLevel
            );
          }
        } else {
          // Mark download as failed
          await storage.updateDownload(downloadId, { 
            status: 'failed',
            errorMessage: 'Download failed'
          });
        }
        
        // Process the queue to start the next download
        processDownloadQueue();
      })
      .catch(async (error) => {
        // Clear the interval
        clearInterval(interval);
        activeDownloadJobs.delete(downloadId);
        
        // Mark download as failed
        await storage.updateDownload(downloadId, { 
          status: 'failed',
          errorMessage: error.message || 'Download failed'
        });
        
        // Process the queue to start the next download
        processDownloadQueue();
      });
  } catch (error) {
    log(`Error starting download ${downloadId}: ${error}`, 'download-manager');
    
    // Mark download as failed
    await storage.updateDownload(downloadId, { 
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
    
    // Process the queue to start the next download
    processDownloadQueue();
  }
}

// Initialize download manager on startup
initializeDownloadManager();
