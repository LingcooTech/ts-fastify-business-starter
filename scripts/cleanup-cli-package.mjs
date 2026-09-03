#!/usr/bin/env node

import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';

await Promise.all(
  ['template.tar.gz', 'LICENSE'].map((name) =>
    rm(resolve(import.meta.dirname, `../create-ts-fastify-business-starter/${name}`), {
      force: true,
    }),
  ),
);
