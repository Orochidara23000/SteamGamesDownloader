import React, { useState } from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useNotification } from "./notification-toast";

interface SteamGuardModalProps {
  open: boolean;
  onClose: () => void;
  downloadId: number | null;
  onSuccess?: () => void;
}

export function SteamGuardModal({ open, onClose, downloadId, onSuccess }: SteamGuardModalProps) {
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showNotification } = useNotification();

  const handleSubmit = async () => {
    if (!code || !downloadId) return;
    
    try {
      setIsSubmitting(true);
      
      await apiRequest("POST", "/api/steam/guard", {
        downloadId,
        code
      });
      
      showNotification("Success", "Steam Guard code submitted successfully", "success");
      onSuccess?.();
      onClose();
      
    } catch (error) {
      console.error("Failed to submit Steam Guard code:", error);
      showNotification(
        "Error", 
        error instanceof Error ? error.message : "Failed to submit Steam Guard code",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Steam Guard Authentication</DialogTitle>
          <button 
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </DialogHeader>
        
        <div className="flex flex-col space-y-4 py-2">
          <p className="text-gray-600 dark:text-gray-400">
            Please enter the Steam Guard code sent to your email or mobile authenticator.
          </p>
          
          <div className="grid gap-2">
            <Label htmlFor="guard-code">Steam Guard Code</Label>
            <Input
              id="guard-code"
              placeholder="XXXXX"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={5}
              className="w-full"
              autoComplete="off"
            />
          </div>
        </div>
        
        <DialogFooter className="sm:justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!code || isSubmitting}
            onClick={handleSubmit}
            className="bg-steam-blue hover:bg-steam-dark-blue text-white"
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
