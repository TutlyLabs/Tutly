#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");
const androidRoot = path.join(webRoot, "android");

const pkg = JSON.parse(
  fs.readFileSync(path.join(webRoot, "package.json"), "utf8"),
);
const versionName = pkg.version;
const [maj, min, pat] = versionName.split(".").map((n) => parseInt(n, 10));
const versionCode = maj * 10000 + min * 100 + pat;

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://learn.tutly.in";

console.log(
  `▶ Building APK for web@${versionName} (versionCode=${versionCode})`,
);
console.log(`▶ NEXT_PUBLIC_API_URL=${apiUrl}`);

const ks64 = process.env.ANDROID_KEYSTORE_BASE64;
const ksPassword = process.env.ANDROID_KEYSTORE_PASSWORD;
const keyAlias = process.env.ANDROID_KEY_ALIAS;
const keyPassword = process.env.ANDROID_KEY_PASSWORD;

if (!ks64 || !ksPassword || !keyAlias || !keyPassword) {
  console.error(
    "✖ Missing one of: ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD",
  );
  process.exit(1);
}

const keystorePath = path.join(os.tmpdir(), `tutly-${Date.now()}.jks`);
fs.writeFileSync(keystorePath, Buffer.from(ks64, "base64"));
process.on("exit", () => {
  try {
    fs.unlinkSync(keystorePath);
  } catch {}
});

execSync("pnpm build:cap", {
  cwd: webRoot,
  stdio: "inherit",
  env: { ...process.env, NEXT_PUBLIC_API_URL: apiUrl },
});

execSync("pnpm exec cap copy android", { cwd: webRoot, stdio: "inherit" });

const gradleArgs = [
  ":app:assembleRelease",
  `-PTUTLY_VERSION_CODE=${versionCode}`,
  `-PTUTLY_VERSION_NAME=${versionName}`,
  `-PTUTLY_KEYSTORE_FILE=${keystorePath}`,
  `-PTUTLY_KEYSTORE_PASSWORD=${ksPassword}`,
  `-PTUTLY_KEY_ALIAS=${keyAlias}`,
  `-PTUTLY_KEY_PASSWORD=${keyPassword}`,
];

execSync(`./gradlew ${gradleArgs.join(" ")}`, {
  cwd: androidRoot,
  stdio: "inherit",
});

const apkSrc = path.join(
  androidRoot,
  "app/build/outputs/apk/release/app-release.apk",
);
if (!fs.existsSync(apkSrc)) {
  console.error(`✖ APK not found at ${apkSrc}`);
  process.exit(1);
}

const apkOut = path.join(webRoot, `tutly-${versionName}.apk`);
fs.copyFileSync(apkSrc, apkOut);

console.log(`✔ Signed APK: ${apkOut}`);
