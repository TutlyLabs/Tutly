import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

async function migratePasswordsToAccounts() {
  console.log("🚀 Starting password migration to accounts...");

  try {
    // Find all users with passwords
    const usersWithPasswords = await prisma.user.findMany({
      where: {
        password: {
          not: null,
        },
      },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
      },
    });

    console.log(`📊 Found ${usersWithPasswords.length} users with passwords`);

    if (usersWithPasswords.length === 0) {
      console.log("✅ No users with passwords found. Migration complete!");
      return;
    }

    let migratedCount = 0;
    let skippedCount = 0;

    for (const user of usersWithPasswords) {
      try {
        // Check if account already exists for this user
        const existingAccount = await prisma.account.findFirst({
          where: {
            userId: user.id,
            providerId: "credential",
          },
        });

        if (existingAccount) {
          console.log(
            `⏭️  Skipping user ${user.email} - credential account already exists`,
          );
          skippedCount++;
          continue;
        }

        // Create new account for credential authentication
        await prisma.account.create({
          data: {
            id: randomUUID(),
            accountId: user.id, // Use user ID as account ID for credentials
            providerId: "credential", // Provider identifier
            userId: user.id,
            password: user.password, // Store the password hash
          },
        });

        console.log(`✅ Migrated user: ${user.email} (${user.name})`);
        migratedCount++;
      } catch (error) {
        console.error(`❌ Error migrating user ${user.email}:`, error);
      }
    }

    console.log("\n📈 Migration Summary:");
    console.log(`✅ Successfully migrated: ${migratedCount} users`);
    console.log(`⏭️  Skipped (already exists): ${skippedCount} users`);
    console.log(`📊 Total processed: ${usersWithPasswords.length} users`);

    //  Remove password field from User table after migration
    // console.log("\n🧹 Cleaning up User table...");
    // await prisma.user.updateMany({
    //   where: {
    //     password: {
    //       not: null,
    //     },
    //   },
    //   data: {
    //     password: null,
    //   },
    // });
    // console.log("✅ Removed password field from User table");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migratePasswordsToAccounts()
  .then(() => {
    console.log("🎉 Migration completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Migration failed:", error);
    process.exit(1);
  });

export { migratePasswordsToAccounts };
