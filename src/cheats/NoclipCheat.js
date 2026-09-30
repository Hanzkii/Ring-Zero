/**
 * Ring Zero - Noclip Exploit (Ring 0 Kernel Execution)
 * Bypasses the collision arbiter, allowing the player to phase through static walls,
 * props, and obstacle perimeters with ethereal quantum trails.
 */

import { CheatInterceptor, CHEAT_REGISTRY } from './CheatDefinition.js';
import { COLOR } from '../core/Constants.js';

export class NoclipCheat extends CheatInterceptor {
  constructor() {
    super(CHEAT_REGISTRY.NOCLIP);
  }

  /**
   * Screen-space HUD badge
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   */
  onRenderHUD(ctx, x, y) {
    if (!this.enabled) return;
    ctx.font = '11px monospace';
    ctx.fillStyle = COLOR.RED;
    ctx.fillText(`[DRV] NOCLIP.drv :: RANK ${this.level}/3 [PHASING AUTHORIZED]`, x, y);
  }
}
