import type { SynthesisClient } from './client.js';
import type { UnifiedMarket } from '../types/index.js';

export interface MarketsParams {
  venue?: 'polymarket' | 'kalshi';
  sort?: 'liquidity' | 'volume' | 'created_at' | 'ends_at' | 'newest';
  order?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
  min_price?: number;
  max_price?: number;
  min_ends_at?: string;
  max_ends_at?: string;
  rewards?: boolean;
  live?: boolean;
  bonds?: boolean;
  tags?: string;
  markets?: boolean;
}

export async function listMarkets(
  client: SynthesisClient,
  params: MarketsParams = {}
): Promise<UnifiedMarket[]> {
  return client.get<UnifiedMarket[]>('markets', params as Record<string, string | number | boolean | undefined>);
}

export async function getSparklines(
  client: SynthesisClient,
  markets: string[]
): Promise<Record<string, number[]>> {
  return client.post<Record<string, number[]>>('markets/sparklines', { markets });
}

export async function getMarketPrices(
  client: SynthesisClient,
  markets: string[]
): Promise<Record<string, unknown>> {
  return client.post<Record<string, unknown>>('markets/prices', { markets });
}

export async function getOrderbooks(
  client: SynthesisClient,
  markets: string[]
): Promise<unknown[]> {
  return client.post<unknown[]>('markets/orderbooks', { markets });
}

export interface HistoricalOrderbooksParams {
  venue: 'polymarket' | 'kalshi';
  token_id?: string;
  market_id?: string;
  start?: string | number;
  end?: string | number;
  order?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
  bucket?: '30' | '30s' | '5m' | '1h' | '1d';
  points?: number;
}

export async function getHistoricalOrderbooks(
  client: SynthesisClient,
  params: HistoricalOrderbooksParams
): Promise<unknown[]> {
  return client.get<unknown[]>('markets/orderbooks/historical', params as unknown as Record<string, string | number | boolean | undefined>);
}

export interface SearchParams {
  venue?: 'polymarket' | 'kalshi';
  labels?: string;
  min_price?: number;
  max_price?: number;
  rewards?: boolean;
  live?: boolean;
  sort?: 'liquidity' | 'volume' | 'closes_soon' | 'probability' | 'newest';
  limit?: number;
  offset?: number;
}

export async function searchMarkets(
  client: SynthesisClient,
  query: string,
  params: SearchParams = {}
): Promise<UnifiedMarket[]> {
  return client.get<UnifiedMarket[]>(`markets/search/${encodeURIComponent(query)}`, params as Record<string, string | number | boolean | undefined>);
}

export async function getStatistics(
  client: SynthesisClient,
  venue?: 'polymarket' | 'kalshi',
  interval?: '24h' | '1w' | '1m' | '6m' | '1y'
): Promise<unknown> {
  return client.get<unknown>('markets/statistics', { venue, interval });
}

export async function getRelatedMarkets(
  client: SynthesisClient,
  slug: string,
  limit?: number,
  offset?: number
): Promise<unknown> {
  return client.get<unknown>(`markets/related/${encodeURIComponent(slug)}`, { limit, offset });
}

export async function getSimilarMarkets(
  client: SynthesisClient,
  marketId: string,
  venue?: 'polymarket' | 'kalshi'
): Promise<unknown> {
  return client.get<unknown>('markets/similar', { market_id: marketId, venue });
}

export async function getSimilarPairs(
  client: SynthesisClient,
  sort?: string,
  order?: 'ASC' | 'DESC',
  limit?: number,
  offset?: number
): Promise<unknown> {
  return client.get<unknown>('markets/similar-pairs', { sort, order, limit, offset });
}

export async function getRecommendations(
  client: SynthesisClient,
  limit?: number,
  offset?: number
): Promise<unknown> {
  client.requireAuth();
  return client.get<unknown>('recommendations', { limit, offset });
}
