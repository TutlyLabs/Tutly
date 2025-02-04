import { Resend } from "resend";

import { env } from "../env";
import { reactInvitationEmail } from "./templates/invitation";
import { reactOTPEmail } from "./templates/otp";
import { reactResetPasswordEmail } from "./templates/reset-password";
import { reactVerificationEmail } from "./templates/verify-email";

const resendInstance = new Resend(env.RESEND_API_KEY);

export const sendVerificationEmail = async ({
  email,
  name,
  url,
}: {
  email: string;
  name: string;
  url: string;
}) => {
  return resendInstance.emails.send({
    from: "Tutly <no-reply@mail.tutly.in>",
    to: [email],
    subject: "Verify your email address",
    react: reactVerificationEmail({ name, url }),
  });
};

export const sendPasswordResetEmail = async ({
  email,
  resetLink,
}: {
  email: string;
  resetLink: string;
}) => {
  return resendInstance.emails.send({
    from: "Tutly <no-reply@mail.tutly.in>",
    to: [email],
    subject: "Reset your password",
    react: reactResetPasswordEmail({ resetLink }),
  });
};

export const sendInvitationEmail = async ({
  email,
  invitedByUsername,
  invitedByEmail,
  teamName,
  teamImage,
  inviteLink,
}: {
  email: string;
  invitedByUsername?: string;
  invitedByEmail?: string;
  teamName?: string;
  teamImage?: string;
  inviteLink?: string;
}) => {
  return resendInstance.emails.send({
    from: "Tutly <no-reply@mail.tutly.in>",
    to: [email],
    subject: "Join a team on Tutly",
    react: reactInvitationEmail({
      invitedByUsername,
      invitedByEmail,
      teamName,
      teamImage,
      inviteLink,
    }),
  });
};

export const sendOTPEmail = async ({
  email,
  otp,
}: {
  email: string;
  otp: string;
}) => {
  return resendInstance.emails.send({
    from: "Tutly <no-reply@mail.tutly.in>",
    to: [email],
    subject: "Your OTP for Tutly",
    react: reactOTPEmail({ otp }),
  });
};

// todo: replace the whole emaile logic to be reusbale with proper types
// export const sendCustomEmail = async ({
//   email,
//   subject,
//   component,
//   props,
// }: {
//   email: string;
//   subject: string;
//   component: (props: any) => JSX.Element;
//   props: Record<string, any>;
// }) => {
//   return resendInstance.emails.send({
//     from: "Tutly <no-reply@mail.tutly.in>",
//     to: [email],
//     subject,
//     react: component(props),
//   });
// };
