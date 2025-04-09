import { writeFileSync } from "fs";
import { resolve } from "path";
import { generateOpenApiDocument } from "trpc-openapi";

import { appRouter } from "@tutly/api";

const openApiDocument = generateOpenApiDocument(appRouter, {
  title: "Tutly API",
  description: "OpenAPI compliant REST API for Tutly",
  version: "1.0.0",
  baseUrl: "http://localhost:3000/api",
  docsUrl: "https://docs.tutly.com",
  tags: [
    "assignments",
    "attachments",
    "attendance",
    "bookmarks",
    "classes",
    "coding-platforms",
    "courses",
    "doubts",
    "file-upload",
    "folders",
    "leaderboard",
    "holidays",
    "mentors",
    "notes",
    "notifications",
    "points",
    "report",
    "reset-password",
    "schedule",
    "statistics",
    "submissions",
    "users",
  ],
  securitySchemes: {
    bearerAuth: {
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
      description: "JWT Authorization header using the Bearer scheme",
    },
  },
});

// Write the OpenAPI document to the api-reference directory
const outputPath = resolve(__dirname, "../api-reference/openapi.json");
writeFileSync(outputPath, JSON.stringify(openApiDocument, null, 2));

console.log("OpenAPI specification generated successfully!");
