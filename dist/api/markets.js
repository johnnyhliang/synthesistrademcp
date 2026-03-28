export async function listMarkets(client, params = {}) {
    return client.get('markets', params);
}
export async function getSparklines(client, markets) {
    return client.post('markets/sparklines', { markets });
}
export async function getMarketPrices(client, markets) {
    return client.post('markets/prices', { markets });
}
export async function getOrderbooks(client, markets) {
    return client.post('markets/orderbooks', { markets });
}
export async function getHistoricalOrderbooks(client, params) {
    return client.get('markets/orderbooks/historical', params);
}
export async function searchMarkets(client, query, params = {}) {
    return client.get(`markets/search/${encodeURIComponent(query)}`, params);
}
export async function getStatistics(client, venue, interval) {
    return client.get('markets/statistics', { venue, interval });
}
export async function getRelatedMarkets(client, slug, limit, offset) {
    return client.get(`markets/related/${encodeURIComponent(slug)}`, { limit, offset });
}
export async function getSimilarMarkets(client, marketId, venue) {
    return client.get('markets/similar', { market_id: marketId, venue });
}
export async function getSimilarPairs(client, sort, order, limit, offset) {
    return client.get('markets/similar-pairs', { sort, order, limit, offset });
}
export async function getRecommendations(client, limit, offset) {
    client.requireAuth();
    return client.get('recommendations', { limit, offset });
}
