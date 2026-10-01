/**
 * Ring Zero - Cloudflare Worker Edge Leaderboard Script
 * Deployable to Cloudflare Workers with zero external packages.
 * Backed by Cloudflare KV or D1 SQLite.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

const VERIFICATION_SALT = 'RING_ZERO_KERNEL_SIG_v1.0.4';

/**
 * Computes native SHA-256 digest using Web Crypto API
 * @param {string} payload
 * @returns {Promise<string>}
 */
async function computeHash(payload) {
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    // GET /api/leaderboard?limit=10
    if (request.method === 'GET' && url.pathname.endsWith('/leaderboard')) {
      const limit = Math.min(100, parseInt(url.searchParams.get('limit') || '10', 10));
      let records = [];

      if (env.LEADERBOARD_KV) {
        const raw = await env.LEADERBOARD_KV.get('top_scores');
        if (raw) records = JSON.parse(raw);
      }

      records.sort((a, b) => b.score - a.score);
      const ranked = records.slice(0, limit).map((r, i) => ({ ...r, rank: i + 1 }));
      return new Response(JSON.stringify(ranked), { headers: CORS_HEADERS });
    }

    // POST /api/submit
    if (request.method === 'POST' && url.pathname.endsWith('/submit')) {
      try {
        const body = await request.json();
        const score = Math.floor(body.score || 0);
        const waves = Math.floor(body.wavesCleared || 0);
        const ring = body.clearanceRing !== undefined ? body.clearanceRing : 3;
        const bounties = Math.floor(body.bountiesEarned || 0);
        const payload = `${score}:${waves}:${ring}:${bounties}:${VERIFICATION_SALT}`;
        const expectedChecksum = await computeHash(payload);

        if (body.checksum !== expectedChecksum) {
          return new Response(
            JSON.stringify({ success: false, error: 'INVALID_CHECKSUM_SIG' }),
            { status: 403, headers: CORS_HEADERS }
          );
        }

        const entry = {
          callsign: (body.callsign || 'OPERATOR_0').toUpperCase().slice(0, 14),
          score,
          wavesCleared: waves,
          clearanceRing: ring,
          accuracy: Number((body.accuracy || 0).toFixed(1)),
          riskMultiplier: Number((body.riskMultiplier || 1.0).toFixed(2)),
          bountiesEarned: bounties,
          timestamp: new Date().toISOString(),
          checksum: expectedChecksum,
          verified: true,
        };

        let records = [];
        if (env.LEADERBOARD_KV) {
          const raw = await env.LEADERBOARD_KV.get('top_scores');
          if (raw) records = JSON.parse(raw);
          records.push(entry);
          records.sort((a, b) => b.score - a.score);
          records = records.slice(0, 200);
          await env.LEADERBOARD_KV.put('top_scores', JSON.stringify(records));
        }

        const rankIndex = records.findIndex((r) => r.checksum === entry.checksum);
        const rank = rankIndex !== -1 ? rankIndex + 1 : 1;

        return new Response(
          JSON.stringify({ success: true, rank, entry }),
          { headers: CORS_HEADERS }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ success: false, error: err.message }),
          { status: 400, headers: CORS_HEADERS }
        );
      }
    }

    return new Response(JSON.stringify({ error: 'NOT_FOUND' }), {
      status: 404,
      headers: CORS_HEADERS,
    });
  },
};
