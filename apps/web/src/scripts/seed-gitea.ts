import { db } from "@/lib/db";

const prisma = db;

async function main() {
  try {
    console.log("Starting...");

    console.log("✅  completed successfully");
  } catch (error) {
    console.error(" failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
