# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-03-27

### Added
- 38 working MCP tools across 2 tiers (28 public, 10 authenticated)
- Structured JSON logging to stderr (`LOG_LEVEL` env var)
- Deep upstream health check (`GET /health` probes synthesis.trade, returns 503 when degraded)
- Shallow health check for k8s liveness (`GET /health?shallow=true`)
- Graceful shutdown with 10s drain timeout on SIGTERM/SIGINT
- Cache invalidation on write operations (POST/PUT/DELETE)
- Input validation with clear error messages for common mistakes
- Auth-aware caching with 1000-entry size limit
- 93% token reduction via aggressive response trimming
- CORS, rate limiting (60 req/min), 1MB body size limit on HTTP
- Multi-user HTTP mode with per-request API key passthrough
- 6-layer trading safety system (dormant — upstream API not available)
- npm packaging: `files`, `engines`, `exports`, `bin`, shebang lines
- CI/CD workflows: GitHub Actions for test + npm publish
- Multi-stage Dockerfile for containerized deployment
- MIT license
- 40 automated tests (cache, stdio, HTTP, multi-user)

### Deregistered
- 10 tools removed from registration due to upstream API errors:
  - `get_market_prices`, `get_orderbooks`, `get_sparklines` (400)
  - `get_polygon_balances`, `get_polygon_orders`, `get_polygon_swaps` (404)
  - `place_order`, `cancel_order`, `swap`, `withdraw` (404)
  - API functions retained in `src/api/` for when endpoints become available
