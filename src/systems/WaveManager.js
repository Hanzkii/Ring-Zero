/**
 * Ring Zero - Security Wave Director & Escalation Manager
 * Paces daemon spawn budgets, enemy composition scaling, and wave progression timers.
 */

import { Enemy, ENEMY_ARCHETYPES } from '../entities/Enemy.js';
import { WORLD } from '../core/Constants.js';
import { randomRange } from '../core/VectorMath.js';

export const WAVE_STATE = {
  PREPARING: 'PREPARING',
  COMBAT: 'COMBAT',
  CLEARED: 'CLEARED',
};

export class WaveManager {
  /**
   * @param {Object} options
   * @param {function(Enemy): void} options.onSpawnEnemy
   */
  constructor({ onSpawnEnemy }) {
    this.onSpawnEnemy = onSpawnEnemy;

    this.waveNumber = 1;
    this.state = WAVE_STATE.PREPARING;

    this.prepTimer = 2.5; // Brief preparation telemetry delay
    this.spawnTimer = 0;
    this.spawnInterval = 1.0;

    this.totalBudget = 0;
    this.budgetSpent = 0;
    this.enemiesRemaining = 0;

    this._startWave(this.waveNumber);
  }

  _startWave(waveNum) {
    this.waveNumber = waveNum;
    this.state = WAVE_STATE.PREPARING;
    this.prepTimer = 2.0;

    // Escalating spawn budget
    this.totalBudget = 50 + waveNum * 45;
    this.budgetSpent = 0;
    this.enemiesRemaining = 0;
    this.spawnInterval = Math.max(0.35, 1.2 - waveNum * 0.08);
    this.spawnTimer = 0.5;
  }

  /**
   * Updates wave progression, spawn timings, and completion checks
   * @param {number} dt
   * @param {import('../entities/Player.js').Player} player
   * @param {number} activeEnemyCount
   */
  update(dt, player, activeEnemyCount) {
    this.enemiesRemaining = activeEnemyCount;

    if (this.state === WAVE_STATE.PREPARING) {
      this.prepTimer -= dt;
      if (this.prepTimer <= 0) {
        this.state = WAVE_STATE.COMBAT;
      }
      return;
    }

    if (this.state === WAVE_STATE.COMBAT) {
      // Spawn new daemons while budget remains
      if (this.budgetSpent < this.totalBudget) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
          this.spawnTimer = this.spawnInterval;
          this._spawnNextBatch(player);
        }
      } else if (activeEnemyCount === 0) {
        // All spawned enemies defeated -> Wave Cleared
        this.state = WAVE_STATE.CLEARED;
        this.prepTimer = 3.0; // Break between waves
        if (this.onWaveCleared) {
          this.onWaveCleared(this.waveNumber);
        }
      }
    } else if (this.state === WAVE_STATE.CLEARED) {
      this.prepTimer -= dt;
      if (this.prepTimer <= 0) {
        this._startWave(this.waveNumber + 1);
      }
    }
  }

  /**
   * Resets wave manager to wave 1
   */
  reset() {
    this.waveNumber = 1;
    this._startWave(1);
  }

  /**
   * Spawns batch of enemies around the player or arena edge
   * @param {import('../entities/Player.js').Player} player
   */
  _spawnNextBatch(player) {
    const batchSize = Math.min(3 + Math.floor(this.waveNumber * 0.5), 8);

    for (let i = 0; i < batchSize; i++) {
      if (this.budgetSpent >= this.totalBudget) break;

      const archetype = this._chooseArchetype();
      const pos = this._calculateSpawnPosition(player);

      const enemy = new Enemy(pos.x, pos.y, archetype);
      this.onSpawnEnemy(enemy);

      this.budgetSpent += archetype.xpValue;
    }
  }

  /**
   * Selects archetype weighted by wave escalation
   * @returns {typeof ENEMY_ARCHETYPES[keyof typeof ENEMY_ARCHETYPES]}
   */
  _chooseArchetype() {
    const w = this.waveNumber;
    const roll = Math.random();

    if (w >= 6 && roll < 0.22) {
      return ENEMY_ARCHETYPES.SENTINEL;
    }
    if (w >= 4 && roll < 0.45) {
      return ENEMY_ARCHETYPES.MEMORY_LEAK;
    }
    if (w >= 2 && roll < 0.70) {
      return ENEMY_ARCHETYPES.WATCHDOG;
    }
    return ENEMY_ARCHETYPES.BIT_SCANNER;
  }

  /**
   * Calculates spawn position on perimeter ring outside player camera
   * @param {import('../entities/Player.js').Player} player
   * @returns {{x: number, y: number}}
   */
  _calculateSpawnPosition(player) {
    const angle = Math.random() * Math.PI * 2;
    const dist = randomRange(500, 850); // Outside immediate frustum
    let sx = player.x + Math.cos(angle) * dist;
    let sy = player.y + Math.sin(angle) * dist;

    // Clamp inside arena walls
    const hw = WORLD.DEFAULT_WIDTH * 0.5 - 64;
    const hh = WORLD.DEFAULT_HEIGHT * 0.5 - 64;
    sx = Math.max(-hw, Math.min(hw, sx));
    sy = Math.max(-hh, Math.min(hh, sy));

    return { x: sx, y: sy };
  }

  get progressPercent() {
    if (this.totalBudget === 0) return 0;
    return Math.min(1.0, this.budgetSpent / this.totalBudget);
  }
}
