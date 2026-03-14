/**
 * Tier 1 — All public endpoints. No authentication required.
 */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { SynthesisClient } from '../../api/client.js';
import {
  listMarkets, searchMarkets, getSparklines, getMarketPrices,
  getOrderbooks, getHistoricalOrderbooks, getStatistics,
  getRelatedMarkets, getSimilarMarkets, getSimilarPairs,
} from '../../api/markets.js';
import {
  listPolymarketMarkets, getPolymarketMarket, getPolymarketMarketBySlug,
  getPolymarketPriceHistory, getPolymarketTrades, getPolymarketStatistics,
} from '../../api/polymarket.js';
import {
  listKalshiMarkets, getKalshiMarket, getKalshiEvent, getKalshiMarketBySlug,
  getKalshiTrades, getKalshiHolders, getKalshiStatistics,
  getKalshiPriceHistory, getKalshiCandlesticks,
  getKalshiLeaderboard, getKalshiUser,
} from '../../api/kalshi.js';
import { getNews, getEventNews, getMarketNews } from '../../api/news.js';

export function registerTier1Tools(server: McpServer, client: SynthesisClient): void {

  // ── list_markets ────────────────────────────────────────────────────────────
  server.tool('list_markets',
    'List prediction markets from Polymarket and/or Kalshi with rich filtering and sorting.',
    {
      venue: z.enum(['polymarket', 'kalshi']).optional(),
      sort: z.enum(['liquidity', 'volume', 'created_at', 'ends_at', 'newest']).optional(),
      order: z.enum(['ASC', 'DESC']).optional(),
      limit: z.number().int().min(1).max(250).optional().describe('Default 100, max 250'),
      offset: z.number().int().min(0).optional(),
      min_price: z.number().min(0).max(1).optional(),
      max_price: z.number().min(0).max(1).optional(),
      min_ends_at: z.string().optional().describe('ISO 8601 or Unix timestamp'),
      max_ends_at: z.string().optional().describe('ISO 8601 or Unix timestamp'),
      rewards: z.boolean().optional(),
      live: z.boolean().optional(),
      tags: z.string().optional().describe('Comma-separated tags'),
    },
    async (params) => {
      const markets = await listMarkets(client, params);
      return { content: [{ type: 'text', text: JSON.stringify({ count: markets.length, markets }, null, 2) }] };
    }
  );

  // ── search_markets ──────────────────────────────────────────────────────────
  server.tool('search_markets',
    'Full-text search across market titles. Supports venue filtering, price range, and sort.',
    {
      query: z.string().describe('Search term'),
      venue: z.enum(['polymarket', 'kalshi']).optional(),
      labels: z.string().optional().describe('Comma-separated labels'),
      min_price: z.number().min(0).max(1).optional(),
      max_price: z.number().min(0).max(1).optional(),
      rewards: z.boolean().optional().describe('Polymarket only'),
      live: z.boolean().optional(),
      sort: z.enum(['liquidity', 'volume', 'closes_soon', 'probability', 'newest']).optional(),
      limit: z.number().int().min(1).max(100).optional().describe('Default 25, max 100'),
      offset: z.number().int().min(0).optional(),
    },
    async ({ query, ...params }) => {
      const results = await searchMarkets(client, query, params);
      return { content: [{ type: 'text', text: JSON.stringify({ query, count: results.length, results }, null, 2) }] };
    }
  );

  // ── get_market_prices ───────────────────────────────────────────────────────
  server.tool('get_market_prices',
    'Get current prices for multiple markets in one request. Pass Polymarket token IDs or Kalshi market IDs (up to 5000).',
    {
      markets: z.array(z.string()).min(1).max(5000).describe('Array of Polymarket token IDs or Kalshi market IDs'),
    },
    async (params) => {
      const prices = await getMarketPrices(client, params.markets);
      return { content: [{ type: 'text', text: JSON.stringify(prices, null, 2) }] };
    }
  );

  // ── get_orderbooks ──────────────────────────────────────────────────────────
  server.tool('get_orderbooks',
    'Get current orderbooks for multiple markets in one request (up to 5000).',
    {
      markets: z.array(z.string()).min(1).max(5000).describe('Array of Polymarket token IDs or Kalshi market IDs'),
    },
    async (params) => {
      const orderbooks = await getOrderbooks(client, params.markets);
      return { content: [{ type: 'text', text: JSON.stringify(orderbooks, null, 2) }] };
    }
  );

  // ── get_sparklines ──────────────────────────────────────────────────────────
  server.tool('get_sparklines',
    'Get historical price sparklines for a batch of markets.',
    {
      markets: z.array(z.string()).min(1).describe('Array of Polymarket token IDs or Kalshi market IDs (with optional :Yes/:No suffix for Kalshi)'),
    },
    async (params) => {
      const sparklines = await getSparklines(client, params.markets);
      return { content: [{ type: 'text', text: JSON.stringify(sparklines, null, 2) }] };
    }
  );

  // ── get_historical_orderbooks ───────────────────────────────────────────────
  server.tool('get_historical_orderbooks',
    'Get historical orderbook snapshots for a single market with time bucketing.',
    {
      venue: z.enum(['polymarket', 'kalshi']),
      token_id: z.string().optional().describe('Required for Polymarket'),
      market_id: z.string().optional().describe('Required for Kalshi'),
      start: z.union([z.string(), z.number()]).optional().describe('Start time (ISO 8601 or Unix seconds)'),
      end: z.union([z.string(), z.number()]).optional(),
      order: z.enum(['ASC', 'DESC']).optional(),
      limit: z.number().int().max(25000).optional(),
      bucket: z.enum(['30', '30s', '5m', '1h', '1d']).optional().describe('Time aggregation bucket'),
      points: z.number().int().max(25000).optional().describe('Target point count'),
    },
    async (params) => {
      const data = await getHistoricalOrderbooks(client, params as Parameters<typeof getHistoricalOrderbooks>[1]);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ── get_market_statistics ───────────────────────────────────────────────────
  server.tool('get_market_statistics',
    'Get aggregate platform statistics (total markets, active markets, volume) by venue and time interval.',
    {
      venue: z.enum(['polymarket', 'kalshi']).optional(),
      interval: z.enum(['24h', '1w', '1m', '6m', '1y']).optional().describe('Default 24h'),
    },
    async (params) => {
      const stats = await getStatistics(client, params.venue, params.interval);
      return { content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }] };
    }
  );

  // ── get_related_markets ─────────────────────────────────────────────────────
  server.tool('get_related_markets',
    'Find markets related by topic to a given event slug.',
    {
      slug: z.string().describe('Event slug'),
      limit: z.number().int().optional(),
      offset: z.number().int().optional(),
    },
    async (params) => {
      const data = await getRelatedMarkets(client, params.slug, params.limit, params.offset);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ── get_similar_markets ─────────────────────────────────────────────────────
  server.tool('get_similar_markets',
    'Find markets similar to a given market by similarity index (useful for cross-venue comparison).',
    {
      market_id: z.string().describe('Condition ID or Kalshi market ID'),
      venue: z.enum(['polymarket', 'kalshi']).optional(),
    },
    async (params) => {
      const data = await getSimilarMarkets(client, params.market_id, params.venue);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ── get_arbitrage_pairs ─────────────────────────────────────────────────────
  server.tool('get_arbitrage_pairs',
    'Get cross-venue market pairs sorted by arbitrage opportunity.',
    {
      sort: z.string().optional().describe('Default: arbitrage'),
      order: z.enum(['ASC', 'DESC']).optional(),
      limit: z.number().int().optional().describe('Default 25'),
      offset: z.number().int().optional(),
    },
    async (params) => {
      const data = await getSimilarPairs(client, params.sort, params.order, params.limit, params.offset);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ── Polymarket tools ─────────────────────────────────────────────────────────

  server.tool('list_polymarket_markets',
    'List Polymarket markets with sorting and filtering.',
    {
      sort: z.enum(['left_price', 'right_price', 'liquidity', 'volume', 'volume24hr', 'volume1wk', 'volume1mo', 'volume1yr', 'created_at', 'ends_at']).optional(),
      order: z.enum(['ASC', 'DESC']).optional(),
      limit: z.number().int().max(250).optional(),
      offset: z.number().int().optional(),
      query: z.string().optional().describe('Full-text search'),
      title: z.string().optional().describe('Case-insensitive partial match on title'),
      tags: z.string().optional(),
    },
    async (params) => {
      const markets = await listPolymarketMarkets(client, params);
      return { content: [{ type: 'text', text: JSON.stringify({ count: markets.length, markets }, null, 2) }] };
    }
  );

  server.tool('get_polymarket_market',
    'Get a specific Polymarket event and all its outcome markets by condition ID.',
    { condition_id: z.string().describe('0x hex condition ID') },
    async (params) => {
      const market = await getPolymarketMarket(client, params.condition_id);
      return { content: [{ type: 'text', text: JSON.stringify(market, null, 2) }] };
    }
  );

  server.tool('get_polymarket_market_by_slug',
    'Get a Polymarket event by slug.',
    {
      slug: z.string(),
      sort: z.string().optional(),
      order: z.enum(['ASC', 'DESC']).optional(),
    },
    async (params) => {
      const market = await getPolymarketMarketBySlug(client, params.slug, params.sort, params.order);
      return { content: [{ type: 'text', text: JSON.stringify(market, null, 2) }] };
    }
  );

  server.tool('get_polymarket_price_history',
    'Get historical prices and OHLC candles for a Polymarket token.',
    {
      token_id: z.string().describe('Polymarket token ID'),
      interval: z.enum(['1h', '6h', '1d', '1w', '1m', 'all']).optional().describe('Default 1h'),
      volume: z.boolean().optional().describe('Include volume data, default true'),
    },
    async (params) => {
      const data = await getPolymarketPriceHistory(client, params.token_id, { interval: params.interval, volume: params.volume });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool('get_polymarket_trades',
    'Get recent trades for a Polymarket market.',
    {
      condition_id: z.string(),
      limit: z.number().int().max(1000).optional().describe('Default 100'),
      offset: z.number().int().optional(),
    },
    async (params) => {
      const trades = await getPolymarketTrades(client, params.condition_id, params.limit, params.offset);
      return { content: [{ type: 'text', text: JSON.stringify(trades, null, 2) }] };
    }
  );

  server.tool('get_polymarket_statistics',
    'Get aggregate statistics (change, high, low) for a Polymarket token.',
    { token_id: z.string() },
    async (params) => {
      const stats = await getPolymarketStatistics(client, params.token_id);
      return { content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }] };
    }
  );

  // ── Kalshi tools ──────────────────────────────────────────────────────────────

  server.tool('list_kalshi_markets',
    'List Kalshi markets with sorting and filtering.',
    {
      sort: z.enum(['left_price', 'right_price', 'liquidity', 'volume', 'created_at', 'ends_at']).optional(),
      order: z.enum(['ASC', 'DESC']).optional(),
      limit: z.number().int().max(250).optional(),
      offset: z.number().int().optional(),
      query: z.string().optional(),
      title: z.string().optional(),
      category: z.string().optional(),
    },
    async (params) => {
      const markets = await listKalshiMarkets(client, params);
      return { content: [{ type: 'text', text: JSON.stringify({ count: markets.length, markets }, null, 2) }] };
    }
  );

  server.tool('get_kalshi_market',
    'Get a specific Kalshi market by market ID (e.g. KXPRESNOMD-28-GN).',
    { market_id: z.string() },
    async (params) => {
      const market = await getKalshiMarket(client, params.market_id);
      return { content: [{ type: 'text', text: JSON.stringify(market, null, 2) }] };
    }
  );

  server.tool('get_kalshi_event',
    'Get a Kalshi event and all its markets by event ID.',
    {
      event_id: z.string(),
      sort: z.string().optional(),
      order: z.enum(['ASC', 'DESC']).optional(),
    },
    async (params) => {
      const event = await getKalshiEvent(client, params.event_id, params.sort, params.order);
      return { content: [{ type: 'text', text: JSON.stringify(event, null, 2) }] };
    }
  );

  server.tool('get_kalshi_market_by_slug',
    'Get a Kalshi event by slug.',
    {
      slug: z.string(),
      sort: z.string().optional(),
      order: z.enum(['ASC', 'DESC']).optional(),
    },
    async (params) => {
      const market = await getKalshiMarketBySlug(client, params.slug, params.sort, params.order);
      return { content: [{ type: 'text', text: JSON.stringify(market, null, 2) }] };
    }
  );

  server.tool('get_kalshi_trades',
    'Get recent trades for a Kalshi market.',
    {
      market_id: z.string(),
      limit: z.number().int().max(1000).optional().describe('Default 100'),
      offset: z.number().int().optional(),
    },
    async (params) => {
      const trades = await getKalshiTrades(client, params.market_id, params.limit, params.offset);
      return { content: [{ type: 'text', text: JSON.stringify(trades, null, 2) }] };
    }
  );

  server.tool('get_kalshi_holders',
    'Get token holder distribution for a Kalshi market.',
    { market_id: z.string() },
    async (params) => {
      const holders = await getKalshiHolders(client, params.market_id);
      return { content: [{ type: 'text', text: JSON.stringify(holders, null, 2) }] };
    }
  );

  server.tool('get_kalshi_statistics',
    'Get aggregate statistics (change, high, low) for a Kalshi market.',
    { market_id: z.string() },
    async (params) => {
      const stats = await getKalshiStatistics(client, params.market_id);
      return { content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }] };
    }
  );

  server.tool('get_kalshi_price_history',
    'Get historical price data for a Kalshi market with optional time bucketing.',
    {
      series_id: z.string().describe('e.g. KXPRESNOMD'),
      kalshi_id: z.string().describe('e.g. d592acf8-f9d5-43e1-9fad-8337330d3415'),
      start: z.union([z.string(), z.number()]).describe('Start time (ISO 8601 or Unix seconds), required'),
      end: z.union([z.string(), z.number()]).optional(),
      bucket: z.string().optional().describe('Aggregation period'),
      points: z.number().int().optional(),
      order: z.enum(['ASC', 'DESC']).optional(),
      limit: z.number().int().optional(),
      offset: z.number().int().optional(),
    },
    async (params) => {
      const { series_id, kalshi_id, ...rest } = params;
      const data = await getKalshiPriceHistory(client, series_id, kalshi_id, rest as Parameters<typeof getKalshiPriceHistory>[3]);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool('get_kalshi_candlesticks',
    'Get OHLCV candlestick data for a Kalshi market.',
    {
      series_id: z.string(),
      kalshi_id: z.string(),
      start: z.union([z.string(), z.number()]),
      end: z.union([z.string(), z.number()]).optional(),
      bucket: z.string().optional(),
      points: z.number().int().optional(),
      order: z.enum(['ASC', 'DESC']).optional(),
      limit: z.number().int().optional(),
      offset: z.number().int().optional(),
    },
    async (params) => {
      const { series_id, kalshi_id, ...rest } = params;
      const data = await getKalshiCandlesticks(client, series_id, kalshi_id, rest as Parameters<typeof getKalshiCandlesticks>[3]);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool('get_kalshi_leaderboard',
    'Get the Kalshi platform leaderboard.',
    {
      metric: z.string().optional().describe('Default: volume'),
      limit: z.number().int().optional().describe('Default 100'),
      since: z.number().int().optional().describe('Days back, default 30'),
    },
    async (params) => {
      const data = await getKalshiLeaderboard(client, params.metric, params.limit, params.since);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool('get_kalshi_user',
    'Get public profile and trading metrics for a Kalshi username.',
    { username: z.string() },
    async (params) => {
      const data = await getKalshiUser(client, params.username);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ── News tools ────────────────────────────────────────────────────────────────

  server.tool('get_news',
    'Get recent news articles matched to prediction markets.',
    {
      limit: z.number().int().optional().describe('Default 10'),
      offset: z.number().int().optional(),
    },
    async (params) => {
      const news = await getNews(client, params.limit, params.offset);
      return { content: [{ type: 'text', text: JSON.stringify(news, null, 2) }] };
    }
  );

  server.tool('get_event_news',
    'Get news articles related to a specific prediction market event.',
    {
      event_id: z.string(),
      limit: z.number().int().optional(),
      offset: z.number().int().optional(),
    },
    async (params) => {
      const news = await getEventNews(client, params.event_id, params.limit, params.offset);
      return { content: [{ type: 'text', text: JSON.stringify(news, null, 2) }] };
    }
  );

  server.tool('get_market_news',
    'Get news articles related to a specific market.',
    {
      market_id: z.string(),
      limit: z.number().int().optional(),
      offset: z.number().int().optional(),
    },
    async (params) => {
      const news = await getMarketNews(client, params.market_id, params.limit, params.offset);
      return { content: [{ type: 'text', text: JSON.stringify(news, null, 2) }] };
    }
  );
}
