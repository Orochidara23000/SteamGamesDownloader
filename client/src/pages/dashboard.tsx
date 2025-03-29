import React from "react";
import { Link } from "wouter";
import { useLibrary } from "@/context/library-context";
import { useDownloads } from "@/context/download-context";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Archive, Download, HardDrive, Package, Pause, Play, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { games, compressionJobs } = useLibrary();
  const { downloads, activeDownloads, queuedDownloads, pauseDownload, resumeDownload } = useDownloads();

  // Get counts
  const totalGames = games.length;
  const compressedGames = games.filter(game => game.isCompressed).length;
  const activeDownloadCount = activeDownloads.length;
  const queuedDownloadCount = queuedDownloads.length;
  const completedDownloads = downloads.filter(d => d.status === "completed").length;

  // Get total downloaded size
  const totalDownloadedSize = games.reduce((total, game) => {
    const sizeStr = game.installSize || "0 MB";
    const sizeNum = parseFloat(sizeStr);
    if (isNaN(sizeNum)) return total;
    
    if (sizeStr.includes("GB")) return total + sizeNum * 1024;
    if (sizeStr.includes("MB")) return total + sizeNum;
    if (sizeStr.includes("KB")) return total + sizeNum / 1024;
    
    return total;
  }, 0);

  // Get saved space from compression
  const savedSpaceFromCompression = games.reduce((total, game) => {
    if (!game.isCompressed || !game.installSize || !game.compressedSize) return total;
    
    const installSize = parseFloat(game.installSize);
    const compressedSize = parseFloat(game.compressedSize);
    
    if (isNaN(installSize) || isNaN(compressedSize)) return total;
    
    // Convert to MB for consistency
    let installSizeMB = installSize;
    let compressedSizeMB = compressedSize;
    
    if (game.installSize.includes("GB")) installSizeMB = installSize * 1024;
    if (game.compressedSize.includes("GB")) compressedSizeMB = compressedSize * 1024;
    
    return total + (installSizeMB - compressedSizeMB);
  }, 0);

  // Active compression jobs
  const activeCompressionJobs = compressionJobs.filter(
    job => job.status === "pending" || job.status === "compressing"
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of your Steam game downloads and library
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Games</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGames}</div>
            <p className="text-xs text-muted-foreground">
              {compressedGames} compressed
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Downloads</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeDownloadCount}</div>
            <p className="text-xs text-muted-foreground">
              {queuedDownloadCount} in queue
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Downloaded Size</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalDownloadedSize > 1024 
                ? `${(totalDownloadedSize / 1024).toFixed(2)} GB` 
                : `${totalDownloadedSize.toFixed(2)} MB`}
            </div>
            <p className="text-xs text-muted-foreground">
              {completedDownloads} completed downloads
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Space Saved</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {savedSpaceFromCompression > 1024 
                ? `${(savedSpaceFromCompression / 1024).toFixed(2)} GB` 
                : `${savedSpaceFromCompression.toFixed(2)} MB`}
            </div>
            <p className="text-xs text-muted-foreground">
              From compression
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Active Downloads</CardTitle>
            <CardDescription>
              Currently downloading games
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeDownloads.length === 0 && queuedDownloads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Download className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="mb-2">No active downloads</p>
                <Button variant="outline" asChild>
                  <Link href="/queue"><Search className="mr-2 h-4 w-4" /> Find games to download</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {activeDownloads.map(download => (
                  <div key={download.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-medium">{download.title}</span>
                        <div className="text-xs text-muted-foreground">
                          {download.currentSpeed && `${download.currentSpeed} • `}
                          {download.estimatedSize && `Est. size: ${download.estimatedSize}`}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => pauseDownload(download.id)}
                      >
                        <Pause className="h-4 w-4 mr-2" /> Pause
                      </Button>
                    </div>
                    <Progress value={download.progress || 0} className="h-2" />
                  </div>
                ))}
                
                {queuedDownloads.length > 0 && (
                  <>
                    <div className="text-sm font-medium mt-4">Queue</div>
                    <div className="space-y-2">
                      {queuedDownloads.slice(0, 2).map(download => (
                        <div key={download.id} className="flex justify-between items-center py-1">
                          <div>
                            <span>{download.title}</span>
                            <div className="text-xs text-muted-foreground">
                              {download.estimatedSize ? `Est. size: ${download.estimatedSize}` : "Queued"}
                            </div>
                          </div>
                          <Badge>Position {download.queuePosition || "?"}</Badge>
                        </div>
                      ))}
                      {queuedDownloads.length > 2 && (
                        <Link href="/queue" className="text-xs text-blue-500 hover:underline">
                          +{queuedDownloads.length - 2} more in queue
                        </Link>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
          {(activeDownloads.length > 0 || queuedDownloads.length > 0) && (
            <CardFooter>
              <Button variant="outline" asChild className="w-full">
                <Link href="/queue">Manage Queue</Link>
              </Button>
            </CardFooter>
          )}
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Compression Activities</CardTitle>
            <CardDescription>
              Active compression jobs and recent compressed games
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeCompressionJobs.length === 0 && compressedGames === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Archive className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="mb-2">No compression activities</p>
                <Button variant="outline" asChild>
                  <Link href="/library">Go to Library</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {activeCompressionJobs.map(job => (
                  <div key={job.appId} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-medium">{job.title}</span>
                        <div className="text-xs text-muted-foreground">
                          Format: {job.format}
                        </div>
                      </div>
                      <Badge>{job.status}</Badge>
                    </div>
                    <Progress value={job.progress || 0} className="h-2" />
                    <div className="text-xs text-right text-muted-foreground">
                      {job.progress}% complete
                    </div>
                  </div>
                ))}
                
                {compressedGames > 0 && (
                  <div className="mt-4">
                    <div className="text-sm font-medium mb-2">Compressed Games</div>
                    <div className="flex justify-between items-center">
                      <span>{compressedGames} games compressed</span>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href="/library?tab=compressed">View All</Link>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your recent downloads and compressions</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="downloads" className="w-full">
            <TabsList>
              <TabsTrigger value="downloads">Downloads</TabsTrigger>
              <TabsTrigger value="compressed">Compressed Games</TabsTrigger>
            </TabsList>
            <TabsContent value="downloads" className="mt-4">
              {downloads.filter(d => d.status === "completed").length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No completed downloads yet
                </div>
              ) : (
                <div className="space-y-2">
                  {downloads
                    .filter(d => d.status === "completed")
                    .slice(0, 5)
                    .map(download => (
                      <div key={download.id} className="flex justify-between items-center p-2 rounded hover:bg-muted">
                        <div>
                          <div className="font-medium">{download.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {download.completedAt && new Date(download.completedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <Badge variant="secondary">{download.estimatedSize}</Badge>
                      </div>
                    ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="compressed" className="mt-4">
              {compressedGames === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No compressed games yet
                </div>
              ) : (
                <div className="space-y-2">
                  {games
                    .filter(game => game.isCompressed)
                    .slice(0, 5)
                    .map(game => (
                      <div key={game.id} className="flex justify-between items-center p-2 rounded hover:bg-muted">
                        <div>
                          <div className="font-medium">{game.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {game.compressionType} • Saved {game.installSize && game.compressedSize ? 
                              `${calculateSavedSpace(game.installSize, game.compressedSize)}` : 
                              "space"}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => window.location.href = `/api/library/compressed/download?path=${encodeURIComponent(game.compressedPath || "")}`}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper function to calculate saved space
function calculateSavedSpace(originalSize: string, compressedSize: string): string {
  try {
    const getNumericValue = (sizeStr: string): number => {
      const num = parseFloat(sizeStr);
      if (sizeStr.includes("GB")) return num * 1024;
      if (sizeStr.includes("MB")) return num;
      if (sizeStr.includes("KB")) return num / 1024;
      return num;
    };
    
    const original = getNumericValue(originalSize);
    const compressed = getNumericValue(compressedSize);
    const saved = original - compressed;
    const percentage = Math.round((saved / original) * 100);
    
    return `${percentage}%`;
  } catch {
    return "some space";
  }
} 