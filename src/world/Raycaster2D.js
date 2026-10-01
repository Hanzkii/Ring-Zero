/**
 * Ring Zero - 2D Dynamic Raycasting & Fog of War
 * Computes exact 2D visibility polygons from player coordinates to static wall endpoints.
 * Provides line-of-sight queries, fog-of-war masking, and smoke volume attenuation.
 */

import { COLOR } from '../core/Constants.js';
import { angleDiff } from '../core/VectorMath.js';

export class Raycaster2D {
  /**
   * @param {number} [maxDistance=1050] - View distance in pixels
   */
  constructor(maxDistance = 1050) {
    this.maxDistance = maxDistance;

    // Vision cone configuration
    this.fovHalfAngle = (58 * Math.PI) / 180; // 116° forward cone
    this.nearRadius = 85;                     // 360° close awareness radius around player

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
      const sx1 = seg.x1 !== undefined ? seg.x1 : (seg.p1 ? seg.p1.x : 0);
      const sy1 = seg.y1 !== undefined ? seg.y1 : (seg.p1 ? seg.p1.y : 0);
      const sx2 = seg.x2 !== undefined ? seg.x2 : (seg.p2 ? seg.p2.x : 0);
      const sy2 = seg.y2 !== undefined ? seg.y2 : (seg.p2 ? seg.p2.y : 0);

      // Fast AABB check
      if (
        Math.max(sx1, sx2) < minX ||
        Math.min(sx1, sx2) > maxX ||
        Math.max(sy1, sy2) < minY ||
        Math.min(sy1, sy2) > maxY
      ) {
        continue;
      }

      // Check intersection
      const vx = sx2 - sx1;
      const vy = sy2 - sy1;
      const cross = dirX * vy - dirY * vx;
      if (Math.abs(cross) < 1e-8) continue;

      const delX = sx1 - x1;
      const delY = sy1 - y1;
      const t = (delX * vy - delY * vx) / cross;
      const u = (delX * dirY - delY * dirX) / cross;

      if (t > 0.001 && t < dist - 0.001 && u >= 0 && u <= 1) {
        return false; // Occluded by wall
      }
    }

    return true;
  }

  /**
   * Counts the number of static wall segments intersecting the line between (x1, y1) and (x2, y2)
   * @param {number} x1
   * @param {number} y1
   * @param {number} x2
   * @param {number} y2
   * @param {Array<Object>} segments
   * @returns {number}
   */
  static countInterveningWalls(x1, y1, x2, y2, segments) {
    if (!segments || segments.length === 0) return 0;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.001) return 0;

    const dirX = dx / dist;
    const dirY = dy / dist;

    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);

    let count = 0;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const sx1 = seg.x1 !== undefined ? seg.x1 : (seg.p1 ? seg.p1.x : 0);
      const sy1 = seg.y1 !== undefined ? seg.y1 : (seg.p1 ? seg.p1.y : 0);
      const sx2 = seg.x2 !== undefined ? seg.x2 : (seg.p2 ? seg.p2.x : 0);
      const sy2 = seg.y2 !== undefined ? seg.y2 : (seg.p2 ? seg.p2.y : 0);

      if (
        Math.max(sx1, sx2) < minX ||
        Math.min(sx1, sx2) > maxX ||
        Math.max(sy1, sy2) < minY ||
        Math.min(sy1, sy2) > maxY
      ) {
        continue;
      }

      const vx = sx2 - sx1;
      const vy = sy2 - sy1;
      const cross = dirX * vy - dirY * vx;
      if (Math.abs(cross) < 1e-8) continue;

      const delX = sx1 - x1;
      const delY = sy1 - y1;
      const t = (delX * vy - delY * vx) / cross;
      const u = (delX * dirY - delY * dirX) / cross;

      if (t > 0.001 && t < dist - 0.001 && u >= 0 && u <= 1) {
        count++;
      }
    }

    return count;
  }

  countInterveningWalls(x1, y1, x2, y2, segments) {
    return Raycaster2D.countInterveningWalls(x1, y1, x2, y2, segments);
  }

  /**
   * Computes the 2D visibility polygon around (px, py)
   * Supports forward vision cone following crosshair orientation
   * @param {number} px
   * @param {number} py
   * @param {import('./MapGenerator.js').WallSegment[]} allSegments
   * @param {number} [aimAngle=null] - Direction of crosshair
   * @returns {Array<{x: number, y: number, angle: number}>} Ordered polygon vertices
   */
  computeVisibilityPolygon(px, py, allSegments, aimAngle = null) {
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

    // 2. Collect unique ray angles
    const angles = this._uniqueAngles;
    angles.length = 0;

    // Baseline uniform circle rays
    const baseRays = 64;
    for (let i = 0; i < baseRays; i++) {
      angles.push((i / baseRays) * Math.PI * 2 - Math.PI);
    }

    const hasAimCone = typeof aimAngle === 'number';
    const fovHalf = this.fovHalfAngle;
    const nearR = this.nearRadius;

    if (hasAimCone) {
      // Vision cone boundary rays
      angles.push(
        aimAngle - fovHalf - 0.001,
        aimAngle - fovHalf,
        aimAngle - fovHalf + 0.001,
        aimAngle + fovHalf - 0.001,
        aimAngle + fovHalf,
        aimAngle + fovHalf + 0.001
      );
      // Denser forward rays inside the cone for a smooth forward arc
      const coneRays = 24;
      for (let i = 1; i < coneRays; i++) {
        const t = (i / coneRays) * 2 - 1; // [-1, 1]
        angles.push(aimAngle + t * fovHalf);
      }
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

      // Determine max unobstructed range for this angle
      let maxDistForAngle = R;
      if (hasAimCone) {
        const diff = Math.abs(angleDiff(aimAngle, angle));
        if (diff <= fovHalf) {
          maxDistForAngle = R;
        } else if (diff <= fovHalf + 0.16) {
          // Smooth edge falloff
          const s = (diff - fovHalf) / 0.16;
          maxDistForAngle = R * (1 - s) + nearR * s;
        } else {
          maxDistForAngle = nearR;
        }
      }

      const dirX = Math.cos(angle);
      const dirY = Math.sin(angle);

      let minT = maxDistForAngle;
      let hitX = px + dirX * minT;
      let hitY = py + dirY * minT;

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
   * @param {number} [aimAngle=null] - Direction of crosshair
   */
  renderFogOfWar(ctx, px, py, poly, camera, wallhackActive = false, aimAngle = null) {
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
    ctx.strokeStyle = wallhackActive ? COLOR.CYAN_DIM : 'rgba(0, 240, 255, 0.28)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) {
      ctx.lineTo(poly[i].x, poly[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    // 5. Subtle forward vision cone guide lines
    if (typeof aimAngle === 'number') {
      const fovHalf = this.fovHalfAngle;
      const R = this.maxDistance;
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);

      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(aimAngle - fovHalf) * (R * 0.9), py + Math.sin(aimAngle - fovHalf) * (R * 0.9));
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(aimAngle + fovHalf) * (R * 0.9), py + Math.sin(aimAngle + fovHalf) * (R * 0.9));
      ctx.stroke();

      ctx.setLineDash([]);
    }

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
