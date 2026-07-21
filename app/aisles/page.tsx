import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AislesClient from "@/components/AislesClient";

export default async function AislesPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect("/auth");

  return <AislesClient user={session.user} />;
}
