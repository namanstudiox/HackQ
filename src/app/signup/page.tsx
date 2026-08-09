import type { Metadata } from "next";
import "@fontsource-variable/geist";
import SignupForm from "@/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "Create your account — HackQ",
  description:
    "Join HackQ — the all-in-one command center for hackathon teams. Free for hackathons, set up in seconds, no card required.",
};

export default function SignupPage() {
  return <SignupForm />;
}
