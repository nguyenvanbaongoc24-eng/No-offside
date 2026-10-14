# Mobile spacing, invitation and startup — 14/10/2026

## Confirmed causes and corrections

- AppShell and pages both reserved bottom navigation space. At 390×844, Dashboard had 108 px at frame + 16 px page padding. Tactics also had `pb-28` and `min-h-screen`; EmptyTeam repeated `pb-safe-nav`. These are real layout gaps, separate from browser bounce.
- AppShell now owns the navigation/safe area clearance: 68 px capsule + 2×12 px gaps + safe area. Page duplicates and unnecessary viewport minimums are removed. Clearance remains stable while navigation animates, so hiding it does not change scroll height. Short pages use a viewport minimum on the shell only. Chat owns its stream and consumes the shell's clearance variable rather than another page spacer.
- The Personal invite action previously waited for code creation before opening anything; rejected requests placed the error at the bottom of the menu. It now opens a sheet immediately with loading, inline error and retry. Cached codes are checked through the existing `no_gov_get_invite` RPC; creation/revocation retain existing server callbacks and permissions.
- No generated client code/derived team ID is presented as a server invite. If RPC/session is unavailable, the sheet says so rather than claiming success. Demo cannot create a cross-device invite. Upstream schema and other join-flow changes are retained. Its automatic team provisioning, broadened local-role hints and local-code fallback overlap with the explicit requirements to keep business/permissions and avoid fake invites; the final invite path uses the verified role and existing server RPC only. No SQL was executed by this task.
- The invite state rejects wrong-team responses, ignores late account/team responses, shares one pending creation request, has a 15-second UI timeout, and clears timers. Clipboard success is reported only after write resolves. Native share cancellation is quiet; unsupported/failed share falls back to copying, without opening Zalo. Main invite cards also validate before copying; copy errors on EmptyTeam are visible outside the match form.
- Back/Escape/close dismiss the invitation sheet. Existing dialog focus/scroll restoration is preserved. Profile detail navigation clears old errors, closes the invite and restores the Personal scroll position.
- Removed the production sentence “Dữ liệu đội đang lưu trên thiết bị này”. Demo and Chat retain accurate local-data disclosures.

## Motion and rendering

- Tokens: press 120 ms, controls 180 ms, menu/navigation 200 ms, page fade 220 ms, sheet 260 ms. Detail headings shift only 8 px in navigation direction; full-width page content is not translated outside the viewport.
- Main tabs retain scroll positions scoped by account/team/tab. The screen fade is keyed to navigation, not data updates. Navigation uses the existing 24 px direction threshold, passive scroll + requestAnimationFrame, transform/opacity and inert hidden controls. The document listener is skipped for Chat. Keyboard viewport resize hides navigation and restores it after close.
- Countdown state/timer now belongs to MatchCountdown, not the whole Dashboard. Clipboard/save feedback timers clean up when components unmount. No dependencies added; no blanket memoization or virtualization.
- Reduced motion is inherited from MotionConfig and CSS, including the splash loader. No gradient animation, logo rotation, bounce or glow.

## Splash

- Uses the official repository asset `/pwa-512x512.png` (green ball/arrow), not the mockup's different wordmark. 96×96 px frame, radius 24 px, contained image, title NO OFFSIDE and “Hẹn nhau ra sân.”
- Light off-white/grass gradient and dark green-black gradient use shared tokens. Safe area and visual viewport height center the content. No navigation/form/control during normal loading.
- Initial HTML provides the same identity while JS loads; React replaces it. A bounded HTML fallback handles bundle-load failure. Main clears that timer when it starts.
- React splash follows actual session verification and the existing minimum team-data GET. Ancillary governance/other requests do not keep it visible. No artificial minimum display time. An already ready launch skips the React splash. Transition is 220 ms; tab/modal updates do not replay it.
- Session-restore/team-load failure or a 15-second timeout gives an error and Retry. Retry remounts initialization and cleans existing subscriptions without changing sign-in/onboarding rules. Expired-session handling remains the existing auth behavior.
- PWA manifest colors now match the initial light surface. No additional PWA delay was introduced; native OS splash behavior still needs device testing.

## Verification and limits

- `npm test`: 95 tests pass after merging upstream 20b4639 and f506df6, including immediate invitation open, permission failure/retry, wrong/late team, duplicate taps, clipboard failure/share fallback, keyboard listener cleanup, startup readiness/error/timeout and existing valid/expired auth cases.
- Build and `git diff --check` pass. Repository has no lint/typecheck script. CJS test bundle import.meta warnings are pre-existing.
- Browser: 90 top/bottom checks across the five live offline-demo tabs, Light/Dark × 320/360/390/430/1280. No horizontal overflow or measured button below 44×44. 100 additional read-only layouts cover login/signup/join, match/member forms, invitation success/loading/error, settings and onboarding; checkbox targets are their 44 px labels. 20 splash/error layouts have no overflow, logo is 96×96 and nav is hidden.
- At 390×844 Chat textarea grows to 124 px, composer bottom 752 and navigation top 764 (12 px gap). At landscape viewport 844×390 Chat height is 390; switching out restores body overflow and keyboard inset 0. Switching back to Home restored the observed previous scrollY 1172.5. Closing the sheet restores focus and inert/scroll state after its exit transition.
- No warning/error captured in the live offline demo during the tab matrix. These are viewport/component tests, not Safari iOS or Chrome Android hardware, a native keyboard, FPS profiling or PWA standalone testing. Reduced-motion behavior was checked in code/tests, not with a hardware accessibility setting.
- Success/permission/network/state cases use controlled callbacks and illustrative data. No invitation was sent to a real person and no production business write was performed. Authenticated production invitation creation/join, server schema availability and all financial/admin actions are not claimed as verified.
- No database migration or permission change was made. Upstream `supabase/full_schema.sql` is retained in Git without application to the live database. Shared `D:/No Offside` currently has another chat's uncommitted edits; it was not reset or overwritten.

## Artifacts

`C:/Users/LENOVO/.codex/visualizations/2026/10/12/01a13145-d075-7c53-9fba-640488767c3e/` contains before/after Home, tactics, invitation and splash PNGs, plus `compact-layout-checks.json`, `compact-secondary-checks.json`, `splash-layout-checks.json`.

Render fixtures are local only in gitignored `.ui-review`; `scripts/render-ui-review.mjs` produces read-only illustrative screens and `scripts/render-interaction-review.mjs` produces an isolated offline demo. Neither exposes a production demo route.
