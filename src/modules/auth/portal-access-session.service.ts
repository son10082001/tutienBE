import { prisma } from "../../lib/prisma.js";

let portalAccessSessionTableReady: boolean | undefined;

async function isPortalAccessSessionTablePresent(): Promise<boolean> {
  if (portalAccessSessionTableReady !== undefined) {
    return portalAccessSessionTableReady;
  }
  try {
    const rows = await prisma.$queryRaw<Array<{ cnt: bigint }>>`
      SELECT COUNT(*) AS cnt
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = 'portal_access_session'
    `;
    portalAccessSessionTableReady = Number(rows[0]?.cnt ?? 0) > 0;
    if (!portalAccessSessionTableReady) {
      console.warn(
        "[auth] Table portal_access_session is missing; access tokens are not tracked in DB until migration is applied.",
      );
    }
  } catch (err) {
    console.warn("[auth] Could not probe portal_access_session; skipping DB session tracking:", err);
    portalAccessSessionTableReady = false;
  }
  return portalAccessSessionTableReady;
}

/** Thu hồi mọi access session portal của user (web + game dùng chung). */
export async function revokeAllPortalAccessSessionsForUser(userId: string): Promise<void> {
  if (!(await isPortalAccessSessionTablePresent())) {
    return;
  }
  await prisma.portalAccessSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function createPortalAccessSession(userId: string, jti: string, expiresAt: Date): Promise<void> {
  if (!(await isPortalAccessSessionTablePresent())) {
    return;
  }
  await prisma.portalAccessSession.create({
    data: { jti, userId, expiresAt },
  });
}

export async function isPortalAccessSessionActive(jti: string, userId: string): Promise<boolean> {
  if (!(await isPortalAccessSessionTablePresent())) {
    return true;
  }
  const row = await prisma.portalAccessSession.findFirst({
    where: {
      jti,
      userId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  return !!row;
}
