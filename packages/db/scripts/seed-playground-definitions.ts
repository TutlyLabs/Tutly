/**
 * Seeds the initial set of PlaygroundDefinitions so the runner gallery
 * isn't empty after `prisma db push`.
 *
 * Re-running is safe: each row is upserted by slug.
 *
 * Usage:
 *   bun run packages/db/scripts/seed-playground-definitions.ts
 */

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../prisma/generated/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const REGISTRY = process.env.PLAYGROUND_IMAGE_PREFIX ?? "ghcr.io/tutlylabs";

const DEFS = [
  {
    slug: "node",
    name: "Node.js / Express",
    description:
      "Node 22 with npm, pnpm, and build tools. Good for Express, scripts, and JS-heavy tasks.",
    language: "node",
    category: "WEB" as const,
    dockerImage: `${REGISTRY}/playground-runner-node`,
    setupCommands: [
      "[ -f package.json ] || (npm init -y && npm install express)",
    ],
    exposedPorts: [3000, 5173],
    iconKey: "node",
  },
  {
    slug: "static-web",
    name: "Static web (Vite)",
    description: "Pre-installed Vite for quick HTML/CSS/TS prototyping.",
    language: "node",
    category: "WEB" as const,
    dockerImage: `${REGISTRY}/playground-runner-static-web`,
    setupCommands: [],
    exposedPorts: [5173],
    iconKey: "vite",
  },
  {
    slug: "python",
    name: "Python 3.12",
    description: "Python with pip + uv + pytest installed.",
    language: "python",
    category: "BACKEND" as const,
    dockerImage: `${REGISTRY}/playground-runner-python`,
    setupCommands: [],
    exposedPorts: [8000],
    iconKey: "python",
  },
  {
    slug: "cpp",
    name: "C / C++",
    description: "gcc 13, cmake, gdb, valgrind.",
    language: "cpp",
    category: "SYSTEMS" as const,
    dockerImage: `${REGISTRY}/playground-runner-cpp`,
    setupCommands: [],
    exposedPorts: [],
    iconKey: "cpp",
  },
  {
    slug: "java",
    name: "Java 21 (Temurin)",
    description: "OpenJDK 21 + Maven.",
    language: "java",
    category: "BACKEND" as const,
    dockerImage: `${REGISTRY}/playground-runner-java`,
    setupCommands: [],
    exposedPorts: [8080],
    iconKey: "java",
  },
  {
    slug: "sql-postgres",
    name: "PostgreSQL 16",
    description:
      "A running Postgres 16 instance plus a bash shell with psql. The database is named tutly_playground.",
    language: "sql",
    category: "DB" as const,
    dockerImage: `${REGISTRY}/playground-runner-postgres`,
    setupCommands: [],
    exposedPorts: [5432],
    iconKey: "postgres",
  },
  {
    slug: "sql-sqlite",
    name: "SQLite 3",
    description: "Lightweight SQL playground with sqlite3 CLI.",
    language: "sql",
    category: "DB" as const,
    dockerImage: `${REGISTRY}/playground-runner-sqlite`,
    setupCommands: [],
    exposedPorts: [],
    iconKey: "sqlite",
  },
];

async function main(): Promise<void> {
  for (const d of DEFS) {
    const result = await db.playgroundDefinition.upsert({
      where: { slug: d.slug },
      create: { ...d, isPublished: true },
      update: {
        name: d.name,
        description: d.description,
        language: d.language,
        category: d.category,
        dockerImage: d.dockerImage,
        setupCommands: d.setupCommands,
        exposedPorts: d.exposedPorts,
        iconKey: d.iconKey,
        isPublished: true,
      },
    });
    // eslint-disable-next-line no-console
    console.log("✓", result.slug, "->", result.id);
  }
  await db.$disconnect();
}

void main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
