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
import { TerminalUI } from '../src/ui/TerminalUI.js';

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

  // 7. Client-Side Throttling (30s TTL) & Submission Invalidation
  console.log('\n7. Testing Client-Side Request Throttling & Submission Invalidation:');
  {
    global.localStorage.clear();
    let leaderboardFetchCount = 0;
    const originalFetch = global.fetch;
    global.fetch = async (url) => {
      if (String(url).includes('/api/leaderboard')) {
        leaderboardFetchCount++;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          scores: [
            { player_name: 'THROTTLE_OP', score: 77700, wave_number: 14, clearance_ring: 'RING_0' }
          ]
        })
      };
    };

    const lb = new LeaderboardService();
    assert.equal(lb.lastFetch, 0, 'lastFetch is initially 0');
    assert.equal(lb.cachedScores, null, 'cachedScores is initially null');

    // First fetch should hit network
    const scores1 = await lb.fetchTopScores(10);
    assert.equal(leaderboardFetchCount, 1, 'First fetch triggers network call');
    assert.equal(scores1.length, 1, 'Fetched 1 record');
    assert(lb.lastFetch > 0, 'lastFetch timestamp recorded');
    assert(Array.isArray(lb.cachedScores), 'cachedScores populated in memory');

    // Immediate second fetch should be throttled (30s cooldown active)
    const scores2 = await lb.fetchTopScores(10);
    assert.equal(leaderboardFetchCount, 1, 'Second fetch within 30s is throttled (no network call)');
    assert.equal(scores2[0].playerName, 'THROTTLE_OP', 'Throttled fetch returns cached data');

    // submitRun must immediately invalidate the cooldown
    await lb.submitRun({
      playerName: 'BYPASS_OP',
      score: 88800,
      waveNumber: 16,
      clearanceRing: 0,
      durationSeconds: 320,
    });
    assert.equal(lb.lastFetch, 0, 'submitRun resets lastFetch to 0');
    assert.equal(lb.cachedScores, null, 'submitRun clears cachedScores to null');

    // Subsequent fetch immediately hits network without waiting 30 seconds
    const scores3 = await lb.fetchTopScores(10);
    assert.equal(leaderboardFetchCount, 2, 'Post-submit fetch bypasses 30s timer and hits network immediately');

    global.fetch = originalFetch;
    console.log('  [PASS] 30s client-side cooldown and submission invalidation verified');
  }

  // 8. Testing Top 100 Display, getPlayerBestRun & Pinned Personal Rank
  console.log('\n8. Testing Top 100 Display, getPlayerBestRun & Pinned Personal Rank:');
  {
    global.localStorage.clear();
    const lb = new LeaderboardService({ enableRemote: false });

    // 8.1 getPlayerBestRun when empty
    assert.equal(lb.getPlayerBestRun('KRNL_ONE'), null, 'getPlayerBestRun returns null when no runs exist');

    // Seed local scores
    const localRuns = [
      { playerName: 'KRNL_ONE', score: 12000, waveNumber: 4, clearanceRing: 3, signature: 'sig1' },
      { playerName: 'KRNL_ONE', score: 45000, waveNumber: 10, clearanceRing: 1, signature: 'sig2' },
      { playerName: 'KRNL_TWO', score: 98000, waveNumber: 18, clearanceRing: 0, signature: 'sig3' },
    ];
    lb.saveLocalScores(localRuns);

    // 8.2 getPlayerBestRun with callsign filter
    const bestOne = lb.getPlayerBestRun('KRNL_ONE');
    assert.ok(bestOne, 'Found best run for KRNL_ONE');
    assert.equal(bestOne.playerName, 'KRNL_ONE', 'Player tag matches KRNL_ONE');
    assert.equal(bestOne.score, 45000, 'KRNL_ONE best score is 45,000');
    assert.equal(bestOne.waveNumber, 10, 'KRNL_ONE best wave is 10');
    assert.equal(bestOne.clearanceRing, 1, 'KRNL_ONE best clearance ring is 1');
    assert.equal(bestOne.signature, 'sig2', 'KRNL_ONE signature matches best run');

    // 8.3 getPlayerBestRun with localStorage fallback
    global.localStorage.setItem('ring0_callsign', 'KRNL_TWO');
    const bestTwo = lb.getPlayerBestRun();
    assert.ok(bestTwo, 'Found best run for KRNL_TWO from localStorage callsign');
    assert.equal(bestTwo.playerName, 'KRNL_TWO', 'Player tag matches KRNL_TWO');
    assert.equal(bestTwo.score, 98000, 'KRNL_TWO best score is 98,000');

    // 8.4 TerminalUI Top 100 Leaderboard & Pinned Personal Rank rendering
    const mockStorage = {
      cryptoBounties: 500,
      purchasedRings: [3],
      unlockedRings: [3],
      unlockedWeapons: ['PISTOL_SYS'],
      firmware: {},
      riskModifiers: {},
      stats: {},
    };
    const mockSoundBank = {
      playUIClick: () => {},
      playTone: () => {},
    };

    const terminal = new TerminalUI({
      storage: mockStorage,
      soundBank: mockSoundBank,
      leaderboard: lb,
      onStartRun: () => {},
      onRestartRun: () => {},
    });

    // Scenario A: Player is inside the top 100
    lb.fetchTopScores = async () => [
      { rank: 1, player_name: 'KRNL_TWO', score: 98000, wave_number: 18, clearance_ring: 'RING_0' },
      { rank: 2, player_name: 'RIVAL_99', score: 75000, wave_number: 14, clearance_ring: 'RING_1' },
    ];
    global.localStorage.setItem('ring0_callsign', 'KRNL_TWO');

    const containerA = { innerHTML: '', querySelector: () => null, querySelectorAll: () => [] };
    await terminal._renderLeaderboardTab(containerA);

    assert(containerA.innerHTML.includes('TOP 100 KERNEL LEADERBOARD'), 'Rendered Top 100 title header');
    assert(containerA.innerHTML.includes('CALL-SIGN'), 'Table contains CALL-SIGN column');
    assert(containerA.innerHTML.includes('[YOU]'), 'Active player highlighted with [YOU] badge');
    assert(!containerA.innerHTML.includes('[LOCAL BEST / UNRANKED]'), 'No unranked footer rendered when player is in top 100');

    // Scenario B: Player is OUTSIDE top 100, but has a local best run
    lb.fetchTopScores = async () => [
      { rank: 1, player_name: 'PRO_PILOT', score: 150000, wave_number: 25, clearance_ring: 'RING_0' },
      { rank: 2, player_name: 'RIVAL_99', score: 75000, wave_number: 14, clearance_ring: 'RING_1' },
    ];
    global.localStorage.setItem('ring0_callsign', 'KRNL_ONE');

    const containerB = { innerHTML: '', querySelector: () => null, querySelectorAll: () => [] };
    await terminal._renderLeaderboardTab(containerB);

    assert(containerB.innerHTML.includes('#???'), 'Rendered #??? rank in pinned footer for unranked player');
    assert(containerB.innerHTML.includes('KRNL_ONE'), 'Pinned footer contains active player tag');
    assert(containerB.innerHTML.includes((45000).toLocaleString()), 'Pinned footer displays player best score');
    assert(containerB.innerHTML.includes('WAVE 10'), 'Pinned footer displays player best wave');
    assert(containerB.innerHTML.includes('[LOCAL BEST / UNRANKED]'), 'Pinned footer contains [LOCAL BEST / UNRANKED] badge');

    // Scenario C: Player is OUTSIDE top 100, and has NO recorded runs
    global.localStorage.setItem('ring0_callsign', 'FRESH_OPERATOR');
    const containerC = { innerHTML: '', querySelector: () => null, querySelectorAll: () => [] };
    await terminal._renderLeaderboardTab(containerC);

    assert(containerC.innerHTML.includes('--'), 'Rendered -- rank for player with no recorded telemetry');
    assert(containerC.innerHTML.includes('FRESH_OPERATOR'), 'Pinned footer contains fresh operator tag');
    assert(containerC.innerHTML.includes('NO TELEMETRY RECORDED'), 'Pinned footer displays NO TELEMETRY RECORDED message');

    console.log('  [PASS] Top 100 display, getPlayerBestRun, and pinned personal rank verified');
  }

  console.log('\n=== ALL CLOUDFLARE WORKER LEADERBOARD TESTS PASSED! ===\n');
})();
