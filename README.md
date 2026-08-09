# HackQ

**The all-in-one command center for hackathon teams** — replace Discord, Miro, Trello, and a shared doc with one focused workspace. Built with Next.js, Supabase, and a heavy dose of motion design.

## What it does

- **Landing page** — motion-heavy marketing site (scroll-timeline reveals, parallax, liquid cursor, hosted hero video).
- **Authentication** — signup (display name + email + password) and login, email-verification flow, and a free **HaveIBeenPwned breach check** on every new password.
- **Team rooms** — create or join a team via invite code or a shareable room URL (`/room/night-owl`). Joining requires **lead approval**; non-members see only a private wall.
- **Workspace modules:**
  - **Chat** — realtime text + **voice notes** (in-browser recording, waveform bubbles, one-player-at-a-time).
  - **Idea board** — a FigJam-style infinite canvas: sticky notes, pan/zoom, live presence cursors, drag-to-move.
  - **Tasks** — Notion-style board with status, priority, assignees, and due dates.
  - **Mood check-ins** — one-tap team vibe radar with per-member history.
  - **Team & roles** — roster with live avatars, role badges, a permissions matrix, and a **custom-role studio** (create roles with per-capability toggles).
  - **Control centre** — room settings, live countdown ring, invite-code rotation, approvals, **ownership transfer**, leave, and disband.
  - **Profile settings** — edit display name/status and upload a profile picture (syncs retroactively across chat and the board).

## Tech stack

| Layer | Tech |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router, React 19, TypeScript strict) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com) |
| Motion | [Motion](https://motion.dev), [GSAP](https://gsap.com), [Lenis](https://lenis.darkroom.engineering), [Cobe](https://github.com/shuding/cobe) |
| Backend | [Supabase](https://supabase.com) — Postgres, Auth (email/password), Row-Level Security, Realtime |
| Components | [Magic UI](https://magicui.design) (DottedMap by [dillionverma](https://github.com/dillionverma) & [Yeom-JinHo](https://github.com/Yeom-JinHo)), [Aceternity UI](https://ui.aceternity.com)-style primitives |
| Fonts | Familjen Grotesk, Geist, JetBrains Mono (Fontsource variable) |
| Security API | [HaveIBeenPwned Pwned Passwords](https://haveibeenpwned.com/API/v3#PwnedPasswords) (k-anonymity range queries, no key required) |

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase values
npm run dev                  # http://localhost:3000
```

### Supabase setup

1. Create a project at [supabase.com](https://supabase.com) and copy `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` from **Project Settings → API** into `.env.local`.
2. Run the migrations in **numeric order** in the SQL editor (`supabase/migrations/`):

| Migration | What it sets up |
|---|---|
| `0001_init` | Schema + RLS policies + realtime (profiles, teams, members, join requests, messages, tasks, ideas, moods) |
| `0002_grant_privileges` | Table grants for the API roles |
| `0003_prevent_owner_leave` | Owner can't orphan the team by leaving |
| `0004_team_roles` | Custom roles with permission maps |
| `0005_room_slugs` | Per-room URL slugs (`/room/night-owl`) |
| `0006_transfer_ownership` | Owner-handover RPC |
| `0007_security_hardening` | Invite-code lockdown, capability-enforced RLS, lookup RPCs |
| `0008_security_hardening` | Function-execution lockdown (revokes + cleanup) |

3. In **Authentication → URL Configuration**: set Site URL to `http://localhost:3000`, add `http://localhost:3000/auth/callback` to Redirect URLs, and keep **email confirmation ON** (the signup flow relies on it).

## How the security works

- **RLS everywhere** — every table is locked to members; non-members can't read team data or invite codes.
- **Security-definer RPCs** — join-by-code, slug lookup, and team creation run server-side and return only the minimum fields (no invite-code enumeration).
- **Capability-based permissions** — tasks/ideas/chat/mood writes are enforced in SQL via a `team_can()` helper that understands built-in and custom roles, not just in the UI.
- **Approval-gated joins** — membership inserts are owner/manager-only; pending requests are hidden from regular members.
- **App hardening** — open-redirect guard, strict CSP + security headers, invite codes stripped from URLs after use, and a client-side HIBP breach check on signup.

## Project structure

```
src/
  app/                    # App Router — landing, auth pages, /room/[slug]
  components/
    auth/                 # Auth shell, forms, map background, strength meter
    room/                 # Chat, board, tasks, mood, team, control centre, shell
    ui/                   # DottedMap, bento grid, beams, noise texture, skeletons
  lib/
    room-config.ts        # Data layer (Supabase client + room logic)
    supabase/             # Client / server / middleware session handling
    pwned.ts              # HaveIBeenPwned k-anonymity check
supabase/migrations/      # 0001–0008 — schema + RLS + hardening
```

## Deployment

Host the frontend on **Vercel**:

1. Push this repo to GitHub, then **Import** it at [vercel.com/new](https://vercel.com/new).
2. Add the two env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in Project Settings.
3. Add your Vercel URL (and `https://<app>.vercel.app/auth/callback`) to **Authentication → URL Configuration** so email links work in production.
4. Deploy — pushes to `main` auto-deploy.

## Credits & resources

Everything used is intentionally open. Big thanks to:

- **Magic UI** — the DottedMap component (via [`svg-dotted-map`](https://www.npmjs.com/package/svg-dotted-map)), by [dillionverma](https://github.com/dillionverma) & [Yeom-JinHo](https://github.com/Yeom-JinHo)
- **Aceternity UI** — component ideas (bento grids, hover borders, beams)
- **Supabase** — Postgres, Auth, RLS, and Realtime
- **HaveIBeenPwned** — free Pwned Passwords breach database
- **Motion / GSAP / Lenis / Cobe / Tailwind / Fontsource** — the motion & design foundation

## License

MIT — use it, fork it,Built For a Hackathon.
