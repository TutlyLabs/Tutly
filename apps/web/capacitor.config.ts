import type { CapacitorConfig } from "@capacitor/cli";

// Bundles Next.js's static `out/` into the native app. Do not set
// `server.url` — it disables offline launch and breaks App Store review.
const config: CapacitorConfig = {
  appId: "in.tutly.app",
  appName: "Tutly",
  webDir: "out",
  server: { androidScheme: "https" },
  ios: { contentInset: "always" },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1000,
      backgroundColor: "#000000",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
