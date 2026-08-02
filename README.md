# 🪨 RockLogger
[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/petrockstudios)

Document the rocks you find and identify them with a trait-based field guide.

An **installable Android PWA** (Progressive Web App) — works offline, stores everything on-device, nothing is uploaded.

## Features

- **Rock journal** — log rocks with photo (camera or gallery), GPS location, date, notes, tags
- **Identification quiz** — answer 5 quick questions (hardness scratch tests, luster, weight, color, structure) and get ranked matches against a **74-entry field guide** (rocks & minerals with Mohs hardness, luster, streak, uses, and ID tips)
- **Field guide** — searchable catalog grouped by igneous / sedimentary / metamorphic / mineral
- **Offline-first** — IndexedDB storage + service worker caching; works with no signal
- **Backup** — export/import your whole collection (photos included) as JSON
- **Auto-suggestions** — rocks with logged traits show likely matches on their detail page

## Install on your Android phone

1. Run the dev server: `npm run dev` (or serve the built `dist/`)
2. Open the URL in **Chrome** on your phone
3. Tap the **⋮ menu → Add to Home screen** (or "Install app")
4. It installs like a native app — own icon, fullscreen, offline

> To get it into the Play Store later, wrap `dist/` with **Bubblewrap/TWA** or **Capacitor** on the desktop machine.

## Development

```bash
npm install
npm run dev          # dev server
npm run build        # typecheck + build to dist/
npm run test         # sanity checks (knowledge base + ID engine) + DOM integration tests
npm run icons        # regenerate app icons
```

## Tech

- Vite + TypeScript (vanilla, no framework — small and fast on mobile)
- IndexedDB via a small promise wrapper (`src/db.ts`)
- Trait-scoring identification engine (`src/identify.ts`) + curated knowledge base (`src/knowledge.ts`)
- Service worker + web manifest for installability

## Layout

```
src/
  main.ts         app shell, hash router, backup menu
  db.ts           IndexedDB layer
  knowledge.ts    74-entry rock & mineral field guide
  identify.ts     trait-scoring identification engine
  utils.ts        photo compression, geolocation, export, helpers
  views/          journal · add · detail · identify · guide
scripts/
  gen-icons.mjs   pure-Node PNG icon generator (no deps)
  sanity.ts       knowledge base + engine tests
  dom-test.ts     jsdom integration tests for the UI flows
```

## Roadmap

- [ ] Camera-based photo identification (vision API or on-device model)
- [ ] Streak-test step in the quiz
- [ ] Rock "wishlist" / find-list of rare specimens
- [ ] Map view of your finds
- [ ] Play Store wrapper (TWA/Capacitor)
