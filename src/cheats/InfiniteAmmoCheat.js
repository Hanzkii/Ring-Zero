/**
 * Ring Zero - InfiniteAmmo.sys (Kernel Execution / Ring 0)
 * Hardware DMA override locking weapon magazines: infinite ammunition with zero reload delays.
 * Respects natural weapon fire rates while scaling rate-of-fire with rank.
 */

import { CheatInterceptor, CHEAT_REGISTRY } from './CheatDefinition.js';
import { COLOR } from '../core/Constants.js';

export class InfiniteAmmoCheat extends CheatInterceptor {
  constructor() {
    super(CHEAT_REGISTRY.INFINITEAMMO);
  }

  reset() {}

  teardown() {}

  /**
   * Fire rate multiplier granted by Infinite Ammo overclock
   * Rank 1: 1.0x (standard fire rate)
   * Rank 2: 1.15x (+15% faster fire rate)
   * Rank 3: 1.30x (+30% faster fire rate)
   * @returns {number}
   */
  get fireRateMultiplier() {
    if (this.level === 3) return 1.30;
    if (this.level === 2) return 1.15;
    return 1.0;
  }

  getHUDTelemetry() {
    return `DMA_LOCK: LOCKED [AMMO: INF] (Lv.${this.level})`;
  }

  onRenderHUD(ctx, x, y) {
    if (!this.enabled) return;
    ctx.save();
    ctx.font = '10px monospace';
    ctx.fillStyle = COLOR.RED;
    ctx.fillText(
      `[SYS] INFINITE_AMMO.sys Lv.${this.level} :: DMA_LOCK [AMMO: INF]`,
      x,
      y
    );
    ctx.restore();
  }
}
