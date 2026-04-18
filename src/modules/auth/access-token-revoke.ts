/** Thu hồi access JWT trong bộ nhớ (single-node). Sau logout, /auth/me trả 401. */
const revokedAccessTokens = new Set<string>();
const MAX_REVOKED = 8000;

export function revokeAccessToken(token: string): void {
  if (!token) return;
  revokedAccessTokens.add(token);
  while (revokedAccessTokens.size > MAX_REVOKED) {
    const first = revokedAccessTokens.values().next().value as string | undefined;
    if (first === undefined) break;
    revokedAccessTokens.delete(first);
  }
}

export function isAccessTokenRevoked(token: string): boolean {
  return revokedAccessTokens.has(token);
}
