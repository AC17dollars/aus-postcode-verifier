import { AddressVerifier } from "@/components/address-verifier";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-indigo-500/30">
      <AddressVerifier />
    </main>
  );
}
