import React, { useState, useMemo } from "react";
import { useLibrary } from "../hooks/use-library";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { MoreVertical, Search, Filter, HardDrive, ArrowUpDown, Package, PlayCircle, Share2, Trash2 } from "lucide-react";
import GameCard from "../components/game-card";
import { ScrollArea } from "../components/ui/scroll-area";
import { Progress } from "../components/ui/progress";

export default function GameLibrary() {
  const { games, removeGame, compressGame, uncompressGame, runGame } = useLibrary();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [isCompressingGame, setIsCompressingGame] = useState(false);
  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  };
  
  const handleSort = (criteria: string) => {
    if (sortBy === criteria) {
      toggleSortOrder();
    } else {
      setSortBy(criteria);
      setSortOrder("asc");
    }
  };
  
  const filteredGames = useMemo(() => {
    let filtered = [...games];
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(game => 
        game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        game.appId.toString().includes(searchQuery)
      );
    }
    
    // Apply category filter
    if (filterCategory !== "all") {
      if (filterCategory === "compressed") {
        filtered = filtered.filter(game => game.compressed);
      } else if (filterCategory === "uncompressed") {
        filtered = filtered.filter(game => !game.compressed);
      }
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === "size") {
        comparison = a.sizeInBytes - b.sizeInBytes;
      } else if (sortBy === "date") {
        comparison = new Date(a.addedDate).getTime() - new Date(b.addedDate).getTime();
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });
    
    return filtered;
  }, [games, searchQuery, filterCategory, sortBy, sortOrder]);
  
  const totalGames = games.length;
  const compressedGames = games.filter(game => game.compressed).length;
  const totalSizeGB = (games.reduce((total, game) => total + game.sizeInBytes, 0) / (1024 * 1024 * 1024)).toFixed(2);
  
  const handleCompressGame = async (game: any) => {
    setSelectedGame(game);
    setIsCompressingGame(true);
    try {
      await compressGame(game.id);
    } finally {
      setIsCompressingGame(false);
    }
  };
  
  const handleUncompressGame = async (game: any) => {
    setSelectedGame(game);
    try {
      await uncompressGame(game.id);
    } finally {
      setSelectedGame(null);
    }
  };
  
  const handleRunGame = (game: any) => {
    runGame(game.id);
  };
  
  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Game Library</h2>
        <p className="text-muted-foreground">
          Manage your downloaded games and backups.
        </p>
      </div>
      
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Games</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGames}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Compressed Games</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{compressedGames}</div>
            <Progress 
              value={(compressedGames / (totalGames || 1)) * 100} 
              className="h-2 mt-2" 
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Storage Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSizeGB} GB</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Space Saved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(games.reduce((total, game) => 
                total + (game.compressed ? (game.originalSizeInBytes - game.sizeInBytes) : 0), 0) 
                / (1024 * 1024 * 1024)).toFixed(2)} GB
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search games..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex gap-1">
                <Filter className="h-4 w-4" />
                <span>Filter</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFilterCategory("all")}>
                All Games
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterCategory("compressed")}>
                Compressed Only
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterCategory("uncompressed")}>
                Uncompressed Only
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex gap-1">
                <ArrowUpDown className="h-4 w-4" />
                <span>Sort</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleSort("name")}>
                By Name
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort("size")}>
                By Size
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort("date")}>
                By Date Added
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {filteredGames.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGames.map(game => (
            <GameCard
              key={game.id}
              game={game}
              onRun={() => handleRunGame(game)}
              onCompress={() => handleCompressGame(game)}
              onUncompress={() => handleUncompressGame(game)}
              onRemove={() => removeGame(game.id)}
            />
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-6 space-y-4">
            <HardDrive className="h-12 w-12 text-muted-foreground" />
            <CardTitle>No games found</CardTitle>
            <CardDescription>
              {games.length > 0 
                ? "Try adjusting your filters or search query."
                : "Your library is empty. Download some games to get started."}
            </CardDescription>
          </CardContent>
        </Card>
      )}
      
      {selectedGame && (
        <Dialog open={isCompressingGame} onOpenChange={setIsCompressingGame}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Compressing Game</DialogTitle>
              <DialogDescription>
                Compressing {selectedGame.name}. This process may take a while depending on the game size.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Progress value={selectedGame.compressionProgress} className="h-2" />
              <p className="text-sm text-center text-muted-foreground">
                {selectedGame.compressionProgress}% complete
              </p>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsCompressingGame(false)}
                disabled={selectedGame.compressionProgress < 100}
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
} 