import { WebSocket } from "ws";

/**
 * Broker in-memory cho đồng bộ phiên portal ↔ game qua WebSocket.
 *
 * Mirror mô hình của Firebase Realtime Database ở `FirebaseSync`:
 *   groups/{gid}/sessions/{userId}  → retained session data
 *   groups/{gid}/broadcast/latest_login → retained broadcast data
 *
 * Mọi client phải supply `gid` (deviceGroupId) khi connect — trạng thái được
 * cô lập theo gid để mỗi cặp Portal-Game không leak sang nhau.
 *
 * State chỉ lưu trong bộ nhớ (reset khi restart). Không bền vững — phù hợp
 * single-instance. Multi-instance cần chuyển qua Redis pub/sub.
 */

export type SessionData = {
  status?: string;
  platform?: string;
  timestamp?: number;
  credentials?: {
    userId?: string;
    password?: string;
  };
};

export type BroadcastData = {
  userId?: string;
  password?: string;
  platform?: string;
  timestamp?: number;
  sessionId?: string;
};

type ClientCtx = {
  ws: WebSocket;
  gid: string;
  subscribedUserId: string | null;
  alive: boolean;
};

type GidState = {
  sessions: Map<string, SessionData>;
  broadcast: BroadcastData | null;
  clients: Set<ClientCtx>;
  // Dấu thời gian của lần report_logout gần nhất trong gid. Được dùng để
  // "khoá" auto-login cross-origin (portal ↔ game) khi 1 bên logout nhưng
  // bên kia vẫn giữ credentials trong localStorage và sẽ mở tab mới sau
  // đó. Mỗi client khi subscribe sẽ nhận `revoked` nếu cờ còn, rồi tự dọn
  // credentials. Reset về null khi có `report_login` mới.
  revokedAt: number | null;
};

type InboundMsg =
  | { type: "subscribe"; userId?: string }
  | { type: "unsubscribe" }
  | { type: "report_login"; userId: string; password: string; platform: string }
  | { type: "report_logout"; userId: string; platform: string }
  | { type: "report_broadcast"; userId: string; password: string; platform: string }
  | { type: "clear_broadcast" }
  | { type: "ping" };

type OutboundMsg =
  | { type: "session"; userId: string; data: SessionData | null }
  | { type: "broadcast"; data: BroadcastData | null }
  | { type: "revoked"; at: number; platform?: string }
  | { type: "pong" }
  | { type: "error"; message: string };

const HEARTBEAT_INTERVAL_MS = 30000;

export class SessionSyncHub {
  private gidStates = new Map<string, GidState>();
  private heartbeatTimer: NodeJS.Timeout | null = null;

  public register(ws: WebSocket, gid: string): void {
    const state = this.getOrCreateGid(gid);
    const ctx: ClientCtx = { ws, gid, subscribedUserId: null, alive: true };
    state.clients.add(ctx);

    ws.on("pong", () => {
      ctx.alive = true;
    });

    ws.on("message", (raw) => {
      this.handleMessage(ctx, raw.toString());
    });

    ws.on("close", () => {
      this.dropClient(ctx);
    });

    ws.on("error", () => {
      this.dropClient(ctx);
    });

    this.ensureHeartbeat();
  }

  private getOrCreateGid(gid: string): GidState {
    let state = this.gidStates.get(gid);
    if (!state) {
      state = {
        sessions: new Map<string, SessionData>(),
        broadcast: null,
        clients: new Set<ClientCtx>(),
        revokedAt: null,
      };
      this.gidStates.set(gid, state);
    }
    return state;
  }

  private dropClient(ctx: ClientCtx): void {
    const state = this.gidStates.get(ctx.gid);
    if (!state) {
      return;
    }
    state.clients.delete(ctx);
    if (
      state.clients.size === 0 &&
      state.sessions.size === 0 &&
      state.broadcast == null &&
      state.revokedAt == null
    ) {
      this.gidStates.delete(ctx.gid);
    }
  }

