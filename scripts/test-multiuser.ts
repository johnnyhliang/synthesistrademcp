/**
 * Smoke test for multi-user HTTP mode.
 * Starts HTTP server with NO SYNTHESIS_API_KEY, tests per-request key isolation.
 */
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const SERVER_PATH = resolve(import.meta.dirname!, '..', 'dist', 'mcp', 'server-http.js');
let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ ${msg}`);
    failed++;
  }
}

async function waitForServer(port: number, timeoutMs = 15_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`);
      if (res.ok) return;
    } catch { /* not ready */ }
    await new Promise(r => setTimeout(r, 300));
  }
  throw new Error('Server did not start in time');
}

async function mcpPost(
  port: number,
  method: string,
  params: unknown = {},
  id: number = 1,
  headers: Record<string, string> = {}
): Promise<unknown> {
  const res = await fetch(`http://127.0.0.1:${port}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      ...headers,
    },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id }),
  });

  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('text/event-stream')) {
    const text = await res.text();
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const parsed = JSON.parse(line.slice(6));
          if (parsed.id === id) return parsed;
        } catch { /* skip */ }
      }
    }
    throw new Error(`No matching SSE response for id=${id}`);
  }

  return res.json();
}

async function main() {
  console.log('=== Multi-User Mode Test ===\n');

  const port = 30000 + Math.floor(Math.random() * 10000);

  // Start server with NO API key — multi-user mode
  const proc = spawn('node', [SERVER_PATH], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      PORT: String(port),
      SYNTHESIS_API_KEY: '',  // explicitly empty
    },
  });

  proc.stderr!.on('data', (chunk: Buffer) => {
    process.stderr.write(`  [server] ${chunk.toString()}`);
  });

  proc.on('error', (err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });

  try {
    await waitForServer(port);

    // 1. Tier 1 works without any key
    console.log('Test: Tier 1 works without key');
    await mcpPost(port, 'initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'test-multiuser', version: '1.0.0' },
    }, 1);

    const t1Res = await mcpPost(port, 'tools/call', {
      name: 'list_markets',
      arguments: { limit: 1 },
    }, 2) as { result?: { content?: { type: string; text: string }[] } };
    assert(!!t1Res.result?.content?.[0]?.text, 'Tier 1 list_markets works without key');

    // 2. Tier 2 without X-User-Api-Key → auth error
    console.log('Test: Tier 2 without key → error');
    await mcpPost(port, 'initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'test-multiuser', version: '1.0.0' },
    }, 3);

    const t2NoKey = await mcpPost(port, 'tools/call', {
      name: 'get_recommendations',
      arguments: {},
    }, 4) as { result?: { isError?: boolean }; error?: unknown };
    assert(
      !!(t2NoKey.result?.isError || t2NoKey.error),
      'Tier 2 without key returns error'
    );

    // 3. Tier 2 with invalid X-User-Api-Key → API error (not crash)
    console.log('Test: Tier 2 with invalid key → API error (not crash)');
    await mcpPost(port, 'initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'test-multiuser', version: '1.0.0' },
    }, 5, { 'X-User-Api-Key': 'invalid-key-12345' });

    const t2Bad = await mcpPost(port, 'tools/call', {
      name: 'get_recommendations',
      arguments: {},
    }, 6, { 'X-User-Api-Key': 'invalid-key-12345' }) as {
      result?: { isError?: boolean; content?: { text: string }[] };
      error?: unknown;
    };
    const isBadKeyError = t2Bad.result?.isError || t2Bad.error;
    assert(!!isBadKeyError, 'Tier 2 with invalid key returns error (not crash)');

    // 4. Key isolation: two different fake keys → independent
    console.log('Test: Key isolation');
    const key1 = 'fake-key-user-1';
    const key2 = 'fake-key-user-2';

    await mcpPost(port, 'initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'user1', version: '1.0.0' },
    }, 7, { 'X-User-Api-Key': key1 });

    await mcpPost(port, 'initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'user2', version: '1.0.0' },
    }, 8, { 'X-User-Api-Key': key2 });

    // Both should get errors (fake keys), but independently — server shouldn't crash
    const r1 = await mcpPost(port, 'tools/call', {
      name: 'get_account_session',
      arguments: {},
    }, 9, { 'X-User-Api-Key': key1 });
    const r2 = await mcpPost(port, 'tools/call', {
      name: 'get_account_session',
      arguments: {},
    }, 10, { 'X-User-Api-Key': key2 });
    assert(!!r1 && !!r2, 'Both users get responses (no crash from key isolation)');

    // Verify server is still healthy after all the bad keys
    const healthRes = await fetch(`http://127.0.0.1:${port}/health`);
    assert(healthRes.status === 200, 'Server still healthy after bad key tests');

  } finally {
    proc.kill('SIGTERM');
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
