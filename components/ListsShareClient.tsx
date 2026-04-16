"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { ChevronLeft, Share2, Copy, UserPlus, Check, X, Loader2, Users } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/lib/ToastContext";

interface ListInfo {
  id: string;
  name: string;
}

export default function ListsShareClient({ list, user }: { list: ListInfo, user: User }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [shares, setShares] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const supabase = createClient();
  const { showToast } = useToast();

  const fetchShares = async () => {
    const { data } = await supabase
      .from("list_shares")
      .select("*, profile:profiles!list_shares_user_id_fkey(*)")
      .eq("list_id", list.id);
    
    if (data) setShares(data);
  };

  const fetchFriends = async () => {
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
  };

  useEffect(() => {
    fetchShares();
    fetchFriends();
  }, [list.id]);

  const copyLink = () => {
    const url = `${window.location.origin}/lists/${list.id}`;
    navigator.clipboard.writeText(url);
    showToast("Link skopiowany do schowka!", "success");
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || email === user.email) return;

    setLoading(true);
    try {
      // 1. Find profile by email
      const { data: profile, error: pError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email.trim().toLowerCase())
        .single();
      
      if (pError || !profile) {
        showToast("Nie znaleziono użytkownika o podanym adresie email.", "error");
        setLoading(false);
        return;
      }

      // 2. Check if already shared
      const { data: existing } = await supabase
        .from("list_shares")
        .select("id")
        .eq("list_id", list.id)
        .eq("user_id", profile.id)
        .single();
      
      if (existing) {
        showToast("Ta lista jest już udostępniona tej osobie.", "error");
        setLoading(false);
        return;
      }

      // 3. Insert record
      const { error } = await supabase
        .from("list_shares")
        .insert({
          list_id: list.id,
          user_id: profile.id,
          invited_by: user.id
        });
      
      if (!error) {
        showToast("Lista została udostępniona!", "success");
        setEmail("");
        fetchShares();
      } else {
        throw error;
      }
    } catch (err: any) {
      showToast("Błąd: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const shareWithFriend = async (friend: any) => {
    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from("list_shares")
        .select("id")
        .eq("list_id", list.id)
        .eq("user_id", friend.id)
        .single();
      
      if (existing) {
        showToast(`Lista jest już udostępniona dla ${friend.username}`, "info");
        return;
      }

      await supabase.from("list_shares").insert({
        list_id: list.id,
        user_id: friend.id,
        invited_by: user.id
      });
      
      showToast(`Udostępniono dla ${friend.username}!`, "success");
      fetchShares();
    } catch (err) {
      showToast("Błąd udostępniania", "error");
    } finally {
      setLoading(false);
    }
  };

  const removeShare = async (shareId: string) => {
    const { error } = await supabase
      .from("list_shares")
      .delete()
      .eq("id", shareId);
    
    if (!error) {
      showToast("Dostęp został odwołany.", "success");
      fetchShares();
    }
  };

  return (
    <div className="min-h-screen pb-32 animate-fade-in bg-surface">
      <header className="px-6 pt-12 pb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/lists" className="w-10 h-10 rounded-xl glass flex items-center justify-center active:scale-90 transition-all">
            <ChevronLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Udostępnianie
          </h1>
        </div>
        <p className="text-sm text-text-muted">Lista: <span className="text-text-primary font-bold">{list.name}</span></p>
      </header>

      <main className="px-6 space-y-8">
        {/* Quick Link Share */}
        <section className="space-y-3">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary px-1">Szybki link</h2>
          <div className="rounded-3xl glass p-5 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">Link do listy</p>
              <p className="text-[10px] opacity-50 truncate">Wyślij znajomemu, aby mógł dołączyć</p>
            </div>
            <button 
              onClick={copyLink}
              className="px-5 py-3 rounded-xl gradient-brand text-white flex items-center gap-2 text-xs font-bold active:scale-95 transition-all"
            >
              <Copy size={16} />
              Kopiuj
            </button>
          </div>
        </section>

        {/* Invite by Email */}
        <section className="space-y-4">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary px-1">Dodaj członka</h2>
          <form onSubmit={handleShare} className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
              <UserPlus size={18} />
            </div>
            <input 
              type="email" 
              placeholder="Adres e-mail znajomego..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-2xl pl-12 pr-32 py-4 text-sm focus:outline-none focus:border-brand-500 transition-all font-medium"
            />
            <button 
              type="submit"
              disabled={loading || !email}
              className="absolute right-2 top-1/2 -translate-y-1/2 shrink-0 h-10 px-6 rounded-xl gradient-brand text-white text-[10px] font-bold uppercase tracking-wider disabled:opacity-50 active:scale-95 transition-all"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : "Dodaj"}
            </button>
          </form>
          
          {/* Quick Friends Select */}
          {friends.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] font-black uppercase text-muted mb-3 px-1 tracking-widest opacity-60">Twoi znajomi</p>
              <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
                {friends.map((friend) => (
                  <button
                    key={friend.id}
                    onClick={() => shareWithFriend(friend)}
                    className="flex flex-col items-center gap-2 shrink-0 group active:scale-95 transition-all"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-surface-2 border border-border group-hover:border-brand-500/50 flex items-center justify-center text-brand-400 font-black text-lg shadow-sm">
                      {friend.username?.[0].toUpperCase()}
                    </div>
                    <span className="text-[10px] font-bold truncate max-w-[60px]">{friend.username}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Current Members */}
        <section className="space-y-4">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary px-1">
            Udostępniono dla ({shares.length})
          </h2>
          
          {shares.length > 0 ? (
            <div className="space-y-2">
              {shares.map((share) => (
                <div key={share.id} className="rounded-2xl bg-surface-2 border border-border/50 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-400 font-bold">
                      {(share.profile?.email?.[0] || 'U').toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{share.profile?.email}</p>
                      <p className="text-[10px] opacity-40">Dołączył {new Date(share.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeShare(share.id)}
                    className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20 active:scale-90 transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-3xl border-2 border-dashed border-border flex flex-col items-center text-center opacity-40">
              <Users size={32} className="mb-3" />
              <p className="text-xs font-medium">Brak dodatkowych osób.<br/>Twoja lista jest prywatna.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
