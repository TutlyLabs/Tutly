import { log } from "@tutly/logger";

import { createServer } from "./server";

const port = process.env.PORT || 4242;
const server = createServer();

server.listen(port, () => {
  log(`api running on ${port}`);
});
