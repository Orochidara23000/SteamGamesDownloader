import React from "react";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { formatBytes } from "../lib/utils";
import { MoreVertical, Package, PlayCircle, FileArchive, FileCog, Trash2 } from "lucide-react";

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

interface GameCardProps {
  game: Game;
  onRun: () => void;
  onCompress: () => void;
  onUncompress: () => void;
  onRemove: () => void;
}

export default function GameCard({ game, onRun, onCompress, onUncompress, onRemove }: GameCardProps) {
  const savedSpace = game.compressed ? formatBytes(game.originalSizeInBytes - game.sizeInBytes) : 0;
  const compressionRatio = game.compressed 
    ? Math.round(100 - (game.sizeInBytes / game.originalSizeInBytes * 100)) 
    : 0;
  
  const formattedDate = new Date(game.addedDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
  
  return (
    <Card className="overflow-hidden">
      <div 
        className="h-48 bg-center bg-cover" 
        style={{ backgroundImage: `url(${game.thumbnailUrl || "/placeholder-game.jpg"})` }}
      />
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="font-semibold leading-tight text-lg line-clamp-1">{game.name}</h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline">App ID: {game.appId}</Badge>
              {game.compressed && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <FileArchive className="h-3 w-3" />
                  {compressionRatio}% smaller
                </Badge>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onRun}>
                <PlayCircle className="h-4 w-4 mr-2" />
                Launch Game
              </DropdownMenuItem>
              {game.compressed ? (
                <DropdownMenuItem onClick={onUncompress}>
                  <FileCog className="h-4 w-4 mr-2" />
                  Uncompress
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={onCompress}>
                  <Package className="h-4 w-4 mr-2" />
                  Compress
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={onRemove}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground">Size</p>
            <p className="font-medium">{formatBytes(game.sizeInBytes)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Added</p>
            <p className="font-medium">{formattedDate}</p>
          </div>
          {game.compressed && (
            <>
              <div>
                <p className="text-muted-foreground">Original</p>
                <p className="font-medium">{formatBytes(game.originalSizeInBytes)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Saved</p>
                <p className="font-medium">{savedSpace}</p>
              </div>
            </>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-1">
        <Button 
          variant="default" 
          className="w-full" 
          onClick={onRun}
        >
          <PlayCircle className="h-4 w-4 mr-2" />
          Play
        </Button>
      </CardFooter>
    </Card>
  );
} 