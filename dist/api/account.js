// ─── Account (X-API-KEY) ──────────────────────────────────────────────────────
// GET /api/v1/account/session
export async function getSession(client) {
    client.requireAuth();
    return client.get('account/session');
}
// GET /api/v1/account/api-key
export async function getApiKeys(client) {
    client.requireAuth();
    return client.get('account/api-key');
}
// GET /api/v1/account/interests
export async function getInterests(client) {
    client.requireAuth();
    return client.get('account/interests');
}
// POST /api/v1/account/interests
export async function updateInterests(client, interests) {
    client.requireAuth();
    return client.post('account/interests', { interests });
}
// ─── Project (X-PROJECT-API-KEY) ─────────────────────────────────────────────
// GET /api/v1/project/account
export async function getProjectAccounts(client, limit, offset) {
    client.requireProjectAuth();
    return client.get('project/account', { limit, offset });
}
// POST /api/v1/project/account
export async function createProjectAccount(client, metadata) {
    client.requireProjectAuth();
    return client.post('project/account', { metadata });
}
// GET /api/v1/project/account/{account_id}
export async function getProjectAccount(client, accountId) {
    client.requireProjectAuth();
    return client.get(`project/account/${accountId}`);
}
// POST /api/v1/project/account/{account_id}/session
export async function createAccountSession(client, accountId) {
    client.requireProjectAuth();
    return client.post(`project/account/${accountId}/session`, {});
}
