# GitHub Pages Deploy Checklist

## Before Push

- Run `npm run lint`.
- Run `npm run build`.
- Confirm `.env.local` and `.env.*.local` are ignored.
- Do not commit real Firebase values.
- If `.env.local` was already tracked, run:

```bash
git rm --cached .env.local
```

## GitHub Pages

- Push to `main`.
- In GitHub repo Settings > Pages, set Source to GitHub Actions.
- Confirm the workflow deploys `dist`.

## GitHub Actions Variables

Add these repository variables:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

## Firebase

- Firebase Auth authorized domains:
  - `localhost`
  - `YOUR_USERNAME.github.io`
- Firestore rules should allow each user to access only their own path:
  - `users/{uid}/...`

## Manual Test After Deploy

- Open the deployed page.
- Register or login.
- Add a transaction.
- Wait for autosave.
- Refresh and confirm data can load.
- Logout and login again.
- Load cloud data manually.
- Export JSON.
- Import JSON locally only.
- Import JSON and cloud save.
