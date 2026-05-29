import crypto from "node:crypto";

const SECRET = process.env.PLAYGROUND_BROKER_HMAC_SECRET;
if (!SECRET) throw new Error("PLAYGROUND_BROKER_HMAC_SECRET is required");

const enc = (b: Buffer): string => b.toString("base64url");
const dec = (s: string): Buffer => Buffer.from(s, "base64url");

export interface ClientTicket {
  userId: string;
  runnerId: string;
  exp: number;
}

export function signTicket(payload: ClientTicket): string {
  const body = enc(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = crypto.createHmac("sha256", SECRET!).update(body).digest();
  return `${body}.${enc(sig)}`;
}

export function verifyTicket(ticket: string): ClientTicket | null {
  const dot = ticket.indexOf(".");
  if (dot < 0) return null;
  const body = ticket.slice(0, dot);
  const sig = ticket.slice(dot + 1);
  const expected = crypto.createHmac("sha256", SECRET!).update(body).digest();
  const got = dec(sig);
  if (got.length !== expected.length || !crypto.timingSafeEqual(got, expected)) return null;
  try {
    const parsed = JSON.parse(dec(body).toString("utf8")) as ClientTicket;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}
