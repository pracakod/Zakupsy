"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, LayoutGrid, User, Users, ListTodo, Home } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Home", href: "/home", icon: Home },
    { name: "Alejki", href: "/aisles", icon: LayoutGrid },
    { name: "Lista", href: "/lists", icon: ListTodo },
    { name: "Znajomi", href: "/friends", icon: Users },
    { name: "Profil", href: "/profil", icon: User },
  ];

  // Don't show nav on auth page
  if (pathname === "/auth") return null;

  return (
    <nav 
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-2xl glass border-t border-white/5 px-6 pb-safe pt-3 flex items-center justify-between z-50 rounded-t-3xl shadow-[0_-8px_32px_rgba(0,0,0,0.3)]"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 1rem) + 0.75rem)" }}
    >
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href === "/lists" && pathname.startsWith("/lists/"));
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-1 transition-all duration-300"
            style={{ 
              color: isActive ? "var(--color-brand-400)" : "var(--color-text-muted)",
              transform: isActive ? "translateY(-2px)" : "none"
            }}
          >
            <div className={`p-1.5 rounded-xl transition-all ${isActive ? "bg-green-500/10" : ""}`}>
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {item.name}
            </span>
            {isActive && (
              <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-green-400 animate-fade-in" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
