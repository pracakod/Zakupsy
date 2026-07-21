import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import FriendsClient from "@/components/FriendsClient";

export default async function FriendsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect("/auth");
  const user = session.user;

  // Render client component immediately with local caching
  return (
    <FriendsClient 
      user={user} 
    />
  );
}
