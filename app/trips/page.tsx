import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TripsClient from "@/components/TripsClient";

export default async function TripsPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) redirect("/auth");

  return <TripsClient user={session.user} />;
}
