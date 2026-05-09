# Phase 6.2 Regression Checklist

Use this checklist before starting Firebase/Firestore sync work. The canonical schema v2 arrays are `transactions`, `recurringRules`, `installmentPlans`, `trips`, `budgets`, and `goals`. Legacy aliases such as `entries` and `installments` are compatibility mirrors only.

## Data Integrity

- Confirm localStorage uses `finance-tracker:data:v2`.
- Confirm exported JSON includes only clean schema v2 data and no UI-only state.
- Confirm importing a partial legacy-shaped JSON normalizes missing arrays to empty arrays.
- Confirm browser refresh preserves transactions, installment plans, trips, budgets, and goals.
- Confirm deleting a trip removes only that trip and its `scope: "trip"` budget records.
- Confirm monthly budgets and trip budgets do not overwrite each other.

## Monthly Ledger

- Add, edit, and delete a manual expense.
- Toggle a manual expense paid/unpaid.
- Confirm Monthly includes manual transactions.
- Confirm Monthly includes readonly installment-derived rows.
- Confirm Monthly includes readonly trip item-derived rows.
- Confirm linked rows show clear source labels: Manual, Installment, or Trip.
- Confirm linked installment/trip rows cannot be edited or deleted from the Monthly transaction modal.
- Confirm filters still work for month, search keyword, type, and payment status.

## Installments

- Add an installment plan with category, monthly amount, total months, paid months, principal, remaining override, due day, interest type, interest rate, and note.
- Edit the installment plan and confirm the changed fields persist.
- Delete the installment plan.
- Toggle a paid month.
- Confirm the matching readonly Monthly installment row updates paid/unpaid status.
- Confirm list/calendar view and filters work for keyword, status, start month, end month, and sort order.

## Trips

- Add a trip with name, destination, budget, start date, end date, and note.
- Edit and delete a trip.
- Add, edit, and delete a trip item.
- Link a trip item to an installment plan when installment plans exist.
- Toggle a trip item paid/unpaid.
- Confirm the matching readonly Monthly trip row updates paid/unpaid status.
- Add, edit, and delete a trip budget line.
- Confirm the Trip plan tab shows planned vs actual by category.
- Confirm budget line status changes between safe, near limit, and over budget.
- Confirm trip filters work for keyword, year, month, category, and status.

## Budget And Goals

- Add, edit, and delete a monthly budget.
- Confirm duplicate monthly budgets are blocked for the same month and category.
- Confirm monthly budget usage includes manual plus readonly installment/trip expenses.
- Add, edit, and delete a goal.
- Update a goal current amount.
- Confirm completed goal state appears when current amount reaches the target.

## Import And Export

- Export JSON from More.
- Clear localStorage for `finance-tracker:data:v2`.
- Import the exported JSON.
- Confirm manual transactions, installment plans, trips, trip budget lines, monthly budgets, and goals reappear.
- Confirm derived Monthly installment and trip rows reappear after import.
- Refresh the browser and confirm the imported data persists.

## Build Gates

- Run `npm run lint`.
- Run `npm run build`.
- Confirm no Firebase or Firestore implementation was added in this phase.
