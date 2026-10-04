/**
 * Ring Zero - Cyber-Clearance Achievement Engine
 * Tracks in-run milestones, cryptographic exploit milestones, and persistent career achievements.
 * Features in-game procedural vector toast notifications and localStorage persistence.
 */

import { COLOR } from '../core/Constants.js';

export const ACHIEVEMENT_REGISTRY = {
  ROOT_KIT: {
    id: 'ROOT_KIT',
    name: 'ROOT_KIT',
    title: 'Root Access',
    description: 'Unlock your first exploit from the runtime draft pool.',
    badge: 'KIT_0',
  },
  RING_ZERO_BREACH: {
    id: 'RING_ZERO_BREACH',
    name: 'RING_ZERO_BREACH',
    title: 'Ring 0 Breach',
    description: 'Equip any Kernel-tier (Ring 0) exploit (InfiniteAmmo, KernelPanic, Noclip, SilentAim).',
    badge: 'RING_0',
  },
  GHOST_IN_THE_SHELL: {
    id: 'GHOST_IN_THE_SHELL',
    name: 'GHOST_IN_THE_SHELL',
    title: 'Ghost In The Shell',
    description: 'Deflect 50 incoming enemy projectiles using Anti-Aim / Spinbot evasion.',
    badge: 'EVADE_50',
    target: 50,
  },
  STACK_OVERFLOW: {
    id: 'STACK_OVERFLOW',
    name: 'STACK_OVERFLOW',
    title: 'Stack Overflow',
    description: 'Defeat a heavy MEMORY-LEAK daemon without taking hull damage in that wave.',
    badge: 'STACK_CLR',
  },
  NULL_POINTER: {
    id: 'NULL_POINTER',
    name: 'NULL_POINTER',
    title: 'Null Pointer Exception',
    description: 'Execute a clean wave purge with 100% accuracy using SilentAim.vmp.',
    badge: 'NULL_PTR',
  },
  CHRONO_DISPLACED: {
    id: 'CHRONO_DISPLACED',
    name: 'CHRONO_DISPLACED',
    title: 'Chrono Displaced',
    description: 'Eliminate an enemy on their historical backtrack tick using Backtrack.sys.',
    badge: 'CHRONO',
  },
  COLD_REBOOT: {
    id: 'COLD_REBOOT',
    name: 'COLD_REBOOT',
    title: 'Cold Reboot',
    description: 'Survive 10 security waves without purchasing permanent firmware upgrades.',
    badge: 'REBOOT_10',
  },
  CRYPTO_WHALE: {
    id: 'CRYPTO_WHALE',
    name: 'CRYPTO_WHALE',
    title: 'Crypto Whale',
    description: 'Accumulate 5,000 Bitcoin / Crypto bounty fragments across career runs.',
    badge: 'WHALE_5K',
    target: 5000,
  },
};

const ACHIEVEMENTS_STORAGE_KEY = 'ring_zero_achievements_v1';

export class AchievementSystem {
  /**
   * @param {Object} [options={}]
   * @param {import('../audio/SoundBank.js').SoundBank} [options.soundBank=null]
   */
  constructor({ soundBank = null } = {}) {
    this.soundBank = soundBank;
    this.storageKey = ACHIEVEMENTS_STORAGE_KEY;

    /** @type {Map<string, { unlockedAt: string }>} */
    this.unlocked = new Map();

    // In-game active toast queue
    this.activeToasts = []; // { achievement, timer, maxTimer: 3.5, slide: 0 }

    // Run-scoped trackers
    this.runStats = {
      evasionCount: 0,
      waveTookDamage: false,
      silentAimWaveFired: 0,
      silentAimWaveHits: 0,
    };

    this.load();
  }

