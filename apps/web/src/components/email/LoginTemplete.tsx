interface LoginTempleteProps {
  email: string;
  ip: string | null;
  device: string | null;
  time?: string;
}

const LoginTemplete = ({
  email,
  ip,
  device,
  time = new Date().toLocaleString(),
}: Readonly<LoginTempleteProps>) => {
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
            New Login Alert
          </h1>

          <div
            style={{
              backgroundColor: "#f0f4f8",
              padding: "20px",
              borderRadius: "8px",
              marginBottom: "15px",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
            }}
          >
            <p
              style={{
                margin: "0 0 12px 0",
                fontSize: "15px",
                color: "#4a5568",
              }}
            >
              A new login was detected from: <strong>{email}</strong>
            </p>
            <p
              style={{
                margin: "0 0 12px 0",
                fontSize: "15px",
                color: "#4a5568",
              }}
            >
              Time: <strong>{time}</strong>
            </p>
            {device && (
              <p
                style={{
                  margin: "0 0 12px 0",
                  fontSize: "15px",
                  color: "#4a5568",
                }}
              >
                Device: <strong>{device}</strong>
              </p>
            )}
            {ip && (
              <p style={{ margin: "0", fontSize: "15px", color: "#4a5568" }}>
                IP Address: <strong>{ip}</strong>
              </p>
            )}
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
              <strong>Security Notice:</strong> If you didn&apos;t perform this
              login, please secure your account immediately.
            </p>
          </div>
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
            Terms of Service | Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginTemplete;
