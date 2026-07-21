"use client";

import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { 
  History as HistoryIcon, 
  ArrowLeft, 
  Search, 
  ShoppingBag, 
  TrendingUp, 
  Calendar,
  Clock,
  ChevronRight,
  Filter,
  BarChart3,
  CheckCircle2,
  Trash2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/ToastContext";

interface HistoryItem {
  id: string;
  name: string;
  created_at: string;
  is_completed: boolean;
  category: string;
  icon?: string;
  list_name?: string;
}

export default function HistoryClient({ user }: { user: User }) {
  const router = useRouter();
  const { showToast } = useToast();
  const supabase = createClient();
  
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    setLoading(true);
    // Fetch all completed items
    const { data, error } = await supabase
      .from("items")
      .select("*, lists(name)")
      .eq("user_id", user.id)
      .eq("is_completed", true)
      .order("created_at", { ascending: false });
    
    if (!error && data) {
      setItems(data.map((item: any) => ({
        ...item,
        list_name: item.lists?.name
      })));
    }
    setLoading(false);
  }

  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats calculation
  const totalBought = items.length;
  const mostBought = items.reduce((acc: any, item) => {
    acc[item.name] = (acc[item.name] || 0) + 1;
    return acc;
  }, {});
  
  const topItems = Object.entries(mostBought)
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div className="flex-1 pb-48 animate-fade-in relative overflow-hidden min-h-screen">
      {/* Background Decor */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-orange-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 -right-32 w-64 h-64 bg-brand-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="px-6 pt-10 mb-8 relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-brand-500 transition-colors active:scale-90"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-4xl font-black tracking-tighter" style={{ fontFamily: "var(--font-display)" }}>
            Historia <span className="text-orange-500">Zakupów</span>
          </h1>
        </div>
      </header>

      {/* Stats Section */}
      <section className="px-6 mb-8 grid grid-cols-2 gap-4 relative z-10">
        <div className="bg-surface-2/40 backdrop-blur-xl border border-border p-5 rounded-[2rem] flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center mb-4">
              <ShoppingBag size={20} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Kupiono razem</p>
          </div>
          <p className="text-3xl font-black text-brand-500 mt-2">{totalBought}</p>
        </div>
        
        <div className="bg-surface-2/40 backdrop-blur-xl border border-border p-5 rounded-[2rem] flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center mb-4">
              <TrendingUp size={20} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Najczęstszy towar</p>
          </div>
          <p className="text-sm font-black text-orange-500 mt-2 truncate">
            {topItems[0] ? topItems[0][0] : "Brak danych"}
          </p>
        </div>
      </section>

      {/* Search Bar - Compact */}
      <div className="px-6 mb-8 relative z-10">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-brand-500 transition-colors" size={16} />
          <input 
            type="text" 
            placeholder="Szukaj w historii..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface-2/50 backdrop-blur-xl border border-border rounded-2xl pl-11 pr-4 py-3.5 font-bold outline-none focus:border-brand-500/50 transition-all text-sm"
          />
        </div>
      </div>

      {/* History List */}
      <div className="px-6 relative z-10">
        <div className="flex items-center gap-3 mb-6 px-1">
          <Clock size={14} className="text-text-muted" />
          <h2 className="text-xs font-black uppercase tracking-widest text-text-muted">Ostatnio kupione</h2>
          <div className="flex-1 h-px bg-border/50" />
        </div>

        {loading ? (
            <div className="space-y-4">
                {[1,2,3,4].map(i => (
                    <div key={i} className="h-20 rounded-3xl bg-surface-2/40 animate-pulse border border-border" />
                ))}
            </div>
        ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-30">
                <BarChart3 size={48} className="mb-4" />
                <p className="font-bold">Brak historii zakupów</p>
                <p className="text-xs">Zacznij kupować, aby zapełnić tę listę!</p>
            </div>
        ) : (
            <div className="space-y-3">
                {filteredItems.map((item, i) => (
                    <div 
                        key={item.id}
                        className="p-5 rounded-3xl bg-surface-2/40 backdrop-blur-md border border-border flex items-center gap-4 group hover:bg-surface-2/60 transition-all duration-300"
                        style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
                    >
                        <div className="w-12 h-12 rounded-2xl bg-brand-500/5 border border-brand-500/10 flex items-center justify-center shrink-0">
                            {item.icon ? (
                                <span className="text-xl">{item.icon}</span>
                            ) : (
                                <CheckCircle2 size={24} className="text-brand-500/40" />
                            )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-sm text-text-primary capitalize truncate">{item.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] font-black uppercase tracking-widest text-text-muted opacity-60">
                                    {item.list_name || "Bez listy"}
                                </span>
                                <span className="w-1 h-1 rounded-full bg-border" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-text-muted opacity-60">
                                    {new Date(item.created_at).toLocaleDateString("pl-PL", { day: 'numeric', month: 'short' })}
                                </span>
                            </div>
                        </div>
                        
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <ChevronRight size={16} className="text-text-muted" />
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}
