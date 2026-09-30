/**
 * Ring Zero - Collision System
 * Broadphase spatial hash acceleration and narrowphase contact resolution.
 */

import { COLLISION_LAYER, WORLD, COLOR } from '../core/Constants.js';
import { DROP_TYPE } from '../entities/Drop.js';
import { Enemy, ENEMY_ARCHETYPES } from '../entities/Enemy.js';
import { Vec2 } from '../core/VectorMath.js';
import { PROP_TYPE } from '../world/DestructibleProp.js';

export class CollisionSystem {
  /**
   * @param {Object} options
   * @param {import('./SpatialHashGrid.js').SpatialHashGrid} options.spatialGrid
   * @param {import('../core/ObjectPool.js').ObjectPool} options.projectilePool
   * @param {import('./ParticleSystem.js').ParticleSystem} options.particleSystem
   * @param {import('./WeaponSystem.js').WeaponSystem} options.weaponSystem
   * @param {import('../core/Camera2D.js').Camera2D} options.camera
   * @param {import('./CheatManager.js').CheatManager} [options.cheatManager]
   * @param {import('../audio/SoundBank.js').SoundBank} [options.soundBank]
   */
  constructor({ spatialGrid, projectilePool, particleSystem, weaponSystem, camera, cheatManager = null, soundBank = null }) {
    this.spatialGrid = spatialGrid;
    this.projectilePool = projectilePool;
    this.particleSystem = particleSystem;
    this.weaponSystem = weaponSystem;
    this.camera = camera;
    this.cheatManager = cheatManager;
    this.soundBank = soundBank;

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
   * @param {import('../world/DestructibleProp.js').DestructibleProp[]} [propList=null]
   */
  resolve(dt, player, enemyList, dropList, onSpawnChildEnemy, propList = null) {
    this._resolveProjectilesVsEnemies(enemyList, dropList, onSpawnChildEnemy);
    this._resolveProjectilesVsPlayer(player);
    this._resolveEnemiesVsPlayer(player, enemyList);
    this._resolvePlayerVsDrops(player, dropList);
    this._resolveEntitiesVsWalls(player, enemyList);
    if (propList) {
      this._resolveEntitiesVsProps(player, enemyList, propList);
      this._resolveProjectilesVsProps(propList, dropList, enemyList, player);
    }
    this._resolveProjectilesVsWalls();
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

      let hitEnemy = null;
      let isGhostHit = false;

      // 1. Direct hit check on spatial candidates
      for (const enemy of this._candidateList) {
        if (!enemy.active || enemy.markedForRemoval) continue;

        const dx = enemy.x - proj.x;
        const dy = enemy.y - proj.y;
        const totalR = enemy.radius + proj.radius;

        if (dx * dx + dy * dy <= totalR * totalR) {
          hitEnemy = enemy;
          break;
        }
      }

      // 2. If no direct hit, check backtrack ghost collision across all active enemies
      if (!hitEnemy && this.cheatManager && this.cheatManager.hasCheat('backtrack')) {
        const backtrack = this.cheatManager.getCheat('backtrack');
        if (backtrack) {
          hitEnemy = backtrack.checkAllGhostsCollision(proj, enemyList);
          if (hitEnemy) {
            isGhostHit = true;
            this.spatialGrid.update(hitEnemy);
            this.particleSystem.emitBurst(hitEnemy.x, hitEnemy.y, 10, COLOR.AMBER, 200);
          }
        }
      }

      if (hitEnemy) {
        const enemy = hitEnemy;
        // Bullet hit registered
        this._knockbackDir.set(proj.vx, proj.vy).normalize();

        const died = enemy.takeDamage(proj.damage, this._knockbackDir, proj.knockback);
        this.particleSystem.emitImpact(proj.x, proj.y, proj.rotation, 6, isGhostHit ? COLOR.AMBER : proj.color);
        this.soundBank?.playHit();

        if (died) {
          // Destruction explosion
          this.particleSystem.emitBurst(enemy.x, enemy.y, 16, enemy.color, 280);
          this.soundBank?.playExplosion(false);

          // Generate memory fragments, bounties, and weapon crates
          const clearance = this.cheatManager?.clearanceRing ?? 3;
          const drops = enemy.generateDrops(clearance);
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
        if (shouldDespawn) return;
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
          this.soundBank?.playUIClick();
          drop.markedForRemoval = true;
        } else if (drop.type === DROP_TYPE.CRYPTO) {
          player.bounties = (player.bounties || 0) + (drop.cryptoValue || 15);
          this.particleSystem.emitBurst(drop.x, drop.y, 10, COLOR.AMBER, 220);
          this.soundBank?.playUIClick();
          drop.markedForRemoval = true;
        } else if (drop.type === DROP_TYPE.WEAPON && drop.weapon) {
          // Store weapon in secondary/reserve slot without switching active weapon
          this.weaponSystem.equipWeapon(drop.weapon, false);
          this.particleSystem.emitBurst(drop.x, drop.y, 18, COLOR.AMBER, 260);
          this.camera.addTrauma(0.15);
          this.soundBank?.playReloadStart();
          drop.markedForRemoval = true;
        }
      }
    }
  }

