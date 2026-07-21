"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/ToastContext";
import { usePathname } from "next/navigation";

export default function GlobalRealtime() {
  const [supabase] = useState(() => createClient());
  const { showToast } = useToast();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js")
        .then(async (reg) => {
          console.log("Service Worker registered:", reg);
          
          if ("Notification" in window && Notification.permission === "granted") {
            const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (vapidKey) {
              try {
                // Konwersja klucza
                const padding = '='.repeat((4 - vapidKey.length % 4) % 4);
                const base64 = (vapidKey + padding).replace(/\-/g, '+').replace(/_/g, '/');
                const rawData = window.atob(base64);
                const outputArray = new Uint8Array(rawData.length);
                for (let i = 0; i < rawData.length; ++i) {
                  outputArray[i] = rawData.charCodeAt(i);
                }

                const sub = await reg.pushManager.subscribe({
                  userVisibleOnly: true,
                  applicationServerKey: outputArray
                });
                
                // Zapisz do bazy jeśli user zalogowany
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                  const subJson = sub.toJSON();
                  await supabase.from('push_subscriptions').upsert({
                    user_id: user.id,
                    endpoint: subJson.endpoint,
                    auth: subJson.keys?.auth,
                    p256dh: subJson.keys?.p256dh
                  }, { onConflict: 'endpoint' });
                }
              } catch (err: any) {
                // Silenced on localhost/dev to avoid noise
                if (err.name === 'AbortError') {
                  console.warn("Push Service unavailable (likely localhost/dev environment).");
                } else {
                  console.error("Push subscription error:", err);
                }
              }
            }
          }
        })
        .catch(err => console.error("SW registration failed:", err));
    }

    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    let activeChannel: any = null;

    const cleanup = () => {
      if (activeChannel) {
        supabase.removeChannel(activeChannel);
        activeChannel = null;
      }
    };

    const setupRealtime = async (user: any) => {
      cleanup();
      if (!user) return;

      activeChannel = supabase
        .channel(`global_notifs_${user.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`
        }, async (payload) => {
          const isOnFriendsPage = pathnameRef.current.includes("/friends");
          const activeChatId = localStorage.getItem('active_chat');

          if (activeChatId === payload.new.sender_id) {
            // We are currently actively chatting with this person. Skip notifying.
            // (FriendsClient will mark it as read automatically).
            return;
          }

          // Zawsze ustawiamy flagę w localStorage dla BottomNav, chyba że jesteśmy w Friends
          if (!isOnFriendsPage) {
            localStorage.setItem('unread_messages', 'true');
            window.dispatchEvent(new Event('unread-messages-update'));
          }

          const pushEnabled = localStorage.getItem("pref-push") !== "false";
          const soundsEnabled = localStorage.getItem("pref-sounds") !== "false";

          // Szybka nazwa nadawcy (bez czekania na profil jeśli się da)
          const { data: sender } = await supabase
            .from("profiles")
            .select("username, email")
            .eq("id", payload.new.sender_id)
            .single();
          
          const senderName = sender?.username || sender?.email?.split('@')[0] || "Użytkownik";

          if (document.visibilityState === "hidden") {
            if (pushEnabled && "Notification" in window && Notification.permission === "granted") {
              const options = {
                body: payload.new.content,
                icon: "/icon.png",
                badge: "/icon.png",
                vibrate: [200, 100, 200],
                tag: payload.new.sender_id, // Jedno powiadomienie na osobę
                renotify: true
              };

              try {
                const reg = await navigator.serviceWorker.ready;
                reg.showNotification(`Wiadomość od ${senderName}`, options);
              } catch (e) {
                new Notification(`Wiadomość od ${senderName}`, options);
              }
            }
          } else if (!isOnFriendsPage) {
            showToast(`Wiadomość od ${senderName}: ${payload.new.content.substring(0, 30)}${payload.new.content.length > 30 ? '...' : ''}`, "info");
            if (soundsEnabled && "vibrate" in navigator) {
              navigator.vibrate(200);
            }
          }
        })
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'list_shares',
          filter: `user_id=eq.${user.id}`
        }, () => {
          const pushEnabled = localStorage.getItem("pref-push") !== "false";
          if (document.visibilityState === "hidden" && pushEnabled && "Notification" in window && Notification.permission === "granted") {
            navigator.serviceWorker.ready.then(reg => {
              reg.showNotification("Zakupsy", { body: "Zostałeś zaproszony do nowej listy!" });
            });
          } else {
            showToast("Zostałeś zaproszony do nowej listy!", "success");
          }
        })
        .subscribe((status) => {
           console.log("Realtime status:", status);
        });
    };

    // Początkowy setup
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setupRealtime(user);
    });

    // Nasłuchuj zmian logowania
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setupRealtime(session.user);
      } else if (event === 'SIGNED_OUT') {
        cleanup();
      }
    });

    return () => {
      cleanup();
      subscription.unsubscribe();
    };
  }, [showToast, supabase]); 

  return null;
}
