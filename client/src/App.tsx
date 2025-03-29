import { Route, Switch } from "wouter";
import RootLayout from "./components/layouts/root-layout";
import { NotFound } from "./pages/not-found";
import Dashboard from "./pages/dashboard";
import GameLibrary from "./pages/game-library";
import DownloadQueue from "./pages/download-queue";
import Settings from "./pages/settings";
import { useTheme } from "./hooks/use-theme";

export default function App() {
  const { theme } = useTheme();

  return (
    <div className={theme}>
      <RootLayout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/library" component={GameLibrary} />
          <Route path="/downloads" component={DownloadQueue} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </RootLayout>
    </div>
  );
}