  /**
   * Circle vs AABB collision resolution
   * @param {Object} circle - Object with x, y, (vx, vy optional)
   * @param {Object} aabb - Object with minX, maxX, minY, maxY
   * @param {number} radius
   * @returns {boolean}
   */
  _resolveCircleVsAABB(circle, aabb, radius) {
    const closestX = Math.max(aabb.minX, Math.min(circle.x, aabb.maxX));
    const closestY = Math.max(aabb.minY, Math.min(circle.y, aabb.maxY));

    const dx = circle.x - closestX;
    const dy = circle.y - closestY;
    const distSq = dx * dx + dy * dy;

    if (distSq < radius * radius && distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      const penetration = radius - dist;
      const nx = dx / dist;
      const ny = dy / dist;

      circle.x += nx * penetration;
      circle.y += ny * penetration;

      // Cancel velocity moving into wall
      if (typeof circle.vx === 'number' && typeof circle.vy === 'number') {
        const dot = circle.vx * nx + circle.vy * ny;
        if (dot < 0) {
          circle.vx -= dot * nx;
          circle.vy -= dot * ny;
        }
      }
      return true;
    } else if (distSq <= 0.0001) {
      // Circle center inside AABB - push out along closest edge
      const leftDist = circle.x - aabb.minX;
      const rightDist = aabb.maxX - circle.x;
      const topDist = circle.y - aabb.minY;
      const botDist = aabb.maxY - circle.y;

      const minDist = Math.min(leftDist, rightDist, topDist, botDist);
      if (minDist === leftDist) {
        circle.x = aabb.minX - radius;
        if (circle.vx && circle.vx > 0) circle.vx = 0;
      } else if (minDist === rightDist) {
        circle.x = aabb.maxX + radius;
        if (circle.vx && circle.vx < 0) circle.vx = 0;
      } else if (minDist === topDist) {
        circle.y = aabb.minY - radius;
        if (circle.vy && circle.vy > 0) circle.vy = 0;
      } else {
        circle.y = aabb.maxY + radius;
        if (circle.vy && circle.vy < 0) circle.vy = 0;
      }
      return true;
    }
    return false;
  }

  /**
   * Push player and enemies out of static walls
   */
  _resolveEntitiesVsWalls(player, enemyList) {
    // 1. Player vs Walls (phased through if Noclip is active)
    if (player && !player.markedForRemoval && !this.cheatManager?.hasCheat('noclip')) {
      this.spatialGrid.queryRadius(
        player.x,
        player.y,
        player.radius + 60,
        COLLISION_LAYER.WALL,
        this._candidateList
      );
      for (const wall of this._candidateList) {
        this._resolveCircleVsAABB(player, wall, player.radius);
      }
    }

    // 2. Enemies vs Walls
    for (const enemy of enemyList) {
      if (!enemy.active || enemy.markedForRemoval) continue;
      this.spatialGrid.queryRadius(
        enemy.x,
        enemy.y,
        enemy.radius + 50,
        COLLISION_LAYER.WALL,
        this._candidateList
      );
      for (const wall of this._candidateList) {
        this._resolveCircleVsAABB(enemy, wall, enemy.radius);
      }
    }
  }

  /**
   * Push player and enemies out of solid props
   */
  _resolveEntitiesVsProps(player, enemyList, propList) {
    if (player && !player.markedForRemoval && !this.cheatManager?.hasCheat('noclip')) {
      this.spatialGrid.queryRadius(
        player.x,
        player.y,
        player.radius + 40,
        COLLISION_LAYER.PROP,
        this._candidateList
      );
      for (const prop of this._candidateList) {
        if (!prop.markedForRemoval) {
          this._resolveCircleVsAABB(player, prop, player.radius);
        }
      }
    }

    for (const enemy of enemyList) {
      if (!enemy.active || enemy.markedForRemoval) continue;
      this.spatialGrid.queryRadius(
        enemy.x,
        enemy.y,
        enemy.radius + 40,
        COLLISION_LAYER.PROP,
        this._candidateList
      );
      for (const prop of this._candidateList) {
        if (!prop.markedForRemoval) {
          this._resolveCircleVsAABB(enemy, prop, enemy.radius);
        }
      }
    }
  }

