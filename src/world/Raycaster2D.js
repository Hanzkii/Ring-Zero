/**
 * Ring Zero - 2D Dynamic Raycasting & Fog of War
 * Computes exact 2D visibility polygons from player coordinates to static wall endpoints.
 * Provides line-of-sight queries, fog-of-war masking, and smoke volume attenuation.
 */

import { COLOR } from '../core/Constants.js';

export class Raycaster2D {
  /**
   * @param {number} [maxDistance=950] - View distance in pixels
   */
  constructor(maxDistance = 950) {
    this.maxDistance = maxDistance;

    // Preallocated internal arrays to avoid GC
    this._uniqueAngles = [];
    this._candidateSegments = [];
    this._visibilityPoly = []; // Array of {x, y, angle}
  }

  /**
   * Checks if line of sight between (x1, y1) and (x2, y2) is unblocked by any segment
   * @param {number} x1
   * @param {number} y1
   * @param {number} x2
   * @param {number} y2
   * @param {import('./MapGenerator.js').WallSegment[]} segments
   * @returns {boolean} True if unblocked line-of-sight
   */
  hasLineOfSight(x1, y1, x2, y2, segments) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.001) return true;

    const dirX = dx / dist;
    const dirY = dy / dist;

    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      // Fast AABB check
      if (
        Math.max(seg.x1, seg.x2) < minX ||
        Math.min(seg.x1, seg.x2) > maxX ||
        Math.max(seg.y1, seg.y2) < minY ||
        Math.min(seg.y1, seg.y2) > maxY
      ) {
        continue;
      }

      // Check intersection
      const vx = seg.x2 - seg.x1;
      const vy = seg.y2 - seg.y1;
      const cross = dirX * vy - dirY * vx;
      if (Math.abs(cross) < 1e-8) continue;

      const delX = seg.x1 - x1;
      const delY = seg.y1 - y1;
      const t = (delX * vy - delY * vx) / cross;
      const u = (delX * dirY - delY * dirX) / cross;

      if (t > 0.001 && t < dist - 0.001 && u >= 0 && u <= 1) {
        return false; // Occluded by wall
      }
    }

    return true;
  }

  /**
   * Computes the 2D visibility polygon around (px, py)
   * @param {number} px
   * @param {number} py
   * @param {import('./MapGenerator.js').WallSegment[]} allSegments
   * @returns {Array<{x: number, y: number, angle: number}>} Ordered polygon vertices
   */
  computeVisibilityPolygon(px, py, allSegments) {
    const R = this.maxDistance;
    const boxMinX = px - R;
    const boxMaxX = px + R;
    const boxMinY = py - R;
    const boxMaxY = py + R;

    // 1. Filter segments within bounding box
    const candidates = this._candidateSegments;
    candidates.length = 0;

    for (let i = 0; i < allSegments.length; i++) {
      const seg = allSegments[i];
      const sMinX = Math.min(seg.x1, seg.x2);
      const sMaxX = Math.max(seg.x1, seg.x2);
      const sMinY = Math.min(seg.y1, seg.y2);
      const sMaxY = Math.max(seg.y1, seg.y2);

      if (sMaxX >= boxMinX && sMinX <= boxMaxX && sMaxY >= boxMinY && sMinY <= boxMaxY) {
        candidates.push(seg);
      }
    }

    // 2. Collect unique ray angles from segment endpoints + uniform radial baseline
    const angles = this._uniqueAngles;
    angles.length = 0;

    // Baseline uniform circle rays (64 rays for a smooth circular perimeter)
    const baseRays = 64;
    for (let i = 0; i < baseRays; i++) {
      angles.push((i / baseRays) * Math.PI * 2 - Math.PI);
    }

    // Cast 3 rays at each candidate segment endpoint: theta - eps, theta, theta + eps
    const eps = 0.0001;
    for (let i = 0; i < candidates.length; i++) {
      const seg = candidates[i];
      const a1 = Math.atan2(seg.y1 - py, seg.x1 - px);
      const a2 = Math.atan2(seg.y2 - py, seg.x2 - px);

      angles.push(a1 - eps, a1, a1 + eps);
      angles.push(a2 - eps, a2, a2 + eps);
    }

    // 3. For each angle, cast ray and find minimum intersection distance
    const poly = this._visibilityPoly;
    poly.length = 0;

    for (let i = 0; i < angles.length; i++) {
      let angle = angles[i];
      // Normalize angle to (-Math.PI, Math.PI]
      while (angle <= -Math.PI) angle += Math.PI * 2;
      while (angle > Math.PI) angle -= Math.PI * 2;

      const dirX = Math.cos(angle);
      const dirY = Math.sin(angle);

      let minT = R;
      let hitX = px + dirX * R;
      let hitY = py + dirY * R;

      for (let j = 0; j < candidates.length; j++) {
        const seg = candidates[j];
        const vx = seg.x2 - seg.x1;
        const vy = seg.y2 - seg.y1;
        const cross = dirX * vy - dirY * vx;

        if (Math.abs(cross) < 1e-8) continue;

        const delX = seg.x1 - px;
        const delY = seg.y1 - py;
        const t = (delX * vy - delY * vx) / cross;
        const u = (delX * dirY - delY * dirX) / cross;

        if (t > 0.001 && t < minT && u >= 0 && u <= 1) {
          minT = t;
          hitX = px + dirX * t;
          hitY = py + dirY * t;
        }
      }

      poly.push({ x: hitX, y: hitY, angle });
    }

    // 4. Sort visibility polygon vertices angularly
    poly.sort((a, b) => a.angle - b.angle);

    return poly;
  }

  /**
   * Renders the dynamic fog-of-war mask over the camera viewport
   * Uses standard evenodd fill to leave the visible line-of-sight polygon 100% clear and unoccluded,
   * while covering occluded shadows and distant areas with dark atmospheric fog.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} px - Player X
   * @param {number} py - Player Y
   * @param {Array<{x: number, y: number}>} poly - Ordered visibility polygon
   * @param {import('../core/Camera2D.js').Camera2D} camera
   * @param {boolean} [wallhackActive=false] - When true, fog density is lightened to military night-vision
   */
  renderFogOfWar(ctx, px, py, poly, camera, wallhackActive = false) {
    if (!poly || poly.length < 3) return;

    ctx.save();

    // Viewport dimensions in world coordinates (with robust fallbacks to player coords)
    const camX = camera && camera.pos ? camera.pos.x : (camera && typeof camera.x === 'number' ? camera.x : px);
    const camY = camera && camera.pos ? camera.pos.y : (camera && typeof camera.y === 'number' ? camera.y : py);

    // Expand outer bounding box well beyond viewport (3500px radius) to cover the entire arena
    const boxRadius = 3500;
    const left = camX - boxRadius;
    const right = camX + boxRadius;
    const top = camY - boxRadius;
    const bottom = camY + boxRadius;

    // Begin combined path for evenodd fill
    ctx.beginPath();

    // 1. Outer viewport boundary rectangle (covers whole screen and arena)
    ctx.moveTo(left, top);
    ctx.lineTo(right, top);
    ctx.lineTo(right, bottom);
    ctx.lineTo(left, bottom);
    ctx.closePath();

    // 2. Inner visibility polygon (the line-of-sight area around the player that remains clear)
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) {
      ctx.lineTo(poly[i].x, poly[i].y);
    }
    ctx.closePath();

    // 3. Fill only the occluded regions outside the polygon using evenodd
    ctx.fillStyle = wallhackActive ? 'rgba(7, 10, 15, 0.55)' : 'rgba(7, 10, 15, 0.95)';
    ctx.fill('evenodd');

    // 4. Draw razor-sharp vector boundary along the visibility polygon perimeter
    ctx.strokeStyle = wallhackActive ? COLOR.CYAN_DIM : 'rgba(0, 240, 255, 0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) {
      ctx.lineTo(poly[i].x, poly[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Renders dynamic smoke volumes that obscure visibility
   * @param {CanvasRenderingContext2D} ctx
   * @param {Array<{x: number, y: number, radius: number}>} smokeVents
   * @param {number} time
   */
  renderSmokePlumes(ctx, smokeVents, time) {
    if (!smokeVents || smokeVents.length === 0) return;

    ctx.save();
    for (let i = 0; i < smokeVents.length; i++) {
      const vent = smokeVents[i];
      const pulse = Math.sin(time * 2 + i) * 8;
      const r = vent.radius + pulse;

      const grad = ctx.createRadialGradient(vent.x, vent.y, r * 0.1, vent.x, vent.y, r);
      grad.addColorStop(0, 'rgba(0, 240, 255, 0.14)');
      grad.addColorStop(0.5, 'rgba(12, 22, 34, 0.28)');
      grad.addColorStop(1, 'rgba(7, 10, 15, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(vent.x, vent.y, r, 0, Math.PI * 2);
      ctx.fill();

      // Delicate wireframe rings inside smoke
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(vent.x, vent.y, r * 0.6, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}
