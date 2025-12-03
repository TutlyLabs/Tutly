import { NextRequest, NextResponse } from "next/server";
import { giteaClient } from "@/lib/gitea";
import { db } from "@/lib/db";
import yaml from "js-yaml";

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

    try {
      // Fetch .tutly/config.yaml from Gitea
      const configContents = await giteaClient.getContents(
        owner,
        repo,
        ".tutly/config.yaml",
        "main",
      );

      if (!configContents || Array.isArray(configContents)) {
        return NextResponse.json(
          { error: "Config file not found or is a directory" },
          { status: 404 },
        );
      }

      // Decode base64 content
      const configYaml = Buffer.from(
        configContents.content || "",
        "base64",
      ).toString("utf-8");

      // Parse YAML
      const config = yaml.load(configYaml) as TutlyConfig;

      return NextResponse.json({
        success: true,
        config,
      });
    } catch (error) {
      console.error("Error fetching config from Gitea:", error);
      return NextResponse.json(
        { error: "Config file not found in template repository" },
        { status: 404 },
      );
    }
  } catch (error) {
    console.error("Error in config endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
