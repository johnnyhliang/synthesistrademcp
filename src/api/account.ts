import type { SynthesisClient } from './client.js';
import type { AccountSession, ApiKeyInfo } from '../types/index.js';

// ─── Account (X-API-KEY) ──────────────────────────────────────────────────────

// GET /api/v1/account/session
export async function getSession(client: SynthesisClient): Promise<AccountSession> {
  client.requireAuth();
  return client.get<AccountSession>('account/session');
}

// GET /api/v1/account/api-key
export async function getApiKeys(client: SynthesisClient): Promise<ApiKeyInfo[]> {
  client.requireAuth();
  return client.get<ApiKeyInfo[]>('account/api-key');
}

// GET /api/v1/account/interests
export async function getInterests(client: SynthesisClient): Promise<string[]> {
  client.requireAuth();
  return client.get<string[]>('account/interests');
}

// POST /api/v1/account/interests
export async function updateInterests(
  client: SynthesisClient,
  interests: string[]
): Promise<string[]> {
  client.requireAuth();
  return client.post<string[]>('account/interests', { interests });
}

// ─── Project (X-PROJECT-API-KEY) ─────────────────────────────────────────────

// GET /api/v1/project/account
export async function getProjectAccounts(
  client: SynthesisClient,
  limit?: number,
  offset?: number
): Promise<unknown[]> {
  client.requireProjectAuth();
  return client.get<unknown[]>('project/account', { limit, offset });
}

// POST /api/v1/project/account
export async function createProjectAccount(
  client: SynthesisClient,
  metadata?: Record<string, unknown>
): Promise<unknown> {
  client.requireProjectAuth();
  return client.post<unknown>('project/account', { metadata });
}

// GET /api/v1/project/account/{account_id}
export async function getProjectAccount(
  client: SynthesisClient,
  accountId: string
): Promise<unknown> {
  client.requireProjectAuth();
  return client.get<unknown>(`project/account/${accountId}`);
}

// POST /api/v1/project/account/{account_id}/session
export async function createAccountSession(
  client: SynthesisClient,
  accountId: string
): Promise<unknown> {
  client.requireProjectAuth();
  return client.post<unknown>(`project/account/${accountId}/session`, {});
}
