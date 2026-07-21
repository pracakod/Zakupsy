import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import ListsShareClient from "@/components/ListsShareClient";

export default async function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) redirect("/auth");
  const user = session.user;

  const { data: list } = await supabase
    .from("lists")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!list) notFound();

  return (
    <ListsShareClient
      list={list}
      user={user}
    />
  );
}
