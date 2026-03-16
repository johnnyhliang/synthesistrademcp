import type { SynthesisClient } from './client.js';
import type { NewsArticle } from '../types/index.js';

// GET /api/v1/news
export async function getNews(
  client: SynthesisClient,
  limit?: number,
  offset?: number
): Promise<NewsArticle[]> {
  return client.get<NewsArticle[]>('news', { limit, offset });
}

// GET /api/v1/news/event/{event_id}
export async function getEventNews(
  client: SynthesisClient,
  eventId: string,
  limit?: number,
  offset?: number
): Promise<NewsArticle[]> {
  return client.get<NewsArticle[]>(`news/event/${encodeURIComponent(eventId)}`, { limit, offset });
}

// GET /api/v1/news/market/{market_id}
export async function getMarketNews(
  client: SynthesisClient,
  marketId: string,
  limit?: number,
  offset?: number
): Promise<NewsArticle[]> {
  return client.get<NewsArticle[]>(`news/market/${encodeURIComponent(marketId)}`, { limit, offset });
}
