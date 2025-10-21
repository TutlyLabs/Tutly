import { z } from "zod";

import { getAuthTokens, getGlobalConfig } from "../config/global";
import { CLI_USER_AGENT } from "../constants";

const SubmissionTemplate = z.object({
  id: z.string(),
  assignmentId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  files: z.array(
    z.object({
      path: z.string(),
      content: z.string(),
    }),
  ),
});

export type SubmissionTemplate = z.infer<typeof SubmissionTemplate>;

export class TutlyAPI {
  private baseUrl: string;
  private accessToken?: string;

  constructor(baseUrl: string, accessToken?: string) {
    this.baseUrl = baseUrl;
    this.accessToken = accessToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      "User-Agent": CLI_USER_AGENT,
      ...(this.accessToken && { Authorization: `Bearer ${this.accessToken}` }),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(
        `API request failed: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    return response.json();
  }

  async getSubmissionTemplate(
    submissionId: string,
  ): Promise<SubmissionTemplate> {
    return this.request<SubmissionTemplate>(
      `/submissions/${submissionId}/template`,
    );
  }

  async submitWork(
    submissionId: string,
    files: Array<{ path: string; content: string }>,
  ): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(
      `/submissions/${submissionId}/submit`,
      {
        method: "POST",
        body: JSON.stringify({ files }),
      },
    );
  }
}

export async function createAPIClient(): Promise<TutlyAPI> {
  const config = await getGlobalConfig();
  const tokens = await getAuthTokens();

  return new TutlyAPI(config.apiBaseUrl, tokens?.accessToken);
}
