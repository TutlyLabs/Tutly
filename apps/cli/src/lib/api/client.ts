import { z } from "zod";

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
}

export async function createAPIClient(): Promise<TutlyAPI> {
  const config = await getGlobalConfig();
  const tokens = await getAuthTokens();

  return new TutlyAPI(config.apiBaseUrl, tokens?.accessToken);
}
