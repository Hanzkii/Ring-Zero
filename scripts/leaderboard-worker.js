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

const HMAC_SECRET = 'null404_kernel_gate';

/**
 * Validates HMAC-SHA256 signature using native Web Crypto API
 * Canonical: `${playerName}:${score}:${waveNumber}:${durationSeconds}:${timestamp}`
 * @param {string} canonical
 * @param {string} signatureHex
 * @returns {Promise<boolean>}
 */
async function verifyHmac(canonical, signatureHex) {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(HMAC_SECRET),
      { name: 'HMAC', hash: { name: 'SHA-256' } },
      false,
      ['verify']
    );

    const cleanHex = signatureHex.trim();
    if (cleanHex.length % 2 !== 0) return false;
    const sigBytes = new Uint8Array(cleanHex.match(/.{1,2}/g).map((b) => parseInt(b, 16)));
    return await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(canonical));
  } catch {
    return false;
  }
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    // GET /api/leaderboard?limit=100
    if (request.method === 'GET' && url.pathname.endsWith('/leaderboard')) {
      const limit = Math.min(100, parseInt(url.searchParams.get('limit') || '100', 10));
      let records = [];

      if (env?.LEADERBOARD_KV) {
        const raw = await env.LEADERBOARD_KV.get('top_scores');
        if (raw) records = JSON.parse(raw);
      }

      records.sort((a, b) => b.score - a.score);
      const ranked = records.slice(0, limit).map((r, i) => ({
        ...r,
        rank: i + 1,
        playerName: r.playerName || r.callsign || 'OPERATOR_0',
        callsign: r.callsign || r.playerName || 'OPERATOR_0',
      }));

      return new Response(JSON.stringify(ranked), { headers: CORS_HEADERS });
    }

    // POST /api/submit
    if (request.method === 'POST' && url.pathname.endsWith('/submit')) {
      try {
        const body = await request.json();
        const playerName = (body.playerName || body.callsign || 'OPERATOR_0').toUpperCase().slice(0, 14);
        const score = Math.floor(body.score || 0);
        const waveNumber = Math.floor(body.waveNumber !== undefined ? body.waveNumber : (body.wavesCleared || 0));
        const durationSeconds = Math.floor(body.durationSeconds || 0);
        const timestamp = body.timestamp || Date.now();
        const clearanceRing = body.clearanceRing !== undefined ? body.clearanceRing : 3;

        const canonical = `${playerName}:${score}:${waveNumber}:${durationSeconds}:${timestamp}`;
        const signature = body.signature || body.checksum;

        if (!signature || !(await verifyHmac(canonical, signature))) {
          return new Response(
            JSON.stringify({ success: false, error: 'INVALID_HMAC_SIGNATURE' }),
            { status: 403, headers: CORS_HEADERS }
          );
        }

        const runHash = signature.slice(0, 16);
        const entry = {
          playerName,
          callsign: playerName,
          score,
          waveNumber,
          wavesCleared: waveNumber,
          clearanceRing,
          durationSeconds,
          accuracy: Number((body.accuracy || 0).toFixed(1)),
          riskMultiplier: Number((body.riskMultiplier || 1.0).toFixed(2)),
          bountiesEarned: Math.floor(body.bountiesEarned || 0),
          timestamp,
          signature,
          runHash,
          verified: true,
        };

        let records = [];
        if (env?.LEADERBOARD_KV) {
          const raw = await env.LEADERBOARD_KV.get('top_scores');
          if (raw) records = JSON.parse(raw);
          records.push(entry);
          records.sort((a, b) => b.score - a.score);
          records = records.slice(0, 200);
          await env.LEADERBOARD_KV.put('top_scores', JSON.stringify(records));
        }

        const rankIndex = records.findIndex((r) => r.signature === entry.signature);
        const rank = rankIndex !== -1 ? rankIndex + 1 : 1;

        return new Response(
          JSON.stringify({ success: true, rank, runHash, entry }),
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
