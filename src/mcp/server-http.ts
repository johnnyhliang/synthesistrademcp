#!/usr/bin/env node
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { SynthesisClient } from '../api/client.js';
import { createMcpServerWithTools } from './create-server.js';
import { log } from '../utils/logger.js';
import type { IncomingMessage, ServerResponse } from 'node:http';

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const MAX_BODY_BYTES = 1_048_576;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 60;
const HEALTH_CACHE_TTL_MS = 30_000;
const startTime = Date.now();

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

const rateLimitCleanup = setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of rateBuckets) {
    while (timestamps.length > 0 && timestamps[0] < now - RATE_WINDOW_MS) {
      timestamps.shift();
    }
    if (timestamps.length === 0) rateBuckets.delete(ip);
  }
}, 300_000);
rateLimitCleanup.unref();

function setCorsHeaders(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, X-User-Api-Key');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function checkBodySize(req: IncomingMessage): boolean {
  const contentLength = req.headers['content-length'];
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) return false;
  return true;
}

let healthCache: { result: Record<string, unknown>; expires: number } | null = null;

async function deepHealthCheck(): Promise<{ status: string; httpCode: number; body: Record<string, unknown> }> {
  const now = Date.now();
  const uptime_s = Math.floor((now - startTime) / 1000);

  if (healthCache && now < healthCache.expires) {
    return { status: healthCache.result.status as string, httpCode: healthCache.result.status === 'ok' ? 200 : 503, body: healthCache.result };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch('https://synthesis.trade/api/v1/markets?limit=1', { signal: controller.signal });
    clearTimeout(timer);

    const result = {
      status: res.ok ? 'ok' : 'degraded',
      upstream: res.ok ? 'ok' : `error_${res.status}`,
      tools: 38,
      uptime_s,
      timestamp: new Date().toISOString(),
    };
    healthCache = { result, expires: now + HEALTH_CACHE_TTL_MS };
    return { status: result.status, httpCode: res.ok ? 200 : 503, body: result };
  } catch {
    const result = {
      status: 'degraded',
      upstream: 'unreachable',
      tools: 38,
      uptime_s,
      timestamp: new Date().toISOString(),
    };
    healthCache = { result, expires: now + HEALTH_CACHE_TTL_MS };
    return { status: 'degraded', httpCode: 503, body: result };
  }
}

const app = createMcpExpressApp({ host: '0.0.0.0' });

function handlePreflight(_req: unknown, res: ServerResponse) {
  setCorsHeaders(res);
  res.writeHead(204);
  res.end();
}
app.options('/mcp', handlePreflight);
app.options('/health', handlePreflight);

app.get('/health', async (req: IncomingMessage & { query?: Record<string, string> }, res: ServerResponse & { json: (body: unknown) => void }) => {
  setCorsHeaders(res);
  const url = new URL(req.url ?? '/', `http://localhost`);
  const shallow = url.searchParams.get('shallow') === 'true';

  if (shallow) {
    res.json({ status: 'ok', tools: 38, uptime_s: Math.floor((Date.now() - startTime) / 1000), timestamp: new Date().toISOString() });
    return;
  }

  const check = await deepHealthCheck();
  res.writeHead(check.httpCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(check.body));
});

app.post('/mcp', async (req: IncomingMessage & { body?: unknown; headers: Record<string, string | string[] | undefined> }, res: ServerResponse) => {
  setCorsHeaders(res);
  const t0 = Date.now();
  const ip = getRateKey(req);

  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    log.warn('rate_limited', { ip, retry_after: rateCheck.retryAfter });
    res.writeHead(429, {
      'Content-Type': 'application/json',
      'Retry-After': String(rateCheck.retryAfter),
    });
    res.end(JSON.stringify({ error: 'Too many requests', retry_after: rateCheck.retryAfter }));
    return;
  }

  if (!checkBodySize(req)) {
    log.warn('body_too_large', { ip });
    res.writeHead(413, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Request body too large (max 1MB)' }));
    return;
  }

  try {
    const userApiKey = req.headers['x-user-api-key'] as string | undefined;
    const client = new SynthesisClient(userApiKey ? { apiKey: userApiKey } : undefined);
    const server = createMcpServerWithTools(client);

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    await transport.close();
    await server.close();
    log.info('mcp_request', { ip, duration_ms: Date.now() - t0 });
  } catch (err) {
    log.error('mcp_error', { ip, error: String(err), duration_ms: Date.now() - t0 });
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }
});

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
  log.info('server_start', {
    transport: 'http',
    port: PORT,
    rate_limit: `${RATE_MAX_REQUESTS} req/min`,
    max_body_kb: MAX_BODY_BYTES / 1024,
  });
});

let shuttingDown = false;

function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  log.info('shutdown_start', { signal });
  clearInterval(rateLimitCleanup);

  httpServer.close(() => {
    log.info('shutdown_complete', { signal });
    process.exit(0);
  });

  setTimeout(() => {
    log.warn('shutdown_forced', { signal, reason: 'drain timeout 10s' });
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
