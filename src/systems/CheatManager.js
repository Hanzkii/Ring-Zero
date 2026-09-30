/**
 * Ring Zero - Cheat Exploit Manager & Interceptor Pipeline
 * Orchestrates the exploit lifecycle, hook interception pipeline, and draft selection generator.
 */

import { CHEAT_REGISTRY, RING_TIER } from '../cheats/CheatDefinition.js';
import { AimbotCheat } from '../cheats/AimbotCheat.js';
import { WallhackCheat } from '../cheats/WallhackCheat.js';
import { SpinbotCheat } from '../cheats/SpinbotCheat.js';
import { DoubleTapCheat } from '../cheats/DoubleTapCheat.js';
import { SilentAimCheat } from '../cheats/SilentAimCheat.js';
import { BacktrackCheat } from '../cheats/BacktrackCheat.js';

export class CheatManager {
  constructor() {
    /** @type {Map<string, import('../cheats/CheatDefinition.js').CheatInterceptor>} */
    this.activeCheats = new Map();
    this.clearanceRing = RING_TIER.RING_3; // Default starting clearance
  }

  /**
   * Installs a new cheat or upgrades an existing one
   * @param {string} cheatId
   * @returns {import('../cheats/CheatDefinition.js').CheatInterceptor|null}
   */
  addOrUpgradeCheat(cheatId) {
    let cheat = this.activeCheats.get(cheatId);
    if (cheat) {
      cheat.upgrade();
      return cheat;
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
      case 'doubletap':
        cheat = new DoubleTapCheat();
        break;
      case 'silentaim':
        cheat = new SilentAimCheat();
        break;
      case 'backtrack':
        cheat = new BacktrackCheat();
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

  getCheat(cheatId) {
    return this.activeCheats.get(cheatId);
  }

  /**
   * Pipeline Hook: Passes aim angles through active interceptors
   * @param {number} aimAngle
   * @param {import('../core/VectorMath.js').Vec2} aimVector
   * @param {Object} context
   * @returns {number}
   */
  applyAimInterceptors(aimAngle, aimVector, context) {
    let currentAngle = aimAngle;
    for (const cheat of this.activeCheats.values()) {
      if (cheat.enabled) {
        currentAngle = cheat.onAimInput(currentAngle, aimVector, context);
      }
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
    // Collect active cheats that intercept weapon fire
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
   * Pipeline Hook: Updates active enemies per tick
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
   * Pipeline Hook: Updates player state
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
    for (const cheat of this.activeCheats.values()) {
      if (cheat.enabled) {
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
    for (const cheat of this.activeCheats.values()) {
      if (cheat.enabled) {
        cheat.onRenderHUD(ctx, startX, curY);
        curY += 15;
      }
    }
  }

  /**
   * Generates 3 randomized, non-duplicate exploit cards for mid-run level-up draft
   * @param {number} [count=3]
   * @returns {Array<{ def: Object, isUpgrade: boolean, currentLevel: number }>}
   */
  generateDraftOptions(count = 3) {
    const candidates = [];

    for (const key of Object.keys(CHEAT_REGISTRY)) {
      const def = CHEAT_REGISTRY[key];

      // Verify clearance tier (Ring 3 is lowest clearance, Ring 0 is highest)
      if (def.tier < this.clearanceRing) {
        continue;
      }

      const activeInstance = this.activeCheats.get(def.id);
      if (activeInstance) {
        if (activeInstance.level < activeInstance.maxLevel) {
          candidates.push({
            def,
            isUpgrade: true,
            currentLevel: activeInstance.level,
          });
        }
      } else {
        candidates.push({
          def,
          isUpgrade: false,
          currentLevel: 0,
        });
      }
    }

    // Shuffle and pick up to `count`
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    return candidates.slice(0, count);
  }
}
