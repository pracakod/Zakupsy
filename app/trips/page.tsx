import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TripsClient from "@/components/TripsClient";

export default async function TripsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  return <TripsClient user={user} />;
}
