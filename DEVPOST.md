# HackQ — Devpost Submission Package

Complete copy-paste-ready submission for the Devpost form. The story is written in first-person team voice and reveals all resources used.

---

## One-line tagline

> **HackQ — the all-in-one command center for hackathon teams.** Chat, ideas, tasks, and team management in one realtime workspace, so you can replace Discord + Miro + Trello + a shared doc with a single tab.

---

## Project Story (paste into the "About the project" box)

# HackQ: One Command Center for Hackathon Chaos

## Inspiration

Every hackathon, the pattern repeats: your team is spread across **four or five tabs** — Discord for chat, Miro for ideas, Trello for tasks, a shared doc for deadlines, and yet another app to know who's doing what. The countdown to submission is ticking, and someone always misses a message. We wanted to ask: *what if a hackathon team had one place — one beautifully focused workspace — where the chat, the idea board, the task board, the deadline, and the team itself all lived together?*

So we built **HackQ**: a realtime command center designed specifically for the 24–48 hours of a hackathon. Dark, motion-heavy, and built to feel premium — because the tool you stare at during the final hours should make you *want* to keep working.

## What it does

- **Landing page** with a liquid cursor, scroll-driven reveals, and a hosted hero video.
- **Auth** — signup/login with email verification, plus a built-in **breach check**: every new password is tested against HaveIBeenPwned's 5-billion-password database before the account is created.
- **Rooms** — create or join a team via a shareable invite code or a clean URL (`/room/night-owl`). Joining requires **lead approval**; non-members only ever see a private wall.
- **Workspace modules:**
  - **Chat** — realtime text and **voice notes** (recorded in-browser, rendered as waveform bubbles).
  - **Idea board** — a FigJam-style infinite canvas with pan/zoom, sticky notes, and live presence cursors.
  - **Tasks** — a Notion-style board with status, priority, assignees, and due dates.
  - **Mood check-ins** — one-tap team vibe radar.
  - **Team & roles** — live roster, permissions matrix, and a **custom-role studio** with per-capability toggles.
  - **Control centre** — live countdown ring, settings, approvals, **ownership transfer**, leave, and disband.
- A **rooms dashboard** after login — if you're in multiple teams, you pick where you're headed instead of getting dumped into the last room.

## How we built it

**Architecture.** Next.js 16 (App Router) + TypeScript on the front, Supabase on the back: PostgreSQL with **Row-Level Security on every table**, Supabase Auth for sessions, and Supabase Realtime for live updates. The whole data layer sits behind security-definer RPCs and RLS policies shipped as eight versioned migrations (`0001` schema → `0008` function lockdown).

**Design system.** A matte-black, noise-textured aesthetic with animated beams, custom-built on Tailwind 4 with Motion, GSAP, and Lenis. The dotted-map background is the open-source Magic UI DottedMap component — we extended and hardened it for our theme.

**The security journey was the most interesting build.** We audit-tested the app like attackers:

- **Invite-code enumeration:** any signed-in user could read every team's invite codes through the REST API. Fixed by restricting `teams` SELECT to members and moving all lookups into security-definer RPCs that return only the minimum fields.
- **Membership bypass:** anyone could insert themselves into any team they knew the id of. We removed the self-insert path entirely — membership now *requires* lead approval, enforced in SQL.
- **Open redirects:** `?next=` parameters were sanitized with a same-origin guard.
- **Capability enforcement:** custom-role permissions are enforced server-side with a `team_can()` RLS helper, not just hidden in the UI.
- **A Pro-plan paywall:** Supabase's "leaked password protection" is paid — so we built the same check for free using HaveIBeenPwned's k-anonymity API. The password is SHA-1-hashed and only **5 hex characters** are ever sent:

$$\text{prefix} = H(\text{password})[:5], \qquad |\text{prefix}| = 20 \text{ bits}$$

The full hash is matched locally against the returned suffixes — the password never leaves the browser, and the whole check costs nothing.

## Challenges we ran into

- **RLS is a trap if you don't know the rules.** We learned that revoking `EXECUTE` on a helper function used *inside* RLS policies breaks every query in the app — and that security-definer functions are exposed as public RPC endpoints by default. Both cost us real debugging time.
- **Hydration mismatches.** The liquid cursor and the login-error state were client-only, so React's server HTML disagreed with the first client paint. Fixing it properly (mount gates + server-rendered search-param state) taught us a lot about SSR.
- **Voice-note playback.** Reusing one `<audio>` element across notes hit a classic Chromium footgun — assigning `src` without `load()` left the element in a stale state where `play()` resolved but nothing was heard. We now reset + `load()` explicitly and wait for `canplaythrough`.
- **Performance on cheap laptops.** The full-viewport goo filter re-rasterized on every pointer move; the dotted map re-rendered 5,000 dots per frame. We added device-performance fallbacks, froze the map, and debounced realtime refetches so bursts don't re-download history.
- **Ownership transfer.** A plain `UPDATE teams SET owner_id = …` is rejected by RLS because `WITH CHECK` re-evaluates on the *new* row — so the handover runs in a security-definer RPC that verifies the rules itself, atomically.

## Accomplishments that we're proud of

- A genuinely **security-hardened** realtime app — RLS everywhere, zero known attack surface left open after a full audit.
- A **free replacement for a paid security feature** (breach checking) done the privacy-first way.
- The **idea board**: realtime presence cursors, FigJam-style dragging, and container-query-aware layout.
- **Voice notes** with in-browser recording and waveform rendering — no backend audio processing needed.
- A design that made a hackathon tool feel like a premium product, from the liquid cursor to the countdown ring with its honest "seconds hand."

## What we learned

Next.js App Router and React 19 server/client boundaries; Supabase RLS, security-definer functions, and Realtime; motion design that stays performant; the k-anonymity trick for privacy-preserving APIs; and — most of all — that **security is a feature you build in, not bolt on**. Every `EXECUTE` grant, every policy expression, and every URL parameter deserves scrutiny.

## What's next for HackQ

Onboarding with **team-size and event presets**, calendar sync for submission deadlines, task-to-idea linking, and push notifications for approvals. Long-term: make HackQ the default first tab for every hackathon team.

---

## Built with (tags — pick up to 25)

`Next.js` `React` `TypeScript` `JavaScript` `Tailwind CSS` `CSS3` `HTML5` `Supabase` `PostgreSQL` `Row-Level Security` `Supabase Auth` `Realtime` `REST API` `WebSockets` `Vercel` `Motion` `GSAP` `Web Audio API` `MediaRecorder API` `Canvas` `SVG` `HaveIBeenPwned` `Git` `GitHub`

## Try-it-out links

- **Code:** `https://github.com/namanstudiox/HackQ`
- **Live demo:** your Vercel URL once deployed (or leave the dev-server link for now)
- **Video demo:** record a 60–90s walkthrough — landing → signup → create room → chat + voice note → idea board → tasks → team/roles → countdown. (The cloudfront hero video is a background loop, not a demo.)

## Media suggestions (9 shots, 3:2 ratio)

1. Landing hero
2. Auth page (dotted-map background)
3. Rooms dashboard
4. Chat with a voice note
5. Idea board with notes + presence cursors
6. Tasks board
7. Mood radar
8. Team / roles matrix
9. Control centre countdown
