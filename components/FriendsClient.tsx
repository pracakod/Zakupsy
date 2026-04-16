"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Mail, Check, X, Loader2, Users, Plus } from "lucide-react";
import { useToast } from "@/lib/ToastContext";

export default function FriendsClient({ user }: { user: User }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'friends' | 'messages' | 'shared'>('friends');
  const [incoming, setIncoming] = useState<any[]>([]);
  const [outgoing, setOutgoing] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [sharedLists, setSharedLists] = useState<any[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<any | null>(null);
  const [userLists, setUserLists] = useState<any[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  const [activeChatPartner, setActiveChatPartner] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const [msgLoading, setMsgLoading] = useState(false);
  const supabase = createClient();
  const { showToast } = useToast();

  const fetchData = async () => {
    // 1. Fetch incoming/pending
    const { data: inc } = await supabase
      .from("friend_requests")
      .select("*, sender:profiles!sender_id(*)")
      .eq("receiver_email", user.email)
      .eq("status", "pending");
    if (inc) setIncoming(inc);

    // 2. Fetch outgoing/pending
    const { data: out } = await supabase
      .from("friend_requests")
      .select("*")
      .eq("sender_id", user.id)
      .eq("status", "pending");
    if (out) setOutgoing(out);

    // 3. Fetch friends (accepted)
    // We need profiles for both sides. This is tricky with current schema.
    // Let's get requests and then fetch profiles for the 'other' side.
    const { data: acc } = await supabase
      .from("friend_requests")
      .select("*, sender:profiles!sender_id(*)")
      .or(`sender_id.eq.${user.id},receiver_email.eq.${user.email}`)
      .eq("status", "accepted");

    if (acc) {
      // For each accepted request, find the friend's profile
      const friendsList = await Promise.all(acc.map(async (req) => {
        if (req.sender_id === user.id) {
          // We are the sender, friend is the receiver. Fetch by email.
          const { data: prof } = await supabase
            .from("profiles")
            .select("*")
            .eq("email", req.receiver_email)
            .single();
          return prof || { email: req.receiver_email, username: "Użytkownik" };
        } else {
          // We are the receiver, friend is the sender. Already have sender.
          return req.sender;
        }
      }));
      setFriends(friendsList.filter(f => f !== null));
    }
    // 4. Fetch shared lists
    const { data: shared } = await supabase
      .from("list_shares")
      .select("*, list:lists(*, user:profiles!user_id(*))")
      .eq("invited_email", user.email);
    if (shared) setSharedLists(shared);

    // 5. Fetch my lists (for sharing)
    const { data: mine } = await supabase
      .from("lists")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active");
    if (mine) setUserLists(mine);
  };

  useEffect(() => {
    fetchData();
  }, [user.email]);

  useEffect(() => {
    if (!activeChatPartner) return;

    // Fetch messages
    const fetchMsgs = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${activeChatPartner.id}),and(sender_id.eq.${activeChatPartner.id},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true });
      if (data) setMessages(data);
    };

    fetchMsgs();

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat_${activeChatPartner.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `or(sender_id.eq.${user.id},receiver_id.eq.${user.id})`
      }, (payload) => {
        const newMsg = payload.new;
        if (
          (newMsg.sender_id === user.id && newMsg.receiver_id === activeChatPartner.id) ||
          (newMsg.sender_id === activeChatPartner.id && newMsg.receiver_id === user.id)
        ) {
          setMessages(prev => [...prev, newMsg]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeChatPartner, user.id]);

  async function sendRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || email === user.email) return;
    setLoading(true);
    const { error } = await supabase
      .from("friend_requests")
      .insert({ sender_id: user.id, receiver_email: email.trim().toLowerCase() });
    
    if (!error) {
      setEmail("");
      showToast("Zaproszenie wysłane!", "success");
    } else {
      showToast("Błąd: " + error.message, "error");
    }
    setLoading(false);
  }

  async function respondToRequest(requestId: string, status: 'accepted' | 'rejected') {
    const { error } = await supabase
      .from("friend_requests")
      .update({ status })
      .eq("id", requestId);
    
    if (!error) {
      showToast(status === 'accepted' ? "Zaakceptowano zaproszenie" : "Odrzucono zaproszenie", "success");
      fetchData();
    }
  }

  async function shareList(listId: string) {
    if (!selectedFriend) return;
    const { error } = await supabase
      .from("list_shares")
      .insert({
        list_id: listId,
        invited_email: selectedFriend.email
      });
    
    if (!error) {
      showToast(`Udostępniono listę dla ${selectedFriend.username}`, "success");
      setIsSharing(false);
      setSelectedFriend(null);
    } else {
      showToast("Błąd udostępniania", "error");
    }
  }

  async function removeFriend() {
    if (!selectedFriend) return;
    const { error } = await supabase
      .from("friend_requests")
      .delete()
      .or(`and(sender_id.eq.${user.id},receiver_email.eq.${selectedFriend.email}),and(sender_id.eq.${selectedFriend.id},receiver_email.eq.${user.email})`);
    
    if (!error) {
      showToast("Usunięto ze znajomych", "success");
      setSelectedFriend(null);
      fetchData();
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!msgInput.trim() || !activeChatPartner) return;
    
    const content = msgInput.trim();
    setMsgInput("");
    
    const { error } = await supabase
      .from("messages")
      .insert({
        sender_id: user.id,
        receiver_id: activeChatPartner.id,
        content
      });

    if (error) {
      showToast("Nie udało się wysłać wiadomości", "error");
    }
  }

  return (
    <div className="flex-1 pb-32 animate-fade-in px-6 pt-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-4" style={{ fontFamily: "var(--font-display)" }}>
          Społeczność
        </h1>
        
        {/* Modern Segmented Tabs */}
        <div className="flex p-1 bg-surface-2 rounded-2xl border border-border mb-6">
          <button 
            onClick={() => setActiveTab('friends')}
            className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'friends' ? 'bg-surface-3 text-brand-400 shadow-sm' : 'text-muted hover:text-text-primary'}`}
          >
            Znajomi
          </button>
          <button 
            onClick={() => setActiveTab('messages')}
            className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'messages' ? 'bg-surface-3 text-brand-400 shadow-sm' : 'text-muted hover:text-text-primary'}`}
          >
            Wiadomości
          </button>
          <button 
            onClick={() => setActiveTab('shared')}
            className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'shared' ? 'bg-surface-3 text-brand-400 shadow-sm' : 'text-muted hover:text-text-primary'}`}
          >
            Udostępnione
          </button>
        </div>
      </header>

      {activeTab === 'friends' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* Invite Form */}
          <section className="mb-10">
            <form onSubmit={sendRequest} className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
                <Mail size={18} />
              </div>
              <input
                type="email"
                placeholder="Dodaj znajomego po e-mailu..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-32 py-4 rounded-2xl bg-surface-2 border border-border outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm font-medium"
              />
              <button
                type="submit"
                disabled={loading || !email}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2 rounded-xl gradient-brand text-white text-xs font-bold disabled:opacity-50 cursor-pointer shadow-lg shadow-brand-500/20 active:scale-95 transition-all"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : "Dodaj"}
              </button>
            </form>
          </section>

          {/* Received Invitations */}
          {incoming.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted mb-4 px-1">
                Otrzymane zaproszenia ({incoming.length})
              </h2>
              <div className="grid grid-cols-1 gap-3">
                {incoming.map((req) => (
                  <div key={req.id} className="p-4 rounded-2xl bg-surface-2 border border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-400 font-bold">
                        {req.sender?.username?.[0].toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-bold text-sm">{req.sender?.username || 'Nowy użytkownik'}</p>
                        <p className="text-xs text-muted truncate">{req.sender?.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => respondToRequest(req.id, 'accepted')}
                        className="p-2 rounded-xl bg-green-500/10 text-green-400 border border-green-500/20 cursor-pointer hover:bg-green-500/20"
                      >
                        <Check size={18} />
                      </button>
                      <button 
                        onClick={() => respondToRequest(req.id, 'rejected')}
                        className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 cursor-pointer hover:bg-red-500/20"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Outgoing Invitations */}
          {outgoing.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted mb-4 px-1">
                Wysłane zaproszenia ({outgoing.length})
              </h2>
              <div className="grid grid-cols-1 gap-3">
                {outgoing.map((req) => (
                  <div key={req.id} className="p-4 rounded-2xl bg-surface-2 border border-border flex items-center justify-between opacity-70">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-500/10 flex items-center justify-center text-slate-400 font-bold">
                        <Mail size={16} />
                      </div>
                      <div>
                        <p className="font-bold text-sm truncate max-w-[150px]">{req.receiver_email}</p>
                        <p className="text-[10px] text-muted">Oczekiwanie...</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => respondToRequest(req.id, 'rejected')}
                      className="p-2 text-red-400 hover:bg-red-500/5 rounded-xl transition-colors cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Friends List */}
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted mb-4 px-1">
              Twoi znajomi ({friends.length})
            </h2>
            {friends.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center opacity-40">
                <Users size={32} className="mb-4" />
                <p className="text-sm italic font-medium">Brak znajomych.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {friends.map((friend) => (
                  <div 
                  key={friend.id} 
                  onClick={() => setSelectedFriend(friend)}
                  className="p-4 rounded-2xl bg-surface-2 border border-border flex items-center justify-between group hover:border-brand-500/30 transition-all cursor-pointer active:scale-[0.98]"
                >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-400 font-bold border border-brand-500/5">
                        {friend.username?.[0].toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p className="font-black text-base">{friend.username || "Użytkownik"}</p>
                        <p className="text-[11px] text-text-muted">{friend.email}</p>
                      </div>
                    </div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/40 shadow-[0_0_10px_rgba(34,197,94,0.3)]" />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 h-[calc(100dvh-200px)] flex flex-col">
          {!activeChatPartner ? (
            <div className="py-10 text-center flex-1 flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-surface-2 rounded-full flex items-center justify-center mb-6 border border-border">
                <Mail size={32} className="text-muted" />
              </div>
              <h3 className="text-lg font-bold mb-2">Twoje Wiadomości</h3>
              <p className="text-sm text-muted px-10 mb-8">Wybierz znajomego, aby zacząć z nim rozmawiać.</p>
              
              <div className="w-full max-w-xs space-y-2">
                {friends.map(f => (
                  <button 
                    key={f.id}
                    onClick={() => setActiveChatPartner(f)}
                    className="w-full p-4 rounded-2xl bg-surface-2 border border-border flex items-center gap-3 hover:border-brand-500/30 transition-all text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center font-bold text-brand-400">
                      {f.username?.[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{f.username}</p>
                      <p className="text-[10px] text-muted truncate">{f.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                <button 
                  onClick={() => setActiveChatPartner(null)}
                  className="p-2 -ml-2 text-brand-400 flex items-center gap-2 font-bold text-sm"
                >
                  ← Wróć
                </button>
                <div className="text-right">
                  <p className="font-black text-sm">{activeChatPartner.username}</p>
                  <p className="text-[10px] text-muted">Online</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 px-2 custom-scrollbar flex flex-col py-4">
                {messages.length === 0 && (
                  <div className="text-center py-10 opacity-30 italic text-xs">Brak wiadomości. Przywitaj się! 👋</div>
                )}
                {messages.map((m, idx) => {
                  const isMe = m.sender_id === user.id;
                  return (
                    <div key={m.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-1`}>
                      <div className={`max-w-[80%] p-4 rounded-[2rem] text-sm shadow-sm ${
                        isMe 
                        ? 'bg-brand-500 text-white rounded-br-lg' 
                        : 'bg-surface-3 text-text-primary rounded-bl-lg border border-border/50'
                      }`}>
                        {m.content}
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={sendMessage} className="mt-4 flex gap-2 pt-4 border-t border-border">
                <input 
                  autoFocus
                  placeholder="Napisz coś..."
                  value={msgInput}
                  onChange={e => setMsgInput(e.target.value)}
                  className="flex-1 p-4 rounded-2xl bg-surface-2 border border-border outline-none focus:border-brand-500 text-sm font-medium"
                />
                <button 
                  type="submit"
                  disabled={!msgInput.trim()}
                  className="p-4 rounded-2xl gradient-brand text-white shadow-lg shadow-brand-500/20 active:scale-95 transition-all disabled:opacity-30"
                >
                  <Check size={20} />
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {activeTab === 'shared' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted mb-4 px-1">
            Listy udostępnione Tobie ({sharedLists.length})
          </h2>
          {sharedLists.length === 0 ? (
            <div className="py-20 text-center opacity-40 italic text-sm">
              Nikt jeszcze nie udostępnił Ci listy.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {sharedLists.map((share) => (
                <div key={share.id} className="p-5 rounded-[2rem] bg-surface-2 border border-border flex flex-col gap-4 active:scale-[0.98] transition-all cursor-pointer hover:border-brand-500/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">📝</div>
                      <div>
                        <p className="font-black text-base">{share.list?.name}</p>
                        <p className="text-[10px] font-bold text-brand-400 uppercase tracking-wider">Od: {share.list?.user?.username || 'Znajomy'}</p>
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-brand-500/10 text-brand-400 text-[10px] font-black rounded-full border border-brand-500/20">
                      DOŁĄCZ
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Friend Action Menu */}
      {selectedFriend && !isSharing && (
        <div className="fixed inset-0 z-[110] flex items-start justify-center bg-black/60 backdrop-blur-sm p-6 pt-10 sm:pt-20 animate-fade-in" onClick={() => setSelectedFriend(null)}>
          <div className="w-full max-w-sm bg-surface-1 border border-border rounded-[2.5rem] p-8 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
            {/* Action Menu Handle Replacement - Premium Header */}
            <div className="flex flex-col items-center mb-10 px-2 text-center">
              <div className="w-20 h-20 rounded-[2rem] bg-brand-500/10 flex items-center justify-center text-3xl font-black text-brand-400 border-2 border-brand-500/10 mb-5 shadow-inner">
                {selectedFriend.username?.[0].toUpperCase()}
              </div>
              <div>
                <h3 className="text-2xl font-black mb-1">{selectedFriend.username}</h3>
                <p className="text-xs text-muted font-black tracking-widest uppercase opacity-60">{selectedFriend.email}</p>
              </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={() => setIsSharing(true)}
                className="w-full py-4 px-6 rounded-2xl bg-surface-2 hover:bg-surface-3 text-left font-bold text-sm flex items-center justify-between group transition-all"
              >
                <span>Udostępnij listę</span>
                <span className="text-brand-400 group-hover:translate-x-1 transition-transform">→</span>
              </button>
              
              <button 
                onClick={() => {
                  setActiveTab('messages');
                  setActiveChatPartner(selectedFriend);
                  setSelectedFriend(null);
                }}
                className="w-full py-4 px-6 rounded-2xl bg-surface-2 hover:bg-surface-3 text-left font-bold text-sm flex items-center justify-between group transition-all"
              >
                <span>Napisz wiadomość</span>
                <span className="text-brand-400 group-hover:translate-x-1 transition-transform">→</span>
              </button>

              <div className="h-px bg-border my-2" />

              <button 
                onClick={removeFriend}
                className="w-full py-4 px-6 rounded-2xl bg-red-500/5 hover:bg-red-500/10 text-left font-bold text-sm text-red-400 transition-all active:scale-95"
              >
                Usuń ze znajomych
              </button>
              
              <button 
                onClick={() => setSelectedFriend(null)}
                className="w-full py-4 text-center font-black text-xs uppercase tracking-widest text-muted hover:text-text-primary transition-all mt-2"
              >
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sharing Sub-menu */}
      {selectedFriend && isSharing && (
        <div className="fixed inset-0 z-[110] flex items-start justify-center bg-black/60 backdrop-blur-sm p-6 pt-10 sm:pt-20 animate-fade-in" onClick={() => setIsSharing(false)}>
          <div className="w-full max-w-sm bg-surface-1 border border-border rounded-[2.5rem] p-8 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setIsSharing(false)}
              className="mb-6 text-xs font-black text-brand-400 flex items-center gap-2 uppercase tracking-widest hover:opacity-70 transition-opacity"
            >
              ← Wróć do menu
            </button>
            
            <h3 className="text-xl font-black mb-8 px-2 text-center">Wybierz listę</h3>
            
            <div className="max-h-[300px] overflow-y-auto space-y-3 px-1 custom-scrollbar">
              {userLists.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted italic">Brak aktywnych list do udostępnienia.</div>
              ) : (
                userLists.map(list => (
                  <button 
                    key={list.id}
                    onClick={() => shareList(list.id)}
                    className="w-full py-4 px-5 rounded-2xl bg-surface-2 hover:border-brand-500/40 border border-transparent transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">📝</span>
                      <span className="font-bold text-sm text-left">{list.name}</span>
                    </div>
                    <Plus size={18} className="text-brand-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))
              )}
            </div>
            
            <button 
              onClick={() => setSelectedFriend(null)}
              className="w-full py-4 mt-6 text-center font-black text-xs uppercase tracking-widest text-muted"
            >
              Anuluj
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
