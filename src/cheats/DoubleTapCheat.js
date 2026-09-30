/**
 * Ring Zero - DoubleTap.pkg (Driver Space / Ring 2)
 * Projectile multiplexing via packet choke emulation, bursting duplicate rounds at zero ammo cost.
 */

import { CheatInterceptor, CHEAT_REGISTRY } from './CheatDefinition.js';
import { COLOR } from '../core/Constants.js';
import { randomRange } from '../core/VectorMath.js';

export class DoubleTapCheat extends CheatInterceptor {
  constructor() {
    super(CHEAT_REGISTRY.DOUBLETAP);
    this.totalMultiplexedBullets = 0;
  }

  /**
   * Clones and multiplexes fired projectiles
   * @param {Object} bulletParams
   * @param {Object} context
   * @param {function(Object): void} spawnCallback
   */
  onWeaponFire(bulletParams, context, spawnCallback) {
    // 1. Always spawn the initial primary bullet
    spawnCallback(bulletParams);

    // 2. Multiplex duplicate rounds based on rank (+1 at Lv 1, +2 at Lv 2, +3 at Lv 3)
    const extraRounds = this.level;

    for (let i = 0; i < extraRounds; i++) {
      const spreadJitter = randomRange(-0.025, 0.025); // Subtle packet jitter
      const speedJitter = randomRange(0.96, 1.04);

      const cloneParams = {
        ...bulletParams,
        angle: bulletParams.angle + spreadJitter,
        speed: bulletParams.speed * speedJitter,
        color: COLOR.AMBER, // Multiplexed packets glow amber
        isCritical: bulletParams.isCritical,
      };

      spawnCallback(cloneParams);
      this.totalMultiplexedBullets++;
    }
  }

  onRenderHUD(ctx, x, y) {
    ctx.save();
    ctx.font = '10px monospace';
    ctx.fillStyle = COLOR.AMBER;
    ctx.fillText(
      `[DOUBLETAP.PKG Lv.${this.level}] MULTIPLEX_${this.level + 1}x (+${this.totalMultiplexedBullets} PKTS)`,
      x,
      y
    );
    ctx.restore();
  }
}
