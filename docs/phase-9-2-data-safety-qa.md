# Phase 9.2 Data Safety QA

Use this checklist for the JSON import backup-before-overwrite flow.

| Scenario | Result | Notes |
| --- | --- | --- |
| Confirmed import downloads `finance-backup-before-import-YYYY-MM-DD-HH-mm-ss.json` before overwriting data |  |  |
| Backup JSON opens and can be imported again through the normal preview flow |  |  |
| Large data drop warning still appears before confirm |  |  |
| Cancel import does not create a backup download |  |  |
| Failed import preview does not overwrite Cloud data |  |  |
| Confirmed import applies imported data and saves it to Cloud |  |  |
| Normal Export JSON still downloads a schema v2 file |  |  |
| Manual Save to Cloud still works after import |  |  |
| Manual Load from Cloud still works after import |  |  |
