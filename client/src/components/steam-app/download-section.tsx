import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Game } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SteamGuardModal } from "./steam-guard-modal";
import { useNotification } from "./notification-toast";
import { Search, Plus } from "lucide-react";

export function DownloadSection() {
  const [gameUrl, setGameUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [steamGuardCode, setSteamGuardCode] = useState("");
  const [anonymousMode, setAnonymousMode] = useState(false);
  const [showSteamGuard, setShowSteamGuard] = useState(false);
  const [steamGuardDownloadId, setSteamGuardDownloadId] = useState<number | null>(null);
  
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();
  
  // Game info query
  const { 
    data: gameInfo, 
    isLoading: isLoadingGameInfo,
    error: gameInfoError,
    refetch: refetchGameInfo,
    isFetching: isFetchingGameInfo,
    isError: isGameInfoError
  } = useQuery<Game>({
    queryKey: ['/api/games/info', gameUrl],
    enabled: false
  });
  
  // Check game mutation
  const checkGameMutation = useMutation({
    mutationFn: async () => {
      if (!gameUrl) throw new Error("Please enter a Steam store URL or App ID");
      
      const response = await fetch(`/api/games/info?url=${encodeURIComponent(gameUrl)}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to fetch game information");
      }
      
      return await response.json() as Game;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/games/info', gameUrl], data);
      showNotification("Success", "Game information retrieved successfully", "success");
    },
    onError: (error) => {
      showNotification(
        "Error", 
        error instanceof Error ? error.message : "Failed to fetch game information", 
        "error"
      );
    }
  });
  
  // Add to download queue mutation
  const addToQueueMutation = useMutation({
    mutationFn: async (game: Game) => {
      await apiRequest("POST", "/api/downloads", {
        appId: game.appId,
        title: game.title,
        totalSize: game.size,
        installPath: null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/downloads'] });
      showNotification("Success", "Game added to download queue", "success");
    },
    onError: (error) => {
      console.error("Failed to add game to queue:", error);
      
      // Check if Steam Guard is required
      if (error instanceof Error && error.message.includes("Steam Guard")) {
        setShowSteamGuard(true);
        setSteamGuardDownloadId(1); // This would be the actual download ID in a real app
      } else {
        showNotification(
          "Error", 
          error instanceof Error ? error.message : "Failed to add game to download queue", 
          "error"
        );
      }
    }
  });
  
  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async () => {
      if (!anonymousMode && (!username || !password)) {
        throw new Error("Please enter both username and password");
      }
      
      await apiRequest("POST", "/api/steam/login", {
        username: anonymousMode ? "" : username,
        password: anonymousMode ? "" : password,
        anonymous: anonymousMode
      });
    },
    onSuccess: () => {
      showNotification("Success", "Successfully logged in to Steam", "success");
    },
    onError: (error) => {
      // Check if Steam Guard is required
      if (error instanceof Error && error.message.includes("Steam Guard")) {
        setShowSteamGuard(true);
      } else {
        showNotification(
          "Error", 
          error instanceof Error ? error.message : "Failed to login to Steam", 
          "error"
        );
      }
    }
  });
  
  const handleCheckGame = () => {
    if (!gameUrl) {
      showNotification("Error", "Please enter a Steam store URL or App ID", "error");
      return;
    }
    
    checkGameMutation.mutate();
  };
  
  const handleAddToQueue = () => {
    if (!gameInfo) {
      showNotification("Error", "No game information available", "error");
      return;
    }
    
    addToQueueMutation.mutate(gameInfo);
  };
  
  const handleLogin = () => {
    loginMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Game URL Input Section */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Add Game to Download
          </h2>
          
          <div className="mb-4">
            <Label htmlFor="game-url" className="mb-1">
              Enter Steam Store URL or App ID
            </Label>
            <div className="flex">
              <Input
                id="game-url"
                placeholder="https://store.steampowered.com/app/1235810/Elden_Ring/ or 1235810"
                value={gameUrl}
                onChange={(e) => setGameUrl(e.target.value)}
                className="flex-grow rounded-r-none"
              />
              <Button 
                className="bg-steam-blue hover:bg-steam-dark-blue text-white rounded-l-none"
                onClick={handleCheckGame}
                disabled={checkGameMutation.isPending || !gameUrl}
              >
                {checkGameMutation.isPending ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Checking...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Check Game
                  </>
                )}
              </Button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Paste a Steam store URL or enter the game's App ID to retrieve game information.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Game Information Card */}
      {gameInfo && (
        <Card className="overflow-hidden">
          <div className="md:flex">
            <div className="md:flex-shrink-0">
              <img 
                className="h-48 w-full object-cover md:w-48"
                src={gameInfo.headerImage || `https://cdn.cloudflare.steamstatic.com/steam/apps/${gameInfo.appId}/header.jpg`}
                alt={gameInfo.title} 
              />
            </div>
            <div className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {gameInfo.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {gameInfo.developer}
                  </p>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  {gameInfo.size}
                </span>
              </div>
              
              <div className="mt-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                  {gameInfo.description}
                </p>
              </div>
              
              <div className="mt-4 flex items-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">App ID:</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">{gameInfo.appId}</span>
              </div>
              
              <div className="mt-4">
                <Button
                  className="bg-steam-blue hover:bg-steam-dark-blue text-white"
                  onClick={handleAddToQueue}
                  disabled={addToQueueMutation.isPending}
                >
                  {addToQueueMutation.isPending ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add to Download Queue
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Login Section */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Steam Account
          </h2>
          
          <div className="mb-4">
            <div className="flex items-center mb-4">
              <Checkbox
                id="anonymous-mode"
                checked={anonymousMode}
                onCheckedChange={(checked) => setAnonymousMode(checked === true)}
              />
              <Label htmlFor="anonymous-mode" className="ml-2">
                Use Anonymous mode (Only for free games)
              </Label>
            </div>
            
            <div className={`space-y-4 ${anonymousMode ? 'opacity-50 pointer-events-none' : ''}`}>
              <div>
                <Label htmlFor="username" className="mb-1">
                  Steam Username
                </Label>
                <Input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={anonymousMode}
                />
              </div>
              
              <div>
                <Label htmlFor="password" className="mb-1">
                  Steam Password
                </Label>
                <Input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={anonymousMode}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Your credentials are only used locally with SteamCMD and never stored or transmitted elsewhere.
                </p>
              </div>
              
              <div>
                <Button
                  className="bg-steam-blue hover:bg-steam-dark-blue text-white"
                  onClick={handleLogin}
                  disabled={loginMutation.isPending || (!anonymousMode && (!username || !password))}
                >
                  {loginMutation.isPending ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Logging in...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-sign-in-alt mr-2"></i>
                      Login to Steam
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Steam Guard Modal */}
      <SteamGuardModal
        open={showSteamGuard}
        onClose={() => setShowSteamGuard(false)}
        downloadId={steamGuardDownloadId}
        onSuccess={() => {
          // Refresh the game info or queue after successful Steam Guard entry
          queryClient.invalidateQueries({ queryKey: ['/api/downloads'] });
        }}
      />
    </div>
  );
}
