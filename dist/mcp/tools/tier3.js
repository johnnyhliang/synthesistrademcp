/**
 * Tier 3 — Trading tools.
 * Requires SYNTHESIS_API_KEY + ENABLE_TRADING=true.
 * These tools are only registered when trading is explicitly enabled.
 */
import { z } from 'zod';
import { placeOrder, cancelOrder, executeSwap, withdraw } from '../../api/polygon.js';
export function registerTier3Tools(server, client) {
    // ── place_order ─────────────────────────────────────────────────────────────
    server.tool('place_order', 'Place a buy or sell order on Polymarket via Polygon. Requires SYNTHESIS_API_KEY and ENABLE_TRADING=true.', {
        condition_id: z.string().describe('The market condition ID'),
        side: z.enum(['buy', 'sell']).describe('Order side'),
        price: z.number().min(0.001).max(0.999).describe('Price in USDC (0.001 to 0.999)'),
        size: z.number().positive().describe('Order size in USDC'),
    }, async (params) => {
        const data = await placeOrder(client, {
            condition_id: params.condition_id,
            side: params.side,
            price: params.price,
            size: params.size,
        });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    });
    // ── cancel_order ────────────────────────────────────────────────────────────
    server.tool('cancel_order', 'Cancel an open order on Polygon. Requires SYNTHESIS_API_KEY and ENABLE_TRADING=true.', {
        order_id: z.string().describe('The order ID to cancel'),
    }, async (params) => {
        const data = await cancelOrder(client, params.order_id);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    });
    // ── swap ────────────────────────────────────────────────────────────────────
    server.tool('swap', 'Execute a token swap on Polygon. Requires SYNTHESIS_API_KEY and ENABLE_TRADING=true.', {
        from_token: z.string().describe('Token to swap from'),
        to_token: z.string().describe('Token to swap to'),
        amount: z.number().positive().describe('Amount to swap'),
    }, async (params) => {
        const data = await executeSwap(client, {
            from_token: params.from_token,
            to_token: params.to_token,
            amount: params.amount,
        });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    });
    // ── withdraw ─────────────────────────────────────────────────────────────────
    server.tool('withdraw', 'Withdraw funds from your Synthesis wallet. Requires SYNTHESIS_API_KEY and ENABLE_TRADING=true.', {
        amount: z.number().positive().describe('Amount in USDC to withdraw'),
        address: z.string().describe('Destination wallet address'),
        network: z.string().describe('Network to withdraw on (e.g. polygon, solana)'),
    }, async (params) => {
        const data = await withdraw(client, {
            amount: params.amount,
            address: params.address,
            network: params.network,
        });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    });
}
