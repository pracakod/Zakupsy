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
  Archive, 
  Settings,
  Gift,
  Sun,
  Moon,
  CloudSun,
  User as UserIcon
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/lib/ThemeContext";

export default function HomeClient({ user }: { user: User }) {
  const rawName = user.email?.split("@")[0] || "Użytkownik";
  const userName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const { theme, setTheme, isDarkMode, setIsDarkMode, city } = useTheme();
  
  const [currentDate, setCurrentDate] = useState("");
  const [weather, setWeather] = useState({ temp: 22, condition: "Słonecznie" });
  
  useEffect(() => {
    const date = new Date();
    setCurrentDate(date.toLocaleDateString("pl-PL", { weekday: 'long', day: 'numeric', month: 'long' }));

    // Fetch Weather
    const fetchWeather = async (lat: number, lon: number) => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        const data = await res.json();
        if (data.current_weather) {
          setWeather({
            temp: Math.round(data.current_weather.temperature),
            condition: getWeatherDesc(data.current_weather.weathercode)
          });
        }
      } catch (err) {
        console.error("Weather error:", err);
      }
    };

    const fetchWeatherByCity = async (cityName: string) => {
      try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}&limit=1`);
        const geoData = await geoRes.json();
        if (geoData && geoData[0]) {
          fetchWeather(parseFloat(geoData[0].lat), parseFloat(geoData[0].lon));
        }
      } catch (err) {
        console.error("Geocoding error:", err);
      }
    };

    if (city) {
      fetchWeatherByCity(city);
    } else if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        fetchWeather(pos.coords.latitude, pos.coords.longitude);
      });
    }
  }, [city]);

  const getWeatherDesc = (code: number) => {
    if (code === 0) return "Czyste niebo";
    if (code <= 3) return "Częściowe zachmurzenie";
    if (code <= 48) return "Mgła";
    if (code <= 67) return "Deszcz";
    if (code <= 77) return "Śnieg";
    return "Burza";
  };

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

  const upcomingHoliday = getNextHoliday();

  const quickActions = [
    { name: "Paragony", icon: Receipt, color: "bg-orange-500/10 text-orange-400", href: "/receipts" },
    { name: "Podróże", icon: Plane, color: "bg-blue-500/10 text-blue-400", href: "/trips" },
    { name: "Przepisy", icon: UtensilsCrossed, color: "bg-green-500/10 text-green-400", href: "/recipes" },
    { name: "Zadania", icon: CheckSquare, color: "bg-purple-500/10 text-purple-400", href: "/tasks" },
    { name: "Karty", icon: CreditCard, color: "bg-red-500/10 text-red-400", href: "/cards" },
    { name: "Notatki", icon: FileText, color: "bg-yellow-500/10 text-yellow-400", href: "/notes" },
    { name: "Archiwum", icon: Archive, color: "bg-slate-500/10 text-slate-400", href: "/archive" },
    { name: "Opcje", icon: Settings, color: "bg-indigo-500/10 text-indigo-400", href: "/settings" },
  ];

  const toggleMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const cycleColorTheme = () => {
    const themes = ["emerald", "ocean", "sunset", "purple"] as const;
    const currentIndex = themes.indexOf(theme as any);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  return (
    <div className="flex-1 pb-48 animate-fade-in overflow-y-auto">
      {/* Compact Header Section */}
      <header className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl gradient-brand flex items-center justify-center text-white font-bold text-lg shadow-lg border-2 border-white/20">
              {userName.substring(0, 1).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold tracking-tight leading-none" style={{ fontFamily: "var(--font-display)" }}>
                Cześć, <span className="text-gradient">{userName}</span>
              </h1>
              <p className="text-[10px] font-bold opacity-30 uppercase tracking-[0.2em] mt-1">Dzień dobry!</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={cycleColorTheme}
              className="w-10 h-10 rounded-xl glass border border-white/5 flex items-center justify-center cursor-pointer active:scale-95 transition-all"
            >
              <div className="w-3.5 h-3.5 rounded-full gradient-brand" />
            </button>
            <button 
              onClick={toggleMode}
              className="w-10 h-10 rounded-xl glass border border-white/5 flex items-center justify-center cursor-pointer hover:bg-white/5 active:scale-95 transition-all"
            >
              {isDarkMode ? <Moon size={18} className="text-purple-400" /> : <Sun size={18} className="text-yellow-500" />}
            </button>
          </div>
        </div>

        {/* Combined Date & Weather - Much more compact */}
        <div className="flex items-center justify-between px-1 py-1 border-y border-border/30">
          <div className="text-[9px] font-black uppercase tracking-[0.1em] text-text-muted">
            {currentDate}
          </div>
          <div className="text-[9px] font-black uppercase tracking-[0.1em] text-brand-500">
            {weather.temp}°C • {weather.condition}
          </div>
        </div>
      </header>

      {/* Compact Holiday Banner */}
      <section className="px-5 mb-6">
        <div 
          className="rounded-2xl p-4 relative overflow-hidden border border-white/5 flex items-center justify-between"
          style={{ background: "linear-gradient(135deg, var(--color-surface-2) 0%, var(--color-surface-3) 100%)" }}
        >
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-brand-500/15 flex items-center justify-center shrink-0">
              <Gift size={20} className="text-brand-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold leading-none">{upcomingHoliday.name}</h2>
              <p className="text-[10px] opacity-40 mt-1">Za {upcomingHoliday.daysLeft} dni • {upcomingHoliday.date}</p>
            </div>
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-brand-400/50 bg-brand-500/5 px-2 py-1 rounded-lg">
            Święto
          </div>
        </div>
      </section>

      {/* Quick Access Grid */}
      <section className="px-5">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-4 pl-1" style={{ color: "var(--color-text-muted)" }}>
          Szybki dostęp
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action, i) => (
            <Link 
              key={action.name} 
              href={action.href}
              className="group p-5 rounded-3xl transition-all duration-300 active:scale-95 flex flex-col gap-4 border border-white/[0.03]"
              style={{ 
                background: "var(--color-surface-2)", 
                animationDelay: `${i * 40}ms`
              }}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${action.color}`}>
                <action.icon size={22} />
              </div>
              <span className="font-bold text-sm tracking-tight">{action.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Bottom spacing for Nav */}
      <div className="h-10" />
    </div>
  );
}
