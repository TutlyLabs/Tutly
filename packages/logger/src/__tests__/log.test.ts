import { describe, expect, it } from "@jest/globals";
import type { DestinationStream } from "pino";

import { createRootLogger, REDACT_CENSOR, REDACT_PATHS, resolveLevel } from "..";

interface Capture {
  stream: DestinationStream;
  records: Record<string, unknown>[];
}

function capture(): Capture {
  const records: Record<string, unknown>[] = [];
  return {
    records,
    stream: {
      write(chunk: string) {
        records.push(JSON.parse(chunk) as Record<string, unknown>);
      },
    },
  };
}

describe("resolveLevel", () => {
  it("defaults to info", () => {
    expect(resolveLevel({} as NodeJS.ProcessEnv)).toBe("info");
  });

  it("is silent under NODE_ENV=test", () => {
    expect(resolveLevel({ NODE_ENV: "test" } as NodeJS.ProcessEnv)).toBe("silent");
  });

  it("honours LOG_LEVEL over the test default", () => {
    expect(resolveLevel({ NODE_ENV: "test", LOG_LEVEL: "DEBUG" } as NodeJS.ProcessEnv)).toBe(
      "debug",
    );
  });

  it("ignores an unknown LOG_LEVEL", () => {
    expect(resolveLevel({ LOG_LEVEL: "loud" } as NodeJS.ProcessEnv)).toBe("info");
  });
});

describe("level filtering", () => {
  it("drops records below the configured level", () => {
    const { stream, records } = capture();
    const logger = createRootLogger({ level: "warn" }, stream);

    logger.info("ignored");
    logger.debug("ignored");
    logger.warn("kept");

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ msg: "kept" });
  });

  it("emits nothing when silent", () => {
    const { stream, records } = capture();
    createRootLogger({ level: "silent" }, stream).error("nope");
    expect(records).toHaveLength(0);
  });
});

describe("redaction", () => {
  const logger = () => {
    const { stream, records } = capture();
    return { log: createRootLogger({ level: "trace" }, stream), records };
  };

  it("censors sensitive keys at the top level", () => {
    const { log, records } = logger();
    log.info({ password: "hunter2", email: "user@example.com", keep: "visible" }, "signup");

    expect(records[0]).toMatchObject({
      password: REDACT_CENSOR,
      email: REDACT_CENSOR,
      keep: "visible",
    });
  });

  it("censors nested and doubly-nested sensitive keys", () => {
    const { log, records } = logger();
    log.info(
      {
        user: { email: "user@example.com", password: "hunter2", id: "u_1" },
        payload: { account: { newPassword: "x", phoneNumber: "+10000000000", name: "ok" } },
      },
      "update",
    );

    expect(records[0]).toMatchObject({
      user: { email: REDACT_CENSOR, password: REDACT_CENSOR, id: "u_1" },
      payload: { account: { newPassword: REDACT_CENSOR, phoneNumber: REDACT_CENSOR, name: "ok" } },
    });
  });

  it("censors auth headers including hyphenated keys", () => {
    const { log, records } = logger();
    log.info(
      {
        req: { headers: { authorization: "Bearer secret", "user-agent": "jest" } },
        res: { headers: { "set-cookie": "session=abc" } },
      },
      "request",
    );

    expect(records[0]).toMatchObject({
      req: { headers: { authorization: REDACT_CENSOR, "user-agent": "jest" } },
      res: { headers: { "set-cookie": REDACT_CENSOR } },
    });
  });

  it("censors tokens on child logger bindings", () => {
    const { log, records } = logger();
    log.child({ name: "api:auth" }).error({ accessToken: "at", refreshToken: "rt" }, "refresh");

    expect(records[0]).toMatchObject({
      name: "api:auth",
      accessToken: REDACT_CENSOR,
      refreshToken: REDACT_CENSOR,
    });
  });

  it("exports a reviewable, duplicate-free path list", () => {
    expect(new Set(REDACT_PATHS).size).toBe(REDACT_PATHS.length);
    expect(REDACT_PATHS).toContain("password");
    expect(REDACT_PATHS).toContain("*.password");
    expect(REDACT_PATHS).toContain("*.*.password");
    expect(REDACT_PATHS).toContain('*["set-cookie"]');
    expect(REDACT_PATHS).toContain("req.headers.authorization");
  });
});

describe("error serialisation", () => {
  it("serialises err without leaking redacted fields", () => {
    const { stream, records } = capture();
    createRootLogger({ level: "info" }, stream).error(
      { err: new Error("boom"), userId: "u_1" },
      "failed",
    );

    expect(records[0]).toMatchObject({ msg: "failed", userId: "u_1" });
    expect((records[0] as { err: { message: string } }).err.message).toBe("boom");
  });
});
