/**
 * Ring Zero - Dynamic Map & Sector Scaling Subsystem
 * Coordinates dynamic arena dimensions, spatial wall updates, and boundary transitions across Protection Rings.
 */

import { CLEARANCE_RING, SECTOR_THEMES } from '../core/Constants.js';
import { SectorArenaMap } from '../world/SectorArenaMap.js';

export class MapSystem {
  /**
   * @param {SectorArenaMap} [sectorArenaMap=null]
   */
  constructor(sectorArenaMap = null) {
    this.map = sectorArenaMap || new SectorArenaMap();
    this.currentRing = CLEARANCE_RING.RING_3;
  }

  /**
   * Sets active clearance ring and updates arena bounds
   * @param {number|string} ring
   * @param {import('./SpatialHashGrid.js').SpatialHashGrid} [spatialGrid]
   */
  setRing(ring, spatialGrid = null) {
    this.currentRing = ring;
    this.map.setRing(ring, spatialGrid);
  }

  /**
   * Returns current arena dimensions
   * @param {number|string} ring
   * @returns {{width: number, height: number}}
   */
  getDimensions(ring = this.currentRing) {
    const key = typeof ring === 'string'
      ? ring
      : (ring === 0 ? CLEARANCE_RING.RING_0 : ring === 1 ? CLEARANCE_RING.RING_1 : ring === 2 ? CLEARANCE_RING.RING_2 : CLEARANCE_RING.RING_3);
    const theme = SECTOR_THEMES[key] || SECTOR_THEMES[CLEARANCE_RING.RING_3];
    return {
      width: theme.width || 2400,
      height: theme.height || 2400,
    };
  }

  getSegments() {
    return this.map.getSegments();
  }

  render(ctx, camera, theme) {
    this.map.render(ctx, camera, theme);
  }
}

export { SectorArenaMap };
