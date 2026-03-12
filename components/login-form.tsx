"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Lock, Mail, User, ArrowRight } from "lucide-react";
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
  const passwordRef = useRef<HTMLDivElement>(null);

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
          <form className="space-y-7" onSubmit={(e) => e.preventDefault()}>
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
                  type="email"
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
                  type={showPassword ? "text" : "password"}
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

            <Button className="w-full h-14 flex items-center justify-center gap-3 group bg-white text-black hover:bg-gray-200 squircle-inner font-bold text-lg shadow-xl shadow-white/5 transition-all">
              {isLogin ? "Authenticate" : "Create Account"}
              <ArrowRight
                size={20}
                className="group-hover:translate-x-1 transition-transform"
              />
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
