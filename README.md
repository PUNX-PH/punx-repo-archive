# Punx Repo Archive

Search GitHub repos, ask whether a repo for your idea already exists, and bookmark favorites into folders you can share. Next.js (App Router) on Vercel, Firebase Auth + Firestore for accounts, bookmarks, folders and shares.

The whole app is members-only: you must sign in with a verified `@punx.ai` Google account. Everything except the sign-in page redirects there, and the API routes return 401. This is enforced in `src/proxy.ts` (server), the API routes, and `firestore.rules` (database).

## Run locally

```bash
cp .env.example .env.local   # fill in the values
npm install
npm run dev
```

The Firebase values are required to sign in. The Ask box uses Claude when `ANTHROPIC_API_KEY` is set and falls back to plain search otherwise.

## Firebase setup

1. Authentication: enable the Google provider only. Add your Vercel domain under Settings > Authorized domains.
2. Firestore: create a database and publish the rules:

```bash
firebase.cmd deploy --only firestore:rules --project punx-repo-archive
```

The rules only allow verified `@punx.ai` Google accounts. Members can read and write only their own bookmarks and folders; a shared folder can be opened by any member with its link and changed only by its owner.

## Deploy

```bash
vercel deploy        # preview
vercel deploy --prod # production
```

Set the same env vars in the Vercel project. `NEXT_PUBLIC_FIREBASE_PROJECT_ID` must be set in production: the server uses it to check sign-in tokens, and without it nobody can get in.
