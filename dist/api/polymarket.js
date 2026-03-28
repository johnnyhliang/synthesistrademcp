export async function listPolymarketMarkets(client, params = {}) {
    return client.get('polymarket/markets', params);
}
export async function getPolymarketMarket(client, conditionId) {
    return client.get(`polymarket/market/${conditionId}`);
}
export async function getPolymarketMarketBySlug(client, slug, sort, order) {
    return client.get(`polymarket/market/slug/${encodeURIComponent(slug)}`, { sort, order });
}
export async function getPolymarketPriceHistory(client, tokenId, params = {}) {
    return client.get(`polymarket/market/${tokenId}/price-history`, params);
}
export async function getPolymarketTrades(client, conditionId, limit, offset) {
    return client.get(`polymarket/market/${conditionId}/trades`, { limit, offset });
}
export async function getPolymarketStatistics(client, tokenId) {
    return client.get(`polymarket/market/${tokenId}/statistics`);
}
