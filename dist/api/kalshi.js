export async function listKalshiMarkets(client, params = {}) {
    return client.get('kalshi/markets', params);
}
export async function getKalshiMarket(client, marketId) {
    return client.get(`kalshi/market/${marketId}`);
}
export async function getKalshiEvent(client, eventId, sort, order) {
    return client.get(`kalshi/market/event/${encodeURIComponent(eventId)}`, { sort, order });
}
export async function getKalshiMarketBySlug(client, slug, sort, order) {
    return client.get(`kalshi/market/slug/${encodeURIComponent(slug)}`, { sort, order });
}
export async function getKalshiTrades(client, marketId, limit, offset) {
    return client.get(`kalshi/market/${marketId}/trades`, { limit, offset });
}
export async function getKalshiHolders(client, marketId) {
    return client.get(`kalshi/market/${marketId}/holders`);
}
export async function getKalshiStatistics(client, marketId) {
    return client.get(`kalshi/market/${marketId}/statistics`);
}
export async function getKalshiPriceHistory(client, seriesId, kalshiId, params) {
    return client.get(`kalshi/market/${seriesId}/${kalshiId}/price-history`, params);
}
export async function getKalshiCandlesticks(client, seriesId, kalshiId, params) {
    return client.get(`kalshi/market/${seriesId}/${kalshiId}/candlesticks`, params);
}
export async function getKalshiLeaderboard(client, metric, limit, since) {
    return client.get('kalshi/leaderboard', { metric, limit, since });
}
export async function getKalshiUser(client, username) {
    return client.get(`kalshi/user/${encodeURIComponent(username)}`);
}
