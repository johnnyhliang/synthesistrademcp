import type { SynthesisClient } from './client.js';
import type { Wallet } from '../types/index.js';

export async function getWallets(client: SynthesisClient): Promise<Wallet[]> {
  client.requireAuth();
  return client.get<Wallet[]>('wallet');
}

export async function createWallet(client: SynthesisClient): Promise<Wallet> {
  client.requireAuth();
  return client.post<Wallet>('wallet', {});
}

export async function reorderWallets(
  client: SynthesisClient,
  walletIds: string[]
): Promise<string[]> {
  client.requireAuth();
  return client.put<string[]>('wallet', { wallet_ids: walletIds });
}

export async function updateWallet(
  client: SynthesisClient,
  walletId: string,
  updates: { name?: string; autoredeem?: boolean }
): Promise<Wallet> {
  client.requireAuth();
  return client.put<Wallet>(`wallet/${walletId}`, updates);
}

export async function deleteWallet(
  client: SynthesisClient,
  walletId: string
): Promise<{ wallet_id: string; deleted: boolean }> {
  client.requireAuth();
  return client.delete<{ wallet_id: string; deleted: boolean }>(`wallet/${walletId}`);
}

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
