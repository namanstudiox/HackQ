/**
 * Free HaveIBeenPwned "Pwned Passwords" check — the same breach database
 * Supabase's paid "Leaked password protection" feature queries.
 *
 * Uses the k-anonymity range endpoint: the password is SHA-1-hashed and only
 * the FIRST 5 hex characters are sent to HIBP; the full hash is matched
 * locally against the returned suffix list. The password itself never leaves
 * the browser, and the API needs no key.
 *
 * Deliberately fail-open: any error (network, API down, no crypto.subtle in
 * a non-secure context) returns `false` so signups are never blocked by an
 * availability issue. This is a UI-level guard — a determined attacker can
 * bypass it (Supabase's paid toggle is the server-enforced version).
 */
export async function isPwnedPassword(password: string): Promise<boolean> {
  if (typeof crypto === "undefined" || !crypto.subtle) return false;

  // Bound the request — fail-open covers errors but not an indefinitely
  // hanging fetch, which would otherwise wedge the submit button.
  const ctrl = new AbortController();
  const timeout = window.setTimeout(() => ctrl.abort(), 4000);

  try {
    const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(password));
    const hash = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();

    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);

    // "Add-Padding" makes every response the same size — extra privacy for
    // the range query, at no cost.
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true" },
      signal: ctrl.signal,
    });
    if (!res.ok) return false;

    const body = await res.text();
    // Each line is "SUFFIX:OCCURRENCE_COUNT" — match the full suffix locally.
    // Split on \r?\n so LF-only responses work too (a CRLF-only split would
    // silently only ever check the first line).
    return body.split(/\r?\n/).some((line) => line.split(":")[0] === suffix);
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeout);
  }
}
