"use client";

import React, { useState, useRef, useEffect, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { register, login, resendVerification } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";

interface LoginFormProps {
  onSensitivityChange: (isNear: boolean) => void;
  isPasswordFocused: boolean;
  setIsPasswordFocused: (focused: boolean) => void;
}

export function LoginForm({
  onSensitivityChange,
  setIsPasswordFocused,
}: LoginFormProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const passwordRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleResend = async () => {
    if (!unverifiedEmail) return;
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await resendVerification(unverifiedEmail);
      if (result.error) {
        setError(result.error);
      } else if (result.success) {
        setSuccess(result.success);
      }
    });
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setUnverifiedEmail(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const action = isLogin ? login : register;
      const result = await action(formData);

      if (result.error) {
        setError(result.error);
        if (
          "needsVerification" in result &&
          result.needsVerification &&
          "email" in result &&
          result.email
        ) {
          setUnverifiedEmail(result.email as string);
        }
      } else if (result.success) {
        setSuccess(result.success);
        formRef.current?.reset();
      }
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!passwordRef.current) return;

      const pRect = passwordRef.current.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;

      // Precision buffers
      const sideBuffer = 15;
      const bottomBuffer = 15;

      const isNear =
        x >= pRect.left - sideBuffer &&
        x <= pRect.right + sideBuffer &&
        y >= pRect.top &&
        y <= pRect.bottom + bottomBuffer;

      onSensitivityChange(isNear);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [onSensitivityChange]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative z-20 w-full max-w-[420px]"
    >
      <Card className="backdrop-blur-3xl bg-white/[0.03] border-white/10 squircle overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] border-0">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <CardHeader className="text-center pt-10 pb-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={isLogin ? "login-head" : "reg-head"}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-3"
            >
              <CardTitle className="text-4xl font-extrabold text-white tracking-tighter">
                {isLogin ? "Sign In" : "Join"}
              </CardTitle>
            </motion.div>
          </AnimatePresence>
        </CardHeader>

        <CardContent className="py-4 px-10">
          <form ref={formRef} className="space-y-7" onSubmit={handleSubmit}>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl flex items-center gap-3 text-rose-500 text-sm"
              >
                <AlertCircle size={18} className="shrink-0" />
                <div className="flex-1">{error}</div>
                {unverifiedEmail && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResend}
                    disabled={isPending}
                    className="ml-auto text-xs h-8 shrink-0 border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400"
                  >
                    Resend
                  </Button>
                )}
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl flex items-center gap-3 text-emerald-500 text-sm"
              >
                <CheckCircle2 size={18} />
                {success}
              </motion.div>
            )}
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden space-y-3"
                >
                  <Label
                    htmlFor="name"
                    className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 ml-1"
                  >
                    Full Name
                  </Label>
                  <div className="relative group squircle-inner overflow-hidden">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-white transition-colors">
                      <User size={18} />
                    </div>
                    <Input
                      id="name"
                      name="name"
                      required
                      placeholder="Alexander Pierce"
                      className="bg-white/[0.04] border-transparent h-14 pl-12 text-white placeholder:text-gray-600 focus:bg-white/[0.08] transition-all border-none outline-none"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-3">
              <Label
                htmlFor="email"
                className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 ml-1"
              >
                Email Address
              </Label>
              <div className="relative group squircle-inner overflow-hidden">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-white transition-colors">
                  <Mail size={18} />
                </div>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="name@domain.com"
                  className="bg-white/[0.04] border-transparent h-14 pl-12 text-white placeholder:text-gray-600 focus:bg-white/[0.08] transition-all border-none outline-none"
                />
              </div>
            </div>

            <div className="space-y-3" ref={passwordRef}>
              <Label
                htmlFor="password"
                className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 ml-1"
              >
                Password
              </Label>
              <div className="relative group squircle-inner overflow-hidden">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-white transition-colors">
                  <Lock size={18} />
                </div>
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••••••"
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                  className="bg-white/[0.04] border-transparent h-14 pl-12 text-white placeholder:text-gray-600 focus:bg-white/[0.08] transition-all border-none outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-14 flex items-center justify-center gap-3 group bg-white text-black hover:bg-gray-200 squircle-inner font-bold text-lg shadow-xl shadow-white/5 transition-all disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  {isLogin ? "Authenticate" : "Create Account"}
                  <ArrowRight
                    size={20}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </>
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col items-center justify-center py-3">
          <p className="text-gray-500 text-[13px] flex items-center gap-2">
            {isLogin ? "New here?" : "Already a member?"}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-white font-bold hover:underline decoration-white/30 underline-offset-8 transition-all"
            >
              {isLogin ? "Register" : "Sign In"}
            </button>
          </p>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
