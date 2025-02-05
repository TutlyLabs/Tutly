import readline from "readline";
import { sql } from "drizzle-orm";

import { db } from "@tutly/db/client";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askQuestion = (question: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase());
    });
  });
};

const main = async () => {
  console.log(
    "\x1b[31m%s\x1b[0m",
    "⚠️  WARNING: This will reset the entire database!",
  );

  const firstConfirm = await askQuestion(
    "Are you sure you want to continue? (yes/no): ",
  );
  if (firstConfirm !== "yes") {
    console.log("Operation cancelled.");
    rl.close();
    return;
  }

  const secondConfirm = await askQuestion(
    "Please confirm one more time by typing 'yes': ",
  );
  if (secondConfirm !== "yes") {
    console.log("Operation cancelled.");
    rl.close();
    return;
  }

  console.log("Resetting database...");
  await db.execute(sql`drop schema if exists public cascade`);
  await db.execute(sql`create schema public`);
  await db.execute(sql`drop schema if exists drizzle cascade`);
  console.log("Database reset complete.");

  rl.close();
};

main().catch((error) => {
  console.error("Error:", error);
  rl.close();
  process.exit(1);
});
