/**
 * API endpoint health probe.
 * Tests all Tier 1 endpoints with minimal requests and reports status.
 * Saves results to api-manifest.json for drift detection.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE_URL = process.env.SYNTHESIS_BASE_URL ?? 'https://synthesis.trade/api/v1';
const TIMEOUT_MS = 15_000;

interface EndpointResult {
  endpoint: string;
  method: string;
  status: number | 'timeout' | 'error';
  ok: boolean;
  latencyMs: number;
  error?: string;
}

const TIER1_ENDPOINTS: { method: string; path: string; body?: unknown }[] = [
  { method: 'GET', path: 'markets?limit=1' },
  { method: 'GET', path: 'markets/search/bitcoin?limit=1' },
  { method: 'GET', path: 'markets/statistics' },
  { method: 'GET', path: 'markets/similar-pairs?limit=1' },
  { method: 'POST', path: 'markets/prices', body: { markets: ['placeholder'] } },
  { method: 'POST', path: 'markets/orderbooks', body: { markets: ['placeholder'] } },
  { method: 'POST', path: 'markets/sparklines', body: { markets: ['placeholder'] } },
  { method: 'GET', path: 'polymarket/markets?limit=1' },
  { method: 'GET', path: 'kalshi/markets?limit=1' },
  { method: 'GET', path: 'kalshi/leaderboard?limit=1' },
  { method: 'GET', path: 'news?limit=1' },
];

async function probeEndpoint(ep: typeof TIER1_ENDPOINTS[0]): Promise<EndpointResult> {
  const url = `${BASE_URL}/${ep.path}`;
  const start = Date.now();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(url, {
      method: ep.method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'synthesismcp-healthcheck/1.0',
      },
      body: ep.body ? JSON.stringify(ep.body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timer);
    const latencyMs = Date.now() - start;

    return {
      endpoint: `${ep.method} ${ep.path.split('?')[0]}`,
      method: ep.method,
      status: res.status,
      ok: res.status >= 200 && res.status < 400,
      latencyMs,
    };
  } catch (err) {
    const latencyMs = Date.now() - start;
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    return {
      endpoint: `${ep.method} ${ep.path.split('?')[0]}`,
      method: ep.method,
      status: isTimeout ? 'timeout' : 'error',
      ok: false,
      latencyMs,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function main() {
  console.log('=== API Endpoint Health Check ===\n');
  console.log(`Base URL: ${BASE_URL}\n`);

  const results: EndpointResult[] = [];

  for (const ep of TIER1_ENDPOINTS) {
    const result = await probeEndpoint(ep);
    results.push(result);

    const icon = result.ok ? '✓' : '✗';
    const status = typeof result.status === 'number' ? result.status : result.status;
    console.log(`  ${icon} ${result.endpoint} → ${status} (${result.latencyMs}ms)`);
    if (result.error) {
      console.log(`    Error: ${result.error}`);
    }
  }

  const working = results.filter(r => r.ok).length;
  const broken = results.filter(r => !r.ok).length;

  console.log(`\n${working} working, ${broken} broken out of ${results.length} endpoints`);

  // Save manifest
  const manifest = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    results,
    summary: { total: results.length, working, broken },
  };

  const outPath = resolve(import.meta.dirname!, '..', 'api-manifest.json');
  writeFileSync(outPath, JSON.stringify(manifest, null, 2));
  console.log(`\nManifest saved to ${outPath}`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
