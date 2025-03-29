import React, { createContext, useContext } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { Download } from "@shared/schema";

interface DownloadContextProps {
  downloads: Download[];
  activeDownloads: Download[];
  queuedDownloads: Download[];
  isLoading: boolean;
  error: Error | null;
  addDownload: (download: Partial<Download>) => Promise<void>;
  pauseDownload: (id: number) => Promise<void>;
  resumeDownload: (id: number) => Promise<void>;
  cancelDownload: (id: number) => Promise<void>;
  removeDownload: (id: number) => Promise<void>;
  reorderQueue: (order: number[]) => Promise<void>;
  refreshDownloads: () => void;
  submitSteamGuard: (code: string, downloadId?: number) => Promise<void>;
}

const DownloadContext = createContext<DownloadContextProps>({
  downloads: [],
  activeDownloads: [],
  queuedDownloads: [],
  isLoading: false,
  error: null,
  addDownload: async () => {},
  pauseDownload: async () => {},
  resumeDownload: async () => {},
  cancelDownload: async () => {},
  removeDownload: async () => {},
  reorderQueue: async () => {},
  refreshDownloads: () => {},
  submitSteamGuard: async () => {},
});

export function useDownloads() {
  return useContext(DownloadContext);
}

export function DownloadProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all downloads
  const {
    data: downloads = [],
    isLoading,
    error,
    refetch: refreshDownloads,
  } = useQuery({
    queryKey: ["downloads"],
    queryFn: async () => {
      const response = await fetch("/api/downloads");
      if (!response.ok) {
        throw new Error("Failed to fetch downloads");
      }
      return response.json();
    },
    refetchInterval: 5000, // Refetch every 5 seconds to update progress
  });

  // Fetch active downloads
  const { data: activeDownloads = [] } = useQuery({
    queryKey: ["downloads", "active"],
    queryFn: async () => {
      const response = await fetch("/api/downloads/active");
      if (!response.ok) {
        throw new Error("Failed to fetch active downloads");
      }
      return response.json();
    },
    refetchInterval: 2000, // Refetch more frequently for active downloads
  });

  // Fetch queued downloads
  const { data: queuedDownloads = [] } = useQuery({
    queryKey: ["downloads", "queued"],
    queryFn: async () => {
      const response = await fetch("/api/downloads/queued");
      if (!response.ok) {
        throw new Error("Failed to fetch queued downloads");
      }
      return response.json();
    },
    refetchInterval: 5000,
  });

  // Add download mutation
  const addDownloadMutation = useMutation({
    mutationFn: async (download: Partial<Download>) => {
      const response = await fetch("/api/downloads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(download),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to add download");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["downloads"] });
      queryClient.invalidateQueries({ queryKey: ["downloads", "queued"] });
    },
  });

  // Pause download mutation
  const pauseDownloadMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/downloads/${id}/pause`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to pause download");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["downloads"] });
      queryClient.invalidateQueries({ queryKey: ["downloads", "active"] });
      queryClient.invalidateQueries({ queryKey: ["downloads", "queued"] });
    },
  });

  // Resume download mutation
  const resumeDownloadMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/downloads/${id}/resume`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to resume download");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["downloads"] });
      queryClient.invalidateQueries({ queryKey: ["downloads", "active"] });
      queryClient.invalidateQueries({ queryKey: ["downloads", "queued"] });
    },
  });

  // Cancel download mutation
  const cancelDownloadMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/downloads/${id}/cancel`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to cancel download");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["downloads"] });
      queryClient.invalidateQueries({ queryKey: ["downloads", "active"] });
      queryClient.invalidateQueries({ queryKey: ["downloads", "queued"] });
    },
  });

  // Remove download mutation
  const removeDownloadMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/downloads/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to remove download");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["downloads"] });
      queryClient.invalidateQueries({ queryKey: ["downloads", "active"] });
      queryClient.invalidateQueries({ queryKey: ["downloads", "queued"] });
    },
  });

  // Reorder queue mutation
  const reorderQueueMutation = useMutation({
    mutationFn: async (order: number[]) => {
      const response = await fetch(`/api/downloads/queue/reorder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ order }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to reorder queue");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["downloads"] });
      queryClient.invalidateQueries({ queryKey: ["downloads", "queued"] });
    },
  });

  // Steam Guard code submission mutation
  const steamGuardMutation = useMutation({
    mutationFn: async ({ code, downloadId }: { code: string; downloadId?: number }) => {
      const response = await fetch(`/api/steamcmd/steamguard`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code, downloadId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to submit Steam Guard code");
      }

      return response.json();
    },
  });

  const addDownload = async (download: Partial<Download>) => {
    try {
      await addDownloadMutation.mutateAsync(download);
      
      toast({
        title: "Download Added",
        description: "Game has been added to your download queue.",
      });
    } catch (error) {
      toast({
        title: "Failed to Add Download",
        description: error instanceof Error ? error.message : "Failed to add download",
        variant: "destructive",
      });
    }
  };

  const pauseDownload = async (id: number) => {
    try {
      await pauseDownloadMutation.mutateAsync(id);
      
      toast({
        title: "Download Paused",
        description: "Download has been paused.",
      });
    } catch (error) {
      toast({
        title: "Failed to Pause",
        description: error instanceof Error ? error.message : "Failed to pause download",
        variant: "destructive",
      });
    }
  };

  const resumeDownload = async (id: number) => {
    try {
      await resumeDownloadMutation.mutateAsync(id);
      
      toast({
        title: "Download Resumed",
        description: "Download has been queued for resumption.",
      });
    } catch (error) {
      toast({
        title: "Failed to Resume",
        description: error instanceof Error ? error.message : "Failed to resume download",
        variant: "destructive",
      });
    }
  };

  const cancelDownload = async (id: number) => {
    try {
      await cancelDownloadMutation.mutateAsync(id);
      
      toast({
        title: "Download Canceled",
        description: "Download has been canceled.",
      });
    } catch (error) {
      toast({
        title: "Failed to Cancel",
        description: error instanceof Error ? error.message : "Failed to cancel download",
        variant: "destructive",
      });
    }
  };

  const removeDownload = async (id: number) => {
    try {
      await removeDownloadMutation.mutateAsync(id);
      
      toast({
        title: "Download Removed",
        description: "Download has been removed from the list.",
      });
    } catch (error) {
      toast({
        title: "Failed to Remove",
        description: error instanceof Error ? error.message : "Failed to remove download",
        variant: "destructive",
      });
    }
  };

  const reorderQueue = async (order: number[]) => {
    try {
      await reorderQueueMutation.mutateAsync(order);
    } catch (error) {
      toast({
        title: "Failed to Reorder Queue",
        description: error instanceof Error ? error.message : "Failed to reorder queue",
        variant: "destructive",
      });
    }
  };

  const submitSteamGuard = async (code: string, downloadId?: number) => {
    try {
      await steamGuardMutation.mutateAsync({ code, downloadId });
      
      toast({
        title: "Steam Guard Code Submitted",
        description: "Steam Guard code has been successfully submitted.",
      });
    } catch (error) {
      toast({
        title: "Failed to Submit Code",
        description: error instanceof Error ? error.message : "Failed to submit Steam Guard code",
        variant: "destructive",
      });
    }
  };

  return (
    <DownloadContext.Provider
      value={{
        downloads,
        activeDownloads,
        queuedDownloads,
        isLoading,
        error: error as Error,
        addDownload,
        pauseDownload,
        resumeDownload,
        cancelDownload,
        removeDownload,
        reorderQueue,
        refreshDownloads,
        submitSteamGuard,
      }}
    >
      {children}
    </DownloadContext.Provider>
  );
} 