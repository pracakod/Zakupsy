export type ShoppingList = {
  id: string;
  created_at: string;
  name: string;
  user_id: string;
  status: 'active' | 'archived';
  archived_at?: string | null;
  item_count?: number;
  completed_count?: number;
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
};
