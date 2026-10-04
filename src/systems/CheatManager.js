/**
 * Ring Zero - Cheat Exploit Manager & Interceptor Pipeline
 * Orchestrates the exploit lifecycle, hook interception pipeline, and draft selection generator.
 * SilentAim supersedes and disables/purges normal Aimbot when active.
 */

import { CHEAT_REGISTRY, RING_TIER } from '../cheats/CheatDefinition.js';
import { AimbotCheat } from '../cheats/AimbotCheat.js';
import { WallhackCheat } from '../cheats/WallhackCheat.js';
import { SpinbotCheat } from '../cheats/SpinbotCheat.js';
import { DoubleTapCheat } from '../cheats/DoubleTapCheat.js';
import { SilentAimCheat } from '../cheats/SilentAimCheat.js';
import { BacktrackCheat } from '../cheats/BacktrackCheat.js';
import { OverclockDashCheat } from '../cheats/OverclockDashCheat.js';
import { SpeedhackCheat } from '../cheats/SpeedhackCheat.js';
import { TriggerbotCheat } from '../cheats/TriggerbotCheat.js';
import { PacketChokeCheat } from '../cheats/PacketChokeCheat.js';
import { RadarTelemetryCheat } from '../cheats/RadarTelemetryCheat.js';
import { PenetrationBuckerCheat } from '../cheats/PenetrationBuckerCheat.js';
import { RapidFireCheat } from '../cheats/RapidFireCheat.js';
import { NoclipCheat } from '../cheats/NoclipCheat.js';
import { RootkitCheat } from '../cheats/RootkitCheat.js';
import { KernelPanicCheat } from '../cheats/KernelPanicCheat.js';
import { InfiniteAmmoCheat } from '../cheats/InfiniteAmmoCheat.js';

export class CheatManager {
  constructor() {
    /** @type {Map<string, import('../cheats/CheatDefinition.js').CheatInterceptor>} */
    this.activeCheats = new Map();
    // Default to null (unrestricted). In-game, GameApp syncs it with StorageService.
    this.clearanceRing = null;
  }

  /**
   * Resets and purges all active cheats, invoking their teardown/reset hooks
   */
  reset() {
    for (const cheat of this.activeCheats.values()) {
      if (typeof cheat.reset === 'function') {
        cheat.reset();
      } else if (typeof cheat.teardown === 'function') {
        cheat.teardown();
      }
    }
    this.activeCheats.clear();
  }

  /**
   * Installs a new cheat or upgrades an existing one (Rank 1 to 3).
   * If SilentAim is acquired, normal Aimbot is purged/overridden.
   * @param {string} cheatId
   * @returns {import('../cheats/CheatDefinition.js').CheatInterceptor|null}
   */
  addOrUpgradeCheat(cheatId) {
    // SilentAim overrides Aimbot: if SilentAim is active, ignore Aimbot
    if (cheatId === 'aimbot' && this.hasCheat('silentaim')) {
      return this.activeCheats.get('silentaim');
    }

    let cheat = this.activeCheats.get(cheatId);
    if (cheat) {
      cheat.upgrade();
      return cheat;
    }

    // When installing SilentAim, override and purge normal Aimbot
    if (cheatId === 'silentaim' && this.hasCheat('aimbot')) {
      this.activeCheats.delete('aimbot');
    }

    switch (cheatId) {
      case 'aimbot':
        cheat = new AimbotCheat();
        break;
      case 'wallhack':
        cheat = new WallhackCheat();
        break;
      case 'spinbot':
        cheat = new SpinbotCheat();
        break;
      case 'overclock_dash':
        cheat = new OverclockDashCheat();
        break;
      case 'speedhack':
        cheat = new SpeedhackCheat();
        break;
      case 'triggerbot':
        cheat = new TriggerbotCheat();
        break;
      case 'doubletap':
        cheat = new DoubleTapCheat();
        break;
      case 'backtrack':
        cheat = new BacktrackCheat();
        break;
      case 'packetchoke':
        cheat = new PacketChokeCheat();
        break;
      case 'radartelemetry':
        cheat = new RadarTelemetryCheat();
        break;
      case 'penetrationbucker':
        cheat = new PenetrationBuckerCheat();
        break;
      case 'rapidfire':
        cheat = new RapidFireCheat();
        break;
      case 'silentaim':
        cheat = new SilentAimCheat();
        break;
      case 'noclip':
        cheat = new NoclipCheat();
        break;
      case 'rootkit':
        cheat = new RootkitCheat();
        break;
      case 'kernelpanic':
        cheat = new KernelPanicCheat();
        break;
      case 'infiniteammo':
        cheat = new InfiniteAmmoCheat();
        break;
      default:
        console.warn(`CheatManager: Unknown cheat id "${cheatId}"`);
        return null;
    }

    this.activeCheats.set(cheatId, cheat);
    return cheat;
  }

