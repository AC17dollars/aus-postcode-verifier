import { getSession } from "@/lib/session";
import { AddressVerifier } from "@/components/address-verifier";

export default async function HomePage() {
  const session = await getSession();

  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-indigo-500/30">
      <AddressVerifier user={session!} />
    </main>
  );
}
