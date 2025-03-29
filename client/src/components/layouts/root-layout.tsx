import React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { Toaster } from "../ui/toaster";
import { useTheme } from "../../hooks/use-theme";
import { 
  LayoutDashboard, 
  Download, 
  Library, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Steam
} from "lucide-react";

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const { theme } = useTheme();

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  
  const routes = [
    {
      href: "/",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/downloads",
      label: "Downloads",
      icon: Download,
    },
    {
      href: "/library",
      label: "Game Library",
      icon: Library,
    },
    {
      href: "/settings",
      label: "Settings",
      icon: Settings,
    },
  ];
  
  return (
    <div className={`grid min-h-screen grid-cols-1 md:grid-cols-[280px_1fr] ${theme}`}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={toggleSidebar}
        />
      )}
      
      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-[280px] flex-col border-r bg-sidebar-background text-sidebar-foreground transition-transform duration-300 md:static md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="sticky top-0 flex h-16 items-center justify-between border-b border-sidebar-border px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold text-xl">
            <Steam className="h-6 w-6 text-sidebar-primary" />
            <span>Steam DM</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={toggleSidebar}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <ScrollArea className="h-[calc(100vh-64px)]">
          <div className="flex flex-col gap-2 p-4">
            <div className="px-2 py-2">
              <h2 className="text-sidebar-foreground/40 text-xs font-medium uppercase tracking-wider">
                Navigation
              </h2>
            </div>
            {routes.map((route) => {
              const isActive = location === route.href;
              const Icon = route.icon;
              
              return (
                <Link key={route.href} href={route.href}>
                  <Button
                    variant={isActive ? "sidebar" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-2",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {route.label}
                  </Button>
                </Link>
              );
            })}
          </div>
          
          <div className="mt-auto px-4 py-4">
            <Button
              variant="outline"
              className="w-full justify-start gap-2 border-sidebar-border text-sidebar-foreground"
            >
              <LogOut className="h-5 w-5" />
              Exit
            </Button>
          </div>
        </ScrollArea>
      </div>
      
      {/* Main content */}
      <div className="flex flex-col">
        {/* Mobile header */}
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={toggleSidebar}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Steam className="h-5 w-5" />
            <span>Steam Download Master</span>
          </Link>
        </header>
        
        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
      
      <Toaster />
    </div>
  );
} 