import type { CapacitorConfig } from "@capacitor/cli";

// Do not set server.url — disables offline launch and fails App Store review.
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
