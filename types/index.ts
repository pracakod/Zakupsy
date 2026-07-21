export type ShoppingList = {
  id: string;
  created_at: string;
  name: string;
  user_id: string;
  status: 'active' | 'archived';
  archived_at?: string | null;
  item_count?: number;
  completed_count?: number;
  icon?: string | null;
};

export type Item = {
  id: string;
  list_id: string;
  name: string;
  is_completed: boolean;
  user_id: string;
  created_at: string;
  category: string;
  status: 'pending' | 'completed' | 'missing';
  icon?: string;
  author?: {
    username: string;
  };
};

export type Recipe = {
  id: string;
  author_id: string;
  name: string;
  description: string | null;
  instructions: string[] | null;
  image_url: string | null;
  prep_time: number | null;
  difficulty: string | null;
  category: string | null;
  created_at: string;
  ingredients: RecipeIngredient[];
};

export type RecipeIngredient = {
  id: string;
  recipe_id: string;
  name: string;
  amount: string | null;
  unit: string | null;
  category: string | null;
};

export type Task = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high';
  assigned_to: string | null;
  assigned_by: string | null;
  created_at: string;
};

export type LoyaltyCard = {
  id: string;
  user_id: string;
  name: string;
  code: string;
  provider?: string | null;
  color: string;
  barcode_type: 'code128' | 'ean13' | 'qr';
  created_at: string;
};

export type Profile = {
  id: string;
  email: string;
  username: string | null;
  avatar_url: string | null;
  last_seen: string | null;
};
