import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TasksClient from "@/components/TasksClient";

export default async function TasksPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) redirect("/auth");

  return <TasksClient user={session.user} />;
}
