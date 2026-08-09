/** @type {import('next').NextConfig} */

// Build the CSP connect-src from the Supabase project (REST + realtime wss).
// Falls back to a permissive-but-safe default if the env var is missing.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseHost = supabaseUrl.replace(/^https?:\/\//, "");

const contentSecurityPolicy = [
  "default-src 'self'",
  // Next.js streams the RSC payload in inline scripts and Turbopack uses eval
  // in dev — a nonce-based CSP is the right follow-up for production.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  // data: covers voice notes stored as data URLs; blob: covers object URLs.
  "media-src 'self' data: blob: https:",
  "font-src 'self' data:",
  // ws: keeps Turbopack HMR (dev) happy in strict browsers.
  supabaseHost
    ? `connect-src 'self' data: blob: https: wss: ws: https://${supabaseHost} wss://${supabaseHost}`
    : "connect-src 'self' data: blob: https: wss: ws:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // Clickjacking: deny embedding entirely.
  "frame-ancestors 'none'",
  "worker-src 'self' blob:",
].join("; ");

const nextConfig = {
  turbopack: {
    // Pin the project root explicitly — otherwise Turbopack walks up from cwd
    // looking for a lockfile and grabs the stray /home/<user>/package-lock.json
    // (outside this Git repo), which it then has to ignore.
    root: import.meta.dirname,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=(), payment=(), usb=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
