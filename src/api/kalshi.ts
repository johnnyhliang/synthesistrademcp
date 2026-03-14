import type { SynthesisClient } from './client.js';
import type { KalshiEventWithMarkets } from '../types/index.js';

export interface KalshiMarketsParams {
  sort?: 'left_price' | 'right_price' | 'liquidity' | 'volume' | 'created_at' | 'ends_at';
  order?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
  query?: string;
  title?: string;
  category?: string;
  markets?: boolean;
}

// GET /api/v1/kalshi/markets
export async function listKalshiMarkets(
  client: SynthesisClient,
  params: KalshiMarketsParams = {}
): Promise<KalshiEventWithMarkets[]> {
  return client.get<KalshiEventWithMarkets[]>('kalshi/markets', params as unknown as Record<string, string | number | boolean | undefined>);
}

// GET /api/v1/kalshi/market/{market_id}
export async function getKalshiMarket(
  client: SynthesisClient,
  marketId: string
): Promise<KalshiEventWithMarkets> {
  return client.get<KalshiEventWithMarkets>(`kalshi/market/${marketId}`);
}

// GET /api/v1/kalshi/market/event/{event_id}
export async function getKalshiEvent(
  client: SynthesisClient,
  eventId: string,
  sort?: string,
  order?: 'ASC' | 'DESC'
): Promise<KalshiEventWithMarkets> {
  return client.get<KalshiEventWithMarkets>(`kalshi/market/event/${encodeURIComponent(eventId)}`, { sort, order });
}

// GET /api/v1/kalshi/market/slug/{slug}
export async function getKalshiMarketBySlug(
  client: SynthesisClient,
  slug: string,
  sort?: string,
  order?: 'ASC' | 'DESC'
): Promise<KalshiEventWithMarkets> {
  return client.get<KalshiEventWithMarkets>(`kalshi/market/slug/${encodeURIComponent(slug)}`, { sort, order });
}

// GET /api/v1/kalshi/market/{market_id}/trades
export async function getKalshiTrades(
  client: SynthesisClient,
  marketId: string,
  limit?: number,
  offset?: number
): Promise<unknown[]> {
  return client.get<unknown[]>(`kalshi/market/${marketId}/trades`, { limit, offset });
}

// GET /api/v1/kalshi/market/{market_id}/holders
export async function getKalshiHolders(
  client: SynthesisClient,
  marketId: string
): Promise<unknown[]> {
  return client.get<unknown[]>(`kalshi/market/${marketId}/holders`);
}

// GET /api/v1/kalshi/market/{market_id}/statistics
export async function getKalshiStatistics(
  client: SynthesisClient,
  marketId: string
): Promise<unknown> {
  return client.get<unknown>(`kalshi/market/${marketId}/statistics`);
}

export interface KalshiPriceHistoryParams {
  start: string | number;
  end?: string | number;
  bucket?: string;
  points?: number;
  order?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

// GET /api/v1/kalshi/market/{series_id}/{kalshi_id}/price-history
export async function getKalshiPriceHistory(
  client: SynthesisClient,
  seriesId: string,
  kalshiId: string,
  params: KalshiPriceHistoryParams
): Promise<unknown[]> {
  return client.get<unknown[]>(`kalshi/market/${seriesId}/${kalshiId}/price-history`, params as unknown as Record<string, string | number | boolean | undefined>);
}

// GET /api/v1/kalshi/market/{series_id}/{kalshi_id}/candlesticks
export async function getKalshiCandlesticks(
  client: SynthesisClient,
  seriesId: string,
  kalshiId: string,
  params: KalshiPriceHistoryParams
): Promise<unknown[]> {
  return client.get<unknown[]>(`kalshi/market/${seriesId}/${kalshiId}/candlesticks`, params as unknown as Record<string, string | number | boolean | undefined>);
}

// GET /api/v1/kalshi/leaderboard — public
export async function getKalshiLeaderboard(
  client: SynthesisClient,
  metric?: string,
  limit?: number,
  since?: number
): Promise<unknown> {
  return client.get<unknown>('kalshi/leaderboard', { metric, limit, since });
}

// GET /api/v1/kalshi/user/{username} — public
export async function getKalshiUser(
  client: SynthesisClient,
  username: string
): Promise<unknown> {
  return client.get<unknown>(`kalshi/user/${encodeURIComponent(username)}`);
}
