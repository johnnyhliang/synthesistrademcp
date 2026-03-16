/**
 * Smoke test for HTTP MCP transport.
 * Starts server-http on a random port and tests via fetch.
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
    } catch { /* server not ready yet */ }
    await new Promise(r => setTimeout(r, 300));
  }
  throw new Error('Server did not start in time');
}

async function mcpPost(port: number, method: string, params: unknown = {}, id: number = 1, extraHeaders: Record<string, string> = {}): Promise<unknown> {
  const res = await fetch(`http://127.0.0.1:${port}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream', ...extraHeaders },
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
        } catch { /* skip non-JSON lines */ }
      }
    }
    throw new Error(`No matching SSE response for id=${id}`);
  }

  return res.json();
}

async function main() {
  console.log('=== HTTP Transport Test ===\n');

  const port = 30000 + Math.floor(Math.random() * 10000);

  const proc = spawn('node', [SERVER_PATH], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, PORT: String(port), SYNTHESIS_API_KEY: '' },
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

    // 1. Health check
    console.log('Test: GET /health');
    const healthRes = await fetch(`http://127.0.0.1:${port}/health`);
    assert(healthRes.status === 200, 'GET /health returns 200');
    const health = await healthRes.json() as { status: string };
    assert(health.status === 'ok', 'health status is ok');

    // 2. Initialize + tools/list
    console.log('Test: POST /mcp initialize');
    const initRes = await mcpPost(port, 'initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'test-http', version: '1.0.0' },
    }, 1) as { result?: { serverInfo?: { name: string } } };
    assert(!!initRes.result, 'initialize returns result');

    console.log('Test: POST /mcp tools/list');
    const toolsRes = await mcpPost(port, 'tools/list', {}, 2) as {
      result?: { tools?: { name: string }[] };
    };
    const tools = toolsRes.result?.tools ?? [];
    assert(tools.length > 0, `tools/list returns ${tools.length} tools`);
    assert(tools.some(t => t.name === 'list_markets'), 'has list_markets');

    // 3. Call list_markets
    console.log('Test: POST /mcp tools/call list_markets');
    const callRes = await mcpPost(port, 'tools/call', {
      name: 'list_markets',
      arguments: { limit: 2 },
    }, 3) as {
      result?: { content?: { type: string; text: string }[] };
    };
    const content = callRes.result?.content?.[0];
    assert(content?.type === 'text', 'list_markets returns text content');
    if (content?.text) {
      try {
        const data = JSON.parse(content.text);
        assert(Array.isArray(data), `list_markets returned array with ${data.length} items`);
      } catch {
        assert(false, `list_markets returned parseable JSON (got: ${content.text.slice(0, 80)}...)`);
      }
    }

    // 4. Tier 2 without auth
    console.log('Test: POST /mcp tools/call get_recommendations (no auth)');
    const tier2Res = await mcpPost(port, 'tools/call', {
      name: 'get_recommendations',
      arguments: {},
    }, 4) as {
      result?: { isError?: boolean; content?: { text: string }[] };
      error?: { message: string };
    };
    const isErr = tier2Res.result?.isError || tier2Res.error;
    assert(!!isErr, 'Tier 2 without auth returns error');

    // 5. GET /mcp should be 405
    console.log('Test: GET /mcp → 405');
    const getRes = await fetch(`http://127.0.0.1:${port}/mcp`);
    assert(getRes.status === 405, `GET /mcp returns ${getRes.status}`);

    // 6. CORS headers
    console.log('Test: CORS headers present');
    const corsRes = await fetch(`http://127.0.0.1:${port}/health`);
    const allowOrigin = corsRes.headers.get('access-control-allow-origin');
    assert(allowOrigin === '*', `Access-Control-Allow-Origin: ${allowOrigin}`);

    // 7. OPTIONS preflight
    console.log('Test: OPTIONS /mcp → 204 with CORS headers');
    const optionsRes = await fetch(`http://127.0.0.1:${port}/mcp`, { method: 'OPTIONS' });
    assert(optionsRes.status === 204, `OPTIONS /mcp returns ${optionsRes.status}`);
    const allowMethods = optionsRes.headers.get('access-control-allow-methods');
    assert(!!allowMethods && allowMethods.includes('POST'), `Allow-Methods includes POST: ${allowMethods}`);
    const allowHeaders = optionsRes.headers.get('access-control-allow-headers');
    assert(!!allowHeaders && allowHeaders.includes('X-User-Api-Key'), `Allow-Headers includes X-User-Api-Key: ${allowHeaders}`);

    // 8. Request size limit (send > 1MB body)
    console.log('Test: POST /mcp with > 1MB body → 413');
    const bigBody = 'x'.repeat(1_100_000);
    const bigRes = await fetch(`http://127.0.0.1:${port}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': String(bigBody.length) },
      body: bigBody,
    });
    assert(bigRes.status === 413, `Large body returns ${bigRes.status}`);

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
