import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ListsClient from "@/components/ListsClient";

export default async function ListsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect("/auth");

  // Render client component immediately and rely on local cache
  return <ListsClient initialLists={[]} user={session.user} />;
}
