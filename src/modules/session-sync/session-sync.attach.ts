import type { IncomingMessage, Server as HttpServer } from "http";
import type { Socket } from "net";
import { WebSocketServer } from "ws";
import { sessionSyncHub } from "./session-sync.ws.js";

const WS_PATH = "/ws/session";

/**
 * Gắn WebSocket server cho đồng bộ phiên vào HTTP server Express sẵn có.
 * Dùng `noServer: true` + handle `upgrade` thủ công để chỉ nhận path `/ws/session`
 * (các path khác sẽ được để nguyên cho HTTP router xử lý).
 */
export function attachSessionSyncWs(server: HttpServer): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req: IncomingMessage, socket: Socket, head: Buffer) => {
    const url = req.url ?? "";
    const [pathname, search = ""] = url.split("?");
    if (pathname !== WS_PATH) {
      return;
    }

    const params = new URLSearchParams(search);
    const gid = params.get("gid");
    if (!gid) {
      socket.write("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\nmissing gid");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      sessionSyncHub.register(ws, gid);
    });
  });

  console.log(`[session-sync] WebSocket broker listening on ${WS_PATH}`);
}