  private handleMessage(ctx: ClientCtx, raw: string): void {
    let msg: InboundMsg;
    try {
      msg = JSON.parse(raw) as InboundMsg;
    } catch {
      this.send(ctx, { type: "error", message: "invalid json" });
      return;
    }
    if (!msg || typeof (msg as { type?: unknown }).type !== "string") {
      this.send(ctx, { type: "error", message: "missing type" });
      return;
    }

    const state = this.getOrCreateGid(ctx.gid);

    switch (msg.type) {
      case "subscribe": {
        const uid = msg.userId ? String(msg.userId) : null;
        ctx.subscribedUserId = uid;
        if (uid) {
          const sessionData = state.sessions.get(uid) ?? null;
          // Chỉ echo snapshot session khi trạng thái còn active (online).
          // Retained `offline` là dữ liệu lịch sử (phiên đã logout trước đó)
          // — nếu gửi lại cho client vừa subscribe sẽ bị hiểu nhầm là
          // signal logout mới và có thể trigger redirect về login ngay sau
          // khi vừa đăng nhập xong. Signal logout thực vẫn được phát qua
          // `fanoutSession` tại thời điểm report_logout.
          if (sessionData && sessionData.status === "online") {
            this.send(ctx, { type: "session", userId: uid, data: sessionData });
          }
        }
        this.send(ctx, { type: "broadcast", data: state.broadcast });
        // Nếu trước đó gid đã có report_logout, gửi cờ revoked cho client
        // vừa subscribe để nó dọn credentials local (cross-origin storage
        // không thể xoá trực tiếp từ phía kia).
        if (state.revokedAt != null) {
          this.send(ctx, { type: "revoked", at: state.revokedAt });
        }
        break;
      }
      case "unsubscribe": {
        ctx.subscribedUserId = null;
        break;
      }
      case "report_login": {
        if (!msg.userId) {
          this.send(ctx, { type: "error", message: "report_login requires userId" });
          break;
        }
        const uid = String(msg.userId);
        const ts = Date.now();
        const session: SessionData = {
          status: "online",
          platform: String(msg.platform ?? ""),
          timestamp: ts,
          credentials: { userId: uid, password: String(msg.password ?? "") },
        };
        state.sessions.set(uid, session);
        const broadcast: BroadcastData = {
          userId: uid,
          password: String(msg.password ?? ""),
          platform: String(msg.platform ?? ""),
          timestamp: ts,
          sessionId: `${ts}-${Math.random().toString(36).slice(2, 8)}`,
        };
        state.broadcast = broadcast;
        // Login mới → reset cờ revoked để lần đăng nhập kế tiếp không bị
        // lẫn với trạng thái đã logout trước đó.
        state.revokedAt = null;
        this.fanoutSession(state, ctx, uid, session);
        this.fanoutBroadcast(state, ctx, broadcast);
        break;
      }
      case "report_logout": {
        if (!msg.userId) {
          this.send(ctx, { type: "error", message: "report_logout requires userId" });
          break;
        }
        const uid = String(msg.userId);
        const ts = Date.now();
        const session: SessionData = {
          status: "offline",
          platform: String(msg.platform ?? ""),
          timestamp: ts,
        };
        state.sessions.set(uid, session);
        state.broadcast = null;
        state.revokedAt = ts;
        this.fanoutSession(state, ctx, uid, session);
        this.fanoutBroadcast(state, ctx, null);
        // Fanout cờ revoked cho tất cả client (bao gồm sender) để đa tab
        // cùng origin cũng đồng bộ đá phiên. Client tự dedupe theo `at`.
        this.fanoutRevoked(state, ts, String(msg.platform ?? ""));
        break;
      }
      case "report_broadcast": {
        if (!msg.userId) {
          this.send(ctx, { type: "error", message: "report_broadcast requires userId" });
          break;
        }
        const ts = Date.now();
        const broadcast: BroadcastData = {
          userId: String(msg.userId),
          password: String(msg.password ?? ""),
          platform: String(msg.platform ?? ""),
          timestamp: ts,
          sessionId: `${ts}-${Math.random().toString(36).slice(2, 8)}`,
        };
        state.broadcast = broadcast;
        this.fanoutBroadcast(state, ctx, broadcast);
        break;
      }
      case "clear_broadcast": {
        state.broadcast = null;
        this.fanoutBroadcast(state, ctx, null);
        break;
      }
      case "ping": {
        this.send(ctx, { type: "pong" });
        break;
      }
      default: {
        this.send(ctx, { type: "error", message: `unknown type: ${(msg as { type: string }).type}` });
      }
    }
  }

  private fanoutSession(
    state: GidState,
    sender: ClientCtx,
    userId: string,
    data: SessionData | null
  ): void {
    const payload: OutboundMsg = { type: "session", userId, data };
    for (const client of state.clients) {
      if (client === sender) continue;
      if (client.subscribedUserId && client.subscribedUserId !== userId) continue;
      this.send(client, payload);
    }
  }

  private fanoutBroadcast(state: GidState, sender: ClientCtx, data: BroadcastData | null): void {
    const payload: OutboundMsg = { type: "broadcast", data };
    for (const client of state.clients) {
      if (client === sender) continue;
      this.send(client, payload);
    }
  }

  private fanoutRevoked(state: GidState, at: number, platform: string): void {
    const payload: OutboundMsg = { type: "revoked", at, platform };
    for (const client of state.clients) {
      this.send(client, payload);
    }
  }

  private send(ctx: ClientCtx, msg: OutboundMsg): void {
    if (ctx.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    try {
      ctx.ws.send(JSON.stringify(msg));
    } catch {
      // ignore send errors
    }
  }

  private ensureHeartbeat(): void {
    if (this.heartbeatTimer) return;
    this.heartbeatTimer = setInterval(() => {
      for (const state of this.gidStates.values()) {
        for (const client of state.clients) {
          if (!client.alive) {
            try {
              client.ws.terminate();
            } catch {
              // ignore
            }
            this.dropClient(client);
            continue;
          }
          client.alive = false;
          try {
            client.ws.ping();
          } catch {
            // ignore
          }
        }
      }
    }, HEARTBEAT_INTERVAL_MS);
    this.heartbeatTimer.unref?.();
  }

  public getStatsSummary(): { gids: number; clients: number } {
    let clients = 0;
    for (const s of this.gidStates.values()) {
      clients += s.clients.size;
    }
    return { gids: this.gidStates.size, clients };
  }
}

export const sessionSyncHub = new SessionSyncHub();
