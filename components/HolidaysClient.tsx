"use client";

import { useState } from "react";
import { 
  Calendar, 
  ChevronRight, 
  Gift, 
  ArrowLeft,
  Search,
  History,
  Info,
  ShoppingCart,
  Plus,
  X,
  Check
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/ToastContext";
import type { User } from "@supabase/supabase-js";

interface Holiday {
  name: string;
  date: string;
  desc: string;
  icon: string;
}

import { getUpcomingHolidays, ProcessedHoliday } from "@/lib/holidays";

export default function HolidaysClient({ user }: { user: User }) {
  const router = useRouter();
  const { showToast } = useToast();
  const supabase = createClient();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedHoliday, setSelectedHoliday] = useState<ProcessedHoliday | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const holidays: ProcessedHoliday[] = getUpcomingHolidays();

  const filteredHolidays = holidays.filter(h => 
    h.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isSoon = (daysLeft: number) => {
    return daysLeft > 0 && daysLeft <= 30;
  };

  const handleCreateList = async (holiday: ProcessedHoliday) => {
    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from("lists")
        .insert({
          name: holiday.name,
          user_id: user.id,
          status: "active",
          icon: holiday.icon
        })
        .select()
        .single();

      if (error) throw error;

      showToast(`Lista "${holiday.name}" została utworzona!`, "success");
      setSelectedHoliday(null);
      router.push(`/lists/${data.id}`);
    } catch (error) {
      console.error("Error creating list:", error);
      showToast("Błąd podczas tworzenia listy", "error");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex-1 pb-48 animate-fade-in relative overflow-hidden min-h-screen">
      {/* Background Decor */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-green-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 -right-32 w-64 h-64 bg-brand-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="px-6 pt-10 mb-8 relative z-10">
        <div className="flex items-center gap-4 mb-2">
          <button 
            onClick={() => router.back()}
            className="w-10 h-10 rounded-xl bg-surface-2/80 backdrop-blur-md border border-border flex items-center justify-center text-text-muted hover:text-brand-500 transition-colors active:scale-90"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-4xl font-black tracking-tighter" style={{ fontFamily: "var(--font-display)" }}>
            Najbliższe <span className="text-gradient">Święta</span>
          </h1>
        </div>
        <div className="flex items-center gap-3 pl-14">
          <div className="w-10 h-1.5 rounded-full bg-brand-500/20" />
          <p className="text-[11px] text-text-muted font-black uppercase tracking-[0.25em] opacity-60">Kalendarz okazji i prezentów</p>
        </div>
      </header>

      {/* Search */}
      <div className="px-6 mb-8 relative z-10">
        <div className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted transition-colors group-focus-within:text-brand-500" size={18} />
          <input 
            type="text" 
            placeholder="Szukaj święta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface-2/50 backdrop-blur-xl border border-border rounded-3xl pl-14 pr-6 py-5 font-bold outline-none focus:border-brand-500/50 transition-all shadow-lg"
          />
        </div>
      </div>

      {/* Grid Content */}
      <div className="px-6 space-y-4 relative z-10">
        {filteredHolidays.map((holiday, i) => {
          const daysLeft = holiday.daysLeft;
          const active = daysLeft >= 0;
          
          return (
            <div 
              key={holiday.name}
              onClick={() => active && setSelectedHoliday(holiday)}
              className={`group p-6 rounded-[2.5rem] bg-surface-2/40 backdrop-blur-sm border border-border flex items-center gap-5 transition-all duration-300 ${active ? 'hover:scale-[1.02] active:scale-[0.98] cursor-pointer' : 'opacity-40'}`}
              style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner ${isSoon(daysLeft) ? 'bg-brand-500/20 ring-2 ring-brand-500/30' : 'bg-surface-3'}`}>
                {holiday.icon}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-black text-base tracking-tight">{holiday.name}</h3>
                  {isSoon(daysLeft) && (
                    <span className="flex h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
                  )}
                </div>
                <p className="text-xs text-text-muted line-clamp-1 mb-2">{holiday.desc}</p>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-text-muted bg-surface-3/50 px-2.5 py-1 rounded-full">
                    <Calendar size={10} />
                    {holiday.formattedDate}
                  </div>
                  {active && (
                    <div className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${daysLeft <= 7 ? 'bg-red-500/10 text-red-500' : 'bg-brand-500/10 text-brand-500'}`}>
                      {daysLeft === 0 ? 'Dziś!' : `Za ${daysLeft} dni`}
                    </div>
                  )}
                </div>
              </div>

              <div className="w-10 h-10 rounded-full bg-surface-3 flex items-center justify-center opacity-40 group-hover:opacity-100 group-hover:bg-brand-500 group-hover:text-white transition-all">
                <ChevronRight size={18} />
              </div>
            </div>
          );
        })}

        {filteredHolidays.length === 0 && (
          <div className="py-20 text-center opacity-30">
            <History size={60} className="mx-auto mb-4" />
            <p className="font-bold">Nie znaleziono takich świąt</p>
          </div>
        )}
      </div>

      <div className="px-6 mt-10 mb-20">
        <div className="bg-brand-500/5 border border-brand-500/10 p-6 rounded-[2rem] flex gap-4 items-start">
          <Info className="text-brand-500 shrink-0 mt-1" size={20} />
          <div>
            <h4 className="font-bold text-sm mb-1 text-text-primary">Planuj z wyprzedzeniem</h4>
            <p className="text-xs text-text-muted leading-relaxed">Kliknij w dowolne święto, aby stworzyć nową listę zakupów przygotowaną specjalnie na tę okazję.</p>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {selectedHoliday && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-xl p-6 animate-fade-in" onClick={() => setSelectedHoliday(null)}>
          <div className="w-full max-w-sm bg-surface-1 rounded-[2.5rem] p-8 shadow-2xl animate-pop-in border border-white/5" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-20 h-20 rounded-3xl bg-brand-500/10 flex items-center justify-center text-4xl mb-6 shadow-inner ring-1 ring-brand-500/20">
                {selectedHoliday.icon}
              </div>
              <h3 className="text-2xl font-black mb-2 tracking-tight">{selectedHoliday.name}</h3>
              <p className="text-sm text-text-muted leading-relaxed">Czy chcesz utworzyć nową listę zakupów o tej nazwie?</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setSelectedHoliday(null)}
                className="py-4 rounded-2xl bg-surface-2 font-black text-xs uppercase tracking-widest text-text-muted active:scale-95 transition-all"
              >
                Anuluj
              </button>
              <button 
                onClick={() => handleCreateList(selectedHoliday)}
                disabled={isCreating}
                className="py-4 rounded-2xl bg-brand-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-brand-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {isCreating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <div className="flex items-center gap-2"><Plus size={16} /><span>Stwórz</span></div>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
