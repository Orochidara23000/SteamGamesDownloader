import React, { useState } from "react";
import { useLibrary } from "@/context/library-context";
import { CompressionFormat } from "@shared/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Archive, Download, MoreVertical, Package2, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export default function Library() {
  const {
    games,
    isLoading,
    error,
    compressGame,
    downloadCompressedGame,
    deleteGame,
    compressionJobs,
  } = useLibrary();

  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [compressionFormat, setCompressionFormat] = useState<CompressionFormat>("zip");
  const [compressionLevel, setCompressionLevel] = useState<number>(6);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const compressedGames = games.filter((game) => game.isCompressed);
  const uncompressedGames = games.filter((game) => !game.isCompressed);

  const filteredGames = games.filter((game) => {
    const matchesSearch = game.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      activeTab === "all" ||
      (activeTab === "compressed" && game.isCompressed) ||
      (activeTab === "uncompressed" && !game.isCompressed);
    return matchesSearch && matchesFilter;
  });

  // Find active compression jobs
  const activeJobs = compressionJobs.filter(
    (job) => job.status === "pending" || job.status === "compressing"
  );

  // Helper function to format size
  const formatSize = (size: string | null | undefined) => {
    if (!size) return "Unknown size";
    return size;
  };

  const handleCompress = async (appId: string) => {
    await compressGame(appId, compressionFormat, compressionLevel);
    setSelectedGame(null);
  };

  const handleDelete = async (appId: string) => {
    if (window.confirm("Are you sure you want to delete this game?")) {
      await deleteGame(appId);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Game Library</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array(8)
            .fill(0)
            .map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
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
          Failed to load your game library: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Game Library</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="Search games..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="compressed">Compressed</TabsTrigger>
              <TabsTrigger value="uncompressed">Uncompressed</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {activeJobs.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Active Compression Jobs</h3>
          <div className="space-y-3">
            {activeJobs.map((job) => (
              <Card key={job.appId}>
                <CardContent className="py-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{job.title}</span>
                      <Badge>{job.status}</Badge>
                    </div>
                    <Progress value={job.progress} className="h-2" />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Format: {job.format}</span>
                      <span>{job.progress}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {games.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package2 className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Your library is empty</h3>
            <p className="text-center text-muted-foreground max-w-md mb-6">
              You don't have any games in your library yet. Download games to add them here.
            </p>
          </CardContent>
        </Card>
      ) : filteredGames.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No games found</h3>
            <p className="text-center text-muted-foreground max-w-md mb-6">
              No games matched your search criteria. Try changing your search or filters.
            </p>
            <Button variant="outline" onClick={() => { setSearchTerm(""); setActiveTab("all"); }}>
              Clear filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredGames.map((game) => (
            <Card key={game.appId} className="overflow-hidden flex flex-col">
              <div className="relative pt-[56.25%] bg-muted">
                <img
                  src={game.headerImage || "/placeholder-game.jpg"}
                  alt={game.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
              <CardHeader className="p-4">
                <CardTitle className="text-lg">{game.title}</CardTitle>
                <CardDescription>
                  {formatSize(game.installSize)}
                  {game.isCompressed && (
                    <Badge variant="outline" className="ml-2">
                      Compressed: {game.compressedSize}
                    </Badge>
                  )}
                </CardDescription>
              </CardHeader>
              <CardFooter className="p-4 pt-0 mt-auto">
                <div className="w-full flex justify-between">
                  {game.isCompressed ? (
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1 mr-2"
                      onClick={() => downloadCompressedGame(game.compressedPath!)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  ) : (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1 mr-2"
                          onClick={() => setSelectedGame(game.appId)}
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          Compress
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Compress Game</DialogTitle>
                          <DialogDescription>
                            Choose compression options for {game.title}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="format">Compression Format</Label>
                            <Select
                              value={compressionFormat}
                              onValueChange={(value) => setCompressionFormat(value as CompressionFormat)}
                            >
                              <SelectTrigger id="format">
                                <SelectValue placeholder="Select format" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="zip">ZIP (most compatible)</SelectItem>
                                <SelectItem value="tar">TAR.GZ (better compression)</SelectItem>
                                <SelectItem value="7z">7Z (best compression)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="level">
                              Compression Level: {compressionLevel}
                            </Label>
                            <Slider
                              id="level"
                              min={1}
                              max={9}
                              step={1}
                              value={[compressionLevel]}
                              onValueChange={(value) => setCompressionLevel(value[0])}
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Fastest</span>
                              <span>Balanced</span>
                              <span>Smallest</span>
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setSelectedGame(null)}>
                            Cancel
                          </Button>
                          <Button onClick={() => handleCompress(selectedGame!)}>
                            Start Compression
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleDelete(game.appId)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 