  load() {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          for (const [k, v] of Object.entries(parsed)) {
            this.unlocked.set(k, v);
          }
        }
      }
    } catch (e) {
      console.warn('AchievementSystem: Failed to load achievements', e);
    }
  }

  save() {
    if (typeof localStorage === 'undefined') return;
    try {
      const obj = {};
      for (const [k, v] of this.unlocked.entries()) {
        obj[k] = v;
      }
      localStorage.setItem(this.storageKey, JSON.stringify(obj));
    } catch (e) {
      console.warn('AchievementSystem: Failed to save achievements', e);
    }
  }

  isUnlocked(id) {
    return this.unlocked.has(id);
  }

  /**
   * Unlocks an achievement if not already earned
   * @param {string} id
   * @returns {boolean} Whether newly unlocked
   */
  unlock(id) {
    const ach = ACHIEVEMENT_REGISTRY[id];
    if (!ach || this.isUnlocked(id)) return false;

    const data = {
      unlockedAt: new Date().toISOString(),
    };
    this.unlocked.set(id, data);
    this.save();

    // Enqueue toast
    this.activeToasts.push({
      achievement: ach,
      timer: 3.5,
      maxTimer: 3.5,
      slide: 0,
    });

    if (this.soundBank) {
      this.soundBank.playLevelUp?.();
    }

    return true;
  }

  // --- In-Game Event Hooks ---

  onCheatUnlocked(cheatId, ringTier) {
    this.unlock('ROOT_KIT');
    if (
      ringTier === 0 ||
      cheatId === 'infiniteammo' ||
      cheatId === 'kernelpanic' ||
      cheatId === 'noclip' ||
      cheatId === 'silentaim'
    ) {
      this.unlock('RING_ZERO_BREACH');
    }
  }

  onProjectileEvaded() {
    this.runStats.evasionCount++;
    if (this.runStats.evasionCount >= 50) {
      this.unlock('GHOST_IN_THE_SHELL');
    }
  }

  onEnemyKilled(enemy, isBacktrackHit = false) {
    if (isBacktrackHit) {
      this.unlock('CHRONO_DISPLACED');
    }
    if (enemy?.type === 'MEMORY_LEAK' && !this.runStats.waveTookDamage) {
      this.unlock('STACK_OVERFLOW');
    }
  }

  onPlayerDamaged() {
    this.runStats.waveTookDamage = true;
  }

  onWaveCompleted(waveNumber, waveAccuracy = 0, hasSilentAim = false, totalFirmwareCount = 0) {
    if (hasSilentAim && waveAccuracy >= 99.9) {
      this.unlock('NULL_POINTER');
    }
    if (waveNumber >= 10 && totalFirmwareCount === 0) {
      this.unlock('COLD_REBOOT');
    }
    // Reset wave-scoped damage state
    this.runStats.waveTookDamage = false;
  }

  onBountiesUpdated(totalCareerBounties) {
    if (totalCareerBounties >= 5000) {
      this.unlock('CRYPTO_WHALE');
    }
  }

  /**
   * Resets run-scoped telemetry on restart
   */
  resetRun() {
    this.runStats.evasionCount = 0;
    this.runStats.waveTookDamage = false;
    this.runStats.silentAimWaveFired = 0;
    this.runStats.silentAimWaveHits = 0;
  }

  /**
   * Updates toast timer and slide animations
   * @param {number} dt
   */
  update(dt) {
    for (let i = this.activeToasts.length - 1; i >= 0; i--) {
      const toast = this.activeToasts[i];
      toast.timer -= dt;

      // Smooth slide-in and slide-out (0 to 1)
      const elapsed = toast.maxTimer - toast.timer;
      if (elapsed < 0.3) {
        toast.slide = elapsed / 0.3;
      } else if (toast.timer < 0.3) {
        toast.slide = Math.max(0, toast.timer / 0.3);
      } else {
        toast.slide = 1.0;
      }

      if (toast.timer <= 0) {
        this.activeToasts.splice(i, 1);
      }
    }
  }

  /**
   * Renders cybernetic vector toasts in top-right HUD screen space
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} screenWidth
   */
  renderToasts(ctx, screenWidth) {
    if (this.activeToasts.length === 0) return;

    ctx.save();
    let currentY = 16;
    const maxVisible = 3;
    const visibleToasts = this.activeToasts.slice(0, maxVisible);

    for (const toast of visibleToasts) {
      if (toast.slide <= 0.01) continue;

      const ach = toast.achievement;
      const toastW = 320;
      const toastH = 58;
      const offscreenX = screenWidth + 20;
      const targetX = screenWidth - toastW - 16;
      const drawX = Math.round(offscreenX + (targetX - offscreenX) * toast.slide);
      const drawY = Math.round(currentY);

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, toast.slide));

      // Dark cybernetic card backdrop
      ctx.fillStyle = 'rgba(11, 15, 23, 0.96)';
      ctx.fillRect(drawX, drawY, toastW, toastH);

      // Neon cyan border with left accent bar
      ctx.strokeStyle = COLOR.CYAN;
      ctx.lineWidth = 1;
      ctx.strokeRect(drawX, drawY, toastW, toastH);

      ctx.fillStyle = COLOR.CYAN;
      ctx.fillRect(drawX, drawY, 4, toastH);

      // Badge tag
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = COLOR.AMBER;
      ctx.fillText(`// CLEARANCE UNLOCKED: [${ach.badge || 'UNLOCKED'}]`, drawX + 12, drawY + 14);

      // Title
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = COLOR.WHITE;
      ctx.fillText(ach.title || ach.name, drawX + 12, drawY + 28);

      // Description with word wrapping to avoid clipping retro HUD border
      ctx.font = '9px monospace';
      ctx.fillStyle = COLOR.WHITE_DIM;
      const desc = ach.description || '';
      if (desc.length > 48) {
        let splitIdx = desc.lastIndexOf(' ', 48);
        if (splitIdx === -1 || splitIdx < 20) splitIdx = 48;
        const line1 = desc.slice(0, splitIdx).trim();
        let line2 = desc.slice(splitIdx).trim();
        if (line2.length > 46) {
          line2 = line2.slice(0, 44) + '..';
        }
        ctx.fillText(line1, drawX + 12, drawY + 40);
        ctx.fillText(line2, drawX + 12, drawY + 50);
      } else {
        ctx.fillText(desc, drawX + 12, drawY + 42);
      }

      // Lifetime progress bar
      const progress = Math.max(0, toast.timer / toast.maxTimer);
      ctx.fillStyle = COLOR.CYAN;
      ctx.fillRect(drawX + toastW - 54, drawY + toastH - 3, 50 * progress, 2);

      ctx.restore();

      currentY += toastH + 8;
    }

    ctx.restore();
  }
}
