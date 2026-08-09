import type { Metadata } from "next";
import "@fontsource-variable/geist";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign in — HackQ",
  description: "Sign in to HackQ — the realtime command center for hackathon teams.",
};

export default function LoginPage() {
  return <LoginForm />;
}
