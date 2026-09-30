/**
 * Ring Zero - Collision System
 * Broadphase spatial hash acceleration and narrowphase contact resolution.
 */

import { COLLISION_LAYER, WORLD, COLOR } from '../core/Constants.js';
import { DROP_TYPE } from '../entities/Drop.js';
import { Enemy, ENEMY_ARCHETYPES } from '../entities/Enemy.js';
import { Vec2 } from '../core/VectorMath.js';

export class CollisionSystem {
  /**
   * @param {Object} options
   * @param {import('./SpatialHashGrid.js').SpatialHashGrid} options.spatialGrid
   * @param {import('../core/ObjectPool.js').ObjectPool} options.projectilePool
   * @param {import('./ParticleSystem.js').ParticleSystem} options.particleSystem
   * @param {import('./WeaponSystem.js').WeaponSystem} options.weaponSystem
   * @param {import('../core/Camera2D.js').Camera2D} options.camera
   * @param {import('./CheatManager.js').CheatManager} [options.cheatManager]
   */
  constructor({ spatialGrid, projectilePool, particleSystem, weaponSystem, camera, cheatManager = null }) {
    this.spatialGrid = spatialGrid;
    this.projectilePool = projectilePool;
    this.particleSystem = particleSystem;
    this.weaponSystem = weaponSystem;
    this.camera = camera;
    this.cheatManager = cheatManager;

    // Reusable candidate query arrays
    this._candidateList = [];
    this._knockbackDir = new Vec2();
  }

  /**
   * Primary collision resolution step called within fixed simulation tick
   * @param {number} dt
   * @param {import('../entities/Player.js').Player} player
   * @param {Enemy[]} enemyList
   * @param {import('../entities/Drop.js').Drop[]} dropList
   * @param {function(Enemy): void} onSpawnChildEnemy - Spawns mini-daemons on split
   */
  resolve(dt, player, enemyList, dropList, onSpawnChildEnemy) {
    this._resolveProjectilesVsEnemies(enemyList, dropList, onSpawnChildEnemy);
    this._resolveProjectilesVsPlayer(player);
    this._resolveEnemiesVsPlayer(player, enemyList);
    this._resolvePlayerVsDrops(player, dropList);
    this._resolveProjectilesVsWorldBounds();
  }

  /**
   * Player bullet vs Enemy collisions
   */
  _resolveProjectilesVsEnemies(enemyList, dropList, onSpawnChildEnemy) {
    const hw = WORLD.DEFAULT_WIDTH * 0.5;
    const hh = WORLD.DEFAULT_HEIGHT * 0.5;

    this.projectilePool.forEachActive((proj) => {
      if (proj.markedForRemoval || proj.layer !== COLLISION_LAYER.PROJECTILE_PLAYER) return;

      // Query enemies in proximity
      this.spatialGrid.queryRadius(
        proj.x,
        proj.y,
        proj.radius + 26,
        COLLISION_LAYER.ENEMY,
        this._candidateList
      );

      for (const enemy of this._candidateList) {
        if (!enemy.active || enemy.markedForRemoval) continue;

        const dx = enemy.x - proj.x;
        const dy = enemy.y - proj.y;
        const totalR = enemy.radius + proj.radius;

        let hitRegistered = false;

        // 1. Direct hit check
        if (dx * dx + dy * dy <= totalR * totalR) {
          hitRegistered = true;
        } else if (this.cheatManager && this.cheatManager.hasCheat('backtrack')) {
          // 2. Backtrack ghost check
          const backtrack = this.cheatManager.getCheat('backtrack');
          if (backtrack && backtrack.checkGhostCollision(proj, enemy)) {
            hitRegistered = true;
          }
        }

        if (hitRegistered) {
          // Bullet hit registered
          this._knockbackDir.set(proj.vx, proj.vy).normalize();

          const died = enemy.takeDamage(proj.damage, this._knockbackDir, proj.knockback);
          this.particleSystem.emitImpact(proj.x, proj.y, proj.rotation, 6, proj.color);

          if (proj.isCritical) {
            this.camera.addTrauma(0.15);
          }

          if (died) {
            // Destruction explosion
            this.particleSystem.emitBurst(enemy.x, enemy.y, 16, enemy.color, 280);

            // Generate memory fragments and weapon crates
            const drops = enemy.generateDrops();
            for (const d of drops) {
              dropList.push(d);
              this.spatialGrid.insert(d);
            }

            // Memory-Leak split mechanic: spawns 2 Mini Bit-Scanners
            if (enemy.type === 'MEMORY_LEAK' && onSpawnChildEnemy) {
              for (let i = 0; i < 2; i++) {
                const child = new Enemy(
                  enemy.x + (i === 0 ? -12 : 12),
                  enemy.y + (i === 0 ? -12 : 12),
                  ENEMY_ARCHETYPES.BIT_SCANNER
                );
                child.health = 20;
                child.maxHealth = 20;
                child.speed = 260;
                onSpawnChildEnemy(child);
              }
            }
          }

          const shouldDespawn = proj.onHit(enemy);
          if (shouldDespawn) break;
        }
      }
    });
  }

