"use client";

import { motion } from "framer-motion";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";

export type VerifyStatus = "loading" | "success" | "error";

interface VerifyResultProps {
  readonly status: VerifyStatus;
  readonly message: string;
}

export function VerifyResult({ status, message }: VerifyResultProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#030303] text-white">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="max-w-md w-full bg-white/[0.03] border border-white/10 p-8 rounded-3xl backdrop-blur-3xl text-center space-y-6"
      >
        {status === "loading" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center space-y-4"
          >
            <Loader2 className="w-12 h-12 animate-spin text-white/50" />
            <h1 className="text-2xl font-bold tracking-tight">
              Verifying your email...
            </h1>
          </motion.div>
        )}

        {status === "success" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center space-y-4"
          >
            <CheckCircle className="w-16 h-16 text-emerald-500" />
            <h1 className="text-2xl font-bold tracking-tight">Success!</h1>
            <p className="text-gray-400">{message}</p>
            <Link
              href="/"
              className="w-full bg-white text-black hover:bg-gray-200 mt-4 h-12 rounded-xl font-bold flex items-center justify-center transition-colors px-4 py-2"
            >
              Back to Login
            </Link>
          </motion.div>
        )}

        {status === "error" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center space-y-4"
          >
            <XCircle className="w-16 h-16 text-rose-500" />
            <h1 className="text-2xl font-bold tracking-tight">
              Verification Failed
            </h1>
            <p className="text-gray-400">{message}</p>
            <Link
              href="/"
              className="w-full bg-white/10 text-white hover:bg-white/20 mt-4 h-12 rounded-xl font-bold flex items-center justify-center transition-colors px-4 py-2"
            >
              Back to Login
            </Link>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
