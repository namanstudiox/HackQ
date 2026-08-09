import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { aiConfigured, transcribeAudio, planFromTranscript, AiError } from "@/lib/ai";

/**
 * WhisperFlow-style voice-note analysis: transcribe the note's audio, have the
 * LLM shape it into a structured plan (title / summary / steps), and store it
 * on `voice_plans` (one per note, replaced on re-analysis). The caller must be
 * a member with chat permission; everything runs under their session + RLS.
 */
export async function POST(req: Request) {
  let body: { teamId?: string; messageId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { teamId, messageId } = body;
  if (!teamId || !messageId) {
    return NextResponse.json({ error: "Missing team or message." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to analyze voice notes." }, { status: 401 });
  }
  if (!aiConfigured()) {
    return NextResponse.json(
      { error: "Voice analysis isn't configured yet — add FEATHERLESS_API_KEY." },
      { status: 503 }
    );
  }

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

  const { data: msg } = await supabase
    .from("messages")
    .select("id, team_id, voice")
    .eq("id", messageId)
    .eq("team_id", teamId)
    .maybeSingle();
  const voice = msg?.voice as string | undefined;
  if (!voice || !voice.startsWith("data:")) {
    return NextResponse.json(
      { error: "That message isn't a voice note." },
      { status: 400 }
    );
  }

  // data:audio/webm;base64,<payload>
  const comma = voice.indexOf(",");
  const mime = /^data:([^;]+);/.exec(voice)?.[1] ?? "audio/webm";
  const raw = voice.slice(comma + 1);
  // The recorder enforces a 60s max client-side; enforce a generous server cap
  // so a crafted oversized "voice" blob can't force an expensive base64 decode
  // + upstream transcription (memory/CPU DoS). ~1MB base64 is a long recording;
  // 8MB leaves huge margin while stopping the megabyte-bomb abuse.
  if (raw.length > 8_000_000) {
    return NextResponse.json(
      { error: "That voice note is too large to analyze." },
      { status: 413 }
    );
  }
  const bytes = new Uint8Array(Buffer.from(raw, "base64"));
  if (!bytes.length) {
    return NextResponse.json({ error: "That voice note is empty." }, { status: 400 });
  }

  const { data: team } = await supabase
    .from("teams")
    .select("group_name")
    .eq("id", teamId)
    .maybeSingle();

  try {
    const transcript = await transcribeAudio(bytes, mime);
    const plan = await planFromTranscript(transcript, (team?.group_name as string) ?? "the team");

    const { error } = await supabase.from("voice_plans").upsert(
      {
        message_id: messageId,
        team_id: teamId,
        transcript,
        plan: plan as unknown as Record<string, unknown>,
        created_by: user.id,
      },
      { onConflict: "message_id" }
    );
    if (error) {
      return NextResponse.json(
        { error: `Couldn't save the plan: ${error.message}` },
        { status: 500 }
      );
    }
    return NextResponse.json({ transcript, plan });
  } catch (err) {
    const msg = err instanceof AiError ? err.message : "Voice analysis failed — try again.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
