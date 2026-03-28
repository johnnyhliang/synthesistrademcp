# Plan: Scale-Ready MCP Server

## Context

The server is production-ready for personal/small-team stdio use (38/38 tools working, 40/40 tests passing, 93% token reduction). This plan addresses the gaps needed for a **hosted multi-user HTTP deployment**, brings the project in line with production MCP server conventions, and makes it npm-installable via `npx`.

---

## Gap Analysis: Where We Stand vs Mature MCP Servers

Compared against the official `@modelcontextprotocol/server-*` packages, `github/github-mcp-server`, and top community MCP servers:

| Area | Mature MCP Servers | This Project | Gap |
|------|-------------------|-------------|-----|
| **npm install** | `npx -y @scope/mcp-server-name` | Git clone + build | No `files`, no shebang, no `prepublishOnly` |
| **Shebang** | `#!/usr/bin/env node` in entry point | Missing | Won't work as `npx` binary |
| **`files` field** | `["dist"]` — ships only compiled output | Missing — would publish everything including `src/`, `scripts/` | |
| **`engines`** | `"node": ">=18"` or `">=20"` | Missing | No runtime version guard |
| **Structured logging** | JSON lines to stderr (`slog` in Go, custom in TS) | `console.error` in 3 places | Blind in production |
| **Health checks** | Deep checks probing upstream deps | Returns `ok` unconditionally | Useless for load balancers |
| **Graceful shutdown** | SIGTERM drain with timeout | None | Dropped requests on deploy |
| **CI/CD** | GitHub Actions: lint, test, publish on tag | None | No regression prevention, no auto-publish |
| **Testing** | Vitest or Jest + e2e with MCP Inspector | Custom test runner, no e2e | No real MCP client test |
| **Test structure** | `tests/unit/`, `tests/integration/`, `tests/e2e/` | `scripts/test-*.ts` flat | Non-standard |
| **Versioning** | Semver tags, `CHANGELOG.md`, GitHub releases | Version in package.json but no changelog or releases | |
| **README** | Badges, `npx` install, IDE one-click buttons, config examples | Comprehensive docs but no badges, no npx | |
| **Docker** | Multi-stage Dockerfile, published to ghcr.io | None | No containerized deployment |
| **Cache invalidation** | Write-through or explicit invalidation | 60s stale-on-write possible | Correctness bug |
| **Input validation** | Pre-flight checks with clear errors | Relies on upstream 400s | Poor LLM UX |
| **Rate limiting** | Redis-backed or cloud-native | In-memory only | Single-process only |
| **Scope/name** | `@org/mcp-server-name` scoped package | `synthesismcp` unscoped | Less discoverable |

**What we do well that many don't:**
- Auth-aware caching (most MCP servers have no cache at all)
- 93% token reduction via aggressive output trimming
- Multi-transport (stdio + HTTP) in one package
- Multi-user HTTP with per-request auth isolation
- 6-layer trading safety (when re-enabled)

---

## Phase 1: Structured Logging

**Why**: Zero observability today. When something breaks in production, you're blind.

**Files**: `src/utils/logger.ts` (new), all `src/mcp/*.ts`, `src/api/client.ts`

1. Create a minimal structured logger (no deps) that writes JSON lines to stderr:
   ```
   {"ts":"2026-03-16T...","level":"info","msg":"request","tool":"list_markets","duration_ms":142}
   {"ts":"2026-03-16T...","level":"error","msg":"upstream_error","status":500,"path":"markets"}
   ```
2. Log levels: `error`, `warn`, `info`, `debug`. Controlled by `LOG_LEVEL` env var (default: `info`)
3. Add request logging to HTTP server (method, path, status, duration, IP)
4. Add tool call logging (tool name, duration, success/error)
5. Add upstream API call logging in client.ts (path, status, duration, retry count)
6. **Do not** log request/response bodies (privacy) or API keys

---

## Phase 2: Upstream Health Check

**Why**: `/health` returns `ok` even if synthesis.trade is completely down.

**Files**: `src/mcp/server-http.ts`

1. Deep check: probe `GET /api/v1/markets?limit=1` with 5s timeout
2. Return `{"status":"ok","upstream":"ok","tools":38,"uptime_s":...}` when healthy
3. Return `{"status":"degraded","upstream":"unreachable","tools":38}` with HTTP 503 when upstream is down
4. Cache health result for 30s to avoid hammering upstream on every LB probe
5. `GET /health?shallow=true` for k8s liveness (skip upstream check)

---

## Phase 3: Cache Invalidation on Writes

**Why**: `update_wallet` then `get_wallets` returns stale data for up to 60s.

