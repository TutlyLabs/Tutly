"use client";

import Link from "next/link";

import PageLoader from "@/components/loader/PageLoader";
import { api } from "@/trpc/react";

const CATEGORY_LABEL: Record<string, string> = {
  WEB: "Web",
  BACKEND: "Backend",
  SYSTEMS: "Systems",
  DATA: "Data Science",
  DB: "Databases",
  OTHER: "Other",
};

export default function RunnerGalleryPage() {
  const q = api.playground.definitions.list.useQuery();
  if (q.isLoading) return <PageLoader />;
  const defs = q.data ?? [];

  const byCategory = defs.reduce<Record<string, typeof defs>>((acc, d) => {
    (acc[d.category] ??= []).push(d);
    return acc;
  }, {});

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div>
        <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
          Runner playgrounds
        </h1>
        <p className="text-muted-foreground text-sm">
          Pick a stack. Tutly will give you one <code>docker run</code> command
          to start an isolated dev environment on your own machine.
        </p>
      </div>

      {Object.keys(byCategory).length === 0 && (
        <p className="text-muted-foreground text-sm">
          No playgrounds available yet. Ask your instructor to publish one.
        </p>
      )}

      {Object.entries(byCategory).map(([cat, items]) => (
        <section key={cat} className="space-y-3">
          <h2 className="text-foreground text-base font-semibold sm:text-lg">
            {CATEGORY_LABEL[cat] ?? cat}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((d) => (
              <Link
                key={d.id}
                href={`/playgrounds/runner/${d.slug}`}
                className="bg-card hover:border-primary/40 hover:bg-accent/30 group flex flex-col gap-2 rounded-xl border p-4 shadow-sm transition-colors"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-foreground text-sm font-semibold sm:text-base">
                    {d.name}
                  </h3>
                  <span className="text-muted-foreground bg-accent/40 rounded-md px-2 py-0.5 text-xs">
                    {d.language}
                  </span>
                </div>
                {d.description && (
                  <p className="text-muted-foreground line-clamp-2 text-xs sm:text-sm">
                    {d.description}
                  </p>
                )}
                <p className="text-muted-foreground/80 mt-1 font-mono text-[10px]">
                  {d.dockerImage}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
