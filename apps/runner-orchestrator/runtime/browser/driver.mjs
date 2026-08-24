#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import express from "express";
import rateLimit from "express-rate-limit";
import { chromium } from "playwright";

const STATIC_PORT = 8000;
const JOB_TIMEOUT_MS = Number(process.env.JOB_TIMEOUT_MS ?? 120000);
const RUNTIME_DIR = "/runtime";
const WORK_DIR = "/work";

const app = express();
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
app.use("/sandpack", express.static(`${RUNTIME_DIR}/sandpack`));
app.get("/sandpack-client.mjs", (_req, res) =>
  res.sendFile(`${RUNTIME_DIR}/sandpack-client.bundle.mjs`),
);
app.get("/index.html", (_req, res) =>
  res.sendFile(`${RUNTIME_DIR}/index.html`),
);
app.get("/manifest.json", async (_req, res) => {
  try {
    const buf = await readFile(`${WORK_DIR}/manifest.json`, "utf-8");
    res.type("application/json").send(buf);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

const server = await new Promise((resolve, reject) => {
  const s = app.listen(STATIC_PORT, "127.0.0.1", (err) =>
    err ? reject(err) : resolve(s),
  );
});

const browser = await chromium.launch({
  args: [
    "--disable-dev-shm-usage",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-software-rasterizer",
    "--js-flags=--max-old-space-size=200",
  ],
});
const context = await browser.newContext({
  serviceWorkers: "allow",
});
const page = await context.newPage();

const consoleLog = [];
page.on("console", (msg) => {
  if (consoleLog.length < 100) consoleLog.push(`[${msg.type()}] ${msg.text()}`);
});
page.on("requestfailed", (req) => {
  if (consoleLog.length < 100)
    consoleLog.push(
      `[req-failed] ${req.url()} ${req.failure()?.errorText ?? ""}`,
    );
});
const pageErrors = [];
page.on("pageerror", (err) => pageErrors.push(String(err)));

let outcome;
try {
  await page.goto(`http://127.0.0.1:${STATIC_PORT}/index.html`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForFunction(() => !!window.__results, null, {
    timeout: JOB_TIMEOUT_MS,
    polling: 200,
  });
  const results = await page.evaluate(() => window.__results);
  outcome = { ok: true, ...results, consoleLog, pageErrors };
} catch (err) {
  const phase = await page
    .evaluate(() => window.__phase ?? "(no phase set)")
    .catch(() => "(eval failed)");
  outcome = {
    ok: false,
    error: String(err),
    phase,
    consoleLog,
    pageErrors,
  };
}

await writeFile(
  `${WORK_DIR}/results.json`,
  JSON.stringify(outcome, null, 2),
  "utf-8",
);

await browser.close();
await new Promise((r) => server.close(r));
process.exit(0);
