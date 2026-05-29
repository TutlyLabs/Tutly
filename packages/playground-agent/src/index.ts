import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import chokidar, { type FSWatcher } from "chokidar";
import type { IPty } from "node-pty";
import WebSocket from "ws";

import {
  AgentToBrokerFrame,
  BrokerToAgentFrame,
  PROTOCOL_VERSION,
  type AgentFrame,
  type BrokerFrame,
  type HelloAckPayload,
} from "@tutly/playground-protocol";

import { log } from "./log.js";
import { safeJoin, PathOutsideWorkspaceError } from "./safePath.js";

const env = {
  url: process.env.TUTLY_URL ?? "wss://app.tutly.in/api/playground/agent",
  token: process.env.TUTLY_TOKEN,
  workspace: process.env.TUTLY_WORKSPACE ?? "/workspace",
  image: process.env.TUTLY_IMAGE,
  language: process.env.TUTLY_LANGUAGE,
};

if (!env.token) {
  console.error("TUTLY_TOKEN is required");
  process.exit(2);
}

const AGENT_VERSION = "0.1.0";
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_LIST_ENTRIES = 5000;

async function ensureWorkspace(): Promise<void> {
  await fs.mkdir(env.workspace, { recursive: true });
}

class Agent {
  private ws: WebSocket | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private ptys = new Map<string, IPty>();
  private watchers = new Map<string, FSWatcher>();
  private execs = new Map<string, AbortController>();
  private reconnectDelay = 1000;
  private nodePty: typeof import("node-pty") | null = null;

  async start(): Promise<void> {
    await ensureWorkspace();
    try {
      this.nodePty = await import("node-pty");
    } catch (err) {
      log.warn("node-pty unavailable; PTY features disabled", { err: String(err) });
    }
    this.connect();
  }

  private connect(): void {
    log.info("connecting", { url: env.url });
    const ws = new WebSocket(env.url, {
      handshakeTimeout: 15000,
      perMessageDeflate: false,
    });
    this.ws = ws;

    ws.on("open", () => {
      log.info("ws open; sending hello");
      this.send({
        type: "hello",
        protocol: PROTOCOL_VERSION,
        token: env.token!,
        agentVersion: AGENT_VERSION,
        image: env.image,
        language: env.language,
        capabilities: { pty: !!this.nodePty, exec: true, files: true, watch: true },
      });
    });

    ws.on("message", (raw) => {
      const text = typeof raw === "string" ? raw : raw.toString("utf8");
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        log.warn("non-json frame dropped");
        return;
      }
      const result = BrokerToAgentFrame.safeParse(parsed);
      if (!result.success) {
        log.warn("invalid frame", { error: result.error.message });
        return;
      }
      this.handle(result.data).catch((err) =>
        log.error("frame handler threw", { err: String(err) })
      );
    });

    ws.on("close", (code, reason) => {
      log.warn("ws closed", { code, reason: reason.toString() });
      this.cleanup();
      this.scheduleReconnect();
    });

