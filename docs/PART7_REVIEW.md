# Part 7 — UI, chat and account interactions

Completed 2026-10-16. Builds on release 75c3b12 without changing the six-digit password policy.

## Delivered
- Readable white chat header/avatar text, padded rounded profile hero, compact fixed tactics hint.
- Member @ suggestions with Vietnamese accent-insensitive search, safe highlighted mentions, keyboard selection and a basic emoji tray. Mentions remain plain text; this release adds no mention-specific push rule.
- Existing Supabase Realtime message subscription retained, with cleanup and bounded fallback polling when disconnected. New messages scroll into view when near the bottom; reading older messages is preserved.
- Profile detail history returns to Profile rather than Home, including browser Back.
- Account notification preferences persisted through an authenticated API/RPC and isolated by auth.uid. Existing/new device configuration follows account choices. Browser push permission remains a separate per-device action.
- Member leave and owner dissolve controls with server-verified roles, duplicate-submit protection, and exact team-name confirmation. Dissolution revokes access/invites and preserves financial/chat/history records.
- Old-password verification before password update, clickable avatar photo picker, and shared success/error toasts.

## Verification
- Full automated suite: 176/176 passed, including API authorization, account preference isolation, lifecycle transactions, realtime updates/cleanup, mentions, navigation and UI confirmation states.
- Additional focused lifecycle/UI checks passed after final changes; no React act warning remains.
- Production migration 202610160001_account_preferences_lifecycle.sql applied. Catalog checks confirmed RLS, authenticated-only RPC access and chat realtime publication. Rollback-only authenticated tests exercised persisted preferences and exact-name dissolution; no synthetic teams remained. Final device/account preference mismatch count: 0.
- Light/Dark layouts inspected at 320, 360, 390 and 430 px plus desktop. No horizontal document overflow. Emoji targets at least 44 px; chat header text is white in both themes; pitch hint stays inside the pitch.
- Browser checks: profile Back, avatar file-picker preview, local mention/emoji send and success toast. Local demo fixture has no external chat writes.
- Production build/PWA generation passed. Vite retains its existing main-chunk size advisory (approximately 508 kB uncompressed); no dependency was added.

## Limits
No physical Safari iOS/Android verification in this release. No real password was changed, no real team was left/dissolved, and no new live two-device message/push was sent. Prior iPhone push verification does not establish new UI behavior on physical devices. Server preference persistence was checked transactionally against Supabase; browser component tests cover loading the same settings on another installation.

## Preview artifacts
Saved screenshots: part7-profile-light.png, part7-profile-dark.png, part7-chat-light.png, part7-chat-dark.png, part7-profile-toast.png and part7-tactics-dark.png in the task visualization folder. Preview data is synthetic/local.
