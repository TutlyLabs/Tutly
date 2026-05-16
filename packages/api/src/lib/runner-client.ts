type EnqueueResult = { ok: boolean; status?: number; error?: string };

const RUNNER_URL = process.env.TEST_RUNNER_URL;
const RUNNER_SECRET = process.env.TEST_RUNNER_SECRET;

async function postRunner(path: string, body: unknown): Promise<EnqueueResult> {
  if (!RUNNER_URL || !RUNNER_SECRET) {
    console.warn(
      "[runner] TEST_RUNNER_URL/SECRET not configured; skipping enqueue",
    );
    return { ok: false, error: "runner-not-configured" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);

  try {
    const res = await fetch(`${RUNNER_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Worker-Secret": RUNNER_SECRET,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[runner] enqueue failed:", message);
    return { ok: false, error: message };
  } finally {
    clearTimeout(timer);
  }
}

export function enqueueTestRun(testRunId: string) {
  return postRunner("/enqueue", { testRunId });
}

export function enqueueTestRunBatch(testRunIds: string[]) {
  return postRunner("/enqueue-batch", { testRunIds });
}