**Files**: `src/api/client.ts`

1. Add `invalidateCache(pathPrefix: string)` — deletes all cache entries whose URL contains the prefix
2. Call from `post()`, `put()`, `delete()` after successful writes
3. Conservative but correct — no stale reads after mutations

---

## Phase 4: Graceful Shutdown

**Why**: HTTP server doesn't drain connections on SIGTERM.

**Files**: `src/mcp/server-http.ts`

1. Listen for `SIGTERM` and `SIGINT`
2. Stop accepting new connections, wait up to 10s for in-flight requests, then exit
3. Clear rate limiter cleanup interval
4. Log shutdown start and completion

---

## Phase 5: Input Validation

**Why**: Claude sees cryptic upstream 400s instead of clear error messages.

**Files**: `src/mcp/tools/tier1.ts`, `src/mcp/tools/tier2.ts`

1. Pre-flight validation for tools with non-obvious requirements:
   - `get_historical_orderbooks`: require `token_id` when venue=polymarket, `market_id` when venue=kalshi
   - `get_kalshi_price_history`: validate `start` is valid ISO date or unix timestamp
   - `get_polymarket_market`: validate `condition_id` starts with `0x`
2. Clear error messages: `"token_id is required when venue is polymarket"`
3. Minimal — only validate what upstream would reject with an unhelpful error

---

## Phase 6: npm Packaging & Publishing

**Why**: Currently git-clone only. Mature MCP servers are `npx -y @scope/mcp-server-name`.

**Files**: `package.json`, `src/mcp/server.ts`, `tsconfig.json`, `.npmignore` or `files` field

### 6a. Package Configuration

1. **Rename package** to `@anthropic-community/mcp-server-synthesis` or `synthesis-mcp` (check npm availability)
2. **Add `files` field** — ship only compiled output:
   ```json
   "files": ["dist", "README.md", "LICENSE"]
   ```
3. **Add `engines`**:
   ```json
   "engines": { "node": ">=18.0.0" }
   ```
4. **Update `bin`**:
   ```json
   "bin": {
     "synthesis-mcp": "dist/mcp/server.js",
     "synthesis-mcp-http": "dist/mcp/server-http.js"
   }
   ```
5. **Add `exports`** for programmatic use:
   ```json
   "exports": {
     ".": "./dist/mcp/server.js",
     "./http": "./dist/mcp/server-http.js",
     "./client": "./dist/api/client.js"
   }
   ```

### 6b. Shebang Line

Add `#!/usr/bin/env node` to both entry points:
- `src/mcp/server.ts` — first line
- `src/mcp/server-http.ts` — first line

TypeScript will preserve it in the compiled output.

### 6c. Build Script

```json
"scripts": {
  "build": "tsc",
  "prepublishOnly": "npm run build && npm test"
}
```

On Unix, also `chmod +x dist/mcp/server.js dist/mcp/server-http.js` after build. Use `shx` for cross-platform:
```json
"build": "tsc && shx chmod +x dist/mcp/server.js dist/mcp/server-http.js"
```
Add `shx` to devDependencies.

### 6d. Usage After Publishing

Users install with:
```bash
# Zero-install via npx
npx synthesis-mcp

# Or global install
npm install -g synthesis-mcp
synthesis-mcp
```

Claude Desktop config becomes:
```json
{
  "mcpServers": {
    "synthesis": {
      "command": "npx",
      "args": ["-y", "synthesis-mcp"],
      "env": {
        "SYNTHESIS_API_KEY": "sk_..."
      }
    }
  }
}
```

Claude Code:
```bash
claude mcp add synthesis -- npx -y synthesis-mcp
```

### 6e. npm Publish Workflow

See Phase 8 (CI/CD) for the automated publish workflow.

### 6f. License

Add a `LICENSE` file (MIT is standard for MCP servers). Update `package.json`:
```json
"license": "MIT"
```

---

## Phase 7: Project Structure & Versioning

**Why**: Non-standard layout. Tests in `scripts/`, no changelog, no examples.

**Files**: `package.json`, new dirs, test files

1. **Restructure tests**:
   ```
   tests/
   ├── unit/
   │   └── cache.test.ts       # (from scripts/test-cache.ts)
   ├── integration/
   │   ├── stdio.test.ts       # (from scripts/test-stdio.ts)
   │   ├── http.test.ts        # (from scripts/test-http.ts)
   │   └── multiuser.test.ts   # (from scripts/test-multiuser.ts)
   └── e2e/
       └── mcp-client.test.ts  # NEW: real MCP SDK client test
   ```
