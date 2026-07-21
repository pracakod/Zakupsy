"use client";

import { useState, useEffect, useMemo } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon, 
  Clock, 
  Tag, 
  X,
  Trash2,
  ArrowLeft,
  ShoppingBag,
  Bell,
  Star,
  Gift,
  Grid,
  Layers
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/ToastContext";

interface CalendarEvent {
  id: string;
  title: string;
  event_date: string;
  category: string;
  is_annual: boolean;
  icon?: string;
}

const CATEGORIES = [
  { id: 'shopping', name: 'Zakupy', color: 'bg-emerald-500', icon: ShoppingBag },
  { id: 'holiday', name: 'Święto', color: 'bg-red-500', icon: Gift },
  { id: 'important', name: 'Ważne', color: 'bg-purple-500', icon: Star },
  { id: 'other', name: 'Inne', color: 'bg-blue-500', icon: Bell },
];

// Helper: calculate Easter Sunday for a given year (Anonymous Gregorian algorithm)
function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-indexed
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

function getDynamicHolidays(year: number): CalendarEvent[] {
  const easter = getEasterDate(year);
  const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  return [
    { id: `dyn-wielkanoc-${year}`, title: 'Wielkanoc', event_date: fmt(easter), category: 'holiday', is_annual: false, icon: '🐣' },
    { id: `dyn-wielkanoc2-${year}`, title: 'Poniedziałek Wielkanocny', event_date: fmt(addDays(easter, 1)), category: 'holiday', is_annual: false, icon: '🐰' },
    { id: `dyn-zielone-${year}`, title: 'Zielone Świątki', event_date: fmt(addDays(easter, 49)), category: 'holiday', is_annual: false, icon: '🌿' },
    { id: `dyn-bozecial-${year}`, title: 'Boże Ciało', event_date: fmt(addDays(easter, 60)), category: 'holiday', is_annual: false, icon: '✝️' },
  ];
}

const STATIC_HOLIDAYS: CalendarEvent[] = [
  { id: 'static-1', title: 'Nowy Rok', event_date: '2020-01-01', category: 'holiday', is_annual: true, icon: '🎉' },
  { id: 'static-2', title: 'Trzech Króli', event_date: '2020-01-06', category: 'holiday', is_annual: true, icon: '👑' },
  { id: 'static-3', title: 'Walentynki', event_date: '2020-02-14', category: 'holiday', is_annual: true, icon: '❤️' },
  { id: 'static-4', title: 'Dzień Kobiet', event_date: '2020-03-08', category: 'important', is_annual: true, icon: '🌷' },
  { id: 'static-5', title: 'Święto Pracy', event_date: '2020-05-01', category: 'holiday', is_annual: true, icon: '🛠️' },
  { id: 'static-6', title: 'Święto Konstytucji 3 Maja', event_date: '2020-05-03', category: 'holiday', is_annual: true, icon: '🇵🇱' },
  { id: 'static-7', title: 'Dzień Matki', event_date: '2020-05-26', category: 'important', is_annual: true, icon: '👩‍👧‍👦' },
  { id: 'static-8', title: 'Dzień Dziecka', event_date: '2020-06-01', category: 'important', is_annual: true, icon: '🎈' },
  { id: 'static-9', title: 'Dzień Ojca', event_date: '2020-06-23', category: 'important', is_annual: true, icon: '👨‍👦' },
  { id: 'static-10', title: 'Wniebowzięcie NMP', event_date: '2020-08-15', category: 'holiday', is_annual: true, icon: '🕊️' },
  { id: 'static-11', title: 'Dzień Chłopaka', event_date: '2020-09-30', category: 'important', is_annual: true, icon: '👦' },
  { id: 'static-12', title: 'Halloween', event_date: '2020-10-31', category: 'other', is_annual: true, icon: '🎃' },
  { id: 'static-13', title: 'Wszystkich Świętych', event_date: '2020-11-01', category: 'holiday', is_annual: true, icon: '🕯️' },
  { id: 'static-14', title: 'Dzień Zaduszny', event_date: '2020-11-02', category: 'holiday', is_annual: true, icon: '🪔' },
  { id: 'static-15', title: 'Święto Niepodległości', event_date: '2020-11-11', category: 'holiday', is_annual: true, icon: '🇵🇱' },
  { id: 'static-16', title: 'Andrzejki', event_date: '2020-11-29', category: 'other', is_annual: true, icon: '🔮' },
  { id: 'static-17', title: 'Mikołajki', event_date: '2020-12-06', category: 'holiday', is_annual: true, icon: '🎅' },
  { id: 'static-18', title: 'Wigilia', event_date: '2020-12-24', category: 'holiday', is_annual: true, icon: '🐟' },
  { id: 'static-19', title: 'Boże Narodzenie', event_date: '2020-12-25', category: 'holiday', is_annual: true, icon: '🎄' },
  { id: 'static-20', title: 'Drugi dzień Świąt', event_date: '2020-12-26', category: 'holiday', is_annual: true, icon: '🎁' },
  { id: 'static-21', title: 'Sylwester', event_date: '2020-12-31', category: 'holiday', is_annual: true, icon: '🥂' }
];

