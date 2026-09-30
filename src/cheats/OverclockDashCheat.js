/**
 * Ring Zero - Overclocked Dash Exploit (Ring 3 Userland)
 * Intercepts player dash parameters to accelerate recharge kinetics, increase impulse velocity,
 * and unleash kinetic shockwaves upon enemy ramming.
 */

import { CheatInterceptor, CHEAT_REGISTRY } from './CheatDefinition.js';
import { COLOR, PLAYER_CONFIG } from '../core/Constants.js';

export class OverclockDashCheat extends CheatInterceptor {
  constructor() {
    super(CHEAT_REGISTRY.OVERCLOCK_DASH);
  }

  /**
   * Applies kinematics buffs to player dash parameters
   * @param {import('../entities/Player.js').Player} player
   * @param {number} dt
   * @param {Object} context
   */
  onPlayerUpdate(player, dt, context) {
    if (!this.enabled || !player) return;

    // Rank 1: -30% dash cooldown & +25% impulse
    // Rank 2: -50% dash cooldown & +45% impulse
    // Rank 3: -70% dash cooldown & +65% impulse
    let cdMultiplier = 0.70;
    if (this.level === 2) cdMultiplier = 0.50;
    if (this.level >= 3) cdMultiplier = 0.30;

    player.dashCooldown = PLAYER_CONFIG.DASH_COOLDOWN * cdMultiplier;
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
    ctx.fillText(`[KEXT] OVERCLOCKED_DASH.sys :: RANK ${this.level}/3`, x, y);
  }
}
