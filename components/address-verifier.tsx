"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Navigation, Layers, ArrowLeft, LogOut } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { TorchBackground } from "@/components/torch-background";
import {
  AddressVerifierForm,
  type AddressVerifierStatus,
  type Locality,
} from "@/components/forms";

import dynamic from "next/dynamic";
const MapComponent = dynamic(
  () => import("@/components/map-component").then((mod) => mod.MapComponent),
  { ssr: false },
);

interface AddressVerifierProps {
  readonly user: {
    name: string;
    email: string;
  };
}

export function AddressVerifier({ user }: Readonly<AddressVerifierProps>) {
  const [status, setStatus] = useState<AddressVerifierStatus>("idle");
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [showMapOnMobile, setShowMapOnMobile] = useState(false);
  const [isFieldFocused, setIsFieldFocused] = useState(false);

  const handleStatusChange = (data: {
    status: AddressVerifierStatus;
    message: string;
    localities: Locality[];
  }) => {
    setStatus(data.status);
    setLocalities(data.localities);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row relative bg-[#050505] font-sans selection:bg-white/20 overflow-hidden">
      <TorchBackground isTorchOff={isFieldFocused} />

      <div
        className={`fixed inset-0 z-30 md:relative md:inset-auto w-full md:w-[420px] lg:w-[480px] p-6 md:p-12 transition-transform duration-500 ease-in-out flex flex-col justify-center ${showMapOnMobile ? "-translate-x-full md:translate-x-0" : "translate-x-0"}`}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-20 w-full"
        >
          <div className="backdrop-blur-3xl bg-white/[0.03] border border-white/10 rounded-2xl p-8 md:p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            <header className="mb-10 text-center relative">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => logout()}
                className="group absolute -top-4 -right-2 flex items-center gap-2 px-2 py-1.5 text-white/30 hover:text-white transition-colors"
                title="Logout"
              >
                <span className="text-[10px] font-bold uppercase tracking-widest block md:hidden md:group-hover:block">
                  Logout
                </span>
                <LogOut size={18} className="transition-transform shrink-0" />
              </Button>

              <div className="inline-flex items-center gap-3 mb-6 select-none">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-2xl shadow-white/5">
                  <Navigation className="text-black w-6 h-6" />
                </div>
              </div>

              <h1 className="text-4xl font-extrabold tracking-tighter text-white leading-none">
                Verifier
              </h1>
              <p className="text-gray-500 mt-4 text-sm leading-relaxed max-w-xs mx-auto">
                Hi {user.name.split(" ")[0]}, confirm suburb consistency via
                Australia Post datasets.
              </p>
            </header>

            <AddressVerifierForm
              onStatusChange={handleStatusChange}
              setIsFieldFocused={setIsFieldFocused}
              onShowMapRequested={() => setShowMapOnMobile(true)}
            />
          </div>
        </motion.div>
      </div>

      <div
        className={`fixed inset-0 z-40 md:relative md:inset-auto md:flex-1 h-screen transition-transform duration-500 ease-in-out border-l border-white/5 ${showMapOnMobile ? "translate-x-0" : "translate-x-full md:translate-x-0"}`}
      >
        <MapComponent localities={localities} showOnMobile={showMapOnMobile} />

        <div className="absolute top-6 left-6 z-[1000] md:hidden">
          <Button
            type="button"
            onClick={() => setShowMapOnMobile(false)}
            className="bg-black/80 backdrop-blur-xl px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 font-bold text-white active:scale-95 border border-white/10"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
            Back to Form
          </Button>
        </div>

        <div className="absolute top-8 left-8 hidden md:flex flex-col gap-3 z-[1000]">
          <div className="bg-white/[0.03] backdrop-blur-3xl px-6 py-4 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-4 select-text">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
              <Layers size={20} className="text-white/50" />
            </div>
            <div>
              <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] select-none">
                System Status
              </p>
              <p className="text-sm font-bold text-white/80">
                {status === "success"
                  ? `${localities.length} Localities Found`
                  : "Awaiting Data"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
