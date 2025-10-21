import { Command, flags } from "@oclif/command";

import { isAuthenticated, login } from "../lib/auth/device";

export default class Login extends Command {
  static description = "Authenticate with Tutly using your username and password";

  static examples = ["<%= config.bin %> <%= command.id %>"];

  static flags = {
    help: flags.help({ char: "h" }),
  };

  async run() {
    await this.parse(Login);

    try {
      // Check if already authenticated
      if (await isAuthenticated()) {
        this.log("✓ Already authenticated!");
        this.log("Use 'tutly whoami' to see your user information.");
        return;
      }

      this.log("🔐 Authenticating with Tutly...\n");
      await login();
      this.log("\n✓ Successfully authenticated!");
      this.log("Use 'tutly whoami' to see your user information.");
    } catch (error) {
      this.error(
        `❌ Authentication failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
