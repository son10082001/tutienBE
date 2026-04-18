/** Parse giá trị kiểu `15m`, `7d`, `3600s` thành milliseconds. */
export function parseJwtExpiresInMs(expiresIn: string): number {
  const s = expiresIn.trim();
  const m = /^(\d+)([smhd])$/i.exec(s);
  if (!m) return 15 * 60 * 1000;
  const n = Number(m[1]);
  const u = m[2].toLowerCase();
  const mult = u === "s" ? 1000 : u === "m" ? 60_000 : u === "h" ? 3_600_000 : 86_400_000;
  return n * mult;
}
