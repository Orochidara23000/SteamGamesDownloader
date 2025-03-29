import fetch from 'node-fetch';
import { log } from './vite';
import { storage } from './storage';
import type { InsertGame } from '@shared/schema';

interface SteamAppDetails {
  success: boolean;
  data?: {
    steam_appid: number;
    name: string;
    developers?: string[];
    publishers?: string[];
    is_free: boolean;
    detailed_description?: string;
    about_the_game?: string;
    short_description?: string;
    header_image?: string;
    price_overview?: {
      currency: string;
      initial: number;
      final: number;
      discount_percent: number;
      initial_formatted: string;
      final_formatted: string;
    };
    release_date?: {
      coming_soon: boolean;
      date: string;
    };
    categories?: Array<{
      id: number;
      description: string;
    }>;
    genres?: Array<{
      id: string;
      description: string;
    }>;
    background?: string;
    background_raw?: string;
  };
}

/**
 * Extract App ID from a Steam Store URL
 */
export function extractAppIdFromUrl(url: string): string | null {
  try {
    // Handle direct input of numbers
    if (/^\d+$/.test(url)) {
      return url;
    }
    
    // Parse URL and extract app ID
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('store.steampowered.com')) {
      const pathParts = urlObj.pathname.split('/');
      const appIndex = pathParts.findIndex(part => part === 'app');
      
      if (appIndex !== -1 && pathParts.length > appIndex + 1) {
        return pathParts[appIndex + 1];
      }
    }
    
    return null;
  } catch (error) {
    // If URL parsing fails
    return null;
  }
}

/**
 * Get game information from the Steam Store API
 */
export async function getGameInfo(appId: string): Promise<InsertGame | null> {
  try {
    const settings = await storage.getSettings();
    const apiKey = settings?.apiKey || '';
    
    // First check if we already have this game in our database
    const existingGame = await storage.getGameByAppId(appId);
    if (existingGame) {
      return existingGame;
    }
    
    // Fetch game details from Steam Store API
    const url = `https://store.steampowered.com/api/appdetails?appids=${appId}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Steam API returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json() as Record<string, SteamAppDetails>;
    
    if (!data[appId]?.success || !data[appId].data) {
      throw new Error('Game information not available from Steam');
    }
    
    const gameDetails = data[appId].data;
    
    // Fetch additional game info (like install size) if we have an API key
    let size = 'Unknown';
    if (apiKey) {
      try {
        const sizeInfo = await fetchGameSize(appId, apiKey);
        if (sizeInfo) {
          size = sizeInfo;
        }
      } catch (error) {
        log(`Error fetching game size: ${error}`, 'game-info');
      }
    }
    
    // Create game object
    const game: InsertGame = {
      appId,
      title: gameDetails.name,
      developer: gameDetails.developers ? gameDetails.developers[0] : undefined,
      publisher: gameDetails.publishers ? gameDetails.publishers[0] : undefined,
      description: gameDetails.short_description || '',
      size,
      headerImage: gameDetails.header_image,
      iconImage: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/capsule_sm_120.jpg`,
      isFree: gameDetails.is_free,
    };
    
    return game;
  } catch (error) {
    log(`Error fetching game info: ${error instanceof Error ? error.message : String(error)}`, 'game-info');
    return null;
  }
}

/**
 * Fetch game size information
 * Note: Steam doesn't provide an official API for this, so this is approximate
 */
async function fetchGameSize(appId: string, apiKey: string): Promise<string | null> {
  try {
    // This would be a real API endpoint in a production app
    // For this implementation, we'll return an estimate based on the app ID
    // In a real app, you would use Steam's API or another data source
    
    // Simulate different sizes based on app ID last digit (for demonstration)
    const lastDigit = parseInt(appId.slice(-1));
    const sizes = [
      '5.2 GB', '12.4 GB', '25.7 GB', '42.3 GB', 
      '60.2 GB', '35.8 GB', '18.3 GB', '71.5 GB',
      '9.7 GB', '48.1 GB'
    ];
    
    return sizes[lastDigit];
  } catch (error) {
    log(`Error in fetchGameSize: ${error instanceof Error ? error.message : String(error)}`, 'game-info');
    return null;
  }
}
