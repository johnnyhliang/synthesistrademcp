# Synthesis MCP + CLI — Plan

## Overview

A TypeScript project exposing `api.synthesis.trade` as both:
- **MCP server** — for use with Claude Desktop / Claude Code (stdio transport, no hosting needed)
- **CLI** — `synthesis` binary for terminal use

---

## API Reference

**Base URL:** `https://api.synthesis.trade/api/v1`
**Response envelope:** `{ "success": boolean, "response": T }`

### Public Endpoints (no auth)

| Method | Path | Params | Description |
|--------|------|--------|-------------|
| GET | `/markets` | `venue`, `limit`, `offset`, `search`, `tag`, `active`, `sort` | Unified market list (Polymarket + Kalshi) |
| GET | `/polymarket/markets` | `condition_id` | Polymarket market list or single market |
| GET | `/kalshi/markets` | — | Kalshi market list |

**Market response shape:**
```json
{
  "venue": "polymarket" | "kalshi",
  "event": { "event_id", "title", "slug", "image", "tags", "labels", "active",
              "liquidity", "volume", "volume24hr", "volume1wk", "volume1mo",
              "ends_at", "created_at" },
  "markets": [{ "condition_id" | "market_id", "question" | "title", "outcome",
                 "left_price", "right_price", "liquidity", "volume", "resolved",
                 "ends_at" }]
}
```

### Auth-Required Endpoints

#### Polymarket
| Path | Description |
|------|-------------|
| `/polymarket/prices` | Bid/ask prices for a market |
| `/polymarket/orderbook` | Full orderbook |
| `/polymarket/trades` | Recent trades |
| `/polymarket/holders` | Token holders |

#### Kalshi
| Path | Description |
|------|-------------|
| `/kalshi/history` | Market price history |
| `/kalshi/leaderboard` | Platform leaderboard |
| `/kalshi/profile` | User profile |

#### Polygon (Trading)
| Path | Description |
|------|-------------|
| `/polygon/balances` | Wallet USDC balances |
| `/polygon/orders` | Order history |
| `/polygon/swaps` | Swap history |
| `/polygon/copytrade` | Copytrading config + execution |
| `/polygon/mint` | Mint USDC |
| `/polygon/redeem` | Redeem positions |
| `/polygon/withdraw` | Withdraw funds |

#### Wallets + Projects
| Path | Description |
|------|-------------|
| `/wallets` | Manage Polygon + Solana wallets |
| `/projects` | Project account management |
| `/sessions` | Session management |

### Authentication Flows
1. **Project auth** — project-level API key (for automated systems)
2. **Session auth** — user session token (for per-user flows)
3. **Account API keys** — personal API keys

All use `Authorization: Bearer <token>` header.

---

## Capability Tiers

### Tier 1 — Public (no auth)
- List unified markets
- Filter/search markets by venue, tag, keyword
- Get Polymarket market details (full schema incl. prices from market object)
- Get Kalshi market details

### Tier 2 — Read (auth required)
- Polymarket live prices, orderbook, trade history, holders
- Kalshi price history, leaderboard, profile
- Wallet balances
- Order history

### Tier 3 — Trading (auth required, explicit confirmation)
- Place/cancel orders (Polygon)
- Swaps
- Copytrading config
- Mint, redeem, withdraw

---

## MCP Tools

### Tier 1 (always available)
| Tool | Description |
|------|-------------|
| `list_markets` | List markets with filters (venue, tag, search, limit) |
| `get_market` | Get single market by condition_id or market_id |
| `search_markets` | Keyword search across all markets |
| `list_polymarket_markets` | Raw Polymarket market list |
| `list_kalshi_markets` | Raw Kalshi market list |

### Tier 2 (requires SYNTHESIS_API_KEY)
| Tool | Description |
|------|-------------|
| `get_polymarket_prices` | Live prices for a condition |
| `get_polymarket_orderbook` | Full orderbook |
| `get_polymarket_trades` | Recent trades |
| `get_kalshi_history` | Price history for a market |
| `get_balances` | Wallet balances |
| `get_orders` | Order history |

### Tier 3 (requires SYNTHESIS_API_KEY + ENABLE_TRADING=true)
| Tool | Description |
|------|-------------|
| `place_order` | Place a Polymarket order |
| `cancel_order` | Cancel an open order |
| `swap` | Execute a swap |
| `withdraw` | Withdraw funds |

---

## Project Structure

```
synthesismcp/
├── src/
│   ├── api/
│   │   ├── client.ts         # Base fetch client, auth, error handling
│   │   ├── markets.ts        # /markets endpoint
│   │   ├── polymarket.ts     # /polymarket/* endpoints
│   │   ├── kalshi.ts         # /kalshi/* endpoints
│   │   ├── polygon.ts        # /polygon/* trading endpoints
│   │   └── wallets.ts        # /wallets, /projects, /sessions
│   ├── mcp/
│   │   ├── server.ts         # MCP stdio server entry point
│   │   ├── tools/
│   │   │   ├── tier1.ts      # Public tools
│   │   │   ├── tier2.ts      # Auth-required read tools
│   │   │   └── tier3.ts      # Trading tools
│   │   └── formatters.ts     # Response formatters for LLM consumption
│   └── types/
│       └── index.ts          # Shared TypeScript interfaces
├── PLAN.md
├── package.json
└── tsconfig.json
```

---

## Claude Desktop Config

```json
{
  "mcpServers": {
    "synthesis": {
      "command": "node",
      "args": ["/path/to/synthesismcp/dist/mcp/server.js"],
      "env": {
        "SYNTHESIS_API_KEY": "optional-for-tier2+",
        "ENABLE_TRADING": "false"
      }
    }
  }
}
```

---

## Security Notes

- Tier 1 runs with zero credentials — safe for any environment
- Tier 2 reads only — API key stored in env var, never in code
- Tier 3 disabled by default — requires explicit `ENABLE_TRADING=true`
- Prompt injection risk: market titles/descriptions are untrusted content — tools return raw data, never auto-execute follow-up actions based on market content
- Separate read key from trading key where possible
