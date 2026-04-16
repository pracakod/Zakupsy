import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ArchiveClient from "../../components/ArchiveClient";

export default async function ArchivePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: archivedLists } = await supabase
    .from("lists")
    .select("*")
    .eq("status", "archived")
    .order("archived_at", { ascending: false });

  return <ArchiveClient initialLists={archivedLists || []} user={user} />;
}
