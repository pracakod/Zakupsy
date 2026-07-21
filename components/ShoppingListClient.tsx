"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { ShoppingList, Item } from "@/types";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, X, Loader2, ShoppingBag, Share2, UserPlus, Edit2, Trash2, CheckCircle2, Circle, CircleOff, ChevronDown, Archive, MoreVertical, Users, Trash, Camera, Barcode, ShieldCheck, AlertCircle, Leaf, Zap, Info } from "lucide-react";
import ListItem from "./ListItem";
import AnimalAvatar, { AnimalType } from "./AnimalAvatar";

import { useToast } from "@/lib/ToastContext";
import { getProductIcon } from "@/lib/productIcons";
import { dataCache } from "@/lib/DataCache";

export default function ShoppingListClient({
  list,
  initialItems,
  user,
}: {
  list: ShoppingList;
  initialItems: Item[];
  user: User;
}) {
  const [items, setItems] = useState<Item[]>(() => {
    // Prioritize cached data for instant feel
    if (typeof window !== "undefined") {
      const cached = dataCache.get<Item[]>(`list_items_${list.id}`);
      if (cached) return cached;
    }
    return initialItems;
  });

  const renderAvatar = (url: string | null, seed: string, size = 24) => {
    if (url?.startsWith("animal:")) {
      const parts = url.split(":");
      return (
        <AnimalAvatar
          type={parts[1] as AnimalType}
          variant={parseInt(parts[2])}
          colorIndex={parseInt(parts[3])}
          size={size}
        />
      );
    }
    if (url?.startsWith("panda:")) {
      const parts = url.split(":");
      return (
        <AnimalAvatar type="panda" variant={parseInt(parts[1])} colorIndex={parseInt(parts[2])} size={size} />
      );
    }
    return <AnimalAvatar seed={seed} size={size} />;
  };
  const [newItemName, setNewItemName] = useState("");
  const [newItemBrand, setNewItemBrand] = useState("");
  const [adding, setAdding] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [showCategories, setShowCategories] = useState(false);
  const [lastAddTime, setLastAddTime] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<any>(null);
  const [searchingBarcode, setSearchingBarcode] = useState<string | null>(null);
  const [notFoundBarcode, setNotFoundBarcode] = useState<string | null>(null);
  const scannerRef = useRef<any>(null);
  const undoTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
  
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [updating, setUpdating] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);

  const [supabase] = useState(() => createClient());
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
    // We try to join with profiles to see who added what
    const { data } = await supabase
      .from("items")
      .select(`
        *,
        author:profiles(username)
      `)
      .eq("list_id", list.id)
      .order("created_at", { ascending: true });
    
    if (data) {
      setItems(data);
      dataCache.set(`list_items_${list.id}`, data);
    }
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

  const fetchFriends = useCallback(async () => {
    const { data: acc } = await supabase
      .from("friend_requests")
      .select("*, sender:profiles!sender_id(*)")
      .or(`sender_id.eq.${user.id},receiver_email.eq.${user.email}`)
      .eq("status", "accepted");

    if (acc) {
      const friendsList = await Promise.all(acc.map(async (req) => {
        if (req.sender_id === user.id) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("*")
            .eq("email", req.receiver_email)
            .single();
          return prof;
        } else {
          return req.sender;
        }
      }));
      setFriends(friendsList.filter(f => f !== null));
    }
  }, [supabase, user.id, user.email]);

  const startScanner = async () => {
    // Clear previous state
    setScannedProduct(null);
    setNotFoundBarcode(null);
    setSearchingBarcode(null);
    
    setIsScanning(true);
    setTimeout(async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const html5QrCode = new Html5Qrcode("product-scanner");
        scannerRef.current = html5QrCode;

        const config = { 
          fps: 10, 
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.0
        };

        await html5QrCode.start(
          { facingMode: "environment" }, 
          config,
          async (decodedText) => {
            handleBarcodeScanned(decodedText);
          },
          undefined
        );
      } catch (err: any) {
        console.error("Scanner error:", err);
        showToast("Nie udało się uruchomić aparatu.", "error");
        setIsScanning(false);
      }
    }, 300);
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch (err) {
        console.error("Stop scanner error:", err);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
    setScannedProduct(null);
    setSearchingBarcode(null);
    setNotFoundBarcode(null);
  };

  const handleBarcodeScanned = async (barcode: string) => {
    // 1. Prevent duplicate fetches for the same code while searching
    if (searchingBarcode === barcode) return;
    if (scannedProduct && scannedProduct._id === barcode) return;
    if (notFoundBarcode === barcode) return;
    
    setSearchingBarcode(barcode);
    setNotFoundBarcode(null); // Clear previous failure state when starting new search
    showToast("Przeszukiwanie bazy produktów...", "info");
    
    try {
      // 2. Check local community database first
      const { data: localProduct } = await supabase
        .from('custom_products')
        .select('*')
        .eq('barcode', barcode)
        .single();
      
      if (localProduct) {
        setScannedProduct({
          _id: localProduct.barcode,
          product_name: localProduct.name || "Produkt bez nazwy",
          name: localProduct.name,
          brands: localProduct.brand,
          brand: localProduct.brand,
          image_url: localProduct.image_url,
          is_local: true
        });
        if (scannerRef.current) await scannerRef.current.stop();
        showToast("Znaleziono w bazie Zakupsy!", "success");
        return;
      }

      // 3. Check Open Food Facts
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
      const data = await res.json();

      if (data.status === 1 && data.product) {
        setScannedProduct(data.product);
        if (scannerRef.current) {
            await scannerRef.current.stop();
        }
        showToast("Znaleziono produkt!", "success");
      } else {
        // Not found - stay in modal but show manual entry
        setNotFoundBarcode(barcode);
        if (scannerRef.current) {
            await scannerRef.current.stop();
        }
      }
    } catch (err) {
      console.error("Lookup error:", err);
      // Fallback to manual if API fails
      setNotFoundBarcode(barcode);
      if (scannerRef.current) await scannerRef.current.stop();
    } finally {
      setSearchingBarcode(null);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchParticipants();
    fetchFriends();
  }, [fetchItems, fetchParticipants, fetchFriends]);

  useEffect(() => {
    console.log(`[Realtime] Initializing subscription for list: ${list.id}`);
    
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
        (payload) => {
          console.log("[Realtime] Change detected:", payload);
          fetchItems();
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] Subscription status for list ${list.id}:`, status);
        if (status === 'SUBSCRIBED') {
          // Double check items once subscribed to ensure we didn't miss anything during transition
          fetchItems();
        }
      });

    return () => { 
      console.log(`[Realtime] Cleaning up subscription for list: ${list.id}`);
      supabase.removeChannel(channel); 
    };
  }, [supabase, list.id, fetchItems]);

  async function addItem(e?: React.FormEvent, customItem?: string) {
    if (e) e.preventDefault();
    const itemName = customItem || newItemName;
    if (!itemName.trim()) return;

    // Rate limiting
    const now = Date.now();
    if (now - lastAddTime < 1000) {
      showToast("Zwolnij! Nie dodawaj produktów tak szybko.", "info");
      return;
    }

    // Auto-assign icon
    const smartIcon = getProductIcon(itemName);

    // Duplicate check
    const isDuplicate = items.find(
      (item) => item.name.toLowerCase() === itemName.trim().toLowerCase() && item.status === "pending"
    );

    if (isDuplicate) {
      showToast(`"${itemName}" jest już na liście!`, "info");
      setNewItemName("");
      return;
    }

    setAdding(true);
    setLastAddTime(now);
    setNewItemName("");

    // Create optimistic item
    const optimisticItem: Item = {
      id: `temp-${now}`,
      name: itemName.trim(),
      list_id: list.id,
      user_id: user.id,
      status: 'pending',
      category: selectedCategory || 'Inne',
      icon: smartIcon || undefined,
      is_completed: false,
      created_at: new Date().toISOString()
    };

    setItems(prev => [...prev, optimisticItem]);
    
    const { data, error } = await supabase
      .from("items")
      .insert({
        name: itemName.trim(),
        list_id: list.id,
        user_id: user.id,
        category: selectedCategory || "Inne",
        icon: smartIcon,
        status: "pending"
      })
      .select("*")
      .single();

    if (!error && data) {
      // Replace optimistic item with real data
      setItems(prev => prev.map(i => i.id === optimisticItem.id ? data : i));
    } else {
      // Revert on error
      setItems(prev => prev.filter(i => i.id !== optimisticItem.id));
      showToast("Błąd podczas dodawania", "error");
    }
    setAdding(false);
  }

  async function clearAllItems() {
    // Only owner can clear all items
    if (list.user_id !== user.id) {
      showToast("Tylko właściciel może wyczyścić listę", "error");
      return;
    }
    const { error } = await supabase
      .from("items")
      .delete()
      .eq("list_id", list.id);
    
    if (!error) {
      setItems([]);
      showToast("Lista została wyczyszczona", "success");
    } else {
      showToast("Błąd podczas czyszczenia listy", "error");
    }
  }

  async function toggleItem(item: Item) {
    const nextStatus = item.status === 'completed' ? 'pending' : 'completed';
    const originalStatus = item.status;
    const originalCompleted = item.is_completed;

    // 1. Optimistic update
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, status: nextStatus, is_completed: nextStatus === 'completed' } : i));

    // 2. Background update
    const { error } = await supabase
      .from("items")
      .update({ 
        status: nextStatus,
        is_completed: nextStatus === 'completed'
      })
      .eq("id", item.id);

    if (error) {
      // 3. Revert on error
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, status: originalStatus, is_completed: originalCompleted } : i));
      showToast("Nie udało się zaktualizować przedmiotu", "error");
    }
  }

  async function setStatus(item: Item, status: 'pending' | 'completed' | 'missing') {
    const originalStatus = item.status;
    const originalCompleted = item.is_completed;

    // 1. Optimistic update
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, status, is_completed: status === 'completed' } : i));
    setSelectedItem(null);

    // 2. Background update
    const { error } = await supabase
      .from("items")
      .update({ 
        status,
        is_completed: status === 'completed'
      })
      .eq("id", item.id);

    if (error) {
      // 3. Revert on error
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, status: originalStatus, is_completed: originalCompleted } : i));
      showToast("Błąd statusu", "error");
    }
  }

  async function performDelete(id: string) {
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) {
      showToast("Błąd podczas usuwania", "error");
      fetchItems(); // Restore state if server fails
    }
  }

  function deleteItem(id: string) {
    const itemToDelete = items.find(i => i.id === id);
    if (!itemToDelete) return;

    // 1. Optimistically remove from state
    setItems(prev => prev.filter(i => i.id !== id));
    setSelectedItem(null);

    // 2. Set timeout for actual deletion
    const timeout = setTimeout(() => {
      performDelete(id);
      delete undoTimeouts.current[id];
    }, 4500);

    // 3. Store timeout for potential cancellation
    undoTimeouts.current[id] = timeout;

    // 4. Show toast with Undo action
    showToast(`Usunięto: ${itemToDelete.name}`, 'info', {
      label: 'Cofnij',
      onClick: () => {
        if (undoTimeouts.current[id]) {
          clearTimeout(undoTimeouts.current[id]);
          delete undoTimeouts.current[id];
          // Restore item
          setItems(prev => {
            const newItems = [...prev, itemToDelete];
            return newItems.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          });
        }
      }
    });
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
  
  function openEditModal(item: Item) {
    setEditingItem(item);
    setEditName(item.name);
    setEditIcon(item.icon || "");
    setSelectedItem(null);
  }

  async function updateItemDetails() {
    if (!editingItem || !editName.trim()) return;
    
    setUpdating(true);
    const { error } = await supabase
      .from("items")
      .update({ 
        name: editName.trim(),
        icon: editIcon || null
      })
      .eq("id", editingItem.id);
    
    if (error) {
      showToast("Błąd aktualizacji", "error");
    } else {
      showToast("Zaktualizowano produkt", "success");
      setItems(prev => prev.map(i => i.id === editingItem.id ? { ...i, name: editName.trim(), icon: editIcon || undefined } : i));
    }
    setUpdating(false);
    setEditingItem(null);
  }

  async function renameItem(id: string, currentName: string) {
    // This is now replaced by openEditModal, but keeping as bridge if needed
    const item = items.find(i => i.id === id);
    if (item) openEditModal(item);
  }

  return (
    <div
      className="min-h-dvh flex flex-col w-full"
      style={{ background: "var(--color-surface)" }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-50 px-5 pt-4 pb-4 transition-all duration-300 glass-header border-b border-border"
      >
        <div className="flex items-center justify-between gap-4 mb-2">
          <button
            onClick={() => router.push("/lists")}
            className="w-10 h-10 rounded-full bg-surface-2 border border-border flex items-center justify-center text-brand-400 hover:bg-surface-3 transition-all active:scale-90 cursor-pointer"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex-1 min-w-0 text-center">
            <h1
              className="text-lg font-bold truncate tracking-tight text-text-primary"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {list.name}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
               onClick={() => setShowMenu(!showMenu)}
               className={`w-10 h-10 rounded-full border border-border flex items-center justify-center transition-all cursor-pointer ${showMenu ? 'bg-brand-500 text-white border-brand-500 shadow-lg shadow-brand-500/20' : 'bg-surface-2 text-muted hover:bg-surface-3'}`}
            >
              <MoreVertical size={20} />
            </button>
          </div>
        </div>

        {/* Participant Avatars below title */}
        <div className="flex justify-center -space-x-2 mt-2">
          {participants.slice(0, 5).map((p, idx) => (
            <div 
              key={p.id} 
              className="w-7 h-7 rounded-full border-2 border-[var(--color-surface)] shadow-md overflow-hidden"
              style={{ zIndex: 10 - idx }}
            >
              {renderAvatar(p.avatar_url, p.email, 28)}
            </div>
          ))}
          {participants.length > 5 && (
            <div className="w-7 h-7 rounded-full bg-surface-3 border-2 border-[var(--color-surface)] flex items-center justify-center text-[8px] font-black text-muted shadow-md z-0">
              +{participants.length - 5}
            </div>
          )}
        </div>

        {/* Dropdown Menu */}
        {showMenu && (
          <div className="absolute right-5 top-16 z-[100] w-64 glass-card rounded-[2rem] p-3 shadow-2xl animate-pop-in border border-white/5">
            <div className="space-y-1">
              <button 
                onClick={() => { setShowCategories(!showCategories); setShowMenu(false); }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-colors text-left group"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${showCategories ? 'bg-brand-500 text-white' : 'bg-brand-500/10 text-brand-400 group-hover:bg-brand-500/20'}`}>
                  <Archive size={18} />
                </div>
                <div className="flex-1">
                  <span className="font-bold block text-sm">{showCategories ? 'Widok prosty' : 'Kategorie'}</span>
                  <span className="text-[10px] text-muted opacity-60">Grupowanie produktów</span>
                </div>
              </button>

              <button 
                onClick={() => { setShowShare(true); setShowMenu(false); }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-colors text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                  <UserPlus size={18} />
                </div>
                <div className="flex-1">
                  <span className="font-bold block text-sm">Zaproś kogoś</span>
                  <span className="text-[10px] text-muted opacity-60">Udostępnij tę listę</span>
                </div>
              </button>

              <button 
                onClick={() => { setShowParticipantsModal(true); setShowMenu(false); }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-colors text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                  <Users size={18} />
                </div>
                <div className="flex-1">
                  <span className="font-bold block text-sm">Uczestnicy</span>
                  <span className="text-[10px] text-muted opacity-60">{participants.length} osób na liście</span>
                </div>
              </button>

              <div className="h-px bg-white/5 my-2 mx-2" />

              <button 
                onClick={() => { setShowClearConfirm(true); setShowMenu(false); }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-red-500/10 text-red-400 transition-colors text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                  <Trash size={18} />
                </div>
                <div className="flex-1">
                  <span className="font-bold block text-sm">Wyczyść listę</span>
                  <span className="text-[10px] text-red-500/60 font-bold uppercase tracking-widest">Usuń wszystko</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Backdrop for closing menu */}
        {showMenu && <div className="fixed inset-0 z-[90]" onClick={() => setShowMenu(false)} />}

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
                className="flex-1 bg-surface-3 border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-500 text-text-primary"
              />
              <button
                type="submit"
                disabled={inviting || !inviteEmail}
                className="px-3 py-2 rounded-xl gradient-brand text-white text-xs font-bold disabled:opacity-50"
              >
                {inviting ? <Loader2 size={14} className="animate-spin" /> : "Wyślij"}
              </button>
            </form>

            {/* Quick Friends Select */}
            {friends.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border/30">
                <p className="text-[9px] font-black uppercase text-muted mb-3 px-1 tracking-widest opacity-60">Twoi znajomi</p>
                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar custom-scrollbar">
                  {friends.map((friend) => (
                    <button
                      key={friend.id}
                      onClick={async () => {
                        setInviting(true);
                        const { error } = await supabase
                          .from("list_shares")
                          .insert({ 
                            list_id: list.id, 
                            user_id: friend.id, 
                            invited_by: user.id 
                          });
                        if (!error) {
                          showToast(`Udostępniono dla ${friend.username}!`, "success");
                          setShowShare(false);
                          fetchParticipants();
                        } else {
                          showToast("Już udostępniono lub błąd", "error");
                        }
                        setInviting(false);
                      }}
                      className="flex flex-col items-center gap-2 shrink-0 group active:scale-95 transition-all"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-surface-3 border border-border group-hover:border-brand-500/50 flex items-center justify-center text-brand-400 font-bold shadow-sm">
                        {renderAvatar(friend.avatar_url, friend.email, 32)}
                      </div>
                      <span className="text-[10px] font-bold truncate max-w-[50px]">{friend.username || friend.email.split('@')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}


        {/* Compact Quick Add */}
        <div className="mt-4 px-1">
          <div className="flex gap-2">
            <form onSubmit={addItem} className="relative group flex-1">
              <div className="relative flex items-center">
                <input 
                  type="text"
                  placeholder="Dodaj produkt..."
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onFocus={() => setShowInput(true)}
                  onBlur={() => !newItemName && setShowInput(false)}
                  className={`w-full bg-surface-2 border border-border/30 rounded-xl px-10 py-2.5 text-xs outline-none transition-all duration-300 ${showInput ? 'bg-surface-3 border-brand-500/30 ring-4 ring-brand-500/5' : 'opacity-60 hover:opacity-100'}`}
                  style={{ color: "var(--color-text-primary)" }}
                />
                
                {/* Intelligent Icon Preview */}
                <div className="absolute left-3.5 flex items-center justify-center pointer-events-none transition-all duration-300">
                  {newItemName ? (
                    <span className="text-sm animate-pop-in">{getProductIcon(newItemName) || "✨"}</span>
                  ) : (
                    <ShoppingBag size={14} className="text-text-muted opacity-40" />
                  )}
                </div>

                <button 
                  type="submit"
                  disabled={adding || !newItemName.trim()}
                  className={`absolute right-1.5 w-7 h-7 rounded-lg gradient-brand text-white flex items-center justify-center transition-all duration-300 ${newItemName.trim() ? 'opacity-100 scale-100' : 'opacity-0 scale-50 pointer-events-none'}`}
                >
                  {adding ? <Loader2 size={12} className="animate-spin" /> : <Plus size={14} strokeWidth={4} />}
                </button>
              </div>
            </form>
            <button 
              onClick={startScanner}
              className="w-10 h-10 rounded-xl bg-surface-2 border border-border/30 flex items-center justify-center text-text-muted hover:text-brand-500 transition-all hover:bg-surface-3 active:scale-90"
            >
              <Camera size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Items */}
      <main className="flex-1 px-5 py-4 pb-32">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="font-semibold mb-1">Lista jest pusta</p>
          </div>
        ) : (
          <>
            {/* Pending Items */}
            {!showCategories ? (
              <div className="grid grid-cols-1 gap-2 animate-fade-in">
                {pending.map((item, i) => (
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
            ) : (
              categories.map(cat => {
                const catItems = pending.filter(i => i.category === cat);
                if (catItems.length === 0) return null;
                const isCollapsed = collapsedCategories.includes(cat);
                
                return (
                  <div key={cat} className="mb-4 animate-fade-in">
                    <div 
                      onClick={() => toggleCategory(cat)}
                      onContextMenu={(e) => { e.preventDefault(); setSelectedCategory(cat); }}
                      className="flex items-center gap-2 mb-2 px-1 cursor-pointer group active:opacity-60 transition-opacity"
                    >
                      <span className="text-[10px] font-black uppercase tracking-[0.15em] text-text-muted/60 group-hover:text-brand-400 transition-colors">
                        {cat} <span className="opacity-30 ml-1">({catItems.length})</span>
                      </span>
                      <div className="flex-1 h-px bg-border/20" />
                      <div className={`transition-transform duration-300 ${isCollapsed ? '-rotate-180' : ''}`}>
                        <ChevronDown size={12} className="text-text-muted/40" />
                      </div>
                    </div>

                    {!isCollapsed && (
                      <div className="grid grid-cols-1 gap-2">
                        {catItems.map((item, i) => (
                          <div
                            key={item.id}
                            className="animate-slide-up"
                            style={{ animationDelay: `${i * 20}ms`, animationFillMode: "both" }}
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
              })
            )}

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
      <div className="h-10 pointer-events-none" />
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
                 onClick={() => openEditModal(selectedItem)}
                 className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-brand-500/5 transition-colors text-left"
               >
                 <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                   <Edit2 size={18} />
                 </div>
                 <span className="font-semibold text-text-primary">Zmień nazwę i ikonkę</span>
               </button>

              <div className="h-px bg-border my-2 mx-4" />

              <button 
                onClick={() => { deleteItem(selectedItem.id); setSelectedItem(null); }}
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
      {/* Clear List Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-6 animate-fade-in" onClick={() => setShowClearConfirm(false)}>
          <div className="w-full max-w-xs bg-surface-2 border border-border rounded-[2.5rem] p-8 shadow-2xl animate-pop-in" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-6">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-bold text-center mb-2 text-text-primary">Wyczyścić listę?</h3>
            <p className="text-sm text-center text-text-muted mb-8 text-balance">Wszystkie produkty z listy "{list.name}" zostaną trwale usunięte.</p>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => { clearAllItems(); setShowClearConfirm(false); }}
                className="w-full py-4 rounded-xl bg-red-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-red-500/20 active:scale-95 transition-all"
              >
                Tak, wyczyść
              </button>
              <button 
                onClick={() => setShowClearConfirm(false)}
                className="w-full py-4 rounded-xl bg-surface-3 text-text-muted font-bold text-sm tracking-wide active:scale-95 transition-all"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Scanner Modal */}
      {isScanning && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-0 sm:p-6 animate-fade-in shadow-2xl">
          <div 
            className={`w-full max-w-xl bg-surface-1 sm:rounded-[3rem] shadow-2xl animate-pop-in relative overflow-hidden flex flex-col transition-all duration-500 ${scannedProduct ? 'h-full sm:h-[85vh]' : 'pt-8 rounded-[3rem]'}`}
            onClick={e => e.stopPropagation()}
          >
             {/* Header */}
             <div className="px-8 flex items-center justify-between py-6 bg-surface-1/50 backdrop-blur-md sticky top-0 z-50">
                <div>
                   <h2 className="text-xl font-black tracking-tight flex items-center gap-3">
                      <Barcode className="text-brand-500" />
                      {scannedProduct ? 'Analiza Produktu' : 'Skaner'}
                   </h2>
                </div>
                <button 
                  onClick={stopScanner} 
                  className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center text-text-muted hover:text-red-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center">
                 {scannedProduct ? (
                    <div className="w-full p-8 animate-slide-up flex flex-col gap-8 pb-32">
                       {/* Product identity */}
                       <div className="flex items-center gap-6">
                         {scannedProduct.image_url ? (
                           <img 
                             src={scannedProduct.image_url} 
                             alt={scannedProduct.product_name} 
                             className="w-24 h-24 object-contain bg-white rounded-2xl p-2 border border-border/50" 
                           />
                         ) : (
                           <div className="w-24 h-24 bg-surface-2 rounded-2xl flex items-center justify-center text-text-muted border border-border/50">
                             <ShoppingBag size={40} strokeWidth={1} />
                           </div>
                         )}
                          <div className="flex-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-brand-500 mb-1">
                              {scannedProduct.is_local ? "Produkt lokalny / Społeczność" : (scannedProduct.brands || "Marka nieznana")}
                            </p>
                            <h3 className="text-2xl font-black leading-tight tracking-tight text-text-primary">
                              {scannedProduct.product_name || scannedProduct.name || scannedProduct.product_name_pl || "Bez nazwy"}
                            </h3>
                            {scannedProduct.is_local && scannedProduct.brands && (
                              <p className="text-xs text-text-muted mt-1 font-bold italic">Producent: {scannedProduct.brands}</p>
                            )}
                            <p className="text-xs text-text-muted mt-2 font-mono font-bold">{scannedProduct.quantity || scannedProduct._id}</p>
                          </div>
                       </div>

                       {/* Diagnostic Scores - Only show for OFF products */}
                       {!scannedProduct.is_local ? (
                         <div className="grid grid-cols-2 gap-4">
                           {/* Nutri-Score */}
                           <div className="bg-surface-2/50 border border-border/50 p-4 rounded-3xl flex flex-col items-center text-center gap-3 overflow-hidden">
                             <p className="text-[9px] font-black uppercase tracking-widest text-text-muted">Nutri-Score</p>
                             <div className="flex items-center justify-center w-full max-w-[140px]">
                               {['a', 'b', 'c', 'd', 'e'].map((grade) => (
                                 <div 
                                   key={grade}
                                   className={`flex-1 h-7 flex items-center justify-center text-[10px] font-black uppercase transition-all first:rounded-l-lg last:rounded-r-lg
                                     ${scannedProduct.nutriscore_grade === grade 
                                       ? `scale-110 shadow-lg z-10 ${
                                           grade === 'a' ? 'bg-green-600 text-white' : 
                                           grade === 'b' ? 'bg-green-400 text-white' : 
                                           grade === 'c' ? 'bg-yellow-400 text-black' : 
                                           grade === 'd' ? 'bg-orange-500 text-white' : 'bg-red-600 text-white'
                                         }` 
                                       : 'opacity-10 bg-white/10'
                                     }`}
                                 >
                                   {grade}
                                 </div>
                               ))}
                             </div>
                             <p className="text-[10px] font-bold text-text-secondary">Wartość odżywcza</p>
                           </div>

                           {/* Nova Group */}
                           <div className="bg-surface-2/50 border border-border/50 p-4 rounded-3xl flex flex-col items-center text-center gap-3">
                             <p className="text-[9px] font-black uppercase tracking-widest text-text-muted">Przetworzenie</p>
                             <div className="flex gap-1.5">
                               {[1, 2, 3, 4].map((group) => (
                                 <div 
                                   key={group}
                                   className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black
                                     ${scannedProduct.nova_group === group 
                                       ? `scale-125 shadow-lg z-10 ${
                                           group === 1 ? 'bg-green-500 text-white' : 
                                           group === 2 ? 'bg-yellow-500 text-black' : 
                                           group === 3 ? 'bg-orange-500 text-white' : 'bg-red-600 text-white'
                                         }` 
                                       : 'bg-white/5 opacity-30 translate-y-0.5'
                                     }`}
                                 >
                                   {group}
                                 </div>
                               ))}
                             </div>
                             <p className="text-[10px] font-bold text-text-secondary">Przetworzenie NOVA</p>
                           </div>
                         </div>
                       ) : (
                         <div className="bg-brand-500/10 border border-brand-500/20 rounded-3xl p-6 flex items-center gap-4">
                           <div className="w-12 h-12 rounded-2xl bg-brand-500 text-white flex items-center justify-center flex-shrink-0 shadow-[0_8px_20px_rgba(34,197,94,0.3)]">
                             <Users size={24} />
                           </div>
                           <div>
                             <p className="text-xs font-black uppercase tracking-widest text-brand-500">Baza Społeczności</p>
                             <p className="text-[11px] font-bold text-text-primary leading-relaxed mt-1">Ten produkt został dodany przez użytkownika Zakupsów. Brak oficjalnych danych o składzie.</p>
                           </div>
                         </div>
                       )}

                       {/* Ingredients & Flags - Only show if data exists */}
                       {!scannedProduct.is_local && (
                         <div className="bg-surface-2/30 border border-border/30 rounded-3xl p-6 space-y-4">
                          <div className="flex items-center gap-4">
                             <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${scannedProduct.nova_group > 2 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                                {scannedProduct.nova_group > 2 ? <AlertCircle size={20} /> : <ShieldCheck size={20} />}
                             </div>
                             <div className="flex-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-0.5">Analiza</p>
                                <p className="text-xs font-bold leading-relaxed">
                                   {scannedProduct.nova_group === 4 
                                     ? "Ten produkt jest wysokoprzetworzony (UPF). Może zawierać dodatki chemiczne." 
                                     : scannedProduct.nova_group === 3 
                                     ? "Produkt przetworzony. Zalecane spożycie z umiarem."
                                     : "Produkt naturalny lub minimalnie przetworzony. Dobry wybór!"}
                                </p>
                             </div>
                          </div>

                          {scannedProduct.ingredients_text && (
                            <div className="pt-4 border-t border-white/5">
                               <p className="text-[9px] font-black uppercase tracking-widest text-text-muted mb-2">Składniki</p>
                               <p className="text-[10px] text-text-secondary line-clamp-3 leading-relaxed italic">{scannedProduct.ingredients_text}</p>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2 pt-2">
                            {scannedProduct.additives_n > 0 && (
                              <div className="bg-red-500/10 text-red-500 px-3 py-1.5 rounded-lg flex items-center gap-2">
                                 <AlertCircle size={10} />
                                 <span className="text-[9px] font-black uppercase tracking-widest">{scannedProduct.additives_n} dodatków</span>
                              </div>
                            )}
                            {scannedProduct.allergens && (
                              <div className="bg-orange-500/10 text-orange-400 px-3 py-1.5 rounded-lg flex items-center gap-2">
                                 <Info size={10} />
                                 <span className="text-[9px] font-black uppercase tracking-widest">Alergeny</span>
                              </div>
                            )}
                            {scannedProduct.labels?.includes('bio') && (
                              <div className="bg-green-500/10 text-green-400 px-3 py-1.5 rounded-lg flex items-center gap-2">
                                 <Leaf size={10} />
                                 <span className="text-[9px] font-black uppercase tracking-widest">BIO / Organic</span>
                              </div>
                            )}
                          </div>
                       </div>
                    )}

                       {/* Footer Actions */}
                       <div className="sticky bottom-0 bg-surface-1 pt-4 pb-0 flex flex-col gap-3">
                          <button 
                             onClick={() => {
                               addItem(undefined, `${scannedProduct.product_name}${scannedProduct.brands ? ` (${scannedProduct.brands})` : ''}`);
                               stopScanner();
                             }}
                             className="w-full py-5 rounded-[2rem] gradient-brand text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-brand-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                          >
                             <Plus size={18} strokeWidth={3} />
                             Dodaj do listy
                          </button>
                          <button 
                             onClick={() => setScannedProduct(null)}
                             className="w-full py-4 rounded-2xl bg-surface-2 text-text-muted font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all text-center"
                          >
                             Zeskanuj inny produkt
                          </button>
                       </div>
                    </div>
                 ) : notFoundBarcode ? (
                   <div className="w-full p-8 animate-slide-up flex flex-col gap-8">
                      <div className="flex flex-col items-center text-center gap-6">
                        <div className="w-20 h-20 rounded-3xl bg-surface-2 border border-border/50 flex items-center justify-center text-orange-500 mb-2">
                           <AlertCircle size={40} strokeWidth={1.5} />
                        </div>
                        <div>
                           <h3 className="text-2xl font-black text-text-primary">Nie znaleźliśmy tego produktu</h3>
                           <p className="text-xs text-text-muted mt-2">Kodu <span className="font-mono text-brand-500">{notFoundBarcode}</span> nie ma w bazie. Możesz go dodać dla innych!</p>
                        </div>

                        <div className="w-full space-y-4">
                           <div className="grid grid-cols-2 gap-3 text-left">
                              <div className="flex flex-col gap-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-text-muted px-1">Marka (opcjonalnie)</label>
                                <input 
                                  type="text" 
                                  placeholder="Np. Żywiec"
                                  value={newItemBrand || ''}
                                  onChange={(e) => setNewItemBrand(e.target.value)}
                                  className="w-full bg-surface-2 border border-border/50 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-brand-500 transition-all text-text-primary"
                                />
                              </div>
                              <div className="flex flex-col gap-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-text-muted px-1">Nazwa produktu</label>
                                <input 
                                  autoFocus
                                  type="text" 
                                  placeholder="Np. Woda 1.5L"
                                  value={newItemName}
                                  onChange={(e) => setNewItemName(e.target.value)}
                                  className="w-full bg-surface-2 border border-border/50 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-brand-500 transition-all text-text-primary"
                                />
                              </div>
                           </div>

                           <button 
                              onClick={async () => {
                                if (!newItemName.trim()) {
                                  showToast("Wpisz nazwę produktu", "info");
                                  return;
                                }
                                
                                // Save to local community database
                                await supabase.from('custom_products').insert({
                                  barcode: notFoundBarcode,
                                  name: newItemName.trim(),
                                  brand: newItemBrand?.trim() || null
                                });

                                addItem(undefined, newItemBrand ? `${newItemName.trim()} (${newItemBrand.trim()})` : newItemName.trim());
                                stopScanner();
                              }}
                              className="w-full py-5 rounded-[2rem] gradient-brand text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-brand-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                           >
                              <Plus size={18} strokeWidth={3} />
                              Dodaj do bazy i listy
                           </button>
                           
                           <button 
                              onClick={() => {
                                setNotFoundBarcode(null);
                                startScanner();
                              }}
                              className="w-full py-4 rounded-2xl bg-surface-2 text-text-muted font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all text-center"
                           >
                              Zeskanuj inny produkt
                           </button>
                        </div>
                      </div>
                   </div>
                 ) : (
                    <div className="flex flex-col items-center gap-8 py-4 px-8 w-full">
                       <div className="relative w-full aspect-square max-w-[320px] rounded-[3rem] overflow-hidden border-4 border-brand-500/20 shadow-2xl bg-black">
                          <div id="product-scanner" className="w-full h-full" />
                          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-brand-500 to-transparent animate-scan-line z-20" />
                          <div className="absolute inset-0 border-[30px] border-black/50 pointer-events-none z-10" />
                       </div>
                       
                       <div className="text-center">
                          <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-500 animate-pulse mb-2">Szukam produktu...</p>
                          <p className="text-[10px] text-text-muted font-bold max-w-[200px] leading-relaxed">System automatycznie pobierze nazwę i szczegóły z bazy Open Food Facts.</p>
                       </div>

                       <button 
                         onClick={stopScanner}
                         className="px-10 py-5 rounded-2xl bg-surface-2 font-black text-[10px] uppercase tracking-widest text-text-muted active:scale-95 transition-all flex items-center gap-2"
                       >
                         <X size={16} />
                         <span>Anuluj</span>
                       </button>
                    </div>
                 )}
              </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
    {editingItem && (
      <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-6 animate-fade-in" onClick={() => setEditingItem(null)}>
        <div 
          className="w-full max-w-sm bg-surface-1 border border-white/10 rounded-[3rem] p-8 shadow-2xl animate-pop-in flex flex-col gap-6"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black tracking-tight flex items-center gap-3 italic">
              <Edit2 className="text-brand-500" size={20} />
              Edytuj produkt
            </h3>
            <button 
              onClick={() => setEditingItem(null)}
              className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center text-text-muted hover:text-red-500 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-6">
            <div className="flex flex-col gap-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-brand-500 px-1">Nazwa produktu</label>
              <div className="relative flex items-center">
                <div className="absolute left-4 text-xl">
                  {editIcon || getProductIcon(editName) || "📦"}
                </div>
                <input 
                  autoFocus
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-surface-2 border border-white/20 rounded-2xl pl-12 pr-5 py-4 font-bold outline-none focus:border-brand-500 transition-all text-text-primary shadow-inner"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-brand-500 px-1">Wybierz ikonkę</label>
              <div className="grid grid-cols-6 gap-2 bg-surface-2/50 p-4 rounded-3xl border border-border/20 max-h-[160px] overflow-y-auto custom-scrollbar">
                {["🍎", "🥦", "🥛", "🥩", "🍞", "🍝", "💧", "🧻", "🧼", "🧺", "🥚", "🧀", "🍗", "🐟", "🥖", "🥐", "🍪", "🍕", "🍟", "🥤", "🍺", "🍷", "☕", "🍯", "🥗", "🍣", "🍦", "🍫", "🔋", "💡"].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setEditIcon(emoji)}
                    className={`w-10 h-10 flex items-center justify-center text-xl rounded-xl transition-all hover:scale-125 hover:bg-white/5 ${editIcon === emoji ? 'bg-brand-500 shadow-lg scale-110' : ''}`}
                  >
                    {emoji}
                  </button>
                ))}
                <button
                  onClick={() => setEditIcon("")}
                  className={`w-10 h-10 flex items-center justify-center text-xs rounded-xl transition-all hover:bg-white/5 border border-dashed border-border/40 ${!editIcon ? 'bg-surface-3 text-brand-400 border-brand-500/50' : 'text-text-muted'}`}
                >
                  Auto
                </button>
              </div>
            </div>

            <button 
              onClick={updateItemDetails}
              disabled={updating || !editName.trim()}
              className="w-full py-5 rounded-[2rem] gradient-brand text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-brand-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {updating ? <Loader2 className="animate-spin" size={18} /> : (
                <>
                  <CheckCircle2 size={18} strokeWidth={3} />
                  Zapisz zmiany
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Participants Modal */}
      {showParticipantsModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-6 animate-fade-in" onClick={() => setShowParticipantsModal(false)}>
          <div className="w-full max-w-sm bg-surface-2 border border-border rounded-[2.5rem] p-8 shadow-2xl animate-pop-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold flex items-center gap-3">
                <Users size={20} className="text-brand-400" />
                Uczestnicy
              </h3>
              <button onClick={() => setShowParticipantsModal(false)} className="p-2 rounded-full bg-surface-3 text-muted">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar pt-3 px-2">
              {participants.map((p) => (
                <div key={p.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="relative flex-shrink-0">
                      {renderAvatar(p.avatar_url, p.email, 40)}
                      {p.is_owner && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-surface-1 border-2 border-yellow-500 shadow-xl flex items-center justify-center text-[11px] z-20 animate-bounce-subtle">
                          👑
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-text-primary">{p.username || p.email.split('@')[0]}</p>
                      <p className="text-[10px] text-muted">{p.is_owner ? 'Założyciel listy' : 'Współpracownik'}</p>
                    </div>
                  </div>
                  {!p.is_owner && user.id === list.user_id && (
                    <button 
                      onClick={async () => {
                        if (!confirm(`Usunąć ${p.username || p.email.split('@')[0]} z listy?`)) return;
                        const { error } = await supabase
                          .from("list_shares")
                          .delete()
                          .eq("list_id", list.id)
                          .eq("user_id", p.id);
                        if (!error) {
                          showToast("Usunięto uczestnika", "success");
                          setParticipants(prev => prev.filter(x => x.id !== p.id));
                        } else {
                          showToast("Błąd usuwania uczestnika", "error");
                        }
                      }}
                      className="p-2 rounded-lg bg-red-500/5 text-red-500/40 hover:text-red-500 transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button 
              onClick={() => { setShowParticipantsModal(false); setShowShare(true); }}
              className="w-full mt-8 py-4 rounded-2xl bg-brand-500/10 text-brand-400 font-bold text-sm hover:bg-brand-500/20 transition-all border border-brand-500/10"
            >
              + Zaproś nową osobę
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
