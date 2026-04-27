"use client";

import { RiReactjsFill } from "react-icons/ri";
import { IoLogoHtml5 } from "react-icons/io5";
import Link from "next/link";

import PageLoader from "@/components/loader/PageLoader";
import { api } from "@/trpc/react";
import SandboxTemplates from "./_components/SandboxTemplates";

export default function PlaygroundsPage() {
  const q = api.featureFlags.isEnabled.useQuery({ key: "sandbox_templates" });
  if (q.isLoading) return <PageLoader />;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 sm:space-y-5">
      <div>
        <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
          Playgrounds
        </h1>
        <p className="text-muted-foreground text-sm">
          Run code experiments without leaving Tutly.
        </p>
      </div>

      {q.data ? (
        <div className="space-y-3">
          <h2 className="text-foreground text-base font-semibold sm:text-lg">
            Framework Templates
          </h2>
          <SandboxTemplates />
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-foreground text-base font-semibold sm:text-lg">
            Local Playgrounds
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href="/playgrounds/html-css-js"
              className="bg-card hover:border-primary/40 hover:bg-accent/30 group flex items-center gap-4 rounded-xl border p-4 shadow-sm transition-colors"
            >
              <div className="bg-orange-500/10 grid h-14 w-14 shrink-0 place-items-center rounded-xl">
                <IoLogoHtml5 className="h-8 w-8 text-orange-500" />
              </div>
              <div className="min-w-0">
                <h3 className="text-foreground text-sm font-semibold sm:text-base">
                  HTML / CSS / JS
                </h3>
                <p className="text-muted-foreground truncate text-xs sm:text-sm">
                  Playground for HTML, CSS and JavaScript.
                </p>
              </div>
            </Link>
            <Link
              href="/playgrounds/react"
              className="bg-card hover:border-primary/40 hover:bg-accent/30 group flex items-center gap-4 rounded-xl border p-4 shadow-sm transition-colors"
            >
              <div className="bg-sky-500/10 grid h-14 w-14 shrink-0 place-items-center rounded-xl">
                <RiReactjsFill className="h-8 w-8 text-sky-500" />
              </div>
              <div className="min-w-0">
                <h3 className="text-foreground text-sm font-semibold sm:text-base">
                  React.js
                </h3>
                <p className="text-muted-foreground truncate text-xs sm:text-sm">
                  Playground for React components.
                </p>
              </div>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
