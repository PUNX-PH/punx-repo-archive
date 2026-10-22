# Punx Repo Archive

Search GitHub repos, ask whether a repo for your idea already exists, and bookmark favorites into lists. Next.js (App Router) on Vercel, Firebase Auth + Firestore for accounts and bookmarks.

## Run locally

```bash
cp .env.example .env.local   # fill in the values
npm install
npm run dev
```

Search works with no keys. Accounts/bookmarks need the Firebase values; the Ask box uses Claude when `ANTHROPIC_API_KEY` is set and falls back to plain search otherwise.

## Firebase setup

1. Create a project, add a Web app, copy its config into `.env.local`.
2. Authentication: enable Google and Email/Password.
3. Firestore: create a database and publish `firestore.rules` (users can only touch `users/{uid}/bookmarks/*`).

## Deploy

Import the repo in Vercel, add the same env vars (Production + Preview), and add the Vercel domain under Firebase Auth > Settings > Authorized domains.
