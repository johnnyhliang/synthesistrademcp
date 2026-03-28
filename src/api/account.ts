import type { SynthesisClient } from './client.js';
import type { AccountSession, ApiKeyInfo } from '../types/index.js';

export async function getSession(client: SynthesisClient): Promise<AccountSession> {
  client.requireAuth();
  return client.get<AccountSession>('account/session');
}

export async function getApiKeys(client: SynthesisClient): Promise<ApiKeyInfo[]> {
  client.requireAuth();
  return client.get<ApiKeyInfo[]>('account/api-key');
}

export async function getInterests(client: SynthesisClient): Promise<string[]> {
  client.requireAuth();
  return client.get<string[]>('account/interests');
}

export async function updateInterests(
  client: SynthesisClient,
  interests: string[]
): Promise<string[]> {
  client.requireAuth();
  return client.post<string[]>('account/interests', { interests });
}

export async function getProjectAccounts(
  client: SynthesisClient,
  limit?: number,
  offset?: number
): Promise<unknown[]> {
  client.requireProjectAuth();
  return client.get<unknown[]>('project/account', { limit, offset });
}

export async function createProjectAccount(
  client: SynthesisClient,
  metadata?: Record<string, unknown>
): Promise<unknown> {
  client.requireProjectAuth();
  return client.post<unknown>('project/account', { metadata });
}

export async function getProjectAccount(
  client: SynthesisClient,
  accountId: string
): Promise<unknown> {
  client.requireProjectAuth();
  return client.get<unknown>(`project/account/${accountId}`);
}

export async function createAccountSession(
  client: SynthesisClient,
  accountId: string
): Promise<unknown> {
  client.requireProjectAuth();
  return client.post<unknown>(`project/account/${accountId}/session`, {});
}
