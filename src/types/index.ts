export interface ApiResponse<T> {
  success: boolean;
  response: T;
}

export interface LiveData {
  live: boolean;
  ended: boolean;
  score: string | null;
  period: string | null;
  elapsed: string | null;
  game_id: string | null;
  game_status: string | null;
}

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

export interface DflowData {
  noMint: unknown;
  yesMint: unknown;
  marketLedger: unknown;
  isInitialized: boolean;
  redemptionStatus: unknown;
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
  dflow: Record<string, DflowData> | null;
  jupiter: boolean;
  ends_at: string;
  created_at: string;
  updated_at: string;
}

export interface KalshiEventWithMarkets {
  event: KalshiEvent;
  markets: KalshiMarket[];
}

export interface UnifiedMarket {
  venue: 'polymarket' | 'kalshi';
  event: PolymarketEvent | KalshiEvent;
  markets: PolymarketMarket[] | KalshiMarket[];
}

export interface NewsArticle {
  title: string;
  source: string;
  url: string;
  published_at: string;
  [key: string]: unknown;
}

export interface AccountSession {
  authenticated: boolean;
}

export interface ApiKeyInfo {
  public_key: string;
  name: string;
  active: boolean;
  created_at: string;
  [key: string]: unknown;
}

export interface WalletChain {
  address: string;
  [key: string]: unknown;
}

export interface Wallet {
  wallet_id: string;
  name: string;
  chains: Record<string, WalletChain>;
  position: number;
  autoredeem: boolean;
  [key: string]: unknown;
}

export interface TradeRecord {
  [key: string]: unknown;
}

export interface OrderRecord {
  [key: string]: unknown;
}

export interface SwapRecord {
  [key: string]: unknown;
}

export type AuthMode = 'account' | 'project' | 'session';

export interface ClientConfig {
  authMode?: AuthMode;
  apiKey?: string;
  projectApiKey?: string;
  baseUrl?: string;
}
