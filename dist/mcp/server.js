#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SynthesisClient } from '../api/client.js';
import { createMcpServerWithTools } from './create-server.js';
import { log } from '../utils/logger.js';
async function main() {
    const client = new SynthesisClient();
    const server = createMcpServerWithTools(client);
    log.info('server_start', { transport: 'stdio', auth: client.authDescription });
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch((err) => {
    log.error('fatal', { error: String(err) });
    process.exit(1);
});
