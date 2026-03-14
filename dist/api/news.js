// GET /api/v1/news
export async function getNews(client, limit, offset) {
    return client.get('news', { limit, offset });
}
// GET /api/v1/news/event/{event_id}
export async function getEventNews(client, eventId, limit, offset) {
    return client.get(`news/event/${encodeURIComponent(eventId)}`, { limit, offset });
}
// GET /api/v1/news/market/{market_id}
export async function getMarketNews(client, marketId, limit, offset) {
    return client.get(`news/market/${encodeURIComponent(marketId)}`, { limit, offset });
}
