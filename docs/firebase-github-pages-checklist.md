# Firebase + GitHub Pages Checklist

## Firebase Auth

- Enable Email/Password sign-in in Firebase Authentication.
- Add authorized domains:
  - `localhost`
  - `YOUR_USERNAME.github.io`

## GitHub Actions Environment Variables

Add these repository secrets or environment variables for the Vite build:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Never commit `.env.local` or real Firebase values. Keep only `.env.example` in source control.

## Firestore Rules Sample

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

## Manual Tests

- Register with email/password.
- Login with email/password.
- Reset password.
- Save to cloud from More.
- Load from cloud from More.
- Edit a transaction and confirm autosave after the debounce delay.
- Confirm conflict resolution:
  - Use cloud.
  - Keep local and upload.
  - Merge if safe.
- Logout and login again.
- Refresh after a successful cloud save and confirm data can load.
- Import JSON locally only.
- Import JSON and cloud save.
