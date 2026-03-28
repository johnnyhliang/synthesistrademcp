const DROP_KEYS = new Set([
  'description',
  'image',
  'rewards',
  'dflow',
  'winner_token_id',
  'created_at',
  'updated_at',
  'fees',
  'slug',
  'decimals',
  'sub_title',
]);

function isDroppableValue(key: string, value: unknown): boolean {
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length === 0) return true;
  if (value === null || value === undefined) return true;
  if (value === '') return true;
  if (key === 'neg_risk' && value === false) return true;
  if (key === 'claimable' && value === false) return true;
  if (key === 'jupiter' && value === false) return true;
  if (key === 'live' && typeof value === 'object' && value !== null) {
    const v = value as Record<string, unknown>;
    if (v.live === false && v.ended === false) return true;
  }
  return false;
}

const MAX_NESTED_MARKETS = 5;

export function trimData(obj: unknown): unknown {
  if (obj === null || obj === undefined || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(trimData);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (DROP_KEYS.has(k)) continue;
    if (isDroppableValue(k, v)) continue;
    if (k === 'markets' && Array.isArray(v) && v.length > MAX_NESTED_MARKETS) {
      out[k] = v.slice(0, MAX_NESTED_MARKETS).map(trimData);
      out['_truncated'] = `${MAX_NESTED_MARKETS}/${v.length} shown`;
      continue;
    }
    out[k] = trimData(v);
  }
  return out;
}

export function summarize(data: unknown): string {
  const MAX_CHARS = 30_000;
  const stripped = trimData(data);
  const result = JSON.stringify(stripped);
  if (result.length <= MAX_CHARS) return result;
  return result.slice(0, MAX_CHARS - 50) + '...(truncated, use limit/offset)';
}
