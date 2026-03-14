import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { AddressVerifier } from "@/components/address-verifier";

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    redirect("/auth");
  }

  if (!session.verified) {
    redirect("/verify-email");
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-indigo-500/30">
      <AddressVerifier user={session} />
    </main>
  );
}
