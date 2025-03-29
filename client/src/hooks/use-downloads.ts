import { useContext } from "react";
import { DownloadsContext } from "../contexts/downloads-context";

export function useDownloads() {
  const context = useContext(DownloadsContext);
  
  if (!context) {
    throw new Error("useDownloads must be used within a DownloadsProvider");
  }
  
  return context;
} 