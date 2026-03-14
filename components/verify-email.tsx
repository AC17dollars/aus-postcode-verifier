"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Loader2, Mail, LogOut } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { resendVerification, logout } from "@/app/actions/auth";

export type VerifyEmailStatus = "loading" | "success" | "error";

interface VerifyEmailResultProps {
  readonly status: VerifyEmailStatus;
  readonly message: string;
  readonly showLoginOnly?: boolean;
}

function VerifyEmailResult({ status, message, showLoginOnly = true }: VerifyEmailResultProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#030303] text-white font-sans">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="max-w-md w-full bg-white/[0.03] border border-white/10 p-8 rounded-2xl backdrop-blur-3xl text-center space-y-6"
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
            <h1 className="text-2xl font-bold tracking-tight">Email verified</h1>
            <p className="text-gray-400">{message}</p>
            <Link
              href="/auth"
              className={`${buttonVariants({ variant: "ghost", size: "lg" })} w-full mt-4 h-12 rounded-xl font-bold bg-white text-black hover:bg-gray-200 hover:text-black`}
            >
              {showLoginOnly ? "Go to login" : "Go to dashboard"}
            </Link>
            {!showLoginOnly && (
              <Link
                href="/auth"
                className="text-sm text-gray-500 hover:text-white transition-colors"
              >
                Or sign in
              </Link>
            )}
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
              Verification failed
            </h1>
            <p className="text-gray-400">{message}</p>
            <Link
              href="/auth"
              className={`${buttonVariants({ variant: "secondary", size: "lg" })} w-full mt-4 h-12 rounded-xl font-bold bg-white/10 text-white hover:bg-white/20`}
            >
              Back to sign in
            </Link>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

interface VerifyEmailResendProps {
  readonly email: string;
}

function VerifyEmailResend({ email }: VerifyEmailResendProps) {
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleResend = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await resendVerification(email);
      if (result.success) {
        setMessage({ type: "success", text: result.success });
      } else {
        setMessage({ type: "error", text: result.error ?? "Something went wrong." });
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#030303] text-white font-sans">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="max-w-md w-full bg-white/[0.03] border border-white/10 p-8 rounded-2xl backdrop-blur-3xl space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center">
              <Mail className="w-7 h-7 text-white/60" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Verify your email
          </h1>
          <p className="text-gray-400 text-sm">
            We sent a verification link to your email. Click the link in the
            email to verify your account. The link expires in 10 minutes.
          </p>
          <p className="text-gray-500 text-sm">
            Didn&apos;t receive it? Resend to your email below.
          </p>
        </div>

        <form onSubmit={handleResend} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-gray-400 text-xs uppercase tracking-wider">
              Email address
            </Label>
            <div
              className="h-12 rounded-lg bg-white/[0.06] border border-white/10 text-white px-4 flex items-center text-sm"
              aria-label="Your email"
            >
              {email}
            </div>
          </div>
          {message && (
            <p
              className={`text-sm ${
                message.type === "success" ? "text-emerald-500" : "text-rose-500"
              }`}
            >
              {message.text}
            </p>
          )}
          <Button
            type="submit"
            disabled={isPending}
            className="w-full h-12 rounded-xl font-bold bg-white text-black hover:bg-gray-200"
          >
            {isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Resend verification email"
            )}
          </Button>
        </form>

        <div className="flex flex-col items-center pt-2">
          <form action={logout}>
            <Button
              type="submit"
              variant="ghost"
              className="text-gray-500 hover:text-white hover:bg-white/10 gap-2"
            >
              <LogOut className="w-4 h-4" />
              Use different account
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

interface VerifyEmailLoggedInPopupProps {
  readonly success: boolean;
  readonly message: string;
  readonly email?: string;
}

function VerifyEmailLoggedInPopup({
  success,
  message,
  email,
}: VerifyEmailLoggedInPopupProps) {
  const router = useRouter();

  const handleClose = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#030303] text-white font-sans">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" aria-hidden />
      <motion.div
        role="dialog"
        aria-modal
        aria-labelledby="verify-popup-title"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-50 max-w-md w-full bg-[#111] border border-white/10 p-8 rounded-2xl shadow-2xl text-center space-y-6"
      >
        {success ? (
          <>
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto" />
            <h2 id="verify-popup-title" className="text-xl font-bold">
              Account verified
              {email ? ` for ${email}` : ""}
            </h2>
            <p className="text-gray-400 text-sm">{message}</p>
          </>
        ) : (
          <>
            <XCircle className="w-16 h-16 text-rose-500 mx-auto" />
            <h2 id="verify-popup-title" className="text-xl font-bold">
              Verification failed
            </h2>
            <p className="text-gray-400 text-sm">{message}</p>
          </>
        )}
        <Button
          onClick={handleClose}
          className="w-full h-12 rounded-xl font-bold bg-white text-black hover:bg-gray-200 hover:text-black"
        >
          Close
        </Button>
      </motion.div>
    </div>
  );
}

export { VerifyEmailResult, VerifyEmailResend, VerifyEmailLoggedInPopup };
