import { Command, flags } from "@oclif/command";

import { isAuthenticated, logout } from "../lib/auth/device";

export default class Logout extends Command {
  static description = "Log out from Tutly";

  static examples = ["<%= config.bin %> <%= command.id %>"];

  static flags = {
    help: flags.help({ char: "h" }),
  };

  async run() {
    const { flags } = await this.parse(Logout);

    try {
      if (!(await isAuthenticated())) {
        this.log("Not currently authenticated");
        return;
      }

      await logout();
      this.log("Successfully logged out!");
    } catch (error) {
      this.error(
        `Logout failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
