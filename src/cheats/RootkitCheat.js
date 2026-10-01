/**
 * Ring Zero - Rootkit Exploit (Ring 0 Kernel Execution)
 * Injects an absolute kernel rootkit: Press [F] to discharge an electromagnetic screen purge,
 * incinerating all hostile projectiles across the arena, dealing catastrophic kernel shockwave damage
 * to all security daemons, and granting the player temporary invulnerability.
 */

import { CheatInterceptor, CHEAT_REGISTRY } from './CheatDefinition.js';
import { COLOR, COLLISION_LAYER } from '../core/Constants.js';

export class RootkitCheat extends CheatInterceptor {
  constructor() {
    super(CHEAT_REGISTRY.ROOTKIT);
    this.isActive = false;
    this.durationTimer = 0;
    this.cooldownTimer = 0;
    this.maxCooldown = 12.0;
    this.blastRadius = 950;
  }

  reset() {
    this.isActive = false;
    this.durationTimer = 0;
    this.cooldownTimer = 0;
  }

  teardown() {
    this.reset();
  }

  get active() {
    return this.isActive;
  }

  set active(val) {
    this.isActive = Boolean(val);
  }

  get maxDuration() {
    // Invulnerability / EMP duration: 2.5s (Rank 1), 3.25s (Rank 2), 4.0s (Rank 3)
    return 1.75 + this.level * 0.75;
  }

  get purgeDamage() {
    // Rank 1: 300 dmg, Rank 2: 600 dmg, Rank 3: 950 dmg
    return 300 * this.level;
  }

  /**
   * Executes Rootkit Kernel EMP purge
   * @param {Object} [context={}] - { player, enemies, projectilePool, camera, particleSystem, soundBank }
   * @returns {boolean} Whether execution succeeded
   */
  trigger(context = {}) {
    // HOTFIX: Temporarily disabled to prevent RAF crash until full refactor
    console.warn('[SECURITY] Rootkit Screen Purge temporarily offline.');
    return;

    if (this.cooldownTimer > 0 || !this.enabled) return false;

    this.isActive = true;
    this.durationTimer = this.maxDuration;
    this.cooldownTimer = Math.max(8.0, 14.0 - this.level * 2.0);

    const { player, enemies = [], projectilePool = null, camera = null, particleSystem = null, soundBank = null } = context;

    // 1. Grant player kernel invulnerability
    if (player) {
      player.iFramesTimer = Math.max(player.iFramesTimer, this.maxDuration);
    }

    // 2. Camera trauma shake
    if (camera && typeof camera.addTrauma === 'function') {
      camera.addTrauma(0.45);
    }

    // 3. Audio cue
    if (soundBank && typeof soundBank.playKernelPanic === 'function') {
      soundBank.playKernelPanic();
    }

    // 4. Purge all hostile projectiles across the arena
    if (projectilePool) {
      const purgeFn = (proj) => {
        if (proj.isHostile || proj.owner === 'enemy' || proj.layer === COLLISION_LAYER.PROJECTILE_ENEMY) {
          proj.markedForRemoval = true;
          if (typeof projectilePool.release === 'function') {
            projectilePool.release(proj);
          }
        }
      };

      if (typeof projectilePool.forEachActiveReverse === 'function') {
        projectilePool.forEachActiveReverse(purgeFn);
      } else if (typeof projectilePool.forEachActive === 'function') {
        projectilePool.forEachActive(purgeFn);
      }
    }

    // 5. Deal massive kernel shockwave damage to all nearby security daemons
    const dmg = this.purgeDamage;
    const px = player ? player.x : 0;
    const py = player ? player.y : 0;
    const radiusSq = this.blastRadius * this.blastRadius;

    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      if (!enemy || !enemy.active || enemy.markedForRemoval) continue;

      const edx = enemy.x - px;
      const edy = enemy.y - py;
      const distSq = edx * edx + edy * edy;

      if (distSq <= radiusSq) {
        const dist = Math.sqrt(distSq) || 1;
        const knockbackDir = { x: edx / dist, y: edy / dist };
        enemy.takeDamage(dmg, knockbackDir, 280);
      }
    }

    // 6. Particle explosion
    if (particleSystem && player) {
      if (typeof particleSystem.emitBurst === 'function') {
        particleSystem.emitBurst(player.x, player.y, 40, COLOR.RED, 400);
        particleSystem.emitBurst(player.x, player.y, 25, COLOR.CYAN, 260);
      } else if (typeof particleSystem.emitRing === 'function') {
        particleSystem.emitRing(player.x, player.y, 40, COLOR.RED, 400);
      }
    }

    return true;
  }

  onPlayerUpdate(player, dt, context) {
    if (!this.enabled) return;

    if (this.cooldownTimer > 0) {
      this.cooldownTimer = Math.max(0, this.cooldownTimer - dt);
    }

    if (this.isActive) {
      this.durationTimer = Math.max(0, this.durationTimer - dt);
      if (this.durationTimer <= 0) {
        this.isActive = false;
        this.durationTimer = 0;
      }
    }
  }

  update(dt) {
    this.onPlayerUpdate(null, dt, null);
  }

  onRenderHUD(ctx, x, y) {
    if (!this.enabled) return;
    ctx.font = '11px monospace';

    if (this.isActive) {
      ctx.fillStyle = COLOR.CYAN;
      ctx.fillText(
        `[SYS] ROOTKIT.sys :: KERNEL_PURGE [INVULN: ${this.durationTimer.toFixed(1)}s]`,
        x,
        y
      );
    } else if (this.cooldownTimer <= 0) {
      ctx.fillStyle = COLOR.RED;
      ctx.fillText(`[SYS] ROOTKIT.sys :: ARMED [PRESS F]`, x, y);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillText(`[SYS] ROOTKIT.sys :: RECHARGING [${Math.ceil(this.cooldownTimer)}s]`, x, y);
    }
  }
}