  /**
   * Queries if a specific cheat is active
   * @param {string} cheatId
   * @returns {boolean}
   */
  hasCheat(cheatId) {
    return this.activeCheats.has(cheatId);
  }

  /**
   * Queries if a specific cheat is active and currently executing its effect
   * @param {string} cheatId
   * @returns {boolean}
   */
  isActive(cheatId) {
    const cheat = this.activeCheats.get(cheatId.toLowerCase());
    if (!cheat || !cheat.enabled) return false;
    if (typeof cheat.isActive === 'boolean') return cheat.isActive;
    if (typeof cheat.active === 'boolean') return cheat.active;
    return true;
  }

  /**
   * Dispatches an event to all active enabled cheats
   * @param {string} eventName
   * @param  {...any} args
   */
  trigger(eventName, ...args) {
    for (const cheat of this.activeCheats.values()) {
      if (cheat.enabled) {
        if (typeof cheat[eventName] === 'function') {
          cheat[eventName](...args);
        } else if (typeof cheat.trigger === 'function' && eventName === 'trigger') {
          cheat.trigger(...args);
        }
      }
    }
  }

  getCheat(cheatId) {
    return this.activeCheats.get(cheatId);
  }

  /**
   * Pipeline Hook: Passes aim angles through active interceptors
   * If SilentAim is active, it takes precedence over normal Aimbot.
   * @param {number} aimAngle
   * @param {import('../core/VectorMath.js').Vec2} aimVector
   * @param {Object} context
   * @returns {number}
   */
  applyAimInterceptors(aimAngle, aimVector, context) {
    let currentAngle = aimAngle;
    const hasSilentAim = this.hasCheat('silentaim');
    for (const cheat of this.activeCheats.values()) {
      if (cheat.enabled) {
        if (hasSilentAim && cheat.id === 'aimbot') continue;
        const res = cheat.onAimInput(currentAngle, aimVector, context);
        // SilentAim NEVER alters player chassis or reticle orientation - true stealth decoupling
        if (cheat.id !== 'silentaim') {
          currentAngle = res;
        }
      }
    if (aimVector && typeof currentAngle === 'number') {
      aimVector.x = Math.cos(currentAngle);
      aimVector.y = Math.sin(currentAngle);
    }
    return currentAngle;
  }

  /**
   * Pipeline Hook: Pipes bullet parameters through cheats before spawning
   * @param {Object} bulletParams
   * @param {Object} context
   * @param {function(Object): void} spawnCallback
   */
  applyWeaponFireInterceptors(bulletParams, context, spawnCallback) {
    const fireInterceptors = [];
    for (const cheat of this.activeCheats.values()) {
      if (cheat.enabled && cheat.onWeaponFire) {
        fireInterceptors.push(cheat);
      }
    }

    if (fireInterceptors.length === 0) {
      spawnCallback(bulletParams);
      return;
    }

    // Compose recursive pipeline
    let index = 0;
    const dispatchNext = (params) => {
      if (index < fireInterceptors.length) {
        const interceptor = fireInterceptors[index++];
        interceptor.onWeaponFire(params, context, (p) => dispatchNext(p));
      } else {
        spawnCallback(params);
      }
    };

    dispatchNext(bulletParams);
  }

  /**
   * Pipeline Hook: Intercepts incoming damage (Anti-aim, evasion)
   * @param {number} incomingDamage
   * @param {Object} context
   * @returns {{ damage: number, evaded: boolean }}
   */
  applyTakeDamageInterceptors(incomingDamage, context) {
    let currentDamage = incomingDamage;
    for (const cheat of this.activeCheats.values()) {
      if (cheat.enabled) {
        const result = cheat.onTakeDamage(currentDamage, context);
        if (result.evaded) {
          return { damage: 0, evaded: true };
        }
        currentDamage = result.damage;
      }
    }
    return { damage: currentDamage, evaded: false };
  }

  /**
   * Queries if any active exploit requests automatic firing (e.g. SilentAim or Aimbot Triggerbot)
   * @param {number} dt
   * @param {Object} weapon
   * @returns {boolean}
   */
  wantsAutoFire(dt, weapon) {
    for (const cheat of this.activeCheats.values()) {
      if (cheat.enabled && cheat.shouldAutoShoot) {
        if (cheat.shouldAutoShoot(dt, weapon)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Pipeline Hook: Updates active enemies per tick (Backtrack history recording)
   * @param {import('../entities/Enemy.js').Enemy} enemy
   * @param {number} dt
   * @param {Object} context
   */
  updateEnemy(enemy, dt, context) {
    for (const cheat of this.activeCheats.values()) {
      if (cheat.enabled) {
        cheat.onEnemyUpdate(enemy, dt, context);
      }
    }
  }

  /**
   * Pipeline Hook: Updates player state (Spinbot visual angle desync)
   * @param {import('../entities/Player.js').Player} player
   * @param {number} dt
   * @param {Object} context
   */
  updatePlayer(player, dt, context) {
    for (const cheat of this.activeCheats.values()) {
      if (cheat.enabled) {
        cheat.onPlayerUpdate(player, dt, context);
      }
    }
  }

  /**
   * Pipeline Hook: Renders world-space telemetry
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} alpha
   * @param {Object} context
   */
  renderWorld(ctx, alpha, context) {
    const hasSilentAim = this.hasCheat('silentaim');
    for (const cheat of this.activeCheats.values()) {
      if (cheat.enabled) {
        if (hasSilentAim && cheat.id === 'aimbot') continue;
        cheat.onRenderWorld(ctx, alpha, context);
      }
    }
  }

  /**
   * Pipeline Hook: Renders screen-space HUD badges
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} startX
   * @param {number} startY
   */
  renderHUD(ctx, startX, startY) {
    let curY = startY;
    const hasSilentAim = this.hasCheat('silentaim');
    for (const cheat of this.activeCheats.values()) {
      if (cheat.enabled) {
        if (hasSilentAim && cheat.id === 'aimbot') continue;
        cheat.onRenderHUD(ctx, startX, curY);
        curY += 15;
      }
    }
  }

  /**
   * Generates randomized, non-duplicate exploit cards for mid-run level-up draft.
   * Ensures that drafting an owned cheat upgrades its rank (Rank 1 to 3) rather than duplicating it.
   * Excludes normal Aimbot if SilentAim is already owned (SilentAim overrides Aimbot).
   * Max-level cheats are excluded from the pool.
   * @param {number} [count=3]
   * @returns {Array<{ def: Object, isUpgrade: boolean, currentLevel: number, nextLevel: number, nextPerkDescription: string }>}
   */
  generateDraftOptions(count = 3) {
    const candidates = [];
    const hasSilentAim = this.hasCheat('silentaim');

    for (const key of Object.keys(CHEAT_REGISTRY)) {
      const def = CHEAT_REGISTRY[key];

      // SilentAim overrides Aimbot: never offer normal Aimbot if SilentAim is active
      if (def.id === 'aimbot' && hasSilentAim) {
        continue;
      }

      // Check clearance level
      if (this.clearanceRing !== null && def.tier < this.clearanceRing) {
        continue;
      }

      const activeInstance = this.activeCheats.get(def.id);
      if (activeInstance) {
        // Only include if not yet max level
        if (activeInstance.level < activeInstance.maxLevel) {
          const nextLevel = activeInstance.level + 1;
          const nextPerk = def.rankDescriptions ? def.rankDescriptions[nextLevel - 1] : def.description;
          candidates.push({
            def,
            isUpgrade: true,
            currentLevel: activeInstance.level,
            nextLevel: nextLevel,
            nextPerkDescription: nextPerk,
          });
        }
      } else {
        // Not yet owned: offer as Rank 1
        const firstPerk = def.rankDescriptions ? def.rankDescriptions[0] : def.description;
        candidates.push({
          def,
          isUpgrade: false,
          currentLevel: 0,
          nextLevel: 1,
          nextPerkDescription: firstPerk,
        });
      }
    }

    // Shuffle candidate pool
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    return candidates.slice(0, count);
  }
}
