#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { basename, join, relative, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { format, getFileInfo, resolveConfig } from 'prettier';

const GENERATOR_NAME = 'create-ts-fastify-business-starter';
const STARTER_NAME = 'ts-fastify-business-starter';
const STARTER_SCOPE = '@ts-fastify-business-starter/';
const STARTER_TITLE = 'Lingcoo TS Fastify Business Starter';
const TEXT_FILE_NAMES = new Set(['Dockerfile']);
const TEXT_EXTENSIONS = new Set([
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
const COPY_EXCLUSIONS = new Set([
  '.DS_Store',
  '.git',
  'coverage',
  'dist',
  'node_modules',
  'playwright-report',
  'template.tar.gz',
  'test-results',
]);
const MAINTAINER_PATHS = [
  '.base-starter-version',
  '.starter-version',
  '.github/workflows/release-cli.yml',
  'CODE_OF_CONDUCT.md',
  'CONTRIBUTING.md',
  GENERATOR_NAME,
  'docs/common-business-modules-implementation-plan.md',
  'docs/productization.md',
  'scripts/check-starter-version.mjs',
  'scripts/cleanup-cli-package.mjs',
  'scripts/prepare-cli-package.mjs',
  'scripts/verify-generated-project.mjs',
];

function usage() {
  console.log(`
Usage:
  npx @lingcoo-tech/${GENERATOR_NAME}@latest <directory> [options]

Options:
  --skip-install            Do not install dependencies
  --no-git                  Do not initialize a Git repository
  --template-path <path>    Use a local template directory (maintainer verification only)
  --help                    Show this help
`);
}

function parseArgs(args) {
  const options = { git: true, install: true, templatePath: undefined };
  let directory;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') return { help: true };
    if (arg === '--skip-install') {
      options.install = false;
      continue;
    }
    if (arg === '--no-git') {
      options.git = false;
      continue;
    }
    if (arg === '--template-path') {
      const value = args[++index];
      if (!value) throw new Error('--template-path requires a value');
      options.templatePath = resolve(value);
      continue;
    }
    if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
    if (directory) throw new Error('Only one target directory may be specified');
    directory = arg;
  }
  if (!directory) throw new Error('A target directory is required');
  const projectName = basename(resolve(directory));
  if (!/^[a-z0-9][a-z0-9-]{0,99}$/.test(projectName)) {
    throw new Error(
      `Project directory name "${projectName}" must be 1-100 lowercase letters, numbers, or hyphens`,
    );
  }
  return { directory, options, projectName };
}

function displayName(projectName) {
  return projectName
    .split('-')
    .filter(Boolean)
    .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function isWithin(parent, target) {
  const path = relative(parent, target);
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..');
}

async function resolveTemplate(workdir, options) {
  if (options.templatePath) {
    const metadata = await stat(options.templatePath).catch(() => null);
    if (!metadata?.isDirectory()) {
      throw new Error(`Local template directory does not exist: ${options.templatePath}`);
    }
    return options.templatePath;
  }
  const archive = resolve(import.meta.dirname, 'template.tar.gz');
  if (!existsSync(archive)) {
    throw new Error('Packaged template archive is missing; reinstall the CLI package');
  }
  const extracted = join(workdir, 'template');
  await mkdir(extracted);
  execFileSync('tar', ['-xzf', archive, '-C', extracted], {
    env: { ...process.env, LC_ALL: 'C' },
  });
  return extracted;
}

async function copyTemplate(source, target) {
  await mkdir(target, { recursive: true });
  for (const entry of await readdir(source)) {
    if (
      COPY_EXCLUSIONS.has(entry) ||
      entry === '.env' ||
      (entry.startsWith('.env.') && entry !== '.env.example')
    ) {
      continue;
    }
    await cp(join(source, entry), join(target, entry), {
      recursive: true,
      force: false,
      errorOnExist: true,
      filter: (path) => {
        const name = basename(path);
        return (
          !COPY_EXCLUSIONS.has(name) &&
          name !== '.env' &&
          (!name.startsWith('.env.') || name === '.env.example')
        );
      },
    });
  }
}

async function transformFiles(root, projectName) {
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    if (COPY_EXCLUSIONS.has(entry.name)) continue;
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      await transformFiles(path, projectName);
      continue;
    }
    const extension = entry.name.includes('.') ? `.${entry.name.split('.').pop()}` : '';
    if (
      !TEXT_FILE_NAMES.has(entry.name) &&
      !TEXT_EXTENSIONS.has(extension) &&
      !entry.name.startsWith('.')
    ) {
      continue;
    }
    const content = await readFile(path, 'utf8');
    const protectedGenerator = '__BUSINESS_STARTER_GENERATOR__';
    const transformed = content
      .replaceAll(GENERATOR_NAME, protectedGenerator)
      .replaceAll(STARTER_SCOPE, `@${projectName}/`)
      .replaceAll(STARTER_TITLE, displayName(projectName))
      .replaceAll(STARTER_NAME, projectName)
      .replaceAll(protectedGenerator, GENERATOR_NAME);
    await writeFile(path, transformed, 'utf8');
  }
}

