/**
 * Ring Zero - Kernel Panic Exploit (Ring 0 Kernel Execution)
 * Triggers catastrophic memory dumps: every 8th shot or upon taking direct damage,
 * erupts an omnidirectional ring of piercing critical laser pulses.
 */

import { CheatInterceptor, CHEAT_REGISTRY } from './CheatDefinition.js';
import { COLOR, COLLISION_LAYER } from '../core/Constants.js';

export class KernelPanicCheat extends CheatInterceptor {
  constructor() {
    super(CHEAT_REGISTRY.KERNELPANIC);
    this.shotCounter = 0;
  }

  reset() {
    this.shotCounter = 0;
  }

  teardown() {
    this.reset();
  }

  get shotsPerBurst() {
    // Rank 1: Every 10 shots
    // Rank 2: Every 7 shots
    // Rank 3: Every 5 shots
    return this.level === 1 ? 10 : this.level === 2 ? 7 : 5;
  }

  get pulseCount() {
    // Rank 1: 16 beams
    // Rank 2: 24 beams
    // Rank 3: 32 beams
    return 8 + this.level * 8;
  }

  onWeaponFire(bulletParams, context, spawnCallback) {
    spawnCallback(bulletParams);
    if (!this.enabled || !context || !context.player) return;

    this.shotCounter++;
    if (this.shotCounter >= this.shotsPerBurst) {
      this.shotCounter = 0;
      this.triggerKernelPanic(
        context.player,
        spawnCallback,
        context.projectilePool,
        context.camera,
        context.soundBank
      );
    }
  }

  /**
   * Spawns an omnidirectional ring of critical piercing laser beams and purges hostile projectiles
   * @param {import('../entities/Player.js').Player} player
   * @param {function(Object): void} spawnCallback
   * @param {import('../core/ObjectPool.js').ObjectPool} [projectilePool=null]
   * @param {import('../core/Camera2D.js').Camera2D} [camera=null]
   * @param {import('../audio/SoundBank.js').SoundBank} [soundBank=null]
   */
  triggerKernelPanic(player, spawnCallback, projectilePool = null, camera = null, soundBank = null) {
    const count = this.pulseCount;
    if (typeof spawnCallback === 'function') {
      for (let i = 0; i < count; i++) {
        const angle = (i * Math.PI * 2) / count;
        spawnCallback({
          x: player.x,
          y: player.y,
          vx: Math.cos(angle) * 1400,
          vy: Math.sin(angle) * 1400,
          rotation: angle,
          damage: 65,
          knockback: 180,
          pierce: 5,
          lifetime: 1.2,
          color: COLOR.RED,
          radius: 4,
          isCrit: true,
          canPierceWalls: true,
          layer: COLLISION_LAYER.PROJECTILE_PLAYER,
        });
      }
    }

    // Purge/recycle all hostile projectiles within active camera bounds
    if (projectilePool && typeof projectilePool.forEachActive === 'function') {
      projectilePool.forEachActive((p) => {
        if (p.layer === COLLISION_LAYER.PROJECTILE_ENEMY || p.owner === 'enemy' || p.isHostile) {
          if (camera) {
            const margin = 120;
            const halfW = (camera.viewportWidth || 1920) * 0.5 + margin;
            const halfH = (camera.viewportHeight || 1080) * 0.5 + margin;
            const cx = camera.pos ? camera.pos.x : (camera.x || player.x);
            const cy = camera.pos ? camera.pos.y : (camera.y || player.y);
            if (Math.abs(p.x - cx) <= halfW && Math.abs(p.y - cy) <= halfH) {
              p.markedForRemoval = true;
              p.active = false;
            }
          } else {
            p.markedForRemoval = true;
            p.active = false;
          }
        }
      });
    }

    // Screen flash & camera trauma
    if (camera) {
      camera.screenFlash = 1.0;
      if (typeof camera.addTrauma === 'function') {
        camera.addTrauma(0.65);
      }
    }

    // High-intensity glitch / explosion audio cue
    if (soundBank) {
      if (typeof soundBank.playKernelPanic === 'function') {
        soundBank.playKernelPanic();
      } else {
        soundBank.playGlitch?.();
        soundBank.playExplosion?.(true);
      }
    }
  }

  /**
   * Helper alias to trigger retaliation via context object
   * @param {Object} context
   */
  triggerRetaliation(context) {
    if (!context || !context.player) return;
    const spawnCb = context.spawnCallback || ((params) => {
      if (context.projectilePool) {
        const p = context.projectilePool.obtain();
        if (p) p.spawn(params);
      }
    });
    this.triggerKernelPanic(
      context.player,
      spawnCb,
      context.projectilePool,
      context.camera,
      context.soundBank
    );
  }

  onTakeDamage(incomingDamage, context) {
    // Trigger kernel panic retaliation upon taking damage
    if (this.enabled && context?.player) {
      const spawnCb = context.spawnCallback || ((params) => {
        if (context.projectilePool) {
          const p = context.projectilePool.obtain();
          if (p) p.spawn(params);
        }
      });
      this.triggerKernelPanic(
        context.player,
        spawnCb,
        context.projectilePool,
        context.camera,
        context.soundBank
      );
    }
    return { damage: incomingDamage, evaded: false };
  }

  onRenderHUD(ctx, x, y) {
    if (!this.enabled) return;
    ctx.font = '11px monospace';
    ctx.fillStyle = COLOR.RED;
    const remaining = this.shotsPerBurst - this.shotCounter;
    ctx.fillText(`[RIP] KERNEL_PANIC.rip :: RANK ${this.level}/3 [NEXT: ${remaining} SHOTS]`, x, y);
  }
}
