"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { 
  Plus, 
  ArrowLeft,
  Zap,
  Package,
  CheckSquare
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/ToastContext";

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
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [addingIds, setAddingIds] = useState<string[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [customProductName, setCustomProductName] = useState("");
  const [customProductIcon, setCustomProductIcon] = useState("📦");
  const [showAddAisle, setShowAddAisle] = useState(false);
  const [newAisleName, setNewAisleName] = useState("");
  const [newAisleIcon, setNewAisleIcon] = useState("📦");
  const [userAisles, setUserAisles] = useState<typeof AISLES>(AISLES);
  const [dbCustomAisles, setDbCustomAisles] = useState<any[]>([]);
  const supabase = createClient();
  const router = useRouter();
  const { showToast } = useToast();

  const fetchLists = async () => {
    const { data } = await supabase
      .from("lists")
      .select("id")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1);
    if (data?.[0]) setActiveListId(data[0].id);
  };

  const fetchCustomAisles = async () => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("custom_aisles")
      .eq("id", user.id)
      .single();
    
    if (profile?.custom_aisles) {
      setDbCustomAisles(profile.custom_aisles);
      setUserAisles([...AISLES, ...profile.custom_aisles]);
    }
  };

  useEffect(() => {
    fetchLists();
    fetchCustomAisles();
  }, []);

  async function addItem(name: string, icon?: string) {
    if (!activeListId) {
      showToast("Najpierw wybierz lub utwórz listę zakupów!", "error");
      router.push("/lists");
      return;
    }

    setAddingIds(prev => [...prev, name]);
    const { error } = await supabase
      .from("items")
      .insert({ 
        list_id: activeListId, 
        name, 
        icon,
        user_id: user.id, 
        category: selectedAisle?.name || 'Inne',
        status: 'pending'
      });

    if (error) {
      showToast("Błąd: " + error.message, "error");
    } else {
      showToast(`Dodano ${name}`, "success");
    }
    
    setTimeout(() => {
      setAddingIds(prev => prev.filter(id => id !== name));
    }, 500);
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
      showToast("Dodano produkty z pakietu startowego!", "success");
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
      setSelectedAisle(updatedCustom.find(a => a.id === selectedAisle.id));
      showToast("Zapisano produkt w alejce", "success");
    }
    
    setCustomProductName("");
    setShowAddProduct(false);
  }

  if (selectedAisle) {
    return (
      <div className="flex-1 pb-48 animate-fade-in px-6 pt-6">
        <button 
          onClick={() => setSelectedAisle(null)}
          className="p-2 mb-6 -ml-2 text-text-muted hover:text-text-primary transition-colors flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Wróć</span>
        </button>

        <header className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <span className="text-4xl">{selectedAisle.icon}</span>
            <h1 className="text-3xl font-bold tracking-tight text-text-primary" style={{ fontFamily: "var(--font-display)" }}>
              {selectedAisle.name}
            </h1>
          </div>
          <p className="text-xs text-text-muted">Dodaj produkty do aktywnej listy</p>
        </header>

        <div className="grid grid-cols-2 gap-2">
          {selectedAisle.items.map((item) => (
            <button
              key={item.name}
              onClick={() => addItem(item.name, item.icon)}
              className="px-3 py-3 rounded-xl bg-surface-2 border border-border flex items-center gap-3 active:scale-[0.98] transition-all cursor-pointer hover:border-brand-500/30 group"
            >
              <span className="text-lg transition-all">{item.icon}</span>
              <span className="text-xs font-semibold flex-1 text-left truncate">{item.name}</span>
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${addingIds.includes(item.name) ? 'bg-green-500 text-white' : 'bg-brand-500/10 text-brand-400 opacity-20'}`}>
                {addingIds.includes(item.name) ? <CheckSquare size={14} /> : <Plus size={14} />}
              </div>
            </button>
          ))}

          {/* Add custom item card */}
          <button
            onClick={() => setShowAddProduct(true)}
            className="px-3 py-3 rounded-xl border border-dashed border-border flex items-center gap-3 active:scale-[0.98] transition-all cursor-pointer opacity-60 hover:opacity-100"
          >
            <div className="w-6 h-6 rounded-lg bg-surface-3 flex items-center justify-center text-muted">
              <Plus size={14} />
            </div>
            <span className="text-xs font-medium">Inny...</span>
          </button>
        </div>

        {/* Modal for adding custom product */}
        {showAddProduct && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-6 animate-fade-in" onClick={() => setShowAddProduct(false)}>
            <div className="w-full max-w-sm bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] animate-pop-in !text-slate-900" onClick={e => e.stopPropagation()}>
              <h3 className="text-2xl font-black mb-6 text-center text-slate-900">Dodaj produkt</h3>
              
              <div className="space-y-5 mb-8">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-800 mb-2 block px-1">Ikona (emoji)</label>
                  <input 
                    type="text" 
                    value={customProductIcon}
                    onChange={e => setCustomProductIcon(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-4 text-3xl text-center focus:border-brand-500 focus:bg-white transition-all text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-800 mb-2 block px-1">Nazwa produktu</label>
                  <input 
                    type="text" 
                    placeholder="np. Ketchup"
                    value={customProductName}
                    onChange={e => setCustomProductName(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-4 text-base font-bold focus:border-brand-500 focus:bg-white transition-all text-slate-900 outline-none placeholder:text-slate-300"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowAddProduct(false)}
                  className="flex-1 py-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-black text-sm transition-all"
                >
                  Anuluj
                </button>
                <button 
                  onClick={addCustomProduct}
                  className="flex-1 py-4 rounded-2xl bg-brand-600 hover:bg-brand-700 font-black text-sm text-white shadow-lg shadow-brand-500/40 transition-all active:scale-95"
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
    <div className="flex-1 pb-48 animate-fade-in px-6 pt-6">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ fontFamily: "var(--font-display)" }}>
            Alejki
          </h1>
          <p className="text-xs text-muted font-medium uppercase tracking-widest">Wybierz kategorię</p>
        </div>
        <button 
          onClick={addStarterPack}
          className="flex items-center gap-2 px-4 py-2 rounded-xl glass text-xs font-bold text-brand-400 hover:text-brand-300 transition-colors cursor-pointer border border-brand-500/20"
        >
          <Zap size={14} fill="currentColor" />
          Start
        </button>
      </header>

      <div className="grid grid-cols-2 gap-3">
        {userAisles.map((aisle) => (
          <button
            key={aisle.id}
            onClick={() => setSelectedAisle(aisle)}
            className="group p-5 rounded-3xl bg-surface-2 border border-border flex flex-col items-center justify-center gap-3 transition-all duration-300 hover:border-brand-500/50 hover:bg-white/[0.02] cursor-pointer"
          >
            <div className="w-14 h-14 rounded-2xl bg-surface-3 flex items-center justify-center text-3xl transition-transform group-hover:scale-110">
              {aisle.icon}
            </div>
            <span className="text-xs font-bold tracking-tight">{aisle.name}</span>
          </button>
        ))}
        
        <button 
          onClick={() => setShowAddAisle(true)}
          className="p-5 rounded-3xl border border-dashed border-border flex flex-col items-center justify-center gap-3 opacity-40 hover:opacity-100 transition-all cursor-pointer"
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl">
            <Plus size={24} />
          </div>
          <span className="text-xs font-bold tracking-tight">Dodaj</span>
        </button>
      </div>

      {/* Modal for adding custom aisle */}
      {showAddAisle && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-6 animate-fade-in" onClick={() => setShowAddAisle(false)}>
            <div className="w-full max-w-sm bg-surface-1 border border-border rounded-[2.5rem] p-8 shadow-2xl animate-pop-in text-text-primary" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold mb-6 text-center text-text-primary">Dodaj nową alejkę</h3>
              
              <div className="space-y-4 mb-8">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2 block px-1 text-text-muted">Ikona alejki (emoji)</label>
                  <input 
                    type="text" 
                    value={newAisleIcon}
                    onChange={e => setNewAisleIcon(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-2xl text-center focus:border-brand-500 transition-colors text-text-primary"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2 block px-1 text-text-muted">Nazwa alejki</label>
                  <input 
                    type="text" 
                    placeholder="np. Zwierzęta"
                    value={newAisleName}
                    onChange={e => setNewAisleName(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm focus:border-brand-500 transition-colors text-text-primary placeholder:opacity-30"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowAddAisle(false)}
                  className="flex-1 py-4 rounded-2xl bg-surface-3 hover:bg-surface-4 text-text-primary font-bold text-sm transition-all"
                >
                  Anuluj
                </button>
                <button 
                  onClick={addNewAisle}
                  className="flex-1 py-4 rounded-2xl bg-brand-600 hover:bg-brand-700 font-bold text-sm text-white shadow-lg shadow-brand-500/20 transition-all active:scale-95"
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
