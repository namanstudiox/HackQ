/* Server-only Featherless helpers — never import from client components. */

const BASE_URL = process.env.FEATHERLESS_BASE_URL ?? "https://api.featherless.ai/v1";
const API_KEY = process.env.FEATHERLESS_API_KEY ?? "";

/** Chat model — small enough for a single concurrent unit, sharp enough for planning. */
export const AI_CHAT_MODEL = process.env.FEATHERLESS_MODEL ?? "Qwen/Qwen3-8B";
/** ASR model for voice notes. */
export const AI_ASR_MODEL =
  process.env.FEATHERLESS_ASR_MODEL ?? "openai/whisper-large-v3-turbo";

export function aiConfigured(): boolean {
  return Boolean(API_KEY);
}

export class AiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiError";
  }
}

async function post(path: string, init: RequestInit & { body: BodyInit }): Promise<Response> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      ...(init.headers ?? {}),
    },
    // Cap hangs so a flaky upstream can't wedge a member's chat for minutes.
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new AiError(
      `Featherless returned ${res.status}${detail ? `: ${detail.slice(0, 160)}` : ""}`
    );
  }
  return res;
}

/** Non-streaming chat completion → the assistant's reply text. */
export async function chatCompletion(system: string, user: string): Promise<string> {
  const res = await post("/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "HTTP-Referer": "https://hackq.app",
      "X-Title": "HackQ",
    },
    body: JSON.stringify({
      model: AI_CHAT_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.7,
      max_tokens: 900,
    }),
  });
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new AiError("The model returned an empty response.");
  return text;
}

/** Transcribe a voice note via the OpenAI-compatible audio endpoint. */
export async function transcribeAudio(bytes: Uint8Array, mime: string): Promise<string> {
  const ext = mime === "audio/mp4" ? "m4a" : mime === "audio/mpeg" ? "mp3" : "webm";
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(bytes)], { type: mime }), `voice.${ext}`);
  form.append("model", AI_ASR_MODEL);
  const res = await post("/audio/transcriptions", { method: "POST", body: form });
  const json = (await res.json()) as { text?: string };
  const text = json.text?.trim();
  if (!text) throw new AiError("The transcriber returned no text.");
  return text;
}

export interface VoicePlan {
  title: string;
  summary: string;
  steps: string[];
}

/** Turn a voice-note transcript into a structured plan (title, summary, steps). */
export async function planFromTranscript(
  transcript: string,
  teamName: string
): Promise<VoicePlan> {
  const system = [
    "You turn a hackathon teammate's voice-note transcript into a crisp action plan.",
    `The team is "${teamName}".`,
    "Reply with ONLY valid JSON, no markdown fences:",
    '{"title":"short imperative title","summary":"one or two sentences","steps":["first actionable step","…","4-7 steps max"]}',
  ].join("\n");
  const text = await chatCompletion(system, `Transcript:\n${transcript}`);
  try {
    const parsed = JSON.parse(text) as VoicePlan;
    if (!parsed.title || !Array.isArray(parsed.steps)) throw new Error("bad shape");
    return {
      title: String(parsed.title).slice(0, 120),
      summary: String(parsed.summary ?? "").slice(0, 500),
      steps: parsed.steps
        .map((s) => String(s).slice(0, 200))
        .filter(Boolean)
        .slice(0, 8),
    };
  } catch {
    throw new AiError("The model didn't return a valid plan — try again.");
  }
}
