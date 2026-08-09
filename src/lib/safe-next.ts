/**
 * Defends against open redirects: `?next=` (and friends) may only point at
 * same-origin, root-relative paths. Protocol-relative URLs (`//evil.com`),
 * absolute URLs (`https://evil.com`), and backslash tricks (`/\evil.com`) all
 * fall back to the default target. Used everywhere we redirect a user based
 * on a query param — client (LoginForm) and server (/auth/callback).
 */
export function safeRedirectPath(
  raw: string | null | undefined,
  fallback = "/room"
): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/")) return fallback;
  // `//` is a protocol-relative URL; `/\` slips past some parsers as an
  // absolute path. Backslashes anywhere are treated as hostile too.
  if (raw.startsWith("//") || raw.startsWith("/\\") || raw.includes("\\")) {
    return fallback;
  }
  return raw;
}
