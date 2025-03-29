import React, { createContext, useState, useEffect } from "react";
import { generateUniqueId } from "../lib/utils";
import { useToast } from "../hooks/use-toast";

interface Game {
  id: string;
  name: string;
  appId: number;
  sizeInBytes: number;
  originalSizeInBytes: number;
  compressed: boolean;
  compressionProgress: number;
  installPath: string;
  addedDate: string;
  thumbnailUrl: string;
}

interface LibraryContextType {
  games: Game[];
  addGame: (game: Omit<Game, "id" | "addedDate">) => string;
  removeGame: (id: string) => void;
  updateGame: (id: string, updates: Partial<Game>) => void;
  getGame: (id: string) => Game | undefined;
  compressGame: (id: string) => Promise<void>;
  uncompressGame: (id: string) => Promise<void>;
  runGame: (id: string) => void;
}

export const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

// Mock data for demonstration
const mockGames: Game[] = [
  {
    id: "game-1",
    name: "Half-Life 2",
    appId: 220,
    sizeInBytes: 7800000000,
    originalSizeInBytes: 12500000000,
    compressed: true,
    compressionProgress: 100,
    installPath: "C:\\Games\\Half-Life 2",
    addedDate: "2023-05-15T08:30:00Z",
    thumbnailUrl: "https://cdn.cloudflare.steamstatic.com/steam/apps/220/header.jpg",
  },
  {
    id: "game-2",
    name: "Portal 2",
    appId: 620,
    sizeInBytes: 13400000000,
    originalSizeInBytes: 13400000000,
    compressed: false,
    compressionProgress: 0,
    installPath: "C:\\Games\\Portal 2",
    addedDate: "2023-06-20T14:45:00Z",
    thumbnailUrl: "https://cdn.cloudflare.steamstatic.com/steam/apps/620/header.jpg",
  },
  {
    id: "game-3",
    name: "Counter-Strike 2",
    appId: 730,
    sizeInBytes: 25600000000,
    originalSizeInBytes: 25600000000,
    compressed: false,
    compressionProgress: 0,
    installPath: "C:\\Games\\Counter-Strike 2",
    addedDate: "2023-09-10T19:20:00Z",
    thumbnailUrl: "https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg",
  },
];

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const { success, error } = useToast();
  const [games, setGames] = useState<Game[]>(() => {
    const savedGames = localStorage.getItem("game-library");
    return savedGames ? JSON.parse(savedGames) : mockGames;
  });
  
  // Save games to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("game-library", JSON.stringify(games));
  }, [games]);
  
  const addGame = (game: Omit<Game, "id" | "addedDate">) => {
    const newGame: Game = {
      ...game,
      id: generateUniqueId(),
      addedDate: new Date().toISOString(),
    };
    
    setGames(prev => [...prev, newGame]);
    success({
      title: "Game Added",
      description: `${game.name} has been added to your library.`,
    });
    
    return newGame.id;
  };
  
  const removeGame = (id: string) => {
    const gameToRemove = games.find(game => game.id === id);
    if (!gameToRemove) return;
    
    setGames(prev => prev.filter(game => game.id !== id));
    success({
      title: "Game Removed",
      description: `${gameToRemove.name} has been removed from your library.`,
    });
  };
  
  const updateGame = (id: string, updates: Partial<Game>) => {
    setGames(prev => 
      prev.map(game => (game.id === id ? { ...game, ...updates } : game))
    );
  };
  
  const getGame = (id: string) => {
    return games.find(game => game.id === id);
  };
  
  const compressGame = async (id: string) => {
    const game = games.find(game => game.id === id);
    if (!game || game.compressed) return;
    
    // Simulate compression process
    for (let progress = 0; progress <= 100; progress += 10) {
      updateGame(id, { compressionProgress: progress });
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Calculate new compressed size (around 60-70% of original)
    const compressionRatio = 0.6 + Math.random() * 0.1; // 60-70% of original
    const newSize = Math.round(game.sizeInBytes * compressionRatio);
    
    updateGame(id, {
      compressed: true,
      originalSizeInBytes: game.sizeInBytes,
      sizeInBytes: newSize,
      compressionProgress: 100,
    });
    
    success({
      title: "Compression Complete",
      description: `${game.name} has been compressed.`,
    });
  };
  
  const uncompressGame = async (id: string) => {
    const game = games.find(game => game.id === id);
    if (!game || !game.compressed) return;
    
    // Restore original size
    updateGame(id, {
      compressed: false,
      sizeInBytes: game.originalSizeInBytes,
      compressionProgress: 0,
    });
    
    success({
      title: "Uncompression Complete",
      description: `${game.name} has been uncompressed.`,
    });
  };
  
  const runGame = (id: string) => {
    const game = games.find(game => game.id === id);
    if (!game) return;
    
    // In a real app, this would launch the game
    success({
      title: "Game Launched",
      description: `Launching ${game.name}...`,
    });
  };
  
  const value = {
    games,
    addGame,
    removeGame,
    updateGame,
    getGame,
    compressGame,
    uncompressGame,
    runGame,
  };
  
  return (
    <LibraryContext.Provider value={value}>
      {children}
    </LibraryContext.Provider>
  );
} 