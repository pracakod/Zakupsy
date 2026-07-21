import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ReceiptsClient from "@/components/ReceiptsClient";

export default async function ReceiptsPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect("/auth");
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <ReceiptsClient user={session.user} />
    </div>
  );
}
