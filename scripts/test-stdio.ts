/**
 * Smoke test for stdio MCP transport.
 * Spawns the compiled server and sends JSON-RPC messages over stdin/stdout.
 */
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const SERVER_PATH = resolve(import.meta.dirname!, '..', 'dist', 'mcp', 'server.js');
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

async function sendRpc(
  proc: ReturnType<typeof spawn>,
  method: string,
  params: unknown = {},
  id: number = 1
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const msg = JSON.stringify({ jsonrpc: '2.0', method, params, id }) + '\n';
    let buf = '';
    const timeout = setTimeout(() => reject(new Error(`Timeout waiting for response to ${method}`)), 30_000);

    const onData = (chunk: Buffer) => {
      buf += chunk.toString();
      // Try to parse complete JSON-RPC responses from buffer
      const lines = buf.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.id === id) {
            clearTimeout(timeout);
            proc.stdout!.off('data', onData);
            resolve(parsed);
            return;
          }
        } catch { /* incomplete line, keep buffering */ }
      }
    };

    proc.stdout!.on('data', onData);
    proc.stdin!.write(msg);
  });
}

async function main() {
  console.log('=== Stdio Transport Test ===\n');

  // Spawn server with no API key (Tier 1 only)
  const proc = spawn('node', [SERVER_PATH], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, SYNTHESIS_API_KEY: '' },
  });

  proc.stderr!.on('data', (chunk: Buffer) => {
    process.stderr.write(`  [server] ${chunk.toString()}`);
  });

  // Give server a moment to start
  await new Promise(r => setTimeout(r, 500));

  try {
    // 1. Initialize
    console.log('Test: initialize');
    const initRes = await sendRpc(proc, 'initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' },
    }, 1) as { id: number; result?: { serverInfo?: { name: string } } };
    assert(!!initRes.result, 'initialize returns result');
    assert(initRes.result?.serverInfo?.name === 'synthesis', 'server name is "synthesis"');

    // Send initialized notification (no id)
    proc.stdin!.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
    await new Promise(r => setTimeout(r, 200));

    // 2. List tools
    console.log('Test: tools/list');
    const toolsRes = await sendRpc(proc, 'tools/list', {}, 2) as {
      result?: { tools?: { name: string }[] };
    };
    const tools = toolsRes.result?.tools ?? [];
    assert(tools.length > 0, `tools/list returns ${tools.length} tools`);
    assert(tools.some(t => t.name === 'list_markets'), 'has list_markets tool');
    assert(tools.some(t => t.name === 'search_markets'), 'has search_markets tool');
    assert(tools.some(t => t.name === 'get_recommendations'), 'has get_recommendations (Tier 2)');

    // 3. Call Tier 1 tool: list_markets with limit=2
    console.log('Test: tools/call list_markets');
    const callRes = await sendRpc(proc, 'tools/call', {
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
        // API returned an error string — still valid, just not market data
        assert(false, `list_markets returned parseable JSON (got: ${content.text.slice(0, 80)}...)`);
      }
    }

    // 4. Call Tier 2 tool without auth — should return error text, not crash
    console.log('Test: tools/call get_recommendations (no auth)');
    const tier2Res = await sendRpc(proc, 'tools/call', {
      name: 'get_recommendations',
      arguments: {},
    }, 4) as {
      result?: { content?: { type: string; text: string }[]; isError?: boolean };
      error?: { message: string };
    };
    // Should get an error response (either isError content or JSON-RPC error), not a crash
    const isErrorResponse = tier2Res.result?.isError || tier2Res.error;
    assert(!!isErrorResponse, 'Tier 2 tool without auth returns error (not crash)');

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
