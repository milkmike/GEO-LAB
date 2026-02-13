/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');

const { toPreviewSlug, buildPreviewEnv } = require('../scripts/preview-env');

test('toPreviewSlug normalizes feature branch names', () => {
  assert.equal(toPreviewSlug('lab/S0-CODE/my_task'), 'lab-s0-code-my-task');
});

test('buildPreviewEnv returns minimal preview variables', () => {
  const env = buildPreviewEnv('lab/s0-code');

  assert.match(env, /NEXT_PUBLIC_DEPLOY_ENV=preview/);
  assert.match(env, /NEXT_PUBLIC_PREVIEW_BRANCH=lab\/s0-code/);
  assert.match(env, /NEXT_PUBLIC_PREVIEW_SLUG=lab-s0-code/);
});
