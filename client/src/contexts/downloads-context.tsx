import React, { createContext, useState, useEffect } from "react";
import { generateUniqueId } from "../lib/utils";
import { useToast } from "../hooks/use-toast";
import { useLibrary } from "../hooks/use-library";
import { useSettings } from "../hooks/use-settings";

export type DownloadStatus = 
  | "queued"
  | "downloading"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

export interface Download {
  id: string;
  name: string;
  appId: number;
  status: DownloadStatus;
  progress: number;
  speed: number; // bytes per second
  size: number; // total size in bytes
  downloaded: number; // downloaded bytes
  dateAdded: string;
  eta: number; // estimated time in seconds
  steamGuardRequired?: boolean;
  error?: string;
  thumbnailUrl?: string;
}

interface DownloadsContextType {
  downloads: Download[];
  activeDownloads: Download[];
  queuedDownloads: Download[];
  completedDownloads: Download[];
  addDownload: (download: Omit<Download, "id" | "status" | "progress" | "dateAdded" | "downloaded" | "eta">) => string;
  removeDownload: (id: string) => void;
  pauseDownload: (id: string) => void;
  resumeDownload: (id: string) => void;
  cancelDownload: (id: string) => void;
  retryDownload: (id: string) => void;
  submitSteamGuard: (id: string, code: string) => Promise<boolean>;
  getDownload: (id: string) => Download | undefined;
}

export const DownloadsContext = createContext<DownloadsContextType | undefined>(undefined);

// Mock data for demonstration
const mockDownloads: Download[] = [
  {
    id: "dl-1",
    name: "The Witcher 3: Wild Hunt",
    appId: 292030,
    status: "downloading",
    progress: 45,
    speed: 10500000, // ~10.5 MB/s
    size: 50000000000, // ~50 GB
    downloaded: 22500000000, // 45% of 50 GB
    dateAdded: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    eta: 2580, // ~43 minutes
    thumbnailUrl: "https://cdn.cloudflare.steamstatic.com/steam/apps/292030/header.jpg",
  },
  {
    id: "dl-2",
    name: "Cyberpunk 2077",
    appId: 1091500,
    status: "queued",
    progress: 0,
    speed: 0,
    size: 70000000000, // ~70 GB
    downloaded: 0,
    dateAdded: new Date().toISOString(),
    eta: 0,
    thumbnailUrl: "https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/header.jpg",
  },
  {
    id: "dl-3",
    name: "Baldur's Gate 3",
    appId: 1086940,
    status: "paused",
    progress: 78,
    speed: 0,
    size: 122000000000, // ~122 GB
    downloaded: 95160000000, // 78% of 122 GB
    dateAdded: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    eta: 0,
    thumbnailUrl: "https://cdn.cloudflare.steamstatic.com/steam/apps/1086940/header.jpg",
  },
  {
    id: "dl-4",
    name: "Red Dead Redemption 2",
    appId: 1174180,
    status: "completed",
    progress: 100,
    speed: 0,
    size: 150000000000, // ~150 GB
    downloaded: 150000000000,
    dateAdded: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    eta: 0,
    thumbnailUrl: "https://cdn.cloudflare.steamstatic.com/steam/apps/1174180/header.jpg",
  },
];

