import { promises as fs } from "fs";
import { createServer, IncomingMessage } from "http";
import * as path from "path";
import { Command, flags } from "@oclif/command";
import chokidar from "chokidar";
import cors from "cors";
import express from "express";
import * as pty from "node-pty";
import * as WebSocket from "ws";
import { WebSocketServer } from "ws";

interface FileEntry {
  name: string;
  type: "file" | "directory";
  size?: number;
  mtime?: Date;
  path: string;
}

interface TerminalSession {
  id: string;
  pty: pty.IPty;
  ws: WebSocket.WebSocket;
}

export default class ServeFiles extends Command {
  static description =
    "Start a file server to expose local filesystem via HTTP API and WebSocket";

  static flags = {
    help: flags.help({ char: "h" }),
    port: flags.integer({
      char: "p",
      description: "Port to run the server on",
      default: 3001,
    }),
    host: flags.string({
      description: "Host to bind the server to",
      default: "localhost",
    }),
    directory: flags.string({
      char: "d",
      description: "Directory to serve (defaults to current directory)",
      default: process.cwd(),
    }),
  };

  private app!: express.Application;
  private server!: ReturnType<typeof createServer>;
  private wss!: WebSocketServer;
  private fileWatcher?: chokidar.FSWatcher;
  private watcherClients: Set<WebSocket.WebSocket> = new Set();
  private terminals: Map<string, TerminalSession> = new Map();

  async run() {
    const { flags } = this.parse(ServeFiles);

    this.log(`Starting Tutly file server...`);
    this.log(`Directory: ${flags.directory}`);
    this.log(`Port: ${flags.port}`);
    this.log(`Host: ${flags.host}`);

    await this.setupServer(flags);
    await this.setupRoutes(flags);
    await this.setupWebSocket();
    await this.setupFileWatcher(flags.directory);

    this.server.listen(flags.port, flags.host, () => {
      this.log(
        `🚀 Tutly file server running at http://${flags.host}:${flags.port}`,
      );
      this.log(`📁 Serving directory: ${flags.directory}`);
      this.log(`\nAPI Endpoints:`);
      this.log(`  GET    /api/health              - Health check`);
      this.log(`  GET    /api/files               - List directory contents`);
      this.log(
        `  GET    /api/files/*             - Get file content or directory listing`,
      );
      this.log(`  POST   /api/files/*             - Create file or directory`);
      this.log(`  PUT    /api/files/*             - Update file content`);
      this.log(`  DELETE /api/files/*             - Delete file or directory`);
      this.log(`\nWebSocket Endpoints:`);
      this.log(`  /ws/files                       - File watching`);
      this.log(`  /ws/terminal                    - Terminal access`);
      this.log(`\nPress Ctrl+C to stop the server`);
    });

    // Graceful shutdown
    process.on("SIGINT", () => this.shutdown());
    process.on("SIGTERM", () => this.shutdown());
  }

  private async setupServer(flags: any) {
    this.app = express();

    // Middleware
    this.app.use(
      cors({
        origin: [
          "http://localhost:3000",
          "http://localhost:5173",
          "http://localhost:8080",
          "http://127.0.0.1:3000",
          "http://127.0.0.1:8080",
        ],
        credentials: true,
      }),
    );
    this.app.use(express.json({ limit: "50mb" }));
    this.app.use(
      express.raw({
        limit: "50mb",
        type: ["application/octet-stream", "image/*"],
      }),
    );

    this.server = createServer(this.app);
  }

