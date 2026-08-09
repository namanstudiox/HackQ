import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { aiConfigured, chatCompletion, AiError } from "@/lib/ai";

/**
 * The HackQ teammate. Runs as the requesting member (session cookies → RLS),
 * grounds the reply in the room's recent chat, and saves the reply as an 'ai'
 * message under the caller's auth id — the same path a human message takes.
 */
export async function POST(req: Request) {
  let body: { teamId?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const teamId = body.teamId;
  const message = body.message?.trim();
  if (!teamId || !message) {
    return NextResponse.json({ error: "Missing team or message." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to use the AI teammate." }, { status: 401 });
  }
  if (!aiConfigured()) {
    return NextResponse.json(
      { error: "The AI teammate isn't configured yet — add FEATHERLESS_API_KEY." },
      { status: 503 }
    );
  }

  // Same capability gate the messages RLS policy enforces.
  const { data: canChat } = await supabase.rpc("team_can", {
    p_team: teamId,
    p_cap: "chat",
  });
  if (canChat !== true) {
    return NextResponse.json(
      { error: "Your role can't chat in this room." },
      { status: 403 }
    );
  }

  // Grounding context: room name + the most recent text messages.
  const [{ data: team }, { data: recent }] = await Promise.all([
    supabase.from("teams").select("group_name").eq("id", teamId).maybeSingle(),
    supabase
      .from("messages")
      .select("kind, text, created_at")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);
  const groupName = (team?.group_name as string | undefined) ?? "your team";
  const excerpt = (recent ?? [])
    .slice()
    .reverse()
    .filter((r) => (r.kind as string) !== "ai" && r.text)
    .slice(-8)
    .map((r) => (r.text as string).slice(0, 300))
    .join("\n");

  const system = [
    `You are HackQ, the AI teammate embedded in a hackathon team's workspace chat. Team: "${groupName}".`,
    "You see a snippet of the team's recent chat to ground your answers.",
    "Be concise, practical, and a little motivating. Plain text with short lines or bullet lists — no headings, no markdown tables.",
    "Don't invent facts about the team; if you don't know, say so and suggest a next step.",
  ].join("\n");
  const prompt = excerpt ? `Recent chat:\n${excerpt}\n\n---\n\n${message}` : message;

  try {
    const reply = await chatCompletion(system, prompt);
    const { data: saved, error } = await supabase
      .from("messages")
      .insert({ team_id: teamId, author_id: user.id, text: reply, kind: "ai" })
      .select("id, author_id, text, voice, voice_duration, kind, created_at")
      .single();
    if (error || !saved) {
      return NextResponse.json(
        { error: `Couldn't save the reply: ${error?.message ?? "unknown error"}` },
        { status: 500 }
      );
    }
    return NextResponse.json({ message: saved });
  } catch (err) {
    const msg = err instanceof AiError ? err.message : "The AI teammate hit an error — try again.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
