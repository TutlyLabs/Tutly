import { Link } from "react-router-dom";

import { trpc } from "@/lib/trpc";
import { authClient } from "@/lib/auth";
import { nativeBearerStorage } from "@/native/storage";

export function DashboardScreen() {
  const session = authClient.useSession();
  const coursesQuery = trpc.courses.getEnrolledCourses.useQuery<{
    success: boolean;
    data: Array<{ id: string; title: string }>;
  }>();
  const courseList = coursesQuery.data?.data ?? [];

  async function onSignOut() {
    await authClient.signOut();
    await nativeBearerStorage.removeToken?.();
    window.location.href = "/sign-in";
  }

  const user = session.data?.user;

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 24 }}>
            Hi, {user?.name ?? user?.username ?? "there"}
          </h1>
          <p style={{ margin: 0, opacity: 0.6, fontSize: 14 }}>
            Welcome back to Tutly.
          </p>
        </div>
        <button onClick={onSignOut} style={signOutStyle}>
          Sign out
        </button>
      </header>

      <section style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Your courses</h2>
          <Link to="/courses" style={{ color: "#7aa2f7", fontSize: 14 }}>
            See all
          </Link>
        </div>
        {coursesQuery.isLoading && <p style={mutedStyle}>Loading…</p>}
        {coursesQuery.error && (
          <p style={errorStyle}>
            Couldn't load courses: {coursesQuery.error.message}
          </p>
        )}
        {coursesQuery.data && courseList.length === 0 && (
          <p style={mutedStyle}>You're not enrolled in any courses yet.</p>
        )}
        {courseList.length > 0 && (
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {courseList.slice(0, 5).map((c) => (
              <li
                key={c.id}
                style={{
                  padding: "10px 0",
                  borderBottom: "1px solid #1f1f1f",
                }}
              >
                {c.title}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: 16,
  borderRadius: 12,
  background: "#161616",
  border: "1px solid #1f1f1f",
};

const signOutStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 6,
  border: "1px solid #2a2a2a",
  background: "transparent",
  color: "#fafafa",
  fontSize: 14,
};

const mutedStyle: React.CSSProperties = { margin: 0, opacity: 0.6, fontSize: 14 };
const errorStyle: React.CSSProperties = { margin: 0, color: "#ff6b6b", fontSize: 14 };
