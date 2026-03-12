"use client";

import React, { useState } from "react";
import { TorchBackground } from "./torch-background";
import { LoginForm } from "./login-form";

export function LoginUI() {
  const [isNearSensitiveArea, setIsNearSensitiveArea] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  const isTorchOff = isNearSensitiveArea || isPasswordFocused;

  return (
    <main className="min-h-screen bg-[#050505] flex items-center justify-center p-4 overflow-hidden font-sans selection:bg-white/30">
      <TorchBackground isTorchOff={isTorchOff} />
      <LoginForm
        onSensitivityChange={setIsNearSensitiveArea}
        isPasswordFocused={isPasswordFocused}
        setIsPasswordFocused={setIsPasswordFocused}
      />
    </main>
  );
}
