#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SynthesisClient } from '../api/client.js';
import { createMcpServerWithTools } from './create-server.js';

async function main() {
  const client = new SynthesisClient();
  const server = createMcpServerWithTools(client);

  
  process.stderr.write(`[synthesis] MCP server starting — ${client.authDescription}\n`);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(`[synthesis] Fatal error: ${err}\n`);
  process.exit(1);
});
