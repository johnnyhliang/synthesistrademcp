export async function getSession(client) {
    client.requireAuth();
    return client.get('account/session');
}
export async function getApiKeys(client) {
    client.requireAuth();
    return client.get('account/api-key');
}
export async function getInterests(client) {
    client.requireAuth();
    return client.get('account/interests');
}
export async function updateInterests(client, interests) {
    client.requireAuth();
    return client.post('account/interests', { interests });
}
export async function getProjectAccounts(client, limit, offset) {
    client.requireProjectAuth();
    return client.get('project/account', { limit, offset });
}
export async function createProjectAccount(client, metadata) {
    client.requireProjectAuth();
    return client.post('project/account', { metadata });
}
export async function getProjectAccount(client, accountId) {
    client.requireProjectAuth();
    return client.get(`project/account/${accountId}`);
}
export async function createAccountSession(client, accountId) {
    client.requireProjectAuth();
    return client.post(`project/account/${accountId}/session`, {});
}
