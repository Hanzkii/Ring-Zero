/**
 * Ring Zero - Speedhack Exploit (Ring 3 Userland)
 * Overclocks player chassis bus clock rate to amplify base movement velocity.
 */

import { CheatInterceptor, CHEAT_REGISTRY } from './CheatDefinition.js';
import { COLOR, PLAYER_CONFIG } from '../core/Constants.js';

export class SpeedhackCheat extends CheatInterceptor {
  constructor() {
    super(CHEAT_REGISTRY.SPEEDHACK);
  }

  /**
   * Overclocks player maximum velocity
   * @param {import('../entities/Player.js').Player} player
   * @param {number} dt
   * @param {Object} context
   */
  onPlayerUpdate(player, dt, context) {
    if (!this.enabled || !player) return;

    // Rank 1: +25% speed
    // Rank 2: +45% speed
    // Rank 3: +70% speed
    let speedMult = 1.25;
    if (this.level === 2) speedMult = 1.45;
    if (this.level >= 3) speedMult = 1.70;

    const baseSpeed = player.baseMaxSpeed || PLAYER_CONFIG.MAX_SPEED;
    player.maxSpeed = baseSpeed * speedMult;
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
    ctx.fillStyle = COLOR.CYAN;
    ctx.fillText(`[EXE] SPEEDHACK.exe :: RANK ${this.level}/3`, x, y);
  }
}
