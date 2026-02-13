#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const configPath = path.join(__dirname, 'task-groups.json');
const groups = JSON.parse(fs.readFileSync(configPath, 'utf8'));

function runNpmScript(scriptName) {
  const isWindows = process.platform === 'win32';
  const command = isWindows ? 'npm.cmd' : 'npm';

  const result = spawnSync(command, ['run', scriptName], {
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function main() {
  const groupName = process.argv[2];

  if (!groupName) {
    console.error('Usage: node scripts/ci/run-task-group.js <group>');
    process.exit(1);
  }

  const tasks = groups[groupName];
  if (!Array.isArray(tasks) || tasks.length === 0) {
    console.error(`Unknown or empty task group: ${groupName}`);
    process.exit(1);
  }

  console.log(`Running CI task group: ${groupName}`);
  for (const task of tasks) {
    console.log(`\n→ npm run ${task}`);
    runNpmScript(task);
  }
}

if (require.main === module) {
  main();
}
