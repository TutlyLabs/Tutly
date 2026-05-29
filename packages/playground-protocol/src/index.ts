import { z } from "zod";

export const PROTOCOL_VERSION = 1;

const StreamId = z.string().min(1).max(64);

const HelloFrame = z.object({
  type: z.literal("hello"),
  protocol: z.literal(PROTOCOL_VERSION),
  token: z.string().min(8),
  agentVersion: z.string(),
  image: z.string().optional(),
  language: z.string().optional(),
  capabilities: z
    .object({
      pty: z.boolean().default(true),
      exec: z.boolean().default(true),
      files: z.boolean().default(true),
      watch: z.boolean().default(false),
    })
    .partial()
    .default({}),
});

const HelloAckFrame = z.object({
  type: z.literal("hello.ack"),
  runnerId: z.string(),
  sessionSecret: z.string(),
  heartbeatSec: z.number().int().positive(),
});

const PingFrame = z.object({ type: z.literal("ping"), t: z.number().optional() });
const PongFrame = z.object({ type: z.literal("pong"), t: z.number().optional() });

const ErrorFrame = z.object({
  type: z.literal("error"),
  streamId: StreamId.optional(),
  code: z.string(),
  message: z.string(),
});

const PtyOpen = z.object({
  type: z.literal("pty.open"),
  streamId: StreamId,
  cols: z.number().int().positive().max(500),
  rows: z.number().int().positive().max(500),
  cwd: z.string().optional(),
  shell: z.string().optional(),
  env: z.record(z.string(), z.string()).optional(),
});
const PtyData = z.object({
  type: z.literal("pty.data"),
  streamId: StreamId,
  dataB64: z.string(),
});
const PtyResize = z.object({
  type: z.literal("pty.resize"),
  streamId: StreamId,
  cols: z.number().int().positive().max(500),
  rows: z.number().int().positive().max(500),
});
const PtyClose = z.object({
  type: z.literal("pty.close"),
  streamId: StreamId,
  exitCode: z.number().int().optional(),
});

const ExecRun = z.object({
  type: z.literal("exec.run"),
  streamId: StreamId,
  cmd: z.string().min(1),
  cwd: z.string().optional(),
  env: z.record(z.string(), z.string()).optional(),
  timeoutMs: z.number().int().positive().max(15 * 60 * 1000).default(5 * 60 * 1000),
});
const ExecData = z.object({
  type: z.literal("exec.data"),
  streamId: StreamId,
  channel: z.enum(["stdout", "stderr"]),
  dataB64: z.string(),
});
const ExecExit = z.object({
  type: z.literal("exec.exit"),
  streamId: StreamId,
  exitCode: z.number().int(),
  timedOut: z.boolean().optional(),
});

const FilesListReq = z.object({
  type: z.literal("files.list"),
  streamId: StreamId,
  path: z.string(),
  depth: z.number().int().min(1).max(8).default(2),
});
const FilesListRes = z.object({
  type: z.literal("files.list.result"),
  streamId: StreamId,
  entries: z.array(
    z.object({
      path: z.string(),
      name: z.string(),
      kind: z.enum(["file", "dir", "symlink"]),
      size: z.number().int().nonnegative().optional(),
      mtimeMs: z.number().optional(),
    })
  ),
});

const FilesRead = z.object({
  type: z.literal("files.read"),
  streamId: StreamId,
  path: z.string(),
});
const FilesReadRes = z.object({
  type: z.literal("files.read.result"),
  streamId: StreamId,
  contentB64: z.string(),
  size: z.number().int().nonnegative(),
  truncated: z.boolean().default(false),
});

const FilesWrite = z.object({
  type: z.literal("files.write"),
  streamId: StreamId,
  path: z.string(),
  contentB64: z.string(),
});
const FilesWriteRes = z.object({
  type: z.literal("files.write.result"),
  streamId: StreamId,
  size: z.number().int().nonnegative(),
});

const FilesDelete = z.object({
  type: z.literal("files.delete"),
  streamId: StreamId,
  path: z.string(),
});
const FilesMkdir = z.object({
  type: z.literal("files.mkdir"),
  streamId: StreamId,
  path: z.string(),
});
const FilesMove = z.object({
  type: z.literal("files.move"),
  streamId: StreamId,
  from: z.string(),
  to: z.string(),
});
const FilesOk = z.object({
  type: z.literal("files.ok"),
  streamId: StreamId,
});

const FsWatch = z.object({
  type: z.literal("fs.watch"),
  streamId: StreamId,
  path: z.string(),
});
const FsUnwatch = z.object({
  type: z.literal("fs.unwatch"),
  streamId: StreamId,
});
const FsEvent = z.object({
  type: z.literal("fs.event"),
  streamId: StreamId,
  path: z.string(),
  kind: z.enum(["create", "modify", "delete"]),
});

export const AgentToBrokerFrame = z.discriminatedUnion("type", [
  HelloFrame,
  PingFrame,
  PongFrame,
  ErrorFrame,
  PtyData,
  PtyClose,
  ExecData,
  ExecExit,
  FilesListRes,
  FilesReadRes,
  FilesWriteRes,
  FilesOk,
  FsEvent,
]);

export const BrokerToAgentFrame = z.discriminatedUnion("type", [
  HelloAckFrame,
  PingFrame,
  PongFrame,
  ErrorFrame,
  PtyOpen,
  PtyData,
  PtyResize,
  PtyClose,
  ExecRun,
  FilesListReq,
  FilesRead,
  FilesWrite,
  FilesDelete,
  FilesMkdir,
  FilesMove,
  FsWatch,
  FsUnwatch,
]);

export type AgentFrame = z.infer<typeof AgentToBrokerFrame>;
export type BrokerFrame = z.infer<typeof BrokerToAgentFrame>;
export type HelloPayload = z.infer<typeof HelloFrame>;
export type HelloAckPayload = z.infer<typeof HelloAckFrame>;

export const ClientToBrokerFrame = z.discriminatedUnion("type", [
  PingFrame,
  PtyOpen,
  PtyData,
  PtyResize,
  PtyClose,
  ExecRun,
  FilesListReq,
  FilesRead,
  FilesWrite,
  FilesDelete,
  FilesMkdir,
  FilesMove,
  FsWatch,
  FsUnwatch,
]);

export const BrokerToClientFrame = z.discriminatedUnion("type", [
  PingFrame,
  PongFrame,
  ErrorFrame,
  PtyData,
  PtyClose,
  ExecData,
  ExecExit,
  FilesListRes,
  FilesReadRes,
  FilesWriteRes,
  FilesOk,
  FsEvent,
  z.object({
    type: z.literal("runner.status"),
    status: z.enum(["pending", "online", "offline"]),
    agentVersion: z.string().optional(),
    image: z.string().optional(),
  }),
]);

export type ClientFrame = z.infer<typeof ClientToBrokerFrame>;
export type BrokerToClientPayload = z.infer<typeof BrokerToClientFrame>;
