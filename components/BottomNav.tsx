"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, LayoutGrid, User, Users, ListTodo, Home, StickyNote, CreditCard } from "lucide-react";
import { useState, useEffect } from "react";

export default function BottomNav() {
  const pathname = usePathname();
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [clickedTab, setClickedTab] = useState<string | null>(null);
  
  // Sync clickedTab with pathname when it changes
  useEffect(() => {
    setClickedTab(null);
  }, [pathname]);

  useEffect(() => {
    const checkUnread = () => {
      setHasUnreadMessages(localStorage.getItem('unread_messages') === 'true');
    };

    const checkChatMode = (e: any) => {
      setIsChatOpen(e.detail?.isOpen || false);
    };

    checkUnread();
    window.addEventListener('unread-messages-update', checkUnread);
    window.addEventListener('storage', checkUnread);
    window.addEventListener('chat-mode-update' as any, checkChatMode);
    
    return () => {
      window.removeEventListener('unread-messages-update', checkUnread);
      window.removeEventListener('storage', checkUnread);
      window.removeEventListener('chat-mode-update' as any, checkChatMode);
    };
  }, []);

  const navItems = [
    { name: "Home", href: "/home", icon: Home },
    { name: "Alejki", href: "/aisles", icon: LayoutGrid },
    { name: "Lista", href: "/lists", icon: ListTodo },
    { name: "Znajomi", href: "/friends", icon: Users },
    { name: "Profil", href: "/profil", icon: User },
  ];

  // Don't show nav on auth page or when chat is open
  if (pathname === "/auth" || isChatOpen) return null;

  return (
    <nav 
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-2xl glass border-t border-white/5 px-6 pb-safe pt-3 flex items-center justify-between z-50 rounded-t-3xl shadow-[0_-8px_32px_rgba(0,0,0,0.3)]"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 1rem) + 0.75rem)" }}
    >
      {navItems.map((item) => {
        // Use clickedTab for instant feedback, fallback to pathname
        const isCurrentActive = pathname === item.href || (item.href === "/lists" && pathname.startsWith("/lists/"));
        const isActive = (clickedTab === item.href) || (!clickedTab && isCurrentActive);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => {
              if (pathname !== item.href) {
                setClickedTab(item.href);
                // Instant tactile feedback
                if (typeof window !== 'undefined' && window.navigator.vibrate) {
                  window.navigator.vibrate(10);
                }
              }
            }}
            className={`flex flex-col items-center gap-1 transition-all duration-150 active:scale-95 ${isActive ? 'scale-105' : ''}`}
            style={{ 
              color: isActive ? "var(--color-brand-400)" : "var(--color-text-muted)",
              transform: isActive ? "translateY(-4px)" : "none"
            }}
          >
            <div className={`p-1.5 rounded-xl transition-all relative ${isActive ? "bg-brand-500/10" : "bg-transparent"}`}>
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} className={clickedTab === item.href ? "animate-pulse" : ""} />
              {item.href === "/friends" && hasUnreadMessages && (
                <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[var(--color-surface)] animate-pulse" />
              )}
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider transition-opacity ${isActive ? 'opacity-100' : 'opacity-60'}`}>
              {item.name}
            </span>
            {isActive && (
              <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-brand-500 animate-fade-in" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
