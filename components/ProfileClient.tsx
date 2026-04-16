"use client";

import type { User } from "@supabase/supabase-js";
import { 
  Settings, 
  Calendar, 
  ListTodo, 
  History, 
  Heart, 
  Bell, 
  ChevronRight,
  Gift,
  Star,
  LogOut,
  Palette
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/ThemeContext";

export default function ProfileClient({ user }: { user: User }) {
  const userName = user.email?.split("@")[0] || "Użytkownik";
  const supabase = createClient();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const themes = [
    { id: "emerald", color: "bg-emerald-500", name: "Szmaragd" },
    { id: "ocean", color: "bg-sky-500", name: "Ocean" },
    { id: "sunset", color: "bg-orange-500", name: "Zachód" },
    { id: "purple", color: "bg-purple-500", name: "Fiolet" },
  ] as const;

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  }

  const getNextHoliday = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Mother's Day in Poland is May 26
    const mothersDay = new Date(currentYear, 4, 26); // Month is 0-indexed
    
    // If it already passed this year, look for next year
    if (now > mothersDay) {
      mothersDay.setFullYear(currentYear + 1);
    }
    
    const diffTime = mothersDay.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      name: "Dzień Matki",
      daysLeft: diffDays,
      date: "26 maja",
    };
  };

  const upcomingEvent = getNextHoliday();

  const menuItems = [
    { name: "Moje listy", icon: ListTodo, color: "bg-blue-500/10 text-blue-400", href: "/lists" },
    { name: "Ustawienia", icon: Settings, color: "bg-slate-500/10 text-slate-400", href: "/settings" },
    { name: "Kalendarz", icon: Calendar, color: "bg-purple-500/10 text-purple-400", href: "/calendar" },
    { name: "Historia", icon: History, color: "bg-orange-500/10 text-orange-400", href: "/history" },
    { name: "Ulubione", icon: Heart, color: "bg-red-500/10 text-red-400", href: "/favorites" },
    { name: "Powiadomienia", icon: Bell, color: "bg-yellow-500/10 text-yellow-400", href: "/notifications" },
  ];

  return (
    <div className="flex-1 pb-32 animate-fade-in">
      {/* Profile Header */}
      <section className="px-6 pt-12 pb-8 flex flex-col items-center text-center">
        <div className="relative group">
          <div className="w-24 h-24 rounded-full p-1 gradient-brand mb-4 shadow-xl shadow-green-500/20">
            <div className="w-full h-full rounded-full bg-surface-2 overflow-hidden border-4 border-[var(--color-surface)] flex items-center justify-center">
              <span className="text-4xl font-bold text-white uppercase">{userName[0]}</span>
            </div>
          </div>
          <div className="absolute bottom-4 right-0 w-7 h-7 bg-green-500 rounded-full border-2 border-[var(--color-surface)] flex items-center justify-center">
            <Star size={12} className="text-white fill-current" />
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-0.5" style={{ fontFamily: "var(--font-display)" }}>
          {userName}
        </h1>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          {user.email}
        </p>
      </section>

      {/* Events Banner */}
      <section className="px-5 mb-8">
        <div 
          className="rounded-2xl p-4 flex items-center gap-4 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(22,163,74,0.05) 100%)", border: "1px solid rgba(34,197,94,0.2)" }}
        >
          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
            <Gift className="text-green-400" size={24} />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-green-400 mb-0.5">Nadchodzące wydarzenie</p>
            <p className="font-bold text-sm">Już za {upcomingEvent.daysLeft} dni {upcomingEvent.name}!</p>
            <p className="text-xs opacity-60">{upcomingEvent.date}</p>
          </div>
          <ChevronRight size={18} className="text-green-500/40" />
          
          {/* Decorative background element */}
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-green-500/5 rounded-full blur-2xl" />
        </div>
      </section>

      {/* Theme Selector */}
      <section className="px-5 mb-8">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] mb-4 pl-1 flex items-center gap-2" style={{ color: "var(--color-text-muted)" }}>
          <Palette size={14} />
          Motyw kolorystyczny
        </h2>
        <div className="flex gap-4 p-4 rounded-2xl bg-surface-2 border border-border justify-around">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`flex flex-col items-center gap-2 transition-all cursor-pointer ${theme === t.id ? 'scale-110' : 'opacity-50'}`}
            >
              <div className={`w-10 h-10 rounded-full ${t.color} border-2 ${theme === t.id ? 'border-white' : 'border-transparent'}`} />
              <span className="text-[10px] font-bold uppercase tracking-wider">{t.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Grid Menu */}
      <section className="px-5 pb-10">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] mb-4 pl-1" style={{ color: "var(--color-text-muted)" }}>
          Zarządzanie
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {menuItems.map((item, i) => (
            <Link 
              key={item.name} 
              href={item.href}
              className="group p-4 rounded-2xl transition-all duration-300 active:scale-95 flex flex-col gap-3"
              style={{ 
                background: "var(--color-surface-2)", 
                border: "1px solid var(--color-border)",
                animationDelay: `${i * 50}ms`
              }}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${item.color}`}>
                <item.icon size={20} />
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">{item.name}</span>
                <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-muted" />
              </div>
            </Link>
          ))}
        </div>

        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 cursor-pointer"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <LogOut size={18} />
          Wyloguj się
        </button>
      </section>
    </div>
  );
}
