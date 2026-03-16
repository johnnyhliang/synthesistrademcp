/**
 * Tier 2 — Auth-required tools (SYNTHESIS_API_KEY).
 * Wallets, account management, personalized recommendations.
 */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { SynthesisClient } from '../../api/client.js';
import { getRecommendations } from '../../api/markets.js';
import { getWallets, createWallet, updateWallet, deleteWallet, reorderWallets, exportWallet } from '../../api/wallets.js';
import { getSession, getApiKeys, getInterests, updateInterests } from '../../api/account.js';
import { summarize } from '../../utils/trim.js';

export function registerTier2Tools(server: McpServer, client: SynthesisClient): void {

  // ── Personalized recommendations ─────────────────────────────────────────────

  server.tool('get_recommendations',
    'Get personalized market recommendations based on account interests. Requires SYNTHESIS_API_KEY.',
    {
      limit: z.number().int().optional().describe('Default 20'),
      offset: z.number().int().optional(),
    },
    async (params) => {
      const data = await getRecommendations(client, params.limit, params.offset);
      return { content: [{ type: 'text', text: summarize(data) }] };
    }
  );

  // ── Account ───────────────────────────────────────────────────────────────────

  server.tool('get_account_session',
    'Verify current authentication status. Requires SYNTHESIS_API_KEY.',
    {},
    async () => {
      const data = await getSession(client);
      return { content: [{ type: 'text', text: summarize(data) }] };
    }
  );

  server.tool('get_api_keys',
    'List all API keys for the authenticated account. Requires SYNTHESIS_API_KEY.',
    {},
    async () => {
      const data = await getApiKeys(client);
      return { content: [{ type: 'text', text: summarize(data) }] };
    }
  );

  server.tool('get_interests',
    'Get account interest tags used for personalized recommendations. Requires SYNTHESIS_API_KEY.',
    {},
    async () => {
      const data = await getInterests(client);
      return { content: [{ type: 'text', text: summarize(data) }] };
    }
  );

  server.tool('update_interests',
    'Update account interest tags (1-10 tags). Requires SYNTHESIS_API_KEY.',
    {
      interests: z.array(z.string().min(2).max(20)).min(1).max(10),
    },
    async (params) => {
      const data = await updateInterests(client, params.interests);
      return { content: [{ type: 'text', text: summarize(data) }] };
    }
  );

  // ── Wallets ───────────────────────────────────────────────────────────────────

  server.tool('get_wallets',
    'Get wallets for the authenticated account (auto-creates first wallet if none exist). Requires SYNTHESIS_API_KEY.',
    {},
    async () => {
      const data = await getWallets(client);
      return { content: [{ type: 'text', text: summarize(data) }] };
    }
  );

  server.tool('create_wallet',
    'Create a new multi-chain wallet (Polygon + Solana). Requires SYNTHESIS_API_KEY.',
    {},
    async () => {
      const data = await createWallet(client);
      return { content: [{ type: 'text', text: summarize(data) }] };
    }
  );

  server.tool('update_wallet',
    'Update a wallet\'s name or autoredeem setting. Requires SYNTHESIS_API_KEY.',
    {
      wallet_id: z.string(),
      name: z.string().min(1).max(64).optional(),
      autoredeem: z.boolean().optional(),
    },
    async (params) => {
      const { wallet_id, ...updates } = params;
      const data = await updateWallet(client, wallet_id, updates);
      return { content: [{ type: 'text', text: summarize(data) }] };
    }
  );

  server.tool('delete_wallet',
    'Delete a wallet. All chain balances must be empty first. Requires SYNTHESIS_API_KEY.',
    { wallet_id: z.string() },
    async (params) => {
      const data = await deleteWallet(client, params.wallet_id);
      return { content: [{ type: 'text', text: summarize(data) }] };
    }
  );

  server.tool('reorder_wallets',
    'Reorder wallets by position. Pass wallet IDs in desired order. Requires SYNTHESIS_API_KEY.',
    {
      wallet_ids: z.array(z.string()).min(1).describe('Wallet IDs in desired display order'),
    },
    async (params) => {
      const data = await reorderWallets(client, params.wallet_ids);
      return { content: [{ type: 'text', text: summarize(data) }] };
    }
  );

  server.tool('export_wallet',
    'Export a wallet\'s encrypted private key material. WARNING: This exports sensitive cryptographic data. The response contains encrypted key material that can be used to reconstruct the wallet\'s private key. Handle with extreme care. Requires SYNTHESIS_API_KEY.',
    {
      chain_id: z.string().describe('Chain ID (e.g. "polygon", "solana")'),
      wallet_id: z.string().describe('Wallet ID to export'),
      public_key: z.string().describe('Your HPKE public key for encrypting the export'),
    },
    async (params) => {
      const data = await exportWallet(client, params.chain_id, params.wallet_id, params.public_key);
      return { content: [{ type: 'text', text: summarize(data) }] };
    }
  );

}
