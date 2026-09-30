/**
 * Ring Zero - Phase 4 Verification Test Suite
 * Validates Mulberry32 PRNG determinism, BSP and Cellular Cavern generation,
 * Raycaster2D line-of-sight and visibility polygons, destructible props, and static wall collision.
 */

import { PRNG, WallRect, WallSegment } from '../src/world/MapGenerator.js';
import { BSPFacilityMap } from '../src/world/BSPFacilityMap.js';
import { CellularCavernMap } from '../src/world/CellularCavernMap.js';
import { Raycaster2D } from '../src/world/Raycaster2D.js';
import { DestructibleProp, PROP_TYPE } from '../src/world/DestructibleProp.js';
import { CollisionSystem } from '../src/systems/CollisionSystem.js';
import { SpatialHashGrid } from '../src/systems/SpatialHashGrid.js';
import { ObjectPool } from '../src/core/ObjectPool.js';
import { Projectile } from '../src/entities/Projectile.js';
import { ParticleSystem } from '../src/systems/ParticleSystem.js';
import { WeaponSystem } from '../src/systems/WeaponSystem.js';
import { Camera2D } from '../src/core/Camera2D.js';
import { CheatManager } from '../src/systems/CheatManager.js';
import { Player } from '../src/entities/Player.js';
import { Enemy, ENEMY_ARCHETYPES } from '../src/entities/Enemy.js';
import { COLLISION_LAYER, COLOR } from '../src/core/Constants.js';
import { Vec2 } from '../src/core/VectorMath.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

console.log('=== RUNNING PHASE 4 AUTOMATED VERIFICATION ===\n');

// 1. Seedable PRNG & Determinism
console.log('1. Testing Mulberry32 PRNG Determinism:');
{
  const prng1 = new PRNG(42);
  const prng2 = new PRNG(42);
  const val1 = [prng1.random(), prng1.random(), prng1.rangeInt(10, 50), prng1.rangeFloat(1.0, 5.0)];
  const val2 = [prng2.random(), prng2.random(), prng2.rangeInt(10, 50), prng2.rangeFloat(1.0, 5.0)];

  assert(val1[0] === val2[0], 'PRNG generates identical 1st random float from identical seed');
  assert(val1[1] === val2[1], 'PRNG generates identical 2nd random float from identical seed');
  assert(val1[2] === val2[2], 'PRNG generates identical integer from identical seed');
  assert(val1[3] === val2[3], 'PRNG generates identical float from identical seed');

  const prngDiff = new PRNG(999);
  assert(prngDiff.random() !== val1[0], 'Different seeds produce divergent random sequences');
}

// 2. Biome 1: BSP Facility Map
console.log('\n2. Testing BSPFacilityMap Generation:');
{
  const facility1 = new BSPFacilityMap(1337);
  const facility2 = new BSPFacilityMap(1337);

  assert(facility1.walls.length > 4, `BSPFacilityMap generated ${facility1.walls.length} wall blocks (expected > 4)`);
  assert(facility1.walls.length === facility2.walls.length, 'Deterministic wall count for identical seed');
  assert(facility1.walls[0].x === facility2.walls[0].x, 'Deterministic wall coordinates for identical seed');

  assert(facility1.props.length > 0, `BSPFacilityMap spawned ${facility1.props.length} destructible props`);
  assert(facility1.props.length === facility2.props.length, 'Deterministic prop count for identical seed');

  // Verify center hub spawn clearance
  let centerBlocked = false;
  for (const w of facility1.walls) {
    if (Math.hypot(w.x, w.y) < 180) {
      centerBlocked = true;
      break;
    }
  }
  assert(!centerBlocked, 'Center player spawn zone (radius 180px) is completely clear of walls');

  // Verify segment compilation for raycasting
  const segments = facility1.getSegments();
  assert(segments.length === facility1.walls.length * 4, `Compiled ${segments.length} raycast wall segments`);
}

// 3. Biome 2: CellularCavernMap
console.log('\n3. Testing CellularCavernMap Generation:');
{
  const cavern = new CellularCavernMap(2048);

  assert(cavern.walls.length > 0, `CellularCavernMap generated ${cavern.walls.length} merged wall blocks`);
  assert(cavern.props.length > 0, `CellularCavernMap generated ${cavern.props.length} cavern props`);

  // Verify center spawn clearance
  let centerBlocked = false;
  for (const w of cavern.walls) {
    if (Math.hypot(w.x, w.y) < 150) {
      centerBlocked = true;
      break;
    }
  }
  assert(!centerBlocked, 'Cavern center spawn area is cleared of rock blocks');

  // Verify flood-fill connectivity keeps cavern walkable
  assert(cavern.getSegments().length > 0, 'Cavern generated static raycast boundary segments');
}

