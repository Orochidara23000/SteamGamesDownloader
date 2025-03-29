import React from "react";
import { useSettings } from "../hooks/use-settings";
import { useTheme } from "../hooks/use-theme";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Switch } from "../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Separator } from "../components/ui/separator";

export default function Settings() {
  const { settings, updateSettings, resetSettings } = useSettings();
  const { theme, setTheme } = useTheme();
  
  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
  };
  
  const handlePathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSettings({ downloadPath: e.target.value });
  };
  
  const handleMaxDownloadsChange = (value: string) => {
    updateSettings({ maxConcurrentDownloads: parseInt(value) });
  };
  
  const handleAutoCompressChange = (checked: boolean) => {
    updateSettings({ autoCompress: checked });
  };
  
  const handleCompressLevelChange = (value: string) => {
    updateSettings({ compressionLevel: parseInt(value) });
  };

  const handleAutoRunChange = (checked: boolean) => {
    updateSettings({ autoRun: checked });
  };
  
  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your application preferences and configuration.
        </p>
      </div>
      
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="downloads">Downloads</TabsTrigger>
          <TabsTrigger value="compression">Compression</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize how Steam Download Master looks and feels.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select value={theme} onValueChange={handleThemeChange}>
                  <SelectTrigger id="theme">
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoRun">Start on system boot</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically start Steam Download Master when your system starts.
                  </p>
                </div>
                <Switch
                  id="autoRun"
                  checked={settings.autoRun}
                  onCheckedChange={handleAutoRunChange}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="downloads" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Download Settings</CardTitle>
              <CardDescription>
                Configure how Steam Download Master manages your downloads.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="downloadPath">Default download location</Label>
                <div className="flex space-x-2">
                  <Input
                    id="downloadPath"
                    value={settings.downloadPath}
                    onChange={handlePathChange}
                    placeholder="C:\Games"
                  />
                  <Button variant="secondary">Browse</Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="maxDownloads">Maximum concurrent downloads</Label>
                <Select 
                  value={settings.maxConcurrentDownloads.toString()} 
                  onValueChange={handleMaxDownloadsChange}
                >
                  <SelectTrigger id="maxDownloads">
                    <SelectValue placeholder="Select number" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Limit how many games can be downloaded simultaneously.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="compression" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compression Settings</CardTitle>
              <CardDescription>
                Configure how Steam Download Master compresses your games.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoCompress">Auto-compress downloaded games</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically compress games after download completes.
                  </p>
                </div>
                <Switch
                  id="autoCompress"
                  checked={settings.autoCompress}
                  onCheckedChange={handleAutoCompressChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="compressionLevel">Compression level</Label>
                <Select 
                  value={settings.compressionLevel.toString()} 
                  onValueChange={handleCompressLevelChange}
                  disabled={!settings.autoCompress}
                >
                  <SelectTrigger id="compressionLevel">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Low (Faster)</SelectItem>
                    <SelectItem value="5">Medium</SelectItem>
                    <SelectItem value="9">High (Smaller size)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Higher levels result in smaller files but take longer to compress.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>
                Configuration options for advanced users.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="steamPath">Steam installation path</Label>
                <div className="flex space-x-2">
                  <Input
                    id="steamPath"
                    value={settings.steamPath}
                    onChange={(e) => updateSettings({ steamPath: e.target.value })}
                    placeholder="C:\Program Files (x86)\Steam"
                  />
                  <Button variant="secondary">Browse</Button>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Danger Zone</h3>
                <p className="text-sm text-muted-foreground">
                  These actions can't be undone. Be careful!
                </p>
                <div className="flex justify-between items-center pt-2">
                  <div>
                    <h4 className="font-medium">Reset all settings</h4>
                    <p className="text-sm text-muted-foreground">
                      This will reset all settings to their default values.
                    </p>
                  </div>
                  <Button variant="destructive" onClick={resetSettings}>
                    Reset Settings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 