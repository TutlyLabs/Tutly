import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import AdmZip from "adm-zip";

import { getAuthTokens, getGlobalConfig } from "../config/global";
import { CLI_USER_AGENT } from "../constants";

const AssignmentTemplate = z.object({
  id: z.string(),
  title: z.string(),
  details: z.string().nullable().optional(),
  sandboxTemplate: z.any().nullable().optional(),
  maxSubmissions: z.number(),
  class: z
    .object({
      id: z.string(),
      title: z.string(),
      courseId: z.string(),
      course: z
        .object({
          id: z.string(),
          title: z.string(),
        })
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),
});

const MentorDetails = z.object({
  mentor: z
    .object({
      username: z.string(),
    })
    .nullable()
    .optional(),
});

export type AssignmentTemplate = z.infer<typeof AssignmentTemplate>;
export type MentorDetails = z.infer<typeof MentorDetails>;

export interface AssignmentFile {
  path: string;
  content: string;
}

export class TutlyAPI {
  private baseUrl: string;
  private accessToken?: string;

  constructor(baseUrl: string, accessToken?: string) {
    this.baseUrl = baseUrl;
    this.accessToken = accessToken;
  }

  private async trpcRequest<T>(
    procedure: string,
    input?: any,
    method: "GET" | "POST" = "GET",
  ): Promise<T> {
    const isMutation = method === "POST";
    const url = isMutation
      ? `${this.baseUrl}/trpc/${procedure}`
      : `${this.baseUrl}/trpc/${procedure}?input=${encodeURIComponent(JSON.stringify({ json: input ?? null }))}`;

    const headers = {
      "Content-Type": "application/json",
      "User-Agent": CLI_USER_AGENT,
      ...(this.accessToken && { Authorization: `Bearer ${this.accessToken}` }),
    };

    const response = await fetch(url, {
      method,
      headers,
      ...(isMutation && {
        body: JSON.stringify({ json: input ?? null }),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(
        `tRPC request failed: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    const data = await response.json();
    return data.result?.data?.json ?? data.result?.data ?? data;
  }

  async getAssignmentDetailsForSubmission(
    assignmentId: string,
  ): Promise<{
    assignment: AssignmentTemplate | null;
    mentorDetails: MentorDetails | null;
    error?: string;
  }> {
    return this.trpcRequest<{
      assignment: AssignmentTemplate | null;
      mentorDetails: MentorDetails | null;
      error?: string;
    }>("assignments.getAssignmentDetailsForSubmission", { id: assignmentId });
  }

  async createSubmission(
    assignmentId: string,
    files: Array<AssignmentFile>,
    assignmentDetails: AssignmentTemplate,
    mentorDetails: MentorDetails,
  ): Promise<{ success?: boolean; error?: string; data?: any }> {
    return this.trpcRequest<{ success?: boolean; error?: string; data?: any }>(
      "submissions.createSubmission",
      {
        assignmentDetails: {
          id: assignmentDetails.id,
          maxSubmissions: assignmentDetails.maxSubmissions,
          class: {
            courseId: assignmentDetails.class?.courseId,
          },
        },
        files,
        mentorDetails,
      },
      "POST",
    );
  }
  async createSubmissionRepo(
    assignmentId: string,
  ): Promise<{ success: boolean; repoUrl?: string; error?: string }> {
    const response = await fetch(
      `${this.baseUrl}/git/create`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.accessToken && { Authorization: `Bearer ${this.accessToken}` }),
        },
        body: JSON.stringify({
          assignmentId,
          type: "SUBMISSION",
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(
        `Failed to create submission repo: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    return response.json();
  }

  async downloadAndExtractArchive(url: string, outputDir: string): Promise<void> {
    const urlObj = new URL(url);
    const headers: Record<string, string> = {
      ...(this.accessToken && { Authorization: `Bearer ${this.accessToken}` }),
    };

    if (urlObj.username || urlObj.password) {
      const auth = Buffer.from(
        `${urlObj.username}:${urlObj.password}`,
      ).toString("base64");
      headers["Authorization"] = `Basic ${auth}`;
      urlObj.username = "";
      urlObj.password = "";
    }

    const response = await fetch(urlObj.toString(), {
      headers,
    });

    if (!response.ok) {
      throw new Error(
        `Failed to download archive: ${response.status} ${response.statusText}`,
      );
    }

    const buffer = await response.arrayBuffer();
    const zip = new AdmZip(Buffer.from(buffer));

    // Extract to a temporary directory first to handle the root folder
    const tempDir = path.join(outputDir, ".temp_extract");
    zip.extractAllTo(tempDir, true);

    // Move files from the root folder (e.g. repo-name/) to outputDir
    const files = fs.readdirSync(tempDir);
    if (files.length === 1 && fs.statSync(path.join(tempDir, files[0])).isDirectory()) {
      const rootFolder = path.join(tempDir, files[0]);
      const content = fs.readdirSync(rootFolder);

      for (const file of content) {
        fs.renameSync(path.join(rootFolder, file), path.join(outputDir, file));
      }
      fs.rmSync(tempDir, { recursive: true, force: true });
    } else {
      // If no single root folder, just move everything
      for (const file of files) {
        fs.renameSync(path.join(tempDir, file), path.join(outputDir, file));
      }
      fs.rmdirSync(tempDir);
    }
  }

  async uploadSubmission(
    assignmentId: string,
    zipBuffer: Buffer,
    action: "SAVE" | "SUBMIT" = "SUBMIT",
  ): Promise<{ success: boolean; submissionId?: string; error?: string }> {
    const formData = new FormData();
    formData.append("assignmentId", assignmentId);
    formData.append("action", action);
    formData.append("file", new Blob([new Uint8Array(zipBuffer)]), "submission.zip");

    const response = await fetch(`${this.baseUrl}/git/upload`, {
      method: "POST",
      headers: {
        ...(this.accessToken && { Authorization: `Bearer ${this.accessToken}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      try {
        const jsonError = JSON.parse(errorText);
        if (jsonError.error) return { success: false, error: jsonError.error };
      } catch (e) { }

      return { success: false, error: `${response.status} ${response.statusText} - ${errorText}` };
    }

    return response.json();
  }
}

export async function createAPIClient(): Promise<TutlyAPI> {
  const config = await getGlobalConfig();
  const tokens = await getAuthTokens();

  return new TutlyAPI(config.apiBaseUrl, tokens?.accessToken);
}