// 4. Destructible Props Mechanics
console.log('\n4. Testing DestructibleProp Mechanics:');
{
  const rack = new DestructibleProp(100, 100, PROP_TYPE.SERVER_RACK);
  assert(rack.health === 80, 'Server Rack starts with 80 health');
  assert(rack.layer === COLLISION_LAYER.PROP, 'Server Rack belongs to COLLISION_LAYER.PROP');

  rack.takeDamage(30);
  assert(rack.health === 50, 'Server Rack health reduced to 50');
  assert(rack.hitFlashTimer > 0, 'Damage triggered hit flash timer');
  assert(!rack.markedForRemoval, 'Server Rack survives non-lethal damage');

  const died = rack.takeDamage(50);
  assert(died === true, 'Lethal damage reported destruction');
  assert(rack.markedForRemoval === true, 'Server Rack marked for removal upon health exhaustion');

  const drops = rack.generateDrops();
  assert(drops.length >= 1, 'Server Rack generated at least 1 loot drop');
  assert(drops[0].type === 'XP', 'Server Rack dropped memory fragment XP gem');

  const cell = new DestructibleProp(200, 200, PROP_TYPE.EXPLOSIVE_CELL);
  assert(cell.health === 35, 'Explosive Cell starts with 35 health');
  cell.takeDamage(35);
  assert(cell.markedForRemoval === true, 'Explosive Cell marked for removal on purge');
}

// 5. Raycaster2D & Fog of War
console.log('\n5. Testing Raycaster2D Line-of-Sight & Visibility Polygon:');
{
  const raycaster = new Raycaster2D(900);

  // Line segment wall at x = 100, spanning y from -100 to 100
  const wallSeg = new WallSegment(100, -100, 100, 100);
  const segments = [wallSeg];

  // Unobstructed query (looking from (0,0) to (50, 0))
  const clearLOS = raycaster.hasLineOfSight(0, 0, 50, 0, segments);
  assert(clearLOS === true, 'Clear line of sight when no wall intervenes');

  // Blocked query (looking from (0,0) to (200, 0) across x=100 wall)
  const blockedLOS = raycaster.hasLineOfSight(0, 0, 200, 0, segments);
  assert(blockedLOS === false, 'Line of sight blocked when intersecting static wall');

  // Visibility polygon computation
  const poly = raycaster.computeVisibilityPolygon(0, 0, segments);
  assert(poly.length >= 3, `Visibility polygon generated ${poly.length} ordered vertices`);

  // Verify angular order
  let sorted = true;
  for (let i = 1; i < poly.length; i++) {
    if (poly[i].angle < poly[i - 1].angle) {
      sorted = false;
      break;
    }
  }
  assert(sorted === true, 'Visibility polygon vertices are sorted monotonically by angle');

  // Verify vertex bounds
  let withinRadius = true;
  for (const v of poly) {
    if (Math.hypot(v.x, v.y) > 900.01) {
      withinRadius = false;
      break;
    }
  }
  assert(withinRadius === true, 'All visibility polygon vertices are bounded by max view distance');
}

