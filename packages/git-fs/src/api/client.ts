/**
 * Base tRPC client for making API requests
 * Follows the same pattern as apps/cli/src/lib/api/client.ts
 */
export class TutlyAPIClient {
  private baseUrl: string;
  private accessToken?: string;

  constructor(baseUrl: string, accessToken?: string) {
    this.baseUrl = baseUrl;
    this.accessToken = accessToken;
  }

  protected async trpcRequest<T>(
    procedure: string,
    input?: any,
    method: 'GET' | 'POST' = 'GET'
  ): Promise<T> {
    const isMutation = method === 'POST';
    const url = isMutation
      ? `${this.baseUrl}/api/trpc/${procedure}`
      : `${this.baseUrl}/api/trpc/${procedure}?input=${encodeURIComponent(JSON.stringify({ json: input ?? null }))}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      credentials: 'include',
      ...(isMutation && {
        body: JSON.stringify({ json: input ?? null }),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `tRPC request failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = await response.json();
    return data.result?.data?.json ?? data.result?.data ?? data;
  }
}
