import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NotesClient from "@/components/NotesClient";


export default async function NotesPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect("/auth");
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <NotesClient user={session.user} />
    </div>
  );
}
