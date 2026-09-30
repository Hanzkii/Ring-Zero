/**
 * Ring Zero - Drop Entities (Memory Fragment XP & Hardware Weapon Crates)
 * Vacuum magnet dynamics, vector crate rendering, and timed weapon despawning.
 */

import { Entity } from './Entity.js';
import { Vec2, lerp } from '../core/VectorMath.js';
import { COLOR, COLLISION_LAYER } from '../core/Constants.js';
import { VectorRenderer } from '../ui/VectorRenderer.js';

export const DROP_TYPE = {
  XP: 'XP',
  WEAPON: 'WEAPON',
  CRYPTO: 'CRYPTO',
};

export class Drop extends Entity {
  /**
   * @param {number} x
   * @param {number} y
   * @param {string} type
   * @param {Object} data - { xpValue, weapon, cryptoValue, lifetime }
   */
  constructor(x = 0, y = 0, type = DROP_TYPE.XP, data = {}) {
    super(x, y, type === DROP_TYPE.WEAPON ? 18 : 9, COLLISION_LAYER.DROP);

    this.type = type;
    this.data = data;

    this.xpValue = data.xpValue || 10;
    this.cryptoValue = data.cryptoValue || 15;
    this.weapon = data.weapon || null;

    // Despawn lifetime: Weapons stay on the ground for 18 seconds before expiring
    this.lifetime = data.lifetime !== undefined ? data.lifetime : 18.0;
    this.maxLifetime = this.lifetime;

    this.isMagnetized = false;
    this.magnetSpeed = 650;
    this.pulseTimer = Math.random() * Math.PI * 2;
  }

  /**
   * Updates drop position, bobbing pulse, magnetic pull toward player, and weapon despawn decay
   * @param {number} dt
   * @param {import('./Player.js').Player} player
   */
  update(dt, player) {
    this.preStep();
    this.pulseTimer += dt * 4;

    // Weapon drops decay and despawn over time
    if (this.type === DROP_TYPE.WEAPON) {
      this.lifetime -= dt;
      if (this.lifetime <= 0) {
        this.markedForRemoval = true;
        return;
      }
    }

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distSq = dx * dx + dy * dy;

    // Check magnet vacuum radius (player magnet radius: default 180px)
    const magnetRadius = player.magnetRadius || 180;
    if (this.type === DROP_TYPE.XP && distSq < magnetRadius * magnetRadius) {
      this.isMagnetized = true;
    }

    if (this.isMagnetized) {
      const dist = Math.sqrt(distSq);
      if (dist > 1) {
        const speed = this.magnetSpeed * (1 + (1 - dist / magnetRadius) * 1.5);
        this.vx = (dx / dist) * speed;
        this.vy = (dy / dist) * speed;
      }
    } else {
      // Natural friction
      this.vx *= Math.exp(-6.0 * dt);
      this.vy *= Math.exp(-6.0 * dt);
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  /**
   * Renders drop with crisp vector geometry, glowing pulse, and expiration warning
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} alpha
   */
  render(ctx, alpha = 1.0) {
    const rx = lerp(this.prevX, this.x, alpha);
    const ry = lerp(this.prevY, this.y, alpha);
    const pulse = Math.sin(this.pulseTimer);

    ctx.save();
    ctx.translate(rx, ry);

    if (this.type === DROP_TYPE.XP) {
      // Memory fragment: sharp 1px diamond with pulsating inner point
      const size = this.radius + pulse * 1.5;
      ctx.strokeStyle = COLOR.CYAN;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 0.7, 0);
      ctx.lineTo(0, size);
      ctx.lineTo(-size * 0.7, 0);
      ctx.closePath();
      ctx.stroke();

      ctx.fillStyle = COLOR.WHITE;
      ctx.fillRect(-1.5, -1.5, 3, 3);
    } else if (this.type === DROP_TYPE.WEAPON) {
      // If expiring in less than 4 seconds, blink visibility
      if (this.lifetime < 4.0 && Math.floor(this.lifetime * 8) % 2 === 0) {
        ctx.restore();
        return;
      }

      const isExpiring = this.lifetime < 5.0;
      const crateColor = isExpiring ? COLOR.RED : COLOR.AMBER;

      // Hardware weapon crate: wireframe telemetry crate with corner brackets
      const half = this.radius;
      ctx.strokeStyle = crateColor;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-half, -half, half * 2, half * 2);

      VectorRenderer.drawTargetBracket(ctx, 0, 0, half * 2.8, crateColor);

      // Inner weapon label badge
      ctx.font = '9px monospace';
      ctx.fillStyle = COLOR.WHITE;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.weapon?.name || 'WEAPON', 0, 0);

      // Despawn countdown label
      ctx.font = '8px monospace';
      ctx.fillStyle = crateColor;
      const timerText = isExpiring
        ? `[EXPIRES: ${Math.ceil(this.lifetime)}s]`
        : `[RESERVE] ${Math.ceil(this.lifetime)}s`;
      ctx.fillText(timerText, 0, half + 10);
    } else if (this.type === DROP_TYPE.CRYPTO) {
      // Golden crypto bounty: wireframe hexagon with pulsing central byte marker
      const r = this.radius + pulse * 1.2;
      ctx.strokeStyle = COLOR.AMBER;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const ang = (i * Math.PI) / 3;
        const hx = Math.cos(ang) * r;
        const hy = Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.stroke();

      // Central symbol
      ctx.font = '9px monospace';
      ctx.fillStyle = COLOR.WHITE;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('₿', 0, 0);
    }

    ctx.restore();
  }
}
