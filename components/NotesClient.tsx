"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Search, Trash2, Pin, PinOff, MoreVertical, Edit2, X, Loader2, StickyNote, Palette, Plus, ArrowLeft } from "lucide-react";
import { useToast } from "@/lib/ToastContext";
import { useRouter } from "next/navigation";

interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  is_pinned: boolean;
  created_at: string;
}

export default function NotesClient({ user }: { user: User }) {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  
  // New note form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState("#ffffff");
  
  const supabase = createClient();
  const { showToast } = useToast();

  const colors = [
    { name: "White", value: "#ffffff", border: "border-border" },
    { name: "Yellow", value: "#fef3c7", border: "border-yellow-200" },
    { name: "Green", value: "#dcfce7", border: "border-green-200" },
    { name: "Blue", value: "#dbeafe", border: "border-blue-200" },
    { name: "Purple", value: "#f3e8ff", border: "border-purple-200" },
    { name: "Pink", value: "#fce7f3", border: "border-pink-200" },
    { name: "Orange", value: "#ffedd5", border: "border-orange-200" },
  ];

  const fetchNotes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", user.id)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });
    
    if (data) setNotes(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const noteData = {
      user_id: user.id,
      title: title.trim(),
      content: content.trim(),
      color,
    };

    const previousNotes = [...notes];
    
    if (editingNote) {
      // Optimistic update
      setNotes((prev: Note[]) => prev.map((n: Note) => n.id === editingNote.id ? { ...n, ...noteData } : n));
      resetForm();
      
      const { error } = await supabase
        .from("notes")
        .update(noteData)
        .eq("id", editingNote.id);
        
      if (error) {
        setNotes(previousNotes);
        showToast("Błąd przy aktualizacji: " + error.message, "error");
      } else {
        showToast("Zaktualizowano notatkę", "success");
      }
    } else {
      const { data, error } = await supabase
        .from("notes")
        .insert(noteData)
        .select()
        .single();
        
      if (!error) {
        showToast("Dodano notatkę", "success");
        setNotes((prev: Note[]) => [data, ...prev]);
        resetForm();
      } else {
        showToast("Błąd przy zapisywaniu", "error");
      }
    }
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setColor("#ffffff");
    setIsAdding(false);
    setEditingNote(null);
  };

  const togglePin = async (note: Note) => {
    const previousNotes = [...notes];
    const newPinned = !note.is_pinned;
    
    // Optimistic update
    setNotes((prev: Note[]) => prev.map((n: Note) => n.id === note.id ? { ...n, is_pinned: newPinned } : n)
      .sort((a, b) => {
        if (a.is_pinned === b.is_pinned) return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        return a.is_pinned ? -1 : 1;
      })
    );
    
    const { error } = await supabase
      .from("notes")
      .update({ is_pinned: newPinned })
      .eq("id", note.id);
    
    if (error) {
      setNotes(previousNotes);
      showToast("Błąd przy przypinaniu: " + error.message, "error");
    }
  };

  const deleteNote = async (id: string) => {
    const previousNotes = [...notes];
    
    // Optimistic remove
    setNotes((prev: Note[]) => prev.filter((n: Note) => n.id !== id));
    
    const { error } = await supabase
      .from("notes")
      .delete()
      .eq("id", id);
    
    if (error) {
      setNotes(previousNotes);
      showToast("Błąd przy usuwaniu: " + error.message, "error");
    } else {
      showToast("Usunięto notatkę", "success");
    }
  };

  const [longPressNote, setLongPressNote] = useState<Note | null>(null);
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);

  const startPress = (note: Note) => {
    const timer = setTimeout(() => {
      setLongPressNote(note);
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

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    n.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 pb-32 px-6 pt-6 animate-fade-in max-w-4xl mx-auto">
      <header className="mb-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-muted hover:text-brand-500 transition-colors active:scale-90"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-black tracking-tight mb-2" style={{ fontFamily: "var(--font-display)" }}>
              Notatki
            </h1>
            <p className="text-xs text-muted font-bold uppercase tracking-widest">
              {notes.length} zapisanych myśli
            </p>
          </div>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="w-12 h-12 rounded-2xl gradient-brand text-white flex items-center justify-center shadow-lg shadow-brand-500/30 active:scale-90 transition-all cursor-pointer"
        >
          <StickyNote size={24} />
        </button>
      </header>

      {/* Search Bar */}
      <div className="relative mb-8 group">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-brand-400 transition-colors" />
        <input 
          type="text" 
          placeholder="Szukaj w notatkach..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-4 rounded-2xl bg-surface-2 border border-border focus:border-brand-500/50 focus:ring-4 focus:ring-brand-500/5 transition-all outline-none text-sm font-medium"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-brand-400" />
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="text-center py-20 opacity-40">
          <div className="w-20 h-20 rounded-[2rem] bg-surface-2 flex items-center justify-center mx-auto mb-6 border border-border rotate-3">
             <StickyNote size={32} className="-rotate-3" />
          </div>
          <p className="font-black text-sm uppercase tracking-tighter">Brak notatek</p>
          <p className="text-xs mt-1">Stwórz swoją pierwszą notatkę!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredNotes.map((note) => (
            <div 
              key={note.id}
              onMouseDown={() => startPress(note)}
              onMouseUp={endPress}
              onMouseLeave={endPress}
              onTouchStart={() => startPress(note)}
              onTouchEnd={endPress}
              onContextMenu={(e) => e.preventDefault()}
              className={`p-5 rounded-3xl border transition-all duration-300 relative group flex flex-col cursor-pointer active:scale-[0.98] select-none ${note.is_pinned ? 'ring-2 ring-brand-500/20' : ''}`}
              style={{ 
                backgroundColor: note.color.startsWith('#') ? `${note.color}15` : note.color,
                borderColor: note.color,
                boxShadow: `0 4px 20px -5px ${note.color}40`
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-black text-base tracking-tight leading-tight">{note.title}</h3>
                <div className="flex items-center gap-1">
                  {note.is_pinned && <Pin size={14} className="text-brand-500" />}
                </div>
              </div>
              
              <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap flex-1 line-clamp-6">
                {note.content}
              </p>
              
              <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted uppercase tracking-widest">
                  {new Date(note.created_at).toLocaleDateString("pl-PL")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Context Menu Modal */}
      {longPressNote && (
        <div className="fixed inset-0 z-[150] flex items-end justify-center bg-black/60 backdrop-blur-sm p-6 pb-24 animate-fade-in" onClick={() => setLongPressNote(null)}>
          <div className="w-full max-w-sm bg-surface-1 border border-border rounded-[2.5rem] overflow-hidden shadow-2xl animate-slide-up mb-4" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-border bg-surface-2/50">
              <h3 className="font-black text-sm uppercase tracking-widest text-muted">{longPressNote.title || "Notatka"}</h3>
            </div>
            <div className="p-2">
              <button 
                onClick={() => { setEditingNote(longPressNote); setTitle(longPressNote.title); setContent(longPressNote.content); setColor(longPressNote.color); setIsAdding(true); setLongPressNote(null); }}
                className="w-full p-4 flex items-center gap-4 hover:bg-surface-2 rounded-2xl transition-all font-bold text-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <Edit2 size={18} />
                </div>
                Edytuj treść
              </button>
              
              <button 
                onClick={() => { togglePin(longPressNote); setLongPressNote(null); }}
                className="w-full p-4 flex items-center gap-4 hover:bg-surface-2 rounded-2xl transition-all font-bold text-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
                  {longPressNote.is_pinned ? <PinOff size={18} /> : <Pin size={18} />}
                </div>
                {longPressNote.is_pinned ? "Odepnij" : "Przypnij na górę"}
              </button>

              <button 
                onClick={() => { deleteNote(longPressNote.id); setLongPressNote(null); }}
                className="w-full p-4 flex items-center gap-4 hover:bg-red-500/5 text-red-500 rounded-2xl transition-all font-bold text-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <Trash2 size={18} />
                </div>
                Usuń notatkę
              </button>
            </div>
            <button 
              onClick={() => setLongPressNote(null)}
              className="w-full p-6 text-center text-xs font-black uppercase tracking-widest text-muted border-t border-border"
            >
              Anuluj
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(isAdding || editingNote) && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-6 animate-fade-in" onClick={resetForm}>
          <div className="w-full max-w-md bg-surface-1 border border-border rounded-[2.5rem] p-8 shadow-2xl animate-pop-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-8 px-1">
              <h2 className="text-xl font-black">{editingNote ? "Edytuj notatkę" : "Nowa notatka"}</h2>
              <button onClick={resetForm} className="p-2 rounded-full bg-surface-2 text-muted"><X size={20} /></button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 block px-1">Tytuł</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="O czym myślisz?"
                  className="w-full bg-surface-2 border border-border rounded-2xl px-5 py-4 text-base font-bold outline-none focus:border-brand-500 transition-all font-body"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 block px-1">Tresc</label>
                <textarea 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Tutaj wpisz treść notatki..."
                  rows={5}
                  className="w-full bg-surface-2 border border-border rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:border-brand-500 transition-all resize-none font-body"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted mb-3 block px-1">Kolor</label>
                <div className="flex flex-wrap gap-2 px-1">
                  {colors.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      className={`w-9 h-9 rounded-xl border-2 transition-all active:scale-90 ${color === c.value ? 'ring-2 ring-brand-500 ring-offset-2 ring-offset-surface-1' : ''}`}
                      style={{ backgroundColor: c.value, borderColor: color === c.value ? 'transparent' : 'rgba(0,0,0,0.1)' }}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={!title.trim()}
                  className="w-full py-4 rounded-2xl gradient-brand text-white font-black text-sm uppercase tracking-widest shadow-lg shadow-brand-500/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {editingNote ? "Zaktualizuj" : "Zapisz notatkę"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
