"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { 
  Plane, 
  Plus, 
  Calendar, 
  MapPin, 
  X, 
  Loader2,
  CheckCircle2,
  Circle,
  Edit2,
  Trash2,
  Save,
  Check,
  ChevronDown,
  ChevronUp,
  ShoppingBag
} from "lucide-react";
import { useToast } from "@/lib/ToastContext";

export default function TripsClient({ user }: { user: User }) {
  const [trips, setTrips] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingTrip, setEditingTrip] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [newTrip, setNewTrip] = useState({ name: "", destination: "", date: "" });
  const [addingItemTo, setAddingItemTo] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [expandedTrips, setExpandedTrips] = useState<Set<string>>(new Set());
  const supabase = createClient();
  const { showToast } = useToast();

  const fetchTrips = async () => {
    const { data } = await supabase
      .from("trips")
      .select("*, trip_items(*)")
      .order("created_at", { ascending: false });
    if (data) setTrips(data);
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  async function createTrip(e: React.FormEvent) {
    e.preventDefault();
    if (!newTrip.name) return;
    setLoading(true);

    const { data: tripData } = await supabase
      .from("trips")
      .insert({
        user_id: user.id,
        name: newTrip.name,
        destination: newTrip.destination,
        start_date: newTrip.date || null
      })
      .select()
      .single();

    if (tripData) {
      if (newTrip.date) {
        await supabase.from("calendar_events").insert({
          user_id: user.id,
          title: `Trip: ${newTrip.name}`,
          event_date: newTrip.date,
          category: "trip"
        });
      }

      await supabase.from("trip_items").insert([
        { trip_id: tripData.id, name: "Paszport / ID" },
        { trip_id: tripData.id, name: "Ubrania" },
        { trip_id: tripData.id, name: "Ładowarka" }
      ]);

      setNewTrip({ name: "", destination: "", date: "" });
      setShowAdd(false);
      fetchTrips();
      showToast("Podróż utworzona!", "success");
    }
    setLoading(false);
  }

  async function updateTrip(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTrip.name) return;
    setLoading(true);

    const { error } = await supabase
      .from("trips")
      .update({
        name: editingTrip.name,
        destination: editingTrip.destination,
        start_date: editingTrip.start_date || null
      })
      .eq("id", editingTrip.id);

    if (!error) {
      setEditingTrip(null);
      fetchTrips();
      showToast("Podróż zaktualizowana", "success");
    }
    setLoading(false);
  }

  async function deleteTrip(id: string) {
    if (!confirm("Czy na pewno chcesz usunąć tę podróż?")) return;
    await supabase.from("trip_items").delete().eq("trip_id", id);
    await supabase.from("trips").delete().eq("id", id);
    fetchTrips();
    showToast("Podróż usunięta", "info");
  }

  async function exportToShoppingList(trip: any) {
    if (!trip.trip_items || trip.trip_items.length === 0) {
      showToast("Lista jest pusta", "info");
      return;
    }

    setLoading(true);
    // 1. Create a new shopping list
    const { data: newList, error: listError } = await supabase
      .from("lists")
      .insert({
        user_id: user.id,
        name: `Pakowanie: ${trip.name}`,
        status: "active"
      })
      .select()
      .single();

    if (newList) {
      // 2. Add all trip items to the shopping list
      const itemsToInsert = trip.trip_items.map((item: any) => ({
        list_id: newList.id,
        user_id: user.id,
        name: item.name,
        is_completed: item.is_packed,
        category: "Podróże"
      }));

      const { error: itemsError } = await supabase.from("items").insert(itemsToInsert);

      if (!itemsError) {
        showToast("Dodano do List Zakupów!", "success");
      }
    }
    setLoading(false);
  }

  function toggleExpand(id: string) {
    const newSet = new Set(expandedTrips);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedTrips(newSet);
  }

  async function toggleItem(itemId: string, current: boolean) {
    await supabase.from("trip_items").update({ is_packed: !current }).eq("id", itemId);
    fetchTrips();
  }

  async function addTripItem(tripId: string) {
    if (!newItemName.trim()) return;
    const { error } = await supabase.from("trip_items").insert({
      trip_id: tripId,
      name: newItemName.trim()
    });
    if (!error) {
      setNewItemName("");
      setAddingItemTo(null);
      fetchTrips();
      showToast("Dodano do listy", "success");
    }
  }

  async function removeTripItem(itemId: string) {
    const { error } = await supabase.from("trip_items").delete().eq("id", itemId);
    if (!error) {
      fetchTrips();
    }
  }

  return (
    <div className="flex-1 pb-48 animate-fade-in px-6 pt-6 max-w-4xl mx-auto">
      <header className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ fontFamily: "var(--font-display)" }}>
            Podróże
          </h1>
          <p className="text-sm opacity-50">Zorganizuj swój wyjazd i pakowanie</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)}
          className="w-12 h-12 rounded-2xl gradient-brand flex items-center justify-center text-white shadow-lg shadow-brand-500/20 cursor-pointer active:scale-95 transition-transform"
        >
          <Plus size={24} />
        </button>
      </header>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 pt-10 sm:pt-20">
          <form 
            onSubmit={createTrip}
            className="w-full max-w-md bg-surface-1 border border-border rounded-[2.5rem] p-8 shadow-2xl animate-pop-in"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold">Nowa podróż</h2>
              <button type="button" onClick={() => setShowAdd(false)} className="p-2 -mr-2 text-muted"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <input 
                placeholder="Nazwa wyjazdu..."
                required
                value={newTrip.name}
                onChange={e => setNewTrip({...newTrip, name: e.target.value})}
                className="w-full p-4 rounded-2xl bg-surface-2 border border-border outline-none focus:border-brand-500"
              />
              <input 
                placeholder="Gdzie jedziesz?"
                value={newTrip.destination}
                onChange={e => setNewTrip({...newTrip, destination: e.target.value})}
                className="w-full p-4 rounded-2xl bg-surface-2 border border-border outline-none focus:border-brand-500"
              />
              <input 
                type="date"
                value={newTrip.date}
                onChange={e => setNewTrip({...newTrip, date: e.target.value})}
                className="w-full p-4 rounded-2xl bg-surface-2 border border-border outline-none focus:border-brand-500"
              />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="w-full mt-8 py-4 rounded-2xl gradient-brand text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : "Zapisz podróż"}
            </button>
          </form>
        </div>
      )}

      {/* Edit Modal */}
      {editingTrip && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 pt-10 sm:pt-20">
          <form 
            onSubmit={updateTrip}
            className="w-full max-w-md bg-surface-1 border border-border rounded-[2.5rem] p-8 shadow-2xl animate-pop-in"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold">Edytuj podróż</h2>
              <button type="button" onClick={() => setEditingTrip(null)} className="p-2 -mr-2 text-muted"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <input 
                required
                value={editingTrip.name}
                onChange={e => setEditingTrip({...editingTrip, name: e.target.value})}
                className="w-full p-4 rounded-2xl bg-surface-2 border border-border outline-none focus:border-brand-500"
              />
              <input 
                value={editingTrip.destination || ""}
                onChange={e => setEditingTrip({...editingTrip, destination: e.target.value})}
                className="w-full p-4 rounded-2xl bg-surface-2 border border-border outline-none focus:border-brand-500"
              />
              <input 
                type="date"
                value={editingTrip.start_date || ""}
                onChange={e => setEditingTrip({...editingTrip, start_date: e.target.value})}
                className="w-full p-4 rounded-2xl bg-surface-2 border border-border outline-none focus:border-brand-500"
              />
            </div>
            <div className="flex gap-3 mt-8">
              <button 
                type="button"
                onClick={() => deleteTrip(editingTrip.id)}
                className="px-6 py-4 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-500 font-bold"
              >
                <Trash2 size={18} />
              </button>
              <button 
                type="submit"
                disabled={loading}
                className="flex-1 py-4 rounded-2xl gradient-brand text-white font-bold flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <div className="flex items-center gap-2"><Save size={18} /> Zapisz</div>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Trips Grid - Ticket Effect */}
      <div className="grid grid-cols-1 gap-6">
        {trips.map(trip => {
          const isExpanded = expandedTrips.has(trip.id);
          const packedCount = trip.trip_items?.filter((i: any) => i.is_packed).length || 0;
          const totalCount = trip.trip_items?.length || 0;
          const progress = totalCount > 0 ? (packedCount / totalCount) * 100 : 0;

          return (
            <div key={trip.id} className="relative group animate-fade-in group w-full">
              {/* Ticket Card Wrapper */}
              <div className="bg-surface-2 border border-border/50 rounded-[2rem] overflow-hidden flex flex-col shadow-lg transition-all duration-500 hover:shadow-brand-500/10">
                
                {/* Horizontal Header Part */}
                <div 
                  className="p-5 relative flex items-center gap-4 cursor-pointer"
                  onClick={() => toggleExpand(trip.id)}
                >
                  <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-400 shrink-0">
                    <Plane size={24} className={isExpanded ? "rotate-0 transition-transform" : "-rotate-12 transition-transform"} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-brand-400 mb-0.5">
                      <MapPin size={12} />
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] truncate">{trip.destination || "BOARDING PASS"}</span>
                    </div>
                    <h3 className="text-lg font-bold tracking-tight text-text-primary capitalize truncate leading-tight">{trip.name}</h3>
                    
                    <div className="flex items-center gap-3 mt-1">
                      {trip.start_date && (
                        <div className="flex items-center gap-1 text-[10px] text-text-muted font-medium">
                          <Calendar size={10} />
                          <span>{new Date(trip.start_date).toLocaleDateString("pl-PL")}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="flex-1 h-1 w-12 bg-surface-3 rounded-full overflow-hidden shrink-0">
                          <div className="h-full bg-brand-500 transition-all duration-700" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-[10px] text-brand-500 font-bold">{packedCount}/{totalCount}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setEditingTrip(trip); }}
                      className="w-10 h-10 rounded-xl bg-surface-3 border border-border/50 flex items-center justify-center text-text-muted hover:text-brand-400 active:scale-90 transition-all"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      disabled={loading}
                      onClick={(e) => { e.stopPropagation(); exportToShoppingList(trip); }}
                      className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 hover:bg-brand-500 hover:text-white transition-all shadow-sm"
                      title="Eksportuj do zakupów"
                    >
                      <ShoppingBag size={16} />
                    </button>
                    <div className="text-text-muted/30">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>

                  {/* Ticket Notches */}
                  <div className="absolute -left-2.5 bottom-0 w-5 h-5 rounded-full bg-[var(--color-surface)] border border-border/50 z-10 translate-y-1/2" />
                  <div className="absolute -right-2.5 bottom-0 w-5 h-5 rounded-full bg-[var(--color-surface)] border border-border/50 z-10 translate-y-1/2" />
                </div>

                {/* Perforated Divider */}
                <div className="relative px-6">
                  <div className="h-px w-full border-t border-dashed border-border/50" />
                </div>

                {/* Bottom Part - Collapsible Packing List */}
                {isExpanded && (
                  <div className="p-6 pt-8 animate-slide-up" style={{ background: "linear-gradient(to bottom, transparent, var(--color-surface-3)/10)" }}>
                    <div className="flex items-center justify-between mb-5 px-1">
                      <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-text-muted flex items-center gap-2">
                        <div className="w-1 h-3 rounded-full bg-brand-500" />
                        LISTA PAKOWANIA
                      </h4>
                      
                      {addingItemTo === trip.id ? (
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <input 
                            autoFocus
                            placeholder="..."
                            value={newItemName}
                            onChange={e => setNewItemName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addTripItem(trip.id)}
                            className="bg-surface-3 border border-border rounded-lg px-2 py-1 text-[10px] outline-none focus:border-brand-500 w-24"
                          />
                          <button onClick={() => addTripItem(trip.id)} className="text-green-500"><Check size={14} /></button>
                          <button onClick={() => setAddingItemTo(null)} className="text-red-500"><X size={14} /></button>
                        </div>
                      ) : (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setAddingItemTo(trip.id); setNewItemName(""); }}
                          className="text-[10px] font-bold text-brand-400 hover:text-brand-300 flex items-center gap-1"
                        >
                          <Plus size={12} /> DODAJ
                        </button>
                      )}
                    </div>

                    <div className="space-y-1 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                      {trip.trip_items?.length === 0 ? (
                        <p className="text-[10px] text-center py-6 text-text-muted italic opacity-40">Brak rzeczy do spakowania</p>
                      ) : (
                        trip.trip_items?.map((item: any) => (
                          <div key={item.id} className="flex items-center justify-between p-2.5 rounded-xl bg-surface-1/30 border border-border/10 group/item hover:border-brand-500/20 transition-all">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleItem(item.id, item.is_packed); }}
                              className="flex-1 flex items-center gap-3 text-left"
                            >
                              <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${item.is_packed ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-surface-3 border border-border'}`}>
                                {item.is_packed && <Check size={12} strokeWidth={4} />}
                              </div>
                              <span className={`text-xs ${item.is_packed ? 'line-through opacity-30 italic font-normal' : 'font-semibold text-text-primary'}`}>
                                {item.name}
                              </span>
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); removeTripItem(item.id); }}
                              className="opacity-0 group-hover/item:opacity-100 p-1.5 text-red-500/30 hover:text-red-500 transition-all"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {trips.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-30 text-center">
            <Plane size={48} className="mb-4" />
            <p className="text-sm font-medium italic">Twoja przygoda czeka!<br/>Dodaj pierwszą podróż.</p>
          </div>
        )}
      </div>
    </div>
  );
}