2. **Add e2e test** using `@modelcontextprotocol/sdk` Client class — validates full MCP protocol handshake, not just raw JSON-RPC
3. **Add `CHANGELOG.md`** — start tracking changes per semver
4. **Add `examples/`** directory:
   ```
   examples/
   ├── claude-desktop-config.json
   ├── claude-code-setup.sh
   └── docker-compose.yml
   ```
5. **Keep `scripts/`** for utility scripts only (api-sync-check)
6. **Update npm test scripts** to point to new paths

---

## Phase 8: CI/CD Pipeline

**Why**: No automated CI. No auto-publish to npm.

**Files**: `.github/workflows/ci.yml`, `.github/workflows/publish.yml`

### 8a. CI Workflow (Every Push/PR)

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: npm run build
      - run: npm test
```

### 8b. Publish Workflow (On Version Tags)

```yaml
name: Publish
on:
  push:
    tags: ['v*']
jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      id-token: write    # npm provenance
      contents: write    # GitHub release
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm run build
      - run: npm test
      - run: npm publish --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### 8c. Release Process

```bash
# 1. Update CHANGELOG.md
# 2. Bump version
npm version patch  # or minor/major
# 3. Push with tag
git push --follow-tags
# 4. CI publishes to npm automatically
```

### 8d. README Badges

```markdown
[![npm version](https://img.shields.io/npm/v/synthesis-mcp)](https://www.npmjs.com/package/synthesis-mcp)
[![CI](https://github.com/user/synthesis-mcp/actions/workflows/ci.yml/badge.svg)](...)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](...)
```

---

## Phase 9: Distributed Rate Limiting (HTTP Scale)

**Why**: In-memory rate limiter doesn't survive restarts or scale across instances.

**Files**: `src/utils/rate-limiter.ts` (new), `src/mcp/server-http.ts`

1. Extract rate limiter into module with `RateLimiter` interface
2. Default: in-memory (current behavior, zero deps)
3. Optional Redis behind `REDIS_URL` env var:
   - `redis` as peer dependency (not required)
   - Sliding window via sorted sets
4. Opt-in: single-process deployments unchanged

---

## Phase 10: Docker & Deployment

**Why**: No containerization. Production deployments need reproducible builds.

**Files**: `Dockerfile`, `docker-compose.yml`, `.dockerignore`

1. Multi-stage Dockerfile:
   ```dockerfile
   FROM node:22-alpine AS builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build

   FROM node:22-alpine
   WORKDIR /app
   RUN addgroup -S mcp && adduser -S mcp -G mcp
   COPY --from=builder /app/dist ./dist
   COPY --from=builder /app/node_modules ./node_modules
   COPY --from=builder /app/package.json .
   USER mcp
   EXPOSE 3000
   CMD ["node", "dist/mcp/server-http.js"]
   ```
2. `docker-compose.yml` for local dev with env passthrough
3. `.dockerignore`: `node_modules`, `.git`, `src/`, `scripts/`, `tests/`
4. Publish to ghcr.io in the publish workflow
5. Document in README:
   ```bash
   docker run -e SYNTHESIS_API_KEY=sk_... ghcr.io/user/synthesis-mcp
   ```

---

## Execution Status

| Phase | Status | Date |
|-------|--------|------|
| 6. npm Packaging | **DONE** | 2026-03-27 |
| 1. Structured Logging | **DONE** | 2026-03-27 |
| 8. CI/CD Pipeline | **DONE** | 2026-03-27 |
| 2. Upstream Health Check | **DONE** | 2026-03-27 |
| 4. Graceful Shutdown | **DONE** | 2026-03-27 |
| 3. Cache Invalidation | **DONE** | 2026-03-27 |
| 5. Input Validation | **DONE** | 2026-03-27 |
| 7. Project Structure | **PARTIAL** | 2026-03-27 — CHANGELOG.md added; test relocation deferred |
| 10. Docker | **DONE** | 2026-03-27 |
| 9. Distributed Rate Limiting | **NOT STARTED** | — P3, only needed for multi-instance |

## Remaining Work

- **Phase 7 (partial)**: Move tests from `scripts/` to `tests/unit/`, `tests/integration/`. Add e2e test using MCP SDK Client. Low priority — tests work fine where they are.
- **Phase 9**: Extract rate limiter to interface, add optional Redis backend. Only needed for multi-instance HTTP deployments.
- **npm publish**: Run `npm publish --access public` after setting up NPM_TOKEN secret in GitHub repo settings. Or push a `v1.0.0` tag to trigger the publish workflow.
- **Repository URL**: Update `repository.url` in package.json and badge URLs in README when the actual GitHub repo URL is known.
