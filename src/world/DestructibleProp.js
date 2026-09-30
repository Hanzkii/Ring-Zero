/**
 * Ring Zero - Destructible World Props
 * Destructible server racks, memory buffers, and explosive cooling units with vector aesthetics.
 */

import { Entity } from '../entities/Entity.js';
import { COLOR, COLLISION_LAYER } from '../core/Constants.js';
import { VectorRenderer } from '../ui/VectorRenderer.js';
import { Drop, DROP_TYPE } from '../entities/Drop.js';

export const PROP_TYPE = {
  SERVER_RACK: 'SERVER_RACK',
  EXPLOSIVE_CELL: 'EXPLOSIVE_CELL',
};

export class DestructibleProp extends Entity {
  /**
   * @param {number} x
   * @param {number} y
   * @param {string} [propType=PROP_TYPE.SERVER_RACK]
   */
  constructor(x, y, propType = PROP_TYPE.SERVER_RACK) {
    super(x, y, propType === PROP_TYPE.SERVER_RACK ? 20 : 16, COLLISION_LAYER.PROP);

    this.propType = propType;
    this.maxHealth = propType === PROP_TYPE.SERVER_RACK ? 80 : 35;
    this.health = this.maxHealth;

    this.width = propType === PROP_TYPE.SERVER_RACK ? 36 : 28;
    this.height = propType === PROP_TYPE.SERVER_RACK ? 36 : 28;

    this.halfW = this.width * 0.5;
    this.halfH = this.height * 0.5;

    this.minX = x - this.halfW;
    this.minY = y - this.halfH;
    this.maxX = x + this.halfW;
    this.maxY = y + this.halfH;

    this.color = propType === PROP_TYPE.SERVER_RACK ? COLOR.CYAN : COLOR.RED;
    this.hitFlashTimer = 0;
  }

  takeDamage(amount) {
    this.health -= amount;
    this.hitFlashTimer = 0.08;

    if (this.health <= 0) {
      this.markedForRemoval = true;
      return true;
    }
    return false;
  }

  update(dt) {
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);
    }
  }

  /**
   * Drops loot or triggers AoE explosion on purge
   * @returns {Drop[]}
   */
  generateDrops() {
    const drops = [];
    if (this.propType === PROP_TYPE.SERVER_RACK) {
      // Server racks drop 1-2 memory fragment XP gems
      drops.push(new Drop(this.x, this.y, DROP_TYPE.XP, { xpValue: 20 }));
    }
    return drops;
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const wireColor = this.hitFlashTimer > 0 ? COLOR.WHITE : this.color;
    ctx.strokeStyle = wireColor;
    ctx.lineWidth = 1.5;

    const hw = this.halfW;
    const hh = this.halfH;

    if (this.propType === PROP_TYPE.SERVER_RACK) {
      // Outer server cabinet
      ctx.strokeRect(-hw, -hh, this.width, this.height);

      // Server tray drive slots
      ctx.strokeStyle = COLOR.CYAN_MUTED;
      ctx.lineWidth = 1;
      const trays = 3;
      const step = this.height / (trays + 1);
      for (let i = 1; i <= trays; i++) {
        const ty = -hh + i * step;
        ctx.beginPath();
        ctx.moveTo(-hw + 4, ty);
        ctx.lineTo(hw - 4, ty);
        ctx.stroke();

        // Memory activity LED
        ctx.fillStyle = COLOR.GREEN;
        ctx.fillRect(-hw + 6, ty - 2, 2, 2);
      }

      VectorRenderer.drawTargetBracket(ctx, 0, 0, this.width + 6, COLOR.CYAN_DIM, 4);
    } else {
      // Explosive cooling unit: octagonal hazard container with radiation hazard mark
      ctx.beginPath();
      const cut = 6;
      ctx.moveTo(-hw + cut, -hh);
      ctx.lineTo(hw - cut, -hh);
      ctx.lineTo(hw, -hh + cut);
      ctx.lineTo(hw, hh - cut);
      ctx.lineTo(hw - cut, hh);
      ctx.lineTo(-hw + cut, hh);
      ctx.lineTo(-hw, hh - cut);
      ctx.lineTo(-hw, -hh + cut);
      ctx.closePath();
      ctx.stroke();

      // Warning cross
      ctx.strokeStyle = COLOR.RED;
      ctx.beginPath();
      ctx.moveTo(-4, -4);
      ctx.lineTo(4, 4);
      ctx.moveTo(4, -4);
      ctx.lineTo(-4, 4);
      ctx.stroke();
    }

    // Health bar if damaged
    if (this.health < this.maxHealth) {
      const barW = this.width;
      const barH = 3;
      const pct = Math.max(0, this.health / this.maxHealth);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(-hw, -hh - 8, barW, barH);
      ctx.fillStyle = this.color;
      ctx.fillRect(-hw, -hh - 8, barW * pct, barH);
    }

    ctx.restore();
  }
}
