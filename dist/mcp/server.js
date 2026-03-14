#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SynthesisClient } from '../api/client.js';
import { registerTier1Tools } from './tools/tier1.js';
import { registerTier2Tools } from './tools/tier2.js';
import { registerTier3Tools } from './tools/tier3.js';
async function main() {
    const client = new SynthesisClient();
    const server = new McpServer({
        name: 'synthesis',
        version: '1.0.0',
    });
    // Tier 1 always registered — no auth needed
    registerTier1Tools(server, client);
    // Tier 2 always registered — tools return clear errors if no key is set
    registerTier2Tools(server, client);
    // Tier 3 only registered when explicitly enabled
    if (client.tradingEnabled) {
        registerTier3Tools(server, client);
        process.stderr.write('[synthesis] Trading tools enabled (Tier 3)\n');
    }
    process.stderr.write(`[synthesis] MCP server starting — ${client.authDescription}\n`);
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch((err) => {
    process.stderr.write(`[synthesis] Fatal error: ${err}\n`);
    process.exit(1);
});
