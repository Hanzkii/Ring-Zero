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
    this.shockwaves = [];
  }

  reset() {
    this.shotCounter = 0;
    this.shockwaves.length = 0;
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

    // Expanding vector shockwave FX
    this.shockwaves.push({
      x: player.x,
      y: player.y,
      radius: 10,
      maxRadius: 360,
      life: 0,
      maxLife: 0.45,
    });

    // Screen flash property (maintained for telemetry/checks) & camera trauma
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

  /**
   * Renders expanding world-space vector shockwave rings without screen flash
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} alpha
   * @param {Object} context
   */
  onRenderWorld(ctx, alpha, context) {
    if (!this.enabled || this.shockwaves.length === 0) return;
    const dt = context?.dt || 0.016;

    ctx.save();
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life += dt;
      const progress = sw.life / sw.maxLife;
      if (progress >= 1.0) {
        this.shockwaves.splice(i, 1);
        continue;
      }

      const r = sw.radius + (sw.maxRadius - sw.radius) * progress;
      const ringAlpha = (1.0 - progress) * 0.85;

      ctx.lineWidth = 3 * (1.0 - progress);
      ctx.strokeStyle = `rgba(255, 0, 85, ${ringAlpha})`;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = `rgba(255, 255, 255, ${ringAlpha * 0.7})`;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, r * 0.75, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  onRenderHUD(ctx, x, y) {
    if (!this.enabled) return;
    ctx.font = '11px monospace';
    ctx.fillStyle = COLOR.RED;
    const remaining = this.shotsPerBurst - this.shotCounter;
    ctx.fillText(`[RIP] KERNEL_PANIC.rip :: RANK ${this.level}/3 [NEXT: ${remaining} SHOTS]`, x, y);
  }
}
