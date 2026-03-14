import type { SynthesisClient } from './client.js';

// GET /api/v1/news
export async function getNews(
  client: SynthesisClient,
  limit?: number,
  offset?: number
): Promise<unknown[]> {
  return client.get<unknown[]>('news', { limit, offset });
}

// GET /api/v1/news/event/{event_id}
export async function getEventNews(
  client: SynthesisClient,
  eventId: string,
  limit?: number,
  offset?: number
): Promise<unknown[]> {
  return client.get<unknown[]>(`news/event/${encodeURIComponent(eventId)}`, { limit, offset });
}

// GET /api/v1/news/market/{market_id}
export async function getMarketNews(
  client: SynthesisClient,
  marketId: string,
  limit?: number,
  offset?: number
): Promise<unknown[]> {
  return client.get<unknown[]>(`news/market/${encodeURIComponent(marketId)}`, { limit, offset });
}
