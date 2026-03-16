import type { SynthesisClient } from './client.js';
import type { Wallet } from '../types/index.js';

// All wallet endpoints use X-API-KEY header

// GET /api/v1/wallet — auto-creates first wallet if none exist
export async function getWallets(client: SynthesisClient): Promise<Wallet[]> {
  client.requireAuth();
  return client.get<Wallet[]>('wallet');
}

// POST /api/v1/wallet
export async function createWallet(client: SynthesisClient): Promise<Wallet> {
  client.requireAuth();
  return client.post<Wallet>('wallet', {});
}

// PUT /api/v1/wallet — reorder by position
export async function reorderWallets(
  client: SynthesisClient,
  walletIds: string[]
): Promise<string[]> {
  client.requireAuth();
  return client.put<string[]>('wallet', { wallet_ids: walletIds });
}

// PUT /api/v1/wallet/{wallet_id}
export async function updateWallet(
  client: SynthesisClient,
  walletId: string,
  updates: { name?: string; autoredeem?: boolean }
): Promise<Wallet> {
  client.requireAuth();
  return client.put<Wallet>(`wallet/${walletId}`, updates);
}

// DELETE /api/v1/wallet/{wallet_id}
export async function deleteWallet(
  client: SynthesisClient,
  walletId: string
): Promise<{ wallet_id: string; deleted: boolean }> {
  client.requireAuth();
  return client.delete<{ wallet_id: string; deleted: boolean }>(`wallet/${walletId}`);
}

// POST /api/v1/wallet/{chain_id}/{wallet_id}/export
export async function exportWallet(
  client: SynthesisClient,
  chainId: string,
  walletId: string,
  publicKey: string
): Promise<{ ciphertext: string; encapsulated_key: string }> {
  client.requireAuth();
  return client.post<{ ciphertext: string; encapsulated_key: string }>(
    `wallet/${chainId}/${walletId}/export`,
    { public_key: publicKey }
  );
}
