"use client";

import type { User } from "@supabase/supabase-js";
import { 
  Settings, 
  Archive,
  Calendar, 
  ListTodo, 
  History, 
  Heart, 
  Bell, 
  ChevronRight,
  Gift,
  Star,
  LogOut,
  Palette,
  Check
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/ThemeContext";
import { useState, useEffect } from "react";
import AnimalAvatar, { AnimalType } from "./AnimalAvatar";
import { useToast } from "@/lib/ToastContext";
import { getUpcomingHolidays } from "@/lib/holidays";

export default function ProfileClient({ user }: { user: User }) {
  const userName = user.email?.split("@")[0] || "Użytkownik";
  const supabase = createClient();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();
  
  const [profile, setProfile] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(`profile_data_${user.id}`);
      return cached ? JSON.parse(cached) : null;
    }
    return null;
  });
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const [currentAnimalType, setCurrentAnimalType] = useState<AnimalType>("panda");
  const [currentVariantId, setCurrentVariantId] = useState<number>(0);
  const [currentColorId, setCurrentColorId] = useState<number>(0);

  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [unreadCount, setUnreadCount] = useState(() => {
    if (typeof window === 'undefined') return 0;
    return parseInt(localStorage.getItem('cache_unread_count') || '0');
  });

  useEffect(() => {
    // 1. Instant load from cache for UI
    const cachedAvatar = typeof window !== 'undefined' ? localStorage.getItem(`avatar_${user.id}`) : null;
    if (cachedAvatar) {
      try {
        const data = JSON.parse(cachedAvatar);
        setCurrentAnimalType(data.type);
        setCurrentVariantId(data.variant);
        setCurrentColorId(data.color);
      } catch (e) {}
    }

    // 2. Parallel fetch
    async function fetchData() {
      const [{ data: profileData }, { count: notificationsCount }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("is_read", false)
      ]);
        
      if (profileData) {
        setProfile(profileData);
        localStorage.setItem(`profile_data_${user.id}`, JSON.stringify(profileData));
        if (profileData.avatar_url?.startsWith('animal:')) {
          const parts = profileData.avatar_url.split(':');
          const newData = { type: parts[1] as AnimalType, variant: parseInt(parts[2]), color: parseInt(parts[3]) };
          setCurrentAnimalType(newData.type);
          setCurrentVariantId(newData.variant);
          setCurrentColorId(newData.color);
          localStorage.setItem(`avatar_${user.id}`, JSON.stringify(newData));
        }
      }
      if (notificationsCount !== null) {
        setUnreadCount(notificationsCount);
        localStorage.setItem('cache_unread_count', notificationsCount.toString());
      }
    }
    
    fetchData();
  }, [user.id, user.email, supabase]);

  const themes = [
    { id: "emerald", color: "bg-emerald-500", name: "Szmaragd" },
    { id: "ocean", color: "bg-sky-500", name: "Ocean" },
    { id: "sunset", color: "bg-orange-500", name: "Zachód" },
    { id: "purple", color: "bg-purple-500", name: "Fiolet" },
  ] as const;

  async function updateAvatar(animalType: AnimalType, variantId: number, colorId: number) {
    const avatarValue = `animal:${animalType}:${variantId}:${colorId}`;
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: avatarValue })
      .eq("id", user.id);
    
    if (error) {
      showToast("Błąd podczas zapisywania awatara", "error");
    } else {
      showToast("Awatar został zaktualizowany!", "success");
      // Update local cache for instant Home display
      localStorage.setItem(`avatar_${user.id}`, JSON.stringify({
        type: animalType,
        variant: variantId,
        color: colorId
      }));
      setProfile({ ...profile!, avatar_url: avatarValue });
      setIsPickerOpen(false);
      router.refresh();
    }
  }

  async function updateProfileName() {
    if (!newUsername.trim()) return;
    if (newUsername.trim().length > 15) {
      showToast("Nazwa może mieć maksymalnie 15 znaków", "error");
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ username: newUsername.trim() })
      .eq("id", user.id);

    if (error) {
      showToast("Błąd podczas zmiany nazwy", "error");
    } else {
      showToast("Nazwa została zmieniona!", "success");
      setProfile({ ...profile, username: newUsername.trim() });
      setIsEditingName(false);
      router.refresh();
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  }

  const getNextHoliday = () => {
    const upcoming = getUpcomingHolidays();
    const first = upcoming[0];
    return {
      name: first.name,
      daysLeft: first.daysLeft,
      date: first.formattedDate,
    };
  };

  const upcomingEvent = getNextHoliday();

  const menuItems = [
    { name: "Moje listy", icon: ListTodo, color: "bg-blue-500/10 text-blue-400", href: "/lists" },
    { name: "Archiwum", icon: Archive, color: "bg-orange-500/10 text-orange-400", href: "/archive" },
    { name: "Historia", icon: History, color: "bg-orange-500/10 text-orange-400", href: "/history" },
    { name: "Powiadomienia", icon: Bell, color: "bg-yellow-500/10 text-yellow-400", href: "/notifications" },
    { name: "Ustawienia", icon: Settings, color: "bg-slate-500/10 text-slate-400", href: "/settings" },
  ];

  return (
    <div className="flex-1 pb-32 animate-fade-in relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/4 -left-32 w-80 h-80 bg-brand-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Profile Header */}
      <section className="px-6 pt-12 pb-10 flex flex-col items-center text-center relative z-10">
        <div className="relative group cursor-pointer mb-6" onClick={() => setIsPickerOpen(true)}>
          <div className="w-28 h-28 rounded-[2rem] p-1.5 bg-gradient-to-br from-brand-400 via-brand-500 to-brand-600 shadow-2xl shadow-brand-500/30 group-hover:scale-105 transition-all duration-200">
            <div className="w-full h-full rounded-[1.6rem] bg-surface-1 overflow-hidden border-4 border-[var(--color-surface)] flex items-center justify-center relative">
               <AnimalAvatar seed={user.email} type={isProfileLoading ? null : currentAnimalType} variant={currentVariantId} colorIndex={currentColorId} size={112} className="rounded-none w-full h-full" />
               <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                 <Palette size={28} className="text-white drop-shadow-lg" />
               </div>
            </div>
          </div>
          <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-brand-500 rounded-2xl border-4 border-[var(--color-surface)] flex items-center justify-center shadow-xl group-hover:rotate-90 transition-transform duration-500">
            <Settings size={16} className="text-white animate-spin-slow" />
          </div>
        </div>
        
        <div className="space-y-1 w-full max-w-[280px]">
          {isEditingName ? (
            <div className="flex flex-col gap-2 items-center animate-pop-in">
              <input 
                type="text" 
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                maxLength={15}
                placeholder="Twoja nowa nazwa..."
                className="w-full bg-surface-2 border-2 border-brand-500/50 rounded-2xl px-4 py-3 text-center font-bold text-lg focus:outline-none focus:border-brand-500 transition-all"
                autoFocus
              />
              <div className="flex gap-2 w-full">
                <button 
                  onClick={() => setIsEditingName(false)}
                  className="flex-1 py-3 rounded-xl bg-surface-2 text-xs font-bold text-muted uppercase tracking-widest"
                >
                  Anuluj
                </button>
                <button 
                  onClick={updateProfileName}
                  className="flex-[2] py-3 rounded-xl bg-brand-500 text-white text-xs font-bold uppercase tracking-widest shadow-lg shadow-brand-500/20"
                >
                  Zapisz
                </button>
              </div>
            </div>
          ) : (
            <div className="group flex flex-col items-center">
              <h1 
                onClick={() => { setIsEditingName(true); setNewUsername(profile?.username || userName); }}
                className={`font-black tracking-tight text-gradient cursor-pointer hover:scale-105 transition-transform flex items-center gap-2 max-w-xs py-1 leading-normal
                  ${(profile?.username || userName).length > 12 ? 'text-xl' : (profile?.username || userName).length > 8 ? 'text-2xl' : 'text-3xl'}`} 
                style={{ fontFamily: "var(--font-display)" }}
              >
                <span className="whitespace-nowrap">{profile?.username || userName}</span>
                <Settings size={14} className="opacity-0 group-hover:opacity-40 text-brand-500 shrink-0" />
              </h1>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-2 border border-border mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">{user.email}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Events Banner - Premium version */}
      <section className="px-5 mb-10">
        <Link 
          href="/holidays"
          className="rounded-3xl p-5 flex items-center gap-5 relative overflow-hidden group border border-brand-500/20 shadow-xl shadow-brand-500/5 block active:scale-[0.98] transition-all"
          style={{ background: "linear-gradient(135deg, var(--color-surface-2) 0%, var(--color-surface-3) 100%)" }}
        >
          {/* Ambient glow inside banner */}
          <div className="absolute right-0 top-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl group-hover:bg-green-500/20 transition-colors" />
          
          <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center flex-shrink-0 border border-green-500/20 shadow-inner">
            <Gift className="text-green-500" size={28} />
          </div>
          <div className="flex-1 relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-green-500/80 mb-1">Pamiętaj o bliskich</p>
            <p className="font-bold text-base leading-tight mb-1">Już za {upcomingEvent.daysLeft} dni {upcomingEvent.name}!</p>
            <div className="flex items-center gap-1.5 text-text-muted text-xs">
              <Calendar size={12} className="opacity-50" />
              <span>{upcomingEvent.date}</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-surface-4 flex items-center justify-center shadow-sm group-hover:bg-green-500 group-hover:text-white transition-all">
            <ChevronRight size={18} className="transition-transform" />
          </div>
        </Link>
      </section>

      {/* Theme Selector - Hidden per user request */}

      {/* Grid Menu - Refined version */}
      <section className="px-5 pb-10 relative z-10">
        <h2 className="text-xs font-black uppercase tracking-[0.25em] mb-5 px-1 text-text-muted">
          Twoje centrum
        </h2>
        <div className="grid grid-cols-2 gap-4 mb-10">
            {menuItems.map((item, i) => {
              const Icon = item.icon;
              const isComingSoon = item.href === "#";
              return (
                <Link 
                  key={item.name} 
                  href={item.href}
                  onClick={(e) => {
                    if (isComingSoon) {
                      e.preventDefault();
                      showToast("Ta funkcja pojawi się wkrótce! ⏳", "info");
                    }
                  }}
                  className="group p-5 rounded-3xl transition-all duration-200 hover:scale-[1.02] active:scale-95 flex flex-col gap-4 relative overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-brand-500/10 border border-border hover:border-brand-500/30"
                  style={{ 
                    background: "linear-gradient(135deg, var(--color-surface-2) 0%, var(--color-surface-3) 100%)",
                    animationDelay: `${i * 60}ms`
                  }}
                >
                  {/* Card ambient glow */}
                  <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-brand-500/5 blur-2xl group-hover:bg-brand-500/10 transition-colors" />
                  
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:rotate-[10deg] shadow-inner relative ${item.color}`}>
                    <Icon size={22} strokeWidth={2.5} />
                    {item.name === "Powiadomienia" && unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 border-2 border-[var(--color-surface-2)] flex items-center justify-center animate-bounce-subtle shadow-lg">
                        <span className="text-[10px] font-black text-white">{unreadCount}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[15px] tracking-tight text-text-primary group-hover:text-brand-500 transition-colors">{item.name}</span>
                    <div className="w-6 h-6 rounded-full bg-surface-4 flex items-center justify-center opacity-40 group-hover:opacity-100 group-hover:bg-brand-500/20 group-hover:text-brand-500 transition-all">
                      <ChevronRight size={14} strokeWidth={3} />
                    </div>
                  </div>
                </Link>
              );
            })}
        </div>

        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-3 py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] border border-red-500/20 shadow-xl shadow-red-500/5 group relative overflow-hidden cursor-pointer"
          style={{ 
            background: "linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(239,68,68,0.06) 100%)",
            fontFamily: "var(--font-display)" 
          }}
        >
          {/* Logout hover glow */}
          <div className="absolute inset-0 bg-red-500 opacity-0 group-hover:opacity-5 transition-opacity" />
          
          <LogOut size={20} className="text-red-500 group-hover:-translate-x-1 transition-transform" />
          <span className="text-red-500 group-hover:tracking-[0.15em] transition-all">Wyloguj się</span>
        </button>
      </section>

      {/* Avatar Picker Modal */}
      {isPickerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6 animate-fade-in" onClick={() => setIsPickerOpen(false)}>
          <div className="w-full max-w-lg bg-surface-1 border border-border rounded-[2.5rem] p-8 pb-8 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-8">
              <h3 className="text-2xl font-black mb-2">Personalizuj Profil</h3>
              <p className="text-xs text-muted uppercase tracking-widest font-bold">Wybierz zwierzaka, minkę i kolor tła</p>
            </div>
            
            <div className="mb-8">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-4 ml-1">Krok 1: Wybierz Zwierzątko</p>
              <div className="grid grid-cols-3 gap-3">
                {(["panda", "fox", "cat", "frog", "bear", "pig", "rabbit", "dog", "koala", "tiger", "chick", "lion"] as AnimalType[]).map((t) => {
                  const translations: Record<string, string> = {
                    panda: "Panda",
                    fox: "Lis",
                    cat: "Kot",
                    frog: "Żaba",
                    bear: "Miś",
                    pig: "Świnka",
                    rabbit: "Królik",
                    dog: "Piesek",
                    koala: "Koala",
                    tiger: "Tygrys",
                    chick: "Kurczak",
                    lion: "Lew"
                  };
                  return (
                    <button
                      key={t}
                      onClick={() => setCurrentAnimalType(t)}
                      className={`relative aspect-square rounded-[2rem] transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                        currentAnimalType === t 
                          ? 'ring-2 ring-brand-500 bg-brand-500/10 scale-105 shadow-xl shadow-brand-500/10' 
                          : 'bg-surface-2 hover:bg-surface-3'
                      }`}
                    >
                      <AnimalAvatar type={t} variant={0} colorIndex={currentColorId} size={48} />
                      <p className="text-[9px] font-black uppercase opacity-60 text-text-primary px-1 truncate w-full text-center">
                        {translations[t as string] || t}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-8">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-4 ml-1">Krok 2: Wybierz Minkę</p>
              <div className="grid grid-cols-4 gap-3">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((v) => (
                  <button
                    key={v}
                    onClick={() => setCurrentVariantId(v)}
                    className={`relative aspect-square rounded-[2.2rem] transition-all hover:scale-105 cursor-pointer flex items-center justify-center ${
                      currentVariantId === v 
                        ? 'ring-4 ring-brand-500 bg-brand-500/10 shadow-xl shadow-brand-500/10' 
                        : 'bg-surface-2 hover:bg-surface-3'
                    }`}
                  >
                    <AnimalAvatar seed={user.email} type={currentAnimalType} variant={v} colorIndex={currentColorId} size={64} />
                    {currentVariantId === v && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-brand-500 rounded-full flex items-center justify-center shadow-lg border-2 border-[var(--color-surface-1)] z-10 animate-pop-in">
                        <Check size={12} className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-10">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-4 ml-1">Krok 3: Wybierz Tło</p>
              <div className="grid grid-cols-4 gap-3">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((c) => {
                  const bgGradients = [
                    "from-slate-100 to-slate-200",
                    "from-brand-300 to-brand-400",
                    "from-orange-300 to-orange-400",
                    "from-blue-300 to-blue-400",
                    "from-rose-300 to-rose-400",
                    "from-amber-300 to-amber-400",
                    "from-teal-300 to-teal-400",
                    "from-indigo-300 to-indigo-400",
                    "from-brand-300 to-brand-400",
                    "from-purple-300 to-purple-400",
                    "from-slate-800 to-slate-900",
                    "from-brand-600 to-brand-800",
                    "from-rose-800 to-rose-950",
                    "from-indigo-800 to-indigo-950",
                    "from-emerald-800 to-emerald-950",
                    "from-amber-700 to-amber-900"
                  ];
                  return (
                    <button
                      key={c}
                      onClick={() => setCurrentColorId(c)}
                      className={`relative aspect-square rounded-[2.2rem] transition-all hover:scale-105 flex items-center justify-center bg-gradient-to-br cursor-pointer ${bgGradients[c]} ${
                        currentColorId === c ? 'ring-4 ring-brand-500 shadow-xl shadow-brand-500/20 scale-105' : 'border border-white/10'
                      }`}
                    >
                      <AnimalAvatar type={currentAnimalType} variant={currentVariantId} colorIndex={c} size={64} noBackground />
                      
                      {currentColorId === c && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-brand-500 rounded-full flex items-center justify-center shadow-lg border-2 border-[var(--color-surface-1)] z-10 animate-pop-in">
                          <Check size={12} className="text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="flex gap-3 pt-8 pb-2">
              <button 
                onClick={() => setIsPickerOpen(false)}
                className="flex-1 py-4 rounded-2xl bg-surface-2 font-black text-xs uppercase tracking-widest text-muted hover:text-text-primary transition-all cursor-pointer"
              >
                Anuluj
              </button>
              <button 
                onClick={() => updateAvatar(currentAnimalType, currentVariantId, currentColorId)}
                className="flex-[2] py-4 rounded-2xl bg-brand-500 font-black text-xs uppercase tracking-widest text-white shadow-xl shadow-brand-500/20 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
              >
                Zastosuj zmiany
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
