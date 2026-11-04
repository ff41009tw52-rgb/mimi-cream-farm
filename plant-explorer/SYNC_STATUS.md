# Google Drive shared sync repair — v4

## Code changes

Canonical deployment source: `drive-receiver.gs`. Keep the original Apps Script project and deployment URL. `DriveReceiver.gs` is historical source and must not be pasted alongside the canonical file.

- Read both `FOLDER_ID` and `PLANT_RECEIVER_FOLDER_ID`, plus matching app root folders. No existing work is moved or overwritten.
- Recognize both receipt markers (`收件完成.json` and `收件完成.txt`), summary filenames (`觀察紀錄.json` and `*_觀察紀錄.json`), and real image files under each submission.
- Recover the two user-identified older receipts even if their old metadata lacks the new recipient field.
- Disk-backed status replaces cache-only success. Gallery and photo queries use the same index; successful uploads invalidate it. Empty results are not cached.
- Public responses use a field allowlist. Names, classes, seats, emails, Drive IDs and raw filenames are not public fields.
- Map merges cloud records with unsynced local records by receipt, groups matching coordinates, and opens every record at the location.
- A failed refresh preserves the previous snapshot. Photos have retry controls. Visible pages refresh on network restore, page visibility and periodic updates.

## Verification performed

- `node plant-explorer/sync.test.cjs`: PASS. Mock Drive coverage for both historical formats, old-photo discovery, two root properties, durable receipts, privacy, read-only recovery, duplicate roots and idempotent upload.
- `NODE_PATH=<directory containing linkedom> node plant-explorer/gallery.test.cjs`: PASS. Two independent mocked DOMs verify common cloud records/photos, local/cloud deduplication, grouped map counts and failed-refresh retention.
- Public production endpoint checked before changes: gallery returned 0 records and 2 receiver folders; receipt `ab063e17-d843-477a-b512-6296058fb510` returned `sent:true`.

## Not yet verified

The school-account login request timed out and the browser session was lost. This repair has NOT been applied to the live Apps Script deployment. Owner-only Drive audit, recovery of actual existing photos, and updates to the existing deployment remain pending school-account access.

The two DOM tests are unit/regression tests, NOT two real browser sessions. Cross-device upload/readback, anonymous/mobile/tablet/offline end-to-end checks and test-data cleanup have NOT passed acceptance. No new test work was created in the school Drive during this repair, and no existing work was deleted.

## Owner-only audit

After owner sign-in is restored, run `auditPlantData` in the editor before deploying. It logs every discovered revision, source folder, image filename/ID and byte count privately in the execution log. Confirm both user-specified receipts have real image files. Preserve original deployment identity when selecting a new version in Manage deployments; do not create a new receiving root or new URL.
