/**
 * Minimal tRPC-over-HTTP client for the `agent.*` router.
 *
 * The server uses the superjson transformer, so inputs are wrapped as
 * `{ json: ... }` and results unwrapped from `result.data.json`. Queries go over
 * GET with the input in the query string, mutations over POST — the same shape
 * `apps/cli` already speaks.
 */

export interface TutlyClientOptions {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
}

/** Carries the tRPC error code so callers can distinguish auth from input. */
export class TutlyApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly httpStatus: number,
  ) {
    super(message);
    this.name = "TutlyApiError";
  }
}

interface TrpcErrorBody {
  error?: {
    json?: { message?: string; data?: { code?: string } };
    message?: string;
    data?: { code?: string };
  };
}

const DEFAULT_TIMEOUT_MS = 30_000;

function parseError(body: string, status: number): TutlyApiError {
  try {
    const parsed = JSON.parse(body) as TrpcErrorBody;
    const error = parsed.error;
    const message = error?.json?.message ?? error?.message ?? `HTTP ${status}`;
    const code = error?.json?.data?.code ?? error?.data?.code ?? "UNKNOWN";
    return new TutlyApiError(message, code, status);
  } catch {
    return new TutlyApiError(body || `HTTP ${status}`, "UNKNOWN", status);
  }
}

export class TutlyClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor({ baseUrl, apiKey, timeoutMs }: TutlyClientOptions) {
    // Tolerate both "https://host" and "https://host/api" so the env var can be
    // copied from either the CLI config or a browser URL.
    const trimmed = baseUrl.replace(/\/+$/, "");
    this.baseUrl = trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  private async request<T>(
    procedure: string,
    input: unknown,
    method: "GET" | "POST",
  ): Promise<T> {
    const payload = JSON.stringify({ json: input ?? null });
    const url =
      method === "GET"
        ? `${this.baseUrl}/trpc/${procedure}?input=${encodeURIComponent(payload)}`
        : `${this.baseUrl}/trpc/${procedure}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "x-trpc-source": "mcp",
        },
        ...(method === "POST" ? { body: payload } : {}),
        signal: controller.signal,
      });

      const text = await response.text();
      if (!response.ok) throw parseError(text, response.status);

      const parsed = JSON.parse(text) as {
        result?: { data?: { json?: T } | T };
      };
      const data = parsed.result?.data;
      if (data && typeof data === "object" && "json" in data) {
        return (data as { json: T }).json;
      }
      return data as T;
    } catch (error) {
      if (error instanceof TutlyApiError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new TutlyApiError(
          `Request to ${procedure} timed out after ${this.timeoutMs}ms`,
          "TIMEOUT",
          0,
        );
      }
      throw new TutlyApiError(
        error instanceof Error ? error.message : String(error),
        "NETWORK",
        0,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  query<T>(procedure: string, input?: unknown): Promise<T> {
    return this.request<T>(procedure, input, "GET");
  }

  mutate<T>(procedure: string, input?: unknown): Promise<T> {
    return this.request<T>(procedure, input, "POST");
  }
}
