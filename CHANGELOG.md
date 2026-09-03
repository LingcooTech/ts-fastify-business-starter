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
- Added Transactional Outbox with transaction-required append, immutable versioned event facts,
  aggregate ordering, fenced Publisher recovery, bounded dead-letter replay, Consumer Inbox
  deduplication, safe diagnostics, and responsive Admin UI.
- Added secure transactional Mail delivery with registered templates, capture and SMTP transports,
  Jobs-backed retries, audited test delivery, retention maintenance, and Admin diagnostics.
- Added in-app Notifications and Announcements with audience targeting, unread state, optional Mail
  orchestration, idempotent publication, lifecycle controls, and a current-account notification center.
- Added Storage and Asset Management with local and S3-compatible providers, content inspection,
  stable versioned assets, reference-safe replacement and deletion, background cleanup, and an Admin
  asset library and picker.
- Added Application Branding with Storage-backed logo and favicon references, validated theme and
  login copy, a public projection, optimistic updates, live Admin preview, and audited changes.
- Added Payments with idempotent business references, Mock Provider adapters, raw-body HMAC callback
  verification, immutable callback facts, guarded refunds, reconciliation, a business fact port,
  runtime contracts/API client, and a permission-aware Admin console.
- Recorded the Webhook Inbox architecture decision: verified callbacks remain owned by their domain
  modules, raw payloads are not persisted by default, and extraction waits for two independent real
  integrations with proven shared lifecycle and replay requirements.
- Added the publish-ready Business Starter CLI with an embedded versioned template, project identity
  replacement, maintainer cleanup, strict npm tarball verification, generated-project checks and
  Docker production acceptance, plus release, upgrade, rollback, and credential-rotation runbooks.
