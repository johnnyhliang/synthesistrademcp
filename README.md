# synthesis-mcp

An MCP (Model Context Protocol) server for [synthesis.trade](https://synthesis.trade) — a unified prediction markets data layer covering **Polymarket** and **Kalshi**.

Connect Claude (or any MCP-compatible AI) to real-time market data, price history, orderbooks, news, leaderboards, and wallet management. **38 tools** across three access tiers — all public data works without an API key.

---

## Table of Contents

- [What is MCP?](#what-is-mcp)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Authentication](#authentication)
- [Tools Reference](#tools-reference)
- [Tool Status (Verified)](#tool-status-verified)
- [Deployment](#deployment)
- [Architecture](#architecture)
- [Production Hardening](#production-hardening)
- [Performance & Token Efficiency](#performance--token-efficiency)
- [Testing](#testing)
- [Known Issues](#known-issues)
- [Development](#development)

---

## What is MCP?

Model Context Protocol (MCP) is Anthropic's open standard for connecting AI models to external tools and data sources. It uses JSON-RPC 2.0 — either over **stdio** (subprocess, local) or **HTTP** (remote).

When running as **stdio**, the server is a local subprocess spawned by Claude when needed. No hosting required — your API key never leaves your machine.

---

## Quick Start

```bash
# 1. Clone and install
git clone <this-repo>
cd synthesismcp
npm install

# 2. Build
npm run build

# 3. Add to Claude Code (works immediately — Tier 1 requires no key)
claude mcp add synthesis -- node /absolute/path/to/synthesismcp/dist/mcp/server.js

# 4. (Optional) Add your Synthesis API key for Tier 2 tools
claude mcp add synthesis \
  -e SYNTHESIS_API_KEY=sk_... \
  -- node /absolute/path/to/synthesismcp/dist/mcp/server.js
```

Then in Claude: *"What are the most liquid Polymarket markets right now?"*

---

## Configuration

### Claude Code (CLI)

```bash
# Tier 1 only (no key)
claude mcp add synthesis -- node /path/to/synthesismcp/dist/mcp/server.js

# Tier 1 + Tier 2 (with API key)
claude mcp add synthesis \
  -e SYNTHESIS_API_KEY=sk_... \
  -- node /path/to/synthesismcp/dist/mcp/server.js

# Note: Tier 3 trading tools are currently deregistered (upstream API returns 404).
# When Synthesis enables the trading API, re-enable in create-server.ts and use:
#   -e ENABLE_TRADING=true
#   -e TRADING_CONFIRMATION_PHRASE="my secret phrase"
#   -e MAX_ORDER_SIZE_USDC=50
```

View registered servers: `claude mcp list`

Remove: `claude mcp remove synthesis`

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "synthesis": {
      "command": "node",
      "args": ["/absolute/path/to/synthesismcp/dist/mcp/server.js"],
      "env": {
        "SYNTHESIS_API_KEY": "sk_...",
        "ENABLE_TRADING": "false"
      }
    }
  }
}
```

Restart Claude Desktop after editing.

### HTTP Server

```bash
# Start HTTP transport (for remote/hosted deployments)
npm run start:http

# Or in dev mode
npm run dev:http
```

Default port: 3000. Override with `PORT` env var.

---

## Authentication

### Getting Your API Key

1. Go to [synthesis.trade](https://synthesis.trade) and create an account
2. Navigate to your account settings / API keys section
3. Create a new API key — you'll receive two keys:
   - **Secret key** (`sk_...`) — This is your persistent account key. Use this in `.mcp.json`. It does not expire and grants access to all Tier 1 + Tier 2 endpoints.
   - **Public key** (`pk_...`) — This is for the project auth flow only. Do **not** use this for personal MCP access.
4. Copy your `sk_` key into `.mcp.json` (see `.mcp.json.example`) or pass it as `SYNTHESIS_API_KEY` env var

> **Which key do I use?** Use the `sk_` (secret) key. It persists across sessions and works with all account endpoints. The `pk_` (project) key is only for backend services using the `/project/*` API. Session tokens are short-lived and not suitable for MCP config.

### Auth Modes

The client supports three auth modes, set via `SYNTHESIS_AUTH_MODE`:

| Mode | Use case | Headers sent |
|------|----------|--------------|
| `account` (default) | Personal API key | `Authorization: Bearer sk_...` + `X-API-KEY: sk_...` |
| `project` | Backend service acting as a project | `X-PROJECT-API-KEY: pk_...` |
| `session` | Short-lived user session token | `Authorization: Bearer <token>` |

For personal use, the default `account` mode with `SYNTHESIS_API_KEY` is correct.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SYNTHESIS_API_KEY` | No (Tier 2+) | Your Synthesis secret key (`sk_...`) |
| `SYNTHESIS_PROJECT_API_KEY` | No (project mode) | Your Synthesis public key (`pk_...`) |
| `SYNTHESIS_AUTH_MODE` | No | `account` \| `project` \| `session` (default: `account`) |
| `SYNTHESIS_BASE_URL` | No | Override API base URL (default: `https://synthesis.trade/api/v1`) |
| `ENABLE_TRADING` | No | Set to `true` to register Tier 3 trading tools (currently dormant — upstream API returns 404) |
| `TRADING_CONFIRMATION_PHRASE` | No (Tier 3) | A secret phrase you choose. Must be set alongside `ENABLE_TRADING=true`. |
| `MAX_ORDER_SIZE_USDC` | No | Maximum allowed order/swap/withdraw amount in USDC (default: `100`). |
| `PORT` | No | HTTP server port (default: `3000`) |

---

## Tools Reference

### Tier 1 — Public (No Auth) — 28 tools

All tools in this tier work without any API key.

#### Markets (7 tools)

| Tool | Description |
|------|-------------|
| `list_markets` | List markets from Polymarket and/or Kalshi. Filter by price range, live status, tags, sort by liquidity/volume/ends_at. Up to 250 results. |
| `search_markets` | Full-text search across all market titles. Filter by venue, price, tags. Sort by probability/liquidity/closes soon. |
| `get_historical_orderbooks` | Orderbook snapshots for a single market over time. Supports time bucketing (30s, 5m, 1h, 1d) and up to 25,000 points. |
| `get_market_statistics` | Platform-wide stats (total markets, active, volume) by venue and interval (24h/1w/1m/6m/1y). |
| `get_related_markets` | Markets related by topic to a given event slug. |
| `get_similar_markets` | Cross-venue similar markets for a given market ID (useful for Polymarket <-> Kalshi arbitrage discovery). |
| `get_arbitrage_pairs` | Cross-venue market pairs ranked by arbitrage opportunity. |

#### Polymarket (6 tools)

| Tool | Description |
|------|-------------|
| `list_polymarket_markets` | List Polymarket markets. Sort by price, liquidity, volume (24hr/1wk/1mo/1yr), created_at, ends_at. |
| `get_polymarket_market` | Get a specific Polymarket event and all its outcome markets by condition ID (0x hex). |
| `get_polymarket_market_by_slug` | Get a Polymarket event by URL slug. |
| `get_polymarket_price_history` | Historical prices and OHLC candles for a Polymarket token. Intervals: 1h, 6h, 1d, 1w, 1m, all. |
| `get_polymarket_trades` | Recent trades for a Polymarket market. Up to 1000 trades. |
| `get_polymarket_statistics` | Aggregate statistics (price change, 24h high/low) for a Polymarket token. |

#### Kalshi (11 tools)

| Tool | Description |
|------|-------------|
| `list_kalshi_markets` | List Kalshi markets. Filter by category, sort by price, liquidity, volume. |
| `get_kalshi_market` | Get a specific Kalshi market by market ID (e.g. `KXPRESNOMD-28-GN`). |
| `get_kalshi_event` | Get a Kalshi event and all its child markets by event ID. |
| `get_kalshi_market_by_slug` | Get a Kalshi event by URL slug. |
| `get_kalshi_trades` | Recent trades for a Kalshi market. Up to 1000 trades. |
| `get_kalshi_holders` | Token holder distribution for a Kalshi market. |
| `get_kalshi_statistics` | Aggregate statistics (price change, high/low) for a Kalshi market. |
| `get_kalshi_price_history` | Historical price data with time bucketing. Requires `series_id` and `kalshi_id`. |
| `get_kalshi_candlesticks` | OHLCV candlestick data for a Kalshi market. |
| `get_kalshi_leaderboard` | Kalshi platform leaderboard. Sort by volume or other metrics. |
| `get_kalshi_user` | Public profile and trading metrics for a Kalshi username. |

#### News (3 tools)

| Tool | Description |
|------|-------------|
| `get_news` | Recent news articles matched to prediction markets. |
| `get_event_news` | News articles related to a specific event ID. |
| `get_market_news` | News articles related to a specific market ID. |

---

### Tier 2 — Account (API Key Required) — 10 tools

Requires `SYNTHESIS_API_KEY` set in the server config.

#### Account (5 tools)

| Tool | Description |
|------|-------------|
| `get_account_session` | Verify authentication status and inspect the current session. |
| `get_api_keys` | List all API keys associated with the authenticated account. |
| `get_interests` | Get account interest tags used for personalized recommendations. |
| `update_interests` | Update account interest tags (1-10 tags, each 2-20 characters). |
| `get_recommendations` | Personalized market recommendations based on account interests. |

#### Wallets (5 tools)

| Tool | Description |
|------|-------------|
| `get_wallets` | List wallets for the account. Auto-creates the first wallet if none exist. |
| `create_wallet` | Create a new multi-chain wallet (Polygon + Solana). |
| `update_wallet` | Update a wallet's name or `autoredeem` setting. |
| `delete_wallet` | Delete a wallet. All chain balances must be zero first. |
| `reorder_wallets` | Reorder wallets by position. Pass wallet IDs in desired display order. |

#### Wallet Export (1 tool)

| Tool | Description |
|------|-------------|
| `export_wallet` | Export a wallet's encrypted private key material. **Security warning**: returns sensitive cryptographic data. Requires an HPKE public key for encryption. |

---

### Deregistered Tools (Not Available)

The following tools are **not registered** because the upstream Synthesis API returns errors for them. The API functions remain in `src/api/` for when Synthesis enables these endpoints.

| Tool | Reason | API Error |
|------|--------|-----------|
| `get_market_prices` | Batch POST — undocumented body format | `400 "Invalid markets"` |
| `get_orderbooks` | Batch POST — undocumented body format | `400 "Invalid markets"` |
| `get_sparklines` | Batch POST — undocumented body format | `400 "Invalid markets"` |
| `get_polygon_balances` | Polygon API not public | `404 Not Found` |
| `get_polygon_orders` | Polygon API not public | `404 Not Found` |
| `get_polygon_swaps` | Polygon API not public | `404 Not Found` |
| `place_order` | Polygon API not public | `404 Not Found` |
| `cancel_order` | Polygon API not public | `404 Not Found` |
| `swap` | Polygon API not public | `404 Not Found` |
| `withdraw` | Polygon API not public | `404 Not Found` |

When Synthesis enables these endpoints, re-add them by uncommenting in `create-server.ts` and the respective tier files. The trading safety layers (6-layer defense) are already implemented in `tier3.ts` and `client.ts`.

---

## Tool Status (Verified)

Tested 2026-03-16 against live API.

### Tier 1 — All 28 registered tools working

| Tool | Status | Notes |
|------|--------|-------|
| `list_markets` | WORKING | Returns market data with pagination |
| `search_markets` | WORKING | Full-text search functional |
| `get_historical_orderbooks` | WORKING | Requires valid token_id or market_id |
| `get_market_statistics` | WORKING | Platform-wide stats by venue/interval |
| `get_related_markets` | WORKING | Needs valid event slug |
| `get_similar_markets` | WORKING | Cross-venue discovery |
| `get_arbitrage_pairs` | WORKING | Returns ranked pairs |
| `list_polymarket_markets` | WORKING | Full sorting/filtering |
| `get_polymarket_market` | WORKING | Requires 0x condition ID |
| `get_polymarket_market_by_slug` | WORKING | Slug-based lookup |
| `get_polymarket_price_history` | WORKING | OHLC candles |
| `get_polymarket_trades` | WORKING | Recent trades |
| `get_polymarket_statistics` | WORKING | Token-level stats |
| `list_kalshi_markets` | WORKING | Full sorting/filtering |
| `get_kalshi_market` | WORKING | By market ID |
| `get_kalshi_event` | WORKING | Event + child markets |
| `get_kalshi_market_by_slug` | WORKING | Slug-based lookup |
| `get_kalshi_trades` | WORKING | Recent trades |
| `get_kalshi_holders` | WORKING | Holder distribution |
| `get_kalshi_statistics` | WORKING | Market-level stats |
| `get_kalshi_price_history` | WORKING | Historical prices |
| `get_kalshi_candlesticks` | WORKING | OHLCV data |
| `get_kalshi_leaderboard` | WORKING | Platform leaderboard |
| `get_kalshi_user` | WORKING | Public profile lookup |
| `get_news` | WORKING | Returns news articles |
| `get_event_news` | WORKING | Event-specific news |
| `get_market_news` | WORKING | Market-specific news |

### Tier 2 — All 10 registered tools verified with `sk_` key

All Tier 2 tools work correctly with a secret key (`sk_...`) in account auth mode.

| Tool | Status | Notes |
|------|--------|-------|
| `get_account_session` | WORKING | Returns `{authenticated: true}` |
| `get_api_keys` | WORKING | Returns list of API keys with `pk_` public keys |
| `get_interests` | WORKING | Returns account interest tags |
| `update_interests` | WORKING | POST to set interest tags (1-10 tags) |
| `get_recommendations` | WORKING | Returns personalized market recs based on interests |
| `get_wallets` | WORKING | Returns wallets with SOL + POL chain addresses |
| `create_wallet` | WORKING | Creates new multi-chain wallet |
| `update_wallet` | WORKING | Updates wallet name/autoredeem |
| `delete_wallet` | WORKING | Requires all balances to be zero |
| `reorder_wallets` | WORKING | Reorders wallet display positions |
| `export_wallet` | UNTESTED | Requires HPKE key pair — not tested in CI |

**Note**: Project keys (`pk_...`) do NOT work with Tier 2 account endpoints. You must use a secret key (`sk_...`) with the default `account` auth mode.

---

## Deployment

### Local stdio (Default)

The simplest setup. Claude spawns the server as a local subprocess over stdin/stdout.

```
Claude <-> stdio <-> synthesis-mcp (local Node.js process) <-> synthesis.trade
```

- **Pros**: Zero infrastructure, zero cost, key never leaves machine
- **Cons**: Only works on the machine where it's installed

### Stateless HTTP

Deploy as an HTTP server for remote clients or multi-user setups.

```bash
npm run start:http
# or: PORT=8080 npm run start:http
```

```
Claude.ai <-> HTTPS <-> synthesis-mcp (HTTP) <-> synthesis.trade
```

Endpoints:
- `GET /health` — Health check (returns JSON status)
- `POST /mcp` — MCP JSON-RPC endpoint (StreamableHTTPServerTransport, stateless)
- `GET /mcp`, `DELETE /mcp` — 405 Method Not Allowed
- `OPTIONS /mcp`, `OPTIONS /health` — 204 CORS preflight

### Pass-Through Auth (Multi-User)

For hosted deployments where multiple users each have their own Synthesis API key:

Users include their key in a custom header:
```json
{
  "headers": { "X-User-Api-Key": "sk_their_own_key" }
}
```

The server reads this header per-request and creates a fresh `SynthesisClient` with that key. The key exists only in memory during the request — never logged or stored. Cache entries are namespaced by auth fingerprint to prevent data leaks between users.

---

## Architecture

```
synthesismcp/
├── src/
│   ├── api/
│   │   ├── client.ts          # HTTP client with timeout, retry, auth-aware caching
│   │   ├── markets.ts         # /markets/* endpoints (unified cross-venue)
│   │   ├── polymarket.ts      # /polymarket/* endpoints
│   │   ├── kalshi.ts          # /kalshi/* endpoints
│   │   ├── news.ts            # /news/* endpoints
│   │   ├── account.ts         # /account/* and /project/* endpoints
│   │   ├── wallets.ts         # /wallet/* endpoints
│   │   └── polygon.ts         # /polygon/* trading endpoints
│   ├── mcp/
│   │   ├── server.ts          # Stdio MCP entry point
│   │   ├── server-http.ts     # HTTP MCP entry point (CORS, rate limiting, size limit)
│   │   ├── create-server.ts   # Shared server factory (tool registration)
│   │   └── tools/
│   │       ├── tier1.ts       # 31 public tools
│   │       ├── tier2.ts       # 13 auth-required tools
│   │       └── tier3.ts       # 4 trading tools (opt-in)
│   ├── utils/
│   │   └── trim.ts            # Shared output trimming (trimData, summarize)
│   └── types/
│       └── index.ts           # TypeScript interfaces for all API responses
├── scripts/
│   ├── test-stdio.ts          # Stdio transport smoke test (9 assertions)
│   ├── test-http.ts           # HTTP transport smoke test (14 assertions)
│   ├── test-multiuser.ts      # Multi-user auth smoke test (5 assertions)
│   ├── test-cache.ts          # Cache safety test (12 assertions)
│   └── api-sync-check.ts      # API endpoint health probe
├── dist/                      # Compiled output (npm run build)
├── package.json
├── tsconfig.json
└── PLAN.md
```

**API response envelope**: All Synthesis API responses follow `{ success: boolean, response: T }`. The client unwraps this automatically and throws `SynthesisError` on failures.

**Error handling**: Tools propagate errors as text responses. Claude will see the HTTP status, path, and error body — enough to diagnose auth issues, rate limits, or bad parameters.

---

## Production Hardening

### Request Timeout
- All fetch requests use `AbortController` with a 30-second timeout
- Prevents hung connections from blocking the MCP server

### Retry with Exponential Backoff
- Retries on HTTP 429 (rate limit) and 5xx (server error)
- Max 3 retries with exponential backoff (1s, 2s, 4s base delay, capped at 8s)
- Non-retryable errors (4xx except 429) fail immediately

### In-Memory GET Cache
- GET requests are cached for 60 seconds in an in-memory `Map`
- **Auth-aware cache keys**: Cache key = `authMode:keySlice:url` — prevents data leaks between users in multi-user HTTP mode
- **Size-limited**: Maximum 1000 entries. On overflow, expired entries are swept first, then the oldest entry is evicted
- **Automatic cleanup**: Expired entries are purged on every cache insert
- POST/PUT/DELETE bypass the cache entirely
- No external dependencies (no Redis, no disk)

### Response Trimming
- API responses are trimmed before returning to the LLM — **93% reduction** on typical queries
- Dropped fields: `description`, `image`, `rewards`, `dflow`, `winner_token_id`, `created_at`, `updated_at`, `fees`, `slug`, `decimals`, `sub_title`
- Empty/trivial values pruned: empty arrays, empty objects, null, empty strings, false flags
- Nested `markets` arrays capped at 5 entries (events like "2028 Democratic Nominee" have 30+ sub-markets)
- All output uses compact JSON (no pretty-printing)
- Hard cap at 30,000 characters per tool response
- Shared `summarize()` utility used by all tiers (Tier 1, Tier 2, and Tier 3)
- Use `limit` and `offset` parameters to paginate through large result sets

### HTTP Server Hardening
- **CORS**: `Access-Control-Allow-Origin: *` with proper preflight handling. Allows `Content-Type`, `Accept`, and `X-User-Api-Key` headers.
- **Rate limiting**: 60 requests/minute per IP (sliding window). Returns HTTP 429 with `Retry-After` header when exceeded. Stale entries cleaned up periodically.
- **Request size limit**: POST bodies > 1MB are rejected with HTTP 413
- **No TLS**: Must be placed behind a reverse proxy (nginx, Cloudflare) for HTTPS in production

### Trading Safety (Implemented, Currently Dormant)

Trading tools (Tier 3) are currently deregistered because the upstream `/polygon/*` API returns 404. When Synthesis enables the trading API, re-enable in `create-server.ts`. The safety infrastructure is fully implemented with **6 independent layers**:

| Layer | Type | What it checks |
|-------|------|---------------|
| 1. `ENABLE_TRADING=true` | Env var (startup) | Tools not even **registered** without it — invisible to Claude |
| 2. `TRADING_CONFIRMATION_PHRASE` | Env var (startup) | A secret phrase you choose. Must be set alongside `ENABLE_TRADING`. No default, no bypass. |
| 3. `confirm` parameter | Per-call (runtime) | Every tool call must include `confirm: "I understand this is a real financial transaction"` — forces the LLM to explicitly acknowledge |
| 4. `confirmation_phrase` parameter | Per-call (runtime) | Every tool call must include your secret phrase — proves the caller has access to server config |
| 5. `MAX_ORDER_SIZE_USDC` | Per-call (runtime) | Caps `place_order`, `swap`, and `withdraw` amounts (default: $100). Prevents fat-finger disasters. |
| 6. `requireTrading()` | API layer (runtime) | Belt-and-suspenders check at the HTTP client level before any request is sent |

**To enable trading** (all three env vars required):
```bash
claude mcp add synthesis \
  -e SYNTHESIS_API_KEY=sk_... \
  -e ENABLE_TRADING=true \
  -e TRADING_CONFIRMATION_PHRASE="my secret phrase" \
  -e MAX_ORDER_SIZE_USDC=50 \
  -- node /path/to/synthesismcp/dist/mcp/server.js
```

If you set `ENABLE_TRADING=true` but forget `TRADING_CONFIRMATION_PHRASE`, the server logs a warning and trading tools are **not registered**.

---

## Performance & Token Efficiency

### Output Size Optimization

MCP tool responses are aggressively trimmed to minimize LLM token consumption — **93% reduction** measured on typical queries.

| Technique | Savings | Details |
|-----------|---------|---------|
| Field stripping | ~60-80% | Drops `description`, `image`, `rewards`, `dflow`, `winner_token_id`, `created_at`, `updated_at`, `fees`, `slug`, `decimals`, `sub_title` |
| Empty value pruning | ~5-10% | Strips empty arrays, empty objects, null, empty strings, and trivial boolean flags (`neg_risk: false`, `claimable: false`, `jupiter: false`) |
| Nested array cap | ~50-90% | Events with 30+ sub-markets are capped at 5. A `_truncated` field shows e.g. `"5/32 shown"` |
| Compact JSON | ~30-40% | All output uses single-line JSON (no pretty-printing) |
| 30K char hard cap | Safety net | Truncates with `...(truncated, use limit/offset)` message |
| No metadata wrappers | ~5% | Returns raw arrays instead of `{count, markets}` wrappers |

**Measured response sizes** (after trimming):
- `list_markets` (limit=5): ~19K chars / ~4,700 tokens (vs ~255K raw — **93% reduction**)
- `get_polymarket_market`: ~2-4K chars (~500-1000 tokens)
- `search_markets` (limit=10): ~5-10K chars (~1500-3000 tokens)
- `get_kalshi_event` (with markets): ~3-8K chars (~800-2000 tokens)

### Caching

- GET requests are cached for 60 seconds — repeated queries within a minute return instantly
- Cache is per-client instance (stdio: shared, HTTP: per-request due to stateless architecture)
- Cache is bounded at 1000 entries to prevent memory leaks in long-running processes
- Auth-aware keys prevent cross-user cache pollution in multi-user deployments

### Request Performance

- **Timeout**: 30s per upstream API call
- **Retry**: Up to 3 retries with exponential backoff for 429/5xx errors
- **Connection reuse**: Node.js HTTP keep-alive is used for upstream API connections
- **Startup time**: ~100-200ms for stdio, ~200-300ms for HTTP server

### Rate Limiting (HTTP mode)

- 60 requests/minute per IP address
- Sliding window implementation (no dependencies)
- Returns `429 Too Many Requests` with `Retry-After` header
- Stale tracking data cleaned up every 5 minutes

---

## Testing

### Running Tests (No Claude Required)

All tests run standalone via `tsx` — no Claude Desktop or Claude Code needed. They spawn the MCP server as a subprocess and communicate via JSON-RPC directly.

```bash
# Run all tests (40 assertions total)
npm test

# Individual test suites
npm run test:cache        # 12 assertions — cache safety (auth keys, size cap, expiry)
npm run test:stdio        # 9 assertions — stdio transport
npm run test:http         # 14 assertions — HTTP transport, CORS, rate limits, body size
npm run test:multiuser    # 5 assertions — multi-user auth isolation

# API endpoint health check
npm run api:check         # Probes all Tier 1 endpoints, saves api-manifest.json
```

Tests use only Tier 1 (public) tools so they work without an API key — safe for CI.

### What the Tests Cover

**test-cache.ts** — Tests cache internals directly:
- Auth-namespaced cache keys (different API keys produce different cache keys)
- Unauthenticated clients get distinct cache namespace
- Cache size cap enforced at 1000 entries
- Expired entries are swept on insert

**test-stdio.ts** — Spawns `node dist/mcp/server.js` as subprocess:
- JSON-RPC initialize handshake
- tools/list returns all 38 registered tools (without trading enabled)
- tools/call with `list_markets` returns valid data
- Tier 2 tool without auth returns error text (not crash)

**test-http.ts** — Spawns HTTP server on random port:
- `GET /health` returns 200
- `POST /mcp` initialize + tools/list via SSE
- `POST /mcp` tools/call returns market data
- `GET /mcp` returns 405
- Tier 2 tool without auth returns error text
- CORS headers present on responses (`Access-Control-Allow-Origin: *`)
- OPTIONS preflight returns 204 with correct `Allow-Methods` and `Allow-Headers`
- POST with body > 1MB returns 413

**test-multiuser.ts** — HTTP server with no env API key:
- Tier 1 works without any key
- Tier 2 without header returns auth error
- Tier 2 with invalid key returns API error (not crash)
- Two different fake keys don't share state
- Server remains healthy after bad key tests

### Test Limitations
- Tests only exercise Tier 1 tools (no API key in CI)
- Tier 2 tests validate error handling, not actual data
- No load/stress testing
- Rate limiting is not stress-tested (would require 60+ rapid requests)
- No end-to-end tests with a real MCP client

---

## Known Issues

### Deregistered Upstream Endpoints

These tools are implemented but **not registered** because the upstream API doesn't support them yet. See [Deregistered Tools](#deregistered-tools-not-available) for the full list.

| Issue | Detail |
|-------|--------|
| **Batch POST endpoints return 400** | `get_market_prices`, `get_orderbooks`, `get_sparklines` — the correct request body format is undocumented |
| **Polygon API returns 404** | All `/polygon/*` routes — trading and polygon read endpoints are not publicly available |

### Authentication Notes

| Note | Detail |
|------|--------|
| **Key type behavior** | `sk_` (secret) keys work for all account endpoints (Tier 2). `pk_` (project) keys are for the project auth flow (`/project/*` endpoints) only. The `.mcp.json` should use `sk_` keys. |
| **Project auth not exposed** | Project-level endpoints (`getProjectAccounts`, `createProjectAccount`, `getProjectAccount`, `createAccountSession`) are implemented in the API layer but not registered as MCP tools. They require a separate `pk_` key flow not suitable for personal MCP use. |

### HTTP Server Notes

| Note | Detail |
|------|--------|
| **DNS rebinding warning** | The Express server binds to `0.0.0.0` without host validation. For production, deploy behind a reverse proxy with host checking. |
| **Per-request server overhead** | Each HTTP POST creates a fresh McpServer + transport. Consider connection pooling for high-traffic deployments. |
| **No TLS** | Must be placed behind a reverse proxy (nginx, Cloudflare) for HTTPS. |

---

## Development

```bash
# Install dependencies
npm install

# Run in dev mode (no build needed, uses tsx)
npm run dev          # stdio transport
npm run dev:http     # HTTP transport

# Build TypeScript -> dist/
npm run build

# Run built server
npm start            # stdio
npm run start:http   # HTTP

# Run tests
npm test             # all tests (40 assertions)
npm run api:check    # API health probe
```

**Tech stack**: Node.js v22+, TypeScript, `@modelcontextprotocol/sdk`, `zod`

**Adding a new tool**:
1. Add the API function in `src/api/`
2. Add any needed TypeScript interfaces in `src/types/index.ts`
3. Register the tool in the appropriate tier file in `src/mcp/tools/`
4. Use `summarize()` from `src/utils/trim.ts` for the tool response
5. `npm run build && npm test`

**API base URL**: `https://synthesis.trade/api/v1` (not `api.synthesis.trade`)

**API reference**: [synthesis.trade](https://synthesis.trade)
