import React, { useState } from "react";
import { useDownloads } from "@/context/download-context";
import { Download } from "@shared/schema";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { AlertCircle, Download, MoreVertical, Pause, Play, Plus, Search, ShieldAlert, Trash2, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export default function DownloadQueue() {
  const {
    downloads,
    activeDownloads,
    queuedDownloads,
    isLoading,
    error,
    addDownload,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    removeDownload,
    submitSteamGuard,
  } = useDownloads();

  const [searchTerm, setSearchTerm] = useState("");
  const [steamUrl, setSteamUrl] = useState("");
  const [steamGuardCode, setSteamGuardCode] = useState("");
  const [steamGuardDownloadId, setSteamGuardDownloadId] = useState<number | undefined>(undefined);
  const [activeTab, setActiveTab] = useState("all");

  // Helper function to determine badge color based on status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "downloading":
        return <Badge className="bg-blue-500">Downloading</Badge>;
      case "queued":
        return <Badge variant="outline">Queued</Badge>;
      case "paused":
        return <Badge variant="secondary">Paused</Badge>;
      case "completed":
        return <Badge className="bg-green-500">Completed</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "canceled":
        return <Badge variant="destructive">Canceled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Filter downloads based on search and tab
  const filteredDownloads = downloads.filter((download) => {
    const matchesSearch = download.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "active" && download.status === "downloading") ||
      (activeTab === "queued" && download.status === "queued") ||
      (activeTab === "completed" && download.status === "completed") ||
      (activeTab === "other" && !["downloading", "queued", "completed"].includes(download.status));

    return matchesSearch && matchesTab;
  });

  const handleAddDownload = async () => {
    if (!steamUrl) return;

    try {
      // First, get game info from the URL
      const response = await fetch(`/api/games/info?url=${encodeURIComponent(steamUrl)}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch game information");
      }
      
      const gameInfo = await response.json();
      
      // Add to download queue
      await addDownload({
        appId: gameInfo.appId,
        title: gameInfo.title,
      });
      
      // Reset input
      setSteamUrl("");
    } catch (error) {
      console.error("Error adding download:", error);
      // Toast is handled by the context
    }
  };

  const handleSteamGuardSubmit = async () => {
    if (!steamGuardCode) return;
    
    await submitSteamGuard(steamGuardCode, steamGuardDownloadId);
    setSteamGuardCode("");
    setSteamGuardDownloadId(undefined);
  };

  // Show Steam Guard dialog when needed
  const steamGuardNeededDownload = downloads.find(
    (download) => download.steamGuardRequired && download.status === "downloading"
  );

  if (steamGuardNeededDownload && !steamGuardDownloadId) {
    setSteamGuardDownloadId(steamGuardNeededDownload.id);
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Download Queue</h2>
        </div>
        <div className="space-y-4">
          {Array(3)
            .fill(0)
            .map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-1/2 mb-2" />
                  <Skeleton className="h-2 w-full" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-9 w-full" />
                </CardFooter>
              </Card>
            ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load download queue: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Download Queue</h2>
          <p className="text-muted-foreground">Manage your Steam game downloads</p>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Game
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Add Game to Download</SheetTitle>
              <SheetDescription>
                Enter a Steam store URL or App ID to add a game to your download queue
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="steam-url">Steam Store URL or App ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="steam-url"
                    placeholder="https://store.steampowered.com/app/..."
                    value={steamUrl}
                    onChange={(e) => setSteamUrl(e.target.value)}
                  />
                  <Button variant="secondary" onClick={handleAddDownload}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Example: https://store.steampowered.com/app/1091500/Cyberpunk_2077/
                </p>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <Input
          placeholder="Search downloads..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
        />
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="queued">Queued</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="other">Other</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {activeDownloads.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Active Downloads</h3>
          {activeDownloads.map((download) => (
            <Card key={download.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{download.title}</CardTitle>
                  {getStatusBadge(download.status)}
                </div>
                <CardDescription>
                  {download.estimatedSize && `Estimated Size: ${download.estimatedSize}`}
                  {download.currentSpeed && ` • ${download.currentSpeed}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="space-y-2">
                  <Progress value={download.progress || 0} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{download.progress ? `${download.progress}%` : "Starting..."}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => pauseDownload(download.id)}>
                  <Pause className="mr-2 h-4 w-4" /> Pause
                </Button>
                <Button variant="destructive" size="sm" onClick={() => cancelDownload(download.id)}>
                  <X className="mr-2 h-4 w-4" /> Cancel
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {queuedDownloads.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Queue</h3>
          {queuedDownloads.map((download) => (
            <Card key={download.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{download.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Position: {download.queuePosition || "?"}</Badge>
                    {getStatusBadge(download.status)}
                  </div>
                </div>
                <CardDescription>
                  {download.estimatedSize && `Estimated Size: ${download.estimatedSize}`}
                </CardDescription>
              </CardHeader>
              <CardFooter className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => cancelDownload(download.id)}>
                  <X className="mr-2 h-4 w-4" /> Cancel
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {filteredDownloads.length > 0 ? (
        <div className="space-y-4">
          {activeTab === "all" && activeDownloads.length === 0 && queuedDownloads.length === 0 && (
            <h3 className="text-lg font-medium">All Downloads</h3>
          )}
          {activeTab !== "all" && filteredDownloads.length > 0 && activeDownloads.length === 0 && queuedDownloads.length === 0 && (
            <h3 className="text-lg font-medium">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Downloads
            </h3>
          )}
          {filteredDownloads
            .filter(download => 
              !activeDownloads.some(ad => ad.id === download.id) && 
              !queuedDownloads.some(qd => qd.id === download.id)
            )
            .map((download) => (
              <Card key={download.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl">{download.title}</CardTitle>
                    {getStatusBadge(download.status)}
                  </div>
                  <CardDescription>
                    {download.estimatedSize && `Size: ${download.estimatedSize}`}
                    {download.completedAt && ` • Completed: ${new Date(download.completedAt).toLocaleString()}`}
                    {download.errorMessage && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{download.errorMessage}</AlertDescription>
                      </Alert>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="flex justify-end gap-2">
                  {download.status === "paused" && (
                    <Button variant="outline" size="sm" onClick={() => resumeDownload(download.id)}>
                      <Play className="mr-2 h-4 w-4" /> Resume
                    </Button>
                  )}
                  {download.status === "failed" && (
                    <Button variant="outline" size="sm" onClick={() => resumeDownload(download.id)}>
                      <Play className="mr-2 h-4 w-4" /> Retry
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => removeDownload(download.id)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Remove
                  </Button>
                </CardFooter>
              </Card>
            ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Download className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No downloads found</h3>
            {searchTerm ? (
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  No downloads match your search criteria
                </p>
                <Button variant="outline" onClick={() => setSearchTerm("")}>
                  Clear search
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  Your download queue is empty. Add games to start downloading.
                </p>
                <Sheet>
                  <SheetTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" /> Add Game
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Add Game to Download</SheetTitle>
                      <SheetDescription>
                        Enter a Steam store URL or App ID to add a game to your download queue
                      </SheetDescription>
                    </SheetHeader>
                    <div className="mt-6 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="steam-url-empty">Steam Store URL or App ID</Label>
                        <div className="flex gap-2">
                          <Input
                            id="steam-url-empty"
                            placeholder="https://store.steampowered.com/app/..."
                            value={steamUrl}
                            onChange={(e) => setSteamUrl(e.target.value)}
                          />
                          <Button variant="secondary" onClick={handleAddDownload}>
                            <Search className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Example: https://store.steampowered.com/app/1091500/Cyberpunk_2077/
                        </p>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Steam Guard Dialog */}
      <Dialog 
        open={steamGuardDownloadId !== undefined} 
        onOpenChange={(open) => !open && setSteamGuardDownloadId(undefined)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Steam Guard Authentication Required</DialogTitle>
            <DialogDescription>
              Please enter the Steam Guard code that was sent to your email or mobile app
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center gap-4">
              <ShieldAlert className="h-10 w-10 text-amber-500" />
              <div>
                <Label htmlFor="steamguard" className="text-left">
                  Steam Guard Code
                </Label>
                <Input
                  id="steamguard"
                  placeholder="XXXXX"
                  className="mt-1"
                  maxLength={5}
                  value={steamGuardCode}
                  onChange={(e) => setSteamGuardCode(e.target.value.toUpperCase())}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSteamGuardDownloadId(undefined)}>
              Cancel
            </Button>
            <Button onClick={handleSteamGuardSubmit} disabled={steamGuardCode.length < 5}>
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 