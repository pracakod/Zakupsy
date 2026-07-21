import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import HomeClient from "@/components/HomeClient";

export default async function HomePage() {
  const supabase = await createClient();
  // Use a faster check for the session first
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect("/auth");

  return <HomeClient user={session.user} />;
}
