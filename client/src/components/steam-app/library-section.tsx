import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { LibraryGame } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNotification } from "./notification-toast";
import { Play, RefreshCw, Trash2, Archive, Download, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function LibrarySection() {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();
  const [selectedFormat, setSelectedFormat] = useState<'zip' | 'tar'>('zip');
  const [selectedCompressionLevel, setSelectedCompressionLevel] = useState<number>(6);
  
  // Library Games Query
  const { 
    data: libraryGames = [],
    isLoading,
    error
  } = useQuery<LibraryGame[]>({
    queryKey: ['/api/library']
  });
  
  // Get Compressed Games Query
  const { data: compressedGames = [] } = useQuery<LibraryGame[]>({
    queryKey: ['/api/library/compressed']
  });
  
  // Remove from Library Mutation
  const removeMutation = useMutation({
    mutationFn: async (appId: string) => {
      await apiRequest("DELETE", `/api/library/${appId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/library'] });
      showNotification("Success", "Game removed from library", "success");
    },
    onError: (error) => {
      showNotification(
        "Error", 
        error instanceof Error ? error.message : "Failed to remove game from library", 
        "error"
      );
    }
  });
  
  // Compress Game Mutation
  const compressMutation = useMutation({
    mutationFn: async ({ appId, format, level }: { appId: string; format: 'zip' | 'tar'; level: number }) => {
      await apiRequest("POST", `/api/library/${appId}/compress`, { format, level });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/library'] });
      queryClient.invalidateQueries({ queryKey: ['/api/library/compressed'] });
      showNotification("Success", "Compression started", "success");
    },
    onError: (error) => {
      showNotification(
        "Error", 
        error instanceof Error ? error.message : "Failed to compress game", 
        "error"
      );
    }
  });
  
  // Play Game
  const handlePlayGame = (game: LibraryGame) => {
    showNotification("Info", `Launching ${game.title}...`, "info");
    // This would launch the game in a real application
  };
  
  // Update Game
  const handleUpdateGame = (game: LibraryGame) => {
    showNotification("Info", `Checking for updates for ${game.title}...`, "info");
    // This would check for updates in a real application
  };
  
  // Compress Game
  const handleCompressGame = (game: LibraryGame) => {
    compressMutation.mutate({ 
      appId: game.appId, 
      format: selectedFormat, 
      level: selectedCompressionLevel 
    });
  };
  
  // Download Compressed Game
  const handleDownloadCompressed = (game: LibraryGame) => {
    if (!game.compressedPath) {
      showNotification("Error", "Compressed file not available", "error");
      return;
    }
    
    // Open the download URL in a new tab/window
    window.open(`/api/library/compressed/download?path=${encodeURIComponent(game.compressedPath)}`, '_blank');
    showNotification("Success", "Download started", "success");
  };

  // Filter for compressed games
  const compressedGamesCount = libraryGames.filter(game => game.isCompressed).length;
  
  return (
    <div className="space-y-6">
      {/* Games Library */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              Downloaded Games Library
            </h2>
            
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {libraryGames.length} {libraryGames.length === 1 ? 'game' : 'games'}
            </div>
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <LibraryGameSkeleton />
              <LibraryGameSkeleton />
              <LibraryGameSkeleton />
            </div>
          ) : libraryGames.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {libraryGames.map(game => (
                <LibraryGameItem
                  key={game.id}
                  game={game}
                  onPlay={() => handlePlayGame(game)}
                  onUpdate={() => handleUpdateGame(game)}
                  onRemove={() => removeMutation.mutate(game.appId)}
                />
              ))}
            </div>
          ) : (
            <div className="col-span-full">
              <p className="text-center py-8 text-gray-500 dark:text-gray-400">
                Your library is empty. Download some games first.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Compressed Games Section */}
      {compressedGamesCount > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                Compressed Games
              </h2>
              
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {compressedGamesCount} {compressedGamesCount === 1 ? 'game' : 'games'} compressed
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {libraryGames
                .filter(game => game.isCompressed)
                .map(game => (
                  <div key={game.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden shadow-sm p-4">
                    <div className="flex items-center space-x-4">
                      <img 
                        className="w-16 h-16 object-cover rounded"
                        src={game.iconImage || `https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/${game.appId}/icon.jpg`} 
                        alt={game.title}
                      />
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-white text-sm">{game.title}</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {game.compressedSize} ({game.compressionType})
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          {game.compressionDate ? formatDate(new Date(game.compressionDate)) : 'N/A'}
                        </p>
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-steam-blue hover:text-steam-dark-blue dark:text-steam-light-blue"
                              onClick={() => handleDownloadCompressed(game)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Download compressed file</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface LibraryGameItemProps {
  game: LibraryGame;
  onPlay: () => void;
  onUpdate: () => void;
  onRemove: () => void;
}

function LibraryGameItem({ game, onPlay, onUpdate, onRemove }: LibraryGameItemProps) {
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();
  const [isCompressDialogOpen, setIsCompressDialogOpen] = useState(false);
  const [compressionFormat, setCompressionFormat] = useState<'zip' | 'tar'>('zip');
  const [compressionLevel, setCompressionLevel] = useState<string>('6');
  
  // Compress Game Mutation
  const compressMutation = useMutation({
    mutationFn: async ({ format, level }: { format: 'zip' | 'tar'; level: number }) => {
      await apiRequest("POST", `/api/library/${game.appId}/compress`, { format, level });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/library'] });
      queryClient.invalidateQueries({ queryKey: ['/api/library/compressed'] });
      showNotification("Success", `Compression of ${game.title} started in the background`, "success");
      setIsCompressDialogOpen(false);
    },
    onError: (error) => {
      showNotification(
        "Error", 
        error instanceof Error ? error.message : "Failed to compress game", 
        "error"
      );
    }
  });
  
  // Download Compressed Game
  const handleDownloadCompressed = () => {
    if (!game.compressedPath) {
      showNotification("Info", "Game is not compressed yet or still processing", "info");
      return;
    }
    
    // Open the download URL in a new tab/window
    window.open(`/api/library/compressed/download?path=${encodeURIComponent(game.compressedPath)}`, '_blank');
    showNotification("Success", "Download started", "success");
  };
  
  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };
  
  // Start compression
  const startCompression = () => {
    compressMutation.mutate({ 
      format: compressionFormat, 
      level: parseInt(compressionLevel) 
    });
  };
  
  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden shadow-sm transition-transform hover:translate-y-[-2px] hover:shadow-md">
      <img 
        className="w-full h-36 object-cover"
        src={game.headerImage || `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appId}/header.jpg`} 
        alt={game.title}
      />
      <div className="p-4">
        <h3 className="font-medium text-gray-900 dark:text-white">{game.title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Installed: {formatDate(game.installDate)}
        </p>
        
        {/* Display compression info if available */}
        {game.isCompressed && (
          <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
            <p>Compressed: {game.compressedSize} ({game.compressionType})</p>
            <p>Date: {game.compressionDate ? formatDate(new Date(game.compressionDate)) : 'N/A'}</p>
          </div>
        )}
        
        <div className="mt-3 flex justify-between items-center">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {game.size || 'Unknown size'}
          </span>
          <div className="flex space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="text-steam-blue hover:text-steam-dark-blue dark:text-steam-light-blue"
                    onClick={onPlay}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Play</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    onClick={onUpdate}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Update</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* Compress Button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="text-gray-500 hover:text-green-700 dark:text-gray-400 dark:hover:text-green-400"
                    onClick={() => setIsCompressDialogOpen(true)}
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{game.isCompressed ? 'Re-compress' : 'Compress'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* Download Button (only if compressed) */}
            {game.isCompressed && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-gray-500 hover:text-blue-700 dark:text-gray-400 dark:hover:text-blue-400"
                      onClick={handleDownloadCompressed}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Download compressed file</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="text-error hover:text-red-700 dark:text-error dark:hover:text-red-400"
                    onClick={onRemove}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Uninstall</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
      
      {/* Compression Dialog */}
      <AlertDialog open={isCompressDialogOpen} onOpenChange={setIsCompressDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Compress Game Files</AlertDialogTitle>
            <AlertDialogDescription>
              This will compress {game.title} for easier storage or transfer. The process will run in the background.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label htmlFor="format" className="text-sm font-medium">Compression Format</label>
              <Select 
                value={compressionFormat} 
                onValueChange={(value) => setCompressionFormat(value as 'zip' | 'tar')}
              >
                <SelectTrigger id="format">
                  <SelectValue placeholder="Format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zip">ZIP (most compatible)</SelectItem>
                  <SelectItem value="tar">TAR (better for large files)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="level" className="text-sm font-medium">Compression Level</label>
              <Select 
                value={compressionLevel} 
                onValueChange={setCompressionLevel}
              >
                <SelectTrigger id="level">
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Level 1 (Fastest)</SelectItem>
                  <SelectItem value="3">Level 3 (Fast)</SelectItem>
                  <SelectItem value="6">Level 6 (Balanced)</SelectItem>
                  <SelectItem value="9">Level 9 (Best Compression)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={startCompression}
              disabled={compressMutation.isPending}
            >
              {compressMutation.isPending ? "Compressing..." : "Start Compression"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function LibraryGameSkeleton() {
  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden shadow-sm">
      <Skeleton className="w-full h-36" />
      <div className="p-4">
        <Skeleton className="h-5 w-40 mb-2" />
        <Skeleton className="h-4 w-32 mb-3" />
        <div className="mt-3 flex justify-between items-center">
          <Skeleton className="h-4 w-20" />
          <div className="flex space-x-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
