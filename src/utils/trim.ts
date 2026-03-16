/**
 * Output trimming for MCP tool responses.
 *
 * Goal: minimize token consumption while preserving all decision-useful data.
 * An LLM doesn't need image URLs, resolution criteria, empty arrays, or
 * timestamps it won't reason about.
 */

/** Fields dropped from every object — never useful for LLM reasoning. */
const DROP_KEYS = new Set([
  'description',       // Multi-paragraph resolution criteria, repeated per market
  'image',             // Image URLs — not useful for text-based LLMs
  'rewards',           // Polymarket reward config (nested object)
  'dflow',             // Kalshi on-chain data (large nested object)
  'winner_token_id',   // Empty string when unresolved
  'created_at',        // ISO timestamp — rarely needed for market analysis
  'updated_at',        // ISO timestamp — never needed
  'fees',              // Opaque fee structure
  'slug',              // URL fragment — not decision-useful
  'decimals',          // Token decimals — internal detail
  'sub_title',         // Kalshi subtitle — redundant with title
]);

/** Fields dropped only when their value is empty/trivial. */
function isDroppableValue(key: string, value: unknown): boolean {
  // Empty arrays (labels: [], tags: [])
  if (Array.isArray(value) && value.length === 0) return true;
  // Empty objects
  if (typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length === 0) return true;
  // Null/undefined
  if (value === null || value === undefined) return true;
  // Empty strings
  if (value === '') return true;
  // Boolean false for non-essential flags
  if (key === 'neg_risk' && value === false) return true;
  if (key === 'claimable' && value === false) return true;
  if (key === 'jupiter' && value === false) return true;
  // "live" object when it's the default non-live state — just noise
  if (key === 'live' && typeof value === 'object' && value !== null) {
    const v = value as Record<string, unknown>;
    if (v.live === false && v.ended === false) return true;
  }
  return false;
}

const MAX_NESTED_MARKETS = 5;

/**
 * Recursively strip verbose/useless fields from API response objects.
 */
export function trimData(obj: unknown): unknown {
  if (obj === null || obj === undefined || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(trimData);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (DROP_KEYS.has(k)) continue;
    if (isDroppableValue(k, v)) continue;
    // Cap nested markets arrays (events can have 30+ sub-markets)
    if (k === 'markets' && Array.isArray(v) && v.length > MAX_NESTED_MARKETS) {
      out[k] = v.slice(0, MAX_NESTED_MARKETS).map(trimData);
      out['_truncated'] = `${MAX_NESTED_MARKETS}/${v.length} shown`;
      continue;
    }
    out[k] = trimData(v);
  }
  return out;
}

/**
 * Trim and serialize API data for MCP tool responses.
 * Uses compact JSON (no pretty-printing) to minimize token count.
 * Falls back to truncation at 30K chars.
 */
export function summarize(data: unknown): string {
  const MAX_CHARS = 30_000;
  const stripped = trimData(data);
  const result = JSON.stringify(stripped);
  if (result.length <= MAX_CHARS) return result;
  return result.slice(0, MAX_CHARS - 50) + '...(truncated, use limit/offset)';
}
