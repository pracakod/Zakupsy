"use client";

import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { 
  Receipt, 
  Plane, 
  UtensilsCrossed, 
  CheckSquare, 
  CreditCard, 
  FileText, 
  Calendar, 
  Settings,
  Gift,
  Sun,
  Moon,
  Bell
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/lib/ThemeContext";
import { createClient } from "@/lib/supabase/client";
import AnimalAvatar, { AnimalType } from "./AnimalAvatar";
import { getUpcomingHolidays } from "@/lib/holidays";

export default function HomeClient({ user }: { user: User }) {
  const rawName = user.email?.split("@")[0] || "Użytkownik";
  const userName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const { theme, setTheme, isDarkMode, setIsDarkMode, city } = useTheme();
  const [supabase] = useState(() => createClient());
  
  const [currentDate, setCurrentDate] = useState("");
  const [avatarData, setAvatarData] = useState<{type?: AnimalType, variant?: number, color?: number}>({});
  const [displayName, setDisplayName] = useState("");
  const [isAvatarLoading, setIsAvatarLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(() => {
    if (typeof window === 'undefined') return 0;
    return parseInt(localStorage.getItem('cache_unread_count') || '0');
  });
  
  const [weather, setWeather] = useState(() => {
    if (typeof window === 'undefined') return { temp: 22, condition: "Słonecznie" };
    const cached = localStorage.getItem('cache_weather');
    return cached ? JSON.parse(cached) : { temp: 22, condition: "Słonecznie" };
  });

  const [closestEvent, setClosestEvent] = useState<{name: string, daysLeft: number, date: string, type: 'personal' | 'holiday'} | null>(() => {
    if (typeof window === 'undefined') return null;
    const cached = localStorage.getItem('cache_closest_event');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed?.name === "Dzień Matki" && parsed?.daysLeft > 100) {
          localStorage.removeItem('cache_closest_event');
          return null;
        }
        return parsed;
      } catch (e) {}
    }
    return null;
  });
  
  useEffect(() => {
    const date = new Date();
    setCurrentDate(date.toLocaleDateString("pl-PL", { weekday: 'long', day: 'numeric', month: 'long' }));

    const fetchNotifications = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      const newCount = count || 0;
      setUnreadCount(newCount);
      localStorage.setItem('cache_unread_count', newCount.toString());
      localStorage.setItem('unread_messages', newCount > 0 ? 'true' : 'false');
      window.dispatchEvent(new Event('unread-messages-update'));
    };

    const fetchWeatherTask = async () => {
      if (!city) return;
      
      const cacheKey = `weather_coords_${city}`;
      let coords = localStorage.getItem(cacheKey);
      let lat, lon;

      if (coords) {
        [lat, lon] = coords.split(',').map(Number);
      } else {
        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}&limit=1`);
          const geoData = await geoRes.json();
          if (geoData && geoData[0]) {
            lat = parseFloat(geoData[0].lat);
            lon = parseFloat(geoData[0].lon);
            localStorage.setItem(cacheKey, `${lat},${lon}`);
          }
        } catch (err) {}
      }

      if (lat && lon) {
        try {
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
          const data = await res.json();
          if (data.current_weather) {
            const newWeather = {
              temp: Math.round(data.current_weather.temperature),
              condition: getWeatherDesc(data.current_weather.weathercode)
            };
            setWeather(newWeather);
            localStorage.setItem('cache_weather', JSON.stringify(newWeather));
          }
        } catch (err) {}
      }
    };

    const fetchEventsTask = async () => {
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      const todayStr = todayDate.toISOString().split('T')[0];

      const upcomingHolidays = getUpcomingHolidays(todayDate);
      const nextHoliday = upcomingHolidays[0];

      const { data: events } = await supabase
        .from("calendar_events")
        .select("*")
        .gte("event_date", todayStr)
        .order("event_date", { ascending: true })
        .limit(1);

      const finalEvent = (events && events.length > 0) ? (() => {
        const [y, m, d] = events[0].event_date.split('-').map(Number);
        const evDate = new Date(y, m - 1, d);
        evDate.setHours(0, 0, 0, 0);
        const diffDays = Math.round((evDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
        if (nextHoliday && diffDays <= nextHoliday.daysLeft) {
          return {
            name: events[0].title,
            daysLeft: diffDays,
            date: evDate.toLocaleDateString("pl-PL", { day: 'numeric', month: 'long' }),
            type: 'personal' as const
          };
        }
        return null;
      })() : null;

      const eventToShow = finalEvent || (nextHoliday ? {
        name: nextHoliday.name,
        daysLeft: nextHoliday.daysLeft,
        date: nextHoliday.formattedDate,
        type: 'holiday' as const
      } : null);

      setClosestEvent(eventToShow);
      localStorage.setItem('cache_closest_event', JSON.stringify(eventToShow));
    };

    // EXECUTE ALL IN PARALLEL
    Promise.all([
      fetchNotifications(),
      fetchWeatherTask(),
      fetchEventsTask()
    ]);
  }, [city, user.id, supabase]);

  useEffect(() => {
    // Try to get from cache first for instant UI
    const cachedAvatar = typeof window !== 'undefined' ? localStorage.getItem(`avatar_${user.id}`) : null;
    if (cachedAvatar) {
      try {
        const data = JSON.parse(cachedAvatar);
        setAvatarData(data);
      } catch (e) {}
    }

    const cachedName = typeof window !== 'undefined' ? localStorage.getItem(`display_name_${user.id}`) : null;
    if (cachedName) {
      setDisplayName(cachedName);
    }
    
    setIsAvatarLoading(false);

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", user.id)
        .single();
      
      if (!error && data) {
        if (data.avatar_url && data.avatar_url.startsWith("animal:")) {
          const [_, type, variant, color] = data.avatar_url.split(":");
          const newData = {
            type: type as AnimalType,
            variant: parseInt(variant),
            color: parseInt(color)
          };
          setAvatarData(newData);
          localStorage.setItem(`avatar_${user.id}`, JSON.stringify(newData));
        }
        
        if (data.username) {
          setDisplayName(data.username);
          localStorage.setItem(`display_name_${user.id}`, data.username);
        }
      }
      setIsAvatarLoading(false);
    };
    fetchProfile();
  }, [user.id, supabase]);

  const getWeatherDesc = (code: number) => {
    if (code === 0) return "Czyste niebo";
    if (code <= 3) return "Częściowe zachmurzenie";
    if (code <= 48) return "Mgła";
    if (code <= 67) return "Deszcz";
    if (code <= 77) return "Śnieg";
    return "Burza";
  };

  const getNextHoliday = () => {
    const upcoming = getUpcomingHolidays();
    const first = upcoming[0];
    return { name: first.name, daysLeft: first.daysLeft, date: first.formattedDate };
  };

  const upcomingHoliday = getNextHoliday();

  const quickActions = [
    { name: "Kalendarz", icon: Calendar, color: "bg-indigo-500/10 text-indigo-400", href: "/calendar" },
    { name: "Podróże", icon: Plane, color: "bg-blue-500/10 text-blue-400", href: "/trips" },
    { name: "Przepisy", icon: UtensilsCrossed, color: "bg-green-500/10 text-green-400", href: "/recipes" },
    { name: "Zadania", icon: CheckSquare, color: "bg-purple-500/10 text-purple-400", href: "/tasks" },
    { name: "Karty", icon: CreditCard, color: "bg-red-500/10 text-red-400", href: "/cards" },
    { name: "Notatki", icon: FileText, color: "bg-yellow-500/10 text-yellow-400", href: "/notes" },
    { name: "Paragony", icon: Receipt, color: "bg-orange-500/10 text-orange-400", href: "/receipts" },
    { name: "Opcje", icon: Settings, color: "bg-slate-500/10 text-slate-400", href: "/settings" },
  ];

  const toggleMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const cycleColorTheme = () => {
    const themes = ["emerald", "ocean", "sunset", "purple", "panther", "rose", "midnight"] as const;
    const currentIndex = themes.indexOf(theme as any);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const nameToDisplay = displayName || userName;
  const nameLength = nameToDisplay.length;

  return (
    <div className="flex-1 pb-48 animate-fade-in overflow-y-auto">
      {/* Compact Header Section */}
      <header className="px-6 pt-6 pb-4">
        <div className="flex items-start gap-3 mb-5">
          <Link href="/profil" className="relative group shrink-0 pt-2">
            <div className="w-16 h-16 active:scale-95 transition-all duration-300">
              <AnimalAvatar 
                seed={user.email} 
                type={isAvatarLoading ? null : avatarData.type}
                variant={avatarData.variant} 
                colorIndex={avatarData.color} 
                size={64} 
                className="w-full h-full rounded-[1.75rem] shadow-xl shadow-brand-500/10" 
              />
            </div>
          </Link>
          
          <div className="flex flex-col flex-1 min-w-0 pt-1">
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-sm font-black opacity-30 uppercase tracking-[0.2em] shrink-0 pt-3">Cześć,</h1>
              <div className="flex items-center gap-1 p-px rounded-xl bg-surface-2/30 backdrop-blur-md border border-white/5 shadow-inner shrink-0 -mt-8">
                <Link 
                  href="/notifications"
                  className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer hover:bg-white/5 active:scale-90 transition-all relative group"
                >
                  <Bell size={12} className="text-brand-500 group-hover:scale-110 transition-transform" />
                  {unreadCount > 0 && (
                    <div className="absolute top-1 right-1 w-1 h-1 rounded-full bg-red-500 animate-pulse" />
                  )}
                </Link>
                <button 
                  onClick={cycleColorTheme}
                  className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer hover:bg-white/5 active:scale-90 transition-all font-bold overflow-hidden"
                >
                  <div className={`w-2 h-2 rounded-full shadow-sm ${theme === 'panther' ? 'panther-pattern ring-1 ring-amber-500/50' : 'gradient-brand shadow-brand-500/50'}`} />
                </button>
                <button 
                  onClick={toggleMode}
                  className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer hover:bg-white/5 active:scale-90 transition-all"
                >
                  {isDarkMode ? <Moon size={12} className="text-purple-400" /> : <Sun size={12} className="text-yellow-500" />}
                </button>
              </div>
            </div>

            <h2 
              className={`font-black tracking-tighter text-text-primary leading-[1] mt-1 overflow-hidden transition-all duration-300 
                ${nameLength > 12 ? 'text-xl' : nameLength > 8 ? 'text-2xl' : 'text-3xl'}`} 
              style={{ fontFamily: "var(--font-display)" }}
            >
              <span className="text-gradient block whitespace-nowrap py-1">{nameToDisplay}</span>
            </h2>
          </div>
        </div>

        {/* Combined Date & Weather - Much more compact */}
        <div className="flex items-center justify-between px-1 py-1 border-y border-border/30">
          <div className="text-[9px] font-black uppercase tracking-[0.1em] text-text-muted">
            {currentDate}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-brand-500 uppercase tracking-wider">{weather.temp}°C</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest">{weather.condition}</span>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="px-6 py-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Special Event Tile - Dynamic from Calendar or Fallback to Holiday */}
          {closestEvent ? (
            <Link 
              href={closestEvent.type === 'personal' ? "/calendar" : "/holidays"}
              className="col-span-2 group relative flex items-center gap-6 p-5 rounded-[2.5rem] bg-surface-2/60 border border-brand-500/20 hover:border-brand-500/40 transition-all active:scale-[0.98] overflow-hidden shadow-xl"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-transparent pointer-events-none" />
              
              <div className="relative z-10 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">
                    {closestEvent.type === 'personal' ? 'Twój Kalendarz' : 'Nadchodzące święto'}
                  </p>
                </div>
                <h3 className="text-xl font-black text-text-primary tracking-tight">{closestEvent.name}</h3>
                <p className="text-[10px] text-brand-500 font-black mt-1 uppercase tracking-[0.2em]">
                  {closestEvent.daysLeft === 0 ? 'Dziś!' : `Za ${closestEvent.daysLeft} dni`} • {closestEvent.date}
                </p>
              </div>
              
              <div className="w-14 h-14 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-500 relative z-10 group-hover:scale-110 transition-transform border border-brand-500/20">
                 {closestEvent.type === 'personal' ? <Calendar size={28} /> : <Gift size={28} />}
              </div>
              
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-brand-500/5 rounded-full blur-3xl group-hover:scale-150 transition-transform" />
            </Link>
          ) : (
            <div className="col-span-2 h-32 rounded-[2.5rem] bg-surface-2/20 animate-pulse border border-border/20 flex items-center justify-center">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-20">Ładowanie wydarzeń...</span>
            </div>
          )}

          {quickActions.map((action) => (
            <Link 
              key={action.name}
              href={action.href}
              className="group relative flex flex-col p-5 rounded-[2rem] bg-surface-2/40 border border-border hover:bg-surface-2/60 transition-all active:scale-95 overflow-hidden"
            >
              <div className={`w-12 h-12 rounded-2xl ${action.color.split(' ')[0]} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <action.icon size={22} className={action.color.split(' ')[1]} />
              </div>
              <h3 className="font-black text-xs uppercase tracking-widest text-text-primary">{action.name}</h3>
              
              <div className="absolute -bottom-4 -right-4 w-12 h-12 rounded-full bg-brand-500/5 blur-xl group-hover:scale-150 transition-transform" />
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
