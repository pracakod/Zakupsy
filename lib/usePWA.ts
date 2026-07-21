"use client";

import { useState, useEffect, useCallback } from "react";

// ============================================================
// Hook: useOnlineStatus
// Tracks real-time connection state
// ============================================================
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}

// ============================================================
// Hook: usePWAInstall
// Manages the "Add to Home Screen" install prompt
// ============================================================
export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if already running as installed PWA
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Check if user already dismissed the banner
    const dismissed = localStorage.getItem("pwa-banner-dismissed");
    if (dismissed) {
      setIsDismissed(true);
    }

    const handlePrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", () => setIsInstalled(true));

    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
    };
  }, []);

  const install = useCallback(async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setInstallPrompt(null);
  }, [installPrompt]);

  const dismiss = useCallback(() => {
    localStorage.setItem("pwa-banner-dismissed", "true");
    setIsDismissed(true);
  }, []);

  const showBanner =
    !isInstalled && !isDismissed && installPrompt !== null;

  return { install, dismiss, showBanner, isInstalled };
}

// ============================================================
// Hook: useOfflineQueue
// Saves failed mutations to IndexedDB for background sync
// ============================================================
export function useOfflineQueue() {
  const isOnline = useOnlineStatus();

  const queueMutation = useCallback(
    async (mutation: {
      url: string;
      method: string;
      headers: Record<string, string>;
      body: string;
    }) => {
      try {
        const db = await openQueueDB();
        const tx = db.transaction("zakupsy-sync-queue", "readwrite");
        tx.objectStore("zakupsy-sync-queue").add({
          ...mutation,
          timestamp: Date.now(),
        });

        // Register background sync if supported
        if ("serviceWorker" in navigator && "SyncManager" in window) {
          const reg = await navigator.serviceWorker.ready;
          await (reg as any).sync.register("zakupsy-sync");
        }
      } catch (err) {
        console.error("Failed to queue mutation:", err);
      }
    },
    []
  );

  return { isOnline, queueMutation };
}

function openQueueDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("zakupsy-offline", 1);
    req.onupgradeneeded = (e: any) => {
      e.target.result.createObjectStore("zakupsy-sync-queue", {
        keyPath: "id",
        autoIncrement: true,
      });
    };
    req.onsuccess = (e: any) => resolve(e.target.result);
    req.onerror = reject;
  });
}
