export async function getBalances(client) {
    client.requireAuth();
    return client.get('polygon/balances');
}
export async function getOrders(client) {
    client.requireAuth();
    return client.get('polygon/orders');
}
export async function getSwaps(client) {
    client.requireAuth();
    return client.get('polygon/swaps');
}
export async function placeOrder(client, order) {
    client.requireTrading();
    return client.post('polygon/orders', order);
}
export async function cancelOrder(client, orderId) {
    client.requireTrading();
    return client.post('polygon/orders/cancel', { order_id: orderId });
}
export async function executeSwap(client, swap) {
    client.requireTrading();
    return client.post('polygon/swaps', swap);
}
export async function withdraw(client, params) {
    client.requireTrading();
    return client.post('polygon/withdraw', params);
}
