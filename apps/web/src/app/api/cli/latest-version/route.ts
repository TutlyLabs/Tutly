import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch("https://registry.npmjs.org/tutly/latest", {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ version: "0.0.0" });
      }
      throw new Error("Failed to fetch version from npm");
    }

    const data = await response.json();
    return NextResponse.json({ version: data.version });
  } catch (error) {
    console.error("Error fetching latest CLI version:", error);
    return NextResponse.json(
      { error: "Failed to fetch latest version" },
      { status: 500 },
    );
  }
}
