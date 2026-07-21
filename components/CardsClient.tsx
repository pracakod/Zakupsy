"use client";

import { useState, useEffect, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { 
  Plus, 
  Camera, 
  ChevronRight, 
  X, 
  Trash2, 
  CreditCard, 
  Barcode, 
  QrCode,
  Search,
  Check,
  ArrowLeft,
  Loader2
} from "lucide-react";
import { useToast } from "@/lib/ToastContext";
import { LoyaltyCard } from "@/types";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import BarcodeComponent from "react-barcode";
import { Html5QrcodeScanner } from "html5-qrcode";

export default function CardsClient({ user }: { user: User }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [supabase] = useState(() => createClient());
  
  const [cards, setCards] = useState<LoyaltyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedCard, setSelectedCard] = useState<LoyaltyCard | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [newCard, setNewCard] = useState({
    name: "",
    code: "",
    provider: "",
    color: "#5856D6",
    barcode_type: "code128" as 'code128' | 'ean13' | 'qr'
  });

  const longPressTimer = useRef<NodeJS.Timeout|null>(null);
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    fetchCards();
  }, []);

  async function fetchCards() {
    setLoading(true);
    const { data, error } = await supabase
      .from("loyalty_cards")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    
    if (!error && data) setCards(data);
    setLoading(false);
  }

  const startScanner = async () => {
    setIsScanning(true);
    // Wait for the 'reader' element to be in the DOM
    setTimeout(async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        const config = { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        };

        await html5QrCode.start(
          { facingMode: "environment" }, 
          config,
          (decodedText) => {
            setNewCard(prev => ({ ...prev, code: decodedText }));
            stopScanner();
            showToast("Zeskanowano kod!", "success");
          },
          undefined
        );
      } catch (err: any) {
        console.error("Scanner error:", err);
        const errorMsg = err?.toString() || "";
        if (errorMsg.includes("NotAllowedError") || errorMsg.includes("Permission denied")) {
          showToast("Brak uprawnień do aparatu. Sprawdź ustawienia przeglądarki.", "error");
        } else {
          showToast("Nie udało się uruchomić aparatu.", "error");
        }
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
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newCard.name || !newCard.code) return;

    if (isEditing && selectedCard) {
      const { error } = await supabase
        .from("loyalty_cards")
        .update({
          name: newCard.name,
          code: newCard.code,
          provider: newCard.provider,
          color: newCard.color,
          barcode_type: newCard.barcode_type
        })
        .eq("id", selectedCard.id);

      if (!error) {
        showToast("Zaktualizowano kartę!", "success");
        setIsAdding(false);
        setIsEditing(false);
        setNewCard({ name: "", code: "", provider: "", color: "#5856D6", barcode_type: "code128" });
        fetchCards();
      } else {
        showToast("Błąd aktualizacji karty", "error");
      }
    } else {
      const { error } = await supabase
        .from("loyalty_cards")
        .insert({
          ...newCard,
          user_id: user.id
        });

      if (!error) {
        showToast("Dodano kartę!", "success");
        setIsAdding(false);
        setNewCard({ name: "", code: "", provider: "", color: "#5856D6", barcode_type: "code128" });
        fetchCards();
      } else {
        showToast("Błąd dodawania karty", "error");
      }
    }
  }

  const handleTouchStart = (card: LoyaltyCard) => {
    longPressTimer.current = setTimeout(() => {
      setNewCard({
        name: card.name,
        code: card.code,
        provider: card.provider || "",
        color: card.color,
        barcode_type: card.barcode_type
      });
      setSelectedCard(card);
      setIsEditing(true);
      setIsAdding(true);
      if (window.navigator.vibrate) window.navigator.vibrate(50);
    }, 600);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  async function deleteCard(id: string) {
    const previousCards = [...cards];
    
    // Optimistic remove
    setCards((prev: any[]) => prev.filter((c: any) => c.id !== id));
    setSelectedCard(null);
    setIsAdding(false);
    setIsEditing(false);
    
    const { error } = await supabase
      .from("loyalty_cards")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    
    if (error) {
      // Revert
      setCards(previousCards);
      showToast("Błąd przy usuwaniu karty: " + error.message, "error");
    } else {
      showToast("Karta usunięta", "success");
    }
  }

  const filteredCards = cards.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.provider && c.provider.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  useEffect(() => {
    if (selectedCard || isAdding) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [selectedCard, isAdding]);

  return (
    <div className="flex-1 pb-48 animate-fade-in relative overflow-hidden min-h-screen">
      {/* Background Decor */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-red-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 -right-32 w-64 h-64 bg-brand-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="px-6 pt-8 mb-6 relative z-10">
        <div className="flex items-center gap-4 mb-1">
          <button 
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-surface-2/80 backdrop-blur-md border border-border flex items-center justify-center text-text-muted hover:text-brand-500 transition-colors active:scale-90"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-3xl font-black tracking-tighter" style={{ fontFamily: "var(--font-display)" }}>
            Twoje <span className="text-gradient">Karty</span>
          </h1>
        </div>
        <div className="flex items-center gap-2.5 pl-13">
          <div className="w-8 h-1 rounded-full bg-brand-500/20" />
          <p className="text-[10px] text-text-muted font-black uppercase tracking-[0.2em] opacity-60">Portfel lojalnościowy</p>
        </div>
      </header>

      {/* Stats & Actions */}
      <div className="px-6 mb-8 relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-surface-2/40 backdrop-blur-xl border border-border px-5 py-3 rounded-2xl flex items-center justify-between">
            <p className="text-[9px] font-black uppercase tracking-widest text-text-muted">Karty</p>
            <p className="text-lg font-black text-brand-500">{cards.length}</p>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="h-[52px] px-6 rounded-2xl bg-brand-500 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-brand-500/20 active:scale-95 transition-all flex items-center gap-2"
          >
            <Plus size={16} />
            <span>Dodaj</span>
          </button>
        </div>
      </div>

      {/* Cards List */}
      <div className="px-6 grid grid-cols-1 gap-4 relative z-10">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-32 rounded-[2rem] bg-surface-2/40 animate-pulse border border-border" />
          ))
        ) : filteredCards.length > 0 ? (
          filteredCards.map((card, i) => (
            <div 
              key={card.id}
              onClick={() => setSelectedCard(card)}
              onMouseDown={() => handleTouchStart(card)}
              onMouseUp={handleTouchEnd}
              onMouseLeave={handleTouchEnd}
              onTouchStart={() => handleTouchStart(card)}
              onTouchEnd={handleTouchEnd}
              onContextMenu={(e) => e.preventDefault()}
              className="group relative h-48 rounded-[2.5rem] p-6 flex flex-col justify-between overflow-hidden cursor-pointer transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] shadow-xl select-none no-long-press-menu"
              style={{ background: `linear-gradient(135deg, ${card.color} 0%, ${card.color}dd 100%)`, animationDelay: `${i * 100}ms`, animationFillMode: "both" }}
            >
              {/* Card Decor */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-black/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute top-0 right-0 w-32 h-32 opacity-10 pointer-events-none">
                 <CreditCard size={120} strokeWidth={1} />
              </div>

              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 mb-1">{card.provider || "Karta Lojalnościowa"}</p>
                <h3 className="text-2xl font-black text-white tracking-tight capitalize">{card.name}</h3>
              </div>

              <div className="relative z-10 flex items-end justify-between">
                 <div className="bg-white/20 backdrop-blur-md rounded-2xl px-4 py-2 border border-white/20">
                    <p className="text-[10px] font-bold text-white/90 font-mono tracking-widest">{card.code}</p>
                 </div>
                 <div className="w-12 h-12 rounded-2xl bg-white/90 flex items-center justify-center text-slate-800 shadow-lg">
                    {card.barcode_type === 'qr' ? <QrCode size={24} /> : <Barcode size={24} />}
                 </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 text-center opacity-30 select-none">
            <CreditCard size={80} className="mx-auto mb-6" strokeWidth={1} />
            <p className="font-bold text-lg">Twój portfel jest pusty</p>
            <p className="text-xs max-w-[200px] mx-auto mt-2 leading-relaxed">Dodaj swoje karty lojalnościowe, aby mieć je zawsze pod ręką podczas zakupów.</p>
          </div>
        )}
      </div>

      {/* Selected Card Modal */}
      {selectedCard && (
        <div className="fixed inset-0 z-[400] flex flex-col bg-surface-1 animate-fade-in overflow-y-auto" onClick={() => setSelectedCard(null)}>
           <header className="px-6 pt-12 pb-6 flex items-center justify-between">
              <button 
                onClick={() => setSelectedCard(null)}
                className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center text-text-muted"
              >
                <X size={24} />
              </button>
              <h2 className="text-lg font-black uppercase tracking-widest">Twoja Karta</h2>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Czy na pewno chcesz usunąć tę kartę?")) deleteCard(selectedCard.id);
                }}
                className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center"
              >
                <Trash2 size={20} />
              </button>
           </header>

           <main className="flex-1 px-8 py-4 flex flex-col items-center text-center gap-12" onClick={e => e.stopPropagation()}>
              <div className="w-full max-w-sm">
                 <div 
                    className="w-full h-56 rounded-[3rem] p-10 flex flex-col justify-between text-left relative overflow-hidden shadow-2xl mb-12 translate-y-0"
                    style={{ background: `linear-gradient(135deg, ${selectedCard.color} 0%, ${selectedCard.color}dd 100%)` }}
                 >
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 mb-1">{selectedCard.provider || "Karta Lojalnościowa"}</p>
                      <h3 className="text-3xl font-black text-white tracking-tight">{selectedCard.name}</h3>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-white/30"><CreditCard size={40} /></div>
                      <div className="bg-white/10 px-4 py-2 rounded-xl text-white font-mono font-bold tracking-widest text-sm">{selectedCard.code}</div>
                    </div>
                 </div>

                 {/* Barcode/QR Section */}
                 <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl flex flex-col items-center justify-center border border-slate-200">
                    {selectedCard.barcode_type === 'qr' ? (
                      <div className="p-4 bg-white rounded-2xl">
                        <QRCodeSVG value={selectedCard.code} size={200} level="H" />
                      </div>
                    ) : (
                      <div className="w-full py-4 flex flex-col items-center">
                        <BarcodeComponent 
                          value={selectedCard.code} 
                          width={2} 
                          height={100} 
                          displayValue={true} 
                          fontSize={14} 
                          font="monospace" 
                          background="#ffffff"
                          format={selectedCard.barcode_type === 'ean13' ? 'EAN13' : 'CODE128'}
                        />
                      </div>
                    )}
                    <p className="mt-8 text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Pokaż przy kasie</p>
                 </div>
              </div>

               <p className="text-xs text-text-muted mt-4 opacity-60">Zeskanuj ten kod w czytniku przy kasie lub pokaż sprzedawcy.</p>
           </main>
        </div>
      )}

      {/* Add/Edit Card Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-6 animate-fade-in" onClick={() => { if (!isScanning) { setIsAdding(false); setIsEditing(false); } }}>
          <div 
            className="w-full max-w-xl bg-surface-1 rounded-[3rem] shadow-2xl animate-pop-in relative max-h-[90vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-8 pb-4 flex items-center justify-between">
              <h2 className="text-2xl font-black tracking-tight">{isEditing ? "Edytuj Kartę" : "Dodaj Kartę"}</h2>
              <button 
                onClick={() => { stopScanner(); setIsAdding(false); setIsEditing(false); }} 
                className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center text-text-muted hover:text-red-500 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 pt-4 custom-scrollbar">
              {isScanning ? (
                <div className="flex flex-col items-center gap-6 py-4">
                   <div className="relative w-full max-w-sm aspect-square rounded-[3rem] overflow-hidden border-4 border-brand-500/20 shadow-2xl bg-black">
                      <div id="reader" className="w-full h-full" />
                      {/* Scanning Animation Overlay */}
                      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-brand-500 to-transparent animate-scan-line z-20" />
                      <div className="absolute inset-0 border-[20px] border-black/40 pointer-events-none z-10" />
                   </div>
                   <div className="text-center">
                     <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-500 animate-pulse mb-2">Skanowanie...</p>
                     <p className="text-[10px] text-text-muted font-bold">Skieruj aparat na kod kreskowy lub QR</p>
                   </div>
                   <button 
                    onClick={stopScanner}
                    className="mt-4 px-10 py-5 rounded-2x2 bg-surface-2 font-black text-[10px] uppercase tracking-widest text-text-muted hover:bg-surface-3 active:scale-95 transition-all flex items-center gap-2"
                   >
                     <X size={16} />
                     <span>Anuluj</span>
                   </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2 block px-1">Nazwa Karty</label>
                    <input 
                      autoFocus
                      type="text" 
                      value={newCard.name}
                      onChange={e => setNewCard({...newCard, name: e.target.value})}
                      placeholder="np. Biedronka, Rossmann"
                      className="w-full bg-surface-2 border border-border rounded-2xl px-5 py-4 font-bold outline-none focus:border-brand-500 transition-all text-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2 block px-1">Kod Karty</label>
                    <div className="flex gap-2">
                       <input 
                        type="text" 
                        value={newCard.code}
                        onChange={e => setNewCard({...newCard, code: e.target.value})}
                        placeholder="Wpisz lub zeskanuj..."
                        className="flex-1 bg-surface-2 border border-border rounded-2xl px-5 py-4 font-bold outline-none focus:border-brand-500 transition-all font-mono"
                        required
                      />
                      <button 
                        type="button"
                        onClick={startScanner}
                        className="w-16 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center border border-brand-500/20 active:scale-90 transition-all"
                      >
                        <Camera size={24} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2 block px-1">Typ Kodu</label>
                    <div className="flex gap-2 p-1.5 bg-surface-2 border border-border rounded-2xl">
                       {([
                        { id: 'qr', icon: QrCode, label: 'QR' },
                        { id: 'code128', icon: Barcode, label: 'Kreskowy' },
                        { id: 'ean13', icon: Barcode, label: 'EAN-13' }
                       ] as const).map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setNewCard({...newCard, barcode_type: t.id})}
                          className={`flex-1 flex flex-col items-center gap-2 py-3 rounded-xl transition-all ${newCard.barcode_type === t.id ? 'bg-brand-500 text-white shadow-lg' : 'text-text-muted hover:bg-surface-3'}`}
                        >
                          <t.icon size={20} />
                          <span className="text-[9px] font-black uppercase tracking-widest">{t.label}</span>
                        </button>
                       ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2 block px-1">Kolor Karty</label>
                    <div className="flex flex-wrap gap-4">
                       {[
                        "#5856D6", // Purple
                        "#FF3B30", // Red
                        "#FF9500", // Orange
                        "#34C759", // Green
                        "#007AFF", // Blue
                        "#FF2D55", // Pink
                        "#AF52DE", // Indigo
                        "#1D1D1F"  // Black
                       ].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNewCard({...newCard, color: c})}
                          className={`w-10 h-10 rounded-full border-4 transition-all ${newCard.color === c ? 'border-brand-500 scale-110 ring-4 ring-brand-500/20' : 'border-transparent shadow-inner'}`}
                          style={{ backgroundColor: c }}
                        />
                       ))}
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-5 rounded-2xl gradient-brand text-white font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-brand-500/20 active:scale-[0.98] transition-all mt-4"
                  >
                    {isEditing ? "Zapisz zmiany" : "Dodaj do portfela"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
