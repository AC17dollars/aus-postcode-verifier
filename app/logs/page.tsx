import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { AdminLogsView } from "@/components/admin-logs-view";

export default async function LogsPage() {
  const session = await getSession();
  if (!session?.admin) {
    redirect("/");
  }
  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-indigo-500/30">
      <AdminLogsView />
    </main>
  );
}
