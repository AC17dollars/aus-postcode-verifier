"use client";

import { useEffect, useState, use } from "react";
import { verifyEmail } from "@/app/actions/auth";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";

export default function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = use(searchParams);
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus("error");
        setMessage("No verification token provided.");
        return;
      }

      const result = await verifyEmail(token);
      if (result.success) {
        setStatus("success");
        setMessage(result.success);
      } else {
        setStatus("error");
        setMessage(result.error || "Something went wrong.");
      }
    };

    verify();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#030303] text-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white/[0.03] border border-white/10 p-8 rounded-3xl backdrop-blur-3xl text-center space-y-6"
      >
        {status === "loading" && (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-white/50" />
            <h1 className="text-2xl font-bold tracking-tight">
              Verifying your email...
            </h1>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center space-y-4">
            <CheckCircle className="w-16 h-16 text-emerald-500" />
            <h1 className="text-2xl font-bold tracking-tight">Success!</h1>
            <p className="text-gray-400">{message}</p>
            <Link
              href="/"
              className="w-full bg-white text-black hover:bg-gray-200 mt-4 h-12 rounded-xl font-bold flex items-center justify-center transition-colors px-4 py-2"
            >
              Back to Login
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center space-y-4">
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
          </div>
        )}
      </motion.div>
    </div>
  );
}
