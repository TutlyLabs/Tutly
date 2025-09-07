import { Command, flags } from "@oclif/command";

import { isAuthenticated, login } from "../lib/auth/device";

export default class Login extends Command {
  static description = "Authenticate with Tutly";

  static examples = ["<%= config.bin %> <%= command.id %>"];

  static flags = {
    help: flags.help({ char: "h" }),
  };

  async run() {
    const { flags } = await this.parse(Login);

    try {
      // Check if already authenticated
      if (await isAuthenticated()) {
        this.log("Already authenticated!");
        return;
      }

      this.log("Starting authentication...");
      await login();
      this.log("Successfully authenticated!");
    } catch (error) {
      this.error(
        `Authentication failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
