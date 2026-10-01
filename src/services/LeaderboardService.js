/**
 * Ring Zero - Leaderboard & Run Verification Service
 * Handles asynchronous score submissions, local persistence, seeded global records,
 * and cryptographic run verification using native SHA-256 (crypto.subtle).
 */

const LEADERBOARD_STORAGE_KEY = 'ring_zero_leaderboard_v1';
const VERIFICATION_SALT = 'RING_ZERO_KERNEL_SIG_v1.0.4';

/** Initial seeded global leaderboard entries */
const SEEDED_RECORDS = [
  {
    rank: 1,
    callsign: 'KRNL_OVERLORD',
    score: 84250,
    wavesCleared: 24,
    clearanceRing: 0,
    accuracy: 94.2,
    riskMultiplier: 2.25,
    timestamp: '2026-09-28T14:22:00Z',
    verified: true,
  },
  {
    rank: 2,
    callsign: 'ZERO_COOL',
    score: 61900,
    wavesCleared: 19,
    clearanceRing: 1,
    accuracy: 89.8,
    riskMultiplier: 1.75,
    timestamp: '2026-09-29T03:11:45Z',
    verified: true,
  },
  {
    rank: 3,
    callsign: 'GHOST_DEV',
    score: 47320,
    wavesCleared: 15,
    clearanceRing: 1,
    accuracy: 91.5,
    riskMultiplier: 1.5,
    timestamp: '2026-09-29T18:04:12Z',
    verified: true,
  },
  {
    rank: 4,
    callsign: 'HEX_DAEMON',
    score: 32800,
    wavesCleared: 11,
    clearanceRing: 2,
    accuracy: 82.0,
    riskMultiplier: 1.25,
    timestamp: '2026-09-30T09:40:22Z',
    verified: true,
  },
  {
    rank: 5,
    callsign: 'NULL_POINTER',
    score: 18450,
    wavesCleared: 7,
    clearanceRing: 3,
    accuracy: 76.4,
    riskMultiplier: 1.0,
    timestamp: '2026-09-30T16:55:01Z',
    verified: true,
  },
];

export class LeaderboardService {
  constructor(options = {}) {
    this.storageKey = options.storageKey || LEADERBOARD_STORAGE_KEY;
    this.remoteEndpoint = options.remoteEndpoint || 'https://ring-zero-leaderboard.workers.dev/api';
    this.enableRemote = options.enableRemote ?? true;
  }

  /**
   * Generates a cryptographic verification hash for run telemetry using SHA-256
   * @param {Object} runData
   * @returns {Promise<string>} Hex-encoded SHA-256 digest
   */
  async computeChecksum(runData) {
    const score = Math.floor(runData.score || 0);
    const waves = Math.floor(runData.wavesCleared || 0);
    const ring = runData.clearanceRing !== undefined ? runData.clearanceRing : 3;
    const bounties = Math.floor(runData.bountiesEarned || 0);
    const payload = `${score}:${waves}:${ring}:${bounties}:${VERIFICATION_SALT}`;

    // Browser environment
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(payload);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }

    // Node.js test environment
    try {
      const crypto = await import('crypto');
      return crypto.createHash('sha256').update(payload).digest('hex');
    } catch {
      // Fallback pseudo-hash
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
   * Submits a completed run to local records and re-indexes the leaderboard
   * @param {Object} rawEntry
   * @returns {Promise<{ success: boolean, rank: number, entry: Object }>}
   */
  async submitScore(rawEntry) {
    const checksum = await this.computeChecksum(rawEntry);
    const entry = {
      callsign: (rawEntry.callsign || 'OPERATOR_0').toUpperCase().slice(0, 14),
      score: Math.floor(rawEntry.score || 0),
      wavesCleared: Math.floor(rawEntry.wavesCleared || 0),
      clearanceRing: rawEntry.clearanceRing !== undefined ? rawEntry.clearanceRing : 3,
      accuracy: Number((rawEntry.accuracy || 0).toFixed(1)),
      riskMultiplier: Number((rawEntry.riskMultiplier || 1.0).toFixed(2)),
      bountiesEarned: Math.floor(rawEntry.bountiesEarned || 0),
      timestamp: new Date().toISOString(),
      checksum: checksum,
      verified: true,
    };

    const localList = this.loadLocalScores();
    localList.push(entry);

    // Sort descending by score
    localList.sort((a, b) => b.score - a.score);

    // Keep top 50 local records
    const trimmed = localList.slice(0, 50);
    this.saveLocalScores(trimmed);

    // Attempt remote submission to Cloudflare Worker endpoint if online
    if (this.enableRemote && typeof fetch === 'function') {
      try {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeoutId = controller ? setTimeout(() => controller.abort(), 1800) : null;
        const res = await fetch(`${this.remoteEndpoint}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
          signal: controller?.signal,
        });
        if (timeoutId) clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.rank === 'number') {
            return {
              success: true,
              rank: data.rank,
              entry: data.entry || entry,
              remote: true,
            };
          }
        }
      } catch {
        // Fall back gracefully to offline local calculation
      }
    }

    // Offline / fallback rank calculation across global + local records
    const combined = await this.fetchTopScores(100, false);
    const rankIndex = combined.findIndex((r) => r.checksum === entry.checksum);
    const finalRank = rankIndex !== -1 ? rankIndex + 1 : combined.length;

    return {
      success: true,
      rank: finalRank,
      entry,
      remote: false,
    };
  }

  /**
   * Fetches top rankings combining seeded records and player records
   * @param {number} [limit=10]
   * @param {boolean} [tryRemote=true]
   * @returns {Promise<Array<Object>>}
   */
  async fetchTopScores(limit = 10, tryRemote = true) {
    // Attempt remote fetch from Cloudflare Worker endpoint if enabled
    if (tryRemote && this.enableRemote && typeof fetch === 'function') {
      try {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeoutId = controller ? setTimeout(() => controller.abort(), 1800) : null;
        const res = await fetch(`${this.remoteEndpoint}/leaderboard?limit=${limit}`, {
          signal: controller?.signal,
        });
        if (timeoutId) clearTimeout(timeoutId);
        if (res.ok) {
          const remoteRecords = await res.json();
          if (Array.isArray(remoteRecords) && remoteRecords.length > 0) {
            return remoteRecords.slice(0, limit);
          }
        }
      } catch {
        // Fall back gracefully to local + seeded records
      }
    }

    const local = this.loadLocalScores();
    const combined = [...SEEDED_RECORDS, ...local];

    // Deduplicate by signature or timestamp
    const unique = [];
    const seen = new Set();
    for (const item of combined) {
      const key = item.checksum || `${item.callsign}_${item.score}_${item.timestamp}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }

    // Sort descending by score
    unique.sort((a, b) => b.score - a.score);

    // Assign sequential ranks
    return unique.slice(0, limit).map((entry, idx) => ({
      ...entry,
      rank: idx + 1,
    }));
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
    } catch {}
  }
}
