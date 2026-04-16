"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { ShoppingList } from "@/types";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Archive as ArchiveIcon, 
  X, 
  Trash2, 
  RotateCcw, 
  Calendar,
  ChevronRight,
  ShoppingBag,
  Eye,
  Check
} from "lucide-react";
import { useToast } from "@/lib/ToastContext";

export default function ArchiveClient({
  initialLists,
  user,
}: {
  initialLists: ShoppingList[];
  user: User;
}) {
  const [lists, setLists] = useState<ShoppingList[]>(initialLists);
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [previewItems, setPreviewItems] = useState<any[] | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const supabase = createClient();
  const router = useRouter();
  const { showToast } = useToast();

  async function restoreList(id: string) {
    const { error } = await supabase
      .from("lists")
      .update({ status: "active", archived_at: null })
      .eq("id", id);
    
    if (!error) {
      showToast("Lista została przywrócona", "success");
      setLists(prev => prev.filter(l => l.id !== id));
      setSelectedList(null);
    }
  }

  async function deleteListPermanently(id: string) {
    if (!confirm("Czy na pewno chcesz trwale usunąć tę listę z archiwum?")) return;
    
    // Delete items first (due to foreign key) - items table doesn't have cascades probably
    await supabase.from("items").delete().eq("list_id", id);
    const { error } = await supabase
      .from("lists")
      .delete()
      .eq("id", id);
    
    if (!error) {
      showToast("Lista usunięta trwale", "success");
      setLists(prev => prev.filter(l => l.id !== id));
      setSelectedList(null);
    }
  }

  async function fetchPreview(id: string) {
    setLoadingPreview(true);
    const { data } = await supabase
      .from("items")
      .select("*")
      .eq("list_id", id)
      .order("created_at", { ascending: true });
    
    if (data) {
      setPreviewItems(data);
    }
    setLoadingPreview(false);
  }

  const handleOpenList = (list: ShoppingList) => {
    setSelectedList(list);
    setPreviewItems(null); // Reset preview when switching lists
  };

  // Group lists by month
  const groupedLists = lists.reduce((groups: { [key: string]: ShoppingList[] }, list) => {
    const date = new Date(list.archived_at || list.created_at);
    const monthYear = date.toLocaleDateString("pl-PL", { month: "long", year: "numeric" });
    if (!groups[monthYear]) groups[monthYear] = [];
    groups[monthYear].push(list);
    return groups;
  }, {});

  const months = Object.keys(groupedLists);

  return (
    <div className="min-h-dvh flex flex-col w-full pb-20" style={{ background: "var(--color-surface)" }}>
      {/* Header */}
      <header className="px-5 pt-6 pb-6 sticky top-0 z-10" style={{ background: "var(--color-surface)" }}>
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-1.5 text-sm mb-5 cursor-pointer"
          style={{ color: "var(--color-brand-400)" }}
        >
          <ArrowLeft size={16} />
          Powrót
        </button>

        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-500/10 flex items-center justify-center text-slate-400 shadow-inner">
            <ArchiveIcon size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              Archiwum
            </h1>
            <p className="text-xs text-text-muted">Twoje zakończone listy</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-5">
        {lists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-border flex items-center justify-center mb-6">
              <ArchiveIcon size={32} />
            </div>
            <p className="font-bold mb-1">Archiwum jest puste</p>
            <p className="text-xs max-w-[200px] leading-relaxed">Tutaj pojawią się listy, które oznaczysz jako zarchiwizowane.</p>
          </div>
        ) : (
          months.map((month) => (
            <div key={month} className="mb-10">
              <div className="flex items-center gap-3 mb-5 px-1">
                <Calendar size={14} className="text-brand-400 opacity-50" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">
                  {month}
                </h2>
                <div className="flex-1 h-px bg-border/50" />
              </div>

              <div className="grid grid-cols-1 gap-3">
                {groupedLists[month].map((list, i) => (
                  <div
                    key={list.id}
                    onClick={() => handleOpenList(list)}
                    className="animate-slide-up group p-4 rounded-[1.5rem] bg-surface-2 border border-border flex items-center gap-4 transition-all active:scale-[0.98] cursor-pointer"
                    style={{ animationDelay: `${i * 40}ms`, animationFillMode: "both" }}
                  >
                    <div className="w-10 h-10 rounded-xl bg-surface-3 flex items-center justify-center text-text-muted">
                      <ShoppingBag size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm truncate text-text-primary capitalize">{list.name}</h3>
                      <p className="text-[10px] text-text-muted mt-0.5">
                        Zarchiwizowano: {new Date(list.archived_at || list.created_at).toLocaleDateString("pl-PL", {
                          day: "numeric",
                          month: "short"
                        })}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-text-muted opacity-20" />
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </main>

      {/* Context Menu for Archived List */}
      {selectedList && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md p-6 animate-fade-in" onClick={() => setSelectedList(null)}>
          <div className="w-full max-w-sm bg-surface-2 border border-border rounded-[2.5rem] p-6 shadow-2xl animate-pop-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-4 mb-6 px-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-500/10 flex items-center justify-center text-slate-400">
                <ArchiveIcon size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg truncate text-text-primary capitalize">{selectedList.name}</h3>
                <p className="text-xs text-text-muted">Zarchiwizowana lista</p>
              </div>
              <button 
                onClick={() => setSelectedList(null)}
                className="w-10 h-10 rounded-full bg-surface-3 flex items-center justify-center text-text-muted"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {!previewItems ? (
                <button 
                  onClick={() => fetchPreview(selectedList.id)}
                  disabled={loadingPreview}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center">
                    {loadingPreview ? <RotateCcw size={18} className="animate-spin" /> : <Eye size={18} />}
                  </div>
                  <div className="flex-1">
                    <span className="font-bold block">Podejrzyj produkty</span>
                    <span className="text-[10px] opacity-60">Zobacz co było na liście</span>
                  </div>
                </button>
              ) : (
                <div className="bg-surface-3/50 rounded-2xl p-4 mb-2 max-h-[300px] overflow-y-auto custom-scrollbar border border-border/50">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-3 px-1">Produkty na liście:</h4>
                  <div className="space-y-2">
                    {previewItems.length === 0 ? (
                      <p className="text-xs text-center py-4 text-text-muted italic">Lista była pusta</p>
                    ) : (
                      previewItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 p-2 bg-surface-1/50 rounded-xl border border-border/20">
                          {item.is_completed ? (
                            <div className="w-5 h-5 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center shrink-0">
                              <Check size={12} strokeWidth={3} />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full border border-text-muted/30 shrink-0" />
                          )}
                          <span className={`text-xs font-medium truncate ${item.is_completed ? 'opacity-40 line-through' : 'text-text-primary'}`}>
                            {item.name}
                          </span>
                          {item.icon && <span className="ml-auto text-xs opacity-60">{item.icon}</span>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div className="h-px bg-border/50 my-2" />

              <button 
                onClick={() => restoreList(selectedList.id)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-brand-500/5 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-400 flex items-center justify-center">
                  <RotateCcw size={18} />
                </div>
                <div className="flex-1">
                  <span className="font-semibold block text-text-primary">Przywróć listę</span>
                  <span className="text-[10px] text-text-muted">Przenieś do aktywnych zakupów</span>
                </div>
              </button>

              <div className="h-px bg-border my-2 mx-4" />

              <button 
                onClick={() => deleteListPermanently(selectedList.id)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-red-500/10 text-red-400 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <Trash2 size={18} />
                </div>
                <span className="font-semibold">Usuń trwale z archiwum</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
