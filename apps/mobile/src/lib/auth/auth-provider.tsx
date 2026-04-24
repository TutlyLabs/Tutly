import type { PropsWithChildren } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { queryClient } from "../cache/query-client";
import { authClient } from "./auth-client";
import { clearStoredBearerToken, getStoredBearerToken } from "./secure-store";

export type TutlyRole =
  | "STUDENT"
  | "MENTOR"
  | "INSTRUCTOR"
  | "ADMIN"
  | "SUPER_ADMIN";

export type SessionUser = {
  id: string;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  image?: string | null;
  role?: TutlyRole | string;
  isAdmin?: boolean;
  organizationId?: string | null;
};

type SessionShape = {
  user: SessionUser;
  session?: unknown;
} | null;

type SignInInput = {
  login: string;
  password: string;
};

type AuthContextValue = {
  isLoading: boolean;
  isAuthenticated: boolean;
  session: SessionShape;
  user: SessionUser | null;
  token: string | null;
  refreshSession: () => Promise<void>;
  signIn: (input: SignInInput) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<SessionShape>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const [storedToken, sessionResult] = await Promise.all([
        getStoredBearerToken(),
        authClient.getSession(),
      ]);
      setToken(storedToken);
      setSession((sessionResult.data as SessionShape) ?? null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const signIn = useCallback(
    async ({ login, password }: SignInInput) => {
      const trimmedLogin = login.trim();
      const method = trimmedLogin.includes("@")
        ? authClient.signIn.email
        : (
            authClient.signIn as unknown as {
              username: (data: {
                username: string;
                password: string;
              }) => Promise<{ error?: { message?: string } | null }>;
            }
          ).username;

      const payload = trimmedLogin.includes("@")
        ? { email: trimmedLogin, password }
        : { username: trimmedLogin, password };

      const result = await method(payload as never);
      if (result.error) {
        return {
          error:
            result.error.message || "Unable to sign in with those details.",
        };
      }

      await refreshSession();
      return {};
    },
    [refreshSession],
  );

  const signOut = useCallback(async () => {
    try {
      await authClient.signOut();
    } finally {
      await clearStoredBearerToken();
      queryClient.clear();
      await AsyncStorage.removeItem("tutly-mobile-query-cache");
      setToken(null);
      setSession(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      isAuthenticated: Boolean(session?.user),
      session,
      user: session?.user ?? null,
      token,
      refreshSession,
      signIn,
      signOut,
    }),
    [isLoading, refreshSession, session, signIn, signOut, token],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
