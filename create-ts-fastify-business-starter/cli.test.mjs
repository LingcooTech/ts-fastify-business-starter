import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { displayName, parseArgs } from './cli.mjs';

describe('business starter CLI arguments', () => {
  it('parses a safe project directory and defaults', () => {
    const parsed = parseArgs(['my-business-app']);
    assert.equal(parsed.projectName, 'my-business-app');
    assert.deepEqual(parsed.options, { git: true, install: true, templatePath: undefined });
  });

  it('supports non-destructive automation options', () => {
    const parsed = parseArgs(['my-app', '--skip-install', '--no-git', '--template-path', '.']);
    assert.equal(parsed.options.git, false);
    assert.equal(parsed.options.install, false);
    assert.equal(parsed.options.templatePath, process.cwd());
  });

  it('rejects missing, duplicate, invalid, and unknown input', () => {
    assert.throws(() => parseArgs([]), /target directory is required/);
    assert.throws(() => parseArgs(['one', 'two']), /Only one target directory/);
    assert.throws(() => parseArgs(['../Bad Name']), /must be 1-100 lowercase/);
    assert.throws(() => parseArgs(['node_modules']), /must be 1-100 lowercase/);
    assert.throws(() => parseArgs(['safe-name', '--force']), /Unknown option/);
  });

  it('creates a readable default display name', () => {
    assert.equal(displayName('retail-operations'), 'Retail Operations');
  });
});
