import * as React from "react";

interface OTPEmailTemplateProps {
  otp: string;
}

export const OTPEmailTemplate: React.FC<OTPEmailTemplateProps> = ({ otp }) => {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ color: "#333", fontSize: "24px" }}>
        Your OTP for Password Reset
      </h1>
      <p style={{ fontSize: "16px", color: "#666" }}>
        Your OTP is: <strong>{otp}</strong>
      </p>
      <p style={{ fontSize: "14px", color: "#666" }}>
        This OTP will expire in 10 minutes.
      </p>
    </div>
  );
};
