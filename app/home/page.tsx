import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import HomeClient from "@/components/HomeClient";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  return <HomeClient user={user} />;
}
