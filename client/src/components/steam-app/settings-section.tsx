import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Settings } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNotification } from "./notification-toast";
import { Separator } from "@/components/ui/separator";

export function SettingsSection() {
  const [settings, setSettings] = useState<Settings>({
    id: 1,
    steamCmdPath: '',
    downloadPath: '',
    maxConcurrentDownloads: 1,
    throttleDownloads: false,
    maxDownloadSpeed: 10,
    autoStart: false,
    minimizeToTray: true,
    verifyDownloads: true,
    apiKey: '',
  });
  
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();
  
  // Settings Query
  const { data: settingsData, isLoading } = useQuery<Settings>({
    queryKey: ['/api/settings']
  });
  
  // Update settings when data is fetched
  useEffect(() => {
    if (settingsData) {
      setSettings(settingsData);
    }
  }, [settingsData]);
  
  // Update Settings Mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<Settings>) => {
      await apiRequest("POST", "/api/settings", newSettings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      showNotification("Success", "Settings updated successfully", "success");
    },
    onError: (error) => {
      showNotification(
        "Error", 
        error instanceof Error ? error.message : "Failed to update settings", 
        "error"
      );
    }
  });
  
  // Test SteamCMD Connection
  const testConnectionMutation = useMutation({
    mutationFn: async (path: string) => {
      const response = await apiRequest("POST", "/api/settings/test-steamcmd", { path });
      return response;
    },
    onSuccess: (data) => {
      if (data.success) {
        showNotification("Success", "SteamCMD connection successful", "success");
      } else {
        showNotification("Error", "SteamCMD connection failed", "error");
      }
    },
    onError: (error) => {
      showNotification(
        "Error", 
        error instanceof Error ? error.message : "Failed to test SteamCMD connection", 
        "error"
      );
    }
  });
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type, checked } = e.target;
    
    setSettings(prev => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handleSelectChange = (key: keyof Settings, value: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: key === 'maxConcurrentDownloads' ? parseInt(value) : value
    }));
  };
  
  const handleSaveSettings = () => {
    updateSettingsMutation.mutate(settings);
  };
  
  const handleResetToDefault = () => {
    if (settingsData) {
      setSettings(settingsData);
    }
  };
  
  const handleTestConnection = () => {
    testConnectionMutation.mutate(settings.steamCmdPath);
  };
  
  const handleBrowse = (key: 'steamCmdPath' | 'downloadPath') => {
    // In a real app, this would open a file browser
    showNotification("Info", "File browser functionality would open here", "info");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              Application Settings
            </h2>
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-md mb-4"></div>
              <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-md mb-4"></div>
              <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-md mb-4"></div>
              <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-md mb-4"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Application Settings
          </h2>
          
          <div className="space-y-6">
            {/* SteamCMD Path */}
            <div>
              <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
                SteamCMD Configuration
              </h3>
              <div className="flex items-end space-x-2 mb-2">
                <div className="flex-grow">
                  <Label htmlFor="steamCmdPath" className="mb-1">
                    SteamCMD Path
                  </Label>
                  <Input
                    type="text"
                    id="steamCmdPath"
                    value={settings.steamCmdPath}
                    onChange={handleInputChange}
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => handleBrowse('steamCmdPath')}
                >
                  Browse
                </Button>
              </div>
              <Button
                variant="default"
                className="mt-2 bg-steam-blue hover:bg-steam-dark-blue text-white"
                onClick={handleTestConnection}
                disabled={testConnectionMutation.isPending}
              >
                {testConnectionMutation.isPending ? 'Testing...' : 'Test Connection'}
              </Button>
            </div>
            
            <Separator />
            
            {/* Download Settings */}
            <div>
              <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
                Download Settings
              </h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="downloadPath" className="mb-1">
                    Default Download Path
                  </Label>
                  <div className="flex space-x-2">
                    <Input
                      type="text"
                      id="downloadPath"
                      value={settings.downloadPath}
                      onChange={handleInputChange}
                      className="flex-grow"
                    />
                    <Button
                      variant="outline"
                      onClick={() => handleBrowse('downloadPath')}
                    >
                      Browse
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="maxConcurrentDownloads" className="mb-1">
                    Maximum Concurrent Downloads
                  </Label>
                  <Select 
                    value={settings.maxConcurrentDownloads.toString()} 
                    onValueChange={(value) => handleSelectChange('maxConcurrentDownloads', value)}
                  >
                    <SelectTrigger id="maxConcurrentDownloads" className="w-32">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center">
                  <Checkbox
                    id="throttleDownloads"
                    checked={settings.throttleDownloads}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, throttleDownloads: checked === true }))
                    }
                  />
                  <Label htmlFor="throttleDownloads" className="ml-2">
                    Throttle Download Speed
                  </Label>
                </div>
                
                {settings.throttleDownloads && (
                  <div className="pl-6">
                    <Label htmlFor="maxDownloadSpeed" className="mb-1">
                      Maximum Download Speed (MB/s)
                    </Label>
                    <Input
                      type="number"
                      id="maxDownloadSpeed"
                      value={settings.maxDownloadSpeed || 10}
                      onChange={handleInputChange}
                      min={1}
                      max={100}
                      className="w-32"
                    />
                  </div>
                )}
              </div>
            </div>
            
            <Separator />
            
            {/* App Settings */}
            <div>
              <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
                Application Settings
              </h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <Checkbox
                    id="autoStart"
                    checked={settings.autoStart}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, autoStart: checked === true }))
                    }
                  />
                  <Label htmlFor="autoStart" className="ml-2">
                    Start with system
                  </Label>
                </div>
                
                <div className="flex items-center">
                  <Checkbox
                    id="minimizeToTray"
                    checked={settings.minimizeToTray}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, minimizeToTray: checked === true }))
                    }
                  />
                  <Label htmlFor="minimizeToTray" className="ml-2">
                    Minimize to system tray
                  </Label>
                </div>
                
                <div className="flex items-center">
                  <Checkbox
                    id="verifyDownloads"
                    checked={settings.verifyDownloads}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, verifyDownloads: checked === true }))
                    }
                  />
                  <Label htmlFor="verifyDownloads" className="ml-2">
                    Verify files after download
                  </Label>
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* API Settings */}
            <div>
              <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
                Steam Web API
              </h3>
              <div>
                <Label htmlFor="apiKey" className="mb-1">
                  Steam Web API Key (Optional)
                </Label>
                <Input
                  type="password"
                  id="apiKey"
                  value={settings.apiKey || ''}
                  onChange={handleInputChange}
                  placeholder="Enter your Steam Web API key"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Get your API key from <a href="https://steamcommunity.com/dev/apikey" className="text-steam-blue hover:underline" target="_blank" rel="noopener noreferrer">Steam Developer Portal</a>.
                  This allows enhanced game information retrieval.
                </p>
              </div>
            </div>
            
            <div className="pt-4 flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={handleResetToDefault}
                disabled={updateSettingsMutation.isPending}
              >
                Reset to Default
              </Button>
              <Button
                className="bg-steam-blue hover:bg-steam-dark-blue text-white"
                onClick={handleSaveSettings}
                disabled={updateSettingsMutation.isPending}
              >
                {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
