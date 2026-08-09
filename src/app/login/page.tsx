import type { Metadata } from "next";
import "@fontsource-variable/geist";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign in — HackQ",
  description: "Sign in to HackQ — the realtime command center for hackathon teams.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // /auth/callback redirects here with ?error=verification when a verification
  // or recovery link failed to exchange — surfaced as a server-rendered prop so
  // the error message is present in both the SSR HTML and the client (no
  // hydration mismatch from a client-only URL read).
  const { error } = await searchParams;
  return <LoginForm verificationFailed={error === "verification"} />;
}
