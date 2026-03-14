import { AdminLogsView } from "@/components/admin-logs-view";

export default function LogsPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-indigo-500/30">
      <AdminLogsView />
    </main>
  );
}
