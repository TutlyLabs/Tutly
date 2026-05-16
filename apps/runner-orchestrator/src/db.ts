import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@tutly/db/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const db = new PrismaClient({ adapter });
