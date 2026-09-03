#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';

const args = process.argv.slice(2);
const runDocker = args.includes('--docker');
if (args.some((arg) => arg !== '--docker')) {
  throw new Error(`Unknown generated project smoke option: ${args.join(' ')}`);
}

const root = resolve(import.meta.dirname, '..');
const cliDirectory = join(root, 'create-ts-fastify-business-starter');
const projectName = 'generated-smoke-app';
const workdir = await mkdtemp(join(tmpdir(), 'business-starter-generated-'));
const packDirectory = join(workdir, 'pack');
const harness = join(workdir, 'harness');
const project = join(workdir, projectName);

async function assertAbsent(path) {
  try {
    await access(path);
    throw new Error(`generated project contains maintainer-only path ${path}`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

async function scanForStarterIdentity(directory) {
  const textExtensions = new Set([
    '.css',
    '.env',
    '.example',
    '.html',
    '.js',
    '.json',
    '.md',
    '.mjs',
    '.mts',
    '.sh',
    '.sql',
    '.toml',
    '.ts',
    '.tsx',
    '.yaml',
    '.yml',
  ]);
  const failures = [];
  async function scan(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      if (['.git', 'node_modules', 'dist', 'coverage'].includes(entry.name)) continue;
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        await scan(path);
        continue;
      }
      if (
        !textExtensions.has(extname(entry.name)) &&
        !entry.name.startsWith('.') &&
        entry.name !== 'Dockerfile'
      ) {
        continue;
      }
      const content = (await readFile(path, 'utf8')).replaceAll(
        'create-ts-fastify-business-starter',
        '',
      );
      for (const marker of [
        '@ts-fastify-business-starter/',
        'ts-fastify-business-starter',
        'Lingcoo TS Fastify Business Starter',
        '/Users/admin/Projects/',
      ]) {
        if (content.includes(marker)) failures.push(`${path}: found ${marker}`);
      }
    }
  }
  await scan(directory);
  if (failures.length > 0) {
    throw new Error(`generated project contains starter identity:\n${failures.join('\n')}`);
  }
}

try {
  await mkdir(packDirectory);
  await mkdir(harness);

  execFileSync('npm', ['pack', '--silent', '--pack-destination', packDirectory], {
    cwd: cliDirectory,
    stdio: 'inherit',
  });
  const tarballs = (await readdir(packDirectory)).filter((entry) => entry.endsWith('.tgz'));
  if (tarballs.length !== 1) throw new Error(`npm pack produced ${tarballs.length} tarballs`);
  const tarball = join(packDirectory, tarballs[0]);
  const packedFiles = execFileSync('tar', ['-tzf', tarball], {
    encoding: 'utf8',
    env: { ...process.env, LC_ALL: 'C' },
  })
    .split('\n')
    .filter(Boolean);
  const allowedPackedFiles = new Set([
    'package/package.json',
    'package/cli.mjs',
    'package/LICENSE',
    'package/README.md',
    'package/template.tar.gz',
  ]);
  for (const required of allowedPackedFiles) {
    if (!packedFiles.includes(required)) throw new Error(`CLI tarball is missing ${required}`);
  }
  const unexpectedPackedFiles = packedFiles.filter((path) => !allowedPackedFiles.has(path));
  if (unexpectedPackedFiles.length > 0) {
    throw new Error(
      `CLI tarball contains files outside the publish allowlist:\n${unexpectedPackedFiles.join('\n')}`,
    );
  }

  await writeFile(
    join(harness, 'package.json'),
    '{"name":"cli-smoke-harness","version":"1.0.0","private":true}\n',
  );
  execFileSync(
    'npm',
    ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--save-exact', tarball],
    { cwd: harness, stdio: 'inherit' },
  );
  execFileSync('npm', ['audit', '--omit=dev', '--audit-level=high'], {
    cwd: harness,
    stdio: 'inherit',
  });
  const binary = join(
    harness,
    'node_modules',
    '.bin',
    process.platform === 'win32'
      ? 'create-ts-fastify-business-starter.cmd'
      : 'create-ts-fastify-business-starter',
  );
  execFileSync(binary, [project, '--skip-install', '--no-git'], {
    cwd: workdir,
    stdio: 'inherit',
  });

  const occupied = join(workdir, 'occupied');
  await mkdir(occupied);
  await writeFile(join(occupied, 'keep.txt'), 'do not overwrite');
  const refused = spawnSync(binary, [occupied, '--skip-install', '--no-git'], {
    cwd: workdir,
    encoding: 'utf8',
  });
  if (refused.status === 0 || !refused.stderr.includes('Target directory is not empty')) {
    throw new Error('CLI did not safely reject a non-empty target directory');
  }
  if ((await readFile(join(occupied, 'keep.txt'), 'utf8')) !== 'do not overwrite') {
    throw new Error('CLI modified an existing target file');
  }

  const packageJson = JSON.parse(await readFile(join(project, 'package.json'), 'utf8'));
  if (packageJson.name !== projectName) {
    throw new Error(`generated package name is ${packageJson.name}, expected ${projectName}`);
  }
  if (packageJson.repository || packageJson.homepage || packageJson.bugs) {
    throw new Error('generated root package contains Starter repository metadata');
  }
  for (const script of [
    'check:starter-version',
    'check:cli',
    'smoke:generated',
    'smoke:generated:docker',
  ]) {
    if (script in packageJson.scripts) {
      throw new Error(`generated project contains maintainer-only script ${script}`);
    }
  }
  for (const path of [
    '.base-starter-version',
    '.starter-version',
    '.github/workflows/release-cli.yml',
    'CODE_OF_CONDUCT.md',
    'CONTRIBUTING.md',
    'create-ts-fastify-business-starter',
    'docs/common-business-modules-implementation-plan.md',
    'docs/productization.md',
    'scripts/check-starter-version.mjs',
    'scripts/cleanup-cli-package.mjs',
    'scripts/prepare-cli-package.mjs',
    'scripts/verify-generated-project.mjs',
  ]) {
    await assertAbsent(join(project, path));
  }
  for (const path of ['.gitignore', '.npmrc', '.env.example']) {
    await access(join(project, path));
  }
  const appPackages = await Promise.all(
    ['apps/admin', 'apps/server', 'apps/web', 'packages/api-client', 'packages/contracts'].map(
      async (path) => JSON.parse(await readFile(join(project, path, 'package.json'), 'utf8')),
    ),
  );
  if (appPackages.some((manifest) => !manifest.name.startsWith(`@${projectName}/`))) {
    throw new Error('generated workspace package scope was not replaced consistently');
  }
  await scanForStarterIdentity(project);

  execFileSync('corepack', ['pnpm', 'install', '--frozen-lockfile'], {
    cwd: project,
    stdio: 'inherit',
  });
  execFileSync('corepack', ['pnpm', 'check'], { cwd: project, stdio: 'inherit' });
  if (runDocker) {
    execFileSync('corepack', ['pnpm', 'smoke:docker'], { cwd: project, stdio: 'inherit' });
  }
  console.log(
    `generated project smoke test passed${runDocker ? ' with production Docker stack' : ''}`,
  );
} finally {
  await rm(workdir, { recursive: true, force: true });
}
