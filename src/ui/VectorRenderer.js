/**
 * Ring Zero - Minimalist Vector Renderer
 * Zero-dependency 2D Canvas vector graphics utilities for wireframes and HUD telemetry.
 */

import { COLOR } from '../core/Constants.js';

export class VectorRenderer {
  /**
   * Draws a crisp vector line
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x1
   * @param {number} y1
   * @param {number} x2
   * @param {number} y2
   * @param {string} color
   * @param {number} [lineWidth=1]
   */
  static strokeLine(ctx, x1, y1, x2, y2, color = COLOR.CYAN, lineWidth = 1) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  /**
   * Draws a vector circle outline
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   * @param {number} radius
   * @param {string} color
   * @param {number} [lineWidth=1]
   */
  static strokeCircle(ctx, x, y, radius, color = COLOR.CYAN, lineWidth = 1) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  /**
   * Draws a closed or open vector polygon from an array of [x, y] points
   * @param {CanvasRenderingContext2D} ctx
   * @param {Array<[number, number]>} points
   * @param {string} color
   * @param {number} [lineWidth=1]
   * @param {boolean} [closed=true]
   */
  static strokePoly(ctx, points, color = COLOR.CYAN, lineWidth = 1, closed = true) {
    if (points.length < 2) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    if (closed) ctx.closePath();
    ctx.stroke();
  }

  /**
   * Draws military-spec targeting brackets around a coordinate
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   * @param {number} size
   * @param {string} color
   * @param {number} [armLength=6]
   */
  static drawTargetBracket(ctx, x, y, size = 18, color = COLOR.CYAN, armLength = 5) {
    const half = size * 0.5;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();

    // Top-Left
    ctx.moveTo(x - half, y - half + armLength);
    ctx.lineTo(x - half, y - half);
    ctx.lineTo(x - half + armLength, y - half);

    // Top-Right
    ctx.moveTo(x + half - armLength, y - half);
    ctx.lineTo(x + half, y - half);
    ctx.lineTo(x + half, y - half + armLength);

    // Bottom-Right
    ctx.moveTo(x + half, y + half - armLength);
    ctx.lineTo(x + half, y + half);
    ctx.lineTo(x + half - armLength, y + half);

    // Bottom-Left
    ctx.moveTo(x - half + armLength, y + half);
    ctx.lineTo(x - half, y + half);
    ctx.lineTo(x - half, y + half - armLength);

    ctx.stroke();
  }

  /**
   * Draws a telemetry combat crosshair with spread indicators
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   * @param {number} [spread=0] - Spread gap in pixels
   * @param {string} [color=COLOR.CYAN]
   */
  static drawCrosshair(ctx, x, y, spread = 0, color = COLOR.CYAN) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;

    const baseGap = 4 + spread;
    const len = 7;

    ctx.beginPath();
    // Center dot
    ctx.rect(x - 0.5, y - 0.5, 1, 1);

    // Cardinal tick marks
    ctx.moveTo(x - baseGap - len, y);
    ctx.lineTo(x - baseGap, y);

    ctx.moveTo(x + baseGap, y);
    ctx.lineTo(x + baseGap + len, y);

    ctx.moveTo(x, y - baseGap - len);
    ctx.lineTo(x, y - baseGap);

    ctx.moveTo(x, y + baseGap);
    ctx.lineTo(x, y + baseGap + len);

    ctx.stroke();
    ctx.restore();
  }

  /**
   * Draws a minimal vector HUD bar (e.g. Health, Dash, Ammo)
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   * @param {number} percent - In [0, 1]
   * @param {string} color
   * @param {string} [label='']
   */
  static drawVectorBar(ctx, x, y, width, height, percent, color = COLOR.CYAN, label = '') {
    ctx.save();
    ctx.lineWidth = 1;

    // Frame
    ctx.strokeStyle = COLOR.CYAN_DIM;
    ctx.strokeRect(x, y, width, height);

    // Fill segments
    const clampedPct = Math.max(0, Math.min(1, percent));
    const fillWidth = (width - 4) * clampedPct;
    if (fillWidth > 0) {
      ctx.fillStyle = color;
      ctx.fillRect(x + 2, y + 2, fillWidth, height - 4);
    }

    // Label
    if (label) {
      ctx.font = '10px monospace';
      ctx.fillStyle = COLOR.WHITE;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(label, x, y - 3);
    }

    ctx.restore();
  }

  /**
   * Draws the infinite background coordinate grid with major/minor lines
   * @param {CanvasRenderingContext2D} ctx
   * @param {{minX: number, minY: number, maxX: number, maxY: number}} bounds
   * @param {number} [minorStep=64]
   * @param {number} [majorMultiplier=4]
   * @param {string} [gridMinor=COLOR.GRID_MINOR]
   * @param {string} [gridMajor=COLOR.GRID_MAJOR]
   * @param {string} [crosshairColor=COLOR.CYAN_DIM]
   */
  static drawWorldGrid(ctx, bounds, minorStep = 64, majorMultiplier = 4, gridMinor = COLOR.GRID_MINOR, gridMajor = COLOR.GRID_MAJOR, crosshairColor = COLOR.CYAN_DIM) {
    const majorStep = minorStep * majorMultiplier;

    const startX = Math.floor(bounds.minX / minorStep) * minorStep;
    const endX = Math.ceil(bounds.maxX / minorStep) * minorStep;
    const startY = Math.floor(bounds.minY / minorStep) * minorStep;
    const endY = Math.ceil(bounds.maxY / minorStep) * minorStep;

    ctx.save();
    ctx.lineWidth = 1;

    // Minor lines
    ctx.strokeStyle = gridMinor;
    ctx.beginPath();
    for (let x = startX; x <= endX; x += minorStep) {
      if (x % majorStep !== 0) {
        ctx.moveTo(x, bounds.minY);
        ctx.lineTo(x, bounds.maxY);
      }
    }
    for (let y = startY; y <= endY; y += minorStep) {
      if (y % majorStep !== 0) {
        ctx.moveTo(bounds.minX, y);
        ctx.lineTo(bounds.maxX, y);
      }
    }
    ctx.stroke();

    // Major lines
    ctx.strokeStyle = gridMajor;
    ctx.beginPath();
    for (let x = startX; x <= endX; x += minorStep) {
      if (x % majorStep === 0) {
        ctx.moveTo(x, bounds.minY);
        ctx.lineTo(x, bounds.maxY);
      }
    }
    for (let y = startY; y <= endY; y += minorStep) {
      if (y % majorStep === 0) {
        ctx.moveTo(bounds.minX, y);
        ctx.lineTo(bounds.maxX, y);
      }
    }
    ctx.stroke();

    // Coordinate crosshairs at major intersections
    ctx.strokeStyle = crosshairColor;
    const crossSize = 4;
    ctx.beginPath();
    for (let x = startX; x <= endX; x += majorStep) {
      for (let y = startY; y <= endY; y += majorStep) {
        ctx.moveTo(x - crossSize, y);
        ctx.lineTo(x + crossSize, y);
        ctx.moveTo(x, y - crossSize);
        ctx.lineTo(x, y + crossSize);
      }
    }
    ctx.stroke();

    ctx.restore();
  }
}
