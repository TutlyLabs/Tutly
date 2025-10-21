import { Command, flags } from "@oclif/command";

import { getCurrentUser, isAuthenticated } from "../lib/auth/device";

export default class Whoami extends Command {
  static description = "Show current user information";

  static examples = ["<%= config.bin %> <%= command.id %>"];

  static flags = {
    help: flags.help({ char: "h" }),
    json: flags.boolean({ char: "j", description: "Output as JSON" }),
  };

  async run() {
    const { flags } = await this.parse(Whoami);

    try {
      if (!(await isAuthenticated())) {
        this.log("❌ Not authenticated. Run 'tutly login' first.");
        this.exit(1);
      }

      const user = await getCurrentUser();
      if (!user) {
        this.log("❌ Unable to fetch user information");
        this.exit(1);
      }

      if (flags.json) {
        this.log(JSON.stringify(user, null, 2));
      } else {
        this.log(`\n👤 Logged in as: ${user.name}`);
        this.log(`📧 Email: ${user.email}`);
        this.log(`🆔 Username: ${user.username}`);
        this.log(`🔑 User ID: ${user.id}\n`);
      }
    } catch (error) {
      this.error(
        `❌ Failed to get user information: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
