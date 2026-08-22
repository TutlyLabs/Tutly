import { compare, hash } from "bcryptjs";
import { Resend } from "resend";

import { enrichSession } from "@tutly/auth/enrich-session";
import { createServerAuth } from "@tutly/auth/server";

import {
  RESEND_API_KEY,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  ZOOM_CLIENT_ID,
  ZOOM_CLIENT_SECRET,
  BETTER_AUTH_SECRET,
  BETTER_AUTH_URL,
} from "@/lib/constants";
import { db } from "@tutly/db";
import ResetPasswordEmailTemplate from "@/components/email/ResetPasswordEmailTemplate";

const resend = new Resend(RESEND_API_KEY);

export const auth = createServerAuth({
  secret: BETTER_AUTH_SECRET,
  baseURL: BETTER_AUTH_URL,
  db,
  useSecureCookies: process.env.NODE_ENV === "production",
  password: {
    hash: (password) => hash(password, 10),
    verify: ({ password, hash: storedHash }) => compare(password, storedHash),
  },
  sendResetPassword: async ({ user, url }) => {
    const userData = await db.user.findUnique({
      where: { id: user.id },
      select: { name: true },
    });
    const userName = userData?.name || "User";
    try {
      const { data, error } = await resend.emails.send({
        from: "Tutly <no-reply@otp.tutly.in>",
        to: [user.email],
        subject: "Reset Your Password - Tutly",
        react: ResetPasswordEmailTemplate({ resetLink: url, name: userName }),
      });
      if (error) {
        console.error("Error sending password reset email:", error);
        throw new Error("Failed to send password reset email");
      }
      console.log("Password reset email sent successfully:", data);
    } catch (error) {
      console.error("Error in sendResetPassword:", error);
      throw error;
    }
  },
  afterEmailVerification: async (user) => {
    await db.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });
  },
  // Shared with the API-key path in `resolveSession`.
  customSessionHandler: ({ user, session }) =>
    enrichSession({
      db,
      user,
      session,
      onError: (error) => console.error("customSession error:", error),
    }),
  google:
    GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET
      ? { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET }
      : undefined,
  github:
    GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET
      ? { clientId: GITHUB_CLIENT_ID, clientSecret: GITHUB_CLIENT_SECRET }
      : undefined,
  zoom:
    ZOOM_CLIENT_ID && ZOOM_CLIENT_SECRET
      ? { clientId: ZOOM_CLIENT_ID, clientSecret: ZOOM_CLIENT_SECRET }
      : undefined,
  trustedOrigins: () => [
    "https://learn.tutly.in",
    "http://localhost:3000",
    ...(process.env.NODE_ENV === "development"
      ? ["exp://", "exp://**", "http://localhost:*"]
      : []),
  ],
});
