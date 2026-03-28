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

export async function listKalshiMarkets(
  client: SynthesisClient,
  params: KalshiMarketsParams = {}
): Promise<KalshiEventWithMarkets[]> {
  return client.get<KalshiEventWithMarkets[]>('kalshi/markets', params as unknown as Record<string, string | number | boolean | undefined>);
}

export async function getKalshiMarket(
  client: SynthesisClient,
  marketId: string
): Promise<KalshiEventWithMarkets> {
  return client.get<KalshiEventWithMarkets>(`kalshi/market/${marketId}`);
}

export async function getKalshiEvent(
  client: SynthesisClient,
  eventId: string,
  sort?: string,
  order?: 'ASC' | 'DESC'
): Promise<KalshiEventWithMarkets> {
  return client.get<KalshiEventWithMarkets>(`kalshi/market/event/${encodeURIComponent(eventId)}`, { sort, order });
}

export async function getKalshiMarketBySlug(
  client: SynthesisClient,
  slug: string,
  sort?: string,
  order?: 'ASC' | 'DESC'
): Promise<KalshiEventWithMarkets> {
  return client.get<KalshiEventWithMarkets>(`kalshi/market/slug/${encodeURIComponent(slug)}`, { sort, order });
}

export async function getKalshiTrades(
  client: SynthesisClient,
  marketId: string,
  limit?: number,
  offset?: number
): Promise<unknown[]> {
  return client.get<unknown[]>(`kalshi/market/${marketId}/trades`, { limit, offset });
}

export async function getKalshiHolders(
  client: SynthesisClient,
  marketId: string
): Promise<unknown[]> {
  return client.get<unknown[]>(`kalshi/market/${marketId}/holders`);
}

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

export async function getKalshiPriceHistory(
  client: SynthesisClient,
  seriesId: string,
  kalshiId: string,
  params: KalshiPriceHistoryParams
): Promise<unknown[]> {
  return client.get<unknown[]>(`kalshi/market/${seriesId}/${kalshiId}/price-history`, params as unknown as Record<string, string | number | boolean | undefined>);
}

export async function getKalshiCandlesticks(
  client: SynthesisClient,
  seriesId: string,
  kalshiId: string,
  params: KalshiPriceHistoryParams
): Promise<unknown[]> {
  return client.get<unknown[]>(`kalshi/market/${seriesId}/${kalshiId}/candlesticks`, params as unknown as Record<string, string | number | boolean | undefined>);
}

export async function getKalshiLeaderboard(
  client: SynthesisClient,
  metric?: string,
  limit?: number,
  since?: number
): Promise<unknown> {
  return client.get<unknown>('kalshi/leaderboard', { metric, limit, since });
}

export async function getKalshiUser(
  client: SynthesisClient,
  username: string
): Promise<unknown> {
  return client.get<unknown>(`kalshi/user/${encodeURIComponent(username)}`);
}
