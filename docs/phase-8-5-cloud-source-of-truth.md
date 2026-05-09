# Phase 8.5: Cloud Source Of Truth

## Principle

After login, Firebase Firestore is the source of truth for finance data. The app no longer loads `localStorage` or seed/demo data as primary persistence. JSON import/export remains available for backup and migration.

`localStorage` helpers may remain in the codebase only as legacy/cache utilities. They must not decide the initial logged-in app data.

## Login Flow

1. User signs in with Firebase Auth.
2. `FinanceDataProvider` receives `user.uid`.
3. The provider loads Firestore data for that UID.
4. If cloud data exists, it replaces runtime state immediately.
5. If no cloud data exists, the provider creates empty normalized schema v2 data.
6. The main app appears after cloud load succeeds.
7. If cloud load fails, the app shows a Thai error with a retry button and does not silently fall back to seed data.

## Save Flow

1. User edits data in the app.
2. `useAutoFinanceSync` debounces the change.
3. The app saves normalized schema v2 data to Firestore.
4. Manual "บันทึกขึ้น Cloud" uses the same repository path and schema.

## Load Flow

Manual "โหลดจาก Cloud" reloads the current user's Firestore data and replaces runtime state. If no cloud data exists, the app keeps an empty normalized data set and shows that there is no cloud data yet.

## Import JSON Flow

1. User imports a JSON file.
2. The app normalizes the imported data.
3. Runtime state is replaced with the imported data.
4. The imported data is saved to Firestore for the current account immediately.

## Firestore Paths

The repository reads and writes these stable paths:

- `users/{uid}/meta/app`
- `users/{uid}/profile/main`
- `users/{uid}/settings/main`
- `users/{uid}/masters/main`
- `users/{uid}/transactions/{id}`
- `users/{uid}/recurringRules/{id}`
- `users/{uid}/installmentPlans/{id}`
- `users/{uid}/trips/{id}`
- `users/{uid}/budgets/{id}`
- `users/{uid}/goals/{id}`

## Cross-Device Regression Checklist

- Device A login.
- Add transaction.
- Wait for sync badge "บันทึกขึ้น Cloud แล้ว".
- Check Firestore `users/{uid}/transactions` has a doc.
- Logout.
- Device B or incognito login with the same account.
- App shows loading cloud.
- Transaction appears automatically.
- Add budget on Device B.
- Wait for cloud saved.
- Device A refresh/login.
- Budget appears.
- Delete transaction on Device A.
- Wait for cloud saved.
- Device B reload.
- Transaction is gone.
- No seed data appears unless cloud is empty.
- No local-only status appears.
