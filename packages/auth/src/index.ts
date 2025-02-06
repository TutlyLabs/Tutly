import type { User } from "better-auth";
import { headers } from "next/headers";

import { auth } from "./auth";

export const getSession = async () =>
  auth.api.getSession({
    headers: headers(),
  });

export type SessionUser = User;

export * from "./auth";
