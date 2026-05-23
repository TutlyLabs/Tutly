"use client";

import { createContext, useContext, type ReactNode } from "react";

// True when the current user is editing the assignment template.
const Ctx = createContext(false);

export function InstructorModeProvider({
  value,
  children,
}: {
  value: boolean;
  children: ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useInstructorMode(): boolean {
  return useContext(Ctx);
}
