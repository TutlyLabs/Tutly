interface EnrollMailProps {
  name: string;
  email: string;
  password: string;
}

const EnrollMail = ({ name, email, password }: Readonly<EnrollMailProps>) => {
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
          color: "#000000",
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
            backgroundColor: "#ffffff",
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
            Welcome to Tutly!
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
              color: "#555555",
              fontSize: "15px",
              lineHeight: "1.6",
              marginBottom: "20px",
            }}
          >
            You have been successfully enrolled in the{" "}
            <strong>HTML CSS JS</strong> batch at
            <strong>
              {" "}
              VNR Vignana Jyothi Institute of Engineering & Technology
            </strong>
            . Below are your temporary login credentials to access your course:
          </p>

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
              <strong>Email:</strong> {email}
            </p>
            <p style={{ margin: "0", fontSize: "15px", color: "#4a5568" }}>
              <strong>One-Time Password:</strong> {password}
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
              <strong>Important:</strong> For security reasons, you must change
              your password upon first login. This temporary password is valid
              for one-time use only.
            </p>
          </div>

          <div style={{ margin: "25px 0", textAlign: "center" }}>
            <a
              href="https://learn.tutly.in"
              style={{
                backgroundColor: "#007bff",
                color: "#ffffff",
                textDecoration: "none",
                padding: "12px 28px",
                borderRadius: "6px",
                display: "inline-block",
                fontSize: "15px",
                fontWeight: "500",
                boxShadow: "0 2px 4px rgba(0, 123, 255, 0.2)",
              }}
            >
              Login Now
            </a>
          </div>
        </div>

        <div
          style={{
            paddingBottom: "15px",
            borderTop: "1px solid #ddd",
            textAlign: "center",
            fontSize: "14px",
            color: "#666666",
            backgroundColor: "#ffffff",
          }}
        >
          <p>
            If you face any issues, contact us at{" "}
            <a
              href="mailto:info@tutly.in"
              style={{ color: "#007bff", textDecoration: "none" }}
            >
              info@tutly.in
            </a>
          </p>
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

export default EnrollMail;
