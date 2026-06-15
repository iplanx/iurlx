#!/usr/bin/env node

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');
const NODE = process.execPath;

function resolveBin(packageName, binRelativePath) {
  const packageJsonPath = require.resolve(`${packageName}/package.json`, {
    paths: [REPO_ROOT],
  });
  const binPath = path.join(path.dirname(packageJsonPath), binRelativePath);
  if (!fs.existsSync(binPath)) {
    throw new Error(`Could not resolve ${packageName} binary`);
  }
  return binPath;
}

const PRETTIER_BIN = resolveBin('prettier', 'bin/prettier.cjs');
const PRETTIER_CONFIG = path.join(REPO_ROOT, '.prettierrc');
const PRETTIER_IGNORE = path.join(REPO_ROOT, '.prettierignore');

// Keep in sync with staged-file extensions.
const FORMAT_GLOBS = [
  'app/src/**/*.{ts,tsx,js,jsx,json,css,md}',
  'functions/src/**/*.{ts,js,json}',
];

const mode = process.argv[2];
if (mode !== '--write' && mode !== '--check') {
  console.error('Usage: node scripts/format.js --write|--check');
  process.exit(1);
}

const result = spawnSync(
  NODE,
  [
    PRETTIER_BIN,
    mode === '--write' ? '--write' : '--check',
    '--config',
    PRETTIER_CONFIG,
    '--ignore-path',
    PRETTIER_IGNORE,
    ...FORMAT_GLOBS,
  ],
  {
    stdio: 'inherit',
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      PRETTIER_CONFIG: PRETTIER_CONFIG,
    },
  }
);

process.exit(result.status ?? 1);
