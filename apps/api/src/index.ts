import { createLogger } from "@tutly/logger";

import { createServer } from "./server";

const logger = createLogger("api:server");
const port = process.env.PORT || 4242;
const server = createServer();

server.listen(port, () => {
  logger.info({ port }, "api running");
});
