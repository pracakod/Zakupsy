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
import { dataCache } from "@/lib/DataCache";

export default function ListsClient({
  initialLists,
  user,
}: {
  initialLists: ShoppingList[];
  user: User;
}) {
  const [lists, setLists] = useState<ShoppingList[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('cache_shopping_lists');
      if (cached) return JSON.parse(cached);
    }
    return initialLists;
  });
  const [newListName, setNewListName] = useState("");
  const [newListIcon, setNewListIcon] = useState("");
  const [creating, setCreating] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [isLongPressActive, setIsLongPressActive] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState("");
  const [editingIcon, setEditingIcon] = useState("");
  const [supabase] = useState(() => createClient());
  const router = useRouter();
  const { showToast } = useToast();

  const prefetchListData = useCallback(async (listId: string) => {
    if (dataCache.get(`list_items_${listId}`)) return;
    try {
      const { data } = await supabase
        .from("items")
        .select("*")
        .eq("list_id", listId)
        .order("created_at", { ascending: true });
      if (data) dataCache.set(`list_items_${listId}`, data);
    } catch (e) {}
  }, [supabase]);

  const fetchLists = useCallback(async () => {
    const [ownListsRes, sharedAccessRes] = await Promise.all([
      supabase
        .from("lists")
        .select("*, items(count)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false }),
      supabase
        .from("list_shares")
        .select("list:lists(*, items(count))")
        .or(`user_id.eq.${user.id},invited_email.eq.${user.email}`)
    ]);

    const ownLists = ownListsRes.data;
    const sharedAccess = sharedAccessRes.data;
    const sharedLists = (sharedAccess || [])
      .map((s: any) => s.list)
      .filter((l: any) => l && l.status === "active");

    const allLists = [...(ownLists || []), ...sharedLists];
    setLists(allLists);
    localStorage.setItem('cache_shopping_lists', JSON.stringify(allLists));
  }, [supabase, user.id]);

  useEffect(() => {
    fetchLists(); // Fetch immediately on mount
    const channel = supabase
      .channel("lists-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lists" },
        () => fetchLists()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "list_shares" },
        () => fetchLists()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, user.id, fetchLists]);

  async function createList(e: React.FormEvent) {
    e.preventDefault();
    if (!newListName.trim()) return;
    
    const tempId = `temp-${Date.now()}`;
    const optimisticList: ShoppingList = {
      id: tempId,
      name: newListName.trim(),
      user_id: user.id,
      icon: newListIcon.trim() || null,
      status: "active",
      created_at: new Date().toISOString()
    };

    // Optimistic update
    setLists((prev: ShoppingList[]) => [optimisticList, ...prev]);
    setNewListName("");
    setNewListIcon("");
    setShowInput(false);
    setCreating(true);

    const { data, error } = await supabase
      .from("lists")
      .insert({ 
        name: optimisticList.name, 
        user_id: user.id,
        icon: optimisticList.icon
      })
      .select("*")
      .single();

    if (error) {
      // Revert optimistic update
      setLists(prev => prev.filter(l => l.id !== tempId));
      showToast("Błąd podczas tworzenia listy: " + error.message, "error");
    } else if (data) {
      // Replace temp with real data
      setLists(prev => prev.map(l => l.id === tempId ? data : l));
      localStorage.setItem('cache_shopping_lists', JSON.stringify([data, ...lists.filter(l => l.id !== tempId)]));
    }
    setCreating(false);
  }

  async function deleteList(id: string) {
    // Only allow owner to delete
    const listToDelete = lists.find(l => l.id === id);
    if (!listToDelete || listToDelete.user_id !== user.id) {
      showToast("Tylko właściciel może usunąć listę", "error");
      return;
    }

    const previousLists = [...lists];
    
    // Optimistic remove
    setLists((prev: ShoppingList[]) => prev.filter((l: ShoppingList) => l.id !== id));
    setDeletingId(id);

    try {
      // We need to delete items first due to FK constraints if not cascade
      await supabase.from("items").delete().eq("list_id", id);
      await supabase.from("list_shares").delete().eq("list_id", id);
      const { error } = await supabase.from("lists").delete().eq("id", id);
      
      if (error) throw error;
      
      showToast("Lista została usunięta", "success");
      localStorage.setItem('cache_shopping_lists', JSON.stringify(lists.filter(l => l.id !== id)));
    } catch (error: any) {
      // Revert
      setLists(previousLists);
      showToast("Błąd podczas usuwania: " + error.message, "error");
    } finally {
      setDeletingId(null);
    }
  }

  async function archiveList(id: string) {
    const listToArchive = lists.find(l => l.id === id);
    if (!listToArchive) return;

    const previousLists = [...lists];

    // Optimistic update
    setLists((prev: ShoppingList[]) => prev.filter((l: ShoppingList) => l.id !== id));
    
    const { error } = await supabase
      .from("lists")
      .update({ 
        status: "archived",
        archived_at: new Date().toISOString()
      })
      .eq("id", id);
    
    if (error) {
      // Revert
      setLists(previousLists);
      showToast("Błąd podczas archiwizacji", "error");
    } else {
      showToast("Lista została zarchiwizowana", "success");
      localStorage.setItem('cache_shopping_lists', JSON.stringify(lists.filter(l => l.id !== id)));
      setSelectedList(null);
    }
  }

  async function renameList(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedList || !editingName.trim()) return;

    const previousLists = [...lists];
    const newName = editingName.trim();
    const newIcon = editingIcon.trim() || null;

    // Optimistic update
    setLists((prev: ShoppingList[]) => prev.map((l: ShoppingList) => l.id === selectedList.id ? { ...l, name: newName, icon: newIcon } : l));
    setIsEditing(false);
    setSelectedList(null);

    const { error } = await supabase
      .from("lists")
      .update({ 
        name: newName,
        icon: newIcon
      })
      .eq("id", selectedList.id);

    if (error) {
      // Revert
      setLists(previousLists);
      showToast("Błąd przy zapisie zmian: " + error.message, "error");
    } else {
      showToast("Lista została zaktualizowana", "success");
      localStorage.setItem('cache_shopping_lists', JSON.stringify(lists.map(l => l.id === selectedList.id ? { ...l, name: newName, icon: newIcon } : l)));
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
      <header className="px-5 pt-8 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shadow-lg shadow-brand-500/10">
            <ShoppingCart size={22} className="text-brand-500" strokeWidth={2.5} />
          </div>
          <h1
            className="text-3xl font-black text-gradient tracking-tighter"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Zakupsy
          </h1>
        </div>
        <div className="flex items-center gap-2 pl-1">
          <div className="w-6 h-1 rounded-full bg-brand-500/20" />
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted opacity-60">Zarządzaj swoimi listami</p>
        </div>
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
                  className="rounded-[var(--radius-card)] overflow-hidden relative group select-none"
                  style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
                  onTouchStart={() => {
                    handleTouchStart(list);
                    prefetchListData(list.id);
                  }}
                  onMouseEnter={() => prefetchListData(list.id)}
                  onTouchEnd={handleTouchEnd}
                  onMouseDown={() => handleTouchStart(list)}
                  onMouseUp={handleTouchEnd}
                  onMouseLeave={handleTouchEnd}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <div className="flex items-center">
                    <button
                      onClick={() => !isLongPressActive && router.push(`/lists/${list.id}`)}
                      className="flex-1 flex items-center gap-3.5 px-4 py-4 text-left cursor-pointer hover:bg-white/[0.01] transition-colors"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 duration-300"
                        style={{ background: "var(--color-surface-3)" }}
                      >
                        {(() => {
                          const icon = list.icon;
                          const name = list.name.toLowerCase();
                          
                          // LIDL: Blue bg, Yellow L
                          if (icon === "brand:lidl" || (name.includes("lidl") && !icon)) return (
                            <div className="w-full h-full rounded-xl bg-[#0050aa] flex items-center justify-center">
                              <span className="text-[#ffde00] font-black text-lg italic tracking-tighter">L</span>
                            </div>
                          );
                          
                          // ZABKA: Green bg, White Z
                          if (icon === "brand:zabka" || ((name.includes("żabka") || name.includes("zabka")) && !icon)) return (
                            <div className="w-full h-full rounded-xl bg-[#009141] flex items-center justify-center">
                              <span className="text-white font-black text-lg">Ż</span>
                            </div>
                          );

                          if (icon) return <span className="text-xl">{icon}</span>;
                          
                          // BIEDRONKA: Yellow bg, Beetle
                          if (name.includes("biedronka")) return (
                            <div className="w-full h-full rounded-xl bg-[#ffde00] flex items-center justify-center">
                              <span className="text-xl">🐞</span>
                            </div>
                          );
                          
                          // TRAVEL: Sky Blue bg, White Plane
                          if (name.includes("podróż") || name.includes("podroz") || name.includes("paryż") || name.includes("paryz") || name.includes("lot") || name.includes("wakacje")) return (
                            <div className="w-full h-full rounded-xl bg-sky-400 flex items-center justify-center">
                              <span className="text-white text-xl">✈️</span>
                            </div>
                          );
                          
                          // ROSSMANN: Red bg, White R
                          if (name.includes("rossmann")) return (
                            <div className="w-full h-full rounded-xl bg-[#e30613] flex items-center justify-center">
                              <span className="text-white font-black text-lg italic">R</span>
                            </div>
                          );

                          // AUCHAN: Red
                          if (name.includes("auchan")) return (
                            <div className="w-full h-full rounded-xl bg-[#e30613] flex items-center justify-center border-b-4 border-green-600">
                              <span className="text-white font-black text-lg">A</span>
                            </div>
                          );
                          
                          // Default icons
                          return (
                            <div className="w-full h-full rounded-xl flex items-center justify-center" style={{ background: "var(--color-surface-3)" }}>
                              {list.user_id === user.id ? (
                                <ShoppingCart size={18} style={{ color: "var(--color-brand-400)" }} />
                              ) : (
                                <Users size={18} style={{ color: "var(--color-brand-400)" }} />
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      <div className="min-w-0">
                        <p
                          className="font-semibold truncate"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          {list.name}
                        </p>
                        <p className="text-[10px] mt-0.5 font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ color: "var(--color-text-muted)" }}>
                          {list.user_id !== user.id && <Users size={10} className="text-brand-400" />}
                          <span>
                            {(() => {
                              const count = (list as any).items?.[0]?.count || 0;
                              if (count === 0) return "Brak produktów";
                              if (count === 1) return "1 produkt";
                              if (count >= 2 && count <= 4) return `${count} produkty`;
                              return `${count} produktów`;
                            })()}
                          </span>
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
      {/* New List Modal */}
      {showInput && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-md p-6 animate-fade-in" onClick={() => { setShowInput(false); setNewListName(""); }}>
          <div className="w-full max-w-sm bg-surface-1 border border-border rounded-[2.5rem] p-8 shadow-2xl animate-pop-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-6 text-center text-text-primary" style={{ fontFamily: "var(--font-display)" }}>Nowa lista zakupów</h3>
            
            <form onSubmit={createList}>
              <div className="space-y-5 mb-8">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-3 block px-1">Ikona listy</label>
                  
                  <div className="flex flex-wrap gap-2.5 mb-6 px-1">
                    {[
                      { id: "brand:lidl", content: <div className="w-full h-full bg-[#0050aa] flex items-center justify-center rounded-lg"><span className="text-[#ffde00] font-black text-[10px] italic">L</span></div> },
                      { id: "brand:zabka", content: <div className="w-full h-full bg-[#009141] flex items-center justify-center rounded-lg text-white font-black text-[10px]">Ż</div> },
                      { id: "🐞", content: "🐞" },
                      { id: "🛒", content: "🛒" },
                      { id: "🛍️", content: "🛍️" },
                      { id: "🏠", content: "🏠" },
                      { id: "✈️", content: "✈️" },
                      { id: "📦", content: "📦" },
                      { id: "🍎", content: "🍎" },
                      { id: "🥛", content: "🥛" },
                    ].map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setNewListIcon(item.id)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all active:scale-90 ${newListIcon === item.id ? 'ring-2 ring-brand-500 ring-offset-2 ring-offset-surface-1' : 'bg-surface-3 hover:bg-surface-4'}`}
                      >
                        {item.content}
                      </button>
                    ))}
                  </div>
                  <input 
                    type="text" 
                    value={newListIcon}
                    onChange={e => setNewListIcon(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-2xl text-center focus:border-brand-500 transition-colors outline-none"
                    placeholder="🛒"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2 block px-1">Nazwa listy</label>
                  <input 
                    type="text" 
                    value={newListName}
                    onChange={e => setNewListName(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-xl px-4 py-4 text-base font-bold text-text-primary focus:border-brand-500 transition-colors outline-none"
                    autoFocus
                    placeholder="np. Moje zakupy"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => { setShowInput(false); setNewListName(""); }}
                  className="flex-1 py-4 rounded-2xl bg-surface-3 hover:bg-surface-4 text-text-primary font-bold text-sm transition-all"
                >
                  Anuluj
                </button>
                <button 
                  type="submit"
                  disabled={creating || !newListName.trim()}
                  className="flex-1 py-4 rounded-2xl bg-brand-600 hover:bg-brand-700 font-bold text-sm text-white shadow-lg shadow-brand-500/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {creating ? <Loader2 size={16} className="animate-spin inline mr-2" /> : "Gotowe"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FAB */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-2xl px-5 z-40">
        <button
          onClick={() => setShowInput(true)}
          className="group relative w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-brand-600 font-black text-xs uppercase tracking-widest text-white shadow-xl shadow-brand-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <Plus size={18} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-500" />
          <span>Nowa lista zakupów</span>
        </button>
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
                onClick={() => { 
                  setEditingName(selectedList.name); 
                  setEditingIcon(selectedList.icon || "");
                  setIsEditing(true); 
                }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-brand-500/5 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-500/10 text-slate-400 flex items-center justify-center">
                  <Edit2 size={18} />
                </div>
                <span className="font-semibold text-text-primary">Zmień nazwę</span>
              </button>

              <div className="h-px bg-border my-2 mx-4" />

              <button 
                onClick={() => { setShowDeleteConfirm(selectedList.id); }}
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-6 animate-fade-in" onClick={() => setShowDeleteConfirm(null)}>
          <div className="w-full max-w-xs bg-surface-2 border border-border rounded-[2.5rem] p-8 shadow-2xl animate-pop-in" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-6">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-bold text-center mb-2">Usunąć listę?</h3>
            <p className="text-sm text-center text-text-muted mb-8 text-balance">Stracisz wszystkie produkty z tej listy. Tej operacji nie można cofnąć.</p>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => { deleteList(showDeleteConfirm); setShowDeleteConfirm(null); setSelectedList(null); }}
                className="w-full py-4 rounded-xl bg-red-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-red-500/20 active:scale-95 transition-all"
              >
                Tak, usuń listę
              </button>
              <button 
                onClick={() => setShowDeleteConfirm(null)}
                className="w-full py-4 rounded-xl bg-surface-3 font-bold text-sm text-text-muted hover:text-text-primary transition-all"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Rename Modal */}
      {isEditing && selectedList && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md p-6 animate-fade-in" onClick={() => setIsEditing(false)}>
          <div className="w-full max-w-sm bg-surface-1 border border-border rounded-[2.5rem] p-8 shadow-2xl animate-pop-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-6 text-center text-text-primary">Zmień nazwę listy</h3>
            
            <form onSubmit={renameList}>
              <div className="space-y-5 mb-8">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-3 block px-1">Ikona listy</label>
                  
                  <div className="flex flex-wrap gap-2.5 mb-6 px-1">
                    {[
                      { id: "brand:lidl", content: <div className="w-full h-full bg-[#0050aa] flex items-center justify-center rounded-lg"><span className="text-[#ffde00] font-black text-[10px] italic">L</span></div> },
                      { id: "brand:zabka", content: <div className="w-full h-full bg-[#009141] flex items-center justify-center rounded-lg text-white font-black text-[10px]">Ż</div> },
                      { id: "🐞", content: "🐞" },
                      { id: "🐸", content: "🐸" },
                      { id: "🦖", content: "🦖" },
                      { id: "🦁", content: "🦁" },
                      { id: "🛒", content: "🛒" },
                      { id: "🛍️", content: "🛍️" },
                      { id: "🏠", content: "🏠" },
                      { id: "✈️", content: "✈️" },
                      { id: "📦", content: "📦" },
                      { id: "🍎", content: "🍎" },
                      { id: "🥛", content: "🥛" },
                      { id: "🧴", content: "🧴" },
                      { id: "🥳", content: "🥳" },
                    ].map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setEditingIcon(item.id)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all active:scale-90 ${editingIcon === item.id ? 'ring-2 ring-brand-500 ring-offset-2 ring-offset-surface-1' : 'bg-surface-3 hover:bg-surface-4'}`}
                      >
                        {item.content}
                      </button>
                    ))}
                  </div>
                  <input 
                    type="text" 
                    value={editingIcon}
                    onChange={e => setEditingIcon(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-2xl text-center focus:border-brand-500 transition-colors outline-none"
                    placeholder="🛒"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2 block px-1">Nazwa listy</label>
                  <input 
                    type="text" 
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-xl px-4 py-4 text-base font-bold text-text-primary focus:border-brand-500 transition-colors outline-none"
                    autoFocus
                    placeholder={selectedList.name}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-4 rounded-2xl bg-surface-3 hover:bg-surface-4 text-text-primary font-bold text-sm transition-all"
                >
                  Anuluj
                </button>
                <button 
                  type="submit"
                  disabled={!editingName.trim() || (editingName === selectedList.name && editingIcon === (selectedList.icon || ""))}
                  className="flex-1 py-4 rounded-2xl bg-brand-600 hover:bg-brand-700 font-bold text-sm text-white shadow-lg shadow-brand-500/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  Zapisz
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
