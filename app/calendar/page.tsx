import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CalendarClient from "@/components/CalendarClient";

export default async function CalendarPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) redirect("/auth");

  return <CalendarClient user={session.user} />;
}
