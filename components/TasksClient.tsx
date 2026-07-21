"use client";

import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { 
  Plus, 
  Calendar, 
  Flag, 
  CheckCircle2, 
  Circle,
  X,
  Edit2,
  Trash2,
  ListTodo,
  Clock,
  ChevronRight,
  ArrowLeft,
  Send,
  User as UserIcon,
  Users,
  Inbox,
  Share2
} from "lucide-react";
import { useToast } from "@/lib/ToastContext";
import { Task, Profile } from "@/types";
import { useRouter } from "next/navigation";
import AnimalAvatar from "./AnimalAvatar";

export default function TasksClient({ user }: { user: User }) {
  const [tasks, setTasks] = useState<Task[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('cache_tasks');
      return cached ? JSON.parse(cached) : [];
    }
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [longPressTask, setLongPressTask] = useState<Task | null>(null);
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    due_date: "",
    priority: "medium" as 'low' | 'medium' | 'high',
    assigned_to: ""
  });
  const [friends, setFriends] = useState<Profile[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('cache_friends');
      return cached ? JSON.parse(cached) : [];
    }
    return [];
  });
  const [viewMode, setViewMode] = useState<'my' | 'delegated'>('my');
  const [profilesMap, setProfilesMap] = useState<Record<string, Profile>>({});

  const renderAvatar = (url: string | null, seed: string, size = 48) => {
    if (url?.startsWith('animal:')) {
      const parts = url.split(':');
      return <AnimalAvatar type={parts[1] as any} variant={parseInt(parts[2])} colorIndex={parseInt(parts[3])} size={size} />;
    }
    if (url?.startsWith('panda:')) {
      const parts = url.split(':');
      return <AnimalAvatar type="panda" variant={parseInt(parts[1])} colorIndex={parseInt(parts[2])} size={size} />;
    }
    return <AnimalAvatar seed={seed.toLowerCase()} size={size} />;
  };

  const { showToast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    fetchTasks();
  }, [user.id]);

  async function fetchTasks() {
    try {
      setLoading(true);
      // 1. Fetch friend requests and tasks in parallel
      const [friendReqsRes, tasksRes] = await Promise.all([
        supabase.from("friend_requests").select("*, sender:profiles!friend_requests_sender_id_fkey(*)").eq("status", "accepted"),
        supabase.from("tasks").select("*").or(`user_id.eq.${user.id},assigned_to.eq.${user.id},assigned_by.eq.${user.id}`).order("is_completed", { ascending: true }).order("due_date", { ascending: true, nullsFirst: false })
      ]);

      const acc = friendReqsRes.data;
      const receiverEmails = acc?.filter(r => r.sender_id === user.id).map(r => r.receiver_email) || [];
      let receiverProfiles: any[] = [];
      if (receiverEmails.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("*").in("email", receiverEmails);
        receiverProfiles = profs || [];
      }

      const friendsList = (acc?.map(req => {
        if (req.sender_id === user.id) {
          return receiverProfiles.find(p => p.email.toLowerCase() === req.receiver_email.toLowerCase());
        }
        return req.sender;
      }) || []).filter(Boolean) as Profile[];
      
      setFriends(friendsList);
      localStorage.setItem('cache_friends', JSON.stringify(friendsList));

      // Create a map for easy profile lookup
      const pMap: Record<string, Profile> = {};
      friendsList.forEach(f => { pMap[f.id] = f; });
      pMap[user.id] = { id: user.id, email: user.email!, avatar_url: user.user_metadata?.avatar_url, username: user.user_metadata?.username } as any;
      setProfilesMap(pMap);

      if (tasksRes.data) {
        setTasks(tasksRes.data);
        localStorage.setItem('cache_tasks', JSON.stringify(tasksRes.data));
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticTask: Task = {
      id: tempId,
      title: newTask.title,
      description: newTask.description || "",
      priority: newTask.priority || "medium",
      due_date: newTask.due_date || "",
      is_completed: false,
      user_id: newTask.assigned_to || user.id, // Correct user_id for optimistic UI
      assigned_by: user.id,
      assigned_to: newTask.assigned_to || null,
      created_at: new Date().toISOString()
    };

    // 1. Optimistic Add
    setTasks((prev: any[]) => [optimisticTask, ...prev]);
    setIsAddingTask(false);
    setNewTask({ title: "", description: "", due_date: "", priority: "medium", assigned_to: "" });

    try {
      const payload = {
        title: newTask.title,
        description: newTask.description || "",
        priority: newTask.priority || "medium",
        due_date: newTask.due_date || "",
        assigned_to: newTask.assigned_to || null,
        assigned_by: user.id,
        user_id: newTask.assigned_to || user.id // The recipient sees it on their list
      };

      const { data, error } = await supabase
        .from("tasks")
        .insert(payload)
        .select()
        .single();
      
      if (error) throw error;
      
      // 3. Create a notification for the recipient if it's delegated
      if (newTask.assigned_to && newTask.assigned_to !== user.id) {
        await supabase.from("notifications").insert({
          user_id: newTask.assigned_to,
          title: "Nowe zadanie dla Ciebie! 🚀",
          content: `${user.user_metadata?.username || user.email?.split('@')[0]} przypisał(a) Ci zadanie: ${newTask.title}`,
          type: "reminder",
          link: "/tasks"
        });
      }

      showToast("Dodano zadanie!", "success");
    } catch (error) {
      // 3. Revert on error
      setTasks(prev => prev.filter(t => t.id !== tempId));
      showToast("Błąd podczas dodawania zadania", "error");
    }
  }

  async function toggleTask(task: Task) {
    const originalCompleted = task.is_completed;
    
    // 1. Optimistic update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_completed: !t.is_completed } : t));

    try {
      const { error } = await supabase
        .from("tasks")
        .update({ is_completed: !task.is_completed })
        .eq("id", task.id);
      
      if (error) throw error;

      // Notify the assigner if someone else completed their task
      if (!task.is_completed && task.assigned_by && task.assigned_by !== user.id) {
        await supabase.from("notifications").insert({
          user_id: task.assigned_by,
          title: "Zadanie wykonane! ✅",
          content: `${user.user_metadata?.username || user.email?.split('@')[0]} ukończył(a) zadanie: ${task.title}`,
          type: "success",
          link: "/tasks"
        });
      }
    } catch (error) {
      // 2. Revert on error
      setTasks((prev: any[]) => prev.map((t: any) => t.id === task.id ? { ...t, is_completed: originalCompleted } : t));
      showToast("Błąd podczas aktualizacji zadania", "error");
    }
  }

  async function deleteTask(id: string) {
    const previousTasks = [...tasks];
    
    // 1. Optimistic remove
    setTasks((prev: any[]) => prev.filter((t: any) => t.id !== id));
    
    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      
      showToast("Usunięto zadanie", "success");
      localStorage.setItem('cache_tasks', JSON.stringify(tasks.filter(t => t.id !== id)));
    } catch (error) {
      // 2. Revert on error
      setTasks(previousTasks);
      showToast("Błąd podczas usuwania zadania", "error");
    }
  }

  const startPress = (task: Task) => {
    const timer = setTimeout(() => {
      setLongPressTask(task);
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

  const filteredTasks = tasks.filter(t => {
    if (filter === 'pending') return !t.is_completed;
    if (filter === 'completed') return t.is_completed;
    return true;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'medium': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
      default: return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
    }
  };

  const router = useRouter();

  return (
    <div className="flex-1 pb-48 animate-fade-in relative overflow-hidden min-h-screen">
      {/* Background Decor */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 -right-32 w-64 h-64 bg-brand-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="px-6 pt-10 mb-8 relative z-10">
        <div className="flex items-center gap-4 mb-2">
          <button 
            onClick={() => router.back()}
            className="w-10 h-10 rounded-xl bg-surface-2/80 backdrop-blur-md border border-border flex items-center justify-center text-text-muted hover:text-brand-500 transition-colors active:scale-90"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-4xl font-black tracking-tighter" style={{ fontFamily: "var(--font-display)" }}>
            Twoje <span className="text-gradient">Zadania</span>
          </h1>
        </div>
        <div className="flex items-center gap-3 pl-14">
          <div className="w-10 h-1.5 rounded-full bg-brand-500/20" />
          <p className="text-[11px] text-text-muted font-black uppercase tracking-[0.25em] opacity-60">Lista rzeczy do zrobienia</p>
        </div>
      </header>

      {/* Stats & Filters */}
      <div className="px-6 mb-8 relative z-10">
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-surface-2/40 backdrop-blur-xl border border-border p-6 rounded-[2.5rem]">
            <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">Do zrobienia</p>
            <p className="text-3xl font-black text-brand-500">{tasks.filter(t => !t.is_completed).length}</p>
          </div>
          <div className="bg-surface-2/40 backdrop-blur-xl border border-border p-6 rounded-[2.5rem]">
            <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">Ukończone</p>
            <p className="text-3xl font-black text-purple-500">{tasks.filter(t => t.is_completed).length}</p>
          </div>
        </div>

        {/* New Tabs for Collaboration */}
        <div className="flex gap-2 p-1.5 bg-surface-2/40 backdrop-blur-xl border border-border rounded-[2rem] mb-6 shadow-sm">
          <button
            onClick={() => setViewMode('my')}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${
              viewMode === 'my' 
                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' 
                : 'text-text-muted hover:bg-surface-3 transition-colors'
            }`}
          >
            <Inbox size={14} />
            Dla mnie
          </button>
          <button
            onClick={() => setViewMode('delegated')}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${
              viewMode === 'delegated' 
                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' 
                : 'text-text-muted hover:bg-surface-3 transition-colors'
            }`}
          >
            <Send size={14} />
            Wysłane
          </button>
        </div>

        <div className="flex gap-2 p-1.5 bg-surface-2/20 border border-border/50 rounded-2xl">
          {(['pending', 'completed', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                filter === f 
                  ? 'bg-surface-3 text-brand-400 border border-brand-500/30 shadow-sm' 
                  : 'text-text-muted/60 hover:text-text-muted'
              }`}
            >
              {f === 'pending' ? 'W toku' : f === 'completed' ? 'Gotowe' : 'Wszystkie'}
            </button>
          ))}
        </div>
      </div>

      {/* List Content */}
      <div className="px-6 space-y-4 relative z-10">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-24 rounded-3xl bg-surface-2/40 animate-pulse border border-border" />
          ))
        ) : tasks.filter(t => {
          const isMyView = viewMode === 'my';
          // My tasks: not delegated OR delegated TO me
          if (isMyView) {
            const isTargetedToMe = t.assigned_to === user.id;
            const isMineAndNotDelegated = t.user_id === user.id && (!t.assigned_to || t.assigned_to === user.id);
            if (!(isTargetedToMe || isMineAndNotDelegated)) return false;
          } else {
            // Delegated: tasks I assigned to others (assigned_by = me AND assigned_to != me)
            if (!(t.assigned_by === user.id && t.assigned_to && t.assigned_to !== user.id)) return false;
          }
          
          if (filter === 'pending') return !t.is_completed;
          if (filter === 'completed') return t.is_completed;
          return true;
        }).length > 0 ? (
          tasks.filter(t => {
            const isMyView = viewMode === 'my';
            if (isMyView) {
              const isTargetedToMe = t.assigned_to === user.id;
              const isMineAndNotDelegated = t.user_id === user.id && (!t.assigned_to || t.assigned_to === user.id);
              if (!(isTargetedToMe || isMineAndNotDelegated)) return false;
            } else {
              if (!(t.assigned_by === user.id && t.assigned_to && t.assigned_to !== user.id)) return false;
            }
            if (filter === 'pending') return !t.is_completed;
            if (filter === 'completed') return t.is_completed;
            return true;
          }).map((task) => {
            const isDelegatedByMe = task.assigned_by === user.id && task.assigned_to && task.assigned_to !== user.id;
            const isReceivedFromOther = task.assigned_by && task.assigned_by !== user.id;
            const partner = isDelegatedByMe ? profilesMap[task.assigned_to!] : (isReceivedFromOther ? profilesMap[task.assigned_by!] : null);

            return (
              <div 
                key={task.id}
                onMouseDown={() => startPress(task)}
                onMouseUp={endPress}
                onMouseLeave={endPress}
                onTouchStart={() => startPress(task)}
                onTouchEnd={endPress}
                onContextMenu={(e) => e.preventDefault()}
                className={`group flex items-start gap-4 p-5 rounded-3xl bg-surface-2/40 backdrop-blur-xl border border-border transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] select-none no-long-press-menu ${task.is_completed ? 'opacity-40' : ''}`}
              >
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleTask(task);
                  }}
                  className={`mt-1 shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    task.is_completed 
                      ? 'bg-brand-500 border-brand-500 text-white shadow-lg shadow-brand-500/20' 
                      : 'border-border hover:border-brand-500/50'
                  }`}
                >
                  {task.is_completed && <CheckCircle2 size={14} />}
                </button>

                <div className="flex-1 min-w-0" onClick={() => toggleTask(task)}>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={`font-bold text-sm leading-tight transition-all ${task.is_completed ? 'line-through' : ''}`}>
                      {task.title}
                    </h3>
                    
                    {partner && (
                      <div className="flex flex-col items-center flex-shrink-0 -mt-1 scale-90">
                         {renderAvatar(partner.avatar_url, partner.email, 28)}
                         <span className="text-[7px] font-black uppercase tracking-tighter mt-1 opacity-50">
                            {isDelegatedByMe ? 'Dla' : 'Od'} {partner.username || partner.email.split('@')[0]}
                         </span>
                      </div>
                    )}
                  </div>

                  {task.description && (
                    <p className="text-xs text-text-muted mt-1 line-clamp-1">{task.description}</p>
                  )}
                  
                  <div className="flex items-center gap-3 mt-3">
                    {task.due_date && (
                      <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-text-muted bg-surface-3/50 px-2 py-0.5 rounded-full">
                        <Calendar size={10} />
                        {new Date(task.due_date).toLocaleDateString()}
                      </div>
                    )}
                    <div className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full border ${getPriorityColor(task.priority)}`}>
                      {task.priority === 'high' ? 'Pilne' : task.priority === 'medium' ? 'Ważne' : 'Normalne'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-20 text-center space-y-4 opacity-30">
            <ListTodo size={60} className="mx-auto" />
            <p className="text-sm font-bold">Brak zadań w tej sekcji</p>
          </div>
        )}

        <button 
          onClick={() => setIsAddingTask(true)}
          className="w-full h-20 rounded-3xl border-2 border-dashed border-border flex items-center justify-center gap-3 opacity-40 hover:opacity-100 transition-all hover:bg-brand-500/5 hover:border-brand-500/30"
        >
          <Plus size={24} className="text-brand-500" />
          <span className="font-black text-xs uppercase tracking-widest">Dodaj nowe zadanie</span>
        </button>
      </div>

      {/* Add Task Modal */}
      {isAddingTask && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 sm:p-6 animate-fade-in" onClick={() => setIsAddingTask(false)}>
          <div 
            className="w-full max-w-xl bg-surface-1 rounded-[2.5rem] p-8 shadow-2xl animate-pop-in relative max-h-[90vh] overflow-y-auto custom-scrollbar"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black tracking-tight">Nowe zadanie</h2>
              <button onClick={() => setIsAddingTask(false)} className="p-2 rounded-full bg-surface-2 text-muted"><X size={20} /></button>
            </div>

            <form onSubmit={handleAddTask} className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 block px-1">Co masz do zrobienia?</label>
                <input 
                  autoFocus
                  type="text" 
                  value={newTask.title}
                  onChange={e => setNewTask({...newTask, title: e.target.value})}
                  placeholder="np. Wyrzucić śmieci"
                  className="w-full bg-surface-2 border border-border rounded-2xl px-5 py-4 font-bold outline-none focus:border-brand-500 transition-all font-display"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 block px-1">Przypisz do (opcjonalnie)</label>
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 custom-scrollbar">
                  <button
                    type="button"
                    onClick={() => setNewTask({...newTask, assigned_to: ""})}
                    className={`flex-shrink-0 flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${!newTask.assigned_to ? 'bg-brand-500/10 border-brand-500' : 'bg-surface-2 border-border opacity-50'}`}
                  >
                     <div className="w-10 h-10 rounded-full bg-surface-3 flex items-center justify-center border border-border">
                        <UserIcon size={20} />
                     </div>
                     <span className="text-[10px] font-black uppercase">Dla mnie</span>
                  </button>
                  {friends.map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setNewTask({...newTask, assigned_to: f.id})}
                      className={`flex-shrink-0 flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${newTask.assigned_to === f.id ? 'bg-brand-500/10 border-brand-500 shadow-lg shadow-brand-500/5' : 'bg-surface-2 border-border opacity-50'}`}
                    >
                       {renderAvatar(f.avatar_url, f.email, 40)}
                       <span className="text-[10px] font-black uppercase truncate max-w-[64px]">{f.username || f.email.split('@')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 block px-1">Opis (opcjonalnie)</label>
                <textarea 
                  value={newTask.description}
                  onChange={e => setNewTask({...newTask, description: e.target.value})}
                  rows={2}
                  className="w-full bg-surface-2 border border-border rounded-2xl px-5 py-4 font-bold outline-none focus:border-brand-500 transition-all text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 block px-1">Termin</label>
                  <input 
                    type="date" 
                    value={newTask.due_date}
                    onChange={e => setNewTask({...newTask, due_date: e.target.value})}
                    className="w-full bg-surface-2 border border-border rounded-2xl px-5 py-4 font-bold outline-none focus:border-brand-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 block px-1">Priorytet</label>
                  <select 
                    value={newTask.priority}
                    onChange={e => setNewTask({...newTask, priority: e.target.value as any})}
                    className="w-full bg-surface-2 border border-border rounded-2xl px-5 py-4 font-bold outline-none focus:border-brand-500 transition-all appearance-none"
                  >
                    <option value="low">Normalny</option>
                    <option value="medium">Ważne</option>
                    <option value="high">Pilne</option>
                  </select>
                </div>
              </div>

              <div className="pb-6">
                <button 
                  type="submit"
                  className="w-full py-5 mt-4 rounded-2xl gradient-brand text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-brand-500/20 active:scale-95 transition-all"
                >
                  Dodaj zadanie
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Context Menu Modal */}
      {longPressTask && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setLongPressTask(null)}>
          <div 
            className="w-full max-w-[280px] bg-surface-1 rounded-[2rem] shadow-2xl overflow-hidden animate-pop-in border border-white/5"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-border bg-surface-2/50">
              <h3 className="text-sm font-black uppercase tracking-widest text-center truncate">{longPressTask.title}</h3>
            </div>
            <div className="p-2">              
              <button 
                onClick={() => {
                  if (confirm("Czy na pewno chcesz usunąć to zadanie?")) {
                    deleteTask(longPressTask.id);
                    setLongPressTask(null);
                  }
                }}
                className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-red-500/10 text-red-500 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <Trash2 size={18} />
                </div>
                <span className="font-bold">Usuń zadanie</span>
              </button>
            </div>
            <button 
              onClick={() => setLongPressTask(null)}
              className="w-full p-4 text-[10px] font-black uppercase tracking-widest text-text-muted hover:bg-surface-2 transition-colors border-t border-border"
            >
              Anuluj
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
