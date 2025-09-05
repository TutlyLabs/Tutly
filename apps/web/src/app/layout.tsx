import "@/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Suspense } from "react";

import { TRPCReactProvider } from "@/trpc/react";
import { ThemeProvider } from "@/providers/theme-provider";
import { LayoutProvider } from "@/providers/layout-provider";
import { Toaster } from "sonner";
import Crisp from "@/components/Crisp";
import PageLoader from "@/components/loader/PageLoader";

export const metadata: Metadata = {
  title: "Tutly",
  description:
    "Empowering students with state-of-the-art tools and resources for academic success.",
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
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
          <TRPCReactProvider>
            <LayoutProvider>
              <NuqsAdapter>
                <Suspense fallback={null}>
                  <PageLoader />
                </Suspense>
                <Toaster />
                <Crisp />
                {children}
              </NuqsAdapter>
            </LayoutProvider>
          </TRPCReactProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
