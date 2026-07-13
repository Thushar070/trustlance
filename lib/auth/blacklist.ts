// Simple in-memory Set to store blacklisted token JTIs (session invalidation on sign-out).
// In a distributed/production environment, this should be backed by Redis or a DB table.
const blacklist = new Set<string>();

export const TokenBlacklist = {
  blacklist(jti: string) {
    if (jti) {
      blacklist.add(jti);
    }
  },
  isBlacklisted(jti: string): boolean {
    if (!jti) return false;
    return blacklist.has(jti);
  },
  clear() {
    blacklist.clear();
  }
};
