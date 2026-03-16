/**
 * Tier 3 — Trading tools.
 *
 * Defense layers:
 *  1. ENABLE_TRADING=true env var (tools not even registered without it)
 *  2. TRADING_CONFIRMATION_PHRASE env var (must be set — no default)
 *  3. Per-call `confirmation_phrase` parameter (must match the env var)
 *  4. Per-call `confirm` parameter (must be exactly "I understand this is a real financial transaction")
 *  5. MAX_ORDER_SIZE_USDC env var (default $100, caps place_order and swap amounts)
 *  6. requireTrading() check at the API layer (belt-and-suspenders)
 */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { SynthesisClient } from '../../api/client.js';
import { placeOrder, cancelOrder, executeSwap, withdraw } from '../../api/polygon.js';

const CONFIRM_STRING = 'I understand this is a real financial transaction';

function verifyConfirm(client: SynthesisClient, confirm: string, confirmationPhrase: string): void {
  if (confirm !== CONFIRM_STRING) {
    throw new Error(`Confirmation failed. The "confirm" parameter must be exactly: "${CONFIRM_STRING}"`);
  }
  client.verifyTradingConfirmation(confirmationPhrase);
}

export function registerTier3Tools(server: McpServer, client: SynthesisClient): void {

  const confirmSchema = z.literal(CONFIRM_STRING)
    .describe(`Must be exactly: "${CONFIRM_STRING}"`);
  const phraseSchema = z.string()
    .describe('Your TRADING_CONFIRMATION_PHRASE (must match the env var set on the server)');

  // ── place_order ─────────────────────────────────────────────────────────────
  server.tool(
    'place_order',
    `Place a buy or sell order on Polymarket via Polygon. Requires ENABLE_TRADING=true, TRADING_CONFIRMATION_PHRASE, and per-call confirmation. Max order size: $${client.maxOrderSizeUsdc} USDC.`,
    {
      condition_id: z.string().describe('The market condition ID'),
      side: z.enum(['buy', 'sell']).describe('Order side'),
      price: z.number().min(0.001).max(0.999).describe('Price in USDC (0.001 to 0.999)'),
      size: z.number().positive().describe('Order size in USDC'),
      confirm: confirmSchema,
      confirmation_phrase: phraseSchema,
    },
    async (params) => {
      verifyConfirm(client, params.confirm, params.confirmation_phrase);
      client.verifyOrderSize(params.size);
      const data = await placeOrder(client, {
        condition_id: params.condition_id,
        side: params.side,
        price: params.price,
        size: params.size,
      });
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

  // ── cancel_order ────────────────────────────────────────────────────────────
  server.tool(
    'cancel_order',
    'Cancel an open order on Polygon. Requires ENABLE_TRADING=true, TRADING_CONFIRMATION_PHRASE, and per-call confirmation.',
    {
      order_id: z.string().describe('The order ID to cancel'),
      confirm: confirmSchema,
      confirmation_phrase: phraseSchema,
    },
    async (params) => {
      verifyConfirm(client, params.confirm, params.confirmation_phrase);
      const data = await cancelOrder(client, params.order_id);
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

  // ── swap ────────────────────────────────────────────────────────────────────
  server.tool(
    'swap',
    `Execute a token swap on Polygon. Requires ENABLE_TRADING=true, TRADING_CONFIRMATION_PHRASE, and per-call confirmation. Max amount: $${client.maxOrderSizeUsdc} USDC.`,
    {
      from_token: z.string().describe('Token to swap from'),
      to_token: z.string().describe('Token to swap to'),
      amount: z.number().positive().describe('Amount to swap'),
      confirm: confirmSchema,
      confirmation_phrase: phraseSchema,
    },
    async (params) => {
      verifyConfirm(client, params.confirm, params.confirmation_phrase);
      client.verifyOrderSize(params.amount);
      const data = await executeSwap(client, {
        from_token: params.from_token,
        to_token: params.to_token,
        amount: params.amount,
      });
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

  // ── withdraw ─────────────────────────────────────────────────────────────────
  server.tool(
    'withdraw',
    `Withdraw funds from your Synthesis wallet. Requires ENABLE_TRADING=true, TRADING_CONFIRMATION_PHRASE, and per-call confirmation. Max amount: $${client.maxOrderSizeUsdc} USDC.`,
    {
      amount: z.number().positive().describe('Amount in USDC to withdraw'),
      address: z.string().describe('Destination wallet address'),
      network: z.string().describe('Network to withdraw on (e.g. polygon, solana)'),
      confirm: confirmSchema,
      confirmation_phrase: phraseSchema,
    },
    async (params) => {
      verifyConfirm(client, params.confirm, params.confirmation_phrase);
      client.verifyOrderSize(params.amount);
      const data = await withdraw(client, {
        amount: params.amount,
        address: params.address,
        network: params.network,
      });
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );
}
