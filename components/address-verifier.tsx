"use client";

import { useState, ChangeEvent, SyntheticEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useClient } from "urql";
import {
  CheckCircle2,
  AlertCircle,
  Search,
  Loader2,
  Navigation,
  Layers,
  RotateCcw,
  ArrowLeft,
  Map as MapIcon,
  LogOut,
} from "lucide-react";
import { logout } from "@/app/actions/auth";
import { TorchBackground } from "./torch-background";

import dynamic from "next/dynamic";
const MapComponent = dynamic(
  () => import("@/components/map-component").then((mod) => mod.MapComponent),
  { ssr: false },
);

const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];

const SEARCH_QUERY = `
  query SearchPostcode($q: String!, $state: String) {
    searchPostcode(q: $q, state: $state) {
      id
      location
      postcode
      state
      latitude
      longitude
      category
    }
  }
`;

interface Locality {
  id: number;
  location: string;
  postcode: string;
  state: string;
  latitude: number;
  longitude: number;
  category: string;
}

interface AddressVerifierProps {
  readonly user: {
    name: string;
    email: string;
  };
}

export function AddressVerifier({ user }: Readonly<AddressVerifierProps>) {
  const client = useClient();
  const [formData, setFormData] = useState({
    postcode: "",
    suburb: "",
    state: "",
  });
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const [showMapOnMobile, setShowMapOnMobile] = useState(false);
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [isFieldFocused, setIsFieldFocused] = useState(false);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (status !== "idle") {
      setStatus("idle");
      setMessage("");
      setLocalities([]);
    }
  };

  const resetForm = () => {
    setFormData({ postcode: "", suburb: "", state: "" });
    setStatus("idle");
    setMessage("");
    setShowMapOnMobile(false);
    setLocalities([]);
  };

  const validateAddress = async (e?: SyntheticEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    setStatus("loading");

    try {
      const result = await client
        .query(
          SEARCH_QUERY,
          {
            q: formData.postcode.trim(),
            state: formData.state || undefined,
          },
          status === "error" ? { requestPolicy: "network-only" } : undefined,
        )
        .toPromise();

      if (result.error) {
        setStatus("error");
        setMessage(result.error.message);
        return;
      }

      const results = (result.data?.searchPostcode ?? []) as Locality[];

      if (!results || results.length === 0) {
        setStatus("error");
        setMessage("Invalid Postcode");
        return;
      }

      const sub = formData.suburb.trim().toUpperCase();
      const matchedLocality = results.find((l: Locality) => l.location === sub);

      if (!matchedLocality) {
        setStatus("error");
        setMessage("Invalid Suburb");
        return;
      }

      if (formData.state && matchedLocality.state !== formData.state) {
        setStatus("error");
        setMessage("Invalid State");
        return;
      }

      setStatus("success");
      setMessage("Valid Location");
      setLocalities(results);
    } catch {
      setStatus("error");
      setMessage("Connection Error");
    }
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
          <div className="backdrop-blur-3xl bg-white/[0.03] border border-white/10 squircle p-8 md:p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            <header className="mb-10 text-center relative">
              <button
                onClick={() => logout()}
                className="absolute -top-4 -right-2 p-2 text-white/30 hover:text-white transition-colors group select-none"
                title="Logout"
              >
                <LogOut
                  size={18}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </button>

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

            <form onSubmit={validateAddress} className="space-y-7">
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <label
                    htmlFor="postcode"
                    className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-1 select-none"
                  >
                    Postcode
                  </label>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="group flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all select-none"
                    title="Reset Form"
                  >
                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest hidden md:group-hover:block">
                      Reset
                    </span>
                    <RotateCcw className="w-3.5 h-3.5 text-gray-600 group-hover:text-white transition-colors" />
                  </button>
                </div>
                <div className="relative group squircle-inner overflow-hidden">
                  <input
                    id="postcode"
                    required
                    name="postcode"
                    value={formData.postcode}
                    onChange={handleInputChange}
                    onFocus={() => setIsFieldFocused(true)}
                    onBlur={() => setIsFieldFocused(false)}
                    placeholder="e.g. 3004"
                    className="w-full h-14 px-5 bg-white/[0.04] border-transparent text-white placeholder:text-gray-600 focus:bg-white/[0.08] transition-all outline-none text-lg font-medium selection:bg-indigo-500/30"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label
                  id="suburb-label"
                  htmlFor="suburb"
                  className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-1 select-none"
                >
                  Suburb
                </label>
                <div className="relative group squircle-inner overflow-hidden">
                  <input
                    id="suburb"
                    aria-labelledby="suburb-label"
                    required
                    name="suburb"
                    value={formData.suburb}
                    onChange={handleInputChange}
                    onFocus={() => setIsFieldFocused(true)}
                    onBlur={() => setIsFieldFocused(false)}
                    placeholder="e.g. Melbourne"
                    className="w-full h-14 px-5 bg-white/[0.04] border-transparent text-white placeholder:text-gray-600 focus:bg-white/[0.08] transition-all outline-none text-lg font-medium selection:bg-indigo-500/30"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label
                  id="state-label"
                  htmlFor="state"
                  className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-1 select-none"
                >
                  State
                </label>
                <div className="relative group squircle-inner overflow-hidden">
                  <select
                    id="state"
                    aria-labelledby="state-label"
                    required
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    className="w-full h-14 px-5 bg-[#111111] border border-white/10 text-white focus:bg-[#181818] transition-all outline-none text-lg font-medium appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-[#111111] text-white">
                      Select State
                    </option>
                    {STATES.map((s) => (
                      <option
                        key={s}
                        value={s}
                        className="bg-[#111111] text-white"
                      >
                        {s}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                    <Navigation size={14} className="rotate-180" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <AnimatePresence mode="wait">
                  {(status === "success" || status === "error") && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`flex-1 flex items-center justify-center gap-3 px-4 py-4 rounded-xl font-bold text-sm border select-text ${status === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-rose-500/10 border-rose-500/20 text-rose-500"}`}
                    >
                      {status === "success" ? (
                        <CheckCircle2 size={18} />
                      ) : (
                        <AlertCircle size={18} />
                      )}
                      <span className="truncate">{message}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={status === "loading"}
                  className={`${status === "success" || status === "error" ? "w-[68px]" : "w-full"} h-14 bg-white text-black hover:bg-gray-200 squircle-inner font-bold text-lg shadow-xl shadow-white/5 transition-all disabled:opacity-50 flex items-center justify-center gap-3 group shrink-0 select-none`}
                >
                  {status === "loading" ? (
                    <Loader2 size={24} className="animate-spin" />
                  ) : (
                    <>
                      <Search
                        size={24}
                        className="group-hover:scale-110 transition-transform"
                      />
                      {status === "idle" && <span>Verify</span>}
                    </>
                  )}
                </button>
              </div>

              <AnimatePresence>
                {status === "success" && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => setShowMapOnMobile(true)}
                    className="w-full md:hidden flex items-center justify-center gap-3 h-14 rounded-xl bg-white text-black font-extrabold shadow-xl select-none"
                  >
                    <MapIcon size={20} />
                    View Results on Map
                  </motion.button>
                )}
              </AnimatePresence>
            </form>
          </div>
        </motion.div>
      </div>

      <div
        className={`fixed inset-0 z-40 md:relative md:inset-auto md:flex-1 h-screen transition-transform duration-500 ease-in-out border-l border-white/5 ${showMapOnMobile ? "translate-x-0" : "translate-x-full md:translate-x-0"}`}
      >
        <MapComponent localities={localities} showOnMobile={showMapOnMobile} />

        <div className="absolute top-6 left-6 z-[1000] md:hidden">
          <button
            onClick={() => setShowMapOnMobile(false)}
            className="bg-black/80 backdrop-blur-xl px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 font-bold text-white active:scale-95 border border-white/10 select-none"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
            Back to Form
          </button>
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
