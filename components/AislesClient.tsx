"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { 
  Plus, 
  ArrowLeft,
  Zap,
  Package,
  CheckSquare,
  ListTodo
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/ToastContext";
import ListIcon from "./ListIcon";
import ListPicker from "./ListPicker";

const AISLES = [
  { 
    id: "fruits", 
    name: "Owoce", 
    icon: "🍎", 
    items: [
      { name: "Jabłka", icon: "🍎" },
      { name: "Banany", icon: "🍌" },
      { name: "Pomarańcze", icon: "🍊" },
      { name: "Winogrona", icon: "🍇" },
      { name: "Truskawki", icon: "🍓" },
      { name: "Arbuz", icon: "🍉" },
      { name: "Cytryny", icon: "🍋" },
      { name: "Kiwi", icon: "🥝" },
      { name: "Borówki", icon: "🫐" },
      { name: "Brzoskwinie", icon: "🍑" },
      { name: "Ananas", icon: "🍍" }
    ] 
  },
  { 
    id: "bakery", 
    name: "Pieczywo", 
    icon: "🥖", 
    items: [
      { name: "Chleb", icon: "🍞" },
      { name: "Bułki", icon: "🥐" },
      { name: "Pączek", icon: "🍩" },
      { name: "Bagietka", icon: "🥖" },
      { name: "Kajzerki", icon: "🥯" },
      { name: "Chleb tostowy", icon: "🥪" },
      { name: "Tortilla", icon: "🫓" },
      { name: "Drożdżówka", icon: "🧁" }
    ] 
  },
  { 
    id: "veg", 
    name: "Warzywa", 
    icon: "🥦", 
    items: [
      { name: "Ziemniaki", icon: "🥔" },
      { name: "Cebula", icon: "🧅" },
      { name: "Pomidory", icon: "🍅" },
      { name: "Ogórki", icon: "🥒" },
      { name: "Sałata", icon: "🥬" },
      { name: "Marchew", icon: "🥕" },
      { name: "Papryka", icon: "🫑" },
      { name: "Czosnek", icon: "🧄" },
      { name: "Awokado", icon: "🥑" },
      { name: "Cukinia", icon: "🥒" },
      { name: "Rzodkiewka", icon: "Radish" },
      { name: "Pieczarki", icon: "🍄" }
    ] 
  },
  { 
    id: "dairy", 
    name: "Nabiał", 
    icon: "🥛", 
    items: [
      { name: "Mleko", icon: "🥛" },
      { name: "Ser żółty", icon: "🧀" },
      { name: "Jajka", icon: "🥚" },
      { name: "Twaróg", icon: "⚪" },
      { name: "Jogurt", icon: "🍦" },
      { name: "Masło", icon: "🧈" },
      { name: "Śmietana", icon: "🥛" },
      { name: "Feta", icon: "🧀" },
      { name: "Mozzarella", icon: "⚪" }
    ] 
  },
  { 
    id: "meat", 
    name: "Mięso", 
    icon: "🥩", 
    items: [
      { name: "Kurczak", icon: "🍗" },
      { name: "Wołowina", icon: "🥩" },
      { name: "Szynka", icon: "🍖" },
      { name: "Parówki", icon: "🌭" },
      { name: "Boczek", icon: "🥓" },
      { name: "Ryba", icon: "🐟" },
      { name: "Indyk", icon: "🦃" },
      { name: "Kabanosy", icon: "🥢" }
    ] 
  },
  { 
    id: "sweets", 
    name: "Słodycze", 
    icon: "🍫", 
    items: [
      { name: "Czekolada", icon: "🍫" },
      { name: "Ciastka", icon: "🍪" },
      { name: "Żelki", icon: "🍬" },
      { name: "Lody", icon: "🍦" },
      { name: "Chipsy", icon: "🍟" },
      { name: "Paluszki", icon: "🥨" },
      { name: "Baton", icon: "🍫" }
    ] 
  },
  { 
    id: "drinks", 
    name: "Napoje", 
    icon: "🥤", 
    items: [
      { name: "Woda", icon: "💧" },
      { name: "Sok", icon: "🧃" },
      { name: "Cola", icon: "🥤" },
      { name: "Piwo", icon: "🍺" },
      { name: "Wino", icon: "🍷" },
      { name: "Kawa", icon: "☕" },
      { name: "Herbata", icon: "🍵" },
      { name: "Energetyk", icon: "⚡" }
    ] 
  },
  { 
    id: "spices", 
    name: "Przyprawy", 
    icon: "🧂", 
    items: [
      { name: "Sól", icon: "🧂" },
      { name: "Pieprz", icon: "🧂" },
      { name: "Cukier", icon: "🍯" },
      { name: "Olej", icon: "🧪" },
      { name: "Oliwa", icon: "🫒" },
      { name: "Ketchup", icon: "🍅" },
      { name: "Musztarda", icon: "🍯" },
      { name: "Majonez", icon: "⚪" }
    ] 
  },
  { 
    id: "chem", 
    name: "Chemia", 
    icon: "🧼", 
    items: [
      { name: "Mydło", icon: "🧼" },
      { name: "Szampon", icon: "🧴" },
      { name: "Płyn do naczyń", icon: "🧽" },
      { name: "Papier", icon: "🧻" },
      { name: "Worki", icon: "🗑️" },
      { name: "Proszek", icon: "🧺" },
      { name: "Pasta zęby", icon: "🪥" }
    ] 
  }
];

