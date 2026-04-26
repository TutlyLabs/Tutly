import "@/styles/globals.css";

import { type Metadata, type Viewport } from "next";
import { Geist } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Suspense } from "react";

import { TRPCReactProvider } from "@/trpc/react";
import { ThemeProvider } from "@/providers/theme-provider";
import { LayoutProvider } from "@/providers/layout-provider";
import { Toaster } from "sonner";
import Crisp from "@/components/Crisp";
import PageLoader from "@/components/loader/PageLoader";
import AppLifecycle from "@/components/native/AppLifecycle";
import BadgeSync from "@/components/native/BadgeSync";
import BiometricLock from "@/components/native/BiometricLock";
import HapticsToastBridge from "@/components/native/HapticsToastBridge";
import KeyboardHandler from "@/components/native/KeyboardHandler";
import OfflineBanner from "@/components/native/OfflineBanner";
import PushNotifications from "@/components/native/PushNotifications";
import StatusBarThemeSync from "@/components/native/StatusBarThemeSync";

export const metadata: Metadata = {
  title: "Tutly",
  description:
    "Empowering students with state-of-the-art tools and resources for academic success.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`} suppressHydrationWarning>
      <head />
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <StatusBarThemeSync />
          <KeyboardHandler />
          <HapticsToastBridge />
          <OfflineBanner />
          <TRPCReactProvider>
            <AppLifecycle />
            <PushNotifications />
            <BadgeSync />
            <LayoutProvider>
              <NuqsAdapter>
                <Suspense fallback={null}>
                  <PageLoader />
                </Suspense>
                <Toaster />
                <Crisp />
                <Suspense fallback={null}>{children}</Suspense>
                <BiometricLock />
              </NuqsAdapter>
            </LayoutProvider>
          </TRPCReactProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
