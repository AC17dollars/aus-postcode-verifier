"use client";

import { useRef, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { register, login } from "@/app/actions/auth";
import {
  loginSchema,
  signupSchema,
  type LoginFormValues,
  type SignupFormValues,
} from "@/lib/schemas/auth";
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
  setIsPasswordFocused: (focused: boolean) => void;
}

const INPUT_CLASS =
  "bg-white/[0.04] border-transparent h-14 pl-12 text-white placeholder:text-gray-600 focus:bg-white/[0.08] transition-all border-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50 aria-invalid:ring-2 aria-invalid:ring-inset aria-invalid:ring-destructive/30";

function AuthAlertBanner({
  error,
  success,
}: Readonly<{
  error: string | null;
  success: string | null;
}>) {
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl flex items-center gap-3 text-rose-500 text-sm"
      >
        <AlertCircle size={18} className="shrink-0" />
        <div className="flex-1">{error}</div>
      </motion.div>
    );
  }
  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl flex items-center gap-3 text-emerald-500 text-sm"
      >
        <CheckCircle2 size={18} />
        {success}
      </motion.div>
    );
  }
  return null;
}

function SignupNameField({
  form,
  inputClass,
}: Readonly<{
  form: ReturnType<typeof useForm<SignupFormValues>>;
  inputClass: string;
}>) {
  return (
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
      <div className="relative group overflow-hidden rounded-lg">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-white transition-colors">
          <User size={18} />
        </div>
        <Input
          id="name"
          {...form.register("name")}
          autoComplete="name"
          placeholder="Alexander Pierce"
          className={inputClass}
          aria-invalid={!!form.formState.errors.name}
        />
      </div>
      {form.formState.errors.name && (
        <p className="text-destructive text-xs mt-1 ml-1">
          {form.formState.errors.name.message}
        </p>
      )}
    </motion.div>
  );
}

function EmailField({
  registerEmail,
  emailError,
  inputClass,
}: Readonly<{
  registerEmail: UseFormRegisterReturn<"email">;
  emailError: string | undefined;
  inputClass: string;
}>) {
  return (
    <div className="space-y-3">
      <Label
        htmlFor="email"
        className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 ml-1"
      >
        Email Address
      </Label>
      <div className="relative group overflow-hidden rounded-lg">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-white transition-colors">
          <Mail size={18} />
        </div>
        <Input
          id="email"
          {...registerEmail}
          type="email"
          autoComplete="email"
          placeholder="name@domain.com"
          className={inputClass}
          aria-invalid={!!emailError}
        />
      </div>
      {emailError && (
        <p className="text-destructive text-xs mt-1 ml-1">{emailError}</p>
      )}
    </div>
  );
}

function PasswordField({
  registerPassword,
  passwordError,
  showPassword,
  setShowPassword,
  inputClass,
  passwordRef,
  setIsPasswordFocused,
  isLogin,
}: Readonly<{
  registerPassword: ReturnType<ReturnType<typeof useForm<LoginFormValues>>["register"]>;
  passwordError: string | undefined;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  inputClass: string;
  passwordRef: React.RefObject<HTMLDivElement | null>;
  setIsPasswordFocused: (v: boolean) => void;
  isLogin: boolean;
}>) {
  return (
    <div className="space-y-3" ref={passwordRef}>
      <Label
        htmlFor="password"
        className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 ml-1"
      >
        Password
      </Label>
      <div className="relative group overflow-hidden rounded-lg">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-white transition-colors">
          <Lock size={18} />
        </div>
        <Input
          id="password"
          {...registerPassword}
          type={showPassword ? "text" : "password"}
          autoComplete={isLogin ? "current-password" : "new-password"}
          placeholder="••••••••••••"
          onFocus={() => setIsPasswordFocused(true)}
          onBlur={() => setIsPasswordFocused(false)}
          className={inputClass}
          aria-invalid={!!passwordError}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white h-auto w-auto p-1"
          tabIndex={-1}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </Button>
      </div>
      {passwordError && (
        <p className="text-destructive text-xs mt-1 ml-1">{passwordError}</p>
      )}
    </div>
  );
}

