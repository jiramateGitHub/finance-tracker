# Phase 8.4 Regression Checklist

Use this checklist before deploying or changing Firebase sync behavior.

## Auth

- Login succeeds with a valid email/password.
- Login with a wrong password shows a Thai error message.
- Reset password sends the reset email and shows a Thai success message.
- Logout returns to the login screen.
- Refresh keeps the correct auth state.

## Cloud Sync

- Add a transaction and confirm autosave runs after the debounce delay.
- Edit a transaction and confirm autosave updates Cloud.
- Delete a transaction and confirm the stale Firestore document is removed after save.
- Refresh after save and confirm the same data remains.
- Login as the same user in another browser/profile and load Cloud data.
- Conflict panel appears only when cache/device data and Cloud data differ.
- Use Cloud, keep this device data, and merge actions show clear Thai wording.

## Import / Export

- Export JSON and confirm `schemaVersion` is `2`.
- Import valid JSON and confirm it syncs to Cloud by default.
- Import invalid JSON and confirm a Thai error message appears.
- Import old or partial data and confirm it normalizes safely.
- Import preview/cache mode stays temporary and does not present itself as the source of truth.

## Monthly

- Quick add works for income and expense examples.
- Add, edit, and delete a manual transaction.
- Toggle paid/unpaid for a manual expense.
- Filter by month, keyword, type, and status.
- Action Needed panel shows unpaid rows, budget alerts, goal alerts, and sync issues.
- Recent and frequent panels use manual transactions only.

## Budget / Goal

- Add, edit, and delete a monthly budget.
- Duplicate budget guard blocks the same month/category.
- Budget cards show safe, near-limit, and over-budget states.
- Add, edit, and delete a goal.
- Update current amount and confirm progress/status updates.

## Installments

- Add, edit, and delete an installment plan.
- Switch list/calendar view.
- Mark a month paid/unpaid.
- Monthly ledger shows the derived installment row as readonly.

## Trips

- Add, edit, and delete a trip.
- Add, edit, and delete a trip item.
- Add, edit, and delete a trip budget line.
- Plan tab shows planned vs actual by category.
- Monthly ledger shows the derived trip row as readonly.

## Responsive

- Desktop `1920x1080` has readable app width and balanced cards.
- Mobile `402x874` has no horizontal scroll.
- Modal footer is reachable on mobile.
- Bottom nav does not cover modal controls.
- Combobox is usable inside modals and filter cards.

## Deploy

- Run `npm run lint`.
- Run `npm run build`.
- Run `npm run preview`.
- GitHub Pages workflow has all `VITE_FIREBASE_*` variables.
- Firebase Authorized Domains include `localhost` and the GitHub Pages domain.
- Firestore rules block cross-user access under `users/{uid}/...`.
