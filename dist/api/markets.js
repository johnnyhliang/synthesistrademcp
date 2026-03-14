export async function listMarkets(client, params = {}) {
    return client.get('markets', params);
}
// POST /api/v1/markets/sparklines
export async function getSparklines(client, markets) {
    return client.post('markets/sparklines', { markets });
}
// POST /api/v1/markets/prices — bulk, up to 5000
export async function getMarketPrices(client, markets) {
    return client.post('markets/prices', { markets });
}
// POST /api/v1/markets/orderbooks — bulk, up to 5000
export async function getOrderbooks(client, markets) {
    return client.post('markets/orderbooks', { markets });
}
// GET /api/v1/markets/orderbooks/historical
export async function getHistoricalOrderbooks(client, params) {
    return client.get('markets/orderbooks/historical', params);
}
export async function searchMarkets(client, query, params = {}) {
    return client.get(`markets/search/${encodeURIComponent(query)}`, params);
}
// GET /api/v1/markets/statistics
export async function getStatistics(client, venue, interval) {
    return client.get('markets/statistics', { venue, interval });
}
// GET /api/v1/markets/related/{slug}
export async function getRelatedMarkets(client, slug, limit, offset) {
    return client.get(`markets/related/${encodeURIComponent(slug)}`, { limit, offset });
}
// GET /api/v1/markets/similar
export async function getSimilarMarkets(client, marketId, venue) {
    return client.get('markets/similar', { market_id: marketId, venue });
}
// GET /api/v1/markets/similar-pairs
export async function getSimilarPairs(client, sort, order, limit, offset) {
    return client.get('markets/similar-pairs', { sort, order, limit, offset });
}
// GET /api/v1/recommendations — auth required
export async function getRecommendations(client, limit, offset) {
    client.requireAuth();
    return client.get('recommendations', { limit, offset });
}