  /**
   * Enemy projectile vs Player collision
   */
  _resolveProjectilesVsPlayer(player) {
    if (player.markedForRemoval) return;

    this.projectilePool.forEachActive((proj) => {
      if (proj.markedForRemoval || proj.layer !== COLLISION_LAYER.PROJECTILE_ENEMY) return;

      const dx = player.x - proj.x;
      const dy = player.y - proj.y;
      const totalR = player.radius + proj.radius;

      if (dx * dx + dy * dy <= totalR * totalR) {
        if (!player.isDashing && player.iFramesTimer <= 0) {
          // Cheat evasion check (Spinbot Anti-Aim)
          let finalDamage = proj.damage;
          let evaded = false;
          if (this.cheatManager) {
            const check = this.cheatManager.applyTakeDamageInterceptors(proj.damage, {
              player,
              sourceEntity: proj,
              isContact: false,
            });
            finalDamage = check.damage;
            evaded = check.evaded;
          }

          if (evaded) {
            this.particleSystem.emitImpact(player.x, player.y, proj.rotation, 8, COLOR.GREEN);
          } else {
            player.takeDamage(finalDamage);
            this.camera.addTrauma(0.28);
            this.particleSystem.emitBurst(player.x, player.y, 10, COLOR.RED, 220);
          }
        }
        proj.markedForRemoval = true;
      }
    });
  }

  /**
   * Enemy body vs Player contact collision
   */
  _resolveEnemiesVsPlayer(player, enemyList) {
    if (player.markedForRemoval) return;

    this.spatialGrid.queryRadius(
      player.x,
      player.y,
      player.radius + 32,
      COLLISION_LAYER.ENEMY,
      this._candidateList
    );

    for (const enemy of this._candidateList) {
      if (!enemy.active || enemy.markedForRemoval) continue;

      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const totalR = player.radius + enemy.radius;
      const distSq = dx * dx + dy * dy;

      if (distSq <= totalR * totalR) {
        if (player.isDashing) {
          // Dash Ram: Cutting through enemy deals high damage
          enemy.takeDamage(45, new Vec2(player.vx, player.vy).normalize(), 200);
          this.particleSystem.emitImpact(enemy.x, enemy.y, player.rotation, 8, COLOR.CYAN);
          this.camera.addTrauma(0.18);
        } else if (player.iFramesTimer <= 0) {
          // Cheat evasion check (Spinbot Anti-Aim)
          let finalDamage = enemy.contactDamage;
          let evaded = false;
          if (this.cheatManager) {
            const check = this.cheatManager.applyTakeDamageInterceptors(enemy.contactDamage, {
              player,
              sourceEntity: enemy,
              isContact: true,
            });
            finalDamage = check.damage;
            evaded = check.evaded;
          }

          if (evaded) {
            this.particleSystem.emitImpact(player.x, player.y, player.rotation, 10, COLOR.GREEN);
          } else {
            player.takeDamage(finalDamage);
            this.camera.addTrauma(0.35);
            this.particleSystem.emitBurst(player.x, player.y, 14, COLOR.RED, 240);

            // Push player back
            const dist = Math.sqrt(distSq);
            if (dist > 0.1) {
              player.vx += (dx / dist) * 260;
              player.vy += (dy / dist) * 260;
            }
          }
        }
      }
    }
  }

  /**
   * Player collection of drops (Memory Fragments & Crates)
   */
  _resolvePlayerVsDrops(player, dropList) {
    if (player.markedForRemoval) return;

    this.spatialGrid.queryRadius(
      player.x,
      player.y,
      player.radius + 24,
      COLLISION_LAYER.DROP,
      this._candidateList
    );

    for (const drop of this._candidateList) {
      if (!drop.active || drop.markedForRemoval) continue;

      const dx = player.x - drop.x;
      const dy = player.y - drop.y;
      const totalR = player.radius + drop.radius;

      if (dx * dx + dy * dy <= totalR * totalR) {
        if (drop.type === DROP_TYPE.XP) {
          player.addXP(drop.xpValue);
          this.particleSystem.emitBurst(drop.x, drop.y, 6, COLOR.CYAN, 160);
          drop.markedForRemoval = true;
        } else if (drop.type === DROP_TYPE.WEAPON && drop.weapon) {
          this.weaponSystem.equipWeapon(drop.weapon);
          this.particleSystem.emitBurst(drop.x, drop.y, 18, COLOR.AMBER, 260);
          this.camera.addTrauma(0.15);
          drop.markedForRemoval = true;
        }
      }
    }
  }

  /**
   * Bullet despawn at arena boundaries
   */
  _resolveProjectilesVsWorldBounds() {
    const hw = WORLD.DEFAULT_WIDTH * 0.5;
    const hh = WORLD.DEFAULT_HEIGHT * 0.5;

    this.projectilePool.forEachActive((proj) => {
      if (
        proj.x < -hw ||
        proj.x > hw ||
        proj.y < -hh ||
        proj.y > hh
      ) {
        this.particleSystem.emitImpact(proj.x, proj.y, proj.rotation, 4, proj.color);
        proj.markedForRemoval = true;
      }
    });
  }
}
