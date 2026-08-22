import { afterEach, describe, expect, it, vi } from "vitest";

import { TutlyApiError, TutlyClient } from "./client.js";

const KEY = "tutly_sk_test";

function mockFetch(response: { ok?: boolean; status?: number; body: unknown }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: response.ok ?? true,
    status: response.status ?? 200,
    text: () => Promise.resolve(JSON.stringify(response.body)),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("base URL handling", () => {
  it.each([
    ["https://learn.tutly.in", "https://learn.tutly.in/api"],
    ["https://learn.tutly.in/", "https://learn.tutly.in/api"],
    // Must not become /api/api.
    ["https://learn.tutly.in/api", "https://learn.tutly.in/api"],
    ["https://learn.tutly.in/api/", "https://learn.tutly.in/api"],
  ])("normalises %s", async (input, expected) => {
    const fetchMock = mockFetch({ body: { result: { data: { json: 1 } } } });
    await new TutlyClient({ baseUrl: input, apiKey: KEY }).query("agent.x");

    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url.startsWith(`${expected}/trpc/agent.x`)).toBe(true);
  });
});

describe("request shape", () => {
  it("sends queries as GET with a superjson-wrapped input", async () => {
    const fetchMock = mockFetch({ body: { result: { data: { json: "ok" } } } });
    await new TutlyClient({
      baseUrl: "https://t.example",
      apiKey: KEY,
    }).query("agent.resolve.lookup", { query: "dsa" });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("GET");
    expect(init.body).toBeUndefined();

    const encoded = new URL(url).searchParams.get("input");
    expect(JSON.parse(encoded!)).toEqual({ json: { query: "dsa" } });
  });

  it("sends mutations as POST with the input in the body", async () => {
    const fetchMock = mockFetch({ body: { result: { data: { json: "ok" } } } });
    await new TutlyClient({
      baseUrl: "https://t.example",
      apiKey: KEY,
    }).mutate("agent.classes.upsert", { title: "Week 1" });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      json: { title: "Week 1" },
    });
  });

  it("authenticates with x-api-key and tags the source", async () => {
    const fetchMock = mockFetch({ body: { result: { data: { json: 1 } } } });
    await new TutlyClient({
      baseUrl: "https://t.example",
      apiKey: KEY,
    }).query("agent.resolve.whoami");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe(KEY);
    expect(headers["x-trpc-source"]).toBe("mcp");
    // The key must not travel as a bearer token.
    expect(headers.Authorization).toBeUndefined();
  });
});

describe("response unwrapping", () => {
  it("unwraps the superjson envelope", async () => {
    mockFetch({ body: { result: { data: { json: { id: "c1" } } } } });
    const result = await new TutlyClient({
      baseUrl: "https://t.example",
      apiKey: KEY,
    }).query<{ id: string }>("agent.classes.get");

    expect(result).toEqual({ id: "c1" });
  });

  it("passes through a response with no json envelope", async () => {
    mockFetch({ body: { result: { data: { id: "c1" } } } });
    const result = await new TutlyClient({
      baseUrl: "https://t.example",
      apiKey: KEY,
    }).query<{ id: string }>("agent.classes.get");

    expect(result).toEqual({ id: "c1" });
  });
});

describe("error mapping", () => {
  it("extracts the tRPC message and code", async () => {
    mockFetch({
      ok: false,
      status: 403,
      body: {
        error: {
          json: {
            message: "Missing permission: attendance:create",
            data: { code: "FORBIDDEN" },
          },
        },
      },
    });

    const promise = new TutlyClient({
      baseUrl: "https://t.example",
      apiKey: KEY,
    }).mutate("agent.attendance.import");

    await expect(promise).rejects.toBeInstanceOf(TutlyApiError);
    await expect(promise).rejects.toMatchObject({
      code: "FORBIDDEN",
      httpStatus: 403,
      message: "Missing permission: attendance:create",
    });
  });

  it("falls back when the error body is not tRPC-shaped", async () => {
    mockFetch({ ok: false, status: 502, body: "upstream exploded" });

    await expect(
      new TutlyClient({ baseUrl: "https://t.example", apiKey: KEY }).query(
        "agent.resolve.whoami",
      ),
    ).rejects.toMatchObject({ code: "UNKNOWN", httpStatus: 502 });
  });

  it("wraps a network failure rather than leaking it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
    );

    await expect(
      new TutlyClient({ baseUrl: "https://t.example", apiKey: KEY }).query(
        "agent.resolve.whoami",
      ),
    ).rejects.toMatchObject({ code: "NETWORK" });
  });
});
