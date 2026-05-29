type Listener<T = unknown> = (frame: T) => void;

export interface RunnerStatusFrame {
  type: "runner.status";
  status: "pending" | "online" | "offline";
  agentVersion?: string;
  image?: string;
}

interface InboundFrameBase {
  type: string;
  streamId?: string;
}

export interface ListEntry {
  path: string;
  name: string;
  kind: "file" | "dir" | "symlink";
  size?: number;
  mtimeMs?: number;
}

export class RunnerClient {
  private ws: WebSocket | null = null;
  private nextStreamN = 1;
  private streamListeners = new Map<string, Listener<InboundFrameBase>>();
  private globalListeners = new Set<Listener<InboundFrameBase>>();
  private pingTimer: number | null = null;
  private opened = false;
  private openPromise: Promise<void> | null = null;

  status: RunnerStatusFrame["status"] = "pending";
  agentVersion?: string;
  image?: string;
  onStatus?: (s: RunnerStatusFrame) => void;
  onOpen?: () => void;
  onClose?: () => void;

  async connect(wsUrl: string, ticket: string): Promise<void> {
    if (this.openPromise) return this.openPromise;
    const url = new URL(wsUrl);
    url.searchParams.set("ticket", ticket);
    const ws = new WebSocket(url.toString());
    this.ws = ws;
    this.openPromise = new Promise<void>((resolve, reject) => {
      ws.addEventListener("open", () => {
        this.opened = true;
        this.pingTimer = window.setInterval(() => {
          this.sendRaw({ type: "ping", t: Date.now() });
        }, 20_000);
        this.onOpen?.();
        resolve();
      });
      ws.addEventListener("close", () => {
        this.opened = false;
        if (this.pingTimer) {
          clearInterval(this.pingTimer);
          this.pingTimer = null;
        }
        this.onClose?.();
      });
      ws.addEventListener("error", () => reject(new Error("ws error")));
      ws.addEventListener("message", (ev) => {
        let parsed: InboundFrameBase;
        try {
          parsed = JSON.parse(typeof ev.data === "string" ? ev.data : "");
        } catch {
          return;
        }
        if (parsed.type === "runner.status") {
          const s = parsed as unknown as RunnerStatusFrame;
          this.status = s.status;
          this.agentVersion = s.agentVersion;
          this.image = s.image;
          this.onStatus?.(s);
          return;
        }
        if (parsed.streamId) {
          const l = this.streamListeners.get(parsed.streamId);
          if (l) l(parsed);
        }
        for (const l of this.globalListeners) l(parsed);
      });
    });
    return this.openPromise;
  }

  close(): void {
    this.ws?.close();
    this.streamListeners.clear();
  }

  isOpen(): boolean {
    return this.opened;
  }

  newStreamId(prefix: string): string {
    return `${prefix}-${this.nextStreamN++}-${crypto.randomUUID().slice(0, 8)}`;
  }

  on(streamId: string, fn: Listener<InboundFrameBase>): () => void {
    this.streamListeners.set(streamId, fn);
    return () => this.streamListeners.delete(streamId);
  }

  onAny(fn: Listener<InboundFrameBase>): () => void {
    this.globalListeners.add(fn);
    return () => this.globalListeners.delete(fn);
  }

  send(frame: object): void {
    this.sendRaw(frame);
  }

  private sendRaw(frame: object): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(frame));
  }

  request<T extends InboundFrameBase>(
    payload: object,
    streamId: string,
    expectedType: string,
    timeoutMs = 15000
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        this.streamListeners.delete(streamId);
        reject(new Error(`timeout waiting for ${expectedType}`));
      }, timeoutMs);
      this.streamListeners.set(streamId, (frame) => {
        if (frame.type === "error") {
          window.clearTimeout(timer);
          this.streamListeners.delete(streamId);
          reject(new Error((frame as unknown as { message: string }).message));
          return;
        }
        if (frame.type === expectedType) {
          window.clearTimeout(timer);
          this.streamListeners.delete(streamId);
          resolve(frame as T);
        }
      });
      this.sendRaw(payload);
    });
  }

  async listFiles(path: string, depth = 2): Promise<ListEntry[]> {
    const streamId = this.newStreamId("ls");
    const res = await this.request<{ entries: ListEntry[] } & InboundFrameBase>(
      { type: "files.list", streamId, path, depth },
      streamId,
      "files.list.result"
    );
    return res.entries;
  }

  async readFile(path: string): Promise<string> {
    const streamId = this.newStreamId("read");
    const res = await this.request<{ contentB64: string } & InboundFrameBase>(
      { type: "files.read", streamId, path },
      streamId,
      "files.read.result"
    );
    return atob(res.contentB64);
  }

  async writeFile(path: string, content: string): Promise<void> {
    const streamId = this.newStreamId("write");
    await this.request<InboundFrameBase>(
      {
        type: "files.write",
        streamId,
        path,
        contentB64: btoa(content),
      },
      streamId,
      "files.write.result"
    );
  }

  async deleteFile(path: string): Promise<void> {
    const streamId = this.newStreamId("del");
    await this.request<InboundFrameBase>(
      { type: "files.delete", streamId, path },
      streamId,
      "files.ok"
    );
  }
}
