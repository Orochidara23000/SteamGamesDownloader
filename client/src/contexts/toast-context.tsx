import React, { createContext, useRef, useState } from "react";
import { Toaster } from "../components/ui/toaster";
import { Toast, ToastActionElement, ToastProps } from "../components/ui/toast";

type ToastType = "default" | "destructive" | "success" | "warning" | "info";

export interface ToastOptions {
  title?: string;
  description?: string;
  action?: ToastActionElement;
  type?: ToastType;
  duration?: number;
}

interface ToastContextType {
  toast: (options: ToastOptions) => void;
  success: (options: Omit<ToastOptions, "type">) => void;
  error: (options: Omit<ToastOptions, "type">) => void;
  warning: (options: Omit<ToastOptions, "type">) => void;
  info: (options: Omit<ToastOptions, "type">) => void;
  dismiss: (toastId?: string) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastProps[]>([]);
  const toastIdCounter = useRef(0);
  
  const addToast = (options: ToastOptions, type: ToastType = "default") => {
    const id = `toast-${Date.now()}-${toastIdCounter.current++}`;
    const newToast: ToastProps = {
      id,
      title: options.title,
      description: options.description,
      action: options.action,
      variant: type,
      duration: options.duration || 5000,
    };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto dismiss
    if (options.duration !== Infinity) {
      const timeout = setTimeout(() => {
        dismiss(id);
      }, options.duration || 5000);
      
      return () => clearTimeout(timeout);
    }
  };
  
  const dismiss = (toastId?: string) => {
    if (toastId) {
      setToasts(prev => prev.filter(toast => toast.id !== toastId));
    } else {
      setToasts([]);
    }
  };
  
  const toast = (options: ToastOptions) => addToast(options, options.type || "default");
  const success = (options: Omit<ToastOptions, "type">) => addToast(options, "success");
  const error = (options: Omit<ToastOptions, "type">) => addToast(options, "destructive");
  const warning = (options: Omit<ToastOptions, "type">) => addToast(options, "warning");
  const info = (options: Omit<ToastOptions, "type">) => addToast(options, "info");
  
  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info, dismiss }}>
      {children}
      <Toaster toasts={toasts} />
    </ToastContext.Provider>
  );
} 