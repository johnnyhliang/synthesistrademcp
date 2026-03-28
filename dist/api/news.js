export async function getNews(client, limit, offset) {
    return client.get('news', { limit, offset });
}
export async function getEventNews(client, eventId, limit, offset) {
    return client.get(`news/event/${encodeURIComponent(eventId)}`, { limit, offset });
}
export async function getMarketNews(client, marketId, limit, offset) {
    return client.get(`news/market/${encodeURIComponent(marketId)}`, { limit, offset });
}
