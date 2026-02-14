#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs/promises';

const PORT = Number(process.env.MOCK_PORT || 4011);
const MODE_FILE = process.env.MODE_FILE || '/tmp/geopulse-mode.txt';

async function getMode() {
  try {
    const raw = (await fs.readFile(MODE_FILE, 'utf8')).trim().toLowerCase();
    if (['normal', 'slow', 'partial', 'empty', 'stale'].includes(raw)) return raw;
  } catch {}
  return 'normal';
}

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

function nowIso() { return new Date().toISOString(); }
function staleIso() { return new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(); }

function countries(mode) {
  const base = [
    { code: 'KZ', divergence: 74, article_count: 312, last_updated: nowIso(), temperature: 63 },
    { code: 'UZ', divergence: 58, article_count: 211, last_updated: nowIso(), temperature: 46 },
    { code: 'GE', divergence: 82, article_count: 401, last_updated: nowIso(), temperature: 72 },
  ];

  if (mode === 'partial') {
    return [
      { code: 'KZ', divergence: 74, article_count: 312, last_updated: nowIso(), temperature: 63 },
      { code: 'UZ', divergence: 0, article_count: 0, last_updated: null, temperature: null },
    ];
  }

  if (mode === 'empty') return [];
  if (mode === 'stale') return base.map((c) => ({ ...c, last_updated: staleIso() }));
  return base;
}

function eventsFor(countryCode, mode) {
  const base = [
    { title: `${countryCode}: Gas transit negotiations resume`, published_at: nowIso(), sentiment: 0.2, source: 'LiveWire', action_level: 3 },
    { title: `${countryCode}: Regional summit statement`, published_at: new Date(Date.now() - 3600e3).toISOString(), sentiment: -0.1, source: 'CIS Monitor', action_level: 2 },
    { title: `${countryCode}: Currency settlement update`, published_at: new Date(Date.now() - 7200e3).toISOString(), sentiment: 0.3, source: 'Policy Desk', action_level: 2 },
  ];

  if (mode === 'partial') {
    return [
      { ...base[0] },
      { ...base[1], published_at: null },
      { ...base[2], title: '' },
    ];
  }

  if (mode === 'empty') return [];
  if (mode === 'stale') return base.map((e) => ({ ...e, published_at: staleIso() }));
  return base;
}

const server = http.createServer(async (req, res) => {
  const mode = await getMode();
  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  if (mode === 'slow') {
    await new Promise((r) => setTimeout(r, 8500));
  }

  if (url.pathname === '/api/v1/countries') {
    return json(res, 200, { countries: countries(mode) });
  }

  const m = url.pathname.match(/^\/api\/v1\/countries\/([A-Z]{2})\/events$/i);
  if (m) {
    return json(res, 200, { events: eventsFor(m[1].toUpperCase(), mode) });
  }

  return json(res, 404, { error: 'not found', mode });
});

server.listen(PORT, () => {
  console.log(`mock-geopulse-upstream listening on :${PORT}`);
});