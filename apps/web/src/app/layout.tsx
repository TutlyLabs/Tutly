import "@/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Suspense } from "react";
import { getOrgFromHost } from "@/lib/domain";

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

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const domainData = await getOrgFromHost();

  // If the domain is totally invalid (not a system domain and no active organization found)
  if (domainData.status === "invalid") {
    return (
      <html lang="en" className={`${geist.variable}`} suppressHydrationWarning>
        <head />
        <body>
          <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
            <h1 className="mb-2 text-4xl font-bold">404 - Not Found</h1>
            <p className="text-muted-foreground mb-4">
              The organization domain you are looking for does not exist or is
              inactive.
            </p>
            <a
              href={`https://learn.tutly.in`}
              className="text-primary hover:underline"
            >
              Return to Tutly
            </a>
          </div>
        </body>
      </html>
    );
  }

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
