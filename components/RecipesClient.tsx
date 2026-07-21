"use client";

import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { 
  Search, 
  Plus, 
  Clock, 
  ChefHat, 
  ChevronRight, 
  Utensils, 
  Filter,
  ShoppingCart,
  Check,
  X,
  Type,
  Loader2,
  Edit2,
  Trash2,
  ArrowLeft,
  Send,
  UserPlus,
  Camera
} from "lucide-react";
import { useToast } from "@/lib/ToastContext";
import { Recipe, RecipeIngredient } from "@/types";
import { useRouter } from "next/navigation";
import ListIcon from "./ListIcon";
import ListPicker from "./ListPicker";
import AnimalAvatar from "./AnimalAvatar";

export default function RecipesClient({ user }: { user: User }) {
  const [recipes, setRecipes] = useState<Recipe[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('cache_recipes');
      return cached ? JSON.parse(cached) : [];
    }
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Wszystkie");
  const [selectedRecipe, setSelectedRecipe] = useState<(Recipe & { ingredients: RecipeIngredient[] }) | null>(null);
  const [userLists, setUserLists] = useState<{id: string, name: string, icon?: string}[]>([]);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [friends, setFriends] = useState<{id: string, email: string, username?: string, avatar_url?: string}[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('cache_friends');
      return cached ? JSON.parse(cached) : [];
    }
    return [];
  });
  const [isSharingModalOpen, setIsSharingModalOpen] = useState(false);
  const [recipeToShare, setRecipeToShare] = useState<Recipe | null>(null);
  
  const [supabase] = useState(() => createClient());
  const { showToast } = useToast();
  const router = useRouter();

  const categories = ["Wszystkie", "Obiad", "Śniadanie", "Kolacja", "Fit", "Fast Food", "Desery"];

  const renderAvatar = (url: string | null, seed: string, size = 48) => {
    if (url?.startsWith('animal:')) {
      const parts = url.split(':');
      return <AnimalAvatar type={parts[1] as any} variant={parseInt(parts[2])} colorIndex={parseInt(parts[3])} size={size} />;
    }
    if (url?.startsWith('panda:')) {
      const parts = url.split(':');
      return <AnimalAvatar type="panda" variant={parseInt(parts[1])} colorIndex={parseInt(parts[2])} size={size} />;
    }
    return <AnimalAvatar seed={seed} size={size} />;
  };

  useEffect(() => {
    fetchRecipes();
    fetchUserLists();
    fetchFriends();
    
    // Check for shared recipe id in URL
    const urlParams = new URLSearchParams(window.location.search);
    const sharedId = urlParams.get('id');
    if (sharedId) {
      openRecipe(sharedId);
    }
  }, [user.id]);

  async function fetchFriends() {
    // Fetch accepted friend requests (consistent with FriendsClient logic)
    const { data: acc } = await supabase
      .from("friend_requests")
      .select("*, sender:profiles!sender_id(*)")
      .or(`sender_id.eq.${user.id},receiver_email.eq.${user.email}`)
      .eq("status", "accepted");
    
    if (acc) {
      const receiverEmails = acc
        .filter(r => r.sender_id === user.id)
        .map(r => r.receiver_email);

      let receiverProfiles: any[] = [];
      if (receiverEmails.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email, username, avatar_url")
          .in("email", receiverEmails);
        if (profiles) receiverProfiles = profiles;
      }

      const friendList = acc.map(r => {
        if (r.sender_id === user.id) {
          return receiverProfiles.find(p => p.email === r.receiver_email);
        }
        return r.sender;
      }).filter(Boolean);

      setFriends(friendList);
      localStorage.setItem('cache_friends', JSON.stringify(friendList));
    }
  }

  async function shareRecipe(recipe: Recipe, friendId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const myName = user.email?.split("@")[0] || "Znajomy";

    const { error } = await supabase.from("notifications").insert({
      user_id: friendId,
      title: "Dostałeś przepis! 🍜",
      content: `${myName} wysłał Ci przepis: ${recipe.name}`,
      type: "info",
      link: `/recipes?id=${recipe.id}`
    });

    if (!error) {
      showToast("Wysłano przepis do znajomego!", "success");
      setIsSharingModalOpen(false);
    } else {
      showToast("Błąd podczas wysyłania", "error");
    }
  }

  async function fetchRecipes() {
    setLoading(true);
    const { data, error } = await supabase
      .from("recipes")
      .select("*")
      .eq("author_id", user.id)
      .order("created_at", { ascending: false });
    
    if (!error && data) {
      setRecipes(data);
      localStorage.setItem('cache_recipes', JSON.stringify(data));
    }
    setLoading(false);
  }

  async function fetchUserLists() {
    const [ownRes, sharedRes] = await Promise.all([
      supabase
        .from("lists")
        .select("id, name, icon")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false }),
      supabase
        .from("list_shares")
        .select("list:lists(id, name, icon, status)")
        .or(`user_id.eq.${user.id},invited_email.eq.${user.email}`)
    ]);
    
    const ownLists = ownRes.data || [];
    const sharedLists = (sharedRes.data || [])
      .map((s: any) => s.list)
      .filter((l: any) => l && l.status === "active");

    const allLists = [...ownLists, ...sharedLists];

    if (allLists.length > 0) {
      setUserLists(allLists as any);
      const savedActiveListId = localStorage.getItem(`last_list_${user.id}`);
      if (savedActiveListId && allLists.some(l => l.id === savedActiveListId)) {
        setActiveListId(savedActiveListId);
      } else {
        setActiveListId(allLists[0].id);
      }
    }
  }

  const handleActiveListChange = (id: string) => {
    setActiveListId(id);
    localStorage.setItem(`last_list_${user.id}`, id);
  };

  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setPreviewUrl(URL.createObjectURL(file));

    try {
      const compressedBlob = await compressImage(file);
      const fileName = `${Math.random()}.webp`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('recipes')
        .upload(filePath, compressedBlob, {
          contentType: 'image/webp'
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('recipes')
        .getPublicUrl(filePath);
      
      setNewRecipe({ ...newRecipe, image_url: publicUrl });
    } catch (error) {
      console.error("Upload error:", error);
      showToast("Błąd podczas przesyłania zdjęcia", "error");
    } finally {
      setUploading(false);
    }
  };

  async function openRecipe(recipeId: string) {
    const { data: recipe } = await supabase
      .from("recipes")
      .select("*")
      .eq("id", recipeId)
      .single();
    
    const { data: ingredients } = await supabase
      .from("recipe_ingredients")
      .select("*")
      .eq("recipe_id", recipeId);
      
    if (recipe) {
      setSelectedRecipe({ ...recipe, ingredients: ingredients || [] });
    }
  }

  const [isAddingRecipe, setIsAddingRecipe] = useState(false);
  const [newRecipe, setNewRecipe] = useState({
    name: "",
    description: "",
    prep_time: 30,
    category: "Obiad",
    image_url: ""
  });
  const [newIngredients, setNewIngredients] = useState<Partial<RecipeIngredient>[]>([{ name: "", amount: "", unit: "" }]);
  const [newInstructions, setNewInstructions] = useState<string[]>([""]);

  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [longPressRecipe, setLongPressRecipe] = useState<Recipe | null>(null);
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);

  const startPress = (recipe: Recipe) => {
    const timer = setTimeout(() => {
      setLongPressRecipe(recipe);
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

  async function deleteRecipe(id: string) {
    const previousRecipes = [...recipes];
    
    // Optimistic remove
    setRecipes((prev: any[]) => prev.filter((r: any) => r.id !== id));
    
    const { error } = await supabase
      .from("recipes")
      .delete()
      .eq("id", id);
    
    if (error) {
      // Revert
      setRecipes(previousRecipes);
      showToast("Błąd przy usuwaniu przepisu: " + error.message, "error");
    } else {
      showToast("Usunięto przepis", "success");
      localStorage.setItem('cache_recipes', JSON.stringify(recipes.filter(r => r.id !== id)));
    }
  }

  async function handleAddRecipe(e: React.FormEvent) {
    e.preventDefault();
    if (!newRecipe.name.trim()) return;

    const recipeData = {
      ...newRecipe,
      author_id: user.id,
      instructions: newInstructions.filter(i => i.trim() !== "")
    };

    try {
      let data, error;
      if (editingRecipe) {
        const { data: d, error: e } = await supabase
          .from("recipes")
          .update(recipeData)
          .eq("id", editingRecipe.id)
          .select()
          .single();
        data = d;
        error = e;
      } else {
        const { data: d, error: e } = await supabase
          .from("recipes")
          .insert(recipeData)
          .select()
          .single();
        data = d;
        error = e;
      }
      
      if (error) throw error;
      const recipeId = data.id;

      // Update ingredients: delete old ones and insert new ones for simplicity
      if (editingRecipe) {
        await supabase.from("recipe_ingredients").delete().eq("recipe_id", editingRecipe.id);
      }

      const ingredientsToInsert = newIngredients
        .filter(ing => ing.name?.trim() !== "")
        .map(ing => ({
          ...ing,
          recipe_id: recipeId
        }));
      
      if (ingredientsToInsert.length > 0) {
        const { error: ingError } = await supabase
          .from("recipe_ingredients")
          .insert(ingredientsToInsert);
        if (ingError) throw ingError;
      }

      showToast(editingRecipe ? "Zaktualizowano przepis!" : "Dodano przepis!", "success");
      setIsAddingRecipe(false);
      resetNewRecipe();
      fetchRecipes();
    } catch (error) {
      console.error("Error saving recipe:", error);
      showToast("Błąd podczas zapisywania przepisu", "error");
    }
  }

  function resetNewRecipe() {
    setNewRecipe({ name: "", description: "", prep_time: 30, category: "Obiad", image_url: "" });
    setNewIngredients([{ name: "", amount: "", unit: "" }]);
    setNewInstructions([""]);
  }

  async function addIngredientsToList() {
    if (!selectedRecipe || !activeListId) {
      showToast("Wybierz najpierw listę zakupów!", "error");
      return;
    }

    // 1. Get existing items on this list to avoid duplicates
    const { data: existingItems } = await supabase
      .from("items")
      .select("name")
      .eq("list_id", activeListId);
    
    const existingNames = new Set((existingItems || []).map(i => i.name.toLowerCase()));

    const itemsToAdd = selectedRecipe.ingredients.map(ing => {
      const name = `${ing.name} ${ing.amount || ""} ${ing.unit || ""}`.trim();
      return {
        list_id: activeListId,
        user_id: user.id,
        name: name,
        category: ing.category || 'Inne',
        status: 'pending'
      };
    }).filter(item => !existingNames.has(item.name.toLowerCase()));

    if (itemsToAdd.length === 0) {
      showToast("Wszystkie te produkty są już na wybranej liście!", "info");
      return;
    }

    const ingredientsCount = itemsToAdd.length;
    const targetListName = userLists.find(l => l.id === activeListId)?.name;
    const skippedCount = selectedRecipe.ingredients.length - itemsToAdd.length;

    // Snappy UI: close modal immediately
    setSelectedRecipe(null);
    showToast(`Dodawanie ${ingredientsCount} składników...`, "info");

    const { error } = await supabase.from("items").insert(itemsToAdd);

    if (!error) {
      if (skippedCount > 0) {
        showToast(`Dodano ${ingredientsCount} nowych składników do "${targetListName}" (pominięto ${skippedCount} istniejących)!`, "success");
      } else {
        showToast(`Dodano ${ingredientsCount} składników do listy "${targetListName}"!`, "success");
      }
    } else {
      showToast("Błąd podczas dodawania składników", "error");
    }
  }

  const filteredRecipes = recipes.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "Wszystkie" || r.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });



  return (
    <div className="flex-1 pb-48 animate-fade-in relative overflow-hidden min-h-screen">
      {/* Background Decor */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-orange-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 -right-32 w-64 h-64 bg-brand-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="px-6 pt-10 mb-8 relative z-10 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <button 
              onClick={() => router.back()}
              className="w-10 h-10 rounded-xl bg-surface-2/80 backdrop-blur-md border border-border flex items-center justify-center text-text-muted hover:text-brand-500 transition-colors active:scale-90"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-4xl font-black tracking-tighter" style={{ fontFamily: "var(--font-display)" }}>
              Twoje <span className="text-gradient">Przepisy</span>
            </h1>
          </div>
          <div className="flex items-center gap-3 pl-14">
            <div className="w-10 h-1.5 rounded-full bg-brand-500/20" />
            <p className="text-[11px] text-text-muted font-black uppercase tracking-[0.25em] opacity-60">Szef kuchni poleca</p>
          </div>
        </div>
      </header>

      {/* Search & Categories */}
      <div className="px-6 mb-8 relative z-10 space-y-6">
        <div className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-brand-500 transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Szukaj przepisu lub składnika..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-16 bg-surface-2/40 backdrop-blur-xl border border-border rounded-3xl pl-14 pr-6 text-sm font-bold focus:border-brand-500 transition-all outline-none placeholder:opacity-30"
          />
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-6 py-3 rounded-2xl whitespace-nowrap text-[11px] font-black uppercase tracking-widest transition-all ${
                selectedCategory === cat 
                  ? 'bg-brand-500 text-white shadow-xl shadow-brand-500/20' 
                  : 'bg-surface-2/60 backdrop-blur-md border border-border text-text-muted hover:border-brand-500/30'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Content */}
      <div className="px-4 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
        {loading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="h-48 rounded-3xl bg-surface-2/40 animate-pulse border border-border" />
          ))
        ) : filteredRecipes.length > 0 ? (
          filteredRecipes.map((recipe, i) => (
            <div 
              key={recipe.id}
              onMouseDown={() => startPress(recipe)}
              onMouseUp={endPress}
              onMouseLeave={endPress}
              onTouchStart={() => startPress(recipe)}
              onTouchEnd={endPress}
              onContextMenu={(e) => e.preventDefault()}
              onClick={() => openRecipe(recipe.id)}
              className="group relative h-56 rounded-3xl overflow-hidden bg-surface-2/40 backdrop-blur-xl border border-border hover:border-brand-500/40 transition-all duration-500 cursor-pointer hover:scale-[1.02] shadow-xl hover:shadow-2xl hover:shadow-brand-500/10 active:scale-95 select-none touch-pan-y"
              style={{ animationDelay: `${i * 100}ms`, WebkitTouchCallout: 'none' }}
            >
              <img 
                src={recipe.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80"} 
                className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700"
                alt={recipe.name}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              
              <div className="absolute bottom-0 left-0 w-full p-4 text-white">
                <div className="flex gap-1.5 mb-2">
                  <div className="px-2 py-0.5 rounded-full bg-brand-500 text-[8px] font-black uppercase tracking-widest shadow-lg">
                    {recipe.category || "Obiad"}
                  </div>
                </div>
                <h3 className="text-sm font-black mb-0.5 group-hover:text-brand-400 transition-colors line-clamp-1">{recipe.name}</h3>
                <p className="text-[10px] opacity-60 line-clamp-1 font-bold">
                  <Clock size={10} className="inline mr-1" /> {recipe.prep_time || "30"} min
                </p>
              </div>

              <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
                  <ChefHat size={14} className="text-white" />
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setRecipeToShare(recipe);
                    setIsSharingModalOpen(true);
                  }}
                  className="w-8 h-8 rounded-xl bg-brand-500 text-white shadow-lg shadow-brand-500/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-surface-2 rounded-full flex items-center justify-center mx-auto text-text-muted opacity-30">
              <Utensils size={40} />
            </div>
            <p className="text-sm font-bold text-text-muted opacity-60">Nie znaleźliśmy takich przepisów...</p>
          </div>
        )}

        {/* Add Button */}
        <button 
          onClick={() => {
            resetNewRecipe();
            setEditingRecipe(null);
            setIsAddingRecipe(true);
          }}
          className="h-56 rounded-3xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 opacity-40 hover:opacity-100 transition-all duration-300 cursor-pointer hover:bg-brand-500/5 hover:border-brand-500/30"
        >
          <div className="w-12 h-12 rounded-2xl bg-surface-2 flex items-center justify-center text-text-muted">
            <Plus size={24} strokeWidth={2.5} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Nowy przepis</span>
        </button>
      </div>

      {/* Context Menu Modal */}
      {longPressRecipe && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setLongPressRecipe(null)}>
          <div 
            className="w-full max-w-[280px] bg-surface-1 rounded-[2rem] shadow-2xl overflow-hidden animate-pop-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-border bg-surface-2/50">
              <h3 className="text-sm font-black uppercase tracking-widest text-center truncate">{longPressRecipe.name}</h3>
            </div>
            <div className="p-2">
              <button 
                onClick={() => {
                  setRecipeToShare(longPressRecipe);
                  setIsSharingModalOpen(true);
                  setLongPressRecipe(null);
                }}
                className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-brand-500/10 text-brand-500 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center group-hover:bg-brand-500/20">
                  <Send size={18} />
                </div>
                <span className="font-bold">Udostępnij przepis</span>
              </button>

              <button 
                onClick={() => {
                  setEditingRecipe(longPressRecipe);
                  setNewRecipe({
                    name: longPressRecipe.name || "",
                    description: longPressRecipe.description || "",
                    prep_time: longPressRecipe.prep_time || 30,
                    category: longPressRecipe.category || "Obiad",
                    image_url: longPressRecipe.image_url || ""
                  });
                  setNewIngredients(longPressRecipe.ingredients || [{ name: "", amount: "", unit: "" }]);
                  setNewInstructions(longPressRecipe.instructions || [""]);
                  setPreviewUrl(longPressRecipe.image_url || null);
                  setIsAddingRecipe(true);
                  setLongPressRecipe(null);
                }}
                className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-surface-2 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-surface-2 flex items-center justify-center">
                  <Edit2 size={18} />
                </div>
                <span className="font-bold">Edytuj przepis</span>
              </button>
              
              <button 
                onClick={() => {
                  if (confirm("Czy na pewno chcesz usunąć ten przepis?")) {
                    deleteRecipe(longPressRecipe.id);
                    setLongPressRecipe(null);
                  }
                }}
                className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-red-500/10 text-red-500 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <Trash2 size={18} />
                </div>
                <span className="font-bold">Usuń przepis</span>
              </button>
              <button 
                onClick={() => setLongPressRecipe(null)}
                className="w-full p-4 text-[10px] font-black uppercase tracking-widest text-text-muted hover:bg-surface-2 transition-colors"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Recipe Modal */}
      {isAddingRecipe && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 sm:p-6 animate-fade-in" onClick={() => setIsAddingRecipe(false)}>
          <div 
            className="w-full max-w-2xl bg-surface-1 rounded-[2.5rem] max-h-[90vh] overflow-y-auto shadow-2xl animate-pop-in relative p-6 sm:p-8 custom-scrollbar"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black tracking-tight">Nowy przepis</h2>
              <button onClick={() => setIsAddingRecipe(false)} className="p-2 rounded-full bg-surface-2 text-muted"><X size={20} /></button>
            </div>

            <form onSubmit={handleAddRecipe} className="space-y-8">
              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 block px-1">Nazwa potrawy</label>
                  <input 
                    type="text" 
                    value={newRecipe.name}
                    onChange={e => setNewRecipe({...newRecipe, name: e.target.value})}
                    placeholder="np. Spaghetti Carbonara"
                    className="w-full bg-surface-2 border border-border rounded-2xl px-5 py-4 font-bold outline-none focus:border-brand-500 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 block px-1">Kategoria</label>
                  <select 
                    value={newRecipe.category}
                    onChange={e => setNewRecipe({...newRecipe, category: e.target.value})}
                    className="w-full bg-surface-2 border border-border rounded-2xl px-5 py-4 font-bold outline-none focus:border-brand-500 transition-all appearance-none"
                  >
                    {categories.filter(c => c !== "Wszystkie").map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 block px-1">Czas (min)</label>
                  <input 
                    type="number" 
                    value={newRecipe.prep_time}
                    onChange={e => setNewRecipe({...newRecipe, prep_time: parseInt(e.target.value) || 0})}
                    className="w-full bg-surface-2 border border-border rounded-2xl px-5 py-4 font-bold outline-none focus:border-brand-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 block px-1">Zdjęcie potrawy</label>
                  <div className="relative h-[58px] sm:h-[58px]">
                    <div className="absolute inset-0 bg-surface-2 border border-border rounded-2xl flex items-center px-5 gap-3 cursor-pointer hover:border-brand-500/50 transition-all overflow-hidden">
                      {uploading ? (
                        <Loader2 size={18} className="animate-spin text-brand-500" />
                      ) : (
                        <Camera size={18} className="text-muted" />
                      )}
                      <span className="text-xs font-bold truncate text-muted">
                        {previewUrl ? "Zmień zdjęcie" : "Wgraj zdjęcie..."}
                      </span>
                      {previewUrl && (
                        <div className="ml-auto w-8 h-8 rounded-lg overflow-hidden border border-border">
                          <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                        </div>
                      )}
                    </div>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 block px-1">Krótki opis</label>
                <textarea 
                  value={newRecipe.description}
                  onChange={e => setNewRecipe({...newRecipe, description: e.target.value})}
                  rows={2}
                  className="w-full bg-surface-2 border border-border rounded-2xl px-5 py-4 font-bold outline-none focus:border-brand-500 transition-all"
                />
              </div>

              {/* Ingredients */}
              <div>
                <div className="flex items-center justify-between mb-4 px-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted">Składniki</label>
                  <button 
                    type="button" 
                    onClick={() => setNewIngredients([...newIngredients, { name: "", amount: "", unit: "" }])}
                    className="text-[10px] font-black text-brand-500 uppercase tracking-widest flex items-center gap-1"
                  >
                    <Plus size={14} /> Dodaj
                  </button>
                </div>
                <div className="space-y-3">
                  {newIngredients.map((ing, i) => (
                    <div key={i} className="flex gap-1.5 sm:gap-2">
                      <input 
                        type="text" 
                        placeholder="Nazwa" 
                        value={ing.name}
                        onChange={e => {
                          const val = [...newIngredients];
                          val[i].name = e.target.value;
                          setNewIngredients(val);
                        }}
                        className="flex-[4] min-w-0 bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-xs sm:text-sm font-bold outline-none focus:border-brand-500"
                      />
                      <input 
                        type="text" 
                        placeholder="Ile" 
                        value={ing.amount || ""}
                        className="flex-[1.5] min-w-0 bg-surface-2 border border-border rounded-xl px-2 py-2.5 text-xs sm:text-sm font-bold text-center outline-none focus:border-brand-500"
                        onChange={e => {
                          const val = [...newIngredients];
                          val[i].amount = e.target.value;
                          setNewIngredients(val);
                        }}
                      />
                      <input 
                        type="text" 
                        placeholder="J.m." 
                        value={ing.unit || ""}
                        className="flex-[1.5] min-w-0 bg-surface-2 border border-border rounded-xl px-2 py-2.5 text-xs sm:text-sm font-bold text-center outline-none focus:border-brand-500"
                        onChange={e => {
                          const val = [...newIngredients];
                          val[i].unit = e.target.value;
                          setNewIngredients(val);
                        }}
                      />
                      {newIngredients.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => setNewIngredients(newIngredients.filter((_, idx) => idx !== i))}
                          className="p-2 text-red-500 opacity-60 hover:opacity-100 shrink-0"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <div>
                <div className="flex items-center justify-between mb-4 px-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted">Instrukcje (krok po kroku)</label>
                  <button 
                    type="button" 
                    onClick={() => setNewInstructions([...newInstructions, ""])}
                    className="text-[10px] font-black text-brand-500 uppercase tracking-widest flex items-center gap-1"
                  >
                    <Plus size={14} /> Dodaj krok
                  </button>
                </div>
                <div className="space-y-4">
                  {newInstructions.map((step, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center shrink-0 text-xs font-black">{i + 1}</div>
                      <textarea 
                        value={step}
                        onChange={e => {
                          const val = [...newInstructions];
                          val[i] = e.target.value;
                          setNewInstructions(val);
                        }}
                        rows={1}
                        className="flex-1 bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-brand-500"
                      />
                      {newInstructions.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => setNewInstructions(newInstructions.filter((_, idx) => idx !== i))}
                          className="p-2 text-red-500 opacity-60 hover:opacity-100"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 pb-20">
                <button 
                  type="submit"
                  className="w-full py-5 rounded-2xl gradient-brand text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-brand-500/20 active:scale-95 transition-all"
                >
                  Zapisz przepis
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recipe Detail Modal */}
      {selectedRecipe && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-xl animate-fade-in p-0 sm:p-6" onClick={() => setSelectedRecipe(null)}>
          <div 
            className="w-full max-w-3xl bg-surface-1 sm:rounded-[3rem] rounded-t-[3rem] h-[92vh] overflow-y-auto shadow-2xl animate-slide-up relative custom-scrollbar flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Image Header */}
            <div className="relative h-72 sm:h-96 w-full flex-shrink-0">
              <img 
                src={selectedRecipe.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80"} 
                className="w-full h-full object-cover"
                alt={selectedRecipe.name}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface-1 via-transparent to-transparent" />
              <button 
                onClick={() => setSelectedRecipe(null)}
                className="absolute top-6 right-6 w-12 h-12 bg-black/50 backdrop-blur-md rounded-2xl flex items-center justify-center text-white hover:bg-black/70 transition-all z-20"
              >
                <X size={24} />
              </button>
            </div>

            <div className="px-8 pb-40 -mt-16 relative z-10 bg-surface-1 sm:rounded-t-[3rem] rounded-t-[2.5rem]">
              <div className="pt-8 flex flex-col">
                <div className="flex gap-2 mb-4">
                  <span className="px-4 py-1.5 rounded-full bg-brand-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-500/30">
                    {selectedRecipe.category || "Obiad"}
                  </span>
                  <span className="px-4 py-1.5 rounded-full bg-surface-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <Clock size={12} /> {selectedRecipe.prep_time || 30} min
                  </span>
                </div>

                <h2 className="text-4xl sm:text-5xl font-black mb-6 tracking-tighter leading-none text-text-primary" style={{ fontFamily: "var(--font-display)" }}>{selectedRecipe.name}</h2>
                <p className="text-text-secondary text-base leading-relaxed mb-12 max-w-2xl">{selectedRecipe.description}</p>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
                  {/* Ingredients Column */}
                  <div className="lg:col-span-2 space-y-8">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-[0.25em] flex items-center gap-2.5 text-brand-500 mb-6">
                        <ShoppingCart size={16} /> Składniki
                      </h3>
                      <div className="space-y-3">
                        {selectedRecipe.ingredients.map((ing, i) => (
                          <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-surface-2/60 border border-border group transition-all hover:border-brand-500/20">
                            <div className="w-10 h-10 rounded-xl bg-surface-3 flex items-center justify-center text-lg shadow-inner group-hover:scale-105 transition-transform">
                              <Check size={16} className="text-brand-500 opacity-20 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-text-primary leading-tight">{ing.name}</p>
                              <p className="text-[11px] text-text-muted font-bold uppercase tracking-widest mt-0.5">
                                {ing.amount} {ing.unit}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Add to List Controls */}
                    <div className="p-6 rounded-3xl bg-surface-2 border border-border space-y-5 relative z-[50]">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-text-muted px-1">Dodaj do listy:</label>
                        <ListPicker 
                          lists={userLists}
                          activeId={activeListId}
                          onChange={handleActiveListChange}
                        />
                      </div>
                      
                      <button 
                        onClick={addIngredientsToList}
                        className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-black text-xs uppercase tracking-[0.15em] transition-all shadow-xl shadow-brand-500/20 active:scale-95 group"
                      >
                        <ShoppingCart size={20} className="group-hover:-translate-x-1 transition-transform" />
                        Dodaj wszystko
                      </button>
                    </div>
                  </div>

                  {/* Instructions Column */}
                  <div className="lg:col-span-3 space-y-8">
                    <h3 className="text-xs font-black uppercase tracking-[0.25em] flex items-center gap-2.5 text-brand-500 mb-6">
                      <ChefHat size={16} /> Przygotowanie
                    </h3>
                    <div className="space-y-8">
                      {selectedRecipe.instructions ? selectedRecipe.instructions.map((step, i) => (
                        <div key={i} className="flex gap-6 group">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white flex items-center justify-center shrink-0 font-black text-sm shadow-lg shadow-brand-500/20 group-hover:scale-110 transition-transform">
                            {i + 1}
                          </div>
                          <div className="pt-1.5 flex-1">
                            <p className="text-base leading-relaxed text-text-primary group-hover:text-brand-400 transition-colors font-medium">{step}</p>
                          </div>
                        </div>
                      )) : (
                        <p className="text-sm text-text-muted italic">Krok 1: Przygotuj składniki... Krok 2: Ciesz się jedzeniem!</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Sharing Modal */}
      {isSharingModalOpen && recipeToShare && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setIsSharingModalOpen(false)}>
          <div 
            className="w-full max-w-[320px] bg-surface-1 rounded-[2.5rem] shadow-2xl overflow-hidden animate-pop-in border border-white/5"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-8 pb-4 text-center">
              <div className="w-16 h-16 bg-brand-500/10 rounded-3xl flex items-center justify-center text-brand-500 mx-auto mb-4 border border-brand-500/20">
                <Send size={28} className="translate-x-0.5 -translate-y-0.5" />
              </div>
              <h3 className="text-lg font-black tracking-tight mb-2">Wyślij przepis</h3>
              <p className="text-xs text-text-muted">Komu chcesz wysłać "{recipeToShare.name}"?</p>
            </div>

            <div className="p-4 max-h-[300px] overflow-y-auto custom-scrollbar">
              {friends.length === 0 ? (
                <div className="py-8 text-center opacity-30">
                  <UserPlus size={32} className="mx-auto mb-2" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Brak znajomych</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {friends.map(friend => (
                    <button 
                      key={friend.id}
                      onClick={() => shareRecipe(recipeToShare, friend.id)}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-surface-2 hover:bg-brand-500/10 hover:text-brand-500 transition-all border border-border group active:scale-95"
                    >
                      {renderAvatar(friend.avatar_url || null, friend.email, 40)}
                      <div className="text-left">
                        <p className="text-sm font-black truncate">{friend.username || friend.email.split('@')[0]}</p>
                        <p className="text-[10px] opacity-40 font-bold truncate">{friend.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 pt-0">
              <button 
                onClick={() => setIsSharingModalOpen(false)}
                className="w-full py-4 rounded-2xl bg-surface-2 text-[10px] font-black uppercase tracking-widest hover:bg-surface-3 transition-all"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