export default function CalendarClient({ user }: { user: User }) {
  const router = useRouter();
  const { showToast } = useToast();
  const supabase = createClient();
  
  const formatDateLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [viewMode, setViewMode] = useState<'month' | 'quarter' | 'year'>('month');
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('cache_calendar_events');
      if (cached) return JSON.parse(cached);
    }
    // Default to at least the fixed holidays if no cache
    const thisYear = new Date().getFullYear();
    return [...STATIC_HOLIDAYS, ...getDynamicHolidays(thisYear)];
  });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [longPressEvent, setLongPressEvent] = useState<CalendarEvent | null>(null);
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [isCreatingList, setIsCreatingList] = useState(false);
  
  const [newEvent, setNewEvent] = useState({
    title: "",
    category: "shopping",
    is_annual: false,
    icon: ""
  });

  useEffect(() => {
    fetchEvents();
  }, [user.id]);

  async function fetchEvents() {
    setLoading(true);
    const { data, error } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("user_id", user.id);
    
    const thisYear = new Date().getFullYear();
    const dynamicHolidays = [
      ...getDynamicHolidays(thisYear - 1),
      ...getDynamicHolidays(thisYear),
      ...getDynamicHolidays(thisYear + 1),
    ];
    const allFixed = [...STATIC_HOLIDAYS, ...dynamicHolidays];

    if (!error && data) {
      const combined = [...data, ...allFixed];
      setEvents(combined);
      localStorage.setItem('cache_calendar_events', JSON.stringify(combined));
    } else {
      setEvents(allFixed);
    }
    setLoading(false);
  }

  async function addEvent() {
    if (!newEvent.title.trim()) return;
    
    const previousEvents = [...events];
    const eventDate = formatDateLocal(selectedDate);
    const tempId = `temp-${Date.now()}`;
    const optimisticEvent: CalendarEvent = {
        id: tempId,
        title: newEvent.title,
        category: newEvent.category,
        event_date: eventDate,
        is_annual: newEvent.is_annual,
        icon: newEvent.icon || undefined
    };

    // Optimistic update
    setEvents((prev: CalendarEvent[]) => [...prev, optimisticEvent]);
    setIsAdding(false);
    setNewEvent({ title: "", category: "shopping", is_annual: false, icon: "" });
    
    const { data, error } = await supabase
      .from("calendar_events")
      .insert({
        title: optimisticEvent.title,
        category: optimisticEvent.category,
        event_date: eventDate,
        is_annual: optimisticEvent.is_annual,
        icon: optimisticEvent.icon || null,
        user_id: user.id
      })
      .select()
      .single();
    
    if (error) {
      setEvents(previousEvents);
      showToast("Błąd przy dodawaniu wydarzenia", "error");
    } else if (data) {
      setEvents((prev: CalendarEvent[]) => prev.map((e: CalendarEvent) => e.id === tempId ? data : e));
      showToast("Wydarzenie dodane!", "success");
      localStorage.setItem('cache_calendar_events', JSON.stringify([...previousEvents, data]));
    }
  }

  async function updateEvent() {
    if (!editingEvent || !editingEvent.title.trim()) return;

    const updatedEvent = { ...editingEvent };
    const previousEvents = [...events];
    
    // Optimistic update
    setEvents((prev: CalendarEvent[]) => prev.map((e: CalendarEvent) => e.id === updatedEvent.id ? updatedEvent : e));
    setEditingEvent(null);

    const { error } = await supabase
      .from("calendar_events")
      .update({
        title: updatedEvent.title,
        category: updatedEvent.category,
        is_annual: updatedEvent.is_annual,
        icon: updatedEvent.icon || null
      })
      .eq("id", updatedEvent.id);

    if (error) {
      setEvents(previousEvents);
      showToast("Błąd przy aktualizacji: " + error.message, "error");
    } else {
      showToast("Zaktualizowano wydarzenie", "success");
    }
  }

  async function createListFromEvent(event: CalendarEvent) {
    if (isCreatingList) return;
    setIsCreatingList(true);
    try {
      const { data: list, error: listError } = await supabase
        .from("lists")
        .insert({
          name: event.title,
          user_id: user.id,
          status: "active",
          icon: event.icon || "🛒"
        })
        .select()
        .single();

      if (listError) throw listError;

      showToast("Utworzono listę zakupów!", "success");
      setLongPressEvent(null);
      router.push(`/lists/${list.id}`);
    } catch (error) {
      showToast("Błąd podczas tworzenia listy", "error");
    } finally {
      setIsCreatingList(false);
    }
  }

  const startPress = (event: CalendarEvent) => {
    const timer = setTimeout(() => {
      setLongPressEvent(event);
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

  async function deleteEvent(id: string) {
    const previousEvents = [...events];
    
    // Optimistic remove
    setEvents((prev: CalendarEvent[]) => prev.filter((e: CalendarEvent) => e.id !== id));
    
    const { error } = await supabase.from("calendar_events").delete().eq("id", id);
    
    if (error) {
      setEvents(previousEvents);
      showToast("Błąd przy usuwaniu: " + error.message, "error");
    } else {
      showToast("Usunięto wydarzenie", "success");
    }
  }

  // Calendar Logic
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Adjust to start Monday
  };

  const getMonthData = (year: number, month: number) => {
    const totalDays = daysInMonth(year, month);
    const startOffset = firstDayOfMonth(year, month);
    
    const days = [];
    const prevMonthDays = daysInMonth(year, month - 1);
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, current: false, date: new Date(year, month - 1, prevMonthDays - i) });
    }
    for (let i = 1; i <= totalDays; i++) {
        days.push({ day: i, current: true, date: new Date(year, month, i) });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
        days.push({ day: i, current: false, date: new Date(year, month + 1, i) });
    }
    return days;
  };

  const selectedDateEvents = events.filter(e => {
    const eventDate = new Date(e.event_date);
    if (e.is_annual) {
        return eventDate.getDate() === selectedDate.getDate() && 
               eventDate.getMonth() === selectedDate.getMonth();
    }
    return e.event_date === formatDateLocal(selectedDate);
  });

  const changeMonth = (offset: number) => {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() + offset);
    setCurrentDate(next);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  const isSelected = (date: Date) => {
    return date.getDate() === selectedDate.getDate() && 
           date.getMonth() === selectedDate.getMonth() && 
           date.getFullYear() === selectedDate.getFullYear();
  };

  const isPublicHoliday = (date: Date) => {
    const dStr = formatDateLocal(date);
    return events.some(e => {
        if (e.category !== 'holiday') return false;
        if (e.is_annual) {
            const eventDate = new Date(e.event_date);
            return eventDate.getDate() === date.getDate() && 
                   eventDate.getMonth() === date.getMonth();
        }
        return e.event_date === dStr;
    });
  };

  const hasEvent = (date: Date) => {
    const dStr = formatDateLocal(date);
    return events.some(e => {
        if (e.is_annual) {
            const eventDate = new Date(e.event_date);
            return eventDate.getDate() === date.getDate() && 
                   eventDate.getMonth() === date.getMonth();
        }
        return e.event_date === dStr;
    });
  };

  return (
    <div className="flex-1 pb-48 animate-fade-in relative overflow-hidden min-h-screen select-none no-long-press-menu">
      {/* Header */}
      <header className="px-6 pt-10 mb-8 relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-brand-500 transition-colors active:scale-90"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black tracking-tighter" style={{ fontFamily: "var(--font-display)" }}>
              Kalendarz
            </h1>
            <button 
                onClick={() => {
                   if (viewMode === 'month') setViewMode('quarter');
                   else if (viewMode === 'quarter') setViewMode('year');
                   else setViewMode('month');
                }}
                className="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-brand-500 hover:bg-brand-500/10 transition-all active:scale-90"
                title="Zmień widok"
            >
                {viewMode === 'month' ? <Layers size={20} /> : viewMode === 'quarter' ? <Grid size={20} /> : <CalendarIcon size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Calendar Card */}
      <div className="px-6 mb-8 relative z-10">
        <div className="bg-surface-2/40 backdrop-blur-xl border border-border rounded-[2.5rem] p-6 shadow-2xl overflow-hidden">
          {/* Month Selector */}
          <div className="flex items-center justify-between mb-8 px-2">
            <h2 className="text-xl font-black tracking-tight capitalize">
              {viewMode === 'month' || viewMode === 'quarter'
                 ? currentDate.toLocaleDateString("pl-PL", { month: 'long', year: 'numeric' })
                 : currentDate.toLocaleDateString("pl-PL", { year: 'numeric' })
              }
            </h2>
            <div className="flex gap-2">
              <button 
                onClick={() => changeMonth(viewMode === 'year' ? -12 : (viewMode === 'quarter' ? -3 : -1))} 
                className="p-2.5 rounded-xl bg-surface-3 hover:bg-surface-4 transition-colors"
                title="Poprzedni"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                onClick={() => changeMonth(viewMode === 'year' ? 12 : (viewMode === 'quarter' ? 3 : 1))} 
                className="p-2.5 rounded-xl bg-surface-3 hover:bg-surface-4 transition-colors"
                title="Następny"
               >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {viewMode === 'year' && (
            <div className="grid grid-cols-3 gap-3 animate-fade-in pb-2">
                {Array.from({ length: 12 }).map((_, i) => {
                    const mDate = new Date(currentDate.getFullYear(), i, 1);
                    const isCurrentMonthDate = new Date().getMonth() === i && new Date().getFullYear() === currentDate.getFullYear();
                    return (
                        <button
                            key={i}
                            onClick={() => {
                                setCurrentDate(mDate);
                                setViewMode('month');
                            }}
                            className={`p-4 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-95 ${
                                isCurrentMonthDate ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30' : 'bg-surface-3 hover:bg-surface-4 text-text-primary'
                            }`}
                        >
                            <span className="font-black capitalize text-xs">{mDate.toLocaleDateString('pl-PL', { month: 'short' })}</span>
                        </button>
                    )
                })}
            </div>
          )}

          {(viewMode === 'month' || viewMode === 'quarter') && (
            <div className={`flex flex-col gap-8 ${viewMode === 'quarter' ? 'h-[50vh] overflow-y-auto custom-scrollbar pr-2' : ''}`}>
                {(viewMode === 'quarter' ? [-1, 0, 1] : [0]).map(offset => {
                    const mDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
                    const data = getMonthData(mDate.getFullYear(), mDate.getMonth());
                    
                    return (
                        <div key={offset} className="animate-fade-in relative">
                            {viewMode === 'quarter' && (
                                <h3 className="text-sm font-black capitalize mb-4 text-brand-500 text-center bg-surface-2/40 backdrop-blur-md sticky top-0 z-10 py-2 rounded-xl">
                                    {mDate.toLocaleDateString("pl-PL", { month: 'long', year: 'numeric' })}
                                </h3>
                            )}
                            {/* Weekdays Row */}
                            <div className="grid grid-cols-7 mb-2">
                                {['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'].map((d, index) => (
                                <div 
                                    key={d} 
                                    className={`text-center font-black uppercase tracking-widest opacity-40 py-1 ${viewMode === 'quarter' ? 'text-[8px]' : 'text-[10px]'} ${
                                        index === 6 ? 'text-red-500' : index === 5 ? 'text-brand-400' : 'text-text-muted'
                                    }`}
                                >
                                    {d}
                                </div>
                                ))}
                            </div>

                            {/* Days Grid */}
                            <div className="grid grid-cols-7 gap-1">
                                {data.map((d, i) => (
                                <button
                                    key={i}
                                    onClick={() => { setSelectedDate(d.date); if(viewMode==='quarter') { setCurrentDate(d.date); setViewMode('month');} }}
                                    className={`aspect-square rounded-2xl flex flex-col items-center justify-center relative transition-all duration-300 active:scale-90
                                    ${!d.current ? 'opacity-20' : 'opacity-100'}
                                    ${isSelected(d.date) ? 'bg-brand-500 shadow-lg shadow-brand-500/30' : 'hover:bg-surface-3'}
                                    ${viewMode === 'quarter' && isSelected(d.date) ? 'scale-100' : isSelected(d.date) ? 'scale-105' : ''}
                                    `}
                                >
                                    <span className={`font-black ${viewMode === 'quarter' ? 'text-xs' : 'text-sm'} ${
                                        isSelected(d.date) 
                                            ? 'text-white' 
                                            : (d.date.getDay() === 0 || isPublicHoliday(d.date))
                                                ? 'text-red-500' 
                                                : d.date.getDay() === 6 
                                                    ? 'text-brand-400'
                                                    : 'text-text-primary'
                                    }`}>
                                    {d.day}
                                    </span>
                                    
                                    {hasEvent(d.date) && !isSelected(d.date) && (
                                    <div className="w-1 h-1 rounded-full bg-brand-500 mt-0.5" />
                                    )}
                                    
                                    {isToday(d.date) && !isSelected(d.date) && (
                                    <div className="absolute top-1 right-1 w-1 h-1 rounded-full bg-brand-500 ring-2 ring-brand-500/20" />
                                    )}
                                </button>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Agenda for Selected Day */}
      <div className="px-6 relative z-10">
        <div className="flex items-center justify-between mb-6 px-1">
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm font-black uppercase tracking-widest text-text-muted">
                {selectedDate.toLocaleDateString("pl-PL", { day: 'numeric', month: 'long' })}
            </h3>
            {isToday(selectedDate) && (
              <span className="px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-500 text-[9px] font-black uppercase tracking-widest">Dziś</span>
            )}
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 text-xs font-black text-brand-500 uppercase tracking-widest"
          >
            <Plus size={14} /> Dodaj
          </button>
        </div>

        {selectedDateEvents.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center opacity-30 bg-surface-2/40 border border-dashed border-border rounded-[2rem]">
            <CalendarIcon size={32} className="mb-4" />
            <p className="text-xs font-bold uppercase tracking-widest">Brak wydarzeń na ten dzień</p>
          </div>
        ) : (
          <div className="space-y-4">
            {selectedDateEvents.map((e) => {
              const categoryData = CATEGORIES.find(c => c.id === e.category) || CATEGORIES[3];
              const CategoryIcon = categoryData.icon;
              const catColor = categoryData.color;
              
              return (
                <div 
                    key={e.id}
                    className="p-5 rounded-[2rem] bg-surface-2/30 backdrop-blur-xl border border-white/5 flex items-center gap-4 group hover:bg-surface-2/50 transition-all cursor-pointer no-long-press-menu select-none shadow-sm"
                    onMouseDown={() => startPress(e)}
                    onMouseUp={endPress}
                    onMouseLeave={endPress}
                    onTouchStart={() => startPress(e)}
                    onTouchEnd={endPress}
                    onClick={() => {
                        if (!longPressEvent) {
                            if (!e.id.startsWith('static-')) setEditingEvent(e);
                            else startPress(e); // For static events, simple click can open info/menu
                        }
                    }}
                    onContextMenu={(event) => event.preventDefault()}
                >
                    <div className={`w-12 h-12 rounded-2xl ${catColor}/10 flex items-center justify-center relative shadow-inner overflow-hidden`}>
                        <div className={`absolute inset-0 bg-gradient-to-br ${catColor.replace('bg-', 'from-')}/10 to-transparent opacity-50`} />
                        {e.icon ? (
                            <span className="text-xl relative z-10">{e.icon}</span>
                        ) : (
                            <CategoryIcon className={`${catColor.replace('bg-', 'text-')} relative z-10`} size={20} />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-text-primary capitalize truncate">{e.title}</h4>
                        <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mt-1 opacity-50 flex items-center gap-2">
                            {categoryData.name}
                            {e.is_annual && <span className="w-1 h-1 rounded-full bg-orange-400" />}
                            {e.is_annual && <span className="text-orange-400/80">Co roku</span>}
                        </p>
                    </div>
                    <div className="opacity-20">
                        <ChevronRight size={16} />
                    </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Event Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6 animate-fade-in" onClick={() => setIsAdding(false)}>
          <div className="w-full max-w-sm bg-surface-1 border border-border rounded-[2.5rem] p-8 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black">Nowe wydarzenie</h3>
                <button onClick={() => setIsAdding(false)} className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center text-text-muted hover:text-brand-500 transition-colors">
                    <X size={20} />
                </button>
            </div>

            <div className="space-y-6">
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2 block ml-1">Nazwa wydarzenia</label>
                    <input 
                        type="text" 
                        value={newEvent.title}
                        onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                        placeholder="Np. Zakupy w Lidlu"
                        className="w-full bg-surface-2 border border-border rounded-2xl px-5 py-4 font-bold text-sm focus:border-brand-500/50 outline-none transition-all"
                        autoFocus
                    />
                </div>

                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-3 block ml-1">Ikona i Kategoria</label>
                    <div className="flex flex-wrap gap-2 mb-6 bg-surface-2/50 p-3 rounded-2xl border border-border/50 max-h-32 overflow-y-auto custom-scrollbar">
                        {['🛒', '🎁', '🎂', '⭐', '🛍️', '🎉', '🍎', '🍷', '🍖', '🍕', '🍺', '☕', '🥖', '🥛', '🍓', '🫐', '🧼', '💊', '🐶', '🚗', '🏠', '🧹', '🔋', '⚽'].map(emoji => (
                            <button
                                key={emoji}
                                onClick={() => setNewEvent({...newEvent, icon: emoji})}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all ${
                                    newEvent.icon === emoji ? 'bg-brand-500 scale-110 shadow-lg text-white' : 'hover:bg-surface-3'
                                }`}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => {
                                    const isHoliday = cat.id === 'holiday' || cat.id === 'important';
                                    setNewEvent({...newEvent, category: cat.id, is_annual: isHoliday || newEvent.is_annual});
                                }}
                                className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                                    newEvent.category === cat.id 
                                        ? 'bg-brand-500 border-brand-500 text-white shadow-lg' 
                                        : 'bg-surface-2 border-border text-text-muted hover:border-brand-500/30'
                                }`}
                            >
                                <cat.icon size={16} className={newEvent.category === cat.id ? 'text-white' : 'text-brand-500'} />
                                <span className="text-[10px] font-black uppercase tracking-widest">{cat.name}</span>
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center justify-between p-4 bg-surface-2 border border-border rounded-2xl">
                        <div className="flex items-center gap-3">
                            <Tag size={16} className="text-orange-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Powtarzaj co roku</span>
                        </div>
                        <button 
                            onClick={() => setNewEvent({...newEvent, is_annual: !newEvent.is_annual})}
                            className={`w-12 h-6 rounded-full relative transition-colors ${newEvent.is_annual ? 'bg-orange-500' : 'bg-surface-3'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${newEvent.is_annual ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>
                </div>

                <div className="pt-4 px-2">
                    <div className="flex items-center gap-3 text-brand-500 mb-6">
                        <Clock size={16} />
                        <span className="text-xs font-bold">{selectedDate.toLocaleDateString("pl-PL", { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                    </div>

                    <button 
                        onClick={addEvent}
                        disabled={!newEvent.title.trim()}
                        className="w-full py-5 rounded-[2rem] bg-brand-500 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-brand-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                    >
                        Zaplanuj
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {editingEvent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6 animate-fade-in" onClick={() => setEditingEvent(null)}>
          <div className="w-full max-w-sm bg-surface-1 border border-border rounded-[2.5rem] p-8 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black">Edytuj wydarzenie</h3>
                <button onClick={() => setEditingEvent(null)} className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center text-text-muted hover:text-brand-500 transition-colors">
                    <X size={20} />
                </button>
            </div>

            <div className="space-y-6">
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2 block ml-1">Nazwa wydarzenia</label>
                    <input 
                        type="text" 
                        value={editingEvent.title}
                        onChange={(e) => setEditingEvent({...editingEvent, title: e.target.value})}
                        className="w-full bg-surface-2 border border-border rounded-2xl px-5 py-4 font-bold text-sm focus:border-brand-500/50 outline-none transition-all"
                    />
                </div>

                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-3 block ml-1">Ikona i Kategoria</label>
                    <div className="flex flex-wrap gap-2 mb-6 bg-surface-2/50 p-3 rounded-2xl border border-border/50 max-h-32 overflow-y-auto custom-scrollbar">
                        {['🛒', '🎁', '🎂', '⭐', '🛍️', '🎉', '🍎', '🍷', '🍖', '🍕', '🍺', '☕', '🥖', '🥛', '🍓', '🫐', '🧼', '💊', '🐶', '🚗', '🏠', '🧹', '🔋', '⚽'].map(emoji => (
                            <button
                                key={emoji}
                                onClick={() => setEditingEvent({...editingEvent, icon: emoji})}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all ${
                                    editingEvent.icon === emoji ? 'bg-brand-500 scale-110 shadow-lg text-white' : 'hover:bg-surface-3'
                                }`}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setEditingEvent({...editingEvent, category: cat.id})}
                                className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                                    editingEvent.category === cat.id 
                                        ? 'bg-brand-500 border-brand-500 text-white shadow-lg' 
                                        : 'bg-surface-2 border-border text-text-muted hover:border-brand-500/30'
                                }`}
                            >
                                <cat.icon size={16} className={editingEvent.category === cat.id ? 'text-white' : 'text-brand-500'} />
                                <span className="text-[10px] font-black uppercase tracking-widest">{cat.name}</span>
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center justify-between p-4 bg-surface-2 border border-border rounded-2xl">
                        <div className="flex items-center gap-3">
                            <Tag size={16} className="text-orange-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Powtarzaj co roku</span>
                        </div>
                        <button 
                            onClick={() => setEditingEvent({...editingEvent, is_annual: !editingEvent.is_annual})}
                            className={`w-12 h-6 rounded-full relative transition-colors ${editingEvent.is_annual ? 'bg-orange-500' : 'bg-surface-3'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${editingEvent.is_annual ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>
                </div>

                <div className="pt-4 px-2">
                    <button 
                        onClick={updateEvent}
                        className="w-full py-5 rounded-[2rem] bg-brand-500 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-brand-500/20 active:scale-95 transition-all"
                    >
                        Zapisz zmiany
                    </button>
                    <button 
                        onClick={() => { deleteEvent(editingEvent.id); setEditingEvent(null); }}
                        className="w-full mt-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-500 opacity-60 hover:opacity-100 transition-opacity"
                    >
                        Usuń wydarzenie
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Long Press Action Menu */}
      {longPressEvent && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md p-6 animate-fade-in" onClick={() => setLongPressEvent(null)}>
          <div className="w-full max-w-sm bg-surface-2 border border-border rounded-[2.5rem] p-6 shadow-2xl animate-pop-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-4 mb-6 px-2">
              <div className="w-12 h-12 rounded-2xl bg-surface-3 flex items-center justify-center text-text-muted">
                {longPressEvent.icon ? <span className="text-2xl">{longPressEvent.icon}</span> : <CalendarIcon size={24} />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg truncate text-text-primary capitalize">{longPressEvent.title}</h3>
                <p className="text-xs text-text-muted">Opcje wydarzenia</p>
              </div>
              <button 
                onClick={() => setLongPressEvent(null)}
                className="w-10 h-10 rounded-full bg-surface-3 flex items-center justify-center text-text-muted"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button 
                onClick={() => createListFromEvent(longPressEvent)}
                disabled={isCreatingList}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-brand-500/10 text-brand-500 hover:bg-brand-500/20 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center">
                  {isCreatingList ? <Clock size={18} className="animate-spin" /> : <ShoppingBag size={18} />}
                </div>
                <div className="flex-1">
                  <span className="font-bold block">Utwórz listę zakupów</span>
                  <span className="text-[10px] opacity-60">Szybkie zakupy pod to wydarzenie</span>
                </div>
              </button>

              {!longPressEvent.id.startsWith('static-') && (
                <>
                  <div className="h-px bg-border/50 my-2" />

                  <button 
                    onClick={() => { setEditingEvent(longPressEvent); setLongPressEvent(null); }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-surface-3 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-surface-3 flex items-center justify-center text-text-muted">
                      <Tag size={18} />
                    </div>
                    <span className="font-semibold text-text-primary">Edytuj wydarzenie</span>
                  </button>

                  <button 
                    onClick={() => { deleteEvent(longPressEvent.id); setLongPressEvent(null); }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-red-500/10 text-red-400 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                      <Trash2 size={18} />
                    </div>
                    <span className="font-semibold">Usuń wydarzenie</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
