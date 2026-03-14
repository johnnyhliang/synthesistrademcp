// All wallet endpoints use X-API-KEY header
// GET /api/v1/wallet — auto-creates first wallet if none exist
export async function getWallets(client) {
    client.requireAuth();
    return client.get('wallet');
}
// POST /api/v1/wallet
export async function createWallet(client) {
    client.requireAuth();
    return client.post('wallet', {});
}
// PUT /api/v1/wallet — reorder by position
export async function reorderWallets(client, walletIds) {
    client.requireAuth();
    return client.put('wallet', { wallet_ids: walletIds });
}
// PUT /api/v1/wallet/{wallet_id}
export async function updateWallet(client, walletId, updates) {
    client.requireAuth();
    return client.put(`wallet/${walletId}`, updates);
}
// DELETE /api/v1/wallet/{wallet_id}
export async function deleteWallet(client, walletId) {
    client.requireAuth();
    return client.delete(`wallet/${walletId}`);
}
// POST /api/v1/wallet/{chain_id}/{wallet_id}/export
export async function exportWallet(client, chainId, walletId, publicKey) {
    client.requireAuth();
    return client.post(`wallet/${chainId}/${walletId}/export`, { public_key: publicKey });
}
