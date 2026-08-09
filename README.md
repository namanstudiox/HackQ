# HackQ

The all-in-one command center for hackathon teams. Replace Discord, Miro, Trello, and GitHub with a single focused workspace.

This repository contains the HackQ marketing landing page — a single-page, motion-heavy site built with the Next.js App Router.

## Tech Stack

- **[Next.js 16](https://nextjs.org)** — App Router, React Server Components
- **React 19** with the modern compiler-enabled `"use client"` sections
- **TypeScript** (strict mode)
- **[Tailwind CSS 4](https://tailwindcss.com)** — utility-first styling
- **Motion** — component-level animations and transitions
- **GSAP** — scroll-driven timelines
- **Lenis** — buttery smooth scrolling
- **Cobe** — canvas globe for the hero
- **Fontsource variable fonts** — Familjen Grotesk (landing), Geist (auth), JetBrains Mono (mono accents)

## Getting Started

```bash
# install dependencies
npm install

# start the dev server at http://localhost:3000
npm run dev

# production build
npm run build

# run the production build locally
npm run start

# lint with ESLint
npm run lint
```

## Project Structure

```
src/
  app/            # App Router entry (layout, page, global styles)
  components/     # Section and UI components
    ui/           # Reusable primitives (bento grid, globe, noise texture)
  lib/            # Shared helpers (smooth-scroll, utils)
```

## Contributing

This is a work-in-progress project. Fork the repo, make your changes, and open a pull request.
