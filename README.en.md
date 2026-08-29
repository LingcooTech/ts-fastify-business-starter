# Lingcoo TS Fastify App Starter

A production-ready blank application workspace built with native Fastify, TypeScript, PostgreSQL, Drizzle, React, and pnpm.

It provides API and Worker entry points, Admin and Web shells, migrations, Docker, CI, quality gates, a module generator, and generated-project acceptance without shipping product or industry modules.

```bash
corepack enable
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:migrate
pnpm dev
```

Run `pnpm check` for the complete local quality gate. See the Chinese [README](README.md) and the documents under `docs/` for the architecture and delivery conventions.

Licensed under Apache-2.0.
