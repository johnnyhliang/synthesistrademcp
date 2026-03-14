import type { SynthesisClient } from './client.js';
import type { PolymarketEventWithMarkets } from '../types/index.js';

export interface PolymarketMarketsParams {
  sort?: 'left_price' | 'right_price' | 'liquidity' | 'volume' | 'volume24hr' | 'volume1wk' | 'volume1mo' | 'volume1yr' | 'created_at' | 'ends_at';
  order?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
  query?: string;
  title?: string;
  tags?: string;
  markets?: boolean;
}

// GET /api/v1/polymarket/markets
export async function listPolymarketMarkets(
  client: SynthesisClient,
  params: PolymarketMarketsParams = {}
): Promise<PolymarketEventWithMarkets[]> {
  return client.get<PolymarketEventWithMarkets[]>('polymarket/markets', params as Record<string, string | number | boolean | undefined>);
}

// GET /api/v1/polymarket/market/{condition_id}
export async function getPolymarketMarket(
  client: SynthesisClient,
  conditionId: string
): Promise<PolymarketEventWithMarkets> {
  return client.get<PolymarketEventWithMarkets>(`polymarket/market/${conditionId}`);
}

// GET /api/v1/polymarket/market/slug/{slug}
export async function getPolymarketMarketBySlug(
  client: SynthesisClient,
  slug: string,
  sort?: string,
  order?: 'ASC' | 'DESC'
): Promise<PolymarketEventWithMarkets> {
  return client.get<PolymarketEventWithMarkets>(`polymarket/market/slug/${encodeURIComponent(slug)}`, { sort, order });
}

// GET /api/v1/polymarket/market/{token_id}/price-history
export interface PriceHistoryParams {
  interval?: '1h' | '6h' | '1d' | '1w' | '1m' | 'all';
  volume?: boolean;
}

export async function getPolymarketPriceHistory(
  client: SynthesisClient,
  tokenId: string,
  params: PriceHistoryParams = {}
): Promise<unknown> {
  return client.get<unknown>(`polymarket/market/${tokenId}/price-history`, params as Record<string, string | number | boolean | undefined>);
}

// GET /api/v1/polymarket/market/{condition_id}/trades
export async function getPolymarketTrades(
  client: SynthesisClient,
  conditionId: string,
  limit?: number,
  offset?: number
): Promise<unknown[]> {
  return client.get<unknown[]>(`polymarket/market/${conditionId}/trades`, { limit, offset });
}

// GET /api/v1/polymarket/market/{token_id}/statistics
export async function getPolymarketStatistics(
  client: SynthesisClient,
  tokenId: string
): Promise<unknown> {
  return client.get<unknown>(`polymarket/market/${tokenId}/statistics`);
}
