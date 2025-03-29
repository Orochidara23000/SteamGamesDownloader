import React from "react";
import ReactDOM from "react-dom/client";
import { Route, Router, Switch } from "wouter";
import { LibraryProvider } from "./contexts/library-context";
import { DownloadsProvider } from "./contexts/downloads-context";
import { ThemeProvider } from "./contexts/theme-context";
import { ToastProvider } from "./contexts/toast-context";
import { SettingsProvider } from "./contexts/settings-context";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <SettingsProvider>
          <LibraryProvider>
            <DownloadsProvider>
              <Router>
                <App />
              </Router>
            </DownloadsProvider>
          </LibraryProvider>
        </SettingsProvider>
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>
);
