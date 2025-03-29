import React, { createContext, useContext, useState, useEffect } from "react";
import { LibraryGame } from "@shared/schema";
import { useToast } from "@/components/ui/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface LibraryContextProps {
  games: LibraryGame[];
  isLoading: boolean;
  error: Error | null;
  compressGame: (appId: string, format?: string, compressionLevel?: number) => Promise<void>;
  downloadCompressedGame: (compressedPath: string) => void;
  deleteGame: (appId: string) => Promise<void>;
  refreshLibrary: () => void;
  getCompressedGames: () => LibraryGame[];
  compressionJobs: Record<string, any>[];
}

const LibraryContext = createContext<LibraryContextProps>({
  games: [],
  isLoading: false,
  error: null,
  compressGame: async () => {},
  downloadCompressedGame: () => {},
  deleteGame: async () => {},
  refreshLibrary: () => {},
  getCompressedGames: () => [],
  compressionJobs: [],
});

export function useLibrary() {
  return useContext(LibraryContext);
}

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [compressionJobs, setCompressionJobs] = useState<Record<string, any>[]>([]);

  // Fetch all library games
  const {
    data: games = [],
    isLoading,
    error,
    refetch: refreshLibrary,
  } = useQuery({
    queryKey: ["library"],
    queryFn: async () => {
      const response = await fetch("/api/library");
      if (!response.ok) {
        throw new Error("Failed to fetch library games");
      }
      return response.json();
    },
  });

  // Fetch compression jobs status periodically
  useEffect(() => {
    const fetchCompressionJobs = async () => {
      try {
        const response = await fetch("/api/library/compress/status");
        if (response.ok) {
          const jobs = await response.json();
          setCompressionJobs(jobs);
        }
      } catch (error) {
        console.error("Failed to fetch compression jobs:", error);
      }
    };

    // Initial fetch
    fetchCompressionJobs();

    // Set up polling for active jobs
    const intervalId = setInterval(fetchCompressionJobs, 3000);

    return () => clearInterval(intervalId);
  }, []);

  // Compress game mutation
  const compressMutation = useMutation({
    mutationFn: async ({
      appId,
      format,
      compressionLevel,
    }: {
      appId: string;
      format?: string;
      compressionLevel?: number;
    }) => {
      const response = await fetch(`/api/library/${appId}/compress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          format,
          compressionLevel,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to compress game");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["library"] });
    },
  });

  // Delete game mutation
  const deleteMutation = useMutation({
    mutationFn: async (appId: string) => {
      const response = await fetch(`/api/library/${appId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete game");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["library"] });
    },
  });

  const compressGame = async (
    appId: string,
    format?: string,
    compressionLevel?: number
  ) => {
    try {
      await compressMutation.mutateAsync({
        appId,
        format,
        compressionLevel,
      });

      toast({
        title: "Compression Started",
        description: "Game compression has been started. You can monitor progress in the library.",
      });
    } catch (error) {
      toast({
        title: "Compression Failed",
        description: error instanceof Error ? error.message : "Failed to start compression",
        variant: "destructive",
      });
    }
  };

  const downloadCompressedGame = (compressedPath: string) => {
    // Create a hidden link element and trigger download
    const link = document.createElement("a");
    link.href = `/api/library/compressed/download?path=${encodeURIComponent(compressedPath)}`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const deleteGame = async (appId: string) => {
    try {
      await deleteMutation.mutateAsync(appId);

      toast({
        title: "Game Deleted",
        description: "Game has been removed from your library.",
      });
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete game",
        variant: "destructive",
      });
    }
  };

  const getCompressedGames = () => {
    return games.filter((game) => game.isCompressed);
  };

  return (
    <LibraryContext.Provider
      value={{
        games,
        isLoading,
        error: error as Error,
        compressGame,
        downloadCompressedGame,
        deleteGame,
        refreshLibrary,
        getCompressedGames,
        compressionJobs,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
} 