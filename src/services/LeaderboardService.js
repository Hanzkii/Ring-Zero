/**
 * Ring Zero - Leaderboard & Run Verification Service
 * Handles asynchronous score submissions, local persistence, seeded global records,
 * cryptographic HMAC-SHA256 run verification using native crypto.subtle,
 * and seamless offline fallback with queued pending submissions.
 */

export const DEFAULT_API_URL = 'https://ring-zero-api.hannu-kariniemi.workers.dev/';
export const HMAC_SECRET = 'null404_kernel_gate';
export const LEADERBOARD_CACHE_KEY = 'ring0_leaderboard_cache';
export const PENDING_SUBMISSIONS_KEY = 'ring0_pending_submissions';
export const LEADERBOARD_STORAGE_KEY = 'ring_zero_leaderboard_v1';
export const VERIFICATION_SALT = 'RING_ZERO_KERNEL_SIG_v1.0.4';

/** Initial seeded global leaderboard entries */
export const SEEDED_RECORDS = [
  {
    rank: 1,
    playerName: 'KRNL_OVERLORD',
    callsign: 'KRNL_OVERLORD',
    score: 84250,
    waveNumber: 24,
    wavesCleared: 24,
    clearanceRing: 0,
    durationSeconds: 780,
    accuracy: 94.2,
    riskMultiplier: 2.25,
    timestamp: 1727533320000,
    verified: true,
  },
  {
    rank: 2,
    playerName: 'ZERO_COOL',
    callsign: 'ZERO_COOL',
    score: 61900,
    waveNumber: 19,
    wavesCleared: 19,
    clearanceRing: 1,
    durationSeconds: 610,
    accuracy: 89.8,
    riskMultiplier: 1.75,
    timestamp: 1727579505000,
    verified: true,
  },
  {
    rank: 3,
    playerName: 'GHOST_DEV',
    callsign: 'GHOST_DEV',
    score: 47320,
    waveNumber: 15,
    wavesCleared: 15,
    clearanceRing: 1,
    durationSeconds: 490,
    accuracy: 91.5,
    riskMultiplier: 1.5,
    timestamp: 1727633052000,
    verified: true,
  },
  {
    rank: 4,
    playerName: 'HEX_DAEMON',
    callsign: 'HEX_DAEMON',
    score: 32800,
    waveNumber: 11,
    wavesCleared: 11,
    clearanceRing: 2,
    durationSeconds: 380,
    accuracy: 82.0,
    riskMultiplier: 1.25,
    timestamp: 1727689222000,
    verified: true,
  },
  {
    rank: 5,
    playerName: 'NULL_POINTER',
    callsign: 'NULL_POINTER',
    score: 18450,
    waveNumber: 7,
    wavesCleared: 7,
    clearanceRing: 3,
    durationSeconds: 240,
    accuracy: 76.4,
    riskMultiplier: 1.0,
    timestamp: 1727715301000,
    verified: true,
  },
];

export class LeaderboardService {
  constructor(options = {}) {
    this.storageKey = options.storageKey || LEADERBOARD_STORAGE_KEY;
    this.cacheKey = options.cacheKey || LEADERBOARD_CACHE_KEY;
    this.pendingKey = options.pendingKey || PENDING_SUBMISSIONS_KEY;
    const baseEndpoint = options.apiUrl || options.remoteEndpoint || DEFAULT_API_URL;
    // Strip trailing slashes and /api if present for clean routing
    this.apiUrl = baseEndpoint.replace(/\/+$/, '').replace(/\/api$/, '');
    this.hmacSecret = options.hmacSecret || HMAC_SECRET;
    this.enableRemote = options.enableRemote ?? true;
    this.isOnline = true;
  }

