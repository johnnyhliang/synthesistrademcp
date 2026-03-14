// ─── API Response Envelope ────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  response: T;
}

// ─── Shared ───────────────────────────────────────────────────────────────────

export interface LiveData {
  live: boolean;
  ended: boolean;
  score: string | null;
  period: string | null;
  elapsed: string | null;
  game_id: string | null;
  game_status: string | null;
}

// ─── Polymarket ───────────────────────────────────────────────────────────────

export interface PolymarketEvent {
  event_id: number;
  title: string;
  slug: string;
  description: string;
  image: string;
  tags: string[];
  labels: string[];
  neg_risk: boolean;
  active: boolean;
  liquidity: number | string;
  volume: number | string;
  volume24hr: number | string;
  volume1wk: number | string;
  volume1mo: number | string;
  volume1yr?: number | string;
  ends_at: string;
  created_at: string;
  live?: LiveData;
}

export interface PolymarketMarket {
  event_id: number;
  condition_id: string;
  question: string;
  outcome: string;
  slug: string;
  description: string;
  image: string;
  left_outcome: string;
  right_outcome: string;
  left_price: number | string;
  right_price: number | string;
  left_token_id: string;
  right_token_id: string;
  winner_token_id: string | null;
  active: boolean;
  resolved: boolean;
  fees: unknown;
  decimals: number;
  liquidity: number | string;
  volume: number | string;
  volume24hr: number | string;
  volume1wk: number | string;
  volume1mo: number | string;
  volume1yr?: number | string;
  rewards: unknown;
  ends_at: string;
  created_at: string;
  updated_at: string;
}

export interface PolymarketEventWithMarkets {
  event: PolymarketEvent;
  markets: PolymarketMarket[];
}

// ─── Kalshi ───────────────────────────────────────────────────────────────────

export interface KalshiEvent {
  series_id: string;
  event_id: string;
  title: string;
  sub_title: string;
  slug: string;
  image: string;
  tags: string[];
  labels: string[];
  category: string;
  active: boolean;
  liquidity: string;
  volume: string;
  live: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  ends_at: string;
}

export interface KalshiMarket {
  series_id: string;
  event_id: string;
  market_id: string;
  kalshi_id: string;
  title: string;
  outcome: string;
  description: string;
  image: string;
  left_outcome: string;
  right_outcome: string;
  left_price: number | string;
  right_price: number | string;
  left_token_id: string | null;
  right_token_id: string | null;
  winner_token_id: string | null;
  active: boolean;
  resolved: boolean;
  claimable: boolean;
  liquidity: number | string;
  open_interest: number | string;
  volume: number | string;
  volume24hr: number | string;
  dflow: boolean;
  jupiter: boolean;
  ends_at: string;
  created_at: string;
  updated_at: string;
}

export interface KalshiEventWithMarkets {
  event: KalshiEvent;
  markets: KalshiMarket[];
}

// ─── Unified Market ───────────────────────────────────────────────────────────

export interface UnifiedMarket {
  venue: 'polymarket' | 'kalshi';
  event: PolymarketEvent | KalshiEvent;
  markets: PolymarketMarket[] | KalshiMarket[];
}

// ─── Query Params ─────────────────────────────────────────────────────────────

export interface MarketsParams {
  venue?: 'polymarket' | 'kalshi';
  limit?: number;
  offset?: number;
  search?: string;
  tag?: string;
  active?: boolean;
  sort?: string;
}

// ─── Auth / Config ────────────────────────────────────────────────────────────

export type AuthMode = 'account' | 'project' | 'session';

export interface ClientConfig {
  /** Auth mode — defaults to 'account' */
  authMode?: AuthMode;
  /** Bearer token (account API key or session token) */
  apiKey?: string;
  /** Project API key — used with authMode 'project' */
  projectApiKey?: string;
  baseUrl?: string;
}
