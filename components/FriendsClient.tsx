"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Mail, Check, X, Loader2, Users, Plus, ArrowLeft, Send, MessageCircle, Search, Calendar, Ghost } from "lucide-react";
import { useToast } from "@/lib/ToastContext";
import { useRouter } from "next/navigation";
import AnimalAvatar, { AnimalType } from "./AnimalAvatar";

export default function FriendsClient({ 
  user,
  initialIncoming = [],
  initialOutgoing = [],
  initialFriends = []
}: { 
  user: User;
  initialIncoming?: any[];
  initialOutgoing?: any[];
  initialFriends?: any[];
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'friends' | 'messages' | 'shared' | 'discover'>('friends');
  
  const [incoming, setIncoming] = useState(initialIncoming);
  const [outgoing, setOutgoing] = useState(initialOutgoing);
  const [friends, setFriends] = useState(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('cache_friends');
      if (cached) return JSON.parse(cached);
    }
    return initialFriends;
  });

  const [chatPartners, setChatPartners] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('cache_chat_partners');
      if (cached) return JSON.parse(cached);
    }
    return initialFriends.filter((f: any) => f && f.id && !f.id.toString().startsWith('pending-'));
  });

  const [lastMessages, setLastMessages] = useState<Record<string, { content: string, time: string, timestamp?: string, isMe?: boolean }>>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('cache_last_messages');
      if (cached) return JSON.parse(cached);
    }
    return {};
  });

  const [sharedLists, setSharedLists] = useState<any[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<any | null>(null);
  const [userLists, setUserLists] = useState<any[]>([]);
  const [isAvatarLoading, setIsAvatarLoading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [activeChatPartner, setActiveChatPartner] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const [msgLoading, setMsgLoading] = useState(false);
  const [lastMsgTime, setLastMsgTime] = useState(0);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [lastSeenMap, setLastSeenMap] = useState<Record<string, string>>({});
  const [lastRequestTime, setLastRequestTime] = useState(0);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  const formatLastSeen = (timestamp: string | null) => {
    if (!timestamp) return "dawno temu";
    const diff = Math.max(0, Date.now() - new Date(timestamp).getTime());
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "przed chwilą";
    if (mins < 60) return `${mins} min temu`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} h temu`;
    return new Date(timestamp).toLocaleDateString('pl-PL');
  };
  const [searchTerm, setSearchTerm] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [supabase] = useState(() => createClient());
  const router = useRouter();
  const { showToast } = useToast();

  const performSearch = async (val: string) => {
    if (!val || val.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearchingUsers(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, username, email, avatar_url")
      .or(`username.ilike.%${val}%,email.ilike.%${val}%`)
      .neq("id", user.id)
      .limit(10);
    setSearchResults(data || []);
    setIsSearchingUsers(false);
  };

  const renderAvatar = (url: string | null, seed: string, size = 48) => {
    if (url?.startsWith('animal:')) {
      const parts = url.split(':');
      return <AnimalAvatar type={parts[1] as AnimalType} variant={parseInt(parts[2])} colorIndex={parseInt(parts[3])} size={size} />;
    }
    if (url?.startsWith('panda:')) {
      const parts = url.split(':');
      return <AnimalAvatar type="panda" variant={parseInt(parts[1])} colorIndex={parseInt(parts[2])} size={size} />;
    }
    return <AnimalAvatar seed={seed} size={size} />;
  };

  const scrollToBottom = (instant = false) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: instant ? "auto" : "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchData = async () => {
    // 1. Parallel background refresh for core social data
    const [incRes, outRes, accRes, sharedRes, mineRes] = await Promise.all([
      supabase.from("friend_requests").select("*, sender:profiles!sender_id(*)").eq("receiver_email", user.email).eq("status", "pending"),
      supabase.from("friend_requests").select("*").eq("sender_id", user.id).eq("status", "pending"),
      supabase.from("friend_requests").select("*, sender:profiles!sender_id(*)").or(`sender_id.eq.${user.id},receiver_email.eq.${user.email}`).eq("status", "accepted"),
      supabase.from("list_shares").select("*, list:lists(*)").or(`user_id.eq.${user.id},invited_email.eq.${user.email}`),
      supabase.from("lists").select("*").eq("user_id", user.id).eq("status", "active")
    ]);

    if (incRes.data) setIncoming(incRes.data);
    if (outRes.data) setOutgoing(outRes.data);
    if (sharedRes.data) setSharedLists(sharedRes.data);
    if (mineRes.data) setUserLists(mineRes.data);

    if (accRes.data) {
      const receiverEmails = accRes.data.filter(r => r.sender_id === user.id).map(r => r.receiver_email);
      let receiverProfiles: any[] = [];
      if (receiverEmails.length > 0) {
        const { data } = await supabase.from("profiles").select("*").in("email", receiverEmails);
        receiverProfiles = data || [];
      }

      const friendsList = accRes.data.map(req => {
        if (req.sender_id === user.id) {
          const prof = receiverProfiles.find(p => p.email === req.receiver_email);
          return prof ? { ...prof } : { email: req.receiver_email, username: req.receiver_email.split('@')[0], id: 'pending-' + req.id };
        }
        return req.sender;
      }).filter(Boolean);

      setFriends(friendsList);
      localStorage.setItem('cache_friends', JSON.stringify(friendsList));

      // Optimized Bulk Message & Presence & Partner Discovery
      const fetchSocialStatus = async () => {
        const [msgRes, sentRes, recRes] = await Promise.all([
          supabase.from("messages").select("*").or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`).order("created_at", { ascending: false }).limit(100),
          supabase.from("messages").select("receiver_id").eq("sender_id", user.id),
          supabase.from("messages").select("sender_id").eq("receiver_id", user.id)
        ]);

        const partnerIds = new Set<string>();
        sentRes.data?.forEach(m => partnerIds.add(m.receiver_id));
        recRes.data?.forEach(m => partnerIds.add(m.sender_id));
        friendsList.forEach(f => { if(f.id && !f.id.toString().startsWith('pending-')) partnerIds.add(f.id); });

        const finalPartnerIds = Array.from(partnerIds);
        if (finalPartnerIds.length > 0) {
          const { data: profiles } = await supabase.from("profiles").select("*").in("id", finalPartnerIds);
          if (profiles) {
            setChatPartners(profiles);
            localStorage.setItem('cache_chat_partners', JSON.stringify(profiles));

            const lastMsgs: Record<string, any> = {};
            const unread: Record<string, number> = {};
            const pMap: Record<string, string> = {};

            profiles.forEach(p => {
              pMap[p.id] = p.last_seen;
              if (msgRes.data) {
                const last = msgRes.data.find(m => (m.sender_id === p.id && m.receiver_id === user.id) || (m.sender_id === user.id && m.receiver_id === p.id));
                if (last) {
                  lastMsgs[p.id] = {
                    content: last.sender_id === user.id ? `Ty: ${last.content}` : last.content,
                    time: formatLastSeen(last.created_at),
                    timestamp: last.created_at,
                    isMe: last.sender_id === user.id
                  };
                }
                unread[p.id] = msgRes.data.filter(m => m.sender_id === p.id && m.receiver_id === user.id && !m.is_read).length;
              }
            });
            setLastMessages(lastMsgs);
            setUnreadCounts(unread);
            setLastSeenMap(pMap);
            localStorage.setItem('cache_last_messages', JSON.stringify(lastMsgs));
          }
        }
      };

      fetchSocialStatus();
    }
  };


  useEffect(() => {
    fetchData();

    // Heartbeat: update my last_seen
    const updateMyPresence = async () => {
      if (document.visibilityState === "visible") {
        const nowIso = new Date().toISOString();
        await supabase.from("profiles").update({ last_seen: nowIso }).eq("id", user.id);
        setLastSeenMap(prev => ({ ...prev, [user.id]: nowIso }));
      }
    };

    updateMyPresence();
    const presenceInterval = setInterval(updateMyPresence, 30000); // 30s heartbeat for instant accuracy

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        updateMyPresence();
        fetchData();
      }
    };
    window.addEventListener("visibilitychange", handleVisibilityChange);

    // Refresh UI (online status dots and relative times)
    const uiInterval = setInterval(() => {
      setLastRequestTime(Date.now());
    }, 15000);

    // Global subscription for community events and PROFILE presence
    const communityChannel = supabase
      .channel('community_global')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'profiles'
      }, (payload) => {
        const updated = payload.new as any;
        setLastSeenMap(prev => ({ ...prev, [updated.id]: updated.last_seen }));
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'friend_requests'
      }, () => fetchData())
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'friend_requests',
        filter: `receiver_email=eq.${user.email}` 
      }, () => fetchData())
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'list_shares',
        filter: `invited_email=eq.${user.email}` 
      }, () => fetchData())
      .subscribe();

    return () => { 
      supabase.removeChannel(communityChannel); 
      clearInterval(presenceInterval); 
      clearInterval(uiInterval);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user.email]);


  useEffect(() => {
    if (activeTab === 'discover') {
    }
  }, [activeTab]);

  const filteredFriends = friends.filter((f: any) => 
    f.username?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    f.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sync activeChatPartner to localStorage to prevent global notification spam
  useEffect(() => {
    if (activeChatPartner) {
      localStorage.setItem('active_chat', activeChatPartner.id);
    } else {
      localStorage.removeItem('active_chat');
    }
    return () => localStorage.removeItem('active_chat');
  }, [activeChatPartner]);

  // Global listener for unread messages and previews
  useEffect(() => {
    const channel = supabase
      .channel('global_messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${user.id}`
      }, (payload) => {
        const newMsg = payload.new as any;
        
        if (activeChatPartner && activeChatPartner.id === newMsg.sender_id) {
          // Jeśli jesteśmy w czacie z tą osobą, od razu oznaczamy jako przeczytane
          supabase.from("messages").update({ is_read: true }).eq("id", newMsg.id).then();
        } else {
          setUnreadCounts(prev => ({
            ...prev,
            [newMsg.sender_id]: (prev[newMsg.sender_id] || 0) + 1
          }));
          
          localStorage.setItem('unread_messages', 'true');
          window.dispatchEvent(new Event('unread-messages-update'));
        }

        setLastMessages(prev => ({
          ...prev,
          [newMsg.sender_id]: {
            content: newMsg.content,
            time: "przed chwilą",
            timestamp: newMsg.created_at,
            isMe: false
          }
        }));
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `sender_id=eq.${user.id}`
      }, (payload) => {
        // Nasłuchujemy zmian is_read w NASZYCH wysłanych wiadomościach
        const updatedMsg = payload.new as any;
        setMessages(prev => prev.map(m => m.id === updatedMsg.id ? { ...m, is_read: updatedMsg.is_read } : m));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id, activeChatPartner?.id]);

  useEffect(() => {
    if (!activeChatPartner) return;

    const fetchMsgs = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${activeChatPartner.id}),and(sender_id.eq.${activeChatPartner.id},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true });
      if (data) {
        setMessages(data);
        // Oznacz wszystkie nieprzeczytane od tej osoby jako przeczytane
        await supabase
          .from("messages")
          .update({ is_read: true })
          .eq("sender_id", activeChatPartner.id)
          .eq("receiver_id", user.id)
          .eq("is_read", false);
        
        // Wyczyść licznik nieprzeczytanych lokalnie
        setUnreadCounts(prev => {
          const next = { ...prev };
          delete next[activeChatPartner.id];
          return next;
        });

        // Sprawdź czy są jeszcze jakieś inne nieprzeczytane
        setTimeout(() => {
          const remaining = Object.values(unreadCounts).some(count => count > 0);
          if (!remaining) {
            localStorage.setItem('unread_messages', 'false');
            window.dispatchEvent(new Event('unread-messages-update'));
          }
        }, 100);
      }
    };

    fetchMsgs();

    // Notify BottomNav to hide during active chat
    window.dispatchEvent(new CustomEvent('chat-mode-update', { detail: { isOpen: true } }));

    const channel = supabase
      .channel(`active_chat_${activeChatPartner.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages'
      }, (payload) => {
        const newMsg = payload.new;
        if (
          ((newMsg.sender_id === user.id && newMsg.receiver_id === activeChatPartner.id) ||
          (newMsg.sender_id === activeChatPartner.id && newMsg.receiver_id === user.id))
        ) {
          setMessages(prev => {
            const exists = prev.some(m => m.id === newMsg.id);
            if (exists) return prev;
            const filtered = prev.filter(m => !(m.id.toString().startsWith('temp-') && m.content === newMsg.content));
            return [...filtered, newMsg];
          });
        }
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(channel); 
      // Notify BottomNav to show again when chat closes
      window.dispatchEvent(new CustomEvent('chat-mode-update', { detail: { isOpen: false } }));
    };
  }, [activeChatPartner, user.id]);

  async function sendRequest(e: React.FormEvent, directEmail?: string) {
    if (e) e.preventDefault();
    const targetEmail = directEmail || email.trim();
    if (!targetEmail || targetEmail === user.email) return;

    // Anti-spam: check pending requests limit
    if (outgoing.length >= 10) {
      showToast("Masz zbyt wiele oczekujących zaproszeń (max 10). Poczekaj, aż ktoś je zaakceptuje.", "info");
      return;
    }

    // Anti-spam: cooldown
    const now = Date.now();
    if (now - lastRequestTime < 2000) {
      showToast("Zwolnij! Nie wysyłaj zaproszeń tak szybko.", "info");
      return;
    }

    const previousOutgoing = [...outgoing];
    const tempId = `temp-out-${Date.now()}`;
    const optimisticRequest = {
      id: tempId,
      sender_id: user.id,
      receiver_email: targetEmail.toLowerCase(),
      status: 'pending',
      created_at: new Date().toISOString()
    };

    // Optimistic update
    setOutgoing((prev: any[]) => [optimisticRequest, ...prev]);
    setEmail("");
    setLastRequestTime(now);
    setLoading(true);
    
    const { error } = await supabase
      .from("friend_requests")
      .insert({ sender_id: user.id, receiver_email: targetEmail.toLowerCase() });
    
    if (!error) {
      showToast("Zaproszenie wysłane!", "success");
      // Supabase realtime will replace it eventually, but let's keep it snappy
    } else {
      setOutgoing(previousOutgoing);
      if (error.code === '23505') {
        showToast("Już wysłałeś zaproszenie do tej osoby.", "info");
      } else {
        showToast("Błąd: " + error.message, "error");
      }
    }
    setLoading(false);
  }

  async function respondToRequest(requestId: string, status: 'accepted' | 'rejected') {
    const previousIncoming = [...incoming];
    const previousFriends = [...friends];
    
    // Optimistic remove from incoming
    setIncoming((prev: any[]) => prev.filter((r: any) => r.id !== requestId));
    
    const { error } = await supabase
      .from("friend_requests")
      .update({ status })
      .eq("id", requestId);
    
    if (error) {
      setIncoming(previousIncoming);
      setFriends(previousFriends);
      showToast("Błąd podczas aktualizacji: " + error.message, "error");
    } else {
      showToast(status === 'accepted' ? "Zaakceptowano zaproszenie" : "Odrzucono zaproszenie", "success");
      // For acceptance, we might want to wait for the real data to show up in friends list via realtime, 
      // but the snappy removal from incoming is the key.
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
    const previousFriends = [...friends];
    const friendId = selectedFriend.id;
    const friendEmail = selectedFriend.email;

    // Optimistic remove
    setFriends((prev: any[]) => prev.filter((f: any) => f.id !== friendId));
    setSelectedFriend(null);

    const { error } = await supabase
      .from("friend_requests")
      .delete()
      .or(`and(sender_id.eq.${user.id},receiver_email.eq.${friendEmail}),and(sender_id.eq.${friendId},receiver_email.eq.${user.email})`);
    
    if (error) {
      setFriends(previousFriends);
      showToast("Błąd przy usuwaniu: " + error.message, "error");
    } else {
      showToast("Usunięto ze znajomych", "success");
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!msgInput.trim() || !activeChatPartner) return;

    // Rate limiting: max 1 message per 1.5 second
    const now = Date.now();
    if (now - lastMsgTime < 1500) {
      showToast("Piszesz za szybko! Poczekaj chwilę.", "info");
      return;
    }
    
    const content = msgInput.trim();

    // Message length validation
    if (content.length > 1000) {
      showToast("Wiadomość jest za długa (max 1000 znaków)", "error");
      return;
    }
    
    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const isoTime = new Date().toISOString();
    const optimisticMsg = {
      id: tempId,
      sender_id: user.id,
      receiver_id: activeChatPartner.id,
      content,
      created_at: isoTime
    };
    
    setMessages(prev => [...prev, optimisticMsg]);
    setLastMessages(prev => ({
      ...prev,
      [activeChatPartner.id]: {
        content: `Ty: ${content}`,
        time: "przed chwilą",
        timestamp: isoTime,
        isMe: true
      }
    }));
    setMsgInput("");
    setLastMsgTime(now);
    
    const { error } = await supabase
      .from("messages")
      .insert({
        sender_id: user.id,
        receiver_id: activeChatPartner.id,
        content
      });

    if (error) {
      showToast("Nie udało się wysłać wiadomości", "error");
      // Rollback optimistic update
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
  }

  return (
    <div className="flex-1 h-[calc(100dvh-1rem)] flex flex-col animate-fade-in px-6 pt-2 overflow-hidden">
      <header className="mb-2">
        <h1 className="text-xl font-bold tracking-tight mb-1" style={{ fontFamily: "var(--font-display)" }}>
          Społeczność
        </h1>
        
        {/* Modern Segmented Tabs */}
        <div className="flex p-1 bg-surface-2 rounded-2xl border border-border mb-1">
          <button 
            onClick={() => setActiveTab('friends')}
            className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'friends' ? 'bg-surface-3 text-brand-400 shadow-sm' : 'text-muted hover:text-text-primary'}`}
          >
            Znajomi
          </button>
          <button 
            onClick={() => {
              setActiveTab('messages');
              localStorage.removeItem('unread_messages');
              window.dispatchEvent(new Event('unread-messages-update'));
            }}
            className={`relative flex-1 py-3 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'messages' ? 'bg-surface-3 text-brand-400 shadow-sm' : 'text-muted hover:text-text-primary'}`}
          >
            Wiadomości
            {Object.values(unreadCounts).some(c => c > 0) && (
              <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            )}
          </button>
          <button 
            onClick={() => setActiveTab('shared')}
            className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'shared' ? 'bg-surface-3 text-brand-400 shadow-sm' : 'text-muted hover:text-text-primary'}`}
          >
            Udostępnione
          </button>
          <button 
            onClick={() => setActiveTab('discover')}
            className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'discover' ? 'bg-surface-3 text-brand-400 shadow-sm' : 'text-muted hover:text-text-primary'}`}
          >
            Odkryj
          </button>
        </div>
      </header>

      {activeTab === 'friends' && (
        <div className="flex-1 overflow-y-auto pb-28 animate-in fade-in slide-in-from-bottom-2 duration-500">
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
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted">
                Twoi znajomi ({filteredFriends.length})
              </h2>
            </div>

            {friends.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-center animate-fade-in">
                <p className="font-black text-lg mb-2 uppercase tracking-tight text-muted/40">Brak znajomych</p>
                <p className="text-xs text-muted max-w-[220px] leading-relaxed">
                  Dodaj swojego pierwszego znajomego, aby wspólnie zarządzać listami i rozmawiać na czacie!
                </p>
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="py-20 text-center opacity-40">
                <Search size={32} className="mx-auto mb-4" />
                <p className="text-sm font-bold">Nie znaleziono znajomego.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredFriends.map((friend: any) => {
                  const lastSeen = lastSeenMap[friend.id];
                  const isOnline = lastSeen && (new Date().getTime() - new Date(lastSeen).getTime() < 90000); // 90s threshold for instant accuracy
                  
                  return (
                    <div 
                      key={friend.email} 
                      onClick={() => setSelectedFriend(friend)}
                      className="p-4 rounded-2xl bg-surface-2 border border-border flex items-center justify-between group hover:border-brand-500/30 hover:bg-surface-3/50 transition-all cursor-pointer active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          {renderAvatar(friend.avatar_url, friend.email, 48)}
                          {isOnline ? (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-[var(--color-surface-2)] shadow-sm animate-pulse" />
                          ) : (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-surface-3 border-2 border-[var(--color-surface-2)] shadow-sm" />
                          )}
                        </div>
                        <div>
                          <p className="font-black text-sm group-hover:text-brand-400 transition-colors">{friend.username || friend.email.split('@')[0]}</p>
                          <p className="text-[10px] text-muted-foreground/60 font-medium">
                            {isOnline ? "Online" : `Widziany/a ${formatLastSeen(lastSeen)}`}
                          </p>
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-surface-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowLeft size={14} className="rotate-180 text-brand-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 flex-1 flex flex-col min-h-0 overflow-hidden">
          {!activeChatPartner ? (
            // ── Conversation list ──────────────────────────────────────────
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center gap-3 mb-3 flex-none">
                <div className="w-9 h-9 rounded-2xl bg-brand-500/10 flex items-center justify-center">
                  <MessageCircle size={18} className="text-brand-400" />
                </div>
                <div>
                  <h3 className="font-black text-sm">Wiadomości</h3>
                  <p className="text-[10px] text-muted">{chatPartners.length} rozmów</p>
                </div>
              </div>

              {chatPartners.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 py-20">
                  <MessageCircle size={40} className="mb-4" />
                  <p className="text-sm italic">Brak wiadomości.</p>
                </div>
              ) : (
                <div className="space-y-4 overflow-y-auto pb-28 flex-1 custom-scrollbar px-1">
                  {chatPartners.map(f => {
                    const unread = unreadCounts[f.id] || 0;
                    const lastMsg = lastMessages[f.id];
                    const lastSeen = lastSeenMap[f.id];
                    const isOnline = lastSeen && (new Date().getTime() - new Date(lastSeen).getTime() < 300000); // 5 mins
                    
                    return (
                      <button
                        key={f.id}
                        onClick={() => {
                          setActiveChatPartner(f);
                          setUnreadCounts(prev => ({ ...prev, [f.id]: 0 }));
                        }}
                        className="w-full p-4 rounded-3xl bg-surface-2/50 border border-border/50 flex items-center gap-4 hover:border-brand-500/40 hover:bg-surface-2 transition-all text-left active:scale-[0.98] group relative overflow-hidden"
                      >
                        {/* Selected indicator */}
                        {unread > 0 && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500 shadow-[0_0_10px_rgba(var(--color-brand-500),0.5)]" />}
                        
                        <div className="relative flex-shrink-0">
                          {renderAvatar(f.avatar_url, f.email, 56)}
                          {isOnline ? (
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 border-2 border-[var(--color-surface)] shadow-lg animate-pulse" />
                          ) : (
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-surface-3 border-2 border-[var(--color-surface)] shadow-lg" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0 py-1">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex flex-col">
                              <p className={`text-sm tracking-tight transition-colors ${unread > 0 ? 'font-black text-text-primary' : 'font-bold group-hover:text-brand-400'}`}>
                                {f.username || f.email.split('@')[0]}
                              </p>
                              {!isOnline && (
                                <span className="text-[9px] text-muted-foreground/60 font-medium tracking-wide">
                                  Aktywny/a {formatLastSeen(lastSeen)}
                                </span>
                              )}
                            </div>
                            {lastMsg && (
                              <span className={`text-[10px] font-medium whitespace-nowrap ml-2 ${unread > 0 ? 'text-brand-400 font-bold' : 'text-muted italic'}`}>
                                {formatLastSeen(lastMsg.timestamp || null)}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <p className={`text-xs truncate max-w-[170px] ${unread > 0 ? 'text-text-primary font-black' : 'text-muted font-medium'}`}>
                              {lastMsg ? lastMsg.content : "Zacznij nową rozmowę..."}
                            </p>
                            
                            {unread > 0 ? (
                              <div className="bg-brand-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-[0_0_12px_rgba(var(--color-brand-500),0.7)] animate-pulse flex-shrink-0 ml-2">
                                {unread}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            // ── Active chat ───────────────────────────────────────────────
            // ── Active chat ───────────────────────────────────────────────
            <div className="fixed inset-0 z-[200] bg-surface-1 flex flex-col animate-slide-up overflow-hidden">
              {/* Chat header - FIXED TOP */}
              <div className="flex items-center gap-3 py-4 px-4 bg-surface-1/95 backdrop-blur-md border-b border-border flex-none sticky top-0 z-50">
                <button
                  onClick={() => {
                    setActiveChatPartner(null);
                    localStorage.removeItem('active_chat');
                  }}
                  className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center text-muted hover:text-text-primary transition-all active:scale-90 cursor-pointer"
                >
                  <ArrowLeft size={20} />
                </button>

                <div className="relative flex-shrink-0">
                  {renderAvatar(activeChatPartner.avatar_url, activeChatPartner.email, 44)}
                  {(() => {
                    const lastSeen = lastSeenMap[activeChatPartner.id];
                    const isOnline = lastSeen && (new Date().getTime() - new Date(lastSeen).getTime() < 300000);
                    return isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-surface-1 animate-pulse shadow-lg" />
                    );
                  })()}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-lg tracking-tight leading-tight truncate">
                    {activeChatPartner.username || activeChatPartner.email.split('@')[0]}
                  </h3>
                  {(() => {
                    const lastSeen = lastSeenMap[activeChatPartner.id];
                    const isOnline = lastSeen && (new Date().getTime() - new Date(lastSeen).getTime() < 300000);
                    return isOnline ? (
                      <p className="text-[10px] text-green-400 font-bold flex items-center gap-1">
                        Online
                      </p>
                    ) : (
                      <p className="text-[10px] text-muted font-medium italic">
                        {formatLastSeen(lastSeen)}
                      </p>
                    );
                  })()}
                </div>
              </div>

              {/* Messages area - INDEPENDENT SCROLL */}
              <div className="flex-1 overflow-y-auto px-4 py-8 space-y-3 custom-scrollbar overscroll-contain">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center min-h-[40vh] opacity-30 text-center py-20 animate-fade-in uppercase tracking-tighter">
                    <MessageCircle size={48} className="mb-4 text-brand-400/20" />
                    <p className="font-black text-sm">Zacznij rozmowę</p>
                  </div>
                )}

                {messages.map((m, idx) => {
                  const isMe = m.sender_id === user.id;
                  const prevMsg = messages[idx - 1];
                  const nextMsg = messages[idx + 1];
                  const msgDate = new Date(m.created_at);
                  const prevMsgDate = prevMsg ? new Date(prevMsg.created_at) : null;
                  const showDateSeparator = !prevMsgDate || msgDate.toDateString() !== prevMsgDate.toDateString();
                  const isFirstInGroup = !prevMsg || prevMsg.sender_id !== m.sender_id || showDateSeparator;
                  const isLastInGroup = !nextMsg || nextMsg.sender_id !== m.sender_id;
                  const time = msgDate.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div key={m.id || idx} className="flex flex-col">
                      {showDateSeparator && (
                        <div className="flex items-center justify-center my-8 opacity-40">
                          <span className="px-5 py-1.5 rounded-full bg-surface-2 border border-border text-[9px] font-black uppercase tracking-widest">
                            {msgDate.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
                          </span>
                        </div>
                      )}
                      
                      <div className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-4' : 'mt-1'}`}>
                        {!isMe && (
                          <div className={`w-8 h-8 flex-shrink-0 transition-opacity ${isLastInGroup ? 'opacity-100' : 'opacity-0'}`}>
                            {renderAvatar(activeChatPartner.avatar_url, activeChatPartner.email, 32)}
                          </div>
                        )}
                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                          <div className={`px-4 py-3 text-[13px] font-medium leading-relaxed ${isMe ? 'bg-brand-500 text-white rounded-[20px] rounded-br-none shadow-lg' : 'bg-surface-2 text-text-primary rounded-[20px] rounded-bl-none border border-border/40'}`}>
                            {m.content}
                          </div>
                          {isLastInGroup && <span className="text-[9px] text-muted/60 font-bold px-1 mt-1">{time}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} className="h-4" />
              </div>

              {/* Input area - FIXED AT BOTTOM */}
              <div className="p-4 bg-surface-1 border-t border-border shadow-[0_-10px_20px_rgba(0,0,0,0.1)]">
                <form onSubmit={sendMessage} className="flex items-center gap-2 max-w-3xl mx-auto">
                  <div className="flex-1 relative">
                    <input
                      placeholder="Napisz coś..."
                      value={msgInput}
                      onChange={e => setMsgInput(e.target.value)}
                      className="w-full px-5 py-3.5 rounded-[2rem] bg-surface-2 border border-border outline-none focus:border-brand-500/50 text-sm font-medium transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!msgInput.trim()}
                    className="w-12 h-12 rounded-full gradient-brand text-white flex items-center justify-center shadow-xl active:scale-90 transition-all disabled:opacity-20 flex-shrink-0"
                  >
                    <Send size={18} className="translate-x-0.5" />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'discover' && (
        <div className="flex-1 overflow-y-auto pb-28 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="mb-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted mb-4 px-1">
              Znajdź znajomych
            </h2>
            <div className="relative">
              <input 
                type="text"
                placeholder="Wpisz nick lub e-mail..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  performSearch(e.target.value);
                }}
                className="w-full pl-12 pr-4 py-4 rounded-[1.5rem] bg-surface-2 border border-border outline-none focus:border-brand-500/50 transition-all font-medium text-sm"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={20} />
            </div>
          </div>

          <div className="space-y-3">
            {isSearchingUsers ? (
              <div className="py-10 text-center text-muted">
                <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                <p className="text-xs font-bold uppercase tracking-widest">Szukam osób...</p>
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((profile: any) => {
                const isFriend = friends.some((f: any) => f.id === profile.id);
                const hasPending = incoming.some((i: any) => i.sender_id === profile.id) || outgoing.some((o: any) => o.receiver_email === profile.email);
                
                return (
                  <div key={profile.id} className="p-4 rounded-3xl bg-surface-2 border border-border flex items-center justify-between hover:border-brand-500/30 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="shrink-0">
                        {renderAvatar(profile.avatar_url, profile.email, 44)}
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="font-bold text-sm truncate">{profile.username || profile.email.split('@')[0]}</p>
                        <p className="text-[10px] text-muted truncate">{profile.email}</p>
                      </div>
                    </div>

                    <div className="shrink-0 ml-2">
                    {isFriend ? (
                      <div className="px-3 py-1.5 rounded-xl bg-green-500/10 text-green-400 text-[10px] font-black uppercase tracking-widest border border-green-500/20">
                        Znajomy
                      </div>
                    ) : hasPending ? (
                      <div className="px-3 py-1.5 rounded-xl bg-brand-500/10 text-brand-400 text-[10px] font-black uppercase tracking-widest border border-brand-500/20">
                        Oczekuje
                      </div>
                    ) : (
                      <button 
                        onClick={() => sendRequest({ preventDefault: () => {} } as any, profile.email)}
                        className="w-10 h-10 rounded-full gradient-brand text-white flex items-center justify-center shadow-lg shadow-brand-500/20 active:scale-90 transition-all cursor-pointer border-none"
                      >
                        <Plus size={18} />
                      </button>
                    )}
                    </div>
                  </div>
                );
              })
            ) : searchQuery.length >= 2 ? (
              <div className="py-12 text-center opacity-30">
                <Ghost size={48} className="mx-auto mb-3" />
                <p className="text-sm font-bold uppercase tracking-widest">Nikogo nie znaleziono</p>
              </div>
            ) : (
              <div className="py-12 text-center opacity-30">
                <Users size={48} className="mx-auto mb-3" />
                <p className="text-sm font-bold uppercase tracking-widest">Wyszukaj znajomego po nicku</p>
              </div>
            )}
          </div>
        </div>
      )}
      {activeTab === 'shared' && (
        <div className="flex-1 overflow-y-auto pb-28 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted mb-4 px-1">
            Listy udostępnione Tobie ({sharedLists.length})
          </h2>
          {sharedLists.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-24 text-center animate-fade-in group">
              <div className="w-24 h-24 rounded-[2.5rem] bg-surface-2 flex items-center justify-center mb-6 border border-border -rotate-3 transition-transform group-hover:rotate-0 duration-500 shadow-xl">
                <Calendar size={40} className="text-brand-400/40" />
              </div>
              <p className="font-black text-sm mb-2 uppercase tracking-tighter">Cisza w eterze</p>
              <p className="text-xs text-muted max-w-[220px] leading-relaxed">
                Nikt jeszcze nie udostępnił Ci listy. Może Ty udostępnisz coś znajomym?
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {sharedLists.map((share) => (
                <div 
                  key={share.id} 
                  onClick={() => router.push(`/lists/${share.list_id}`)}
                  className="p-5 rounded-[2rem] bg-surface-2 border border-border flex flex-col gap-4 active:scale-[0.98] transition-all cursor-pointer hover:border-brand-500/30"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">📝</div>
                      <div>
                        <p className="font-black text-base">{share.list?.name}</p>
                        <p className="text-[10px] font-bold text-brand-400 uppercase tracking-wider">Od: {share.list?.user?.username || 'Znajomy'}</p>
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-brand-500/10 text-brand-400 text-[10px] font-black rounded-full border border-brand-500/20">
                      OTWÓRZ
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
            <div className="flex flex-col items-center mb-10 px-2 text-center">
              {renderAvatar(selectedFriend.avatar_url, selectedFriend.email, 80)}
              <div className="mt-4">
                <h3 className="text-2xl font-black mb-1">{selectedFriend.username || selectedFriend.email.split('@')[0]}</h3>
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
              
              {selectedFriend.id !== 'placeholder' && (
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
              )}

              {selectedFriend.id === 'placeholder' && (
                <div 
                  className="w-full py-4 px-6 rounded-2xl bg-surface-2/30 text-left font-bold text-xs text-muted flex items-center justify-center italic"
                >
                  Użytkownik nie zarejestrowany
                </div>
              )}

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
