#!/usr/bin/env node
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { SynthesisClient } from '../api/client.js';
import { createMcpServerWithTools } from './create-server.js';
import type { IncomingMessage, ServerResponse } from 'node:http';

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const MAX_BODY_BYTES = 1_048_576; // 1 MB
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 60;

// ── Rate limiter (sliding window, per IP) ──────────────────────────────────────

const rateBuckets = new Map<string, number[]>();

function getRateKey(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress ?? 'unknown';
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  let timestamps = rateBuckets.get(ip);
  if (!timestamps) {
    timestamps = [];
    rateBuckets.set(ip, timestamps);
  }
  // Remove timestamps outside the window
  while (timestamps.length > 0 && timestamps[0] < now - RATE_WINDOW_MS) {
    timestamps.shift();
  }
  if (timestamps.length >= RATE_MAX_REQUESTS) {
    const retryAfter = Math.ceil((timestamps[0] + RATE_WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfter };
  }
  timestamps.push(now);
  return { allowed: true };
}

// Clean up stale rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of rateBuckets) {
    while (timestamps.length > 0 && timestamps[0] < now - RATE_WINDOW_MS) {
      timestamps.shift();
    }
    if (timestamps.length === 0) rateBuckets.delete(ip);
  }
}, 300_000).unref();

// ── CORS headers ───────────────────────────────────────────────────────────────

function setCorsHeaders(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, X-User-Api-Key');
  res.setHeader('Access-Control-Max-Age', '86400');
}

// ── Body size check ────────────────────────────────────────────────────────────

function checkBodySize(req: IncomingMessage): boolean {
  const contentLength = req.headers['content-length'];
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) return false;
  return true;
}

// ── Server setup ───────────────────────────────────────────────────────────────

const app = createMcpExpressApp({ host: '0.0.0.0' });

// CORS preflight handlers
function handlePreflight(_req: unknown, res: ServerResponse) {
  setCorsHeaders(res);
  res.writeHead(204);
  res.end();
}
app.options('/mcp', handlePreflight);
app.options('/health', handlePreflight);

// Health endpoint
app.get('/health', (_req: unknown, res: ServerResponse & { json: (body: unknown) => void }) => {
  setCorsHeaders(res);
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// MCP endpoint — stateless: each POST creates a fresh server + transport
app.post('/mcp', async (req: IncomingMessage & { body?: unknown; headers: Record<string, string | string[] | undefined> }, res: ServerResponse) => {
  setCorsHeaders(res);

  // Rate limit check
  const ip = getRateKey(req);
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    res.writeHead(429, {
      'Content-Type': 'application/json',
      'Retry-After': String(rateCheck.retryAfter),
    });
    res.end(JSON.stringify({ error: 'Too many requests', retry_after: rateCheck.retryAfter }));
    return;
  }

  // Body size check
  if (!checkBodySize(req)) {
    res.writeHead(413, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Request body too large (max 1MB)' }));
    return;
  }

  try {
    // Pass-through auth: prefer X-User-Api-Key header, fall back to env var
    const userApiKey = req.headers['x-user-api-key'] as string | undefined;
    const client = new SynthesisClient(userApiKey ? { apiKey: userApiKey } : undefined);
    const server = createMcpServerWithTools(client);

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    await transport.close();
    await server.close();
  } catch (err) {
    process.stderr.write(`[synthesis-http] Error handling POST /mcp: ${err}\n`);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }
});

// Reject GET and DELETE on /mcp (stateless mode — no SSE streams)
app.get('/mcp', (_req: unknown, res: ServerResponse) => {
  setCorsHeaders(res);
  res.writeHead(405, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Method not allowed. Use POST for stateless mode.' }));
});

app.delete('/mcp', (_req: unknown, res: ServerResponse) => {
  setCorsHeaders(res);
  res.writeHead(405, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Method not allowed. Use POST for stateless mode.' }));
});

const httpServer = app.listen(PORT, '0.0.0.0', () => {
  process.stderr.write(`[synthesis-http] MCP HTTP server listening on http://0.0.0.0:${PORT}\n`);
  process.stderr.write(`[synthesis-http] POST /mcp — MCP endpoint\n`);
  process.stderr.write(`[synthesis-http] GET /health — Health check\n`);
  process.stderr.write(`[synthesis-http] Rate limit: ${RATE_MAX_REQUESTS} req/min per IP\n`);
  process.stderr.write(`[synthesis-http] Max body: ${MAX_BODY_BYTES / 1024}KB\n`);
});

function shutdown() {
  process.stderr.write('[synthesis-http] Shutting down...\n');
  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
