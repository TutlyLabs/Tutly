import { compare, hash } from "bcryptjs";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { customSession, bearer, username } from "better-auth/plugins";
import { FRONTEND_URL, RESEND_API_KEY } from "@/lib/constants";
import { db } from "../../lib/db";
import { randomUUID } from "crypto";
import ResetPasswordEmailTemplate from "@/components/email/ResetPasswordEmailTemplate";
import { Resend } from "resend";

const resend = new Resend(RESEND_API_KEY);

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  advanced: {
    database: {
      generateId: () => randomUUID(),
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 min
    },
  },
  user: {
    modelName: "User",
    fields: {
      emailVerified: "isEmailVerified",
    },
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    password: {
      hash: async (password) => {
        return hash(password, 10);
      },
      verify: async (data) => {
        const isValidPassword = await compare(data.password, data.hash);
        return isValidPassword;
      },
    },
    sendResetPassword: async ({ user, url}) => {
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
          react: ResetPasswordEmailTemplate({
            resetLink: url,
            name: userName,
          }),
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
  },
  emailVerification: {
    async afterEmailVerification(user) {
      await db.user.update({
        where: { id: user.id },
        data: {
          emailVerified: new Date(),
          // isEmailVerified: true,
        },
      });
    },
  },
  roles: ["STUDENT", "INSTRUCTOR", "ADMIN"],
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      disableSignUp: true,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      disableSignUp: true,
    },
  },
  plugins: [
    username({
      usernameNormalization: (username) => username.toUpperCase(),
      displayUsernameNormalization: false,
      usernameValidator: (username) => {
        if (!username || username.trim().length === 0) {
          return false;
        }
        return true;
      },
      displayUsernameValidator: (displayUsername) => {
        if (displayUsername) {
          throw new Error(
            "displayUsername is not allowed. Please use username only.",
          );
          // return false;
        }
        return true;
      },
    }),
    bearer(),
    customSession(async ({ user, session }) => {
      const prismaUser = await db.user.findUnique({
        where: { id: user.id },
        include: {
          organization: true,
          adminForCourses: true,
        },
      });

      if (!prismaUser) return { user: null, session: null };

      if (prismaUser.disabledAt) {
        await db.session.deleteMany({ where: { userId: user.id } });
        return { session: null, user: null };
      }

      const now = new Date();
      const lastSeenThreshold = 60 * 1000; // 1 min

      if (
        !prismaUser.lastSeen ||
        now.getTime() - prismaUser.lastSeen.getTime() > lastSeenThreshold
      ) {
        db.user
          .update({
            where: { id: user.id },
            data: { lastSeen: now },
          })
          .catch(console.error);
      }

      return {
        user: {
          ...prismaUser,
          username: prismaUser.username,
          password: undefined,
          oneTimePassword: undefined,
        },
        session,
      };
    }),
  ],
  trustedOrigins: async () => {
    const origins = ["http://localhost:3000", "*.tutly.in"];
    if (FRONTEND_URL) {
      origins.push(FRONTEND_URL);
    }
    if (process.env.VERCEL_URL) {
      origins.push(`https://${process.env.VERCEL_URL}`);
    }
    return origins;
  },
});
