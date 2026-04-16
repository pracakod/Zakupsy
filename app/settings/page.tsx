"use client";

import { useTheme } from "@/lib/ThemeContext";
import { ChevronLeft, MapPin, Moon, Sun, Palette, Search } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useToast } from "@/lib/ToastContext";

export default function SettingsPage() {
  const { theme, setTheme, isDarkMode, setIsDarkMode, city, setCity } = useTheme();
  const { showToast } = useToast();
  const [tempCity, setTempCity] = useState(city);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    // Prevent search on mount if city is already set
    if (tempCity.length < 3 || tempCity === city) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(tempCity)}&limit=5&addressdetails=1`);
        const data = await res.json();
        setSuggestions(data);
      } catch (err) {
        console.error("Fetch suggestions error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [tempCity, city]);

  const selectCity = (s: any) => {
    const name = s.display_name.split(",")[0];
    setTempCity(name);
    setCity(name);
    setSuggestions([]);
    setIsFocused(false);
    showToast(`Ustawiono miasto: ${name}`, "success");
  };

  const themes = [
    { id: "emerald", name: "Szmaragd", color: "bg-emerald-500" },
    { id: "ocean", name: "Ocean", color: "bg-sky-500" },
    { id: "sunset", name: "Zachód", color: "bg-orange-500" },
    { id: "purple", name: "Fiolet", color: "bg-purple-500" },
  ];

  return (
    <div className="min-h-screen pb-32 animate-fade-in bg-surface">
      {/* Header */}
      <header className="px-6 pt-12 pb-6">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/home" className="w-10 h-10 rounded-xl glass flex items-center justify-center active:scale-90 transition-all">
            <ChevronLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Ustawienia
          </h1>
        </div>
      </header>

      <main className="px-6 space-y-6">
        {/* Appearance Section */}
        <section className="space-y-4">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary px-1">Wygląd</h2>
          <div className="rounded-3xl glass p-5 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                  {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
                </div>
                <div>
                  <p className="text-sm font-bold">Tryb ciemny</p>
                  <p className="text-[10px] opacity-50">Oszczędzaj baterię</p>
                </div>
              </div>
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`w-12 h-6 rounded-full transition-all relative ${isDarkMode ? 'bg-brand-500' : 'bg-surface-4'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isDarkMode ? 'right-1' : 'left-1'}`} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400">
                  <Palette size={20} />
                </div>
                <p className="text-sm font-bold">Motyw kolorystyczny</p>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {themes.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id as any)}
                    className={`h-10 rounded-xl border-2 transition-all ${theme === t.id ? 'border-brand-500' : 'border-transparent'}`}
                  >
                    <div className={`w-full h-full rounded-lg ${t.color}`} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Location Section */}
        <section className="space-y-4">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary px-1">Pogoda</h2>
          <div className="rounded-3xl glass p-5 space-y-4 relative">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400">
                <MapPin size={20} />
              </div>
              <div>
                <p className="text-sm font-bold">Twoja lokalizacja</p>
                <p className="text-[10px] opacity-50">Wpisz miasto powyżej 3 znaków</p>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
                <Search size={16} />
              </div>
              <input 
                type="text" 
                value={tempCity}
                onChange={(e) => setTempCity(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                placeholder="Np. Warszawa, Berlin..."
                className="w-full bg-surface-2 border border-border rounded-xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-brand-500 transition-all"
              />
              
              {/* Autocomplete Suggestions */}
              {isFocused && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-3 rounded-2xl bg-[#1e2535] !bg-opacity-100 border border-white/10 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.8)] z-[999] overflow-hidden animate-pop-in">
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => selectCity(s)}
                      className="w-full px-5 py-4 text-left hover:bg-brand-500/10 border-b border-border last:border-0 transition-colors"
                    >
                      <p className="text-sm font-bold truncate text-white">{s.display_name.split(",")[0]}</p>
                      <p className="text-[10px] opacity-40 truncate text-slate-300">{s.display_name.split(",").slice(1).join(",")}</p>
                    </button>
                  ))}
                </div>
              )}
              
              {isSearching && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            
            <p className="text-[9px] opacity-40 italic">Zaczynając wpisywać, zobaczysz propozycje miast z całego świata.</p>
          </div>
        </section>

        {/* Version */}
        {suggestions.length === 0 && (
          <div className="text-center pt-8">
            <p className="text-[10px] font-bold opacity-40 uppercase tracking-[0.3em]">Zakupsy v1.2.0 • 2026</p>
          </div>
        )}
      </main>
    </div>
  );
}
