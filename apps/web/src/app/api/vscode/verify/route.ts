import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

import { createLogger } from "@tutly/logger";

const logger = createLogger("web:api:vscode");

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const secret = new TextEncoder().encode(process.env.TUTLY_VSCODE_SECRET);

    try {
      const { payload } = await jwtVerify(token, secret);
      return NextResponse.json(payload);
    } catch (error) {
      logger.warn({ err: error }, "vscode token verification failed");
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 },
      );
    }
  } catch (error) {
    logger.error({ err: error }, "vscode verify endpoint failed");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
