import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import FriendsClient from "@/components/FriendsClient";

export default async function FriendsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  return <FriendsClient user={user} />;
}
