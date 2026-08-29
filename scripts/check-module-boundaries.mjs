#!/usr/bin/env node

import { access, readdir, readFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

const workspaceRoot = process.env.TS_FASTIFY_MODULE_ROOT
  ? resolve(process.env.TS_FASTIFY_MODULE_ROOT)
  : resolve(import.meta.dirname, '..');
const modulesRoot = join(workspaceRoot, 'apps/server/src/modules');
const shapeExemptions = new Set(['health']);
const failures = [];

function isWithin(parent, target) {
  const path = relative(parent, target);
  return path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path);
}

async function sourceFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await sourceFiles(path)));
    else if (entry.name.endsWith('.ts')) files.push(path);
  }
  return files;
}

async function requirePath(path, message) {
  try {
    await access(path);
  } catch {
    failures.push(message);
  }
}

for (const entry of await readdir(modulesRoot, { withFileTypes: true })) {
  if (!entry.isDirectory() || entry.name.startsWith('_')) continue;
  const directory = join(modulesRoot, entry.name);
  if (!shapeExemptions.has(entry.name)) {
    await requirePath(join(directory, 'plugin.ts'), `${directory}: missing plugin.ts`);
    await requirePath(join(directory, 'public.ts'), `${directory}: missing public.ts`);
    for (const requiredDirectory of ['api', 'application', 'domain', 'infrastructure']) {
      await requirePath(
        join(directory, requiredDirectory),
        `${directory}: missing ${requiredDirectory}/`,
      );
    }
  }

  for (const path of await sourceFiles(directory)) {
    if (
      path.endsWith('.schema.ts') &&
      !isWithin(join(directory, 'infrastructure/persistence'), path)
    ) {
      failures.push(
        `${path}: module-owned Drizzle schemas must live under infrastructure/persistence`,
      );
    }

    const content = await readFile(path, 'utf8');
    for (const match of content.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      const specifier = match[1];
      if (!specifier.startsWith('.')) continue;
      const importedPath = resolve(dirname(path), specifier);
      if (!isWithin(modulesRoot, importedPath) || isWithin(directory, importedPath)) continue;
      const targetModuleName = relative(modulesRoot, importedPath).split(sep)[0];
      const targetModuleRoot = join(modulesRoot, targetModuleName);
      const targetPath = relative(targetModuleRoot, importedPath).split(sep).join('/');
      if (!['public', 'public.js', 'public.ts'].includes(targetPath)) {
        failures.push(`${path}: cross-module imports must target ${targetModuleName}/public.ts`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log('module boundary check passed');
}
