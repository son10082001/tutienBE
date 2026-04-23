import WebSocket from "ws";

const GID = "smoke-gid-" + Date.now();
const URL = `wss://localhost:4000/ws/session?gid=${GID}`;

function makeClient(name) {
  const ws = new WebSocket(URL);
  const received = [];
  ws.on("message", (raw) => {
    const msg = JSON.parse(raw.toString());
    received.push(msg);
    console.log(`[${name}] <-`, msg);
  });
  return new Promise((resolve) => {
    ws.on("open", () => {
      console.log(`[${name}] connected`);
      resolve({ ws, received });
    });
  });
}

function send(ws, msg) {
  ws.send(JSON.stringify(msg));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const portal = await makeClient("portal");
  const game = await makeClient("game");

  send(portal.ws, { type: "subscribe", userId: "user42" });
  send(game.ws, { type: "subscribe", userId: "user42" });
  await sleep(200);

  console.log("\n--- game report_login ---");
  send(game.ws, {
    type: "report_login",
    userId: "user42",
    password: "secret",
    platform: "game",
  });
  await sleep(200);

  console.log("\n--- portal report_logout ---");
  send(portal.ws, { type: "report_logout", userId: "user42", platform: "portal" });
  await sleep(200);

  console.log("\n--- late-joiner subscribe (must receive retained `revoked`) ---");
  const late = await makeClient("late");
  send(late.ws, { type: "subscribe", userId: "user42" });
  await sleep(200);

  console.log("\n--- portal report_broadcast ---");
  send(portal.ws, {
    type: "report_broadcast",
    userId: "user7",
    password: "pw",
    platform: "portal",
  });
  await sleep(200);

  console.log("\n--- report_login resets revoked flag ---");
  const later = await makeClient("later");
  // Trước khi có login mới, late/later vẫn nên thấy revoked.
  send(game.ws, {
    type: "report_login",
    userId: "user42",
    password: "secret",
    platform: "game",
  });
  await sleep(200);
  const afterLogin = await makeClient("afterLogin");
  send(afterLogin.ws, { type: "subscribe", userId: "user42" });
  await sleep(200);

  portal.ws.close();
  game.ws.close();
  late.ws.close();
  later.ws.close();
  afterLogin.ws.close();

  const portalGotSession = portal.received.some(
    (m) => m.type === "session" && m.data && m.data.status === "online"
  );
  const gameGotLogoutSession = game.received.some(
    (m) => m.type === "session" && m.data && m.data.status === "offline"
  );
  const portalGotRevokedFanout = portal.received.some(
    (m) => m.type === "revoked" && typeof m.at === "number"
  );
  const lateGotRevoked = late.received.some(
    (m) => m.type === "revoked" && typeof m.at === "number"
  );
  const gameGotBroadcast = game.received.some(
    (m) => m.type === "broadcast" && m.data && m.data.userId === "user7"
  );
  const afterLoginNoRevoked = afterLogin.received.every(
    (m) => m.type !== "revoked"
  );

  console.log("\n=== RESULT ===");
  console.log("portal got online session from game:", portalGotSession);
  console.log("game got offline session from portal:", gameGotLogoutSession);
  console.log("portal got revoked fanout from its own logout:", portalGotRevokedFanout);
  console.log("late joiner got retained revoked:", lateGotRevoked);
  console.log("game got broadcast from portal:", gameGotBroadcast);
  console.log("afterLogin (joined after report_login) got NO revoked:", afterLoginNoRevoked);

  if (
    portalGotSession &&
    gameGotLogoutSession &&
    portalGotRevokedFanout &&
    lateGotRevoked &&
    gameGotBroadcast &&
    afterLoginNoRevoked
  ) {
    console.log("ALL CHECKS PASSED");
    process.exit(0);
  } else {
    console.log("SOME CHECKS FAILED");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
