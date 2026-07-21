"use client";

import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { 
  Bell, 
  X, 
  Check, 
  Trash2, 
  ArrowLeft,
  Calendar,
  Gift,
  AlertCircle,
  MessageSquare,
  CheckCircle2,
  Inbox,
  Loader2,
  ChevronRight,
  CheckCheck,
  Sparkles
} from "lucide-react";
import { useToast } from "@/lib/ToastContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Notification {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'success' | 'warning' | 'reminder';
  is_read: boolean;
  link?: string;
  created_at: string;
}

export default function NotificationsClient({ user }: { user: User }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [supabase] = useState(() => createClient());
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function fetchNotifications() {
    setLoading(true);
    
    // 1. Auto-cleanup: Delete read notifications > 7 days and all > 30 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Run cleanup silently
    await Promise.all([
      supabase.from("notifications").delete().eq("user_id", user.id).eq("is_read", true).lt("created_at", sevenDaysAgo.toISOString()),
      supabase.from("notifications").delete().eq("user_id", user.id).lt("created_at", thirtyDaysAgo.toISOString())
    ]);

    // 2. Fetch fresh data
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    
    if (!error && data) {
      setNotifications(data);
    }
    setLoading(false);
  }

  async function markAsRead(id: string) {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("user_id", user.id);
    
    if (!error) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    }
  }

  async function markAllAsRead() {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    
    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      showToast("Wszystkie przeczytane", "success");
    }
  }

  async function deleteNotification(id: string) {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    
    if (!error) {
      setNotifications(prev => prev.filter(n => n.id !== id));
      showToast("Usunięto powiadomienie", "success");
    }
  }

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    return true;
  });

  async function sendTestNotification() {
    const { data, error } = await supabase.from("notifications").insert({
      user_id: user.id,
      title: "Wszystko działa! 🚀",
      content: "Twoje powiadomienia są teraz pod pełną kontrolą. System raportuje poprawnie!",
      type: "success",
      link: "/tasks"
    }).select().single();

    if (!error && data) {
      setNotifications(prev => [data, ...prev]);
      showToast("Wysłano testowe powiadomienie", "success");
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'reminder': return <Calendar size={20} className="text-blue-400" />;
      case 'success': return <CheckCircle2 size={20} className="text-green-400" />;
      case 'warning': return <AlertCircle size={20} className="text-red-400" />;
      default: return <Bell size={20} className="text-brand-400" />;
    }
  };

  return (
    <div className="flex-1 pb-32 animate-fade-in relative overflow-hidden min-h-screen">
      {/* Background Decor */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-brand-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 -right-32 w-64 h-64 bg-yellow-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="px-6 pt-10 mb-8 relative z-10 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.back()}
              className="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-brand-500 transition-colors active:scale-90"
            >
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-2xl font-black tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              Powiadomienia
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {notifications.some(n => !n.is_read) && (
              <button 
                onClick={markAllAsRead}
                className="w-10 h-10 rounded-xl bg-brand-500 text-white shadow-lg shadow-brand-500/20 flex items-center justify-center active:scale-95 transition-all hover:scale-105"
                title="Oznacz wszystkie"
              >
                <CheckCheck size={18} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="px-6 mb-8 flex gap-3 relative z-10">
        <button 
          onClick={() => setFilter('all')}
          className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'all' ? 'bg-brand-500 text-white shadow-xl shadow-brand-500/20' : 'bg-surface-2 border border-border text-text-muted'}`}
        >
          Wszystkie
        </button>
        <button 
          onClick={() => setFilter('unread')}
          className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'unread' ? 'bg-brand-500 text-white shadow-xl shadow-brand-500/20' : 'bg-surface-2 border border-border text-text-muted'}`}
        >
          Nieprzeczytane ({notifications.filter(n => !n.is_read).length})
        </button>
      </div>

      {/* List */}
      <div className="px-6 space-y-4 relative z-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
            <Loader2 size={40} className="animate-spin text-brand-500" />
            <p className="text-xs font-black uppercase tracking-widest">Sprawdzam skrzynkę...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center opacity-30">
            <div className="w-20 h-20 rounded-[2.5rem] bg-surface-2 border border-border flex items-center justify-center mb-6">
              <Inbox size={40} />
            </div>
            <h3 className="text-lg font-black tracking-tight mb-1">Pusto tutaj</h3>
            <p className="text-xs">Nie masz obecnie żadnych powiadomień.</p>
          </div>
        ) : (
          filteredNotifications.map((n) => (
            <div 
              key={n.id}
              onClick={() => {
                markAsRead(n.id);
                if (n.link) router.push(n.link);
              }}
              className={`group p-5 rounded-3xl border transition-all duration-300 relative overflow-hidden cursor-pointer ${n.is_read ? 'bg-surface-2/40 border-border opacity-70' : 'bg-surface-2 border-brand-500/30 shadow-xl shadow-brand-500/5 ring-1 ring-brand-500/10'}`}
            >
              {!n.is_read && (
                <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-brand-500 rounded-bl-lg" />
              )}
              
              <div className="flex gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${n.is_read ? 'bg-surface-3' : 'bg-brand-500/10 shadow-inner'}`}>
                  {getIcon(n.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1 gap-4">
                    <h3 className={`font-black tracking-tight text-sm ${n.is_read ? 'text-text-primary' : 'text-brand-500'}`}>
                      {n.title}
                    </h3>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                      className="opacity-0 group-hover:opacity-100 p-2 rounded-xl transition-all text-red-500/50 hover:text-red-500 hover:bg-red-500/10"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <p className="text-xs text-text-secondary leading-relaxed mb-3">
                    {n.content}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-widest text-text-muted">
                      {new Date(n.created_at).toLocaleDateString("pl-PL", { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    
                    {n.link && (
                      <Link 
                        href={n.link} 
                        className="flex items-center gap-1 text-xs font-black text-brand-500 hover:gap-2 transition-all uppercase tracking-widest"
                      >
                        Zobacz <ChevronRight size={14} />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
