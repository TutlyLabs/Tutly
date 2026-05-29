const fmt = (level: string, msg: string, extra?: Record<string, unknown>) => {
  const line = { ts: new Date().toISOString(), level, msg, ...(extra ?? {}) };
  process.stderr.write(JSON.stringify(line) + "\n");
};

export const log = {
  info: (msg: string, extra?: Record<string, unknown>) => fmt("info", msg, extra),
  warn: (msg: string, extra?: Record<string, unknown>) => fmt("warn", msg, extra),
  error: (msg: string, extra?: Record<string, unknown>) => fmt("error", msg, extra),
  debug: (msg: string, extra?: Record<string, unknown>) => {
    if (process.env.TUTLY_DEBUG === "1") fmt("debug", msg, extra);
  },
};
