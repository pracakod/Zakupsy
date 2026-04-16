import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import ShoppingListClient from "@/components/ShoppingListClient";

export default async function ListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  // 1. Fetch list by ID
  const { data: list } = await supabase
    .from("lists")
    .select("*")
    .eq("id", id)
    .single();

  if (!list) notFound();

  // 2. Check accessibility (Owner OR Shared)
  if (list.user_id !== user.id) {
    const { data: share } = await supabase
      .from("list_shares")
      .select("id")
      .eq("list_id", id)
      .eq("user_id", user.id)
      .single();
    
    if (!share) notFound();
  }

  const { data: items } = await supabase
    .from("items")
    .select("*")
    .eq("list_id", id)
    .order("created_at", { ascending: true });

  return (
    <ShoppingListClient
      list={list}
      initialItems={items ?? []}
      user={user}
    />
  );
}
