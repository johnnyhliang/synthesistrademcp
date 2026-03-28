# mcp-server-synthesis

[![npm version](https://img.shields.io/npm/v/mcp-server-synthesis)](https://www.npmjs.com/package/mcp-server-synthesis)
[![CI](https://github.com/liang/mcp-server-synthesis/actions/workflows/ci.yml/badge.svg)](https://github.com/liang/mcp-server-synthesis/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

MCP server for [synthesis.trade](https://synthesis.trade) prediction markets. Covers Polymarket and Kalshi. 38 tools, two tiers -- public data works without a key.

## Install

```bash
npx mcp-server-synthesis                          # just run it
npm install -g mcp-server-synthesis               # or install globally
SYNTHESIS_API_KEY=sk_... npx mcp-server-synthesis  # with auth for tier 2
```

From source:

```bash
git clone https://github.com/liang/mcp-server-synthesis
cd mcp-server-synthesis && npm install && npm run build
node dist/mcp/server.js
```

Docker:

```bash
docker build -t mcp-server-synthesis .
docker run -e SYNTHESIS_API_KEY=sk_... -p 3000:3000 mcp-server-synthesis
```

## Setup

### Claude Code

```bash
claude mcp add synthesis -- npx mcp-server-synthesis

# with API key
claude mcp add synthesis -e SYNTHESIS_API_KEY=sk_... -- npx mcp-server-synthesis
```

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "synthesis": {
      "command": "npx",
      "args": ["-y", "mcp-server-synthesis"],
      "env": {
        "SYNTHESIS_API_KEY": "sk_..."
      }
    }
  }
}
```

### HTTP mode

```bash
npm run start:http          # default port 3000
PORT=8080 npm run start:http
```

Endpoints: `POST /mcp` (JSON-RPC), `GET /health`, `OPTIONS` for CORS preflight.

Multi-user: clients pass `X-User-Api-Key: sk_...` header per request. Keys are never logged or stored.

## Auth

Get your key at [synthesis.trade](https://synthesis.trade) account settings. You want the `sk_` (secret) key, not the `pk_` (project) key.

| Variable | Description |
|----------|-------------|
| `SYNTHESIS_API_KEY` | Your `sk_...` key. Unlocks tier 2 tools. |
| `SYNTHESIS_AUTH_MODE` | `account` (default), `project`, or `session` |
| `SYNTHESIS_BASE_URL` | Override API URL (default: `https://synthesis.trade/api/v1`) |
| `LOG_LEVEL` | `error`, `warn`, `info` (default), `debug` |
| `PORT` | HTTP server port (default: `3000`) |

Trading env vars (`ENABLE_TRADING`, `TRADING_CONFIRMATION_PHRASE`, `MAX_ORDER_SIZE_USDC`) exist but trading endpoints are dormant upstream.

## Tools

### Tier 1 -- Public (28 tools, no key)

**Markets**

| Tool | What it does |
|------|-------------|
| `list_markets` | List markets from both venues. Filter by price, tags, live status. |
| `search_markets` | Full-text search across market titles. |
| `get_historical_orderbooks` | Orderbook snapshots over time with bucketing. |
| `get_market_statistics` | Platform-wide stats by venue and interval. |
| `get_related_markets` | Markets related to an event slug. |
| `get_similar_markets` | Cross-venue similar markets (arbitrage discovery). |
| `get_arbitrage_pairs` | Cross-venue pairs ranked by arb opportunity. |

**Polymarket**

| Tool | What it does |
|------|-------------|
| `list_polymarket_markets` | List and sort Polymarket markets. |
| `get_polymarket_market` | Event + outcomes by condition ID (`0x...`). |
| `get_polymarket_market_by_slug` | Event by URL slug. |
| `get_polymarket_price_history` | OHLC candles for a token. |
| `get_polymarket_trades` | Recent trades (up to 1000). |
| `get_polymarket_statistics` | Price change, high/low for a token. |

**Kalshi**

| Tool | What it does |
|------|-------------|
| `list_kalshi_markets` | List and sort Kalshi markets. |
| `get_kalshi_market` | Market by ID (e.g. `KXPRESNOMD-28-GN`). |
| `get_kalshi_event` | Event + child markets. |
| `get_kalshi_market_by_slug` | Event by slug. |
| `get_kalshi_trades` | Recent trades (up to 1000). |
| `get_kalshi_holders` | Token holder distribution. |
| `get_kalshi_statistics` | Price change, high/low. |
| `get_kalshi_price_history` | Historical prices with bucketing. |
| `get_kalshi_candlesticks` | OHLCV candles. |
| `get_kalshi_leaderboard` | Platform leaderboard. |
| `get_kalshi_user` | Public profile by username. |

**News**

| Tool | What it does |
|------|-------------|
| `get_news` | Recent news matched to markets. |
| `get_event_news` | News for a specific event. |
| `get_market_news` | News for a specific market. |

### Tier 2 -- Authenticated (10 tools, needs `sk_` key)

| Tool | What it does |
|------|-------------|
| `get_account_session` | Check auth status. |
| `get_api_keys` | List account API keys. |
| `get_interests` | Get interest tags. |
| `update_interests` | Set interest tags (1-10). |
| `get_recommendations` | Personalized market recs. |
| `get_wallets` | List wallets (auto-creates first). |
| `create_wallet` | New multi-chain wallet. |
| `update_wallet` | Update name or autoredeem. |
| `delete_wallet` | Delete wallet (balances must be zero). |
| `reorder_wallets` | Reorder wallet display. |
| `export_wallet` | Export encrypted private key (needs HPKE public key). |

### Not registered

These are implemented in `src/api/` but not exposed because the upstream API returns errors:

- `get_market_prices`, `get_orderbooks`, `get_sparklines` -- batch POST, upstream returns 400
- `get_polygon_balances`, `get_polygon_orders`, `get_polygon_swaps` -- 404
- `place_order`, `cancel_order`, `swap`, `withdraw` -- 404

## Internals

**Caching**: GET responses cached 60s in memory. Cache keys include auth fingerprint so users can't see each other's data. 1000 entry cap with LRU eviction. Writes (POST/PUT/DELETE) invalidate related cache entries.

**Trimming**: Responses are stripped of fields the LLM doesn't need (`description`, `image`, `rewards`, timestamps, etc). Nested market arrays capped at 5. Compact JSON. Hard limit 30K chars. Typical reduction is ~93%.

**HTTP hardening**: CORS enabled, 60 req/min per IP rate limit, 1MB body limit, deep health check (probes upstream with 5s timeout, caches 30s), graceful shutdown on SIGTERM/SIGINT with 10s drain.

**Logging**: Structured JSON to stderr. Logs upstream calls, MCP requests, rate limiting, shutdown. Never logs bodies or keys.

**Retry**: 3 retries with exponential backoff on 429/5xx. 30s timeout on all upstream calls.

**Trading safety**: 6-layer system (env gate, confirmation phrase, per-call confirm string, per-call phrase, amount cap, API-layer check). Currently dormant since upstream returns 404.

## Testing

```bash
npm test                # all 40 assertions
npm run test:cache      # cache isolation, size limits, expiry (12)
npm run test:stdio      # stdio transport + MCP handshake (9)
npm run test:http       # HTTP transport, CORS, rate limits (14)
npm run test:multiuser  # per-request auth isolation (5)
npm run api:check       # probe all tier 1 endpoints
```

All tests use public endpoints, no key needed.

## Known issues

- Batch POST endpoints (`get_market_prices`, `get_orderbooks`, `get_sparklines`) return 400 -- request format is undocumented
- All `/polygon/*` routes return 404 -- not publicly available yet
- `pk_` (project) keys don't work with tier 2 account endpoints -- use `sk_` keys
- HTTP server binds `0.0.0.0` without host validation -- put behind a reverse proxy in production
- Each HTTP request creates a fresh MCP server instance -- fine for moderate traffic
- No TLS -- needs a reverse proxy for HTTPS

## Development

```bash
npm run dev          # stdio with tsx (no build)
npm run dev:http     # HTTP with tsx
npm run build        # compile to dist/
npm test             # run tests
```

Adding a tool: write the API function in `src/api/`, add types in `src/types/index.ts`, register in the appropriate tier file under `src/mcp/tools/`, wrap the response with `summarize()`.

Releasing:

```bash
npm version patch && git push --follow-tags   # CI publishes to npm
```
