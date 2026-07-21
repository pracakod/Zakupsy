"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Search, Trash2, Plus, Camera, Receipt, Calendar, CreditCard, DollarSign, X, Loader2, Image as ImageIcon, Filter, Edit2, ArrowLeft } from "lucide-react";
import { useToast } from "@/lib/ToastContext";
import NextImage from "next/image";
import { useRouter } from "next/navigation";

interface Receipt {
  id: string;
  store_name: string;
  total_amount: number;
  currency: string;
  image_url: string;
  date: string;
  created_at: string;
}

export default function ReceiptsClient({ user }: { user: User }) {
  const router = useRouter();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // New receipt form state
  const [storeName, setStoreName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [imageUrl, setImageUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const supabase = createClient();
  const { showToast } = useToast();

  const fetchReceipts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("receipts")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false });
    
    if (data) setReceipts(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onerror = (err) => reject(err);
      reader.onload = (event) => {
        const img = new (window.Image || Image)();
        img.onerror = (err) => reject(err);
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1200;
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Canvas toBlob failed"));
          }, "image/webp", 0.8);
        };
      };
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setPreviewUrl(URL.createObjectURL(file));

    try {
      const compressedBlob = await compressImage(file);
      
      const fileName = `${Math.random()}.webp`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, compressedBlob, {
          contentType: 'image/webp'
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);
      
      setImageUrl(publicUrl);
    } catch (error) {
      console.error('File processing/upload error:', error);
      showToast("Błąd przy przetwarzaniu zdjęcia", "error");
    } finally {
      setUploading(false);
    }
  };

  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [longPressReceipt, setLongPressReceipt] = useState<Receipt | null>(null);
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [viewImageUrl, setViewImageUrl] = useState<string | null>(null);

  const startPress = (receipt: Receipt) => {
    const timer = setTimeout(() => {
      setLongPressReceipt(receipt);
      if (window.navigator.vibrate) window.navigator.vibrate(50);
    }, 500);
    setPressTimer(timer);
  };

  const endPress = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim() || !amount) return;

    const receiptData = {
      user_id: user.id,
      store_name: storeName.trim(),
      total_amount: parseFloat(amount),
      date,
      image_url: imageUrl,
    };

    let error;
    if (editingReceipt) {
      const { error: err } = await supabase
        .from("receipts")
        .update(receiptData)
        .eq("id", editingReceipt.id);
      error = err;
    } else {
      const { error: err } = await supabase
        .from("receipts")
        .insert(receiptData);
      error = err;
    }

    if (!error) {
      showToast(editingReceipt ? "Zaktualizowano paragon!" : "Dodano paragon!", "success");
      resetForm();
      fetchReceipts();
    } else {
      showToast("Błąd przy zapisywaniu", "error");
    }
  };

  const resetForm = () => {
    setStoreName("");
    setAmount("");
    setDate(new Date().toISOString().split('T')[0]);
    setImageUrl("");
    setPreviewUrl(null);
    setIsAdding(false);
    setEditingReceipt(null);
  };

  const deleteReceipt = async (id: string, imageUrl?: string) => {
    const { error } = await supabase
      .from("receipts")
      .delete()
      .eq("id", id);
    
    if (!error) {
      // Optional: Delete from storage if image exists
      if (imageUrl && !imageUrl.includes('placeholder')) {
        const path = imageUrl.split('/public/receipts/')[1];
        if (path) {
          await supabase.storage.from('receipts').remove([path]);
        }
      }
      showToast("Usunięto paragon", "success");
      fetchReceipts();
    }
  };

  const filteredReceipts = receipts.filter(r => 
    r.store_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalThisMonth = filteredReceipts
    .filter(r => new Date(r.date).getMonth() === new Date().getMonth())
    .reduce((sum, r) => sum + (r.total_amount || 0), 0);

  return (
    <div className="flex-1 pb-48 animate-fade-in relative overflow-hidden min-h-screen">
      {/* Header */}
      <header className="px-6 pt-10 mb-8 relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="w-10 h-10 rounded-xl bg-surface-2/80 backdrop-blur-md border border-border flex items-center justify-center text-text-muted hover:text-brand-500 transition-colors active:scale-90"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-4xl font-black tracking-tighter" style={{ fontFamily: "var(--font-display)" }}>
              Paragony
            </h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-text-muted opacity-60">Zarządzaj wydatkami</p>
          </div>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="w-14 h-14 rounded-2xl gradient-brand text-white flex items-center justify-center shadow-lg shadow-brand-500/20 active:scale-95 transition-all"
        >
          <Plus size={24} />
        </button>
      </header>

      {/* Search & Filter */}
      <div className="flex gap-3 mb-8">
        <div className="relative flex-1 group">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-brand-400 transition-colors" />
          <input 
            type="text" 
            placeholder="Szukaj sklepu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-surface-2 border border-border focus:border-brand-500/50 focus:ring-4 focus:ring-brand-500/5 transition-all outline-none text-sm font-medium"
          />
        </div>
        <button className="w-14 h-14 rounded-2xl bg-surface-2 border border-border flex items-center justify-center text-muted hover:text-text-primary transition-all">
          <Filter size={20} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-brand-400" />
        </div>
      ) : filteredReceipts.length === 0 ? (
        <div className="text-center py-20 opacity-40">
          <div className="w-20 h-20 rounded-[2rem] bg-surface-2 flex items-center justify-center mx-auto mb-6 border border-border">
             <Receipt size={32} />
          </div>
          <p className="font-black text-sm uppercase tracking-tighter">Brak paragonów</p>
          <p className="text-xs mt-1">Zacznij skanować swoje wydatki!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReceipts.map((receipt) => (
            <div 
              key={receipt.id}
              onMouseDown={() => startPress(receipt)}
              onMouseUp={endPress}
              onMouseLeave={endPress}
              onTouchStart={() => startPress(receipt)}
              onTouchEnd={endPress}
              onContextMenu={(e) => e.preventDefault()}
              className="p-4 rounded-3xl bg-surface-2 border border-border group hover:border-brand-500/30 transition-all flex items-center gap-4 cursor-pointer active:scale-[0.98] select-none"
            >
              <div 
                className="w-14 h-14 rounded-2xl bg-surface-3 flex items-center justify-center text-brand-400 shrink-0 cursor-zoom-in active:scale-90 transition-transform"
                onClick={(e) => {
                  e.stopPropagation();
                  if (receipt.image_url) setViewImageUrl(receipt.image_url);
                }}
              >
                {receipt.image_url ? (
                  <div className="relative w-full h-full rounded-2xl overflow-hidden">
                    <img src={receipt.image_url} alt={receipt.store_name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <Receipt size={24} />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-sm truncate">{receipt.store_name}</h3>
                <div className="flex items-center gap-3 text-[10px] text-muted font-bold uppercase tracking-widest mt-0.5">
                  <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(receipt.date).toLocaleDateString("pl-PL")}</span>
                </div>
              </div>
              
              <div className="text-right shrink-0">
                <p className="font-black text-base text-brand-400">{receipt.total_amount.toFixed(2)} <span className="text-[10px] opacity-70">PLN</span></p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Context Menu Modal */}
      {longPressReceipt && (
        <div className="fixed inset-0 z-[150] flex items-end justify-center bg-black/60 backdrop-blur-sm p-6 pb-24 animate-fade-in" onClick={() => setLongPressReceipt(null)}>
          <div className="w-full max-w-sm bg-surface-1 border border-border rounded-[2.5rem] overflow-hidden shadow-2xl animate-slide-up mb-4" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-border bg-surface-2/50">
              <h3 className="font-black text-sm uppercase tracking-widest text-muted">{longPressReceipt.store_name}</h3>
              <p className="font-black text-xs text-brand-400 mt-1">{longPressReceipt.total_amount.toFixed(2)} PLN</p>
            </div>
            <div className="p-2">
              <button 
                onClick={() => { 
                  setEditingReceipt(longPressReceipt); 
                  setStoreName(longPressReceipt.store_name); 
                  setAmount(longPressReceipt.total_amount.toString()); 
                  setDate(longPressReceipt.date);
                  setImageUrl(longPressReceipt.image_url);
                  setPreviewUrl(longPressReceipt.image_url);
                  setIsAdding(true); 
                  setLongPressReceipt(null); 
                }}
                className="w-full p-4 flex items-center gap-4 hover:bg-surface-2 rounded-2xl transition-all font-bold text-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <Edit2 size={18} />
                </div>
                Edytuj paragon
              </button>
              
              <button 
                onClick={() => { deleteReceipt(longPressReceipt.id, longPressReceipt.image_url); setLongPressReceipt(null); }}
                className="w-full p-4 flex items-center gap-4 hover:bg-red-500/5 text-red-500 rounded-2xl transition-all font-bold text-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <Trash2 size={18} />
                </div>
                Usuń paragon
              </button>
            </div>
            <button 
              onClick={() => setLongPressReceipt(null)}
              className="w-full p-6 text-center text-xs font-black uppercase tracking-widest text-muted border-t border-border"
            >
              Anuluj
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(isAdding || editingReceipt) && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-6 animate-fade-in" onClick={resetForm}>
          <div className="w-full max-w-md bg-surface-1 border border-border rounded-[2.5rem] p-8 shadow-2xl animate-pop-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-8 px-1">
              <h2 className="text-xl font-black">{editingReceipt ? "Edytuj paragon" : "Nowa paragon"}</h2>
              <button onClick={resetForm} className="p-2 rounded-full bg-surface-2 text-muted"><X size={20} /></button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              {/* Photo Upload area */}
              <div className="relative">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 block px-1">Zdjęcie paragonu</label>
                <div className="relative h-48 rounded-3xl border-2 border-dashed border-border bg-surface-2 flex flex-col items-center justify-center overflow-hidden group hover:border-brand-500/50 transition-all cursor-pointer">
                  {previewUrl ? (
                    <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <Camera size={32} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Dodaj zdjęcie</span>
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 size={32} className="animate-spin text-white" />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 block px-1">Sklep</label>
                <input 
                  type="text" 
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="np. Biedronka, Lidl"
                  className="w-full bg-surface-2 border border-border rounded-2xl px-5 py-4 text-base font-bold outline-none focus:border-brand-500 transition-all"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 block px-1">Kwota</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-surface-2 border border-border rounded-2xl pl-5 pr-12 py-4 text-base font-bold outline-none focus:border-brand-500 transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-xs text-muted">PLN</span>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 block px-1">Data</label>
                  <input 
                    type="date" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-2xl px-5 py-4 text-base font-bold outline-none focus:border-brand-500 transition-all"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={!storeName.trim() || !amount}
                  className="w-full py-4 rounded-2xl gradient-brand text-white font-black text-sm uppercase tracking-widest shadow-lg shadow-brand-500/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  Zapisz paragon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Image Preview Modal */}
      {viewImageUrl && (
        <div 
          className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-xl flex flex-col p-6 animate-fade-in"
          onClick={() => setViewImageUrl(null)}
        >
          <div className="flex justify-end p-4">
            <button className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center backdrop-blur-md">
              <X size={24} />
            </button>
          </div>
          <div className="flex-1 relative w-full h-full flex items-center justify-center p-4">
            <img 
              src={viewImageUrl} 
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl animate-pop-in" 
              alt="Receipt Preview" 
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="p-8 text-center">
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Dotknij obok zdjęcia, aby zamknąć</p>
          </div>
        </div>
      )}
    </div>
  );
}
