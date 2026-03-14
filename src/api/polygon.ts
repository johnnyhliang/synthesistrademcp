import type { SynthesisClient } from './client.js';

// ─── All Polygon endpoints require auth ───────────────────────────────────────

export async function getBalances(client: SynthesisClient): Promise<unknown> {
  client.requireAuth();
  return client.get<unknown>('polygon/balances');
}

export async function getOrders(client: SynthesisClient): Promise<unknown> {
  client.requireAuth();
  return client.get<unknown>('polygon/orders');
}

export async function getSwaps(client: SynthesisClient): Promise<unknown> {
  client.requireAuth();
  return client.get<unknown>('polygon/swaps');
}

// ─── Trading endpoints require auth + ENABLE_TRADING=true ────────────────────

export async function placeOrder(
  client: SynthesisClient,
  order: { condition_id: string; side: 'buy' | 'sell'; price: number; size: number }
): Promise<unknown> {
  client.requireTrading();
  return client.post<unknown>('polygon/orders', order);
}

export async function cancelOrder(
  client: SynthesisClient,
  orderId: string
): Promise<unknown> {
  client.requireTrading();
  return client.post<unknown>('polygon/orders/cancel', { order_id: orderId });
}

export async function executeSwap(
  client: SynthesisClient,
  swap: { from_token: string; to_token: string; amount: number }
): Promise<unknown> {
  client.requireTrading();
  return client.post<unknown>('polygon/swaps', swap);
}

export async function withdraw(
  client: SynthesisClient,
  params: { amount: number; address: string; network: string }
): Promise<unknown> {
  client.requireTrading();
  return client.post<unknown>('polygon/withdraw', params);
}
