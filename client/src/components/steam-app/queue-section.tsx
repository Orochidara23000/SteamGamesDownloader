import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Download } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNotification } from "./notification-toast";
import { ArrowUp, ArrowDown, Pause, Play, StopCircle, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export function QueueSection() {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();
  
  // Active Downloads Query
  const { 
    data: activeDownloads = [],
    isLoading: isLoadingActive,
    error: activeError
  } = useQuery<Download[]>({
    queryKey: ['/api/downloads/active'],
    refetchInterval: 2000
  });
  
  // Queued Downloads Query
  const { 
    data: queuedDownloads = [],
    isLoading: isLoadingQueued,
    error: queuedError
  } = useQuery<Download[]>({
    queryKey: ['/api/downloads/queued'],
    refetchInterval: 5000
  });
  
  // Pause Download Mutation
  const pauseMutation = useMutation({
    mutationFn: async (downloadId: number) => {
      await apiRequest("POST", `/api/downloads/${downloadId}/pause`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/downloads/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/downloads/queued'] });
      showNotification("Success", "Download paused", "success");
    },
    onError: (error) => {
      showNotification(
        "Error", 
        error instanceof Error ? error.message : "Failed to pause download", 
        "error"
      );
    }
  });
  
  // Resume Download Mutation
  const resumeMutation = useMutation({
    mutationFn: async (downloadId: number) => {
      await apiRequest("POST", `/api/downloads/${downloadId}/resume`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/downloads/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/downloads/queued'] });
      showNotification("Success", "Download resumed", "success");
    },
    onError: (error) => {
      showNotification(
        "Error", 
        error instanceof Error ? error.message : "Failed to resume download", 
        "error"
      );
    }
  });
  
  // Cancel Download Mutation
  const cancelMutation = useMutation({
    mutationFn: async (downloadId: number) => {
      await apiRequest("POST", `/api/downloads/${downloadId}/cancel`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/downloads/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/downloads/queued'] });
      showNotification("Success", "Download cancelled", "success");
    },
    onError: (error) => {
      showNotification(
        "Error", 
        error instanceof Error ? error.message : "Failed to cancel download", 
        "error"
      );
    }
  });
  
  // Reorder Queue Mutation
  const reorderMutation = useMutation({
    mutationFn: async ({ downloadId, direction }: { downloadId: number; direction: 'up' | 'down' }) => {
      // Get the current queue
      const currentQueue = [...queuedDownloads].sort((a, b) => 
        (a.queuePosition || 999) - (b.queuePosition || 999)
      );
      
      // Find the current index
      const currentIndex = currentQueue.findIndex(d => d.id === downloadId);
      if (currentIndex === -1) return;
      
      // Calculate new index
      const newIndex = direction === 'up' 
        ? Math.max(0, currentIndex - 1)
        : Math.min(currentQueue.length - 1, currentIndex + 1);
      
      // If no change needed, return
      if (newIndex === currentIndex) return;
      
      // Swap items
      const newQueue = [...currentQueue];
      [newQueue[currentIndex], newQueue[newIndex]] = [newQueue[newIndex], newQueue[currentIndex]];
      
      // Create new order array of IDs
      const newOrder = newQueue.map(item => item.id);
      
      await apiRequest("POST", `/api/downloads/queue/reorder`, { order: newOrder });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/downloads/queued'] });
    },
    onError: (error) => {
      showNotification(
        "Error", 
        error instanceof Error ? error.message : "Failed to reorder queue", 
        "error"
      );
    }
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Download Queue
          </h2>
          
          {/* Active Downloads */}
          <div className="mb-6">
            <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
              Currently Downloading
            </h3>
            
            {isLoadingActive ? (
              <ActiveDownloadSkeleton />
            ) : activeDownloads.length > 0 ? (
              activeDownloads.map(download => (
                <ActiveDownloadItem
                  key={download.id}
                  download={download}
                  onPause={() => pauseMutation.mutate(download.id)}
                  onCancel={() => cancelMutation.mutate(download.id)}
                />
              ))
            ) : (
              <p className="text-center py-4 text-gray-500 dark:text-gray-400">
                No active downloads. Add games from the Download tab.
              </p>
            )}
          </div>
          
          {/* Queued Downloads */}
          <div>
            <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
              In Queue
            </h3>
            
            {isLoadingQueued ? (
              <>
                <QueuedDownloadSkeleton />
                <QueuedDownloadSkeleton />
              </>
            ) : queuedDownloads.length > 0 ? (
              queuedDownloads.map(download => (
                <QueuedDownloadItem
                  key={download.id}
                  download={download}
                  onMoveUp={() => reorderMutation.mutate({ downloadId: download.id, direction: 'up' })}
                  onMoveDown={() => reorderMutation.mutate({ downloadId: download.id, direction: 'down' })}
                  onRemove={() => cancelMutation.mutate(download.id)}
                  isFirst={download.queuePosition === 1}
                  isLast={download.queuePosition === queuedDownloads.length}
                />
              ))
            ) : (
              <p className="text-center py-4 text-gray-500 dark:text-gray-400">
                Your download queue is empty. Add games from the Download tab.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface ActiveDownloadItemProps {
  download: Download;
  onPause: () => void;
  onCancel: () => void;
}

function ActiveDownloadItem({ download, onPause, onCancel }: ActiveDownloadItemProps) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4 transition-transform hover:translate-y-[-2px] hover:shadow-md">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <img 
            className="h-12 w-12 object-cover rounded"
            src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${download.appId}/capsule_sm_120.jpg`} 
            alt={download.title}
          />
          <div className="ml-3">
            <h4 className="font-medium text-gray-900 dark:text-white">{download.title}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">App ID: {download.appId}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="ghost" 
            size="icon"
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            onClick={onPause}
          >
            <Pause className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            className="text-error hover:text-red-700 dark:text-error dark:hover:text-red-400"
            onClick={onCancel}
          >
            <StopCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-gray-700 dark:text-gray-300">
          {download.progress || 0}% Complete
        </span>
        <span className="text-gray-600 dark:text-gray-400">
          {download.speed || '0 MB/s'}
        </span>
      </div>
      
      <Progress 
        value={download.progress || 0} 
        className="h-2.5 bg-gray-200 dark:bg-gray-600"
      />
      
      <div className="mt-2 flex justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">
          {download.downloaded || '0 B'} / {download.totalSize || 'Unknown'}
        </span>
        <span className="text-gray-600 dark:text-gray-400">
          {download.timeRemaining || 'Unknown'} remaining
        </span>
      </div>
    </div>
  );
}

interface QueuedDownloadItemProps {
  download: Download;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  isFirst: boolean;
  isLast: boolean;
}

function QueuedDownloadItem({ download, onMoveUp, onMoveDown, onRemove, isFirst, isLast }: QueuedDownloadItemProps) {
  return (
    <div className="relative bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-3 transition-transform hover:translate-y-[-2px] hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <img 
            className="h-10 w-10 object-cover rounded"
            src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${download.appId}/capsule_sm_120.jpg`} 
            alt={download.title}
          />
          <div className="ml-3">
            <h4 className="font-medium text-gray-900 dark:text-white">{download.title}</h4>
            <div className="flex items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">App ID: {download.appId}</span>
              <span className="ml-2 px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-full text-xs">
                {download.totalSize || 'Unknown'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="ghost" 
            size="icon"
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            onClick={onMoveUp}
            disabled={isFirst}
            title="Move Up"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            onClick={onMoveDown}
            disabled={isLast}
            title="Move Down"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            className="text-error hover:text-red-700 dark:text-error dark:hover:text-red-400"
            onClick={onRemove}
            title="Remove"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ActiveDownloadSkeleton() {
  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <Skeleton className="h-12 w-12 rounded" />
          <div className="ml-3">
            <Skeleton className="h-4 w-40 mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="flex space-x-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
      
      <div className="mb-1 flex justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
      
      <Skeleton className="h-2.5 w-full mt-2" />
      
      <div className="mt-2 flex justify-between">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}

function QueuedDownloadSkeleton() {
  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Skeleton className="h-10 w-10 rounded" />
          <div className="ml-3">
            <Skeleton className="h-4 w-36 mb-2" />
            <div className="flex items-center">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-12 ml-2 rounded-full" />
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </div>
  );
}
