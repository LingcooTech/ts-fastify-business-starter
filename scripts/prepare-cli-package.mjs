#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { copyFile, cp, lstat, mkdir, mkdtemp, readdir, rm } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const root = resolve(import.meta.dirname, '..');
const packageDirectory = join(root, 'create-ts-fastify-business-starter');
const archive = join(packageDirectory, 'template.tar.gz');
const packageLicense = join(packageDirectory, 'LICENSE');
const allowedRootEntries = new Set([
  '.dockerignore',
  '.editorconfig',
  '.env.example',
  '.github',
  '.gitignore',
  '.npmrc',
  '.nvmrc',
  'CHANGELOG.md',
  'Dockerfile',
  'LICENSE',
  'README.en.md',
  'README.md',
  'SECURITY.md',
  'apps',
  'deploy',
  'docker',
  'docker-compose.prod.yml',
  'docker-compose.yml',
  'docs',
  'eslint.config.mjs',
  'package.json',
  'packages',
  'playwright.config.ts',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'prettier.config.mjs',
  'scripts',
  'test',
  'tsconfig.base.json',
]);
const excludedNames = new Set([
  '.DS_Store',
  '.git',
  'coverage',
  'dist',
  'node_modules',
  'playwright-report',
  'template.tar.gz',
  'test-results',
]);

function includePath(path) {
  const name = basename(path);
  if (excludedNames.has(name)) return false;
  if (name === '.env.example') return true;
  return name !== '.env' && !name.startsWith('.env.');
}

async function assertNoSymbolicLinks(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    const metadata = await lstat(path);
    if (metadata.isSymbolicLink()) throw new Error(`CLI template cannot contain symlinks: ${path}`);
    if (metadata.isDirectory()) await assertNoSymbolicLinks(path);
  }
}

const workdir = await mkdtemp(join(tmpdir(), 'business-starter-cli-package-'));
const staging = join(workdir, 'template');
let prepared = false;

try {
  await rm(archive, { force: true });
  await copyFile(join(root, 'LICENSE'), packageLicense);
  await mkdir(staging);
  for (const entry of await readdir(root)) {
    if (!allowedRootEntries.has(entry)) continue;
    await cp(join(root, entry), join(staging, entry), {
      recursive: true,
      filter: includePath,
    });
  }
  await assertNoSymbolicLinks(staging);
  execFileSync('tar', ['-czf', archive, '-C', staging, '.'], {
    env: { ...process.env, LC_ALL: 'C' },
  });
  prepared = true;
  console.log('prepared versioned CLI template archive');
} finally {
  if (!prepared) {
    await Promise.all([rm(archive, { force: true }), rm(packageLicense, { force: true })]);
  }
  await rm(workdir, { recursive: true, force: true });
}
