import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "in.tutly.app",
  appName: "Tutly",
  webDir: "dist",
  // Do NOT set `server.url` — that disables the bundled web assets and breaks
  // launches when the network is down. The app loads `dist/` from the device.
  server: {
    androidScheme: "https",
  },
  ios: {
    contentInset: "always",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1000,
      backgroundColor: "#000000",
      androidSplashResourceName: "splash",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
