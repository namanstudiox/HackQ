import type { Metadata } from "next";
import "@fontsource-variable/jetbrains-mono";
import RoomShell from "@/components/room/RoomShell";

export const metadata: Metadata = {
  title: "Room — HackQ",
  description:
    "The realtime command center for your hackathon team. One room, one loop, 48 hours.",
};

export default function RoomPage() {
  return <RoomShell />;
}