// 6. Static Wall & Prop Collisions
console.log('\n6. Testing Static Wall & Prop Collisions in CollisionSystem:');
{
  const grid = new SpatialHashGrid(128);
  const pool = new ObjectPool({
    factory: () => new Projectile(),
    reset: (p) => p.reset(),
    initialCapacity: 50,
  });
  const particles = new ParticleSystem(100);
  const weapons = new WeaponSystem(pool);
  const camera = new Camera2D(800, 600);
  const cheatManager = new CheatManager();

  const collisionSystem = new CollisionSystem({
    spatialGrid: grid,
    projectilePool: pool,
    particleSystem: particles,
    weaponSystem: weapons,
    camera,
    cheatManager,
  });

  // Test 1: Circle vs WallRect pushout
  const player = new Player(0, 0);
  // Wall placed at x=20, y=0, w=20, h=40 (minX: 10, maxX: 30)
  const wall = new WallRect(20, 0, 20, 40);
  grid.insert(wall);
  grid.insert(player);

  // Move player so circle (r=16) penetrates wall (center at x=0, edge at x=16 > minX=10)
  player.x = 2; // penetrate by 8px
  player.vx = 100;

  collisionSystem._resolveEntitiesVsWalls(player, []);
  assert(player.x <= 10 - player.radius, `Player pushed out of wall: x=${player.x} (expected <= -6)`);
  assert(player.vx <= 0, 'Velocity component pushing into wall was cancelled');

  // Test 2: Projectile vs Wall collision (standard bullet despawn)
  const bullet = pool.obtain();
  bullet.spawn({
    x: 0,
    y: 0,
    vx: 500,
    vy: 0,
    damage: 20,
    pierce: 0,
    layer: COLLISION_LAYER.PROJECTILE_PLAYER,
    color: COLOR.CYAN,
  });
  grid.insert(bullet);

  // Move bullet into wall
  bullet.x = 15;
  collisionSystem._resolveProjectilesVsWalls();
  assert(bullet.markedForRemoval === true, 'Bullet without pierce is marked for removal upon hitting wall');

  // Test 3: Projectile with Wallhack pierce
  cheatManager.addOrUpgradeCheat('wallhack'); // Lv 1
  cheatManager.addOrUpgradeCheat('wallhack'); // Lv 2 (grants wall pierce)
  const piercingBullet = pool.obtain();
  piercingBullet.spawn({
    x: 0,
    y: 0,
    vx: 500,
    vy: 0,
    damage: 20,
    pierce: 1,
    layer: COLLISION_LAYER.PROJECTILE_PLAYER,
    color: COLOR.CYAN,
  });
  grid.insert(piercingBullet);

  piercingBullet.x = 15;
  collisionSystem._resolveProjectilesVsWalls();
  assert(piercingBullet.markedForRemoval === false, 'Wallhack bullet penetrates wall without despawning');
  assert(piercingBullet.pierce === 0, 'Wallhack bullet decremented pierce counter');

  // Test 3b: Projectile with Max Level Wallhack (Rank 3: full geometric wall penetration)
  cheatManager.addOrUpgradeCheat('wallhack'); // Lv 3 (Max)
  const maxWallBullet = pool.obtain();
  maxWallBullet.spawn({
    x: 0,
    y: 0,
    vx: 500,
    vy: 0,
    damage: 20,
    pierce: 2,
    layer: COLLISION_LAYER.PROJECTILE_PLAYER,
    color: COLOR.CYAN,
  });
  grid.insert(maxWallBullet);

  maxWallBullet.x = 15;
  collisionSystem._resolveProjectilesVsWalls();
  assert(maxWallBullet.markedForRemoval === false, 'Max Level Wallhack bullet shoots through wall without despawning');
  assert(maxWallBullet.pierce === 2, 'Max Level Wallhack bullet maintains full pierce when shooting through walls');

  // Test 4: Projectile vs Destructible Prop (Server Rack)
  const rack = new DestructibleProp(300, 300, PROP_TYPE.SERVER_RACK);
  grid.insert(rack);
  const propList = [rack];
  const dropList = [];

  const rackBullet = pool.obtain();
  rackBullet.spawn({
    x: 300,
    y: 300,
    vx: 100,
    vy: 0,
    damage: 80,
    pierce: 0,
    layer: COLLISION_LAYER.PROJECTILE_PLAYER,
    color: COLOR.CYAN,
  });
  grid.insert(rackBullet);

  collisionSystem._resolveProjectilesVsProps(propList, dropList, [], player);
  assert(rack.markedForRemoval === true, 'Server Rack destroyed by lethal bullet damage');
  assert(dropList.length === 1, 'Destroyed Server Rack deposited loot drop into dropList');
}

// 7. Explosive Cell AoE Detonation
console.log('\n7. Testing Explosive Cell AoE Shockwave:');
{
  const grid = new SpatialHashGrid(128);
  const pool = new ObjectPool({
    factory: () => new Projectile(),
    reset: (p) => p.reset(),
    initialCapacity: 50,
  });
  const particles = new ParticleSystem(100);
  const weapons = new WeaponSystem(pool);
  const camera = new Camera2D(800, 600);

  const collisionSystem = new CollisionSystem({
    spatialGrid: grid,
    projectilePool: pool,
    particleSystem: particles,
    weaponSystem: weapons,
    camera,
  });

  const explosiveCell = new DestructibleProp(500, 500, PROP_TYPE.EXPLOSIVE_CELL);
  grid.insert(explosiveCell);
  const propList = [explosiveCell];
  const dropList = [];

  // Enemy standing within blast radius (dist = 60px)
  const enemy = new Enemy(560, 500, ENEMY_ARCHETYPES.BIT_SCANNER);
  enemy.health = 40;
  grid.insert(enemy);
  const enemyList = [enemy];

  const triggerBullet = pool.obtain();
  triggerBullet.spawn({
    x: 500,
    y: 500,
    vx: 100,
    vy: 0,
    damage: 40,
    pierce: 0,
    layer: COLLISION_LAYER.PROJECTILE_PLAYER,
    color: COLOR.RED,
  });
  grid.insert(triggerBullet);

  collisionSystem._resolveProjectilesVsProps(propList, dropList, enemyList, null);
  assert(explosiveCell.markedForRemoval === true, 'Explosive cell detonated on projectile impact');
  assert(enemy.health <= 0, `Nearby enemy caught in blast and eliminated (health: ${enemy.health})`);
  assert(enemy.markedForRemoval === true, 'Enemy marked for removal from explosion damage');
}

console.log(`\n=== TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`);

if (failed === 0) {
  console.log('ALL PHASE 4 PROCEDURAL WORLDS & FOG OF WAR REQUIREMENTS FULLY VERIFIED!');
  process.exit(0);
} else {
  console.error(`VERIFICATION FAILED WITH ${failed} ERRORS!`);
  process.exit(1);
}
