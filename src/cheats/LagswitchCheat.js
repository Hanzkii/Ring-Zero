/**
 * Ring Zero - Lagswitch Exploit (Ring 0 Kernel Execution)
 * Injects a temporary socket freeze, suspending hostile security daemons and enemy projectiles
 * in frozen spacetime while leaving the player completely active.
 */

import { CheatInterceptor, CHEAT_REGISTRY } from './CheatDefinition.js';
import { COLOR } from '../core/Constants.js';

export class LagswitchCheat extends CheatInterceptor {
  constructor() {
    super(CHEAT_REGISTRY.LAGSWITCH);
    this.isActive = false;
    this.durationTimer = 0;
    this.cooldownTimer = 0;
    this.maxCooldown = 12.0;
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
    // Rank 1: 2.5s freeze
    // Rank 2: 4.0s freeze
    // Rank 3: 6.0s freeze
    return 1.0 + this.level * 1.5;
  }

  /**
   * Triggers lagswitch freeze if off cooldown
   * @returns {boolean} Whether freeze was activated
   */
  trigger() {
    if (this.cooldownTimer > 0 || this.isActive || !this.enabled) return false;
    this.isActive = true;
    this.durationTimer = this.maxDuration;
    this.cooldownTimer = this.maxCooldown;
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

  /**
   * Updates lagswitch timers directly
   * @param {number} dt
   */
  update(dt) {
    this.onPlayerUpdate(null, dt, null);
  }

  /**
   * Entity update gate: when active, hostiles skip movement & firing
   * @returns {boolean}
   */
  shouldFreezeHostiles() {
    return this.enabled && Boolean(this.isActive || this.active);
  }

  /**
   * Backward-compatible alias for world freeze check
   * @returns {boolean}
   */
  shouldFreezeWorld() {
    return this.shouldFreezeHostiles();
  }

  onRenderHUD(ctx, x, y) {
    if (!this.enabled) return;
    ctx.font = '11px monospace';

    if (this.isActive) {
      ctx.fillStyle = COLOR.RED;
      ctx.fillText(
        `[SYS] LAGSWITCH.sys :: FROZEN [${this.durationTimer.toFixed(1)}s REMAINING]`,
        x,
        y
      );
    } else if (this.cooldownTimer <= 0) {
      ctx.fillStyle = COLOR.GREEN;
      ctx.fillText(`[SYS] LAGSWITCH.sys :: ARMED [PRESS F]`, x, y);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillText(`[SYS] LAGSWITCH.sys :: RECHARGING [${Math.ceil(this.cooldownTimer)}s]`, x, y);
    }
  }
}
