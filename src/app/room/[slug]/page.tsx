import type { Metadata } from "next";
import RoomShell from "@/components/room/RoomShell";

export const metadata: Metadata = {
  title: "Room — HackQ",
  description:
    "The realtime command center for your hackathon team. One room, one loop, 48 hours.",
};

export default async function RoomSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <RoomShell slug={slug} />;
}
