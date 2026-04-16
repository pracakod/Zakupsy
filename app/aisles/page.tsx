import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AislesClient from "@/components/AislesClient";

export default async function AislesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  return <AislesClient user={user} />;
}
