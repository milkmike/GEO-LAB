#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getCurrentBranch() {
  return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
}

function toPreviewSlug(branch) {
  return branch
    .toLowerCase()
    .replace(/[^a-z0-9/-]+/g, '-')
    .replace(/[\/]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildPreviewEnv(branch) {
  const slug = toPreviewSlug(branch || 'unknown');
  return [
    `NEXT_PUBLIC_DEPLOY_ENV=preview`,
    `NEXT_PUBLIC_PREVIEW_BRANCH=${branch}`,
    `NEXT_PUBLIC_PREVIEW_SLUG=${slug}`,
    '',
  ].join('\n');
}

function main() {
  const branch = process.argv[2] || getCurrentBranch();
  const output = buildPreviewEnv(branch);
  const outPath = path.join(process.cwd(), '.env.preview.local');

  fs.writeFileSync(outPath, output, 'utf8');
  console.log(`Wrote ${path.relative(process.cwd(), outPath)} for branch: ${branch}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  toPreviewSlug,
  buildPreviewEnv,
};
