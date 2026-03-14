"use client";

import { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, LogOut, User, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/actions/auth";
import {
  updateStoragePreference,
  type StoragePreference,
} from "@/app/actions/auth";
import {
  setStoragePreferenceForPersistence,
  migratePersistedState,
} from "@/lib/verifier-store";

const STORAGE_OPTIONS: {
  value: StoragePreference;
  label: string;
  description: string;
  technical: string;
}[] = [
  {
    value: "none",
    label: "Do not remember",
    description: "Progress will be cleared when the page refreshes.",
    technical: "No persistence.",
  },
  {
    value: "sessionStorage",
    label: "Remember while this tab is open",
    description: "Uses sessionStorage. Data disappears when the tab closes.",
    technical: "Uses sessionStorage.",
  },
  {
    value: "localStorage",
    label: "Remember on this device",
    description:
      "Uses localStorage. Data persists even after closing the browser.",
    technical: "Uses localStorage.",
  },
];

export interface SettingsModalUser {
  name: string;
  email: string;
  userId: string;
  admin?: boolean;
  storagePreference?: StoragePreference;
}

interface SettingsModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly user: Readonly<SettingsModalUser>;
}

export function SettingsModal({ open, onClose, user }: SettingsModalProps) {
  const [isPending, startTransition] = useTransition();
  const [storagePref, setStoragePref] = useState<StoragePreference>(
    user.storagePreference ?? "sessionStorage",
  );

  const handleStorageChange = (value: StoragePreference) => {
    const previousPref = storagePref;
    setStoragePref(value);
    startTransition(async () => {
      const result = await updateStoragePreference(user.userId, value);
      if (result.success) {
        migratePersistedState(previousPref, value);
        setStoragePreferenceForPersistence(value);
      } else {
        setStoragePref(previousPref);
      }
    });
  };

  const modalContent = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            aria-hidden
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal
            aria-labelledby="settings-modal-title"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-full max-w-md max-h-[90vh] overflow-y-auto bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl p-6 mx-4"
          >
            <div className="flex items-center justify-between mb-6">
              <h2
                id="settings-modal-title"
                className="text-xl font-bold text-white"
              >
                Settings
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white/50 hover:text-white rounded-lg"
                aria-label="Close settings"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <section className="space-y-4 mb-8">
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider flex items-center gap-2">
                <User className="w-3.5 h-3.5" />
                User information
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Full name
                  </p>
                  <p className="text-white font-medium">{user.name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Email
                  </p>
                  <p className="text-white font-medium flex items-center gap-2">
                    <Mail className="w-4 h-4 text-white/40" />
                    {user.email}
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-4 mb-8">
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider">
                Remember my state
              </h3>
              <p className="text-sm text-gray-500">
                Control whether form and map state are saved after refresh.
              </p>
              <div className="space-y-2">
                {STORAGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleStorageChange(opt.value)}
                    className={`w-full text-left p-4 rounded-xl border transition-colors ${
                      storagePref === opt.value
                        ? "bg-white/5 border-white/20"
                        : "bg-white/[0.02] border-white/10 hover:border-white/15"
                    }`}
                  >
                    <p className="text-sm font-medium text-white">
                      {opt.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {opt.description}
                    </p>
                    <p className="text-[10px] text-gray-600 mt-1 font-mono">
                      {opt.technical}
                    </p>
                  </button>
                ))}
              </div>
              {isPending && (
                <p className="text-xs text-gray-500">Saving preference…</p>
              )}
            </section>

            <section className="pt-4 border-t border-white/10">
              <form action={logout}>
                <Button
                  type="submit"
                  variant="ghost"
                  className="w-full justify-center gap-2 text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </Button>
              </form>
            </section>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  if (!mounted || typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
}
