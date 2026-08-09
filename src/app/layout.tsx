import type { Metadata, Viewport } from "next";
import "@fontsource-variable/familjen-grotesk";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: "HackQ — Build at the Speed of Thought",
  description:
    "HackQ — the all-in-one command center for hackathon teams. Replace Discord, Miro, Trello, and GitHub with a single focused workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
