import type { BetterAuthOptions } from "better-auth";
import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  admin,
  multiSession,
  oAuthProxy,
  organization,
  twoFactor,
  // customSession
} from "better-auth/plugins";

import { db } from "@tutly/db/client";
import {
  sendInvitationEmail,
  sendOTPEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "@tutly/emails";

import { env } from "../env";
import {
  ac,
  admin as admin_role,
  instructor,
  mentor,
  student,
  super_admin,
} from "./permissions";

export const config = {
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  secret: env.AUTH_SECRET,
  plugins: [
    oAuthProxy(),
    expo(),
    organization({
      ac: ac,
      roles: {
        super_admin,
        admin: admin_role,
        instructor,
        student,
        mentor,
      },
    }),
    twoFactor(),
    admin(),
    multiSession(),
    organization({
      async sendInvitationEmail(data) {
        await sendInvitationEmail({
          email: data.email,
          invitedByUsername: data.inviter.user.name,
          invitedByEmail: data.inviter.user.email,
          teamName: data.organization.name,
          inviteLink: `${env.APPLICATION_BASE_URL}/accept-invitation/${data.id}`,
        });
      },
    }),
    twoFactor({
      otpOptions: {
        async sendOTP({ user, otp }) {
          await sendOTPEmail({
            email: user.email,
            otp,
          });
        },
      },
    }),
    // customSession(async ({ user, session }) => {
    //   return {
    //     user: {
    //       ...user,
    //       // role: "INSTRUCTOR",
    //     },
    //     session
    //   };
    // }),
  ],
  emailVerification: {
    async sendVerificationEmail({ user, url }) {
      await sendVerificationEmail({
        email: user.email,
        name: user.name,
        url,
      });
    },
  },
  emailAndPassword: {
    enabled: true,
    async sendResetPassword({ user, url }) {
      await sendPasswordResetEmail({
        email: user.email,
        resetLink: url,
      });
    },
  },
  user: {
    additionalFields: {
      username: {
        type: "string",
        required: false,
      },
      lastSeen: {
        type: "date",
        required: false,
      },
    },
  },
  account: {
    accountLinking: {
      trustedProviders: ["google", "github"],
    },
  },
  socialProviders: {
    google: {
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
    },
  },
  trustedOrigins: ["exp://"],
} satisfies BetterAuthOptions;

export const auth = betterAuth(config);
export type Session = typeof auth.$Infer.Session;
