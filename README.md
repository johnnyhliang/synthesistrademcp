# synthesis-mcp

An MCP (Model Context Protocol) server for [api.synthesis.trade](https://api.synthesis.trade) — a unified prediction markets data layer covering **Polymarket** and **Kalshi**.

Connect Claude (or any MCP-compatible AI) to real-time market data, price history, orderbooks, news, leaderboards, and wallet management. 43 tools across three access tiers — all public data works without an API key.

---

## Table of Contents

- [What is MCP?](#what-is-mcp)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
  - [Claude Code (CLI)](#claude-code-cli)
  - [Claude Desktop](#claude-desktop)
- [Authentication](#authentication)
  - [Auth Modes](#auth-modes)
  - [Environment Variables](#environment-variables)
- [Tools Reference](#tools-reference)
  - [Tier 1 — Public (No Auth)](#tier-1--public-no-auth-30-tools)
  - [Tier 2 — Account (API Key Required)](#tier-2--account-api-key-required-9-tools)
  - [Tier 3 — Trading (Explicitly Enabled)](#tier-3--trading-explicitly-enabled-4-tools)
- [Deployment](#deployment)
  - [Local stdio (Default)](#local-stdio-default)
  - [Stateless HTTP (Vercel)](#stateless-http-vercel)
  - [Persistent (Railway / Fly.io)](#persistent-railway--flyio)
  - [Pass-Through Auth (Multi-User)](#pass-through-auth-multi-user)
- [Architecture](#architecture)
- [Known Limitations](#known-limitations)
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

# Tier 1 + Tier 2 + Tier 3 (trading enabled — use with caution)
claude mcp add synthesis \
  -e SYNTHESIS_API_KEY=sk_... \
  -e ENABLE_TRADING=true \
  -- node /path/to/synthesismcp/dist/mcp/server.js
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

---

## Authentication

Get an API key at [api.synthesis.trade](https://api.synthesis.trade).

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
| `SYNTHESIS_BASE_URL` | No | Override API base URL (default: `https://api.synthesis.trade/api/v1`) |
| `ENABLE_TRADING` | No | Set to `true` to register Tier 3 trading tools |

---

## Tools Reference

### Tier 1 — Public (No Auth) — 30 tools

All tools in this tier work without any API key.

#### Markets

| Tool | Description |
|------|-------------|
| `list_markets` | List markets from Polymarket and/or Kalshi. Filter by price range, live status, tags, sort by liquidity/volume/ends_at. Up to 250 results. |
| `search_markets` | Full-text search across all market titles. Filter by venue, price, tags. Sort by probability/liquidity/closes soon. |
| `get_market_prices` | Batch-fetch current prices for up to 5000 markets by token ID or market ID. |
| `get_orderbooks` | Batch-fetch current orderbooks for up to 5000 markets. |
| `get_sparklines` | Batch-fetch historical price sparklines for a set of markets. |
| `get_historical_orderbooks` | Orderbook snapshots for a single market over time. Supports time bucketing (30s, 5m, 1h, 1d) and up to 25,000 points. |
| `get_market_statistics` | Platform-wide stats (total markets, active, volume) by venue and interval (24h/1w/1m/6m/1y). |
| `get_related_markets` | Markets related by topic to a given event slug. |
| `get_similar_markets` | Cross-venue similar markets for a given market ID (useful for Polymarket ↔ Kalshi arbitrage discovery). |
| `get_arbitrage_pairs` | Cross-venue market pairs ranked by arbitrage opportunity. |

#### Polymarket

| Tool | Description |
|------|-------------|
| `list_polymarket_markets` | List Polymarket markets. Sort by price, liquidity, volume (24hr/1wk/1mo/1yr), created_at, ends_at. |
| `get_polymarket_market` | Get a specific Polymarket event and all its outcome markets by condition ID (0x hex). |
| `get_polymarket_market_by_slug` | Get a Polymarket event by URL slug. |
| `get_polymarket_price_history` | Historical prices and OHLC candles for a Polymarket token. Intervals: 1h, 6h, 1d, 1w, 1m, all. |
| `get_polymarket_trades` | Recent trades for a Polymarket market. Up to 1000 trades. |
| `get_polymarket_statistics` | Aggregate statistics (price change, 24h high/low) for a Polymarket token. |

#### Kalshi

| Tool | Description |
|------|-------------|
| `list_kalshi_markets` | List Kalshi markets. Filter by category, sort by price, liquidity, volume. |
| `get_kalshi_market` | Get a specific Kalshi market by market ID (e.g. `KXPRESNOMD-28-GN`). |
| `get_kalshi_event` | Get a Kalshi event and all its child markets by event ID. |
| `get_kalshi_market_by_slug` | Get a Kalshi event by URL slug. |
| `get_kalshi_trades` | Recent trades for a Kalshi market. Up to 1000 trades. |
| `get_kalshi_holders` | Token holder distribution for a Kalshi market. |
| `get_kalshi_statistics` | Aggregate statistics (price change, high/low) for a Kalshi market. |
| `get_kalshi_price_history` | Historical price data with time bucketing. Requires `series_id` (e.g. `KXPRESNOMD`) and `kalshi_id` (UUID). |
| `get_kalshi_candlesticks` | OHLCV candlestick data for a Kalshi market. Same parameters as price history. |
| `get_kalshi_leaderboard` | Kalshi platform leaderboard. Sort by volume or other metrics. |
| `get_kalshi_user` | Public profile and trading metrics for a Kalshi username. |

#### News

| Tool | Description |
|------|-------------|
| `get_news` | Recent news articles matched to prediction markets. |
| `get_event_news` | News articles related to a specific event ID. |
| `get_market_news` | News articles related to a specific market ID. |

---

### Tier 2 — Account (API Key Required) — 9 tools

Requires `SYNTHESIS_API_KEY` set in the server config.

#### Account

| Tool | Description |
|------|-------------|
| `get_account_session` | Verify authentication status and inspect the current session. |
| `get_api_keys` | List all API keys associated with the authenticated account. |
| `get_interests` | Get account interest tags used for personalized recommendations. |
| `update_interests` | Update account interest tags (1–10 tags, each 2–20 characters). |
| `get_recommendations` | Personalized market recommendations based on account interests. |

#### Wallets

| Tool | Description |
|------|-------------|
| `get_wallets` | List wallets for the account. Auto-creates the first wallet if none exist. |
| `create_wallet` | Create a new multi-chain wallet (Polygon + Solana). |
| `update_wallet` | Update a wallet's name or `autoredeem` setting. |
| `delete_wallet` | Delete a wallet. All chain balances must be zero first. |

---

### Tier 3 — Trading (Explicitly Enabled) — 4 tools

Requires both `SYNTHESIS_API_KEY` **and** `ENABLE_TRADING=true`.

Trading tools are **not registered by default** to prevent accidental execution. You must explicitly opt in.

> **Warning**: These tools interact with live Polygon smart contracts and can result in real financial transactions. Review all parameters carefully before confirming any tool call.

| Tool | Description |
|------|-------------|
| `place_order` | Place a buy or sell order on Polymarket via Polygon. Requires `condition_id`, `side`, `price` (0.001–0.999 USDC), and `size`. |
| `cancel_order` | Cancel an open order by order ID. |
| `swap` | Execute a token swap on Polygon (`from_token`, `to_token`, `amount`). |
| `withdraw` | Withdraw USDC to an external address on Polygon or Solana. |

> **Note**: Tier 3 tools are stubs pending confirmed API paths from Synthesis. The underlying `/polygon/*` routes return 404 in the current API version — trading via the Synthesis API may not yet be publicly available.

---

## Deployment

### Local stdio (Default)

The simplest setup. Claude spawns the server as a local subprocess over stdin/stdout. No hosting, no network exposure. Your API key stays on your machine.

```
Claude ←→ stdio ←→ synthesis-mcp (local Node.js process) ←→ api.synthesis.trade
```

- **Pros**: Zero infrastructure, zero cost, key never leaves machine
- **Cons**: Only works on the machine where it's installed; doesn't support Claude.ai web

### Stateless HTTP (Vercel)

Deploy as a serverless function for use with Claude.ai web or remote MCP clients. Each request is independent (no persistent connections).

```
Claude.ai ←→ HTTPS ←→ Vercel (stateless) ←→ api.synthesis.trade
```

- **Pros**: Free tier, auto-scaling, no server management
- **Cons**: 10s max execution time; no WebSocket / real-time feeds; all users share one API key (unless pass-through auth is used)
- **Rate limiting**: Use [Upstash Redis](https://upstash.com) for per-key request counters

See `src/mcp/server-http.ts` (planned) for the HTTP transport entry point.

### Persistent (Railway / Fly.io)

A long-running server with WebSocket support. Required for real-time orderbook streams, live trade feeds, or bid/ask push notifications.

```
Claude ←→ WebSocket ←→ Railway/Fly.io (persistent) ←→ api.synthesis.trade (WS feeds)
```

- **Pros**: Real-time data; persistent connections; can run background jobs
- **Cons**: ~$5/month on Railway free tier exit; requires infrastructure management

See `src/mcp/server-ws.ts` (planned) for the WebSocket transport entry point.

### Pass-Through Auth (Multi-User)

For hosted deployments where multiple users each have their own Synthesis API key — without sharing yours:

Users configure the MCP connector to include their key in a custom header:
```json
{
  "headers": { "X-User-Api-Key": "sk_their_own_key" }
}
```

The server reads this header and proxies it to the Synthesis API. The key exists only in memory during the request — it is never logged or stored server-side.

This means:
- The operator (you) does not need to supply a global API key
- Each user's key is their own responsibility
- No key sharing, no rate limit contention between users

See `src/mcp/server-http.ts` (planned) for the pass-through header extraction logic.

---

## Architecture

```
synthesismcp/
├── src/
│   ├── api/
│   │   ├── client.ts       # HTTP client, auth header injection, error handling
│   │   ├── markets.ts      # /markets/* endpoints (unified cross-venue)
│   │   ├── polymarket.ts   # /polymarket/* endpoints
│   │   ├── kalshi.ts       # /kalshi/* endpoints
│   │   ├── news.ts         # /news/* endpoints
│   │   ├── account.ts      # /account/* and /project/* endpoints
│   │   ├── wallets.ts      # /wallet/* endpoints
│   │   └── polygon.ts      # /polygon/* trading endpoints (stubs)
│   ├── mcp/
│   │   ├── server.ts       # Stdio MCP entry point
│   │   └── tools/
│   │       ├── tier1.ts    # 30 public tools
│   │       ├── tier2.ts    # 9 auth-required tools
│   │       └── tier3.ts    # 4 trading tools (opt-in)
│   └── types/
│       └── index.ts        # TypeScript interfaces
├── dist/                   # Compiled output (after npm run build)
├── package.json
├── tsconfig.json
└── PLAN.md
```

**API response envelope**: All Synthesis API responses follow `{ success: boolean, response: T }`. The client unwraps this automatically and throws `SynthesisError` on failures.

**Error handling**: Tools propagate errors as text responses. Claude will see the HTTP status, path, and error body — enough to diagnose auth issues, rate limits, or bad parameters.

---

## Known Limitations

| Issue | Detail |
|-------|--------|
| **Batch POST endpoints** | `get_market_prices`, `get_orderbooks`, `get_sparklines` accept arrays of IDs but the format the API expects is unclear — every tested format (condition_id, token_id, kalshi UUID, base58 token ID) returns 400 "Invalid markets". Tools are registered but may return errors. |
| **Wallet auth** | `get_wallets` and wallet management tools require an API key with wallet feature access. The provided test key returned 401. May require account-level feature enablement. |
| **Trading stubs** | All `/polygon/*` routes return 404 — trading via the Synthesis API may not be publicly released yet. Tier 3 tools are scaffolded but non-functional. |
| **Project account tools** | `GET /project/account` and `POST /project/account/{id}/session` are implemented in `account.ts` but not exposed as MCP tools yet (require `SYNTHESIS_PROJECT_API_KEY`). |
| **Wallet export** | `POST /wallet/{chain_id}/{wallet_id}/export` is implemented in `wallets.ts` but not exposed as an MCP tool (sensitive operation, needs careful scoping). |

---

## Development

```bash
# Install dependencies
npm install

# Run in dev mode (no build needed, uses tsx)
npm run dev

# Build TypeScript → dist/
npm run build

# Run built server
npm start
```

**Tech stack**: Node.js v22, TypeScript, `@modelcontextprotocol/sdk`, `zod`

**Adding a new tool**:
1. Add the API function to the relevant module in `src/api/`
2. Register the tool in the appropriate tier file in `src/mcp/tools/`
3. `npm run build` and restart the MCP server

**API reference**: [api.synthesis.trade/reference](https://api.synthesis.trade/reference)
