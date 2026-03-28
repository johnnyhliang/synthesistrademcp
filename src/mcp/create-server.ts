import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { SynthesisClient } from '../api/client.js';
import { registerTier1Tools } from './tools/tier1.js';
import { registerTier2Tools } from './tools/tier2.js';

export function createMcpServerWithTools(client: SynthesisClient): McpServer {
  const server = new McpServer({
    name: 'synthesis',
    version: '1.0.0',
  });

  registerTier1Tools(server, client);
  registerTier2Tools(server, client);

  return server;
}
