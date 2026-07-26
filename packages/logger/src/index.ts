import { pino, stdSerializers } from "pino";
import type { DestinationStream, Level, Logger, LoggerOptions } from "pino";

import { REDACT_CENSOR, REDACT_PATHS } from "./redact";

export { REDACT_CENSOR, REDACT_PATHS, SENSITIVE_KEYS } from "./redact";
export type { Level, Logger } from "pino";

export type Bindings = Record<string, unknown>;

const LEVELS: readonly string[] = ["fatal", "error", "warn", "info", "debug", "trace", "silent"];

/**
 * Tests must not emit; everything else follows LOG_LEVEL and falls back to info.
 */
export function resolveLevel(env: NodeJS.ProcessEnv = process.env): Level | "silent" {
  const configured = env.LOG_LEVEL?.trim().toLowerCase();
  if (configured && LEVELS.includes(configured)) {
    return configured as Level | "silent";
  }
  if (env.NODE_ENV === "test") return "silent";
  return "info";
}

export function buildLoggerOptions(overrides: LoggerOptions = {}): LoggerOptions {
  return {
    level: resolveLevel(),
    redact: {
      paths: [...REDACT_PATHS],
      censor: REDACT_CENSOR,
    },
    serializers: {
      err: stdSerializers.err,
      error: stdSerializers.err,
    },
    ...overrides,
  };
}

/**
 * Exposed so tests can supply their own destination stream.
 */
export function createRootLogger(
  overrides: LoggerOptions = {},
  destination?: DestinationStream,
): Logger {
  const options = buildLoggerOptions(overrides);
  return destination ? pino(options, destination) : pino(options);
}

export const logger: Logger = createRootLogger();

export function createLogger(name: string, bindings: Bindings = {}): Logger {
  return logger.child({ name, ...bindings });
}

/**
 * @deprecated Use {@link logger} or {@link createLogger} with structured fields.
 */
export function log(message: string, bindings: Bindings = {}): void {
  logger.info(bindings, message);
}
