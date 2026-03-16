import type { ApiResponse, AuthMode, ClientConfig } from '../types/index.js';

const DEFAULT_BASE_URL = 'https://synthesis.trade/api/v1';
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const CACHE_TTL_MS = 60_000;
const MAX_CACHE_ENTRIES = 1000;

interface CacheEntry {
  data: unknown;
  expires: number;
  insertedAt: number;
}

export class SynthesisClient {
  private baseUrl: string;
  private authMode: AuthMode;
  private apiKey?: string;       // Bearer token (account key or session token)
  private projectApiKey?: string; // X-PROJECT-API-KEY
  private cache = new Map<string, CacheEntry>();

  constructor(config: ClientConfig = {}) {
    this.baseUrl = config.baseUrl ?? process.env.SYNTHESIS_BASE_URL ?? DEFAULT_BASE_URL;
    this.authMode = config.authMode
      ?? (process.env.SYNTHESIS_AUTH_MODE as AuthMode | undefined)
      ?? 'account';
    this.apiKey = config.apiKey ?? process.env.SYNTHESIS_API_KEY;
    this.projectApiKey = config.projectApiKey ?? process.env.SYNTHESIS_PROJECT_API_KEY;
  }

  get hasAuth(): boolean {
    if (this.authMode === 'project') return !!this.projectApiKey;
    return !!this.apiKey;
  }

  get tradingEnabled(): boolean {
    return process.env.ENABLE_TRADING === 'true' && !!process.env.TRADING_CONFIRMATION_PHRASE;
  }

  get maxOrderSizeUsdc(): number {
    const v = process.env.MAX_ORDER_SIZE_USDC;
    return v ? Math.max(1, Number(v)) : 100;
  }

  get authDescription(): string {
    if (!this.hasAuth) return 'unauthenticated (Tier 1 only)';
    switch (this.authMode) {
      case 'project': return 'project API key';
      case 'session': return 'user session';
      case 'account': return 'account API key';
    }
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'synthesismcp/1.0',
    };

    switch (this.authMode) {
      case 'account':
        // Long-lived personal key: Authorization: Bearer + X-API-KEY
        if (this.apiKey) {
          headers['Authorization'] = `Bearer ${this.apiKey}`;
          headers['X-API-KEY'] = this.apiKey;
        }
        break;

      case 'project':
        // Server/backend acting as a project
        if (this.projectApiKey) {
          headers['X-PROJECT-API-KEY'] = this.projectApiKey;
        }
        break;

      case 'session':
        // Short-lived session token from a project
        if (this.apiKey) {
          headers['Authorization'] = `Bearer ${this.apiKey}`;
        }
        break;
    }

    return headers;
  }

  private async fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const res = await fetch(url, { ...init, signal: controller.signal });
        if (res.status === 429 || res.status >= 500) {
          lastError = new SynthesisError(res.status, url, (await res.text().catch(() => '')).slice(0, 200));
          if (attempt < MAX_RETRIES) {
            await new Promise(r => setTimeout(r, Math.min(1000 * 2 ** attempt, 8000)));
            continue;
          }
        }
        return res;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, Math.min(1000 * 2 ** attempt, 8000)));
          continue;
        }
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastError ?? new Error('Request failed after retries');
  }

  /** Build a cache key that includes auth context to prevent cross-user leaks in multi-user HTTP mode. */
  private cacheKey(url: string): string {
    const key = this.apiKey ?? this.projectApiKey ?? '';
    const keySlice = key.length >= 8 ? key.slice(-8) : key;
    return `${this.authMode}:${keySlice}:${url}`;
  }

  private getCached<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.data as T;
  }

  private setCache(key: string, data: unknown): void {
    const now = Date.now();
    // Sweep expired entries on every insert
    for (const [k, v] of this.cache) {
      if (now > v.expires) this.cache.delete(k);
    }
    // If still at capacity, evict oldest by insertedAt
    if (this.cache.size >= MAX_CACHE_ENTRIES) {
      let oldestKey: string | undefined;
      let oldestTime = Infinity;
      for (const [k, v] of this.cache) {
        if (v.insertedAt < oldestTime) {
          oldestTime = v.insertedAt;
          oldestKey = k;
        }
      }
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, { data, expires: now + CACHE_TTL_MS, insertedAt: now });
  }

  async get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    const url = new URL(`${this.baseUrl}/${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const ck = this.cacheKey(url.toString());
    const cached = this.getCached<T>(ck);
    if (cached !== undefined) return cached;

    const res = await this.fetchWithRetry(url.toString(), {
      method: 'GET',
      headers: this.headers(),
    });

    if (!res.ok) {
      const body = (await res.text().catch(() => '')).slice(0, 200);
      throw new SynthesisError(res.status, path, body);
    }

    const json = await res.json() as ApiResponse<T>;

    if (!json.success) {
      throw new SynthesisError(200, path, 'API returned success: false');
    }

    this.setCache(ck, json.response);
    return json.response;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await this.fetchWithRetry(`${this.baseUrl}/${path}`, {
      method,
      headers: this.headers(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = (await res.text().catch(() => '')).slice(0, 200);
      throw new SynthesisError(res.status, path, text);
    }

    const json = await res.json() as ApiResponse<T>;
    if (!json.success) {
      throw new SynthesisError(200, path, 'API returned success: false');
    }

    return json.response;
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  requireAuth(): void {
    if (!this.apiKey) {
      throw new Error('This tool requires authentication. Set SYNTHESIS_API_KEY in your MCP server config.');
    }
  }

  requireProjectAuth(): void {
    if (!this.projectApiKey) {
      throw new Error('This tool requires a project API key. Set SYNTHESIS_PROJECT_API_KEY in your MCP server config.');
    }
  }

  requireTrading(): void {
    this.requireAuth();
    if (process.env.ENABLE_TRADING !== 'true') {
      throw new Error('Trading tools are disabled. Set ENABLE_TRADING=true in your MCP server config to enable them.');
    }
    if (!process.env.TRADING_CONFIRMATION_PHRASE) {
      throw new Error('Trading requires a confirmation phrase. Set TRADING_CONFIRMATION_PHRASE to a secret phrase in your MCP server config.');
    }
  }

  verifyTradingConfirmation(phrase: string): void {
    this.requireTrading();
    const expected = process.env.TRADING_CONFIRMATION_PHRASE!;
    if (phrase !== expected) {
      throw new Error('Trading confirmation phrase does not match. Check your TRADING_CONFIRMATION_PHRASE env var.');
    }
  }

  verifyOrderSize(sizeUsdc: number): void {
    const max = this.maxOrderSizeUsdc;
    if (sizeUsdc > max) {
      throw new Error(`Order size $${sizeUsdc} exceeds maximum allowed $${max}. Set MAX_ORDER_SIZE_USDC to increase the limit.`);
    }
  }
}

export class SynthesisError extends Error {
  constructor(
    public readonly status: number,
    public readonly path: string,
    message: string
  ) {
    super(`Synthesis API error ${status} on ${path}: ${message}`);
    this.name = 'SynthesisError';
  }
}
