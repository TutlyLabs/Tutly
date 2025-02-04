// import * as SecureStore from "expo-secure-store";
// import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // todo: we need this to be enabled for auth
  plugins: [
    // expoClient({
    //   scheme: "expo",
    //   storage: SecureStore,
    // }),
  ],
  baseURL: "http://localhost:3000",
});

export const { signIn, signOut } = authClient;
