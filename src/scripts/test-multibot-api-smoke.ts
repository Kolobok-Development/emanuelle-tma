/**
 * Minimal API smoke (plan §5 empty-state, auth required).
 * GET /api/companion/get-all without cookie should be 401 when middleware protects the route.
 */
import 'dotenv/config';

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function main() {
  const r = await fetch(`${BASE}/api/companion/get-all`, { method: 'GET' });
  if (r.status !== 401) {
    console.error(`Expected 401 without session, got ${r.status}`);
    process.exit(1);
  }
  console.log('OK GET /api/companion/get-all without auth -> 401');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
