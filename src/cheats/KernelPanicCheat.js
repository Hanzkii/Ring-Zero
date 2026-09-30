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
      this.triggerKernelPanic(context.player, spawnCallback);
    }
  }

  /**
   * Spawns an omnidirectional ring of critical piercing laser beams
   * @param {import('../entities/Player.js').Player} player
   * @param {function(Object): void} spawnCallback
   */
  triggerKernelPanic(player, spawnCallback) {
    const count = this.pulseCount;
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

  onTakeDamage(incomingDamage, context) {
    // Also trigger kernel panic retaliation upon taking damage
    if (this.enabled && context?.player && context?.spawnCallback) {
      this.triggerKernelPanic(context.player, context.spawnCallback);
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
