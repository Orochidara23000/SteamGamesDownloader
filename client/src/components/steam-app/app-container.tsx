import React, { useState, useEffect } from "react";
import { Settings, Download } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { DownloadSection } from "./download-section";
import { QueueSection } from "./queue-section";
import { LibrarySection } from "./library-section";
import { SettingsSection } from "./settings-section";
import { useQuery } from "@tanstack/react-query";
import { StatusInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab = "download" | "queue" | "library" | "settings";

export function AppContainer() {
  const [activeTab, setActiveTab] = useState<Tab>("download");
  
  // Status query
  const { data: statusInfo } = useQuery<StatusInfo>({
    queryKey: ['/api/status'],
    refetchInterval: 5000,
    initialData: {
      steamCmdConnected: true,
      currentOperation: "Ready",
      diskSpace: "125.4 GB free",
      networkSpeed: "0 MB/s"
    }
  });

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-steam-bg text-white shadow-md">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          {/* App Logo and Title */}
          <div className="flex items-center space-x-3">
            <svg className="w-8 h-8 text-steam-light-blue" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12c0 5.52 4.48 10 10 10s10-4.48 10-10C22 6.48 17.52 2 12 2zm-1 14.5c-3.03 0-5.5-2.47-5.5-5.5S7.97 5.5 11 5.5s5.5 2.47 5.5 5.5-2.47 5.5-5.5 5.5z"/>
            </svg>
            <h1 className="text-xl font-semibold">Steam Game Downloader</h1>
          </div>
          
          {/* Dark Mode Toggle and Settings */}
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <button 
              className="p-2 rounded-full hover:bg-steam-dark-blue"
              onClick={() => setActiveTab("settings")}
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <ul className="flex flex-wrap -mb-px">
              <TabItem
                active={activeTab === "download"}
                onClick={() => setActiveTab("download")}
                icon={<i className="fas fa-download mr-2"></i>}
                label="Download Games"
              />
              <TabItem
                active={activeTab === "queue"}
                onClick={() => setActiveTab("queue")}
                icon={<i className="fas fa-list mr-2"></i>}
                label="Download Queue"
              />
              <TabItem
                active={activeTab === "library"}
                onClick={() => setActiveTab("library")}
                icon={<i className="fas fa-book mr-2"></i>}
                label="My Library"
              />
              <TabItem
                active={activeTab === "settings"}
                onClick={() => setActiveTab("settings")}
                icon={<i className="fas fa-cog mr-2"></i>}
                label="Settings"
              />
            </ul>
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === "download" && <DownloadSection />}
          {activeTab === "queue" && <QueueSection />}
          {activeTab === "library" && <LibrarySection />}
          {activeTab === "settings" && <SettingsSection />}
        </div>
      </main>

      {/* Status Bar */}
      <footer className="bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-2 px-4">
        <div className="container mx-auto flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center">
            <span className={cn(
              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-2",
              statusInfo?.steamCmdConnected 
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
            )}>
              <span className={cn(
                "h-2 w-2 rounded-full mr-1", 
                statusInfo?.steamCmdConnected ? "bg-green-500" : "bg-red-500"
              )}></span>
              {statusInfo?.steamCmdConnected ? "SteamCMD Connected" : "SteamCMD Disconnected"}
            </span>
            <span>{statusInfo?.currentOperation}</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>{statusInfo?.diskSpace}</span>
            <span>{statusInfo?.networkSpeed}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

interface TabItemProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function TabItem({ active, onClick, icon, label }: TabItemProps) {
  return (
    <li className="mr-2">
      <a
        href="#"
        className={cn(
          "inline-block p-4 font-medium",
          active
            ? "border-b-2 border-steam-blue text-steam-blue dark:text-steam-light-blue dark:border-steam-light-blue"
            : "text-gray-500 hover:text-steam-blue dark:text-gray-400 dark:hover:text-steam-light-blue"
        )}
        onClick={(e) => {
          e.preventDefault();
          onClick();
        }}
      >
        {icon} {label}
      </a>
    </li>
  );
}
