import { NextRequest, NextResponse } from "next/server";
import { db } from "@tutly/db";
import { SignJWT } from "jose";
import { auth } from "@/server/auth";

export const dynamic = "force-dynamic";

interface TutlyConfig {
  version?: number;
  setup?: {
    command: string;
    description?: string;
  };
  dev?: {
    command: string;
    description?: string;
  };
  test?: {
    command: string;
    description?: string;
  };
  preview?: {
    ports: number[];
  };
  readonly?: string[];
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    const isInstructor =
      session?.user?.role === "INSTRUCTOR" || session?.user?.role === "ADMIN";

    const { searchParams } = new URL(req.url);
    const assignmentId = searchParams.get("assignmentId");
    const workspaceToken = searchParams.get("workspaceToken") ?? undefined;

    if (!assignmentId) {
      return NextResponse.json(
        { error: "Missing assignmentId" },
        { status: 400 },
      );
    }

    const assignment = await db.attachment.findUnique({
      where: { id: assignmentId },
      select: {
        workspaceConfig: true,
        title: true,
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 },
      );
    }

    const workspaceConfig = assignment.workspaceConfig;
    const tutlyConfig: TutlyConfig = {
      version: 1,
      setup: { command: workspaceConfig?.setupCommand ?? "pnpm install" },
      dev: { command: workspaceConfig?.devCommand ?? "pnpm dev" },
      test: { command: workspaceConfig?.testCommand ?? "pnpm test" },
      preview: {
        ports: workspaceConfig?.previewPorts?.length
          ? workspaceConfig.previewPorts
          : [3000, 5173, 4173, 8080],
      },
      readonly: workspaceConfig?.readonlyPaths?.length
        ? workspaceConfig.readonlyPaths
        : [".tutly/**"],
    };

    const configPayload = {
      mode: "fsrelay",
      assignmentId,
      tutlyConfig,
      serverUrl: "http://localhost:4242",
      apiKey: workspaceToken ?? "tutly-dev-key",
      isInstructor,
    };

    const secret = new TextEncoder().encode(process.env.TUTLY_VSCODE_SECRET);

    const token = await new SignJWT(configPayload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(secret);

    return NextResponse.json({
      success: true,
      config: token,
    });
  } catch (error) {
    console.error("Error in config endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
