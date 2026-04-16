"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { ShoppingList } from "@/types";
import { useRouter } from "next/navigation";
import {
  Plus,
  ShoppingCart,
  Trash2,
  ChevronRight,
  LogOut,
  Loader2,
  ShoppingBag,
  X,
  Users,
  Archive,
  Share2,
  Edit2,
  MoreVertical,
} from "lucide-react";
import { useToast } from "@/lib/ToastContext";

export default function ListsClient({
  initialLists,
  user,
}: {
  initialLists: ShoppingList[];
  user: User;
}) {
  const [lists, setLists] = useState<ShoppingList[]>(initialLists);
  const [newListName, setNewListName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [isLongPressActive, setIsLongPressActive] = useState(false);
  const supabase = createClient();
  const router = useRouter();
  const { showToast } = useToast();

  const fetchLists = useCallback(async () => {
    const { data } = await supabase
      .from("lists")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });
    if (data) setLists(data);
  }, [supabase]);

  useEffect(() => {
    const channel = supabase
      .channel("lists-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lists" },
        () => fetchLists()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, user.id, fetchLists]);

  async function createList(e: React.FormEvent) {
    e.preventDefault();
    if (!newListName.trim()) return;
    setCreating(true);
    const { error } = await supabase
      .from("lists")
      .insert({ name: newListName.trim(), user_id: user.id });
    if (!error) {
      setNewListName("");
      setShowInput(false);
      fetchLists();
    }
    setCreating(false);
  }

  async function deleteList(id: string) {
    setDeletingId(id);
    await supabase.from("items").delete().eq("list_id", id);
    await supabase.from("lists").delete().eq("id", id);
    setLists((prev) => prev.filter((l) => l.id !== id));
    setDeletingId(null);
  }

  async function archiveList(id: string) {
    const { error } = await supabase
      .from("lists")
      .update({ 
        status: "archived",
        archived_at: new Date().toISOString()
      })
      .eq("id", id);
    
    if (!error) {
      showToast("Lista została zarchiwizowana", "success");
      fetchLists();
      setSelectedList(null);
    }
  }

  const handleTouchStart = (list: ShoppingList) => {
    setIsLongPressActive(false);
    const timer = setTimeout(() => {
      setSelectedList(list);
      setIsLongPressActive(true);
      // Vibrate if supported
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 600);
    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  return (
    <div
      className="min-h-dvh flex flex-col w-full pb-48"
      style={{ background: "var(--color-surface)" }}
    >
      {/* Header */}
      <header className="px-5 pt-6 pb-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center shadow-md shadow-green-500/25">
              <ShoppingCart size={18} className="text-white" />
            </div>
            <h1
              className="text-xl font-bold text-gradient"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Zakupsy
            </h1>
          </div>
        </div>
        <p className="text-sm mt-3" style={{ color: "var(--color-text-secondary)" }}>
          Cześć,{" "}
          <span style={{ color: "var(--color-text-primary)" }}>
            {user.email?.split("@")[0]}
          </span>{" "}
          👋
        </p>
      </header>

      {/* Content */}
      <main className="flex-1 px-5 pb-24">
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-sm font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-display)" }}
          >
            Twoje listy ({lists.length})
          </h2>
        </div>

        {/* List of lists */}
        {lists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "var(--color-surface-3)" }}
            >
              <ShoppingBag size={32} style={{ color: "var(--color-text-muted)" }} />
            </div>
            <p className="font-semibold mb-1" style={{ fontFamily: "var(--font-display)" }}>
              Brak list zakupów
            </p>
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              Utwórz pierwszą listę, klikając przycisk poniżej
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {lists.map((list, i) => (
              <div
                key={list.id}
                className="animate-slide-up"
                style={{ animationDelay: `${i * 40}ms`, animationFillMode: "both" }}
              >
                <div
                  className="rounded-[var(--radius-card)] overflow-hidden relative group"
                  style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
                  onTouchStart={() => handleTouchStart(list)}
                  onTouchEnd={handleTouchEnd}
                  onMouseDown={() => handleTouchStart(list)}
                  onMouseUp={handleTouchEnd}
                  onMouseLeave={handleTouchEnd}
                >
                  <div className="flex items-center">
                    <button
                      onClick={() => !isLongPressActive && router.push(`/lists/${list.id}`)}
                      className="flex-1 flex items-center gap-3.5 px-4 py-4 text-left cursor-pointer hover:bg-white/[0.01] transition-colors"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: "var(--color-surface-3)" }}
                      >
                        {list.user_id === user.id ? (
                          <ShoppingCart size={18} style={{ color: "var(--color-brand-400)" }} />
                        ) : (
                          <Users size={18} style={{ color: "var(--color-brand-400)" }} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p
                          className="font-semibold truncate"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          {list.name}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                          {new Date(list.created_at).toLocaleDateString("pl-PL", {
                            day: "numeric",
                            month: "long",
                          })}
                        </p>
                      </div>
                      <ChevronRight size={16} className="ml-auto opacity-20 group-hover:opacity-100 transition-opacity" />
                    </button>
                    <button
                      onClick={() => setSelectedList(list)}
                      className="px-4 py-5 text-muted hover:text-white transition-colors cursor-pointer"
                    >
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* FAB + Create form */}
      {/* FAB + Create form */}
      <div
        className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-2xl px-5 pb-4 pt-4 z-40"
        style={{
          background: "linear-gradient(to top, var(--color-surface) 40%, transparent)",
        }}
      >
        {showInput ? (
          <form onSubmit={createList} className="animate-slide-up shadow-2xl">
            <div
              className="flex items-center gap-2 p-2 rounded-2xl"
              style={{
                background: "var(--color-surface-3)",
                border: "1px solid var(--color-brand-600)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              }}
            >
              <input
                autoFocus
                type="text"
                placeholder="Nazwa listy..."
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                className="flex-1 px-3 py-2 bg-transparent text-sm outline-none"
                style={{ color: "var(--color-text-primary)" }}
                maxLength={60}
              />
              <button
                type="button"
                onClick={() => { setShowInput(false); setNewListName(""); }}
                className="p-2 rounded-xl cursor-pointer"
                style={{ color: "var(--color-text-muted)" }}
              >
                <X size={18} />
              </button>
              <button
                type="submit"
                disabled={creating || !newListName.trim()}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white gradient-brand disabled:opacity-50 cursor-pointer"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {creating ? <Loader2 size={15} className="animate-spin" /> : "Utwórz"}
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowInput(true)}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-sm text-white gradient-brand shadow-lg shadow-green-500/30 hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <Plus size={20} />
            Nowa lista zakupów
          </button>
        )}
      </div>
      {/* Context Menu Overlay */}
      {selectedList && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/85 backdrop-blur-md p-6 pt-10 sm:pt-20 animate-fade-in" onClick={() => setSelectedList(null)}>
          <div 
            className="w-full max-w-sm bg-surface-2 border border-border rounded-[2.5rem] p-6 shadow-2xl animate-pop-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 mb-6 px-2">
              <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-400">
                <ShoppingCart size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg truncate text-text-primary">{selectedList.name}</h3>
                <p className="text-xs text-text-muted">ID: {selectedList.id.substring(0, 8)}...</p>
              </div>
              <button 
                onClick={() => setSelectedList(null)}
                className="w-10 h-10 rounded-full bg-surface-3 flex items-center justify-center text-text-muted"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button 
                onClick={() => { router.push(`/lists/${selectedList.id}/share`); setSelectedList(null); }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-brand-500/5 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <Share2 size={18} />
                </div>
                <span className="font-semibold text-text-primary">Udostępnij listę</span>
              </button>

              <button 
                onClick={() => archiveList(selectedList.id)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-brand-500/5 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center">
                  <Archive size={18} />
                </div>
                <span className="font-semibold text-text-primary">Archiwizuj</span>
              </button>

              <button 
                onClick={() => {}} // Placeholder for rename
                className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-brand-500/5 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-500/10 text-slate-400 flex items-center justify-center">
                  <Edit2 size={18} />
                </div>
                <span className="font-semibold text-text-primary">Zmień nazwę</span>
              </button>

              <div className="h-px bg-border my-2 mx-4" />

              <button 
                onClick={() => { if(confirm("Czy na pewno chcesz usunąć tę listę?")) deleteList(selectedList.id); setSelectedList(null); }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-red-500/10 text-red-400 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <Trash2 size={18} />
                </div>
                <span className="font-semibold">Usuń trwale</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
