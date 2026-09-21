# Dialmax (web)

Mobile-first cold-calling app. Upload leads, work a call queue, and log each
call's result with follow-ups and notes.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- Firebase (Auth + Firestore) — no custom server

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
```

Other commands:

```bash
npm run build    # typecheck + production build
npm run lint     # oxlint
npm run preview  # preview the production build
```

## How it works

- Sign in with Google. All data is scoped to `users/{uid}` and protected by
  `firestore.rules` (owner-only access).
- **Upload** leads from a CSV or paste text (`Name, Phone, Company` headers recommended).
  Map columns, star the ones that should always show on a card, and import.
  Leads can also be added and edited manually.
- **Queue** shows new leads; **Callbacks** shows leads with a scheduled callback;
  **Logged** shows completed calls.
- **Dial** works one lead at a time with a tap-to-call (`tel:`) button, then log
  the result: **Positive** (optional callback, meeting, email follow-up),
  **Callback** (required date & time), or **Negative** — plus notes.
- Dynamic lead fields and their importance/order are configured per user in
  `users/{uid}/settings/leadFields`.

## Configuration

Firebase web config lives in `src/firebase.ts` (project `dialmax-fabc1`).

## Deploying to Cloudflare Pages

This app is a static SPA, so it deploys to Cloudflare Pages with no server code.

**Git-connected build settings** (repository root is this `web/` folder):

| Setting | Value |
| --- | --- |
| Root directory | `/` (default) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | `22` (pinned in `.node-version`) |

**Direct upload via Wrangler:**

```bash
npm run build
npx wrangler pages deploy dist --project-name <your-pages-project>
```

**Included config files:**

- `public/_redirects` — SPA fallback (`/* /index.html 200`)
- `public/_headers` — immutable caching for `/assets/*`, no-cache for
  `index.html`, and basic security headers
- `.node-version` — pins Node 22 for the Pages build image

**Required after the first deploy:** add the assigned domain
(`<project>.pages.dev`, plus any custom domain) to Firebase Auth's
**Authorized domains** list, otherwise Google sign-in fails.

