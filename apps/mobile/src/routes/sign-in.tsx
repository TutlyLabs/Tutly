import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { authClient } from "@/lib/auth";

export function SignInScreen() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await authClient.signIn.username({
        username,
        password,
      });
      if (result.error) {
        setError(result.error.message ?? "Sign-in failed");
        return;
      }
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        minHeight: "100%",
        padding: 24,
        gap: 16,
      }}
    >
      <h1 style={{ margin: 0 }}>Tutly</h1>
      <p style={{ margin: 0, opacity: 0.7 }}>Sign in to continue</p>
      <form
        onSubmit={onSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        <input
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="username"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={inputStyle}
          required
        />
        <input
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
          required
        />
        {error && (
          <div style={{ color: "#ff6b6b", fontSize: 14 }}>{error}</div>
        )}
        <button type="submit" disabled={submitting} style={buttonStyle}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 8,
  border: "1px solid #2a2a2a",
  background: "#161616",
  color: "#fafafa",
  fontSize: 16,
};

const buttonStyle: React.CSSProperties = {
  padding: "14px 16px",
  borderRadius: 8,
  border: "none",
  background: "#fafafa",
  color: "#0a0a0a",
  fontSize: 16,
  fontWeight: 600,
};