  private async setupRoutes(flags: any) {
    const baseDir = path.resolve(flags.directory);

    // Health check
    this.app.get("/api/health", (req, res) => {
      res.json({
        status: "ok",
        directory: baseDir,
        timestamp: new Date().toISOString(),
        version: "1.0.0",
      });
    });

    // List root directory or get file/directory content
    this.app.get("/api/files", async (req, res) => {
      try {
        const entries = await this.listDirectory(baseDir);
        res.json({ entries, path: "/" });
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    // Get file content or directory listing
    this.app.get("/api/files/*", async (req, res) => {
      try {
        const relativePath = (req.params as any)[0];
        const fullPath = this.safePath(baseDir, relativePath);

        const stats = await fs.stat(fullPath);

        if (stats.isDirectory()) {
          const entries = await this.listDirectory(fullPath);
          res.json({ entries, path: relativePath });
        } else {
          // Check if file is binary
          const isBinary = await this.isBinaryFile(fullPath);

          if (isBinary) {
            // Send binary file as base64
            const buffer = await fs.readFile(fullPath);
            res.json({
              type: "file",
              binary: true,
              content: buffer.toString("base64"),
              size: stats.size,
              mtime: stats.mtime,
            });
          } else {
            // Send text file
            const content = await fs.readFile(fullPath, "utf-8");
            res.json({
              type: "file",
              binary: false,
              content,
              size: stats.size,
              mtime: stats.mtime,
            });
          }
        }
      } catch (error) {
        if ((error as any).code === "ENOENT") {
          res.status(404).json({ error: "File not found" });
        } else {
          res.status(500).json({ error: (error as Error).message });
        }
      }
    });

    // Create file or directory
    this.app.post("/api/files/*", async (req, res) => {
      try {
        const relativePath = (req.params as any)[0];
        const fullPath = this.safePath(baseDir, relativePath);
        const { type, content, binary } = req.body;

        if (type === "directory") {
          await fs.mkdir(fullPath, { recursive: true });
          res.json({ success: true, message: "Directory created" });
        } else {
          // Ensure parent directory exists
          await fs.mkdir(path.dirname(fullPath), { recursive: true });

          if (binary) {
            const buffer = Buffer.from(content, "base64");
            await fs.writeFile(fullPath, buffer);
          } else {
            await fs.writeFile(fullPath, content, "utf-8");
          }
          res.json({ success: true, message: "File created" });
        }
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    // Update file content
    this.app.put("/api/files/*", async (req, res) => {
      try {
        const relativePath = (req.params as any)[0];
        const fullPath = this.safePath(baseDir, relativePath);
        const { content, binary } = req.body;

        if (binary) {
          const buffer = Buffer.from(content, "base64");
          await fs.writeFile(fullPath, buffer);
        } else {
          await fs.writeFile(fullPath, content, "utf-8");
        }

        res.json({ success: true, message: "File updated" });
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    // Delete file or directory
    this.app.delete("/api/files/*", async (req, res) => {
      try {
        const relativePath = (req.params as any)[0];
        const fullPath = this.safePath(baseDir, relativePath);

        const stats = await fs.stat(fullPath);

        if (stats.isDirectory()) {
          await fs.rmdir(fullPath, { recursive: true });
          res.json({ success: true, message: "Directory deleted" });
        } else {
          await fs.unlink(fullPath);
          res.json({ success: true, message: "File deleted" });
        }
      } catch (error) {
        if ((error as any).code === "ENOENT") {
          res.status(404).json({ error: "File not found" });
        } else {
          res.status(500).json({ error: (error as Error).message });
        }
      }
    });
  }

  private async setupWebSocket() {
    this.wss = new WebSocketServer({ server: this.server });

    this.wss.on(
      "connection",
      (ws: WebSocket.WebSocket, req: IncomingMessage) => {
        const url = new URL(req.url!, `http://${req.headers.host}`);

        if (url.pathname === "/ws/files") {
          this.handleFileWatcher(ws);
        } else if (url.pathname === "/ws/terminal") {
          this.handleTerminal(ws);
        } else {
          ws.close(1000, "Unknown endpoint");
        }
      },
    );
  }

  private handleFileWatcher(ws: WebSocket.WebSocket) {
    this.watcherClients.add(ws);

    ws.on("close", () => {
      this.watcherClients.delete(ws);
    });

    ws.send(
      JSON.stringify({
        type: "connected",
        message: "File watcher connected",
      }),
    );
  }

  private handleTerminal(ws: WebSocket.WebSocket) {
    const terminalId = `terminal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const { flags } = this.parse(ServeFiles);

    try {
      // Create a new pseudo-terminal
      const shell = process.platform === "win32" ? "powershell.exe" : "bash";
      const terminal = pty.spawn(shell, [], {
        name: "xterm-color",
        cols: 80,
        rows: 24,
        cwd: flags.directory,
        env: process.env as { [key: string]: string },
      });

      // Store the terminal session
      const session: TerminalSession = {
        id: terminalId,
        pty: terminal,
        ws: ws,
      };
      this.terminals.set(terminalId, session);

      // Send initial connection message
      ws.send(
        JSON.stringify({
          type: "connected",
          terminalId: terminalId,
          message: "Terminal connected successfully",
        }),
      );

      // Forward terminal output to WebSocket
      terminal.onData((data: string) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "data",
              data: data,
            }),
          );
        }
      });

      // Handle terminal exit
      terminal.onExit((e: { exitCode: number; signal?: number }) => {
        ws.send(
          JSON.stringify({
            type: "exit",
            exitCode: e.exitCode,
            signal: e.signal,
            message: `Terminal exited with code ${e.exitCode}`,
          }),
        );
        this.terminals.delete(terminalId);
        ws.close();
      });

      // Handle WebSocket messages (input from client)
      ws.on("message", (message: string) => {
        try {
          const msg = JSON.parse(message);

          switch (msg.type) {
            case "input":
              // Send input to terminal
              terminal.write(msg.data);
              break;

            case "resize":
              // Resize terminal
              if (msg.cols && msg.rows) {
                terminal.resize(msg.cols, msg.rows);
              }
              break;

            default:
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: `Unknown message type: ${msg.type}`,
                }),
              );
          }
        } catch (error) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: `Invalid message format: ${error}`,
            }),
          );
        }
      });

      // Handle WebSocket close
      ws.on("close", () => {
        terminal.kill();
        this.terminals.delete(terminalId);
      });

      // Handle WebSocket errors
      ws.on("error", (error) => {
        console.error(`Terminal WebSocket error for ${terminalId}:`, error);
        terminal.kill();
        this.terminals.delete(terminalId);
      });
    } catch (error) {
      console.error("Failed to create terminal:", error);
      ws.send(
        JSON.stringify({
          type: "error",
          message: `Failed to create terminal: ${error}`,
        }),
      );
      ws.close();
    }
  }

  private async setupFileWatcher(directory: string) {
    this.fileWatcher = chokidar.watch(directory, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true,
    });

    this.fileWatcher
      .on("add", (filePath) =>
        this.broadcastFileEvent("add", filePath, directory),
      )
      .on("change", (filePath) =>
        this.broadcastFileEvent("change", filePath, directory),
      )
      .on("unlink", (filePath) =>
        this.broadcastFileEvent("delete", filePath, directory),
      )
      .on("addDir", (dirPath) =>
        this.broadcastFileEvent("addDir", dirPath, directory),
      )
      .on("unlinkDir", (dirPath) =>
        this.broadcastFileEvent("deleteDir", dirPath, directory),
      );
  }

  private broadcastFileEvent(event: string, filePath: string, baseDir: string) {
    const relativePath = path.relative(baseDir, filePath);
    const message = JSON.stringify({
      type: "fileChange",
      event,
      path: relativePath,
      timestamp: new Date().toISOString(),
    });

    this.watcherClients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  private async listDirectory(dirPath: string): Promise<FileEntry[]> {
    const items = await fs.readdir(dirPath);
    const entries: FileEntry[] = [];

    for (const item of items) {
      try {
        const itemPath = path.join(dirPath, item);
        const stats = await fs.stat(itemPath);

        entries.push({
          name: item,
          type: stats.isDirectory() ? "directory" : "file",
          size: stats.isFile() ? stats.size : undefined,
          mtime: stats.mtime,
          path: itemPath,
        });
      } catch (error) {
        // Skip files that can't be accessed
        continue;
      }
    }

    return entries.sort((a, b) => {
      // Directories first, then files, alphabetically
      if (a.type !== b.type) {
        return a.type === "directory" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  private safePath(baseDir: string, relativePath: string): string {
    const fullPath = path.resolve(baseDir, relativePath);

    // Ensure the path is within the base directory
    if (!fullPath.startsWith(path.resolve(baseDir))) {
      throw new Error("Path traversal attempt detected");
    }

    return fullPath;
  }

  private async isBinaryFile(filePath: string): Promise<boolean> {
    try {
      const buffer = await fs.readFile(filePath);
      const bytes = buffer.subarray(0, 1024);

      // Check for null bytes which indicate binary content
      for (let i = 0; i < bytes.length; i++) {
        if (bytes[i] === 0) {
          return true;
        }
      }

      return false;
    } catch {
      return true; // Assume binary if we can't read it
    }
  }

  private async shutdown() {
    this.log("\nShutting down Tutly file server...");

    // Close all terminals
    for (const [id, session] of this.terminals.entries()) {
      this.log(`Closing terminal ${id}`);
      session.pty.kill();
      session.ws.close();
    }
    this.terminals.clear();

    // Close file watcher
    if (this.fileWatcher) {
      await this.fileWatcher.close();
    }

    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
    }

    // Close HTTP server
    if (this.server) {
      this.server.close(() => {
        this.log("Server stopped.");
        process.exit(0);
      });
    }
  }
}
