import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import RecipesClient from "@/components/RecipesClient";

export default async function RecipesPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) redirect("/auth");

  return <RecipesClient user={session.user} />;
}
