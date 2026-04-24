import * as Linking from "expo-linking";

import { env } from "./env";

export function openWebPath(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return Linking.openURL(path);
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return Linking.openURL(`${env.webUrl}${normalizedPath}`);
}
