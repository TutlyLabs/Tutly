import { readFileSync } from "fs";
import { join } from "path";
import { Hook } from "@oclif/config";

const hook: Hook<"init"> = async function (options) {
  if (
    options.id === "update" ||
    options.id === "help" ||
    options.id === "version"
  ) {
    return;
  }

  try {
    const { default: updateNotifier } = await import("update-notifier");

    const pkg = JSON.parse(
      readFileSync(join(__dirname, "../../../package.json"), "utf8"),
    );

    const notifier = updateNotifier({
      pkg,
      updateCheckInterval: 1000 * 60 * 60, // 1 hour
    });

    if (notifier.update) {
      const { latest, current, type } = notifier.update;

      if (type !== "latest") {
        // Clear screen
        console.clear();

        console.log("\n");
        console.log(
          `\x1b[33mUpdate available\x1b[0m \x1b[90m${current}\x1b[0m → \x1b[32m${latest}\x1b[0m`,
        );
        console.log(`Run \x1b[36mnpm install -g tutly\x1b[0m to update`);
        console.log("\n");

        // Force exit
        process.exit(1);
      }
    }
  } catch (error) {
    // Fail silently if update check fails
  }
};

export default hook;