  /**
   * Projectiles vs static walls (with Wallhack pierce check)
   */
  _resolveProjectilesVsWalls() {
    this.projectilePool.forEachActive((proj) => {
      if (proj.markedForRemoval) return;

      this.spatialGrid.queryRadius(
        proj.x,
        proj.y,
        proj.radius + 20,
        COLLISION_LAYER.WALL,
        this._candidateList
      );

      for (const wall of this._candidateList) {
        if (
          proj.x >= wall.minX - proj.radius &&
          proj.x <= wall.maxX + proj.radius &&
          proj.y >= wall.minY - proj.radius &&
          proj.y <= wall.maxY + proj.radius
        ) {
          // Check for wall penetration (Wallhack Rank 3, PenetrationBucker, or bullet property)
          const hasBuck = this.cheatManager && this.cheatManager.hasCheat('penetrationbucker');
          const isPlayerBullet = proj.layer === COLLISION_LAYER.PROJECTILE_PLAYER;
          if (isPlayerBullet && (proj.canPierceWalls || proj.penetratesWalls || hasBuck)) {
            this.particleSystem.emitImpact(proj.x, proj.y, proj.rotation, 1, COLOR.CYAN);
            continue;
          }

          let canPierce = false;
          if (this.cheatManager && this.cheatManager.hasCheat('wallhack')) {
            const wallhack = this.cheatManager.getCheat('wallhack');
            if (wallhack && isPlayerBullet) {
              // Max level Wallhack (Rank 3): bullets shoot completely through walls!
              if (wallhack.level >= 3) {
                this.particleSystem.emitImpact(proj.x, proj.y, proj.rotation, 1, COLOR.CYAN);
                continue;
              }
              const remaining = proj.hitsRemaining !== undefined ? proj.hitsRemaining : proj.pierce;
              if (wallhack.level >= 2 && remaining > 0) {
                canPierce = true;
              }
            }
          }

          if (canPierce) {
            if (proj.hitsRemaining !== undefined) proj.hitsRemaining--;
            else proj.pierce--;
            this.particleSystem.emitImpact(proj.x, proj.y, proj.rotation, 3, COLOR.CYAN);
          } else {
            this.particleSystem.emitImpact(proj.x, proj.y, proj.rotation, 6, proj.color);
            proj.markedForRemoval = true;
            break;
          }
        }
      }
    });
  }

  /**
   * Projectiles vs destructible props
   */
  _resolveProjectilesVsProps(propList, dropList, enemyList, player) {
    this.projectilePool.forEachActive((proj) => {
      if (proj.markedForRemoval) return;

      this.spatialGrid.queryRadius(
        proj.x,
        proj.y,
        proj.radius + 24,
        COLLISION_LAYER.PROP,
        this._candidateList
      );

      for (const prop of this._candidateList) {
        if (!prop.active || prop.markedForRemoval) continue;

        if (
          proj.x >= prop.minX - proj.radius &&
          proj.x <= prop.maxX + proj.radius &&
          proj.y >= prop.minY - proj.radius &&
          proj.y <= prop.maxY + proj.radius
        ) {
          const destroyed = prop.takeDamage(proj.damage);
          this.particleSystem.emitImpact(proj.x, proj.y, proj.rotation, 5, prop.color);

          if (destroyed) {
            this.spatialGrid.remove(prop);

            if (prop.propType === PROP_TYPE.EXPLOSIVE_CELL) {
              this.particleSystem.emitBurst(prop.x, prop.y, 22, COLOR.RED, 320);
              this.camera.addTrauma(0.3);
              this.soundBank?.playExplosion(true);

              const blastRadius = 140;
              const clearance = this.cheatManager?.clearanceRing ?? 3;
              for (const enemy of enemyList) {
                if (!enemy.active || enemy.markedForRemoval) continue;
                const d = Math.hypot(enemy.x - prop.x, enemy.y - prop.y);
                if (d < blastRadius + enemy.radius) {
                  const dir = new Vec2(enemy.x - prop.x, enemy.y - prop.y).normalize();
                  const died = enemy.takeDamage(120, dir, 300);
                  if (died) {
                    this.particleSystem.emitBurst(enemy.x, enemy.y, 14, enemy.color, 240);
                    this.soundBank?.playExplosion(false);
                    const drops = enemy.generateDrops(clearance);
                    for (const drop of drops) {
                      dropList.push(drop);
                      this.spatialGrid.insert(drop);
                    }
                  }
                }
              }

              if (player && !player.markedForRemoval) {
                const pd = Math.hypot(player.x - prop.x, player.y - prop.y);
                if (pd < blastRadius + player.radius) {
                  player.takeDamage(25);
                  this.camera.addTrauma(0.35);
                  this.particleSystem.emitBurst(player.x, player.y, 10, COLOR.RED, 200);
                }
              }
            } else {
              this.particleSystem.emitBurst(prop.x, prop.y, 14, COLOR.CYAN, 200);
              const drops = prop.generateDrops();
              for (const drop of drops) {
                dropList.push(drop);
                this.spatialGrid.insert(drop);
              }
            }
          }

          const shouldDespawn = proj.onHit(prop);
          if (shouldDespawn) break;
        }
      }
    });
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
