// GET /api/v1/kalshi/markets
export async function listKalshiMarkets(client, params = {}) {
    return client.get('kalshi/markets', params);
}
// GET /api/v1/kalshi/market/{market_id}
export async function getKalshiMarket(client, marketId) {
    return client.get(`kalshi/market/${marketId}`);
}
// GET /api/v1/kalshi/market/event/{event_id}
export async function getKalshiEvent(client, eventId, sort, order) {
    return client.get(`kalshi/market/event/${encodeURIComponent(eventId)}`, { sort, order });
}
// GET /api/v1/kalshi/market/slug/{slug}
export async function getKalshiMarketBySlug(client, slug, sort, order) {
    return client.get(`kalshi/market/slug/${encodeURIComponent(slug)}`, { sort, order });
}
// GET /api/v1/kalshi/market/{market_id}/trades
export async function getKalshiTrades(client, marketId, limit, offset) {
    return client.get(`kalshi/market/${marketId}/trades`, { limit, offset });
}
// GET /api/v1/kalshi/market/{market_id}/holders
export async function getKalshiHolders(client, marketId) {
    return client.get(`kalshi/market/${marketId}/holders`);
}
// GET /api/v1/kalshi/market/{market_id}/statistics
export async function getKalshiStatistics(client, marketId) {
    return client.get(`kalshi/market/${marketId}/statistics`);
}
// GET /api/v1/kalshi/market/{series_id}/{kalshi_id}/price-history
export async function getKalshiPriceHistory(client, seriesId, kalshiId, params) {
    return client.get(`kalshi/market/${seriesId}/${kalshiId}/price-history`, params);
}
// GET /api/v1/kalshi/market/{series_id}/{kalshi_id}/candlesticks
export async function getKalshiCandlesticks(client, seriesId, kalshiId, params) {
    return client.get(`kalshi/market/${seriesId}/${kalshiId}/candlesticks`, params);
}
// GET /api/v1/kalshi/leaderboard — public
export async function getKalshiLeaderboard(client, metric, limit, since) {
    return client.get('kalshi/leaderboard', { metric, limit, since });
}
// GET /api/v1/kalshi/user/{username} — public
export async function getKalshiUser(client, username) {
    return client.get(`kalshi/user/${encodeURIComponent(username)}`);
}
