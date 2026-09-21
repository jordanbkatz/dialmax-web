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

For deployment, add your hosting domain to Firebase Auth's authorized domains
and publish `firestore.rules`.
