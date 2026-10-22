# Punx Repo Archive

Search GitHub repos, ask whether a repo for your idea already exists, and bookmark favorites into lists. Next.js (App Router) on Vercel, Firebase Auth + Firestore for accounts and synced bookmarks.

Signed out, bookmarks are kept in the browser (localStorage) and merged into your account when you sign in. The Profile page can export/import them as JSON.

## Run locally

```bash
cp .env.example .env.local   # fill in the values
npm install
npm run dev
```

Search works with no keys. Accounts need the Firebase values; the Ask box uses Claude when `ANTHROPIC_API_KEY` is set and falls back to plain search otherwise.

## Firebase setup

1. Authentication: enable Google and Email/Password. Add your Vercel domain under Settings > Authorized domains.
2. Firestore: create a database and publish `firestore.rules` (users can only touch `users/{uid}/bookmarks/*`).

## Deploy

```bash
vercel deploy        # preview
vercel deploy --prod # production
```

Set the same env vars in the Vercel project.
