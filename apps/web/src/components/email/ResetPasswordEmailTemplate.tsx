interface ResetPasswordEmailTemplateProps {
  resetLink: string;
  name?: string;
}

const ResetPasswordEmailTemplate = ({
  resetLink,
  name = "User",
}: Readonly<ResetPasswordEmailTemplateProps>) => {
  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        fontFamily: "Helvetica, Arial, sans-serif",
        margin: "0",
        padding: "20px 0",
        color: "#000000",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "600px",
          margin: "0 auto",
          backgroundColor: "#ffffff",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "20px",
            textAlign: "center",
            backgroundColor: "#ffffff",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://learn.tutly.in/logo-with-bg.png"
            alt="Tutly Logo"
            draggable="false"
            style={{
              maxWidth: "180px",
              height: "auto",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
              pointerEvents: "none",
            }}
          />
        </div>

        <div
          style={{
            padding: "10px 30px 20px 30px",
            color: "#333333",
          }}
        >
          <h1
            style={{
              fontSize: "26px",
              fontWeight: "600",
              marginBottom: "25px",
              color: "#2d3748",
              textAlign: "center",
            }}
          >
            Reset Your Password
          </h1>

          <p
            style={{
              color: "#333333",
              fontSize: "15px",
              marginBottom: "15px",
              fontWeight: "500",
            }}
          >
            Dear {name},
          </p>

          <p
            style={{
              color: "#333333",
              fontSize: "15px",
              marginBottom: "20px",
              lineHeight: "1.6",
            }}
          >
            We received a request to reset your password for your Tutly account.
            Click the button below to create a new password:
          </p>

          <div
            style={{
              textAlign: "center",
              marginBottom: "25px",
            }}
          >
            <a
              href={resetLink}
              style={{
                display: "inline-block",
                backgroundColor: "#3b82f6",
                color: "#ffffff",
                padding: "14px 28px",
                textDecoration: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "600",
                boxShadow: "0 2px 4px rgba(59, 130, 246, 0.3)",
                transition: "background-color 0.2s ease",
              }}
            >
              Reset Password
            </a>
          </div>

          <div
            style={{
              backgroundColor: "#f0f4f8",
              padding: "20px",
              borderRadius: "8px",
              marginBottom: "15px",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
            }}
          >
            <p style={{ margin: "0", fontSize: "15px", color: "#4a5568" }}>
              <strong>Alternative:</strong> If the button doesn't work, copy and
              paste this link into your browser:
            </p>
            <p
              style={{
                margin: "10px 0 0 0",
                fontSize: "14px",
                color: "#3b82f6",
                wordBreak: "break-all",
                backgroundColor: "#f8fafc",
                padding: "10px",
                borderRadius: "4px",
                border: "1px solid #e2e8f0",
              }}
            >
              {resetLink}
            </p>
          </div>

          <div
            style={{
              backgroundColor: "#fff3cd",
              border: "1px solid #ffeeba",
              color: "#856404",
              padding: "15px",
              borderRadius: "8px",
              marginTop: "20px",
              marginBottom: "20px",
              fontSize: "14px",
              lineHeight: "1.5",
            }}
          >
            <p style={{ margin: "0" }}>
              <strong>Security Note:</strong> This password reset link will expire
              in 1 hour for security reasons. If you didn't request this reset,
              please ignore this email and your password will remain unchanged.
            </p>
          </div>

          <p
            style={{
              color: "#666666",
              fontSize: "14px",
              marginTop: "20px",
              lineHeight: "1.5",
            }}
          >
            If you're having trouble with the button above, copy and paste the
            URL below into your web browser:
          </p>
        </div>

        <div
          style={{
            paddingBottom: "15px",
            borderTop: "1px solid #ddd",
            textAlign: "center",
            fontSize: "14px",
            color: "#666666",
          }}
        >
          <p>If you didn&apos;t request this password reset, please ignore this email.</p>
        </div>

        <div
          style={{
            textAlign: "center",
            padding: "15px 20px",
            fontSize: "13px",
            color: "#666666",
            backgroundColor: "#f8f9fa",
          }}
        >
          <p style={{ margin: "0" }}>&copy; 2025 Tutly. All rights reserved.</p>
          <p style={{ margin: "5px 0 0 0" }}>
            <a
              href="https://www.tutly.in/terms"
              style={{
                color: "#3b82f6",
                textDecoration: "none",
                marginRight: "10px",
              }}
            >
              Terms of Service
            </a>
            |
            <a
              href="https://www.tutly.in/privacy"
              style={{
                color: "#3b82f6",
                textDecoration: "none",
                marginLeft: "10px",
              }}
            >
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordEmailTemplate;
