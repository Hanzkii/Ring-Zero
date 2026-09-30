/**
 * Ring Zero - Wallhack.lua (ESP - Userland / Ring 3)
 * Full-arena wireframe telemetry overlay rendering bounding boxes, distance, and health markers.
 */

import { CheatInterceptor, CHEAT_REGISTRY } from './CheatDefinition.js';
import { COLOR } from '../core/Constants.js';
import { VectorRenderer } from '../ui/VectorRenderer.js';

export class WallhackCheat extends CheatInterceptor {
  constructor() {
    super(CHEAT_REGISTRY.WALLHACK);
  }

  /**
   * At Level 3, grants all fired bullets extra piercing
   * @param {Object} bulletParams
   * @param {Object} context
   * @param {function(Object): void} spawnCallback
   */
  onWeaponFire(bulletParams, context, spawnCallback) {
    if (this.level >= 2) {
      bulletParams.pierce += this.level - 1; // +1 pierce at Lv 2, +2 pierce at Lv 3
    }
    spawnCallback(bulletParams);
  }

  /**
   * Renders military-spec ESP overlays around all security daemons
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} alpha
   * @param {Object} context - { player, enemies, camera }
   */
  onRenderWorld(ctx, alpha, context) {
    const { player, enemies, camera } = context;
    if (!player || !enemies) return;

    ctx.save();

    for (const enemy of enemies) {
      if (!enemy.active || enemy.markedForRemoval) continue;

      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const dist = Math.round(Math.sqrt(dx * dx + dy * dy));

      const boxSize = enemy.radius * 2.4;
      const half = boxSize * 0.5;

      // Color coding by threat level
      let espColor = COLOR.CYAN;
      if (this.level >= 2) {
        if (enemy.type === 'SENTINEL' || enemy.type === 'MEMORY_LEAK') {
          espColor = COLOR.RED;
        } else if (enemy.type === 'WATCHDOG') {
          espColor = COLOR.AMBER;
        }
      }

      // 1. ESP wireframe bounding box
      ctx.strokeStyle = espColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(enemy.x - half, enemy.y - half, boxSize, boxSize);

      // Corner target brackets
      VectorRenderer.drawTargetBracket(ctx, enemy.x, enemy.y, boxSize + 6, espColor, 4);

      // 2. Health meter along left edge of ESP box
      const hpPct = Math.max(0, enemy.health / enemy.maxHealth);
      const barH = boxSize * hpPct;
      ctx.fillStyle = enemy.health < enemy.maxHealth * 0.4 ? COLOR.RED : COLOR.GREEN;
      ctx.fillRect(enemy.x - half - 4, enemy.y + half - barH, 2, barH);

      // 3. Telemetry labels: Type & Distance in pixels
      ctx.font = '8px monospace';
      ctx.fillStyle = espColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${enemy.name}`, enemy.x, enemy.y - half - 2);

      ctx.fillStyle = COLOR.WHITE_DIM;
      ctx.textBaseline = 'top';
      ctx.fillText(`${dist}px`, enemy.x, enemy.y + half + 3);

      // Level 3: Draw subtle telemetry snapline to distant high-threat targets (> 400px)
      if (this.level >= 3 && dist > 350 && (enemy.type === 'SENTINEL' || enemy.type === 'MEMORY_LEAK')) {
        VectorRenderer.strokeLine(ctx, player.x, player.y, enemy.x, enemy.y, COLOR.CYAN_MUTED, 1);
      }
    }

    ctx.restore();
  }

  onRenderHUD(ctx, x, y) {
    ctx.save();
    ctx.font = '10px monospace';
    ctx.fillStyle = COLOR.CYAN;
    ctx.fillText(`[WALLHACK.LUA Lv.${this.level}] ACTIVE_ESP`, x, y);
    ctx.restore();
  }
}
