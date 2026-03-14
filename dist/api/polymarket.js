// GET /api/v1/polymarket/markets
export async function listPolymarketMarkets(client, params = {}) {
    return client.get('polymarket/markets', params);
}
// GET /api/v1/polymarket/market/{condition_id}
export async function getPolymarketMarket(client, conditionId) {
    return client.get(`polymarket/market/${conditionId}`);
}
// GET /api/v1/polymarket/market/slug/{slug}
export async function getPolymarketMarketBySlug(client, slug, sort, order) {
    return client.get(`polymarket/market/slug/${encodeURIComponent(slug)}`, { sort, order });
}
export async function getPolymarketPriceHistory(client, tokenId, params = {}) {
    return client.get(`polymarket/market/${tokenId}/price-history`, params);
}
// GET /api/v1/polymarket/market/{condition_id}/trades
export async function getPolymarketTrades(client, conditionId, limit, offset) {
    return client.get(`polymarket/market/${conditionId}/trades`, { limit, offset });
}
// GET /api/v1/polymarket/market/{token_id}/statistics
export async function getPolymarketStatistics(client, tokenId) {
    return client.get(`polymarket/market/${tokenId}/statistics`);
}
