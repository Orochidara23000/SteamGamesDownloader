import React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  Download, 
  Home, 
  Settings, 
  Library, 
  Package, 
  Menu, 
  X 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface NavigationItem {
  title: string;
  href: string;
  icon: React.ReactNode;
}

const navigationItems: NavigationItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: <Home className="w-5 h-5" />,
  },
  {
    title: "Download Queue",
    href: "/queue",
    icon: <Download className="w-5 h-5" />,
  },
  {
    title: "Game Library",
    href: "/library",
    icon: <Library className="w-5 h-5" />,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: <Settings className="w-5 h-5" />,
  },
];

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [location] = useLocation();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="hidden md:flex w-64 flex-col bg-sidebar border-r border-sidebar-border">
          <div className="p-4 flex items-center gap-2">
            <Package className="w-6 h-6 text-sidebar-primary" />
            <h1 className="font-bold text-lg text-sidebar-foreground">Steam Download</h1>
          </div>
          <Separator className="bg-sidebar-border" />
          <nav className="flex-1 p-4 space-y-2">
            {navigationItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <a
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground transition-colors",
                    location === item.href && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  )}
                >
                  {item.icon}
                  <span>{item.title}</span>
                </a>
              </Link>
            ))}
          </nav>
          <div className="p-4">
            <div className="p-3 bg-sidebar-accent/20 rounded-md text-xs text-sidebar-muted">
              <p className="font-medium text-sidebar-foreground mb-1">Steam Download Master</p>
              <p>Download, compress and manage your Steam games with ease.</p>
            </div>
          </div>
        </aside>
      )}

      {/* Mobile Sidebar */}
      {isMobile && (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden absolute top-4 left-4 z-50">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-sidebar">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-6 h-6 text-sidebar-primary" />
                <h1 className="font-bold text-lg text-sidebar-foreground">Steam Download</h1>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <Separator className="bg-sidebar-border" />
            <nav className="flex-1 p-4 space-y-2">
              {navigationItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <a
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground transition-colors",
                      location === item.href && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    )}
                    onClick={() => setIsOpen(false)}
                  >
                    {item.icon}
                    <span>{item.title}</span>
                  </a>
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-4 md:p-6">
          {isMobile && <div className="h-10" />}
          {children}
        </div>
      </main>
    </div>
  );
} 