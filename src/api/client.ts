import type { ApiResponse, AuthMode, ClientConfig } from '../types/index.js';

const DEFAULT_BASE_URL = 'https://api.synthesis.trade/api/v1';

export class SynthesisClient {
  private baseUrl: string;
  private authMode: AuthMode;
  private apiKey?: string;       // Bearer token (account key or session token)
  private projectApiKey?: string; // X-PROJECT-API-KEY

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
    return process.env.ENABLE_TRADING === 'true';
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

  async get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    const url = new URL(`${this.baseUrl}/${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: this.headers(),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new SynthesisError(res.status, path, body);
    }

    const json = await res.json() as ApiResponse<T>;

    if (!json.success) {
      throw new SynthesisError(200, path, 'API returned success: false');
    }

    return json.response;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}/${path}`, {
      method,
      headers: this.headers(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
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
    if (!this.tradingEnabled) {
      throw new Error('Trading tools are disabled. Set ENABLE_TRADING=true in your MCP server config to enable them.');
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
