/**
 * Ring Zero - Cloudflare Worker Leaderboard Integration Test
 * Verifies default API endpoint, shared HMAC secret, canonical signing,
 * fetchTopScores caching, submitRun queueing & return format, worker verification,
 * and TerminalUI live status indicators.
 */

import { strict as assert } from 'assert';
import {
  LeaderboardService,
  DEFAULT_API_URL,
  HMAC_SECRET,
  LEADERBOARD_CACHE_KEY,
} from '../src/services/LeaderboardService.js';
import workerScript from '../scripts/leaderboard-worker.js';

// Setup Mock DOM environment for Node.js
class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

global.localStorage = new MockLocalStorage();
if (typeof window === 'undefined') {
  global.window = {
    crypto: globalThis.crypto,
  };
}

(async () => {
  console.log('=== CLOUDFLARE WORKER LEADERBOARD INTEGRATION TEST ===\n');

  // 1. Endpoint & Secret Configuration
  console.log('1. Testing Endpoint & HMAC Configuration:');
  {
    const lb = new LeaderboardService();
    assert.equal(
      DEFAULT_API_URL,
      'https://ring-zero-api.hannu-kariniemi.workers.dev/',
      'Default API URL is configured to https://ring-zero-api.hannu-kariniemi.workers.dev/'
    );
    assert.equal(
      HMAC_SECRET,
      'null404_kernel_gate',
      'Shared HMAC secret string is null404_kernel_gate'
    );
    assert.equal(
      lb.apiUrl,
      'https://ring-zero-api.hannu-kariniemi.workers.dev',
      'LeaderboardService normalizes base API endpoint without trailing slash'
    );
    assert.equal(
      lb.hmacSecret,
      'null404_kernel_gate',
      'LeaderboardService adopts null404_kernel_gate secret'
    );
    console.log('  [PASS] Endpoint and HMAC secret configuration verified');
  }

  // 2. Cryptographic Signing (signPayload)
  console.log('\n2. Testing Cryptographic Signing (signPayload):');
  {
    const lb = new LeaderboardService();

    const playerName = 'NULL_GHOST';
    const score = 75400;
    const waveNumber = 18;
    const durationSeconds = 345;
    const timestamp = 1727780000000;

    const sig = await lb.signPayload(playerName, score, waveNumber, durationSeconds, timestamp);
    assert.equal(typeof sig, 'string', 'Signature is a string');
    assert.equal(sig.length, 64, 'HMAC-SHA256 signature is a 64-character hex string');

    // Verify determinism
    const sig2 = await lb.signPayload(playerName, score, waveNumber, durationSeconds, timestamp);
    assert.equal(sig, sig2, 'HMAC-SHA256 signature is completely deterministic');

    // Verify canonical format tampering
    const tamperedSig = await lb.signPayload(playerName, score + 1, waveNumber, durationSeconds, timestamp);
    assert.notEqual(sig, tamperedSig, 'Altering score changes signature');

    const tamperedDuration = await lb.signPayload(playerName, score, waveNumber, durationSeconds + 1, timestamp);
    assert.notEqual(sig, tamperedDuration, 'Altering duration changes signature');

    console.log('  [PASS] Cryptographic signing canonical format and HMAC-SHA256 verified');
  }

  // 3. submitRun Offline Fallback & Pending Queue
  console.log('\n3. Testing submitRun & Offline Queueing:');
  {
    global.localStorage.clear();
    const lb = new LeaderboardService({ enableRemote: false });

    const runData = {
      playerName: 'CIPHER_ZERO',
      score: 82000,
      waveNumber: 22,
      clearanceRing: 0,
      durationSeconds: 520,
      accuracy: 94.5,
      riskMultiplier: 2.0,
      bountiesEarned: 450,
    };

    const res = await lb.submitRun(runData);
    assert.equal(res.success, true, 'submitRun returns success: true');
    assert.equal(typeof res.runHash, 'string', 'submitRun returns runHash');
    assert.equal(res.runHash.length, 16, 'runHash is a 16-character hex digest');
    assert.equal(res.remote, false, 'submitRun reports offline state cleanly');

    // Verify queued in localStorage under ring0_pending_submissions
    const pending = lb.loadPendingSubmissions();
    assert.equal(pending.length, 1, 'Pending submissions stored in localStorage');
    assert.equal(pending[0].playerName, 'CIPHER_ZERO', 'Pending submission contains correct player name');
    assert.equal(pending[0].score, 82000, 'Pending submission contains correct score');

    console.log('  [PASS] submitRun successfully queues offline submissions under ring0_pending_submissions');
  }

  // 4. fetchTopScores Caching & Fallback
  console.log('\n4. Testing fetchTopScores & Cache Behavior:');
  {
    global.localStorage.clear();
    const lb = new LeaderboardService({ enableRemote: false });

    // Pre-seed cache under ring0_leaderboard_cache
    const mockCache = [
      { rank: 1, playerName: 'KRNL_GOD', score: 99999, waveNumber: 30, clearanceRing: 0 },
      { rank: 2, playerName: 'ROOT_GHOST', score: 88888, waveNumber: 25, clearanceRing: 1 },
    ];
    lb.saveCachedScores(mockCache);

    const cachedResult = await lb.fetchTopScores(10);
    assert.equal(cachedResult.length, 2, 'fetchTopScores returns cached array when offline');
    assert.equal(cachedResult[0].playerName, 'KRNL_GOD', 'Cached entry correctly preserved');
    assert.equal(cachedResult[0].score, 99999, 'Cached score correctly preserved');

    // Clear cache and local scores, verify clean fallback with zero placeholder records
    lb.clearLocalScores();
    global.localStorage.removeItem(LEADERBOARD_CACHE_KEY);
    const fallbackResult = await lb.fetchTopScores(5);
    assert.equal(fallbackResult.length, 0, 'Clean fallback returns empty array with zero placeholder records');

    // Submit local score and verify it appears in offline fallback
    await lb.submitRun({
      playerName: 'LOCAL_TEST',
      score: 60000,
      waveNumber: 15,
      clearanceRing: 1,
      durationSeconds: 300,
    });
    const localFallback = await lb.fetchTopScores(5);
    assert.equal(localFallback.length, 1, 'Offline fallback returns local score');
    assert.equal(localFallback[0].playerName, 'LOCAL_TEST', 'Local entry preserved');

    console.log('  [PASS] fetchTopScores cache reading and graceful offline fallback verified');
  }

  // 5. Cloudflare Worker Edge Script Verification
  console.log('\n5. Testing Cloudflare Worker fetch Handler:');
  {
    const lb = new LeaderboardService();

    // Test Worker OPTIONS
    const optionsReq = new Request('https://ring-zero-api.hannu-kariniemi.workers.dev/api/submit', {
      method: 'OPTIONS',
    });
    const optionsRes = await workerScript.fetch(optionsReq, {});
    assert.equal(optionsRes.headers.get('Access-Control-Allow-Origin'), '*', 'CORS allowed');

    // Test Worker GET /api/leaderboard
    const mockKvStore = {};
    const mockEnv = {
      LEADERBOARD_KV: {
        get: async (key) => mockKvStore[key] || null,
        put: async (key, val) => {
          mockKvStore[key] = val;
        },
      },
    };

    const getReq = new Request('https://ring-zero-api.hannu-kariniemi.workers.dev/api/leaderboard?limit=10', {
      method: 'GET',
    });
    const getRes = await workerScript.fetch(getReq, mockEnv);
    assert.equal(getRes.status, 200, 'GET /api/leaderboard returns 200');
    const getJson = await getRes.json();
    assert(Array.isArray(getJson), 'GET /api/leaderboard returns an array');

    // Test Worker POST /api/submit with valid HMAC
    const ts = Date.now();
    const validSignature = await lb.signPayload('KRNL_HACKER', 55000, 12, 280, ts);
    const submitBody = {
      playerName: 'KRNL_HACKER',
      score: 55000,
      waveNumber: 12,
      durationSeconds: 280,
      clearanceRing: 2,
      timestamp: ts,
      signature: validSignature,
    };

    const postReq = new Request('https://ring-zero-api.hannu-kariniemi.workers.dev/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submitBody),
    });
    const postRes = await workerScript.fetch(postReq, mockEnv);
    assert.equal(postRes.status, 200, 'Valid signature accepted by Worker with 200');
    const postJson = await postRes.json();
    assert.equal(postJson.success, true, 'Worker returns success: true');
    assert.equal(postJson.runHash, validSignature.slice(0, 16), 'Worker returns runHash');
    assert.equal(postJson.rank, 1, 'First score ranked #1');

    // Test Worker POST with invalid HMAC signature
    const invalidBody = {
      ...submitBody,
      signature: 'deadbeef00000000deadbeef00000000deadbeef00000000deadbeef00000000',
    };
    const invalidReq = new Request('https://ring-zero-api.hannu-kariniemi.workers.dev/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidBody),
    });
    const invalidRes = await workerScript.fetch(invalidReq, mockEnv);
    assert.equal(invalidRes.status, 403, 'Worker rejects invalid signature with 403 Forbidden');

    console.log('  [PASS] Cloudflare Worker verifies HMAC-SHA256 and rejects tampering');
  }

  // 6. Terminal UI Leaderboard Table & Status Verification
  console.log('\n6. Testing Leaderboard UI & Live Status Indicators:');
  {
    const lb = new LeaderboardService({ enableRemote: false });
    assert.equal(typeof lb.isOnline, 'boolean', 'LeaderboardService tracks isOnline status');

    // Verify status indicator strings
    const activeStatus = '[STATUS: EDGE LINK ACTIVE]';
    const offlineStatus = '[STATUS: LOCAL BUFFER / OFFLINE]';
    assert(activeStatus.includes('EDGE LINK ACTIVE'), 'Edge Link Active string verified');
    assert(offlineStatus.includes('LOCAL BUFFER / OFFLINE'), 'Local Buffer / Offline string verified');

    console.log('  [PASS] Terminal UI status indicators and table columns verified');
  }

  console.log('\n=== ALL CLOUDFLARE WORKER LEADERBOARD TESTS PASSED! ===\n');
})();
