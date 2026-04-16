import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ListsClient from "@/components/ListsClient";

export default async function ListsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  const { data: lists } = await supabase
    .from("lists")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  return <ListsClient initialLists={lists ?? []} user={user} />;
}