const STARTER_PACK = [
  { name: "Mleko", icon: "🥛" },
  { name: "Chleb", icon: "🍞" },
  { name: "Masło", icon: "🧈" },
  { name: "Jajka", icon: "🥚" },
  { name: "Ser żółty", icon: "🧀" },
  { name: "Woda", icon: "💧" },
  { name: "Jabłka", icon: "🍎" },
  { name: "Cebula", icon: "🧅" },
  { name: "Ziemniaki", icon: "🥔" }
];

export default function AislesClient({ user }: { user: User }) {
  const [selectedAisle, setSelectedAisle] = useState<typeof AISLES[0] | null>(null);
  const [userLists, setUserLists] = useState<{id: string, name: string, icon?: string}[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('cache_shopping_lists');
      return cached ? JSON.parse(cached) : [];
    }
    return [];
  });
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [addingIds, setAddingIds] = useState<string[]>([]);
  const [lastAddTime, setLastAddTime] = useState(0);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [customProductName, setCustomProductName] = useState("");
  const [customProductIcon, setCustomProductIcon] = useState("📦");
  const [showAddAisle, setShowAddAisle] = useState(false);
  const [newAisleName, setNewAisleName] = useState("");
  const [newAisleIcon, setNewAisleIcon] = useState("📦");
  const [userAisles, setUserAisles] = useState<typeof AISLES>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('cache_user_aisles');
      return cached ? JSON.parse(cached) : AISLES;
    }
    return AISLES;
  });
  const [dbCustomAisles, setDbCustomAisles] = useState<any[]>([]);
  const [supabase] = useState(() => createClient());
  const router = useRouter();
  const { showToast } = useToast();

  const fetchData = async () => {
    const [ownListsRes, sharedAccessRes, profileRes] = await Promise.all([
      supabase.from("lists").select("id, name, icon").eq("user_id", user.id).eq("status", "active").order("created_at", { ascending: false }),
      supabase.from("list_shares").select("list:lists(id, name, icon, status)").or(`user_id.eq.${user.id},invited_email.eq.${user.email}`),
      supabase.from("profiles").select("custom_aisles").eq("id", user.id).single()
    ]);

    // Process lists
    const sharedLists = (sharedAccessRes.data || [])
      .map((s: any) => s.list)
      .filter((l: any) => l && l.status === "active");
    const allLists = [...(ownListsRes.data || []), ...sharedLists];
    
    if (allLists.length > 0) {
      setUserLists(allLists);
      localStorage.setItem('cache_shopping_lists', JSON.stringify(allLists));
      const savedActiveListId = localStorage.getItem(`last_list_${user.id}`);
      if (savedActiveListId && allLists.some(l => l.id === savedActiveListId)) {
        setActiveListId(savedActiveListId);
      } else {
        setActiveListId(allLists[0].id);
      }
    }

    // Process custom aisles
    if (profileRes.data?.custom_aisles) {
      const custom = profileRes.data.custom_aisles;
      setDbCustomAisles(custom);
      const combined = [...AISLES, ...custom];
      setUserAisles(combined);
      localStorage.setItem('cache_user_aisles', JSON.stringify(combined));
    }
  };

  const handleActiveListChange = (id: string) => {
    setActiveListId(id);
    localStorage.setItem(`last_list_${user.id}`, id);
  };

  useEffect(() => {
    fetchData();
  }, [user.id]);

  async function addItem(name: string, icon?: string) {
    if (!activeListId) {
      showToast("Najpierw wybierz lub utwórz listę zakupów!", "error");
      router.push("/lists");
      return;
    }

    // 1. Instant Visual Feedback
    setAddingIds(prev => [...prev, name]);
    setLastAddTime(Date.now());

    // 2. Cooldown check
    const now = Date.now();
    if (now - lastAddTime < 300) return;

    try {
      // 3. Background: Check for duplicates (don't block the UI)
      const { data: existingItems } = await supabase
        .from("items")
        .select("id")
        .eq("list_id", activeListId)
        .eq("name", name)
        .eq("status", "pending")
        .limit(1);

      if (existingItems && existingItems.length > 0) {
        showToast(`${name} jest już na liście.`, "info");
        setTimeout(() => {
          setAddingIds(prev => prev.filter(id => id !== name));
        }, 800);
        return;
      }

      // 4. Background: Insert into database
      const { error } = await supabase
        .from("items")
        .insert({ 
          list_id: activeListId, 
          name, 
          icon: icon || "",
          user_id: user.id, 
          category: selectedAisle?.name || 'Inne',
          status: 'pending'
        });

      if (error) throw error;
      
      const listName = userLists.find(l => l.id === activeListId)?.name;
      showToast(`+ ${name}`, "success");
      
      setTimeout(() => {
        setAddingIds(prev => prev.filter(id => id !== name));
      }, 1000);
    } catch (error) {
      console.error("Error:", error);
      showToast("Błąd przy dodawaniu", "error");
      setAddingIds(prev => prev.filter(id => id !== name));
    }
  }

  async function addStarterPack() {
    if (!activeListId) {
      showToast("Utwórz najpierw listę!", "error");
      return;
    }
    const items = STARTER_PACK.map(item => ({ 
      list_id: activeListId, 
      name: item.name, 
      icon: item.icon,
      user_id: user.id, 
      category: 'Podstawowe',
      status: 'pending'
    }));
    const { error } = await supabase.from("items").insert(items);
    if (!error) {
      const listName = userLists.find(l => l.id === activeListId)?.name;
      showToast(`Dodano pakiet startowy do listy "${listName}"!`, "success");
    } else {
      showToast("Wystąpił błąd: " + error.message, "error");
    }
  }

  async function addNewAisle() {
    const newAisle = {
      id: `custom-${Date.now()}`,
      name: newAisleName.trim(),
      icon: newAisleIcon,
      items: []
    };
    
    const updatedCustom = [...dbCustomAisles, newAisle];
    const { error } = await supabase
      .from("profiles")
      .update({ custom_aisles: updatedCustom })
      .eq("id", user.id);

    if (!error) {
      setDbCustomAisles(updatedCustom);
      setUserAisles([...AISLES, ...updatedCustom]);
      setNewAisleName("");
      setShowAddAisle(false);
      showToast(`Dodano alejkę ${newAisle.name}`, "success");
    } else {
      showToast("Błąd zapisu alejki", "error");
    }
  }

  async function addCustomProduct() {
    if (!selectedAisle) return;

    // 1. Add to active list
    await addItem(customProductName.trim(), customProductIcon);
    
    // 2. Persist to profile
    const updatedCustom = dbCustomAisles.map(a => 
      a.id === selectedAisle.id 
        ? { ...a, items: [...a.items, { name: customProductName.trim(), icon: customProductIcon }] }
        : a
    );
    
    const { error } = await supabase
      .from("profiles")
      .update({ custom_aisles: updatedCustom })
      .eq("id", user.id);

    if (!error) {
      setDbCustomAisles(updatedCustom);
      setUserAisles([...AISLES, ...updatedCustom]);
      const currentAisle = updatedCustom.find(a => a.id === selectedAisle.id);
      if (currentAisle) setSelectedAisle(currentAisle);
      showToast("Zapisano produkt w alejce", "success");
    }
    
    setCustomProductName("");
    setShowAddProduct(false);
  }

  if (selectedAisle) {
    return (
      <div className="flex-1 pb-48 animate-fade-in px-6 pt-6 relative">
        {/* Decorative background glows */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <button 
          onClick={() => setSelectedAisle(null)}
          className="p-2 mb-6 -ml-2 text-text-muted hover:text-text-primary transition-colors flex items-center gap-2 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center group-hover:bg-brand-500/10 transition-colors">
            <ArrowLeft size={16} />
          </div>
          <span className="text-sm font-bold uppercase tracking-widest opacity-60">Wróć</span>
        </button>

        <header className="mb-10 relative z-[250] flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-surface-2 border border-border flex items-center justify-center text-4xl shadow-xl shadow-black/10">
              {selectedAisle.icon}
            </div>
            <div className="flex flex-col">
              <h1 className="text-3xl font-black tracking-tight text-text-primary mb-1" style={{ fontFamily: "var(--font-display)" }}>
                {selectedAisle.name}
              </h1>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 rounded-full bg-brand-500" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted opacity-60">Dodaj produkty</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 min-w-[200px]">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted px-1 opacity-60">Lista docelowa</label>
            <ListPicker 
              lists={userLists}
              activeId={activeListId}
              onChange={handleActiveListChange}
            />
          </div>
        </header>

        <div className="grid grid-cols-2 gap-3 relative z-10">
          {selectedAisle.items.map((item) => (
            <button
              key={item.name}
              onClick={() => addItem(item.name, item.icon)}
              className="p-4 rounded-[1.5rem] bg-surface-2/60 backdrop-blur-md border border-border flex flex-col gap-3 active:scale-[0.98] transition-all cursor-pointer hover:border-brand-500/40 group relative overflow-hidden"
            >
              <div className="flex items-start justify-between">
                <span className="text-2xl transition-all group-hover:scale-110 duration-300">{item.icon}</span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${addingIds.includes(item.name) ? 'bg-green-500 text-white scale-110' : 'bg-surface-3 text-brand-400 group-hover:bg-brand-500/20'}`}>
                  {addingIds.includes(item.name) ? <CheckSquare size={16} /> : <Plus size={16} className="opacity-40 group-hover:opacity-100" />}
                </div>
              </div>
              <span className="text-sm font-bold tracking-tight text-left text-text-primary">{item.name}</span>
              
              {/* Subtle card glow */}
              <div className="absolute -right-4 -bottom-4 w-12 h-12 bg-brand-500/5 rounded-full blur-xl group-hover:bg-brand-500/10 transition-colors" />
            </button>
          ))}

          {/* Add custom item card - Premium version */}
          <button
            onClick={() => setShowAddProduct(true)}
            className="p-4 rounded-[1.5rem] border-2 border-dashed border-border flex flex-col items-center justify-center gap-3 active:scale-[0.98] transition-all cursor-pointer opacity-60 hover:opacity-100 hover:border-brand-500/40 hover:bg-brand-500/5"
          >
            <div className="w-10 h-10 rounded-2xl bg-surface-2 flex items-center justify-center text-muted">
              <Plus size={20} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Inny produkt</span>
          </button>
        </div>

        {/* Modal for adding custom product - Premium version */}
        {showAddProduct && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-6 animate-fade-in" onClick={() => setShowAddProduct(false)}>
            <div className="w-full max-w-sm bg-surface-1 border border-border rounded-[2.5rem] p-8 shadow-2xl animate-pop-in" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-black mb-8 text-center text-text-primary uppercase tracking-widest">Nowy produkt</h3>
              
              <div className="space-y-6 mb-10">
                <div className="flex flex-col items-center">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-4 block">Ikona</label>
                  <input 
                    type="text" 
                    value={customProductIcon}
                    onChange={e => setCustomProductIcon(e.target.value)}
                    className="w-20 h-20 bg-surface-2 border-2 border-border rounded-3xl text-4xl text-center focus:border-brand-500 transition-all text-text-primary outline-none shadow-inner"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-2 block px-1">Nazwa produktu</label>
                  <input 
                    type="text" 
                    placeholder="np. Ketchup"
                    value={customProductName}
                    onChange={e => setCustomProductName(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-2xl px-5 py-4 text-base font-bold focus:border-brand-500 transition-all text-text-primary outline-none placeholder:opacity-20"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setShowAddProduct(false)}
                  className="flex-1 py-5 rounded-[2rem] bg-surface-3 hover:bg-surface-4 text-text-primary font-black text-xs uppercase tracking-widest transition-all"
                >
                  Anuluj
                </button>
                <button 
                  onClick={addCustomProduct}
                  className="flex-1 py-5 rounded-[2rem] bg-brand-600 hover:bg-brand-700 font-black text-xs uppercase tracking-widest text-white shadow-xl shadow-brand-500/20 transition-all active:scale-95"
                >
                  Dodaj
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 pb-48 animate-fade-in px-6 pt-10 relative">
      {/* Decorative background glows */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-brand-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 -right-32 w-64 h-64 bg-brand-500/10 rounded-full blur-[100px] pointer-events-none" />

      <header className="mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-8 relative z-[100]">
        <div className="flex flex-col">
          <h1 className="text-4xl font-black tracking-tighter mb-2 text-text-primary" style={{ fontFamily: "var(--font-display)" }}>
            Odkryj <span className="text-gradient">Alejki</span>
          </h1>
          <div className="flex items-center gap-3">
            <div className="w-10 h-1.5 rounded-full bg-brand-500/20" />
            <p className="text-[11px] text-text-muted font-black uppercase tracking-[0.25em] opacity-60">Szybki wybór zakupów</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 min-w-[220px]">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted px-1 opacity-60">Dodawaj do listy:</label>
          <ListPicker 
            lists={userLists}
            activeId={activeListId}
            onChange={handleActiveListChange}
          />
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 relative z-10">
        {userAisles.map((aisle, i) => (
          <button
            key={aisle.id}
            onClick={() => setSelectedAisle(aisle)}
            className="group p-6 rounded-[2.5rem] bg-surface-2/40 backdrop-blur-xl border border-border flex flex-col items-center justify-center gap-4 transition-all duration-200 hover:border-brand-500/40 hover:scale-[1.03] active:scale-95 shadow-xl shadow-black/5 hover:shadow-2xl hover:shadow-brand-500/10 relative overflow-hidden"
            style={{ animationDelay: `${i * 30}ms`, animationFillMode: "both" }}
          >
            {/* Ambient card glow */}
            <div className="absolute -right-6 -top-6 w-20 h-20 bg-brand-500/5 rounded-full blur-2xl group-hover:bg-brand-500/15 transition-colors" />
            
            <div className="w-16 h-16 rounded-[1.5rem] bg-surface-3 flex items-center justify-center text-4xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-[8deg] shadow-inner group-hover:shadow-brand-500/10">
              {aisle.icon}
            </div>
            <span className="text-[13px] font-black uppercase tracking-[0.15em] text-text-primary group-hover:text-brand-500 transition-colors">{aisle.name}</span>
          </button>
        ))}
        
        <button 
          onClick={() => setShowAddAisle(true)}
          className="p-6 rounded-[2.5rem] border-2 border-dashed border-border flex flex-col items-center justify-center gap-4 opacity-40 hover:opacity-100 transition-all duration-300 cursor-pointer hover:bg-brand-500/5 hover:border-brand-500/30"
        >
          <div className="w-16 h-16 rounded-[1.5rem] bg-surface-2 flex items-center justify-center text-xl text-text-muted">
            <Plus size={28} strokeWidth={2.5} />
          </div>
          <span className="text-[11px] font-black uppercase tracking-widest text-text-muted">Nowa alejka</span>
        </button>
      </div>

      {/* Modal for adding custom aisle - Premium version */}
      {showAddAisle && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-6 animate-fade-in" onClick={() => setShowAddAisle(false)}>
            <div className="w-full max-w-sm bg-surface-1 border border-border rounded-[2.5rem] p-8 shadow-2xl animate-pop-in" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-black mb-8 text-center text-text-primary uppercase tracking-widest">Nowa Alejka</h3>
              
              <div className="space-y-6 mb-10">
                <div className="flex flex-col items-center">
                  <label className="text-[10px] font-black uppercase tracking-[0.25em] text-text-muted mb-4 block">Ikona</label>
                  <input 
                    type="text" 
                    value={newAisleIcon}
                    onChange={e => setNewAisleIcon(e.target.value)}
                    className="w-20 h-20 bg-surface-2 border-2 border-border rounded-3xl text-4xl text-center focus:border-brand-500 transition-all text-text-primary outline-none shadow-inner"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.25em] text-text-muted mb-2 block px-1">Nazwa alejki</label>
                  <input 
                    type="text" 
                    placeholder="np. Zwierzęta"
                    value={newAisleName}
                    onChange={e => setNewAisleName(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-2xl px-5 py-4 font-bold focus:border-brand-500 transition-all text-text-primary outline-none placeholder:opacity-20"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setShowAddAisle(false)}
                  className="flex-1 py-5 rounded-[2rem] bg-surface-3 hover:bg-surface-4 text-text-primary font-black text-xs uppercase tracking-widest transition-all"
                >
                  Anuluj
                </button>
                <button 
                  onClick={addNewAisle}
                  className="flex-1 py-5 rounded-[2rem] bg-brand-600 hover:bg-brand-700 font-black text-xs uppercase tracking-widest text-white shadow-xl shadow-brand-500/20 transition-all active:scale-95"
                >
                  Dodaj
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
