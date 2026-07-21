import CardsClient from "@/components/CardsClient";
import BottomNav from "@/components/BottomNav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Karty Lojalnościowe | Zakupsy",
  description: "Twój wirtualny portfel kart lojalnościowych.",
};

export default async function CardsPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect("/auth");
  }

  return (
    <main className="min-h-screen bg-surface-1">
      <CardsClient user={session.user} />
      <BottomNav />
    </main>
  );
}
