"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SessionPayload } from "@/lib/session";

const SessionContext = createContext<SessionPayload | null>(null);

export function SessionProvider({
  session,
  children,
}: Readonly<{
  session: SessionPayload | null;
  children: ReactNode;
}>) {
  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionPayload | null {
  return useContext(SessionContext);
}
