# Startup repair — 2026-10-15

Confirmed production incident: authenticated GET /api/teams returned500 on Safari iOS and desktop. Anonymous401 checks did not cover this path.

Root cause: two canonical memberships belonged to an existing Auth account with no profiles row. The boot handler used profiles.single(), turning a valid legacy account into a fatal startup error. Added no_app_ensure_profile(): restores only the authenticated caller's missing row, preserves existing edits, handles conflicting legacy usernames without taking them from another account, and never creates Auth users or grants team roles.

Also reproduced a separate startup race: a focus refresh superseded the initial workspace request but never completed workspaceBoot. Successful current-scope responses now resolve readiness regardless of which request started them. Failed startup provides Retry and deliberate Sign in again; it does not reveal cached private content.

Verification: 142 tests pass, including missing-profile restoration, username collision, no role grants, existing edit preservation, API response contract, focus race and sign-in recovery. Vite/PWA build succeeds. Migration010 applied to linked production Supabase with receipt startup-profile-repair-20261015, source SHA-256 8e75ae762334b54343e170af4c35efb32834dbbedc409bb4ec7134c6d3786a4f.

A production SQL transaction under role authenticated restored the affected caller's own profile and read its two canonical memberships/snapshots successfully; the test was rolled back. The existing two team workspaces were not initialized yet, so the first authorized API load still runs the preserving legacy import. No production team, ledger or Auth account was deleted or reset.

API diagnostics log only stage and error code, never tokens, private fields or raw database detail.