    ws.on("error", (err) => {
      log.error("ws error", { err: String(err) });
    });
  }

  private scheduleReconnect(): void {
    const delay = Math.min(this.reconnectDelay, 30000);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
    setTimeout(() => this.connect(), delay);
  }

  private cleanup(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
    for (const [, pty] of this.ptys) {
      try {
        pty.kill();
      } catch {
        /* ignore */
      }
    }
    this.ptys.clear();
    for (const [, w] of this.watchers) void w.close();
    this.watchers.clear();
    for (const [, c] of this.execs) c.abort();
    this.execs.clear();
  }

  private send(frame: AgentFrame): void {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const parsed = AgentToBrokerFrame.safeParse(frame);
    if (!parsed.success) {
      log.error("outbound frame invalid", { error: parsed.error.message });
      return;
    }
    ws.send(JSON.stringify(parsed.data));
  }

  private startHeartbeat(intervalSec: number): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: "ping", t: Date.now() });
    }, intervalSec * 1000);
  }

  private async handle(frame: BrokerFrame): Promise<void> {
    switch (frame.type) {
      case "hello.ack":
        this.onHelloAck(frame);
        return;
      case "ping":
        this.send({ type: "pong", t: frame.t });
        return;
      case "pong":
        return;
      case "error":
        log.warn("broker error", { code: frame.code, message: frame.message });
        return;
      case "pty.open":
        this.onPtyOpen(frame);
        return;
      case "pty.data":
        this.onPtyInput(frame.streamId, frame.dataB64);
        return;
      case "pty.resize":
        this.onPtyResize(frame.streamId, frame.cols, frame.rows);
        return;
      case "pty.close":
        this.onPtyClose(frame.streamId);
        return;
      case "exec.run":
        this.onExecRun(frame);
        return;
      case "files.list":
        await this.onFilesList(frame.streamId, frame.path, frame.depth);
        return;
      case "files.read":
        await this.onFilesRead(frame.streamId, frame.path);
        return;
      case "files.write":
        await this.onFilesWrite(frame.streamId, frame.path, frame.contentB64);
        return;
      case "files.delete":
        await this.onFilesDelete(frame.streamId, frame.path);
        return;
      case "files.mkdir":
        await this.onFilesMkdir(frame.streamId, frame.path);
        return;
      case "files.move":
        await this.onFilesMove(frame.streamId, frame.from, frame.to);
        return;
      case "fs.watch":
        await this.onFsWatch(frame.streamId, frame.path);
        return;
      case "fs.unwatch":
        await this.onFsUnwatch(frame.streamId);
        return;
    }
  }

  private onHelloAck(frame: HelloAckPayload): void {
    log.info("hello.ack", { runnerId: frame.runnerId, heartbeatSec: frame.heartbeatSec });
    this.reconnectDelay = 1000;
    this.startHeartbeat(frame.heartbeatSec);
  }

  private onPtyOpen(frame: Extract<BrokerFrame, { type: "pty.open" }>): void {
    if (!this.nodePty) {
      this.send({
        type: "error",
        streamId: frame.streamId,
        code: "pty_unavailable",
        message: "node-pty not present in image",
      });
      return;
    }
    const shell = frame.shell ?? process.env.SHELL ?? "/bin/bash";
    const cwd = frame.cwd ? this.resolveWorkspace(frame.cwd) : env.workspace;
    try {
      const pty = this.nodePty.spawn(shell, [], {
        name: "xterm-256color",
        cols: frame.cols,
        rows: frame.rows,
        cwd,
        env: { ...process.env, ...(frame.env ?? {}), TERM: "xterm-256color" },
      });
      this.ptys.set(frame.streamId, pty);
      pty.onData((d) => {
        this.send({
          type: "pty.data",
          streamId: frame.streamId,
          dataB64: Buffer.from(d, "utf8").toString("base64"),
        });
      });
      pty.onExit(({ exitCode }) => {
        this.ptys.delete(frame.streamId);
        this.send({ type: "pty.close", streamId: frame.streamId, exitCode });
      });
    } catch (err) {
      this.send({
        type: "error",
        streamId: frame.streamId,
        code: "pty_spawn_failed",
        message: String(err),
      });
    }
  }

  private onPtyInput(streamId: string, dataB64: string): void {
    const pty = this.ptys.get(streamId);
    if (!pty) return;
    pty.write(Buffer.from(dataB64, "base64").toString("utf8"));
  }

  private onPtyResize(streamId: string, cols: number, rows: number): void {
    const pty = this.ptys.get(streamId);
    if (!pty) return;
    try {
      pty.resize(cols, rows);
    } catch (err) {
      log.warn("pty resize failed", { streamId, err: String(err) });
    }
  }

  private onPtyClose(streamId: string): void {
    const pty = this.ptys.get(streamId);
    if (!pty) return;
    try {
      pty.kill();
    } catch {
      /* ignore */
    }
    this.ptys.delete(streamId);
  }

  private onExecRun(frame: Extract<BrokerFrame, { type: "exec.run" }>): void {
    const ac = new AbortController();
    this.execs.set(frame.streamId, ac);
    const cwd = frame.cwd ? this.resolveWorkspace(frame.cwd) : env.workspace;
    const child = spawn("/bin/sh", ["-c", frame.cmd], {
      cwd,
      env: { ...process.env, ...(frame.env ?? {}) },
      signal: ac.signal,
    });
    const timeout = setTimeout(() => ac.abort(), frame.timeoutMs);
    let timedOut = false;
    ac.signal.addEventListener("abort", () => {
      timedOut = true;
    });
    child.stdout.on("data", (d: Buffer) => {
      this.send({
        type: "exec.data",
        streamId: frame.streamId,
        channel: "stdout",
        dataB64: d.toString("base64"),
      });
    });
    child.stderr.on("data", (d: Buffer) => {
      this.send({
        type: "exec.data",
        streamId: frame.streamId,
        channel: "stderr",
        dataB64: d.toString("base64"),
      });
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      this.execs.delete(frame.streamId);
      this.send({
        type: "exec.exit",
        streamId: frame.streamId,
        exitCode: code ?? -1,
        timedOut,
      });
    });
    child.on("error", (err) => {
      clearTimeout(timeout);
      this.execs.delete(frame.streamId);
      this.send({
        type: "error",
        streamId: frame.streamId,
        code: "exec_error",
        message: err.message,
      });
    });
  }

  private resolveWorkspace(p: string): string {
    try {
      return safeJoin(env.workspace, p);
    } catch (err) {
      if (err instanceof PathOutsideWorkspaceError) throw err;
      throw err;
    }
  }

  private async onFilesList(streamId: string, p: string, depth: number): Promise<void> {
    try {
      const root = this.resolveWorkspace(p);
      const entries: Array<{
        path: string;
        name: string;
        kind: "file" | "dir" | "symlink";
        size?: number;
        mtimeMs?: number;
      }> = [];
      const walk = async (dir: string, d: number): Promise<void> => {
        if (entries.length >= MAX_LIST_ENTRIES) return;
        const items = await fs.readdir(dir, { withFileTypes: true });
        for (const item of items) {
          if (item.name === "node_modules" || item.name === ".git") continue;
          const full = path.join(dir, item.name);
          const rel = path.relative(env.workspace, full);
          let stat;
          try {
            stat = await fs.stat(full);
          } catch {
            continue;
          }
          const kind: "file" | "dir" | "symlink" = item.isSymbolicLink()
            ? "symlink"
            : item.isDirectory()
              ? "dir"
              : "file";
          entries.push({
            path: "/" + rel,
            name: item.name,
            kind,
            size: kind === "file" ? stat.size : undefined,
            mtimeMs: stat.mtimeMs,
          });
          if (kind === "dir" && d > 1) await walk(full, d - 1);
          if (entries.length >= MAX_LIST_ENTRIES) return;
        }
      };
      await walk(root, depth);
      this.send({ type: "files.list.result", streamId, entries });
    } catch (err) {
      this.sendErr(streamId, "files_list_failed", err);
    }
  }

  private async onFilesRead(streamId: string, p: string): Promise<void> {
    try {
      const full = this.resolveWorkspace(p);
      const stat = await fs.stat(full);
      if (stat.size > MAX_FILE_BYTES) {
        this.sendErr(streamId, "file_too_large", new Error(`${stat.size} > ${MAX_FILE_BYTES}`));
        return;
      }
      const buf = await fs.readFile(full);
      this.send({
        type: "files.read.result",
        streamId,
        contentB64: buf.toString("base64"),
        size: stat.size,
        truncated: false,
      });
    } catch (err) {
      this.sendErr(streamId, "files_read_failed", err);
    }
  }

  private async onFilesWrite(streamId: string, p: string, contentB64: string): Promise<void> {
    try {
      const full = this.resolveWorkspace(p);
      const buf = Buffer.from(contentB64, "base64");
      if (buf.length > MAX_FILE_BYTES) {
        this.sendErr(streamId, "file_too_large", new Error(`${buf.length} > ${MAX_FILE_BYTES}`));
        return;
      }
      await fs.mkdir(path.dirname(full), { recursive: true });
      await fs.writeFile(full, buf);
      this.send({ type: "files.write.result", streamId, size: buf.length });
    } catch (err) {
      this.sendErr(streamId, "files_write_failed", err);
    }
  }

  private async onFilesDelete(streamId: string, p: string): Promise<void> {
    try {
      const full = this.resolveWorkspace(p);
      await fs.rm(full, { recursive: true, force: true });
      this.send({ type: "files.ok", streamId });
    } catch (err) {
      this.sendErr(streamId, "files_delete_failed", err);
    }
  }

  private async onFilesMkdir(streamId: string, p: string): Promise<void> {
    try {
      const full = this.resolveWorkspace(p);
      await fs.mkdir(full, { recursive: true });
      this.send({ type: "files.ok", streamId });
    } catch (err) {
      this.sendErr(streamId, "files_mkdir_failed", err);
    }
  }

  private async onFilesMove(streamId: string, from: string, to: string): Promise<void> {
    try {
      const a = this.resolveWorkspace(from);
      const b = this.resolveWorkspace(to);
      await fs.mkdir(path.dirname(b), { recursive: true });
      await fs.rename(a, b);
      this.send({ type: "files.ok", streamId });
    } catch (err) {
      this.sendErr(streamId, "files_move_failed", err);
    }
  }

  private async onFsWatch(streamId: string, p: string): Promise<void> {
    try {
      const full = this.resolveWorkspace(p);
      const w = chokidar.watch(full, {
        ignoreInitial: true,
        ignored: (filePath: string) =>
          filePath.includes("node_modules") || filePath.includes(".git"),
      });
      const onEvt = (kind: "create" | "modify" | "delete") => (filePath: string) => {
        const rel = "/" + path.relative(env.workspace, filePath);
        this.send({ type: "fs.event", streamId, path: rel, kind });
      };
      w.on("add", onEvt("create"));
      w.on("change", onEvt("modify"));
      w.on("unlink", onEvt("delete"));
      w.on("addDir", onEvt("create"));
      w.on("unlinkDir", onEvt("delete"));
      this.watchers.set(streamId, w);
    } catch (err) {
      this.sendErr(streamId, "fs_watch_failed", err);
    }
  }

  private async onFsUnwatch(streamId: string): Promise<void> {
    const w = this.watchers.get(streamId);
    if (w) {
      await w.close();
      this.watchers.delete(streamId);
    }
  }

  private sendErr(streamId: string, code: string, err: unknown): void {
    log.warn(code, { err: String(err) });
    this.send({
      type: "error",
      streamId,
      code,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

process.on("SIGTERM", () => {
  log.info("SIGTERM, exiting");
  process.exit(0);
});
process.on("SIGINT", () => {
  log.info("SIGINT, exiting");
  process.exit(0);
});

log.info("starting tutly playground agent", {
  version: AGENT_VERSION,
  workspace: env.workspace,
  url: env.url,
  host: os.hostname(),
});

new Agent().start().catch((err) => {
  log.error("fatal", { err: String(err) });
  process.exit(1);
});
