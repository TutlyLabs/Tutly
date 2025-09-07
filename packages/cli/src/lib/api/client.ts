import { z } from "zod";

import { getAuthTokens, getGlobalConfig } from "../config/global";

const Assignment = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string().optional(),
  files: z.array(
    z.object({
      path: z.string(),
      content: z.string(),
      size: z.number(),
    }),
  ),
  tests: z
    .array(
      z.object({
        name: z.string(),
        command: z.string(),
        expectedOutput: z.string().optional(),
      }),
    )
    .optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const Course = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string().optional(),
  assignments: z.array(Assignment),
});

const Organization = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  courses: z.array(Course),
});

export type Assignment = z.infer<typeof Assignment>;
export type Course = z.infer<typeof Course>;
export type Organization = z.infer<typeof Organization>;

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
      ...(this.accessToken && { Authorization: `Bearer ${this.accessToken}` }),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`,
      );
    }

    return response.json();
  }

  async getOrganizations(): Promise<Organization[]> {
    return this.request<Organization[]>("/organizations");
  }

  async getCourses(orgId: string): Promise<Course[]> {
    return this.request<Course[]>(`/organizations/${orgId}/courses`);
  }

  async getCourse(courseId: string): Promise<Course> {
    return this.request<Course>(`/courses/${courseId}`);
  }

  async getAssignments(courseId: string): Promise<Assignment[]> {
    return this.request<Assignment[]>(`/courses/${courseId}/assignments`);
  }

  async downloadAssignment(assignmentId: string): Promise<Blob> {
    const response = await fetch(
      `${this.baseUrl}/assignments/${assignmentId}/download`,
      {
        headers: this.accessToken
          ? { Authorization: `Bearer ${this.accessToken}` }
          : {},
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to download assignment: ${response.statusText}`);
    }

    return response.blob();
  }

  async submitAssignment(
    assignmentId: string,
    archiveUrl: string,
    testResults?: any,
  ): Promise<{ submissionId: string }> {
    return this.request<{ submissionId: string }>(
      `/assignments/${assignmentId}/submit`,
      {
        method: "POST",
        body: JSON.stringify({
          archiveUrl,
          testResults,
          submittedAt: new Date().toISOString(),
        }),
      },
    );
  }

  async getUploadUrl(
    assignmentId: string,
  ): Promise<{ uploadUrl: string; expiresAt: string }> {
    return this.request<{ uploadUrl: string; expiresAt: string }>(
      `/assignments/${assignmentId}/upload-url`,
      {
        method: "POST",
      },
    );
  }
}

export async function createAPIClient(): Promise<TutlyAPI> {
  const config = await getGlobalConfig();
  const tokens = await getAuthTokens();

  return new TutlyAPI(config.apiBaseUrl, tokens?.accessToken);
}