async function formatProject(root) {
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    if (COPY_EXCLUSIONS.has(entry.name)) continue;
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      await formatProject(path);
      continue;
    }
    const fileInfo = await getFileInfo(path);
    if (!fileInfo.inferredParser || fileInfo.ignored) continue;
    const content = await readFile(path, 'utf8');
    const configuration = (await resolveConfig(path)) ?? {};
    await writeFile(path, await format(content, { ...configuration, filepath: path }), 'utf8');
  }
}

async function removeMaintainerOnlyFiles(root, projectName) {
  const packagePath = join(root, 'package.json');
  const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
  packageJson.name = projectName;
  for (const script of [
    'check:starter-version',
    'check:cli',
    'smoke:generated',
    'smoke:generated:docker',
  ]) {
    delete packageJson.scripts[script];
  }
  packageJson.scripts.check = packageJson.scripts.check
    .replace('corepack pnpm check:starter-version && ', '')
    .replace('corepack pnpm check:cli && ', '');
  delete packageJson.repository;
  delete packageJson.homepage;
  delete packageJson.bugs;
  await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');

  for (const path of MAINTAINER_PATHS) {
    await rm(join(root, path), { recursive: true, force: true });
  }

  const readmePath = join(root, 'README.md');
  const readme = await readFile(readmePath, 'utf8');
  await writeFile(
    readmePath,
    readme
      .replace(/\n## 创建新项目\n[\s\S]*?(?=\n## )/, '')
      .replace(
        '完整顺序和完成标准见[通用模块实施方案](docs/common-business-modules-implementation-plan.md)。',
        '',
      ),
    'utf8',
  );
  await writeFile(
    join(root, 'CHANGELOG.md'),
    '# Changelog\n\n## 0.1.0\n\n- Initial generated application baseline.\n',
    'utf8',
  );

  const eslintPath = join(root, 'eslint.config.mjs');
  const eslintConfig = await readFile(eslintPath, 'utf8');
  await writeFile(eslintPath, eslintConfig.replace(`'${GENERATOR_NAME}/**/*.mjs', `, ''), 'utf8');

  const ciPath = join(root, '.github/workflows/ci.yml');
  const ci = await readFile(ciPath, 'utf8');
  await writeFile(ciPath, ci.replace(/^[ \t]*- run: corepack pnpm smoke:generated\n/m, ''), 'utf8');

  const dockerWorkflowPath = join(root, '.github/workflows/docker.yml');
  const dockerWorkflow = await readFile(dockerWorkflowPath, 'utf8');
  await writeFile(
    dockerWorkflowPath,
    dockerWorkflow
      .replace(/^[ \t]*- 'create-ts-fastify-business-starter\/\*\*'\n/m, '')
      .replace(
        /^[ \t]*- name: Run generated project production Docker smoke test\n[ \t]*run: corepack pnpm smoke:generated:docker\n/m,
        '',
      ),
    'utf8',
  );
}

async function assertTargetAvailable(target) {
  try {
    const metadata = await stat(target);
    if (!metadata.isDirectory()) throw new Error(`Target path is not a directory: ${target}`);
    if ((await readdir(target)).length > 0)
      throw new Error(`Target directory is not empty: ${target}`);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.help) {
    usage();
    return;
  }
  const target = resolve(parsed.directory);
  const targetExisted = await assertTargetAvailable(target);
  const workdir = await mkdtemp(join(tmpdir(), `${GENERATOR_NAME}-`));
  let filesReady = false;
  try {
    const source = await resolveTemplate(workdir, parsed.options);
    if (isWithin(source, target)) throw new Error('Target directory cannot be inside the template');
    console.log(`Creating ${parsed.projectName} in ${target}`);
    await copyTemplate(source, target);
    await transformFiles(target, parsed.projectName);
    await removeMaintainerOnlyFiles(target, parsed.projectName);
    await formatProject(target);
    filesReady = true;

    if (parsed.options.git) {
      execFileSync('git', ['init', '-b', 'main'], { cwd: target, stdio: 'ignore' });
      execFileSync('git', ['add', '.'], { cwd: target });
      try {
        execFileSync('git', ['commit', '-m', 'Initial project'], { cwd: target, stdio: 'ignore' });
      } catch {
        console.warn(
          'Git was initialized, but the initial commit was skipped. Configure git user.name and user.email, then commit manually.',
        );
      }
    }
    if (parsed.options.install) {
      execFileSync('corepack', ['pnpm', 'install', '--frozen-lockfile'], {
        cwd: target,
        stdio: 'inherit',
      });
    }
    console.log(
      `\nDone. Next steps:\n  cd ${parsed.directory}\n  cp .env.example .env\n  docker compose up -d\n  pnpm db:migrate\n  pnpm db:bootstrap\n  pnpm dev`,
    );
  } catch (error) {
    if (!filesReady) {
      await rm(target, { recursive: true, force: true });
      if (targetExisted) await mkdir(target, { recursive: true });
    }
    throw error;
  } finally {
    await rm(workdir, { recursive: true, force: true });
  }
}

export {
  copyTemplate,
  displayName,
  formatProject,
  main,
  parseArgs,
  removeMaintainerOnlyFiles,
  transformFiles,
};

const invokedPath =
  process.argv[1] && existsSync(process.argv[1]) ? realpathSync(process.argv[1]) : '';
const modulePath = realpathSync(fileURLToPath(import.meta.url));

if (invokedPath === modulePath) {
  main().catch((error) => {
    console.error(`\nError: ${error.message}`);
    process.exitCode = 1;
  });
}
