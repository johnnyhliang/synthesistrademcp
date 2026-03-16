import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { SynthesisClient } from '../api/client.js';
import { registerTier1Tools } from './tools/tier1.js';
import { registerTier2Tools } from './tools/tier2.js';

export function createMcpServerWithTools(client: SynthesisClient): McpServer {
  const server = new McpServer({
    name: 'synthesis',
    version: '1.0.0',
  });

  // Tier 1 always registered — no auth needed (28 tools)
  registerTier1Tools(server, client);

  // Tier 2 registered but errors at runtime if not authenticated (10 tools)
  registerTier2Tools(server, client);

  // Tier 3 (trading) and batch POST tools (get_market_prices, get_orderbooks, get_sparklines)
  // are NOT registered — upstream API returns 404/400 for all of them.
  // The API functions remain in src/api/ for when Synthesis enables these endpoints.
  // To re-enable, uncomment the Tier 3 block and re-add batch tools to tier1.ts.

  return server;
}
