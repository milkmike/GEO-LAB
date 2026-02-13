#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const roots = [
  path.join(process.cwd(), 'src', 'app'),
  path.join(process.cwd(), 'src', 'components'),
];

const targetExt = new Set(['.tsx', '.ts']);
const disallowed = /text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|\[[^\]]+\])/g;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (targetExt.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

const violations = [];
for (const root of roots) {
  for (const file of walk(root)) {
    const text = fs.readFileSync(file, 'utf8');
    const matches = [...text.matchAll(disallowed)];
    if (matches.length) {
      for (const m of matches) {
        violations.push({ file: path.relative(process.cwd(), file), token: m[0] });
      }
    }
  }
}

if (violations.length) {
  console.error('Typography violations found (use only t-display / t-body / t-meta):');
  for (const v of violations) console.error(`- ${v.file}: ${v.token}`);
  process.exit(1);
}

console.log('Typography check passed: only t-display / t-body / t-meta are used.');
