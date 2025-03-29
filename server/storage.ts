import { 
  users, type User, type InsertUser, 
  games, type Game, type InsertGame,
  downloads, type Download, type InsertDownload,
  settings, type Settings, type InsertSettings,
  libraryGames, type LibraryGame, type InsertLibraryGame
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Game methods
  getGameByAppId(appId: string): Promise<Game | undefined>;
  upsertGame(game: InsertGame): Promise<Game>;
  
  // Download methods
  getAllDownloads(): Promise<Download[]>;
  getActiveDownloads(): Promise<Download[]>;
  getQueuedDownloads(): Promise<Download[]>;
  getDownloadById(id: number): Promise<Download | undefined>;
  getDownloadByAppId(appId: string): Promise<Download | undefined>;
  createDownload(download: InsertDownload): Promise<Download>;
  updateDownload(id: number, update: Partial<Download>): Promise<Download | undefined>;
  removeDownload(id: number): Promise<boolean>;
  updateDownloadQueue(newOrder: number[]): Promise<boolean>;
  
  // Settings methods
  getSettings(): Promise<Settings | undefined>;
  updateSettings(settings: Partial<Settings>): Promise<Settings>;
  
  // Library methods
  getAllLibraryGames(): Promise<LibraryGame[]>;
  getLibraryGameByAppId(appId: string): Promise<LibraryGame | undefined>;
  addGameToLibrary(game: InsertLibraryGame): Promise<LibraryGame>;
  removeGameFromLibrary(appId: string): Promise<boolean>;
  
  // Compression methods
  updateGameCompressionInfo(appId: string, compressionInfo: {
    isCompressed: boolean;
    compressedSize?: string;
    compressedPath?: string;
    compressionType?: string;
    compressionDate?: Date;
  }): Promise<LibraryGame | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private games: Map<string, Game>;
  private downloadsList: Map<number, Download>;
  private libraryGamesList: Map<string, LibraryGame>;
  private appSettings: Settings | undefined;
  
  private userCurrentId: number;
  private gameCurrentId: number;
  private downloadCurrentId: number;
  private libraryCurrentId: number;

  constructor() {
    this.users = new Map();
    this.games = new Map();
    this.downloadsList = new Map();
    this.libraryGamesList = new Map();
    
    this.userCurrentId = 1;
    this.gameCurrentId = 1;
    this.downloadCurrentId = 1;
    this.libraryCurrentId = 1;
    
    // Initialize with default settings
    this.appSettings = {
      id: 1,
      steamCmdPath: process.platform === 'win32' ? 'C:\\SteamCMD\\steamcmd.exe' : '/usr/local/bin/steamcmd',
      downloadPath: process.platform === 'win32' ? 'C:\\Games\\Steam' : `${process.env.HOME}/Games/Steam`,
      maxConcurrentDownloads: 1,
      throttleDownloads: false,
      maxDownloadSpeed: 10,
      autoStart: false,
      minimizeToTray: true,
      verifyDownloads: true,
      apiKey: '',
    };
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Game methods
  async getGameByAppId(appId: string): Promise<Game | undefined> {
    return this.games.get(appId);
  }
  
  async upsertGame(game: InsertGame): Promise<Game> {
    const existingGame = await this.getGameByAppId(game.appId);
    
    if (existingGame) {
      const updatedGame: Game = { 
        ...existingGame, 
        ...game,
        developer: game.developer || null,
        publisher: game.publisher || null,
        description: game.description || null,
        size: game.size || null,
        headerImage: game.headerImage || null,
        iconImage: game.iconImage || null,
        isFree: game.isFree ?? false
      };
      this.games.set(game.appId, updatedGame);
      return updatedGame;
    } else {
      const id = this.gameCurrentId++;
      const newGame: Game = { 
        appId: game.appId,
        title: game.title,
        id,
        developer: game.developer || null,
        publisher: game.publisher || null,
        description: game.description || null,
        size: game.size || null,
        headerImage: game.headerImage || null,
        iconImage: game.iconImage || null,
        isFree: game.isFree ?? false
      };
      this.games.set(game.appId, newGame);
      return newGame;
    }
  }
  
  // Download methods
  async getAllDownloads(): Promise<Download[]> {
    return Array.from(this.downloadsList.values())
      .sort((a, b) => (a.queuePosition || 999) - (b.queuePosition || 999));
  }
  
  async getActiveDownloads(): Promise<Download[]> {
    return Array.from(this.downloadsList.values())
      .filter(download => download.status === 'downloading')
      .sort((a, b) => (a.queuePosition || 999) - (b.queuePosition || 999));
  }
  
  async getQueuedDownloads(): Promise<Download[]> {
    return Array.from(this.downloadsList.values())
      .filter(download => download.status === 'queued')
      .sort((a, b) => (a.queuePosition || 999) - (b.queuePosition || 999));
  }
  
  async getDownloadById(id: number): Promise<Download | undefined> {
    return this.downloadsList.get(id);
  }
  
  async getDownloadByAppId(appId: string): Promise<Download | undefined> {
    return Array.from(this.downloadsList.values()).find(
      (download) => download.appId === appId,
    );
  }
  
  async createDownload(download: InsertDownload): Promise<Download> {
    const id = this.downloadCurrentId++;
    // Find the highest queue position and add 1
    const maxQueue = Math.max(
      0,
      ...Array.from(this.downloadsList.values())
        .map(d => d.queuePosition || 0)
    );
    
    const newDownload: Download = {
      appId: download.appId,
      title: download.title,
      status: 'queued',
      totalSize: download.totalSize || null,
      installPath: download.installPath || null,
      id,
      progress: 0,
      speed: '0 MB/s',
      downloaded: '0 B',
      timeRemaining: 'Unknown',
      queuePosition: maxQueue + 1,
      dateAdded: new Date(),
      dateCompleted: null,
      errorMessage: null
    };
    
    this.downloadsList.set(id, newDownload);
    return newDownload;
  }
  
  async updateDownload(id: number, update: Partial<Download>): Promise<Download | undefined> {
    const download = this.downloadsList.get(id);
    
    if (!download) {
      return undefined;
    }
    
    const updatedDownload: Download = { ...download, ...update };
    
    // If we're marking as completed, set the completion date
    if (update.status === 'completed' && !update.dateCompleted) {
      updatedDownload.dateCompleted = new Date();
    }
    
    this.downloadsList.set(id, updatedDownload);
    return updatedDownload;
  }
  
  async removeDownload(id: number): Promise<boolean> {
    return this.downloadsList.delete(id);
  }
  
  async updateDownloadQueue(newOrder: number[]): Promise<boolean> {
    try {
      // Update each download with its new position
      for (let i = 0; i < newOrder.length; i++) {
        const downloadId = newOrder[i];
        const download = this.downloadsList.get(downloadId);
        
        if (download) {
          download.queuePosition = i + 1;
          this.downloadsList.set(downloadId, download);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error updating queue order:', error);
      return false;
    }
  }
  
  // Settings methods
  async getSettings(): Promise<Settings | undefined> {
    return this.appSettings;
  }
  
  async updateSettings(settings: Partial<Settings>): Promise<Settings> {
    if (!this.appSettings) {
      throw new Error('Settings not initialized');
    }
    
    this.appSettings = { ...this.appSettings, ...settings };
    return this.appSettings;
  }
  
  // Library methods
  async getAllLibraryGames(): Promise<LibraryGame[]> {
    return Array.from(this.libraryGamesList.values());
  }
  
  async getLibraryGameByAppId(appId: string): Promise<LibraryGame | undefined> {
    return this.libraryGamesList.get(appId);
  }
  
  async addGameToLibrary(game: InsertLibraryGame): Promise<LibraryGame> {
    const id = this.libraryCurrentId++;
    
    // Handle all possibly undefined fields
    const libraryGame: LibraryGame = { 
      appId: game.appId,
      title: game.title,
      installPath: game.installPath,
      size: game.size || null,
      headerImage: game.headerImage || null,
      iconImage: game.iconImage || null,
      id,
      installDate: new Date(),
      isCompressed: false,
      compressedSize: null,
      compressedPath: null,
      compressionType: null,
      compressionDate: null
    };
    
    this.libraryGamesList.set(game.appId, libraryGame);
    return libraryGame;
  }
  
  async removeGameFromLibrary(appId: string): Promise<boolean> {
    return this.libraryGamesList.delete(appId);
  }
  
  // Compression methods
  async updateGameCompressionInfo(appId: string, compressionInfo: {
    isCompressed: boolean;
    compressedSize?: string;
    compressedPath?: string;
    compressionType?: string;
    compressionDate?: Date;
  }): Promise<LibraryGame | undefined> {
    const game = this.libraryGamesList.get(appId);
    
    if (!game) {
      return undefined;
    }
    
    const updatedGame: LibraryGame = { 
      ...game, 
      ...compressionInfo,
      compressionDate: compressionInfo.compressionDate || new Date()
    };
    
    this.libraryGamesList.set(appId, updatedGame);
    return updatedGame;
  }
}

export const storage = new MemStorage();
