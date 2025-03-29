import { spawn, ChildProcess } from 'child_process';
import { storage } from './storage';
import path from 'path';
import fs from 'fs/promises';
import { log } from './vite';

// Interface for download progress
interface DownloadProgress {
  progress: number;  // 0-100
  speed: string;     // e.g. "10.5 MB/s"
  downloaded: string; // e.g. "100 MB / 1 GB"
  timeRemaining: string; // e.g. "10 minutes"
}

// Map of active downloads by download ID
const activeDownloads = new Map<number, {
  process: ChildProcess;
  appId: string;
  onProgressUpdate: (progress: DownloadProgress) => void;
  onComplete: () => void;
  onError: (error: string) => void;
}>();

/**
 * Handles SteamCMD download for a specific game
 */
export async function downloadGame(
  downloadId: number,
  appId: string,
  credentials: { username?: string; password?: string } | null,
  onProgressUpdate: (progress: DownloadProgress) => void,
  onComplete: () => void,
  onError: (error: string) => void
): Promise<void> {
  try {
    const settings = await storage.getSettings();
    if (!settings) {
      throw new Error('Application settings not found');
    }
    
    const steamCmdPath = settings.steamCmdPath;
    const installPath = settings.downloadPath;
    
    // Create install directory if it doesn't exist
    await fs.mkdir(installPath, { recursive: true });
    
    // Build the SteamCMD arguments
    const args: string[] = ['+@NoPromptForPassword 1'];
    
    // Login arguments
    if (credentials && credentials.username && credentials.password) {
      args.push(`+login ${credentials.username} ${credentials.password}`);
    } else {
      args.push('+login anonymous');
    }
    
    // Add download arguments
    args.push(
      `+force_install_dir "${path.join(installPath, appId)}"`,
      `+app_update ${appId} validate`,
      '+quit'
    );
    
    log(`Starting download for App ID: ${appId}`, 'steamcmd');
    
    // Spawn SteamCMD process
    const steamCmdProcess = spawn(steamCmdPath, args);
    
    // Store the process info for potential cancellation
    activeDownloads.set(downloadId, {
      process: steamCmdProcess,
      appId,
      onProgressUpdate,
      onComplete,
      onError
    });
    
    let stdoutData = '';
    let lastProgressUpdate = Date.now();
    
    // Handle stdout data
    steamCmdProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      stdoutData += output;
      
      // Parse the output to extract progress information
      const progressInfo = parseDownloadProgress(output);
      if (progressInfo && Date.now() - lastProgressUpdate > 1000) {
        onProgressUpdate(progressInfo);
        lastProgressUpdate = Date.now();
      }
      
      // Check for Steam Guard requirement
      if (output.includes('Steam Guard code:')) {
        onError('Steam Guard code required');
        steamCmdProcess.kill();
      }
    });
    
    // Handle stderr data
    steamCmdProcess.stderr?.on('data', (data) => {
      const error = data.toString();
      log(`SteamCMD stderr: ${error}`, 'steamcmd');
    });
    
    // Handle process exit
    steamCmdProcess.on('close', (code) => {
      activeDownloads.delete(downloadId);
      
      if (code === 0) {
        log(`Download completed for App ID: ${appId}`, 'steamcmd');
        onComplete();
      } else {
        // Check for specific errors in the output
        if (stdoutData.includes('Invalid Password')) {
          onError('Invalid username or password');
        } else if (stdoutData.includes('rate limit exceeded')) {
          onError('Rate limit exceeded, please try again later');
        } else if (stdoutData.includes('No subscription')) {
          onError('You do not own this game or need to be logged in');
        } else {
          onError(`Download failed with code ${code}`);
        }
      }
    });
    
    // Handle process errors
    steamCmdProcess.on('error', (error) => {
      activeDownloads.delete(downloadId);
      log(`SteamCMD error: ${error.message}`, 'steamcmd');
      onError(`Failed to start SteamCMD: ${error.message}`);
    });
    
  } catch (error) {
    log(`Error in downloadGame: ${error instanceof Error ? error.message : String(error)}`, 'steamcmd');
    onError(`Failed to start download: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Cancels an active download
 */
export function cancelDownload(downloadId: number): boolean {
  const download = activeDownloads.get(downloadId);
  
  if (download) {
    download.process.kill();
    activeDownloads.delete(downloadId);
    return true;
  }
  
  return false;
}

/**
 * Pauses a download (not directly supported by SteamCMD, so we cancel and track state)
 */
export function pauseDownload(downloadId: number): boolean {
  // SteamCMD doesn't support pausing, so we actually cancel and mark as paused in the DB
  return cancelDownload(downloadId);
}

/**
 * Tests the SteamCMD connection
 */
export async function testSteamCmdConnection(steamCmdPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const steamCmdProcess = spawn(steamCmdPath, ['+quit']);
      
      steamCmdProcess.on('close', (code) => {
        resolve(code === 0);
      });
      
      steamCmdProcess.on('error', () => {
        resolve(false);
      });
      
      // Set a timeout
      setTimeout(() => {
        steamCmdProcess.kill();
        resolve(false);
      }, 5000);
      
    } catch (error) {
      resolve(false);
    }
  });
}

/**
 * Submits a Steam Guard code for an in-progress authentication
 */
export async function submitSteamGuard(
  downloadId: number,
  code: string
): Promise<boolean> {
  const download = activeDownloads.get(downloadId);
  
  if (download && download.process.stdin) {
    download.process.stdin.write(`${code}\n`);
    return true;
  }
  
  return false;
}

/**
 * Parse the SteamCMD output to extract download progress information
 */
function parseDownloadProgress(output: string): DownloadProgress | null {
  try {
    // Example output parsing (adjust according to actual SteamCMD output)
    // Update state (0x3) downloading, progress: 42.89 (389032355 / 906575745)
    const progressMatch = output.match(/progress:\s+(\d+\.\d+)\s+\((\d+)\s+\/\s+(\d+)\)/);
    
    if (progressMatch) {
      const progressPercent = parseFloat(progressMatch[1]);
      const downloadedBytes = parseInt(progressMatch[2]);
      const totalBytes = parseInt(progressMatch[3]);
      
      // Calculate speed - this is approximate since SteamCMD doesn't provide it directly
      // In real app, track bytes over time to calculate speed
      const speed = '~10 MB/s';
      
      // Format downloaded size
      const downloaded = formatBytes(downloadedBytes) + ' / ' + formatBytes(totalBytes);
      
      // Estimate time remaining (very rough estimate)
      const bytesRemaining = totalBytes - downloadedBytes;
      const secondsRemaining = bytesRemaining / (10 * 1024 * 1024); // Assuming 10 MB/s
      const timeRemaining = formatTimeRemaining(secondsRemaining);
      
      return {
        progress: Math.round(progressPercent),
        speed,
        downloaded,
        timeRemaining
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing download progress:', error);
    return null;
  }
}

/**
 * Format bytes to human-readable format
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format seconds to human-readable time
 */
function formatTimeRemaining(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)} seconds`;
  } else if (seconds < 3600) {
    return `${Math.round(seconds / 60)} minutes`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}
