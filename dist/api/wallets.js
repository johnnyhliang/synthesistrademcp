export async function getWallets(client) {
    client.requireAuth();
    return client.get('wallet');
}
export async function createWallet(client) {
    client.requireAuth();
    return client.post('wallet', {});
}
export async function reorderWallets(client, walletIds) {
    client.requireAuth();
    return client.put('wallet', { wallet_ids: walletIds });
}
export async function updateWallet(client, walletId, updates) {
    client.requireAuth();
    return client.put(`wallet/${walletId}`, updates);
}
export async function deleteWallet(client, walletId) {
    client.requireAuth();
    return client.delete(`wallet/${walletId}`);
}
export async function exportWallet(client, chainId, walletId, publicKey) {
    client.requireAuth();
    return client.post(`wallet/${chainId}/${walletId}/export`, { public_key: publicKey });
}
