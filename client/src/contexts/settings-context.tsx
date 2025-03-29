import React, { createContext, useState, useEffect } from "react";

interface Settings {
  downloadPath: string;
  maxConcurrentDownloads: number;
  compressionLevel: number;
  autoCompress: boolean;
  autoRun: boolean;
  steamPath: string;
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  resetSettings: () => void;
}

const defaultSettings: Settings = {
  downloadPath: "C:\\Games",
  maxConcurrentDownloads: 2,
  compressionLevel: 5,
  autoCompress: false,
  autoRun: false,
  steamPath: "C:\\Program Files (x86)\\Steam",
};

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: React.ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<Settings>(() => {
    const savedSettings = localStorage.getItem("settings");
    return savedSettings ? JSON.parse(savedSettings) : defaultSettings;
  });
  
  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("settings", JSON.stringify(settings));
  }, [settings]);
  
  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings,
    }));
  };
  
  const resetSettings = () => {
    setSettings(defaultSettings);
  };
  
  const value = {
    settings,
    updateSettings,
    resetSettings,
  };
  
  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
} 