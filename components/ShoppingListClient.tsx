"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { ShoppingList, Item } from "@/types";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, X, Loader2, ShoppingBag, Share2, UserPlus, Edit2, Trash2, CheckCircle2, Circle, CircleOff, ChevronDown } from "lucide-react";
import ListItem from "./ListItem";

import { useToast } from "@/lib/ToastContext";

export default function ShoppingListClient({
  list,
  initialItems,
  user,
}: {
  list: ShoppingList;
  initialItems: Item[];
  user: User;
}) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [newItemName, setNewItemName] = useState("");
  const [adding, setAdding] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const supabase = createClient();
  const router = useRouter();
  const { showToast } = useToast();

  async function shareList(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    
    // First find the user ID by email in our profiles table
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", inviteEmail.trim().toLowerCase())
      .single();

    if (!profile) {
      showToast("Nie znaleziono użytkownika o takim adresie e-mail.", "error");
      setInviting(false);
      return;
    }

    const { error } = await supabase
      .from("list_shares")
      .insert({ 
        list_id: list.id, 
        user_id: profile.id, 
        invited_by: user.id 
      });

    if (error) {
      showToast("Błąd podczas udostępniania: " + error.message, "error");
    } else {
      showToast("Lista została udostępniona!", "success");
      setShowShare(false);
      setInviteEmail("");
    }
    setInviting(false);
  }

  const fetchItems = useCallback(async () => {
    const { data } = await supabase
      .from("items")
      .select("*")
      .eq("list_id", list.id)
      .order("created_at", { ascending: true });
    if (data) setItems(data);
  }, [supabase, list.id]);

  const fetchParticipants = useCallback(async () => {
    // 1. Get owner
    const { data: owner } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", list.user_id)
      .single();
    
    // 2. Get shared users
    const { data: shares } = await supabase
      .from("list_shares")
      .select("profile:profiles!list_shares_user_id_fkey(*)")
      .eq("list_id", list.id);
    
    const all = [];
    if (owner) all.push({ ...owner, is_owner: true });
    if (shares) {
      shares.forEach((s: any) => {
        if (s.profile && s.profile.id !== list.user_id) {
          all.push(s.profile);
        }
      });
    }
    setParticipants(all);
  }, [supabase, list.id, list.user_id]);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  useEffect(() => {
    const channel = supabase
      .channel(`items-${list.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "items",
          filter: `list_id=eq.${list.id}`,
        },
        () => fetchItems()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, list.id, fetchItems]);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItemName.trim()) return;
    setAdding(true);
    const { error } = await supabase.from("items").insert({
      list_id: list.id,
      name: newItemName.trim(),
      status: 'pending',
      is_completed: false,
      user_id: user.id,
      category: 'Inne'
    });
    if (!error) {
      setNewItemName("");
      fetchItems();
    }
    setAdding(false);
  }

  async function toggleItem(item: Item) {
    const nextStatus = item.status === 'completed' ? 'pending' : 'completed';
    const { data } = await supabase
      .from("items")
      .update({ 
        status: nextStatus,
        is_completed: nextStatus === 'completed'
      })
      .eq("id", item.id)
      .select()
      .single();
    if (data) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? data : i)));
    }
  }

  async function setStatus(item: Item, status: 'pending' | 'completed' | 'missing') {
    const { data } = await supabase
      .from("items")
      .update({ 
        status,
        is_completed: status === 'completed'
      })
      .eq("id", item.id)
      .select()
      .single();
    if (data) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? data : i)));
    }
    setSelectedItem(null);
  }

  async function deleteItem(id: string) {
    await supabase.from("items").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  const pending = items.filter((i) => i.status !== 'completed');
  const completed = items.filter((i) => i.status === 'completed');
  const totalCount = items.length;
  const completedCount = completed.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Group pending items by category
  const categories = Array.from(new Set(pending.map(i => i.category || 'Inne')));
  
  function toggleCategory(cat: string) {
    setCollapsedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  }

  async function markCategoryCompleted(cat: string) {
    const catItems = pending.filter(i => i.category === cat);
    const { error } = await supabase
      .from("items")
      .update({ status: 'completed', is_completed: true })
      .in("id", catItems.map(i => i.id));
    
    if (!error) {
      fetchItems();
      setSelectedCategory(null);
    }
  }

  async function deleteCategoryItems(cat: string) {
    const catItems = pending.filter(i => i.category === cat);
    const { error } = await supabase
      .from("items")
      .delete()
      .in("id", catItems.map(i => i.id));
    
    if (!error) {
      fetchItems();
      setSelectedCategory(null);
    }
  }
  
  async function renameItem(id: string, currentName: string) {
    const newName = prompt("Zmień nazwę produktu:", currentName);
    if (!newName || newName === currentName) return;
    
    const { error } = await supabase
      .from("items")
      .update({ name: newName.trim() })
      .eq("id", id);
    
    if (error) {
      showToast("Nie udało się zmienić nazwy", "error");
    } else {
      showToast("Zmieniono nazwę produktu", "success");
      fetchItems();
    }
    setSelectedItem(null);
  }

  return (
    <div
      className="min-h-dvh flex flex-col w-full"
      style={{ background: "var(--color-surface)" }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-10 px-5 pt-6 pb-5"
        style={{
          background: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <button
          onClick={() => router.push("/lists")}
          className="flex items-center gap-1.5 text-sm mb-5 cursor-pointer"
          style={{ color: "var(--color-brand-400)" }}
        >
          <ArrowLeft size={16} />
          Wszystkie listy
        </button>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1
              className="text-xl font-bold truncate"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {list.name}
            </h1>
            {/* Participants list */}
            <div className="flex items-center gap-1 mt-1.5 overflow-x-auto no-scrollbar">
              {participants.map((p, idx) => (
                <div 
                  key={p.id} 
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black border-2 border-surface shadow-sm ${p.is_owner ? 'gradient-brand text-white border-brand-500/20' : 'bg-surface-3 text-text-muted border-border'}`}
                  title={p.username || p.email}
                >
                  {(p.username?.[0] || p.email?.[0] || '?').toUpperCase()}
                </div>
              ))}
              {participants.length > 5 && (
                <div className="w-6 h-6 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-[9px] font-bold text-muted">
                  +{participants.length - 5}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowShare(!showShare)}
            className="p-2.5 rounded-xl bg-surface-2 border border-border cursor-pointer transition-colors hover:bg-surface-3"
            style={{ color: "var(--color-brand-400)" }}
          >
            <Share2 size={18} />
          </button>
        </div>

        {/* Share Form */}
        {showShare && (
          <div className="mt-4 animate-slide-up p-4 rounded-2xl bg-surface-2 border border-brand-500/20 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <UserPlus size={14} className="text-brand-400" />
                Udostępnij listę
              </h3>
              <button onClick={() => setShowShare(false)} className="text-muted">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={shareList} className="flex gap-2">
              <input
                type="email"
                placeholder="E-mail znajomego..."
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 bg-surface-3 border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-500"
              />
              <button
                type="submit"
                disabled={inviting || !inviteEmail}
                className="px-3 py-2 rounded-xl gradient-brand text-white text-xs font-bold disabled:opacity-50"
              >
                {inviting ? <Loader2 size={14} className="animate-spin" /> : "Wyślij"}
              </button>
            </form>
          </div>
        )}


        {/* Compact Quick Add */}
        <div className="mt-4 px-1">
          <form onSubmit={addItem} className="relative group">
            <div className="relative flex items-center">
              <input 
                type="text"
                placeholder="Dodaj produkt..."
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onFocus={() => setShowInput(true)}
                onBlur={() => !newItemName && setShowInput(false)}
                className={`w-full bg-surface-2 border border-border/30 rounded-xl px-4 py-2 text-xs outline-none transition-all duration-300 ${showInput ? 'bg-surface-3 border-brand-500/30 ring-4 ring-brand-500/5' : 'opacity-60 hover:opacity-100'}`}
                style={{ color: "var(--color-text-primary)" }}
              />
              <button 
                type="submit"
                disabled={adding || !newItemName.trim()}
                className={`absolute right-1.5 w-6 h-6 rounded-lg gradient-brand text-white flex items-center justify-center transition-all duration-300 ${newItemName.trim() ? 'opacity-100 scale-100' : 'opacity-0 scale-50 pointer-events-none'}`}
              >
                {adding ? <Loader2 size={12} className="animate-spin" /> : <Plus size={14} strokeWidth={4} />}
              </button>
            </div>
          </form>
        </div>
      </header>

      {/* Items */}
      <main className="flex-1 px-5 py-4 pb-48">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="font-semibold mb-1">Lista jest pusta</p>
          </div>
        ) : (
          <>
            {/* Grouped Pending Items */}
            {categories.map(cat => {
              const catItems = pending.filter(i => i.category === cat);
              if (catItems.length === 0) return null;
              const isCollapsed = collapsedCategories.includes(cat);
              
              return (
                <div key={cat} className="mb-6">
                  <div 
                    onClick={() => toggleCategory(cat)}
                    onContextMenu={(e) => { e.preventDefault(); setSelectedCategory(cat); }}
                    className="flex items-center gap-2 mb-3 px-1 cursor-pointer group active:opacity-60 transition-opacity"
                  >
                    <div className={`transition-transform duration-300 ${isCollapsed ? '-rotate-90' : ''}`}>
                      <ChevronDown size={14} className="text-text-muted" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted group-hover:text-brand-400 transition-colors">
                      {cat} <span className="opacity-40 ml-1">({catItems.length})</span>
                    </span>
                    <div className="flex-1 h-px bg-border/50" />
                  </div>

                  {!isCollapsed && (
                    <div className="grid grid-cols-1 gap-2 animate-fade-in">
                      {catItems.map((item, i) => (
                        <div
                          key={item.id}
                          className="animate-slide-up"
                          style={{ animationDelay: `${i * 30}ms`, animationFillMode: "both" }}
                        >
                          <ListItem
                            item={item}
                            onToggle={() => toggleItem(item)}
                            onDelete={() => deleteItem(item.id)}
                            onLongPress={() => setSelectedItem(item)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Completed section */}
            {completed.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center gap-2 mb-3 px-1 opacity-50">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Zakupione ({completed.length})</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="grid grid-cols-1 gap-2 opacity-60">
                  {completed.map((item) => (
                    <ListItem
                      key={item.id}
                      item={item}
                      onToggle={() => toggleItem(item)}
                      onDelete={() => deleteItem(item.id)}
                      onLongPress={() => setSelectedItem(item)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Bottom padding filler */}
      <div className="h-32 pointer-events-none" />
      {/* Item Context Menu Overlay */}
      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/85 backdrop-blur-md p-6 pt-10 sm:pt-20 animate-fade-in" onClick={() => setSelectedItem(null)}>
          <div 
            className="w-full max-w-sm bg-surface-2 border border-border rounded-[2.5rem] p-6 shadow-2xl animate-pop-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 mb-6 px-2">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${selectedItem.status === 'completed' ? 'bg-green-500/10 text-green-400' : 'bg-brand-500/10 text-brand-400'}`}>
                <ShoppingBag size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg truncate text-text-primary">{selectedItem.name}</h3>
                <p className="text-xs text-text-muted">Zarządzaj produktem</p>
              </div>
              <button 
                onClick={() => setSelectedItem(null)}
                className="w-10 h-10 rounded-full bg-surface-3 flex items-center justify-center text-text-muted"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button 
                onClick={() => { toggleItem(selectedItem); setSelectedItem(null); }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-brand-500/5 transition-colors text-left"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedItem.status === 'completed' ? 'bg-slate-500/10 text-slate-400' : 'bg-green-500/10 text-green-400'}`}>
                  {selectedItem.status === 'completed' ? <Circle size={18} /> : <CheckCircle2 size={18} />}
                </div>
                <span className="font-semibold text-text-primary">{selectedItem.status === 'completed' ? "Oznacz jako do kupienia" : "Oznacz jako kupione"}</span>
              </button>

              <button 
                onClick={() => setStatus(selectedItem, selectedItem.status === 'missing' ? 'pending' : 'missing')}
                className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-brand-500/5 transition-colors text-left"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedItem.status === 'missing' ? 'bg-slate-500/10 text-slate-400' : 'bg-orange-500/10 text-orange-400'}`}>
                  <CircleOff size={18} />
                </div>
                <span className="font-semibold text-text-primary">{selectedItem.status === 'missing' ? "Przywróć na listę" : "Oznacz jako brak w sklepie"}</span>
              </button>

              <button 
                onClick={() => renameItem(selectedItem.id, selectedItem.name)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-brand-500/5 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <Edit2 size={18} />
                </div>
                <span className="font-semibold text-text-primary">Zmień nazwę</span>
              </button>

              <div className="h-px bg-border my-2 mx-4" />

              <button 
                onClick={() => { if(confirm("Usunąć ten produkt?")) deleteItem(selectedItem.id); setSelectedItem(null); }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-red-500/10 text-red-400 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <Trash2 size={18} />
                </div>
                <span className="font-semibold">Usuń produkt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Context Menu */}
      {selectedCategory && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md p-6 animate-fade-in" onClick={() => setSelectedCategory(null)}>
          <div className="w-full max-w-sm bg-surface-2 border border-border rounded-[2.5rem] p-6 shadow-2xl animate-pop-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-4 mb-6 px-2">
              <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-400">
                <ShoppingBag size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg truncate text-text-primary capitalize">{selectedCategory}</h3>
                <p className="text-xs text-text-muted">Akcje dla całej kategorii</p>
              </div>
              <button 
                onClick={() => setSelectedCategory(null)}
                className="w-10 h-10 rounded-full bg-surface-3 flex items-center justify-center text-text-muted"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button 
                onClick={() => markCategoryCompleted(selectedCategory)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-brand-500/5 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-400 flex items-center justify-center">
                  <CheckCircle2 size={18} />
                </div>
                <span className="font-semibold text-text-primary">Oznacz wszystkie jako kupione</span>
              </button>

              <div className="h-px bg-border my-2 mx-4" />

              <button 
                onClick={() => deleteCategoryItems(selectedCategory)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-red-500/10 text-red-400 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <Trash2 size={18} />
                </div>
                <span className="font-semibold">Usuń całą kategorię</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
