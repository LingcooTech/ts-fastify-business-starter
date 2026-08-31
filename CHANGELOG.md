# Changelog

## 0.1.0

- Initial native Fastify workspace baseline.
- Added API, Worker, Admin, Web, PostgreSQL, Drizzle, Docker, CI, generator, and quality gates.
- Added the stage 0 Business foundation: framework-neutral Contracts and API Client packages.
- Added the Ant Design 6 Admin Shell, Dashboard, UI Showcase, responsive navigation, theme, and error pages.
- Added desktop/mobile Playwright acceptance and production Admin deep-route smoke coverage.
- Added the Identity module with secure cookie sessions, CSRF, password recovery, email verification,
  active session management, Bootstrap account support, and Admin account security pages.
- Added the Access Control module with permission registry, roles, account role assignment, strict
  default-deny guards, protected Owner Bootstrap, atomic account provisioning, and Admin role/account
  management pages.
- Added the append-only Audit module with database-enforced immutability, defensive redaction,
  transaction-aware Identity/Access events, query contracts/API client, and responsive Admin
  filtering and event details.
- Added the typed Settings module with layered environment/database/default resolution, optimistic
  concurrency, encrypted Secret key rotation, audited provider tests, public contracts/API client,
  and a permission-aware Admin settings page.
- Added the transactional Idempotency module with canonical request hashing, lease recovery and
  fencing, bounded result replay, retry classification, read-only diagnostics, and responsive Admin
  visibility.
- Added PostgreSQL Jobs with transactional enqueue, SKIP LOCKED claims, random claim-token fencing,
  heartbeat and stale recovery, bounded retry/dead-letter handling, recurring time-bucket dedupe,
  a standalone Worker process, safe diagnostics, audited manual actions, and responsive Admin UI.
