import http from "http";
import { env } from "./config/env.js";
import { app } from "./app.js";
import { attachSessionSyncWs } from "./modules/session-sync/session-sync.attach.js";

const server = http.createServer(app);
attachSessionSyncWs(server);

server.listen(env.PORT, () => {
  console.log(`tutien-be is running at http://localhost:${env.PORT}`);
});
