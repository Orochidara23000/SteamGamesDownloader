import React from "react";
import { AppContainer } from "@/components/steam-app/app-container";
import { NotificationProvider } from "@/components/steam-app/notification-toast";

export default function Home() {
  return (
    <NotificationProvider>
      <AppContainer />
    </NotificationProvider>
  );
}
