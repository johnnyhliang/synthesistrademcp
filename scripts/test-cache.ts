/**
 * Tests for cache safety: auth-namespaced keys and size cap.
 * Uses the SynthesisClient directly (no server needed).
 */

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  \u2713 ${msg}`);
    passed++;
  } else {
    console.error(`  \u2717 ${msg}`);
    failed++;
  }
}

async function main() {
  console.log('=== Cache Safety Test ===\n');

  // Dynamic import to get the built module
  const { SynthesisClient } = await import('../dist/api/client.js');

  // 1. Auth-namespaced cache keys — two clients with different keys should not share cache
  console.log('Test: Auth-namespaced cache keys');
  const client1 = new SynthesisClient({ apiKey: 'sk_user_aaaa1111' });
  const client2 = new SynthesisClient({ apiKey: 'sk_user_bbbb2222' });

  // Both clients make the same GET request — they should cache independently
  // We can't easily test the internal cache directly, but we can verify
  // that two clients with different keys don't interfere.
  // The key format is: authMode:last8chars:url
  // client1 key slice: "aaaa1111", client2 key slice: "bbbb2222"

  // Access internal cache via prototype reflection
  const cache1 = (client1 as unknown as { cache: Map<string, unknown> }).cache;
  const cache2 = (client2 as unknown as { cache: Map<string, unknown> }).cache;
  assert(cache1 !== cache2, 'Different client instances have separate cache maps');

  // 2. Test that cacheKey method includes auth fingerprint
  console.log('Test: Cache key includes auth fingerprint');
  const cacheKey1 = (client1 as unknown as { cacheKey(url: string): string }).cacheKey('https://example.com/test');
  const cacheKey2 = (client2 as unknown as { cacheKey(url: string): string }).cacheKey('https://example.com/test');
  assert(cacheKey1 !== cacheKey2, `Cache keys differ: "${cacheKey1}" vs "${cacheKey2}"`);
  assert(cacheKey1.includes('aaaa1111'), 'Client 1 cache key includes key slice');
  assert(cacheKey2.includes('bbbb2222'), 'Client 2 cache key includes key slice');
  assert(cacheKey1.startsWith('account:'), 'Cache key includes auth mode');

  // 3. Test unauthenticated client cache key
  console.log('Test: Unauthenticated cache key');
  const clientNoAuth = new SynthesisClient({});
  const cacheKeyNoAuth = (clientNoAuth as unknown as { cacheKey(url: string): string }).cacheKey('https://example.com/test');
  assert(cacheKeyNoAuth.startsWith('account::'), 'No-auth cache key has empty key slice');
  assert(cacheKeyNoAuth !== cacheKey1, 'No-auth key differs from authed key');

  // 4. Test cache size limit
  console.log('Test: Cache size limit (1000 entries)');
  const clientBig = new SynthesisClient({});
  const cacheMap = (clientBig as unknown as { cache: Map<string, unknown> }).cache;
  const setCache = (clientBig as unknown as { setCache(key: string, data: unknown): void }).setCache.bind(clientBig);

  // Insert 1050 entries
  for (let i = 0; i < 1050; i++) {
    setCache(`key-${i}`, { value: i });
  }
  assert(cacheMap.size <= 1000, `Cache size is ${cacheMap.size} (should be <= 1000)`);

  // 5. Test cache expiry sweep
  console.log('Test: Expired entries are swept on insert');
  const clientExpiry = new SynthesisClient({});
  const expiryCache = (clientExpiry as unknown as { cache: Map<string, { data: unknown; expires: number; insertedAt: number }> }).cache;
  const setCache2 = (clientExpiry as unknown as { setCache(key: string, data: unknown): void }).setCache.bind(clientExpiry);

  // Insert some entries then manually expire them
  setCache2('fresh-1', 'data1');
  setCache2('fresh-2', 'data2');
  assert(expiryCache.size === 2, 'Two entries inserted');

  // Manually expire one entry (setCache stores key as-is)
  const entry = expiryCache.get('fresh-1');
  if (entry) {
    entry.expires = Date.now() - 1000; // expired
  }

  // Insert another — should sweep the expired one
  setCache2('fresh-3', 'data3');
  assert(!expiryCache.has('fresh-1'), 'Expired entry was swept');
  assert(expiryCache.has('fresh-2'), 'Non-expired entry preserved');
  assert(expiryCache.has('fresh-3'), 'New entry inserted');

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
