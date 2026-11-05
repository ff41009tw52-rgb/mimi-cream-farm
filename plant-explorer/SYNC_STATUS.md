# Google Drive sync repair — deployed verification

Last verification: 2026-11-05 (Asia/Taipei client date).

## Deployment

- Canonical Apps Script source: `drive-receiver.gs`. The historical `DriveReceiver.gs` must not be pasted alongside it.
- Updated the existing school-owned Apps Script deployment to version 5. Kept the original project, URL, executing account and existing anonymous access setting.
- Initial gallery repair: `e464432b13f15114208ea18d31922dc8f19d124d`. The subsequent upload repair below supersedes its uploader; current asset versions are `enhancements.js?v=8` and `shared-gallery.js?v=10`.

## Changes

- Disk-backed receipts, compatible old summary/marker formats, deduplicated common gallery/photo index and owner-only diagnostics.
- Only plant observation fields and image bytes are exposed. No public Drive file IDs, student identity fields, edit or delete routes.
- Gallery and map share the same cloud data. Grouped location markers open all plant photos/features at that location.
- Failed refreshes retain the prior snapshot. Authoritative successful empty snapshots remove teacher-deleted rows instead of resurrecting them from cache.
- Fixed cached photos remaining blank when new cards were created before insertion into the document. Verified search rerender and map dialog after the repair.

## Actual production checks

- Uploaded two clearly named test observations through the production photo chooser/form, both with a real JPEG and five core feature selections.
- Confirmed both named folders in the school Google Drive and confirmed success receipts.
- A separate Python HTTP client with no Google credentials/cookie jar read both cloud records and photos. Each returned JPEG was 126,338 bytes and exactly matched the corresponding uploaded compressed JPEG.
- Resent one identical submission through the anonymous endpoint. Cloud total stayed at 2; no duplicate work was created.
- Reloaded and reopened the live production page. Both cloud plant names, five features and photos loaded. Both images decoded to width 1200.
- Search rerender kept both cached photos visible. A single 香草園 marker showed 2 observations; its dialog displayed both plant names, features and decoded photos.
- User then explicitly requested deletion of the two older receipts. They were moved to Drive Trash, not permanently deleted. No other prior item was modified.
- Cleaned up only the two newly created test folders and their local test copies after testing. Drive folder, cloud gallery cards and map record count returned to 0. The previously trashed third item was untouched.

## Test identities

- Test A revision: `f63f1cc2-fb8a-4cf4-85d6-c5e92024bc45`.
- Test B revision: `a6bd268c-edd0-4a1d-85f4-aef8b97f5e97`.
- Photograph: [Basil leaves](https://en.wikibooks.org/wiki/File:Basil_leaves.jpg), Paul Goyette, [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/); resized/compressed for the temporary test. No student data was used.

## Regression checks

`node plant-explorer/sync.test.cjs`, `NODE_PATH=<linkedom install>/node_modules node plant-explorer/gallery.test.cjs`, and JavaScript syntax checking pass. These use mocked Drive/DOM fixtures and are not substitutes for browser acceptance.

## Acceptance limitations — NOT passed

The available browser tabs shared the same local database, including tabs opened with different session names and the attempted private-window shortcut. Thus two tabs are NOT counted as two isolated devices. Anonymous independent HTTP read/write succeeded, but a genuine bidirectional test between two isolated browser profiles remains unverified.

Physical phone/tablet camera and touch behavior, mobile/tablet viewport execution, and a real browser network interruption/recovery were not completed. The browser environment did not expose isolated profiles, viewport/network emulation, or a usable separate private browsing context. Do not claim full cross-device/mobile/offline acceptance from the checks above.

## Follow-up upload repair (2026-11-05)

The user reported photos staying only on a phone again. Public production diagnostics measured a valid status response at 16.09 seconds and a valid gallery response at 14.55 seconds (0 records, no warnings). The uploader had a 7-second health-check timeout and returned before issuing its photo POST when that check failed. Startup retries used the same gate. Retry controls and upload state had also been hidden from students.

Fixed by posting directly without a preliminary health gate, then checking the actual durable receipt with a 35-second timeout. A lost POST response still triggers receipt checks. Added a single-flight upload lock, persistent pending/uncertain/sent badges, visible per-work/batch retries, bounded automatic retry backoff, and resume on online/visible/reopen. Older local records receive a stable revision before sending. Existing IndexedDB data is merged with unmatched localStorage fallback works without overwriting records. Added UUID compatibility for browsers without randomUUID. Buttons explicitly say 儲存並上傳.

`upload.test.cjs` passes mock integration checks for 16-second receipts, no preliminary health query, no concurrent duplicate POST, failed-upload photo retention, stable retry identity, offline resume, legacy cache migration, and automatic upload of imported pending works. These are simulated network failures, not tests on the user's physical phone.

Production UI verification used 系統測試_上傳修復_20261105, revision `ae296852-85ab-4933-ba91-82f906347d88`. The form uploaded a real JPEG, received a durable receipt, displayed 已上傳到全班圖鑑, and displayed the plant photo and all five core features in the shared gallery. School Drive was inspected directly: the new folder contained 照片1.jpg, 觀察紀錄.json and 收件完成.txt. The test folder and local test copy were cleaned up after verification; the live shared gallery returned to 0. No existing student work was changed. Backend version 5 and the receiving URL were unchanged.

The user's actual phone storage is not remotely accessible in this session. They must refresh the same site's page in the same phone browser to load the fix; its retained pending photos will retry automatically and can also be retried with the visible button. Do not clear that browser's site data. Physical phone/tablet and truly isolated-browser acceptance remain unverified.
