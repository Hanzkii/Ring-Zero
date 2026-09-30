/**
 * Ring Zero - Persistent Storage & Privilege Escalation Schema
 * Encapsulates localStorage persistence with schema versioning, bounty accounting,
 * clearance ring authorization, and risk modifier state.
 */

import { RING_TIER } from '../cheats/CheatDefinition.js';

export const STORAGE_KEY = 'ring_zero_save_v1';

export const RING_COSTS = {
  [RING_TIER.RING_3]: 0,     // Starter clearance (Userland)
  [RING_TIER.RING_2]: 350,   // Driver Space
  [RING_TIER.RING_1]: 850,   // Hypervisor Space
  [RING_TIER.RING_0]: 1800,  // Kernel Space
};

export const RISK_MODIFIERS = {
  watchdogAI: {
    id: 'watchdogAI',
    name: 'DAEMON: WATCHDOG_AI.sys',
    description: '+25% daemon movement velocity. Detects linear trajectories faster.',
    scoreMultiplier: 0.25,
    enemySpeedMultiplier: 1.25,
  },
  integrityShield: {
    id: 'integrityShield',
    name: 'DAEMON: INTEGRITY_SHIELD.ko',
    description: 'Enemies reinforce chassis with +50% health resistance.',
    scoreMultiplier: 0.35,
    enemyHealthMultiplier: 1.50,
  },
  kernelPurge: {
    id: 'kernelPurge',
    name: 'DAEMON: KERNEL_PURGE.exe',
    description: 'Direct damage check doubles (+100% incoming damage to player chassis).',
    scoreMultiplier: 0.50,
    playerDamageMultiplier: 2.0,
  },
};

export const DEFAULT_SAVE_STATE = {
  version: 1,
  clearanceRing: RING_TIER.RING_3, // Default starter Ring 3 (Userland)
  cryptoBounties: 0,
  riskModifiers: {
    watchdogAI: false,
    integrityShield: false,
    kernelPurge: false,
  },
  highScores: [],
  totalKills: 0,
  totalRuns: 0,
  settings: {
    masterVolume: 0.7,
    isMuted: false,
  },
};

export class StorageService {
  constructor(storageBackend = null) {
    this.storage =
      storageBackend ||
      (typeof localStorage !== 'undefined'
        ? localStorage
        : typeof window !== 'undefined' && window.localStorage
        ? window.localStorage
        : null);

    this.ringCosts = RING_COSTS;
    this.state = this.load();
  }

  /**
   * Loads state from storage or initializes defaults
   * @returns {typeof DEFAULT_SAVE_STATE}
   */
  load() {
    if (!this.storage) {
      return JSON.parse(JSON.stringify(DEFAULT_SAVE_STATE));
    }

    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) {
        const initial = JSON.parse(JSON.stringify(DEFAULT_SAVE_STATE));
        this.saveState(initial);
        return initial;
      }

