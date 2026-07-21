import HolidaysClient from "@/components/HolidaysClient";
import BottomNav from "@/components/BottomNav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Najbliższe Święta | Zakupsy",
  description: "Kalendarz nadchodzących świąt i okazji w Polsce.",
};

export default async function HolidaysPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect("/auth");
  }

  return (
    <main className="min-h-screen bg-surface-1">
      <HolidaysClient user={session.user} />
      <BottomNav />
    </main>
  );
}
