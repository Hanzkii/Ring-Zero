/**
 * Ring Zero - Procedural Vector Icon Engine
 * Pure Canvas 2D vector drawing routines for crisp, scalable cyberpunk UI icons.
 * Zero external assets, zero heap allocations on 60Hz render ticks.
 */

import { COLOR } from '../core/Constants.js';

export class UIIcons {
  /**
   * 1. Heart / Shield: Stylized angled cyber-shield with diagnostic split / digital cross
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {number} [size=20] - Bounding box dimension
   * @param {string} [color=COLOR.GREEN]
   */
  static drawIntegrityIcon(ctx, x, y, size = 20, color = COLOR.GREEN) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(1.2, size * 0.08);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const r = size * 0.45;

    // Angled cyber-shield outer frame
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.9, -r * 0.65);
    ctx.lineTo(r * 0.85, r * 0.15);
    ctx.lineTo(0, r);
    ctx.lineTo(-r * 0.85, r * 0.15);
    ctx.lineTo(-r * 0.9, -r * 0.65);
    ctx.closePath();
    ctx.stroke();

    // Semi-transparent interior fill
    ctx.globalAlpha = 0.18;
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // Inner digital diagnostic cross / core pulse
    const crossSize = r * 0.45;
    ctx.beginPath();
    // Vertical line
    ctx.moveTo(0, -crossSize);
    ctx.lineTo(0, crossSize);
    // Horizontal line
    ctx.moveTo(-crossSize, 0);
    ctx.lineTo(crossSize, 0);
    ctx.stroke();

    // Center lock pip
    ctx.fillRect(-1.5, -1.5, 3, 3);

    ctx.restore();
  }

  /**
   * 2. Lightning / Thruster: Sharp dual-chevron or lightning bolt indicating capacitor charge
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   * @param {number} [size=20]
   * @param {string} [color=COLOR.CYAN]
   */
  static drawDashIcon(ctx, x, y, size = 20, color = COLOR.CYAN) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(1.2, size * 0.08);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'miter';

    const r = size * 0.48;

    // High-voltage lightning bolt vector
    ctx.beginPath();
    ctx.moveTo(r * 0.25, -r);
    ctx.lineTo(-r * 0.45, -r * 0.05);
    ctx.lineTo(r * 0.05, -r * 0.05);
    ctx.lineTo(-r * 0.3, r);
    ctx.lineTo(r * 0.5, 0.05);
    ctx.lineTo(0, 0.05);
    ctx.closePath();
    ctx.stroke();

    ctx.globalAlpha = 0.22;
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // Dual micro thruster chevrons beside the bolt
    const cW = r * 0.3;
    ctx.lineWidth = Math.max(1, size * 0.06);
    ctx.beginPath();
    ctx.moveTo(r * 0.65, -r * 0.4);
    ctx.lineTo(r * 0.65 + cW, -r * 0.1);
    ctx.lineTo(r * 0.65, r * 0.2);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * 3. Crosshair / Target: Circular reticle with 4 cardinal tick marks and center lock dot
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   * @param {number} [size=20]
   * @param {string} [color=COLOR.CYAN]
   */
  static drawAimbotIcon(ctx, x, y, size = 20, color = COLOR.CYAN) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(1.2, size * 0.07);
    ctx.lineCap = 'round';

    const r = size * 0.44;

    // Outer reticle circle
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2);
    ctx.stroke();

    // 4 Cardinal ticks extending beyond the circle
    const inner = r * 0.35;
    const outer = r;
    ctx.beginPath();
    // Top
    ctx.moveTo(0, -inner); ctx.lineTo(0, -outer);
    // Bottom
    ctx.moveTo(0, inner); ctx.lineTo(0, outer);
    // Left
    ctx.moveTo(-inner, 0); ctx.lineTo(-outer, 0);
    // Right
    ctx.moveTo(inner, 0); ctx.lineTo(outer, 0);
    ctx.stroke();

    // Center lock dot
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(1.5, size * 0.08), 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * 4. Ammo / Bullet Shell: Stacked angled kinetic cartridges or battery blocks
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   * @param {number} [size=20]
   * @param {string} [color=COLOR.AMBER]
   */
  static drawAmmoIcon(ctx, x, y, size = 20, color = COLOR.AMBER) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(1, size * 0.07);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const r = size * 0.44;

    // Two side-by-side vertical kinetic bullet rounds
    const offsets = [-r * 0.45, r * 0.15];
    const bulletW = r * 0.42;
    const bulletH = r * 1.5;

    for (const bx of offsets) {
      ctx.beginPath();
      // Bullet base rim
      ctx.moveTo(bx - bulletW * 0.5, r * 0.75);
      ctx.lineTo(bx + bulletW * 0.5, r * 0.75);
      // Right side
      ctx.lineTo(bx + bulletW * 0.5, -r * 0.2);
      // Ogive pointed tip
      ctx.lineTo(bx, -r * 0.85);
      // Left side
      ctx.lineTo(bx - bulletW * 0.5, -r * 0.2);
      ctx.closePath();
      ctx.stroke();

      ctx.globalAlpha = 0.25;
      ctx.fill();
      ctx.globalAlpha = 1.0;

      // Cartridge extraction groove
      ctx.beginPath();
      ctx.moveTo(bx - bulletW * 0.5, r * 0.45);
      ctx.lineTo(bx + bulletW * 0.5, r * 0.45);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * 5. Eye / Scanner: Wireframe cybernetic eye with corner sensor brackets
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   * @param {number} [size=20]
   * @param {string} [color=COLOR.CYAN]
   */
  static drawWallhackIcon(ctx, x, y, size = 20, color = COLOR.CYAN) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(1.2, size * 0.07);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const r = size * 0.45;

    // Cyber eye almond contour
    ctx.beginPath();
    ctx.moveTo(-r, 0);
    ctx.quadraticCurveTo(0, -r * 0.75, r, 0);
    ctx.quadraticCurveTo(0, r * 0.75, -r, 0);
    ctx.stroke();

    // Iris circle
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2);
    ctx.stroke();

    // Pupil sensor dot
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(1.5, size * 0.09), 0, Math.PI * 2);
    ctx.fill();

    // Corner sensor brackets
    const b = r * 0.88;
    const bl = r * 0.28;
    ctx.lineWidth = Math.max(1, size * 0.05);
    // Top-left
    ctx.beginPath();
    ctx.moveTo(-b, -b + bl); ctx.lineTo(-b, -b); ctx.lineTo(-b + bl, -b);
    // Top-right
    ctx.moveTo(b - bl, -b); ctx.lineTo(b, -b); ctx.lineTo(b, -b + bl);
    // Bottom-right
    ctx.moveTo(b, b - bl); ctx.lineTo(b, b); ctx.lineTo(b - bl, b);
    // Bottom-left
    ctx.moveTo(-b + bl, b); ctx.lineTo(-b, b); ctx.lineTo(-b, b - bl);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * 6. Hazard / Skull / Kernel: Ring 0 biohazard or microchip node glyph with glowing core traces
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   * @param {number} [size=20]
   * @param {string} [color=COLOR.RED]
   */
  static drawRootkitIcon(ctx, x, y, size = 20, color = COLOR.RED) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(1.2, size * 0.07);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const r = size * 0.44;

    // Central CPU core square
    const coreW = r * 0.8;
    ctx.strokeRect(-coreW * 0.5, -coreW * 0.5, coreW, coreW);

    ctx.globalAlpha = 0.2;
    ctx.fillRect(-coreW * 0.5, -coreW * 0.5, coreW, coreW);
    ctx.globalAlpha = 1.0;

    // Microchip contact pins (2 per side)
    const pinLen = r * 0.35;
    const pinOffset = coreW * 0.25;

    ctx.beginPath();
    // Top pins
    ctx.moveTo(-pinOffset, -coreW * 0.5); ctx.lineTo(-pinOffset, -coreW * 0.5 - pinLen);
    ctx.moveTo(pinOffset, -coreW * 0.5); ctx.lineTo(pinOffset, -coreW * 0.5 - pinLen);
    // Bottom pins
    ctx.moveTo(-pinOffset, coreW * 0.5); ctx.lineTo(-pinOffset, coreW * 0.5 + pinLen);
    ctx.moveTo(pinOffset, coreW * 0.5); ctx.lineTo(pinOffset, coreW * 0.5 + pinLen);
    // Left pins
    ctx.moveTo(-coreW * 0.5, -pinOffset); ctx.lineTo(-coreW * 0.5 - pinLen, -pinOffset);
    ctx.moveTo(-coreW * 0.5, pinOffset); ctx.lineTo(-coreW * 0.5 - pinLen, pinOffset);
    // Right pins
    ctx.moveTo(coreW * 0.5, -pinOffset); ctx.lineTo(coreW * 0.5 + pinLen, -pinOffset);
    ctx.moveTo(coreW * 0.5, pinOffset); ctx.lineTo(coreW * 0.5 + pinLen, pinOffset);
    ctx.stroke();

    // Center kernel danger cross/dot
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(2, size * 0.1), 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * 7. Rotation / Vortex: Segmented orbit ring with directional velocity arrows
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   * @param {number} [size=20]
   * @param {string} [color=COLOR.CYAN]
   */
  static drawSpinbotIcon(ctx, x, y, size = 20, color = COLOR.CYAN) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(1.2, size * 0.08);
    ctx.lineCap = 'round';

    const r = size * 0.44;

    // Two segmented orbit arcs
    // Arc 1: Top-right to Bottom-left
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.8, -Math.PI * 0.15, Math.PI * 0.65);
    ctx.stroke();

    // Arc 2: Bottom-left to Top-right
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.8, Math.PI * 0.85, Math.PI * 1.65);
    ctx.stroke();

    // Arrowhead 1 at end of Arc 1
    const a1x = Math.cos(Math.PI * 0.65) * r * 0.8;
    const a1y = Math.sin(Math.PI * 0.65) * r * 0.8;
    ctx.beginPath();
    ctx.moveTo(a1x - 3, a1y - 3);
    ctx.lineTo(a1x, a1y);
    ctx.lineTo(a1x + 3, a1y - 2);
    ctx.stroke();

    // Arrowhead 2 at end of Arc 2
    const a2x = Math.cos(Math.PI * 1.65) * r * 0.8;
    const a2y = Math.sin(Math.PI * 1.65) * r * 0.8;
    ctx.beginPath();
    ctx.moveTo(a2x + 3, a2y + 3);
    ctx.lineTo(a2x, a2y);
    ctx.lineTo(a2x - 3, a2y + 2);
    ctx.stroke();

    // Center pivot core
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(1.5, size * 0.08), 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Universal icon dispatcher by exploit/system ID
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} id
   * @param {number} x
   * @param {number} y
   * @param {number} [size=20]
   * @param {string} [color=COLOR.CYAN]
   */
  static drawIcon(ctx, id, x, y, size = 20, color = COLOR.CYAN) {
    const key = String(id || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    switch (key) {
      case 'integrity':
      case 'health':
      case 'shield':
        this.drawIntegrityIcon(ctx, x, y, size, color);
        break;
      case 'dash':
      case 'overclockdash':
      case 'thruster':
      case 'lightning':
        this.drawDashIcon(ctx, x, y, size, color);
        break;
      case 'aimbot':
      case 'silentaim':
      case 'triggerbot':
      case 'target':
        this.drawAimbotIcon(ctx, x, y, size, color);
        break;
      case 'ammo':
      case 'bullet':
      case 'infiniteammo':
        this.drawAmmoIcon(ctx, x, y, size, color);
        break;
      case 'wallhack':
      case 'esp':
      case 'scanner':
      case 'eye':
      case 'radartelemetry':
        this.drawWallhackIcon(ctx, x, y, size, color);
        break;
      case 'rootkit':
      case 'kernel':
      case 'hazard':
      case 'kernelpanic':
        this.drawRootkitIcon(ctx, x, y, size, color);
        break;
      case 'spinbot':
      case 'vortex':
      case 'rotation':
        this.drawSpinbotIcon(ctx, x, y, size, color);
        break;
      default:
        this.drawAimbotIcon(ctx, x, y, size, color);
        break;
    }
  }
}
