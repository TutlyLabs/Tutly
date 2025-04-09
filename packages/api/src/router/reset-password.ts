import bcrypt from "bcryptjs";
import { Resend } from "resend";
import { z } from "zod";

// import OTPEmailTemplate from "../components/email/OTPEmailTemplate";
import { createTRPCRouter, publicProcedure } from "../trpc";

const resend = new Resend(process.env.RESEND_API_KEY);

export const resetPasswordRouter = createTRPCRouter({
  sendOTP: publicProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/reset-password/send-otp",
        tags: ["reset-password"],
        summary: "Send OTP for password reset",
        description:
          "Sends a one-time password to the user's email for password reset",
      },
    })
    .input(
      z.object({
        email: z.string().email(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const lowerCaseEmail = input.email.toLowerCase();
        const user = await ctx.db.user.findUnique({
          where: { email: lowerCaseEmail },
        });

        if (!user) {
          return {
            success: false,
            error: {
              message: "No account found with this email address",
            },
          };
        }

        const existingOTP = await ctx.db.otp.findFirst({
          where: {
            email: lowerCaseEmail,
            used: false,
            expiresAt: {
              gt: new Date(),
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        if (existingOTP) {
          const timeSinceLastOTP = Date.now() - existingOTP.createdAt.getTime();
          const timeRemaining = 10 * 60 * 1000 - timeSinceLastOTP;

          if (timeRemaining > 0) {
            return {
              success: false,
              error: {
                message: `Please wait ${Math.ceil(timeRemaining / 60000)} minutes before requesting a new OTP`,
                existingOTP: true,
                timeRemaining,
              },
            };
          }
        }

        await ctx.db.otp.deleteMany({
          where: {
            email: lowerCaseEmail,
            used: false,
          },
        });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await ctx.db.otp.create({
          data: {
            email: lowerCaseEmail,
            otp,
            type: "PASSWORD_RESET",
            expiresAt,
            createdAt: new Date(),
          },
        });

        const { data, error } = await resend.emails.send({
          from: "Tutly <no-reply@otp.tutly.in>",
          to: [input.email],
          subject: "Password Reset OTP",
          // react: OTPEmailTemplate({
          //   otp,
          //   name: user.name,
          // }),
          text: `Your OTP is ${otp}`,
        });

        if (error) {
          return {
            success: false,
            error: {
              message: "An error occurred while sending OTP",
            },
          };
        }

        return {
          success: true,
          data,
        };
      } catch (error) {
        console.error("Error sending OTP:", error);
        return {
          success: false,
          error: {
            message: "Failed to send OTP",
          },
        };
      }
    }),

  verifyOTP: publicProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/reset-password/verify-otp",
        tags: ["reset-password"],
        summary: "Verify OTP for password reset",
        description: "Verifies the one-time password sent to the user's email",
      },
    })
    .input(
      z.object({
        email: z.string().email(),
        otp: z.string().length(6),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const lowerCaseEmail = input.email.toLowerCase();

      try {
        const otpRecord = await ctx.db.otp.findFirst({
          where: {
            email: lowerCaseEmail,
            otp: input.otp,
            used: false,
            expiresAt: {
              gt: new Date(),
            },
          },
        });

        if (!otpRecord) {
          return {
            success: false,
            error: "Invalid or expired OTP",
          };
        }

        return {
          success: true,
        };
      } catch (error) {
        console.error("Error verifying OTP:", error);
        return {
          success: false,
          error: "Failed to verify OTP",
        };
      }
    }),

  resetPassword: publicProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/reset-password/reset",
        tags: ["reset-password"],
        summary: "Reset password using OTP",
        description: "Resets the user's password using the verified OTP",
      },
    })
    .input(
      z.object({
        email: z.string().email(),
        otp: z.string().length(6),
        password: z.string().min(8),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const lowerCaseEmail = input.email.toLowerCase();

      try {
        const otpRecord = await ctx.db.otp.findFirst({
          where: {
            email: lowerCaseEmail,
            otp: input.otp,
            used: false,
            expiresAt: {
              gt: new Date(),
            },
          },
        });

        if (!otpRecord) {
          return {
            success: false,
            error: {
              message: "Invalid or expired OTP",
            },
          };
        }

        const hashedPassword = await bcrypt.hash(input.password, 10);
        console.log(hashedPassword);

        await ctx.db.user.update({
          where: { email: lowerCaseEmail },
          data: { password: hashedPassword },
        });

        await ctx.db.otp.update({
          where: { id: otpRecord.id },
          data: { used: true },
        });

        return {
          success: true,
          message: "Password reset successfully",
        };
      } catch (error) {
        console.error("Error resetting password:", error);
        return {
          success: false,
          error: {
            message: "Failed to reset password",
          },
        };
      }
    }),
});
