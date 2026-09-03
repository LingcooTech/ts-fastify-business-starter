# @lingcoo-tech/create-ts-fastify-business-starter

Official project generator for [Lingcoo TS Fastify Business Starter](https://github.com/LingcooTech/ts-fastify-business-starter).

```bash
npx @lingcoo-tech/create-ts-fastify-business-starter@latest my-business-app
```

The package contains a version-matched template, so generation does not depend on the current state of a Git branch. It creates an independent pnpm workspace, initializes Git, and installs dependencies by default.

Options:

- `--skip-install`: generate files without installing dependencies;
- `--no-git`: do not initialize a Git repository;
- `--template-path <path>`: use a local template checkout for maintainer verification;
- `--help`: show command help.

Requires Node.js 24 and Corepack/pnpm 11.