export function LoginForm({
  onSensitivityChange,
  setIsPasswordFocused,
}: Readonly<LoginFormProps>) {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const passwordRef = useRef<HTMLDivElement>(null);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onTouched",
  });

  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "" },
    mode: "onTouched",
  });

  const clearFeedback = () => {
    setError(null);
    setSuccess(null);
  };

  const onSubmitLogin = async (data: LoginFormValues) => {
    clearFeedback();
    const formData = new FormData();
    formData.set("email", data.email);
    formData.set("password", data.password);
    startTransition(async () => {
      const result = await login(formData);
      if (result.error) {
        setError(result.error);
      } else if (result.success) {
        if ("needsVerification" in result && result.needsVerification) {
          router.push("/verify-email");
          return;
        }
        setSuccess(result.success);
        loginForm.reset();
        setTimeout(() => router.push("/"), 1500);
      }
    });
  };

  const onSubmitSignup = async (data: SignupFormValues) => {
    clearFeedback();
    const formData = new FormData();
    formData.set("name", data.name);
    formData.set("email", data.email);
    formData.set("password", data.password);
    startTransition(async () => {
      const result = await register(formData);
      if (result.error) setError(result.error);
      else if (result.success) {
        setSuccess(result.success);
        signupForm.reset();
      }
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!passwordRef.current) return;
      const rect = passwordRef.current.getBoundingClientRect();
      const buffer = 15;
      const isNear =
        e.clientX >= rect.left - buffer &&
        e.clientX <= rect.right + buffer &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom + buffer;
      onSensitivityChange(isNear);
    };
    globalThis.addEventListener("mousemove", handleMouseMove);
    return () => globalThis.removeEventListener("mousemove", handleMouseMove);
  }, [onSensitivityChange]);

  const handleToggleMode = () => {
    setIsLogin((prev) => !prev);
    setError(null);
    setSuccess(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative z-20 w-full max-w-[420px]"
    >
      <Card className="backdrop-blur-3xl bg-white/[0.03] border-white/10 rounded-2xl overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] border-0">
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
          <form
            className="space-y-7"
            onSubmit={
              isLogin
                ? loginForm.handleSubmit(onSubmitLogin)
                : signupForm.handleSubmit(onSubmitSignup)
            }
          >
            <AuthAlertBanner
              error={error}
              success={success}
            />

            <AnimatePresence mode="wait">
              {!isLogin && (
                <SignupNameField form={signupForm} inputClass={INPUT_CLASS} />
              )}
            </AnimatePresence>

            <EmailField
              registerEmail={
                isLogin
                  ? loginForm.register("email")
                  : signupForm.register("email")
              }
              emailError={
                isLogin
                  ? loginForm.formState.errors.email?.message
                  : signupForm.formState.errors.email?.message
              }
              inputClass={INPUT_CLASS}
            />

            <PasswordField
              registerPassword={
                isLogin
                  ? loginForm.register("password")
                  : signupForm.register("password")
              }
              passwordError={
                isLogin
                  ? loginForm.formState.errors.password?.message
                  : signupForm.formState.errors.password?.message
              }
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              inputClass={INPUT_CLASS}
              passwordRef={passwordRef}
              setIsPasswordFocused={setIsPasswordFocused}
              isLogin={isLogin}
            />

            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-14 flex items-center justify-center gap-3 group bg-white text-black hover:bg-gray-200 rounded-lg font-bold text-lg shadow-xl shadow-white/5 transition-all disabled:opacity-50"
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
            <Button
              type="button"
              variant="link"
              className="text-white font-bold hover:underline decoration-white/30 underline-offset-8 p-0 h-auto"
              onClick={handleToggleMode}
            >
              {isLogin ? "Register" : "Sign In"}
            </Button>
          </p>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