  /**
   * Cryptographic HMAC-SHA256 signing using native window.crypto.subtle
   * Canonical string format: `${playerName}:${score}:${waveNumber}:${durationSeconds}:${timestamp}`
   * @param {string|Object} playerNameOrObj
   * @param {number} [score=0]
   * @param {number} [waveNumber=0]
   * @param {number} [durationSeconds=0]
   * @param {number|string} [timestamp=Date.now()]
   * @returns {Promise<string>} Hex-encoded HMAC-SHA256 signature
   */
  async signPayload(playerNameOrObj, score = 0, waveNumber = 0, durationSeconds = 0, timestamp = Date.now()) {
    let pName, sc, wNum, dSec, ts;
    if (typeof playerNameOrObj === 'object' && playerNameOrObj !== null) {
      pName = playerNameOrObj.playerName || playerNameOrObj.callsign || 'OPERATOR_0';
      sc = Math.floor(playerNameOrObj.score || 0);
      wNum = Math.floor(playerNameOrObj.waveNumber !== undefined ? playerNameOrObj.waveNumber : (playerNameOrObj.wavesCleared || 0));
      dSec = Math.floor(playerNameOrObj.durationSeconds !== undefined ? playerNameOrObj.durationSeconds : (playerNameOrObj.duration || 0));
      ts = playerNameOrObj.timestamp || Date.now();
    } else {
      pName = playerNameOrObj || 'OPERATOR_0';
      sc = Math.floor(score || 0);
      wNum = Math.floor(waveNumber || 0);
      dSec = Math.floor(durationSeconds || 0);
      ts = timestamp || Date.now();
    }

    pName = String(pName).toUpperCase().slice(0, 14);
    const canonical = `${pName}:${sc}:${wNum}:${dSec}:${ts}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(this.hmacSecret);
    const messageData = encoder.encode(canonical);

    // 1. Browser & Node native SubtleCrypto
    const subtle = (typeof window !== 'undefined' && window.crypto?.subtle)
      || (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle);

    if (subtle) {
      try {
        const cryptoKey = await subtle.importKey(
          'raw',
          keyData,
          { name: 'HMAC', hash: { name: 'SHA-256' } },
          false,
          ['sign']
        );
        const signatureBuffer = await subtle.sign('HMAC', cryptoKey, messageData);
        return Array.from(new Uint8Array(signatureBuffer))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
      } catch (err) {
        // Fall back to Node.js crypto if subtle failed in headless runner
      }
    }

    // 2. Node.js environment fallback
    try {
      const nodeCrypto = await import('crypto');
      return nodeCrypto.createHmac('sha256', this.hmacSecret).update(canonical).digest('hex');
    } catch {
      // Deterministic fallback for constrained environments
      let hash = 0;
      for (let i = 0; i < canonical.length; i++) {
        hash = ((hash << 5) - hash) + canonical.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash).toString(16).padStart(64, '0');
    }
  }

  /**
   * Generates a cryptographic verification hash for run telemetry using SHA-256 (Backward-compatibility)
   * @param {Object} runData
   * @returns {Promise<string>} Hex-encoded SHA-256 digest
   */
  async computeChecksum(runData) {
    const score = Math.floor(runData.score || 0);
    const waves = Math.floor(runData.wavesCleared !== undefined ? runData.wavesCleared : (runData.waveNumber || 0));
    const ring = runData.clearanceRing !== undefined ? runData.clearanceRing : 3;
    const bounties = Math.floor(runData.bountiesEarned || 0);
    const payload = `${score}:${waves}:${ring}:${bounties}:${VERIFICATION_SALT}`;

    const subtle = (typeof window !== 'undefined' && window.crypto?.subtle)
      || (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle);

    if (subtle) {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(payload);
        const hashBuffer = await subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      } catch {}
    }

    try {
      const nodeCrypto = await import('crypto');
      return nodeCrypto.createHash('sha256').update(payload).digest('hex');
    } catch {
      let hash = 5381;
      for (let i = 0; i < payload.length; i++) {
        hash = ((hash << 5) + hash) + payload.charCodeAt(i);
        hash |= 0;
      }
      return 'fb_' + Math.abs(hash).toString(16).padStart(16, '0');
    }
  }

  /**
   * Validates a run entry's verification checksum
   * @param {Object} entry
   * @returns {Promise<boolean>}
   */
  async verifyChecksum(entry) {
    if (!entry || !entry.checksum) return false;
    const expected = await this.computeChecksum(entry);
    return entry.checksum === expected;
  }

  /**
   * Submits a completed run to Cloudflare Worker edge or queues offline
   * @param {Object} params
   * @param {string} [params.playerName='OPERATOR_0']
   * @param {number} [params.score=0]
   * @param {number} [params.waveNumber=0]
   * @param {number} [params.clearanceRing=3]
   * @param {number} [params.durationSeconds=0]
   * @param {string} [params.callsign]
   * @param {number} [params.wavesCleared]
   * @param {number} [params.accuracy=0]
   * @param {number} [params.riskMultiplier=1.0]
   * @param {number} [params.bountiesEarned=0]
   * @returns {Promise<{ success: boolean, runHash: string, rank?: number, remote: boolean, entry: Object }>}
   */
  async submitRun({
    playerName,
    score = 0,
    waveNumber = 0,
    clearanceRing = 3,
    durationSeconds = 0,
    callsign,
    wavesCleared,
    accuracy = 0,
    riskMultiplier = 1.0,
    bountiesEarned = 0,
  }) {
    const finalPlayerName = (playerName || callsign || 'OPERATOR_0').toUpperCase().slice(0, 14);
    const finalScore = Math.floor(score || 0);
    const finalWave = Math.floor(waveNumber !== undefined ? waveNumber : (wavesCleared || 0));
    const finalDuration = Math.floor(durationSeconds || 0);
    const finalRing = clearanceRing !== undefined ? clearanceRing : 3;
    const timestamp = Date.now();

    // Generate HMAC-SHA256 signature
    const signature = await this.signPayload(
      finalPlayerName,
      finalScore,
      finalWave,
      finalDuration,
      timestamp
    );

    const legacyChecksum = await this.computeChecksum({
      score: finalScore,
      wavesCleared: finalWave,
      clearanceRing: finalRing,
      bountiesEarned,
    });

    const runHash = signature.slice(0, 16);

    const payload = {
      playerName: finalPlayerName,
      callsign: finalPlayerName,
      score: finalScore,
      waveNumber: finalWave,
      wavesCleared: finalWave,
      clearanceRing: finalRing,
      durationSeconds: finalDuration,
      timestamp,
      signature,
      checksum: legacyChecksum,
      accuracy: Number(Number(accuracy).toFixed(1)),
      riskMultiplier: Number(Number(riskMultiplier).toFixed(2)),
      bountiesEarned: Math.floor(bountiesEarned),
      verified: true,
    };

    // Always update local persistent score history
    const localList = this.loadLocalScores();
    localList.push(payload);
    localList.sort((a, b) => b.score - a.score);
    this.saveLocalScores(localList.slice(0, 50));

    // Attempt remote submission to Cloudflare Worker
    if (this.enableRemote && typeof fetch === 'function') {
      try {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeoutId = controller ? setTimeout(() => controller.abort(), 2500) : null;
        const res = await fetch(`${this.apiUrl}/api/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller?.signal,
        });
        if (timeoutId) clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          this.isOnline = true;
          // Background flush of any pending items
          this.flushPendingSubmissions().catch(() => {});
          return {
            success: true,
            runHash: data.runHash || runHash,
            rank: data.rank || 1,
            remote: true,
            entry: data.entry || payload,
          };
        }
      } catch {
        // Network timeout / unreachable
      }
    }

    // Offline / Network Error: queue to localStorage to retry later
    this.isOnline = false;
    this.queuePendingSubmission(payload);

    // Compute rank against local combined list
    const combined = await this.fetchTopScores(100, false);
    const rankIndex = combined.findIndex((r) => (r.signature && r.signature === signature) || r.checksum === legacyChecksum);
    const finalRank = rankIndex !== -1 ? rankIndex + 1 : combined.length;

    return {
      success: true,
      runHash,
      rank: finalRank,
      remote: false,
      entry: payload,
    };
  }

  /**
   * Backward-compatible alias for submitRun
   * @param {Object} rawEntry
   */
  async submitScore(rawEntry) {
    return this.submitRun(rawEntry);
  }

  /**
   * Fetches top rankings from Cloudflare Worker or local cache
   * Performs GET /api/leaderboard?limit=100
   * On success: caches array in localStorage under ring0_leaderboard_cache
   * On error/offline: returns cached scores gracefully
   * @param {number} [limit=100]
   * @param {boolean} [tryRemote=true]
   * @returns {Promise<Array<Object>>}
   */
  async fetchTopScores(limit = 100, tryRemote = true) {
    if (tryRemote && this.enableRemote && typeof fetch === 'function') {
      try {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeoutId = controller ? setTimeout(() => controller.abort(), 2500) : null;
        const res = await fetch(`${this.apiUrl}/api/leaderboard?limit=${limit}`, {
          signal: controller?.signal,
        });
        if (timeoutId) clearTimeout(timeoutId);

        if (res.ok) {
          const remoteRecords = await res.json();
          if (Array.isArray(remoteRecords) && remoteRecords.length > 0) {
            this.isOnline = true;
            this.saveCachedScores(remoteRecords);
            this.flushPendingSubmissions().catch(() => {});
            return remoteRecords.slice(0, limit).map((r, i) => ({
              ...r,
              rank: r.rank || i + 1,
              callsign: r.callsign || r.playerName || 'OPERATOR_0',
              playerName: r.playerName || r.callsign || 'OPERATOR_0',
              waveNumber: r.waveNumber !== undefined ? r.waveNumber : (r.wavesCleared !== undefined ? r.wavesCleared : 0),
              wavesCleared: r.wavesCleared !== undefined ? r.wavesCleared : (r.waveNumber !== undefined ? r.waveNumber : 0),
              clearanceRing: r.clearanceRing !== undefined ? r.clearanceRing : (r.clearanceTier !== undefined ? r.clearanceTier : 3),
            }));
          }
        }
      } catch {
        this.isOnline = false;
      }
    } else {
      this.isOnline = false;
    }

    // Network error / offline fallback: load cached scores from ring0_leaderboard_cache
    const cached = this.loadCachedScores();
    if (cached && cached.length > 0) {
      return cached.slice(0, limit).map((r, i) => ({
        ...r,
        rank: r.rank || i + 1,
        callsign: r.callsign || r.playerName || 'OPERATOR_0',
        playerName: r.playerName || r.callsign || 'OPERATOR_0',
        waveNumber: r.waveNumber !== undefined ? r.waveNumber : (r.wavesCleared !== undefined ? r.wavesCleared : 0),
        wavesCleared: r.wavesCleared !== undefined ? r.wavesCleared : (r.waveNumber !== undefined ? r.waveNumber : 0),
        clearanceRing: r.clearanceRing !== undefined ? r.clearanceRing : (r.clearanceTier !== undefined ? r.clearanceTier : 3),
      }));
    }

    // Default fallback: combine seeded records and local player scores
    const local = this.loadLocalScores();
    const combined = [...SEEDED_RECORDS, ...local];

    const unique = [];
    const seen = new Set();
    for (const item of combined) {
      const key = item.signature || item.checksum || `${item.playerName || item.callsign}_${item.score}_${item.timestamp}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }

    unique.sort((a, b) => b.score - a.score);

    return unique.slice(0, limit).map((entry, idx) => ({
      ...entry,
      rank: idx + 1,
      callsign: entry.callsign || entry.playerName || 'OPERATOR_0',
      playerName: entry.playerName || entry.callsign || 'OPERATOR_0',
      waveNumber: entry.waveNumber !== undefined ? entry.waveNumber : (entry.wavesCleared !== undefined ? entry.wavesCleared : 0),
      wavesCleared: entry.wavesCleared !== undefined ? entry.wavesCleared : (entry.waveNumber !== undefined ? entry.waveNumber : 0),
      clearanceRing: entry.clearanceRing !== undefined ? entry.clearanceRing : (entry.clearanceTier !== undefined ? entry.clearanceTier : 3),
    }));
  }

  /**
   * Loads cached leaderboard records from localStorage
   * @returns {Array<Object>}
   */
  loadCachedScores() {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(this.cacheKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Persists cached leaderboard records to localStorage
   * @param {Array<Object>} scores
   */
  saveCachedScores(scores) {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(this.cacheKey, JSON.stringify(scores));
    } catch (e) {
      console.warn('LeaderboardService: Failed to save leaderboard cache', e);
    }
  }

  /**
   * Loads pending offline submissions from localStorage
   * @returns {Array<Object>}
   */
  loadPendingSubmissions() {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(this.pendingKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Persists pending offline submissions to localStorage
   * @param {Array<Object>} queue
   */
  savePendingSubmissions(queue) {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(this.pendingKey, JSON.stringify(queue));
    } catch (e) {
      console.warn('LeaderboardService: Failed to save pending submissions', e);
    }
  }

  /**
   * Queues an offline submission for retry
   * @param {Object} payload
   */
  queuePendingSubmission(payload) {
    const queue = this.loadPendingSubmissions();
    queue.push(payload);
    this.savePendingSubmissions(queue.slice(0, 30));
  }

  /**
   * Flushes queued pending submissions to the edge Worker
   */
  async flushPendingSubmissions() {
    const queue = this.loadPendingSubmissions();
    if (!queue.length || !this.enableRemote || typeof fetch !== 'function') return;

    const remaining = [];
    for (const item of queue) {
      try {
        const res = await fetch(`${this.apiUrl}/api/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });
        if (!res.ok) {
          remaining.push(item);
        }
      } catch {
        remaining.push(item);
      }
    }
    this.savePendingSubmissions(remaining);
  }

  /**
   * Loads saved local scores from localStorage
   * @returns {Array<Object>}
   */
  loadLocalScores() {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Persists local scores to localStorage
   * @param {Array<Object>} scores
   */
  saveLocalScores(scores) {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(scores));
    } catch (e) {
      console.warn('LeaderboardService: Failed to save scores to localStorage', e);
    }
  }

  /**
   * Clears local record storage (for debug / tests)
   */
  clearLocalScores() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(this.storageKey);
      localStorage.removeItem(this.cacheKey);
      localStorage.removeItem(this.pendingKey);
    } catch {}
  }
}