export function DownloadsProvider({ children }: { children: React.ReactNode }) {
  const { success, error } = useToast();
  const { addGame } = useLibrary();
  const { settings } = useSettings();
  
  const [downloads, setDownloads] = useState<Download[]>(() => {
    const savedDownloads = localStorage.getItem("downloads");
    return savedDownloads ? JSON.parse(savedDownloads) : mockDownloads;
  });
  
  const [downloadIntervals, setDownloadIntervals] = useState<Record<string, NodeJS.Timeout>>({});
  
  // Save downloads to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("downloads", JSON.stringify(downloads));
  }, [downloads]);
  
  // Simulate download progress for active downloads
  useEffect(() => {
    // Clear any existing intervals
    Object.values(downloadIntervals).forEach(interval => clearInterval(interval));
    
    const newIntervals: Record<string, NodeJS.Timeout> = {};
    
    // Get all active downloads
    const activeDownloads = downloads.filter(download => download.status === "downloading");
    
    // Start progress updates for each active download
    activeDownloads.forEach(download => {
      if (download.progress >= 100) return;
      
      const interval = setInterval(() => {
        setDownloads(prevDownloads => 
          prevDownloads.map(d => {
            if (d.id !== download.id || d.status !== "downloading") return d;
            
            // Calculate progress increment (0.1% to 0.5% per second)
            const increment = Math.random() * 0.4 + 0.1;
            const newProgress = Math.min(d.progress + increment, 100);
            
            // Calculate new downloaded bytes
            const newDownloaded = Math.round((d.size * newProgress) / 100);
            
            // Calculate new speed (fluctuate between 8-12 MB/s)
            const speedFactor = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
            const newSpeed = Math.round(d.speed * speedFactor);
            
            // Calculate new ETA
            const remainingBytes = d.size - newDownloaded;
            const newEta = newSpeed > 0 ? Math.round(remainingBytes / newSpeed) : 0;
            
            // If download completed
            if (newProgress >= 100) {
              // Clear the interval
              clearInterval(interval);
              delete newIntervals[d.id];
              
              // Add the game to library
              addGame({
                name: d.name,
                appId: d.appId,
                sizeInBytes: d.size,
                originalSizeInBytes: d.size,
                compressed: false,
                compressionProgress: 0,
                installPath: `${settings.downloadPath}\\${d.name}`,
                thumbnailUrl: d.thumbnailUrl || "",
              });
              
              // Notify completion
              success({
                title: "Download Complete",
                description: `${d.name} has been downloaded successfully.`,
              });
              
              return {
                ...d,
                status: "completed",
                progress: 100,
                downloaded: d.size,
                speed: 0,
                eta: 0,
              };
            }
            
            return {
              ...d,
              progress: newProgress,
              downloaded: newDownloaded,
              speed: newSpeed,
              eta: newEta,
            };
          })
        );
      }, 1000);
      
      newIntervals[download.id] = interval;
    });
    
    setDownloadIntervals(newIntervals);
    
    // Clean up intervals on unmount
    return () => {
      Object.values(newIntervals).forEach(interval => clearInterval(interval));
    };
  }, [downloads, settings.downloadPath, addGame, success]);
  
  // Auto-start queued downloads when active downloads finish
  useEffect(() => {
    const activeCount = downloads.filter(d => d.status === "downloading").length;
    const canStartMore = activeCount < settings.maxConcurrentDownloads;
    
    if (canStartMore) {
      const queued = downloads.filter(d => d.status === "queued");
      const toStart = queued.slice(0, settings.maxConcurrentDownloads - activeCount);
      
      if (toStart.length > 0) {
        setDownloads(prevDownloads => 
          prevDownloads.map(d => 
            toStart.some(q => q.id === d.id)
              ? { ...d, status: "downloading", speed: 10000000 + Math.random() * 2000000 }
              : d
          )
        );
        
        toStart.forEach(download => {
          success({
            title: "Download Started",
            description: `${download.name} has started downloading.`,
          });
        });
      }
    }
  }, [downloads, settings.maxConcurrentDownloads, success]);
  
  // Computed properties
  const activeDownloads = downloads.filter(d => d.status === "downloading");
  const queuedDownloads = downloads.filter(d => d.status === "queued");
  const completedDownloads = downloads.filter(d => d.status === "completed");
  
  // Methods
  const addDownload = (download: Omit<Download, "id" | "status" | "progress" | "dateAdded" | "downloaded" | "eta">) => {
    const newDownload: Download = {
      ...download,
      id: generateUniqueId(),
      status: "queued",
      progress: 0,
      dateAdded: new Date().toISOString(),
      downloaded: 0,
      eta: 0,
    };
    
    setDownloads(prev => [...prev, newDownload]);
    
    success({
      title: "Download Added",
      description: `${download.name} has been added to the download queue.`,
    });
    
    return newDownload.id;
  };
  
  const removeDownload = (id: string) => {
    const downloadToRemove = downloads.find(d => d.id === id);
    if (!downloadToRemove) return;
    
    // Clear interval if it exists
    if (downloadIntervals[id]) {
      clearInterval(downloadIntervals[id]);
      const newIntervals = { ...downloadIntervals };
      delete newIntervals[id];
      setDownloadIntervals(newIntervals);
    }
    
    setDownloads(prev => prev.filter(d => d.id !== id));
    
    success({
      title: "Download Removed",
      description: `${downloadToRemove.name} has been removed from downloads.`,
    });
  };
  
  const pauseDownload = (id: string) => {
    const download = downloads.find(d => d.id === id);
    if (!download || download.status !== "downloading") return;
    
    // Clear interval
    if (downloadIntervals[id]) {
      clearInterval(downloadIntervals[id]);
      const newIntervals = { ...downloadIntervals };
      delete newIntervals[id];
      setDownloadIntervals(newIntervals);
    }
    
    setDownloads(prev => 
      prev.map(d => d.id === id ? { ...d, status: "paused", speed: 0, eta: 0 } : d)
    );
    
    success({
      title: "Download Paused",
      description: `${download.name} has been paused.`,
    });
  };
  
  const resumeDownload = (id: string) => {
    const download = downloads.find(d => d.id === id);
    if (!download || (download.status !== "paused" && download.status !== "failed")) return;
    
    // Check if we can start the download immediately or queue it
    const activeCount = downloads.filter(d => d.status === "downloading").length;
    const newStatus = activeCount < settings.maxConcurrentDownloads ? "downloading" : "queued";
    
    setDownloads(prev => 
      prev.map(d => d.id === id 
        ? { 
          ...d, 
          status: newStatus, 
          speed: newStatus === "downloading" ? 10000000 + Math.random() * 2000000 : 0,
          error: undefined 
        } 
        : d
      )
    );
    
    success({
      title: newStatus === "downloading" ? "Download Resumed" : "Download Queued",
      description: `${download.name} has been ${newStatus === "downloading" ? "resumed" : "queued"}.`,
    });
  };
  
  const cancelDownload = (id: string) => {
    const download = downloads.find(d => d.id === id);
    if (!download || download.status === "completed" || download.status === "cancelled") return;
    
    // Clear interval if it exists
    if (downloadIntervals[id]) {
      clearInterval(downloadIntervals[id]);
      const newIntervals = { ...downloadIntervals };
      delete newIntervals[id];
      setDownloadIntervals(newIntervals);
    }
    
    setDownloads(prev => 
      prev.map(d => d.id === id ? { ...d, status: "cancelled", speed: 0, eta: 0 } : d)
    );
    
    success({
      title: "Download Cancelled",
      description: `${download.name} has been cancelled.`,
    });
  };
  
  const retryDownload = (id: string) => {
    const download = downloads.find(d => d.id === id);
    if (!download || (download.status !== "failed" && download.status !== "cancelled")) return;
    
    // Check if we can start the download immediately or queue it
    const activeCount = downloads.filter(d => d.status === "downloading").length;
    const newStatus = activeCount < settings.maxConcurrentDownloads ? "downloading" : "queued";
    
    setDownloads(prev => 
      prev.map(d => d.id === id 
        ? { 
          ...d, 
          status: newStatus, 
          progress: 0,
          downloaded: 0,
          speed: newStatus === "downloading" ? 10000000 + Math.random() * 2000000 : 0,
          eta: 0,
          error: undefined 
        } 
        : d
      )
    );
    
    success({
      title: "Download Retried",
      description: `${download.name} has been restarted.`,
    });
  };
  
  const submitSteamGuard = async (id: string, code: string): Promise<boolean> => {
    const download = downloads.find(d => d.id === id);
    if (!download || !download.steamGuardRequired) return false;
    
    // Simulate verifying Steam Guard
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const isValid = code.length === 5 && /^\d+$/.test(code);
    
    if (isValid) {
      setDownloads(prev => 
        prev.map(d => d.id === id 
          ? { ...d, steamGuardRequired: false } 
          : d
        )
      );
      
      success({
        title: "Steam Guard Verified",
        description: "Steam Guard code was accepted.",
      });
      
      return true;
    } else {
      error({
        title: "Invalid Steam Guard Code",
        description: "Please enter a valid 5-digit Steam Guard code.",
      });
      
      return false;
    }
  };
  
  const getDownload = (id: string) => {
    return downloads.find(d => d.id === id);
  };
  
  const value = {
    downloads,
    activeDownloads,
    queuedDownloads,
    completedDownloads,
    addDownload,
    removeDownload,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    retryDownload,
    submitSteamGuard,
    getDownload,
  };
  
  return (
    <DownloadsContext.Provider value={value}>
      {children}
    </DownloadsContext.Provider>
  );
} 