import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
