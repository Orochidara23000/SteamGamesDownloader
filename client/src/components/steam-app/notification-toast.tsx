import React, { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { NotificationType, Notification } from "@/lib/types";
import { cn } from "@/lib/utils";

interface NotificationContextType {
  showNotification: (title: string, message: string, type?: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = (title: string, message: string, type: NotificationType = "info") => {
    const id = Date.now().toString();
    setNotifications((prev) => [...prev, { id, title, message, type }]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter(notification => notification.id !== id));
    }, 5000);
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {notifications.map((notification) => (
          <NotificationToast 
            key={notification.id} 
            notification={notification} 
            onClose={() => {
              setNotifications((prev) => prev.filter(n => n.id !== notification.id));
            }} 
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

interface NotificationToastProps {
  notification: Notification;
  onClose: () => void;
}

function NotificationToast({ notification, onClose }: NotificationToastProps) {
  const { title, message, type } = notification;
  
  // Define icon and classes based on notification type
  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-success" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-error" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      default:
        return <Info className="h-5 w-5 text-steam-light-blue" />;
    }
  };

  return (
    <div 
      className={cn(
        "bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-md flex items-start animate-in fade-in slide-in-from-bottom-5",
        "border-l-4",
        {
          "border-success": type === "success",
          "border-error": type === "error",
          "border-warning": type === "warning",
          "border-steam-blue": type === "info",
        }
      )}
    >
      <div className="flex-shrink-0">
        {getIcon()}
      </div>
      <div className="ml-3 flex-1">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          {title}
        </h3>
        <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {message}
        </div>
      </div>
      <button 
        type="button" 
        className="ml-auto pl-3 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
