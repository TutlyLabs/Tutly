import { Link } from "react-router-dom";

import { trpc } from "@/lib/trpc";

export function CoursesScreen() {
  const coursesQuery = trpc.courses.getEnrolledCourses.useQuery();
  const courseList = coursesQuery.data?.data ?? [];

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link to="/" style={{ color: "#7aa2f7", fontSize: 14 }}>
          ← Back
        </Link>
        <h1 style={{ margin: 0, fontSize: 22 }}>Courses</h1>
      </header>

      {coursesQuery.isLoading && <p style={{ opacity: 0.6 }}>Loading…</p>}
      {coursesQuery.error && (
        <p style={{ color: "#ff6b6b" }}>
          Couldn't load: {coursesQuery.error.message}
        </p>
      )}
      {coursesQuery.data && (
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
          {courseList.map((c) => (
            <li
              key={c.id}
              style={{
                padding: 16,
                borderRadius: 10,
                background: "#161616",
                border: "1px solid #1f1f1f",
              }}
            >
              <div style={{ fontWeight: 600 }}>{c.title}</div>
            </li>
          ))}
          {courseList.length === 0 && (
            <li style={{ opacity: 0.6 }}>No courses yet.</li>
          )}
        </ul>
      )}
    </div>
  );
}
