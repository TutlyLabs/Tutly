import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging, type Message } from "firebase-admin/messaging";

import type { db as Db } from "@tutly/db";

const APP_NAME = "tutly-fcm";

const getServiceAccount = () => {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch (err) {
    console.error("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON:", err);
    return null;
  }
};

const getFcm = () => {
  const sa = getServiceAccount();
  if (!sa) return null;

  const app =
    getApps().find((a) => a.name === APP_NAME) ??
    initializeApp({ credential: cert(sa) }, APP_NAME);
  return getMessaging(app);
};

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  data?: Record<string, string>;
};

export async function sendPushToUser(
  db: typeof Db,
  userId: string,
  payload: PushPayload,
): Promise<void> {
  const fcm = getFcm();
  if (!fcm) return;

  const tokens = await db.deviceToken.findMany({
    where: { userId },
    select: { token: true },
  });
  if (tokens.length === 0) return;

  const data: Record<string, string> = { ...(payload.data ?? {}) };
  if (payload.url) data.url = payload.url;

  const messages: Message[] = tokens.map((t) => ({
    token: t.token,
    notification: { title: payload.title, body: payload.body },
    data,
    apns: { payload: { aps: { sound: "default" } } },
    android: { priority: "high" },
  }));

  const res = await fcm.sendEach(messages);
  const stale: string[] = [];
  res.responses.forEach((r, i) => {
    if (r.success || !r.error) return;
    const code = r.error.code;
    if (
      code === "messaging/registration-token-not-registered" ||
      code === "messaging/invalid-argument"
    ) {
      const t = tokens[i]?.token;
      if (t) stale.push(t);
    }
  });
  if (stale.length > 0) {
    await db.deviceToken.deleteMany({ where: { token: { in: stale } } });
  }
}
