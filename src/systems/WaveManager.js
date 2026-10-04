/**
 * Ring Zero - Security Wave Director & Escalation Manager
 * Paces daemon spawn budgets, enemy composition scaling, and wave progression timers.
 */

import { Enemy, ENEMY_ARCHETYPES, ELITE_MODIFIER } from '../entities/Enemy.js';
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
    // Exponential cadence scaling: max(0.1, 1.0 * 0.95^W)
    this.spawnInterval = Math.max(0.1, 1.0 * Math.pow(0.95, waveNum));
    this.spawnTimer = 0.5;
    this.bossSpawned = false;
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
    // 4-Tier Protection Ring Milestone Boss Gates (Waves 15, 30, 45, 60)
    if (this.waveNumber === 15 && !this.bossSpawned) {
      this.bossSpawned = true;
      const pos = this._calculateSpawnPosition(player);
      const boss = new Enemy(pos.x, pos.y, ENEMY_ARCHETYPES.DAEMON_OVERSEER);
      this.onSpawnEnemy(boss);
      this.budgetSpent += ENEMY_ARCHETYPES.DAEMON_OVERSEER.xpValue;
      return;
    }

    if (this.waveNumber === 30 && !this.bossSpawned) {
      this.bossSpawned = true;
      const pos = this._calculateSpawnPosition(player);
      const boss = new Enemy(pos.x, pos.y, ENEMY_ARCHETYPES.BUS_ARBITER);
      this.onSpawnEnemy(boss);
      this.budgetSpent += ENEMY_ARCHETYPES.BUS_ARBITER.xpValue;
      return;
    }

    if (this.waveNumber === 45 && !this.bossSpawned) {
      this.bossSpawned = true;
      const pos = this._calculateSpawnPosition(player);
      const boss = new Enemy(pos.x, pos.y, ENEMY_ARCHETYPES.HYPERVISOR_SENTINEL);
      this.onSpawnEnemy(boss);
      this.budgetSpent += ENEMY_ARCHETYPES.HYPERVISOR_SENTINEL.xpValue;
      return;
    }

    if (this.waveNumber === 60 && !this.bossSpawned) {
      this.bossSpawned = true;
      const pos = this._calculateSpawnPosition(player);
      const boss = new Enemy(pos.x, pos.y, ENEMY_ARCHETYPES.ROOTKIT_COLOSSUS);
      this.onSpawnEnemy(boss);
      this.budgetSpent += ENEMY_ARCHETYPES.ROOTKIT_COLOSSUS.xpValue;
      return;
    }

    // Post-Wave 60 endless recurring colossus every 15 waves
    if (this.waveNumber > 60 && this.waveNumber % 15 === 0 && !this.bossSpawned) {
      this.bossSpawned = true;
      const pos = this._calculateSpawnPosition(player);
      const boss = new Enemy(pos.x, pos.y, ENEMY_ARCHETYPES.ROOTKIT_COLOSSUS);
      const endlessScale = 1 + (this.waveNumber - 60) * 0.08;
      boss.maxHealth = Math.round(boss.maxHealth * endlessScale);
      boss.health = boss.maxHealth;
      this.onSpawnEnemy(boss);
      this.budgetSpent += ENEMY_ARCHETYPES.ROOTKIT_COLOSSUS.xpValue;
      return;
    }

    // Scaling factors: linear <= 20, exponential > 20
    let hpMult = 1.0;
    let speedMult = 1.0;
    if (this.waveNumber <= 20) {
      hpMult = 1 + 0.15 * this.waveNumber;
      speedMult = 1 + 0.03 * this.waveNumber;
    } else {
      hpMult = 4.0 * Math.pow(1.08, this.waveNumber - 20);
      speedMult = Math.min(2.2, 1 + 0.025 * this.waveNumber);
    }

    // Soft-cap coalescence: if active hostiles >= 60, coalesce spawns into Elites
    const forceCoalesce = this.enemiesRemaining >= 60;
    const batchSize = forceCoalesce ? 2 : Math.min(3 + Math.floor(this.waveNumber * 0.5), 8);

    // Elite probability curve
    let eliteChance = 0;
    if (forceCoalesce) {
      eliteChance = 1.0;
    } else if (this.waveNumber >= 35) {
      eliteChance = 0.50;
    } else if (this.waveNumber >= 25) {
      eliteChance = 0.35;
    } else if (this.waveNumber >= 15) {
      eliteChance = 0.15;
    } else if (this.waveNumber >= 3) {
      eliteChance = 0.10;
    }

    const elitePool = [
      ELITE_MODIFIER.SHIELDED,
      ELITE_MODIFIER.OVERCLOCKED,
      ELITE_MODIFIER.CLUSTER_SPLITTER,
      ELITE_MODIFIER.PHASE_TELEPORTER,
      ELITE_MODIFIER.SHIELD_VANGUARD,
      ELITE_MODIFIER.VOLATILE_KAMIKAZE,
    ];

    for (let i = 0; i < batchSize; i++) {
      if (this.budgetSpent >= this.totalBudget) break;

      const archetype = this._chooseArchetype();
      const pos = this._calculateSpawnPosition(player);

      let elite = ELITE_MODIFIER.NONE;
      if (Math.random() < eliteChance) {
        elite = elitePool[Math.floor(Math.random() * elitePool.length)];
      }

      const enemy = new Enemy(pos.x, pos.y, { ...archetype, elite });
      enemy.maxHealth = Math.round(enemy.maxHealth * hpMult);
      enemy.health = enemy.maxHealth;
      enemy.speed = Math.round(enemy.speed * speedMult);

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

    // Clamp inside arena walls (Ring 0 is compact 1536x864, others 1920x1080)
    const arenaW = this.waveNumber >= 46 ? 1536 : 1920;
    const arenaH = this.waveNumber >= 46 ? 864 : 1080;
    const hw = arenaW * 0.5 - 64;
    const hh = arenaH * 0.5 - 64;
    sx = Math.max(-hw, Math.min(hw, sx));
    sy = Math.max(-hh, Math.min(hh, sy));

    return { x: sx, y: sy };
  }

  get progressPercent() {
    if (this.totalBudget === 0) return 0;
    return Math.min(1.0, this.budgetSpent / this.totalBudget);
  }
}
