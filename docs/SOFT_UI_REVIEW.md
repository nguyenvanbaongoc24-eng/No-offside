# Mobile Soft UI review — 15 October 2026

The UI now uses four floating destinations (Trang chủ, Sa bàn, Chat, Tài khoản) and a separate management FAB. The five quick actions open existing match, ledger, formation, invite and team settings interfaces. Team settings remain owner-only; the admin action is visibly disabled. Team funds remain accessible through Profile and the dashboard summary.

## Changes verified

- Shared Pressable wraps existing native buttons with Framer Motion press feedback. Disabled controls and reduced motion skip the scale effect. Existing handlers, form submit types and refs are preserved.
- Light background uses #F4F4F5 with white soft cards, 32px corners and subtle shadows. Dark tokens preserve readable green-black surfaces. Be Vietnam Pro is the default; explicitly saved system-font preferences remain available.
- Floating navigation reserves stable bottom clearance plus safe-area inset. Main targets are at least 44x44px; the FAB is 64x64px. At 320px the outer gaps shrink to preserve target sizes.
- Fixed the red swipe-delete surface leaking around the match card corners by aligning the gesture and content clipping radii. Gesture thresholds and deletion behavior are unchanged.
- Countdown is compact, larger and tabular; attendance buttons are pills. Header avatar opens Profile.
- Chat retains its existing scroll/composer structure and visible-message acknowledgement rules, with 160px list bottom padding. At 390x844 the composer ends at y732 and navigation starts at y764.
- Welcome reads up to two latest real team notices, dismisses after 5000ms, and stores only the checked opt-out in account-scoped sessionStorage. Empty state is explicit. It stays mounted across tab changes so it does not reopen on each tab.
- Birthday banner uses already-loaded team members and the team timezone. Removed members are excluded. Confetti is one bounded lazy-loaded burst, once per account/day/browser session, and respects reduced motion.

## Evidence and limits

- npm test: 164/164 passed, including unread badge, existing business regressions, four navigation destinations, FAB gating, welcome timer/session opt-out, announcement ordering and team-timezone birthdays.
- npm run build: passed; PWA/service worker generation passed. No dependencies added.
- Offline interactive fixture: all five quick actions open existing destinations/forms; owner/admin/member presentation checked; avatar opens Profile; no console warnings/errors observed.
- Responsive Chromium: 320, 360, 390, 430px and 1280px desktop checked. No document or navigation overflow observed. Navigation targets measured at least 44x52px, FAB 64x64px.
- Static component gallery at 320px in Light/Dark: sign-in, sign-up, home, members, tactics, fund, long chat/profile, settings, match form, input states, and birthday banner checked. Visible form inputs measured 16px. Preview fixtures use synthetic local data and do not send live messages, transactions or notifications.
- Safe-area CSS and visual-viewport keyboard handling are present. Actual Safari iOS / Android hardware, notch/home-indicator rendering, physical keyboard transitions and drag feel are not verified in this release.
- No database, migration, API, authentication or business calculation changes. No production business data used for UI testing.

Functional observations outside this UI change: the offline demo explicitly reports that late-arrival operations require a backend connection, and advanced administration screens remain Vietnamese. These existing conditions were not changed or represented as newly verified production behavior.

Preview regeneration: npm run build, then node scripts/render-ui-review.mjs and node scripts/render-interaction-review.mjs. Run Vite and open /.ui-review/interaction.html for an isolated local demo; reopening this explicit fixture URL is required after navigation changes its address to /.
