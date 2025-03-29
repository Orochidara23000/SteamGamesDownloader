// Game types
export interface Game {
  id: number;
  appId: string;
  title: string;
  developer?: string;
  publisher?: string;
  description?: string;
  size?: string;
  headerImage?: string;
  iconImage?: string;
  isFree: boolean;
}

// Download types
export type DownloadStatus = 'queued' | 'downloading' | 'paused' | 'completed' | 'error';

export interface Download {
  id: number;
  appId: string;
  title: string;
  status: DownloadStatus;
  progress?: number;
  speed?: string;
  downloaded?: string;
  totalSize?: string;
  timeRemaining?: string;
  installPath?: string;
  queuePosition?: number;
  dateAdded: Date;
  dateCompleted?: Date;
  errorMessage?: string;
}

// Library types
export interface LibraryGame {
  id: number;
  appId: string;
  title: string;
  installPath: string;
  size?: string;
  installDate: Date;
  headerImage?: string;
  iconImage?: string;
  isCompressed: boolean;
  compressedSize?: string;
  compressedPath?: string;
  compressionType?: string;
  compressionDate?: Date;
}

// Settings types
export interface Settings {
  id: number;
  steamCmdPath: string;
  downloadPath: string;
  maxConcurrentDownloads: number;
  throttleDownloads: boolean;
  maxDownloadSpeed?: number;
  autoStart: boolean;
  minimizeToTray: boolean;
  verifyDownloads: boolean;
  apiKey?: string;
}

// Status information
export interface StatusInfo {
  steamCmdConnected: boolean;
  currentOperation: string;
  diskSpace?: string;
  networkSpeed?: string;
}

// Steam credentials
export interface SteamCredentials {
  username: string;
  password: string;
  anonymous: boolean;
}

// Notification types
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
}
