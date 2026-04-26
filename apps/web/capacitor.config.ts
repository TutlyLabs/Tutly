import type { CapacitorConfig } from "@capacitor/cli";

// Do not set server.url — disables offline launch and fails App Store review.
const config: CapacitorConfig = {
  appId: "in.tutly.app",
  appName: "Tutly",
  webDir: "out",
  server: { androidScheme: "https" },
  ios: { contentInset: "always" },
  android: { allowMixedContent: false },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      launchFadeOutDuration: 300,
      backgroundColor: "#000000",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#000000",
    },
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
