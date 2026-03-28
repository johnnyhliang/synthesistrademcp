import { log } from '../utils/logger.js';
const DEFAULT_BASE_URL = 'https://synthesis.trade/api/v1';
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const CACHE_TTL_MS = 60_000;
const MAX_CACHE_ENTRIES = 1000;
export class SynthesisClient {
    baseUrl;
    authMode;
    apiKey;
    projectApiKey;
    cache = new Map();
    constructor(config = {}) {
        this.baseUrl = config.baseUrl ?? process.env.SYNTHESIS_BASE_URL ?? DEFAULT_BASE_URL;
        this.authMode = config.authMode
            ?? process.env.SYNTHESIS_AUTH_MODE
            ?? 'account';
        this.apiKey = config.apiKey ?? process.env.SYNTHESIS_API_KEY;
        this.projectApiKey = config.projectApiKey ?? process.env.SYNTHESIS_PROJECT_API_KEY;
    }
    get hasAuth() {
        if (this.authMode === 'project')
            return !!this.projectApiKey;
        return !!this.apiKey;
    }
    get tradingEnabled() {
        return process.env.ENABLE_TRADING === 'true' && !!process.env.TRADING_CONFIRMATION_PHRASE;
    }
    get maxOrderSizeUsdc() {
        const v = process.env.MAX_ORDER_SIZE_USDC;
        return v ? Math.max(1, Number(v)) : 100;
    }
    get authDescription() {
        if (!this.hasAuth)
            return 'unauthenticated (Tier 1 only)';
        switch (this.authMode) {
            case 'project': return 'project API key';
            case 'session': return 'user session';
            case 'account': return 'account API key';
        }
    }
    headers() {
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'synthesismcp/1.0',
        };
        switch (this.authMode) {
            case 'account':
                if (this.apiKey) {
                    headers['Authorization'] = `Bearer ${this.apiKey}`;
                    headers['X-API-KEY'] = this.apiKey;
                }
                break;
            case 'project':
                if (this.projectApiKey) {
                    headers['X-PROJECT-API-KEY'] = this.projectApiKey;
                }
                break;
            case 'session':
                if (this.apiKey) {
                    headers['Authorization'] = `Bearer ${this.apiKey}`;
                }
                break;
        }
        return headers;
    }
    async fetchWithRetry(url, init) {
        let lastError;
        const method = init.method ?? 'GET';
        const path = url.replace(this.baseUrl, '');
        const t0 = Date.now();
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
            try {
                const res = await fetch(url, { ...init, signal: controller.signal });
                if (res.status === 429 || res.status >= 500) {
                    lastError = new SynthesisError(res.status, url, (await res.text().catch(() => '')).slice(0, 200));
                    if (attempt < MAX_RETRIES) {
                        log.warn('upstream_retry', { method, path, status: res.status, attempt });
                        await new Promise(r => setTimeout(r, Math.min(1000 * 2 ** attempt, 8000)));
                        continue;
                    }
                }
                log.debug('upstream_ok', { method, path, status: res.status, duration_ms: Date.now() - t0 });
                return res;
            }
            catch (err) {
                lastError = err instanceof Error ? err : new Error(String(err));
                if (attempt < MAX_RETRIES) {
                    log.warn('upstream_retry', { method, path, error: lastError.message, attempt });
                    await new Promise(r => setTimeout(r, Math.min(1000 * 2 ** attempt, 8000)));
                    continue;
                }
            }
            finally {
                clearTimeout(timer);
            }
        }
        log.error('upstream_failed', { method, path, duration_ms: Date.now() - t0, error: lastError?.message });
        throw lastError ?? new Error('Request failed after retries');
    }
    cacheKey(url) {
        const key = this.apiKey ?? this.projectApiKey ?? '';
        const keySlice = key.length >= 8 ? key.slice(-8) : key;
        return `${this.authMode}:${keySlice}:${url}`;
    }
    getCached(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return undefined;
        if (Date.now() > entry.expires) {
            this.cache.delete(key);
            return undefined;
        }
        return entry.data;
    }
    setCache(key, data) {
        const now = Date.now();
        for (const [k, v] of this.cache) {
            if (now > v.expires)
                this.cache.delete(k);
        }
        if (this.cache.size >= MAX_CACHE_ENTRIES) {
            let oldestKey;
            let oldestTime = Infinity;
            for (const [k, v] of this.cache) {
                if (v.insertedAt < oldestTime) {
                    oldestTime = v.insertedAt;
                    oldestKey = k;
                }
            }
            if (oldestKey)
                this.cache.delete(oldestKey);
        }
        this.cache.set(key, { data, expires: now + CACHE_TTL_MS, insertedAt: now });
    }
    async get(path, params) {
        const url = new URL(`${this.baseUrl}/${path}`);
        if (params) {
            for (const [key, value] of Object.entries(params)) {
                if (value !== undefined) {
                    url.searchParams.set(key, String(value));
                }
            }
        }
        const ck = this.cacheKey(url.toString());
        const cached = this.getCached(ck);
        if (cached !== undefined)
            return cached;
        const res = await this.fetchWithRetry(url.toString(), {
            method: 'GET',
            headers: this.headers(),
        });
        if (!res.ok) {
            const body = (await res.text().catch(() => '')).slice(0, 200);
            throw new SynthesisError(res.status, path, body);
        }
        const json = await res.json();
        if (!json.success) {
            throw new SynthesisError(200, path, 'API returned success: false');
        }
        this.setCache(ck, json.response);
        return json.response;
    }
    invalidateCache(pathPrefix) {
        for (const key of this.cache.keys()) {
            if (key.includes(pathPrefix))
                this.cache.delete(key);
        }
    }
    async request(method, path, body) {
        const res = await this.fetchWithRetry(`${this.baseUrl}/${path}`, {
            method,
            headers: this.headers(),
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        if (!res.ok) {
            const text = (await res.text().catch(() => '')).slice(0, 200);
            throw new SynthesisError(res.status, path, text);
        }
        const json = await res.json();
        if (!json.success) {
            throw new SynthesisError(200, path, 'API returned success: false');
        }
        const basePath = path.split('?')[0].split('/')[0];
        if (basePath)
            this.invalidateCache(basePath);
        return json.response;
    }
    async post(path, body) {
        return this.request('POST', path, body);
    }
    async put(path, body) {
        return this.request('PUT', path, body);
    }
    async delete(path) {
        return this.request('DELETE', path);
    }
    requireAuth() {
        if (!this.apiKey) {
            throw new Error('This tool requires authentication. Set SYNTHESIS_API_KEY in your MCP server config.');
        }
    }
    requireProjectAuth() {
        if (!this.projectApiKey) {
            throw new Error('This tool requires a project API key. Set SYNTHESIS_PROJECT_API_KEY in your MCP server config.');
        }
    }
    requireTrading() {
        this.requireAuth();
        if (process.env.ENABLE_TRADING !== 'true') {
            throw new Error('Trading tools are disabled. Set ENABLE_TRADING=true in your MCP server config to enable them.');
        }
        if (!process.env.TRADING_CONFIRMATION_PHRASE) {
            throw new Error('Trading requires a confirmation phrase. Set TRADING_CONFIRMATION_PHRASE to a secret phrase in your MCP server config.');
        }
    }
    verifyTradingConfirmation(phrase) {
        this.requireTrading();
        const expected = process.env.TRADING_CONFIRMATION_PHRASE;
        if (phrase !== expected) {
            throw new Error('Trading confirmation phrase does not match. Check your TRADING_CONFIRMATION_PHRASE env var.');
        }
    }
    verifyOrderSize(sizeUsdc) {
        const max = this.maxOrderSizeUsdc;
        if (sizeUsdc > max) {
            throw new Error(`Order size $${sizeUsdc} exceeds maximum allowed $${max}. Set MAX_ORDER_SIZE_USDC to increase the limit.`);
        }
    }
}
export class SynthesisError extends Error {
    status;
    path;
    constructor(status, path, message) {
        super(`Synthesis API error ${status} on ${path}: ${message}`);
        this.status = status;
        this.path = path;
        this.name = 'SynthesisError';
    }
}
