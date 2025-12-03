import { NextRequest, NextResponse } from "next/server";
import { giteaClient } from "@/lib/gitea";
import { db } from "@/lib/db";
import yaml from "js-yaml";
import { SignJWT } from "jose";

export const dynamic = "force-dynamic";

interface TutlyConfig {
  version?: number;
  run?: {
    command: string;
    description?: string;
  };
  readonly?: string[];
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const assignmentId = searchParams.get("assignmentId");

    if (!assignmentId) {
      return NextResponse.json(
        { error: "Missing assignmentId" },
        { status: 400 },
      );
    }

    // Get assignment with template repo
    const assignment = await db.attachment.findUnique({
      where: { id: assignmentId },
      select: {
        gitTemplateRepo: true,
      },
    });

    if (!assignment?.gitTemplateRepo) {
      return NextResponse.json(
        { error: "No template repository found" },
        { status: 404 },
      );
    }

    // Parse owner/repo from gitTemplateRepo
    const [owner, repo] = assignment.gitTemplateRepo.split("/");

    let tutlyConfig: TutlyConfig = {};

    try {
      // Fetch .tutly/config.yaml from Gitea
      const configContents = await giteaClient.getContents(
        owner,
        repo,
        ".tutly/config.yaml",
        "main",
      );

      if (
        configContents &&
        !Array.isArray(configContents) &&
        configContents.content
      ) {
        // Decode base64 content
        const configYaml = Buffer.from(
          configContents.content,
          "base64",
        ).toString("utf-8");

        // Parse YAML
        tutlyConfig = yaml.load(configYaml) as TutlyConfig;
      }
    } catch (error) {
      console.warn(
        "Config file not found in template repository, using default.",
      );
    }

    const configPayload = {
      mode: "fsrelay",
      assignmentId,
      tutlyConfig,
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
