/**
 * Ring Zero - Cyber-Clearance Achievement Engine
 * Tracks in-run milestones, cryptographic exploit milestones, and persistent career achievements.
 * Features in-game procedural vector toast notifications and localStorage persistence.
 */

import { COLOR } from '../core/Constants.js';

export const ACHIEVEMENT_REGISTRY = {
  // Ring-Specific Milestones
  ACH_R3_ESCAPE: {
    id: 'ACH_R3_ESCAPE',
    name: 'ACH_R3_ESCAPE',
    title: 'Sandbox Escape',
    description: 'Clear Wave 15 and reach Ring 2 (Device Drivers).',
    badge: 'R3_ESCAPE',
  },
  ACH_R3_CLEAN: {
    id: 'ACH_R3_CLEAN',
    name: 'ACH_R3_CLEAN',
    title: 'Clean Memory',
    description: 'Survive 5 consecutive waves without taking damage.',
    badge: 'MEM_CLEAN',
  },
  ACH_R2_HARDWARE: {
    id: 'ACH_R2_HARDWARE',
    name: 'ACH_R2_HARDWARE',
    title: 'Driver Initialized',
    description: 'Clear Wave 30 and reach Ring 1 (Hypervisor).',
    badge: 'R2_DRIVER',
  },
  ACH_R2_PARRY: {
    id: 'ACH_R2_PARRY',
    name: 'ACH_R2_PARRY',
    title: 'IRQ Handler',
    description: 'Eliminate 25 hostiles using the IRQ_TRIGGER ability.',
    badge: 'IRQ_PARRY',
    target: 25,
  },
  ACH_R1_BREACH: {
    id: 'ACH_R1_BREACH',
    name: 'ACH_R1_BREACH',
    title: 'Hypervisor Collapse',
    description: 'Clear Wave 45 and breach Ring 0 (Kernel Space).',
    badge: 'R1_BREACH',
  },
  ACH_R1_GHOST: {
    id: 'ACH_R1_GHOST',
    name: 'ACH_R1_GHOST',
    title: 'Ghost Thread',
    description: 'Evade damage 30 times using PAGE_FAULT blink.',
    badge: 'PAGE_FAULT',
    target: 30,
  },
  ACH_R0_ROOT: {
    id: 'ACH_R0_ROOT',
    name: 'ACH_R0_ROOT',
    title: 'UID 0 Attained',
    description: 'Survive and enter Ring 0 Kernel Execution (Wave 46+).',
    badge: 'UID_0',
  },
  ACH_R0_PANIC: {
    id: 'ACH_R0_PANIC',
    name: 'ACH_R0_PANIC',
    title: 'Kernel Panic Survivor',
    description: 'Survive 90 seconds in Ring 0 hazard zone.',
    badge: 'KERNEL_SURV',
    target: 90,
  },

  // Legacy Milestones for backward compatibility
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
    description: 'Equip any Kernel-tier (Ring 0) exploit.',
    badge: 'RING_0',
  },
  GHOST_IN_THE_SHELL: {
    id: 'GHOST_IN_THE_SHELL',
    name: 'GHOST_IN_THE_SHELL',
    title: 'Ghost In The Shell',
    description: 'Deflect 50 incoming enemy projectiles using Anti-Aim evasion.',
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
    this.activeToasts = []; // { achievement, timer, maxTimer: 4.0, slide: 0 }

    // Run-scoped trackers
    this.runStats = {
      evasionCount: 0,
      waveTookDamage: false,
      silentAimWaveFired: 0,
      silentAimWaveHits: 0,
      consecutiveNoDamageWaves: 0,
      irqTriggerKills: 0,
      pageFaultEvades: 0,
      ring0SurvivalTime: 0,
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

    // Enqueue toast with clean 4.0s auto-dismissal
    this.activeToasts.push({
      achievement: ach,
      timer: 4.0,
      maxTimer: 4.0,
      slide: 0,
    });

    if (this.soundBank) {
      this.soundBank.playLevelUp?.();
    }

    return true;
  }

  // --- In-Game Event Hooks ---

  /**
   * Tracks Clearance Ring elevation
   * @param {number} ring - 3, 2, 1, 0
   * @param {number} waveNumber
   */
  onRingElevated(ring, waveNumber) {
    if (ring <= 2) {
      this.unlock('ACH_R3_ESCAPE');
    }
    if (ring <= 1) {
      this.unlock('ACH_R2_HARDWARE');
    }
    if (ring === 0) {
      this.unlock('ACH_R1_BREACH');
      this.unlock('ACH_R0_ROOT');
      this.unlock('RING_ZERO_BREACH');
    }
  }

  onIrqTriggerKill() {
    this.runStats.irqTriggerKills++;
    if (this.runStats.irqTriggerKills >= 25) {
      this.unlock('ACH_R2_PARRY');
    }
  }

  onPageFaultEvade() {
    this.runStats.pageFaultEvades++;
    if (this.runStats.pageFaultEvades >= 30) {
      this.unlock('ACH_R1_GHOST');
    }
  }

  updateRing0Survival(dt) {
    this.runStats.ring0SurvivalTime += dt;
    if (this.runStats.ring0SurvivalTime >= 90) {
      this.unlock('ACH_R0_PANIC');
    }
  }

  onCheatUnlocked(cheatId, ringTier) {
    this.unlock('ROOT_KIT');
    if (
      ringTier === 0 ||
      cheatId === 'infiniteammo' ||
      cheatId === 'kernelpanic' ||
      cheatId === 'noclip' ||
      cheatId === 'silentaim' ||
      cheatId === 'rootkit'
    ) {
      this.unlock('ACH_R0_ROOT');
      this.unlock('RING_ZERO_BREACH');
    }
  }

  onProjectileEvaded() {
    this.runStats.evasionCount++;
    this.onPageFaultEvade();
    if (this.runStats.evasionCount >= 50) {
      this.unlock('GHOST_IN_THE_SHELL');
    }
  }

  onEnemyKilled(enemy, isBacktrackHit = false, isIrqKill = false) {
    if (isIrqKill) {
      this.onIrqTriggerKill();
    }
    if (isBacktrackHit) {
      this.unlock('CHRONO_DISPLACED');
    }
    if (enemy?.type === 'MEMORY_LEAK' && !this.runStats.waveTookDamage) {
      this.unlock('STACK_OVERFLOW');
    }
  }

  onPlayerDamaged() {
    this.runStats.waveTookDamage = true;
    this.runStats.consecutiveNoDamageWaves = 0;
  }

  onWaveCompleted(waveNumber, waveAccuracy = 0, hasSilentAim = false, totalFirmwareCount = 0) {
    if (!this.runStats.waveTookDamage) {
      this.runStats.consecutiveNoDamageWaves++;
      if (this.runStats.consecutiveNoDamageWaves >= 5) {
        this.unlock('ACH_R3_CLEAN');
      }
    } else {
      this.runStats.consecutiveNoDamageWaves = 0;
    }

    if (waveNumber >= 15) {
      this.unlock('ACH_R3_ESCAPE');
    }
    if (waveNumber >= 30) {
      this.unlock('ACH_R2_HARDWARE');
    }
    if (waveNumber >= 45) {
      this.unlock('ACH_R1_BREACH');
      this.unlock('ACH_R0_ROOT');
    }

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
    this.runStats.consecutiveNoDamageWaves = 0;
    this.runStats.irqTriggerKills = 0;
    this.runStats.pageFaultEvades = 0;
    this.runStats.ring0SurvivalTime = 0;
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
      ctx.translate(drawX, drawY);
      ctx.globalAlpha = Math.max(0, Math.min(1, toast.slide));

      // Dark cybernetic card backdrop
      ctx.fillStyle = 'rgba(11, 15, 23, 0.96)';
      ctx.fillRect(0, 0, toastW, toastH);

      // Neon cyan border with left accent bar
      ctx.strokeStyle = COLOR.CYAN;
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, toastW, toastH);

      ctx.fillStyle = COLOR.CYAN;
      ctx.fillRect(0, 0, 4, toastH);

      // Badge tag
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = COLOR.AMBER;
      ctx.fillText(`// CLEARANCE UNLOCKED: [${ach.badge || 'UNLOCKED'}]`, 12, 14);

      // Title
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = COLOR.WHITE;
      ctx.fillText(ach.title || ach.name, 12, 28);

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
        ctx.fillText(line1, 12, 40);
        ctx.fillText(line2, 12, 50);
      } else {
        ctx.fillText(desc, 12, 42);
      }

      // Lifetime progress bar
      const progress = Math.max(0, toast.timer / toast.maxTimer);
      ctx.fillStyle = COLOR.CYAN;
      ctx.fillRect(toastW - 54, toastH - 3, 50 * progress, 2);

      ctx.restore();

      currentY += toastH + 8;
    }

    ctx.restore();
  }
}