      const parsed = JSON.parse(raw);
      // Migration / deep-merge with default structure
      const state = {
        ...DEFAULT_SAVE_STATE,
        ...parsed,
        riskModifiers: {
          ...DEFAULT_SAVE_STATE.riskModifiers,
          ...(parsed.riskModifiers || {}),
        },
        settings: {
          ...DEFAULT_SAVE_STATE.settings,
          ...(parsed.settings || {}),
        },
        highScores: Array.isArray(parsed.highScores) ? parsed.highScores : [],
      };
      return state;
    } catch (e) {
      console.warn('StorageService: Failed to parse save state, resetting to default', e);
      return JSON.parse(JSON.stringify(DEFAULT_SAVE_STATE));
    }
  }

  /**
   * Commits state to persistence
   * @param {Object} [customState=null]
   */
  save(customState = null) {
    const toSave = customState || this.state;
    this.saveState(toSave);
  }

  saveState(stateObj) {
    if (!this.storage) return;
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(stateObj));
    } catch (e) {
      console.warn('StorageService: Unable to write to localStorage', e);
    }
  }

  get clearanceRing() {
    return this.state.clearanceRing !== undefined ? this.state.clearanceRing : RING_TIER.RING_3;
  }

  set clearanceRing(val) {
    this.state.clearanceRing = val;
    this.save();
  }

  getClearanceName() {
    switch (this.clearanceRing) {
      case RING_TIER.RING_0:
        return 'RING 0 [KERNEL SPACE]';
      case RING_TIER.RING_1:
        return 'RING 1 [HYPERVISOR SPACE]';
      case RING_TIER.RING_2:
        return 'RING 2 [DRIVER SPACE]';
      case RING_TIER.RING_3:
      default:
        return 'RING 3 [USERLAND]';
    }
  }

  get cryptoBounties() {
    return this.state.cryptoBounties || 0;
  }

  set cryptoBounties(val) {
    this.state.cryptoBounties = Math.max(0, Math.round(val));
    this.save();
  }

  get highScore() {
    return this.state.highScores[0]?.score || 0;
  }

  get highestWave() {
    if (!this.state.highScores.length) return 0;
    return Math.max(0, ...this.state.highScores.map((h) => h.wave || h.wavesCleared || 0));
  }

  get riskModifiers() {
    return this.state.riskModifiers;
  }

  setRiskModifier(modId, isActive) {
    if (this.state.riskModifiers[modId] !== undefined) {
      this.state.riskModifiers[modId] = !!isActive;
      this.save();
    }
  }

  addBounties(amount) {
    if (amount <= 0) return;
    this.state.cryptoBounties = (this.state.cryptoBounties || 0) + Math.round(amount);
    this.save();
  }

  spendBounties(amount) {
    if (this.state.cryptoBounties >= amount) {
      this.state.cryptoBounties -= amount;
      this.save();
      return true;
    }
    return false;
  }

  canAffordRing(targetRing) {
    const cost = RING_COSTS[targetRing];
    if (cost === undefined) return false;
    return this.cryptoBounties >= cost;
  }

  /**
   * Unlocks deeper clearance ring (Ring 3 -> 2 -> 1 -> 0)
   * @param {number} targetRing
   * @returns {boolean} Whether upgrade succeeded
   */
  escalatePrivilege(targetRing) {
    // Only allow escalating to deeper rings (numerically smaller: 3 -> 2 -> 1 -> 0)
    if (targetRing >= this.clearanceRing) return false;

    // Must be sequential (can only escalate 1 step at a time: 3 -> 2, 2 -> 1, 1 -> 0)
    if (targetRing !== this.clearanceRing - 1) return false;

    const cost = RING_COSTS[targetRing];
    if (this.spendBounties(cost)) {
      this.state.clearanceRing = targetRing;
      this.save();
      return true;
    }
    return false;
  }

  /**
   * Computes aggregate score multiplier from active risk modifiers
   * @returns {number} Multiplier (e.g. 1.0 baseline, 2.1 with all mutators)
   */
  getRiskMultiplier() {
    let multiplier = 1.0;
    if (this.state.riskModifiers.watchdogAI) multiplier += 0.25;
    if (this.state.riskModifiers.integrityShield) multiplier += 0.35;
    if (this.state.riskModifiers.kernelPurge) multiplier += 0.50;
    return Math.round(multiplier * 100) / 100;
  }

  /**
   * Records run results into high score leaderboard and increments total counters
   * @param {Object} runResult - { score, wavesCleared, wave, bountiesEarned, kills, checksum }
   * @returns {{ isNewHighScore: boolean, rank: number }}
   */
  recordRun(runResult) {
    this.state.totalRuns = (this.state.totalRuns || 0) + 1;
    this.state.totalKills = (this.state.totalKills || 0) + (runResult.kills || 0);

    if (runResult.bountiesEarned) {
      this.addBounties(runResult.bountiesEarned);
    }

    const record = {
      score: runResult.score,
      wave: runResult.wavesCleared !== undefined ? runResult.wavesCleared : runResult.wave || 0,
      wavesCleared: runResult.wavesCleared !== undefined ? runResult.wavesCleared : runResult.wave || 0,
      clearanceRing: this.clearanceRing,
      riskMultiplier: this.getRiskMultiplier(),
      timestamp: Date.now(),
      checksum: runResult.checksum || '',
    };

    const previousHigh = this.state.highScores[0]?.score || 0;
    this.state.highScores.push(record);
    this.state.highScores.sort((a, b) => b.score - a.score);

    // Keep top 10 local scores
    if (this.state.highScores.length > 10) {
      this.state.highScores.length = 10;
    }

    const rank = this.state.highScores.indexOf(record) + 1;
    const isNewHighScore = rank === 1 && record.score > previousHigh;

    this.save();
    return { isNewHighScore, rank };
  }

  reset() {
    this.state = JSON.parse(JSON.stringify(DEFAULT_SAVE_STATE));
    this.save();
  }
}
