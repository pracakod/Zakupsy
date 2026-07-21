import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ArchiveClient from "@/components/ArchiveClient";

export default async function ArchivePage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) redirect("/auth");

  const [ownRes, sharedRes] = await Promise.all([
    supabase
      .from("lists")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("status", "archived")
      .order("archived_at", { ascending: false }),
    supabase
      .from("list_shares")
      .select("list:lists(*)")
      .or(`user_id.eq.${session.user.id},invited_email.eq.${session.user.email}`)
  ]);

  const ownLists = ownRes.data || [];
  const sharedLists = (sharedRes.data || [])
    .map((s: any) => s.list)
    .filter((l: any) => l && l.status === "archived");

  const allLists = [...ownLists, ...sharedLists].sort((a, b) => 
    new Date(b.archived_at || b.created_at).getTime() - new Date(a.archived_at || a.created_at).getTime()
  );

  return <ArchiveClient user={session.user} initialLists={allLists} />;
}
