/**
 * Ring Zero - Phase 1 Verification Test Suite
 * Executes in Node.js to verify mathematical invariants, spatial hashing, and pool allocations.
 */

import { Vec2, normalizeAngle, angleDiff, lerp, clamp } from '../src/core/VectorMath.js';
import { SpatialHashGrid } from '../src/systems/SpatialHashGrid.js';
import { ObjectPool } from '../src/core/ObjectPool.js';
import { Camera2D } from '../src/core/Camera2D.js';
import { Entity } from '../src/entities/Entity.js';
import { Player } from '../src/entities/Player.js';
import { COLLISION_LAYER } from '../src/core/Constants.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  [PASS] ${message}`);
  } else {
    failed++;
    console.error(`  [FAIL] ${message}`);
  }
}

console.log('=== RUNNING PHASE 1 AUTOMATED VERIFICATION ===\n');

// 1. Vector Math Tests
console.log('1. Testing VectorMath:');
{
  const v1 = new Vec2(3, 4);
  assert(v1.mag() === 5, 'Vec2.mag() computes 5 for (3, 4)');

  v1.normalize();
  assert(Math.abs(v1.mag() - 1.0) < 0.0001, 'Vec2.normalize() yields unit length');
  assert(Math.abs(v1.x - 0.6) < 0.0001 && Math.abs(v1.y - 0.8) < 0.0001, 'Vec2 normalized components (0.6, 0.8)');

  const dot = new Vec2(1, 0).dot(new Vec2(0, 1));
  assert(dot === 0, 'Perpendicular dot product is 0');

  const diff = angleDiff(Math.PI * 0.9, -Math.PI * 0.9);
  assert(Math.abs(diff - 0.2 * Math.PI) < 0.0001, 'Angle wrap-around difference is minimal');

  const c = clamp(15, 0, 10);
  assert(c === 10, 'clamp() limits upper bound');
}

// 2. Spatial Hash Grid Tests
console.log('\n2. Testing SpatialHashGrid:');
{
  const grid = new SpatialHashGrid(128);
  const e1 = new Entity(100, 100, 16, COLLISION_LAYER.ENEMY);
  const e2 = new Entity(150, 100, 16, COLLISION_LAYER.ENEMY);
  const eFar = new Entity(1000, 1000, 16, COLLISION_LAYER.ENEMY);

  grid.insert(e1);
  grid.insert(e2);
  grid.insert(eFar);

  assert(grid.totalTrackedEntities === 3, 'Grid accurately tracks 3 inserted entities');

  // Query around (100, 100) with radius 80
  const results = grid.queryRadius(100, 100, 80);
  assert(results.includes(e1), 'Query finds e1 within radius');
  assert(results.includes(e2), 'Query finds e2 within radius');
  assert(!results.includes(eFar), 'Query correctly excludes distant eFar');

  // Move e1 far away
  e1.x = 2000;
  e1.y = 2000;
  grid.update(e1);

  const newResults = grid.queryRadius(100, 100, 80);
  assert(!newResults.includes(e1), 'Updated position removes e1 from old cell query');

  // Remove e2
  grid.remove(e2);
  assert(grid.totalTrackedEntities === 2, 'Grid tracks 2 entities after removal');
}

// 3. Object Pool Tests
console.log('\n3. Testing ObjectPool:');
{
  let resetCount = 0;
  const pool = new ObjectPool({
    factory: () => ({ val: 0, active: false }),
    reset: (item) => {
      item.val = 0;
      item.active = false;
      resetCount++;
    },
    initialCapacity: 10,
    maxCapacity: 20,
  });

  assert(pool.availableCount === 10, 'Initial pool size is 10');
  assert(pool.activeCount === 0, 'Initial active count is 0');

  const item1 = pool.obtain();
  item1.val = 42;
  item1.active = true;

  assert(pool.activeCount === 1, 'Active count increments to 1 on obtain');
  assert(pool.availableCount === 9, 'Available pool decrements to 9');

  pool.release(item1);
  assert(pool.activeCount === 0, 'Active count returns to 0 on release');
  assert(pool.availableCount === 10, 'Available count returns to 10 on release');
  assert(item1.val === 0, 'Reset callback reset properties on release');
  assert(resetCount === 1, 'Reset callback was invoked once');
}

// 4. Camera2D Coordinate Projection Tests
console.log('\n4. Testing Camera2D Projection:');
{
  const camera = new Camera2D(800, 600);
  camera.pos.set(200, 300);

  const screenP = new Vec2();
  camera.worldToScreen(200, 300, screenP);
  assert(screenP.x === 400 && screenP.y === 300, 'World origin transforms to screen center');

  const worldP = new Vec2();
  camera.screenToWorld(400, 300, worldP);
  assert(worldP.x === 200 && worldP.y === 300, 'Screen center transforms back to world position');
}

// 5. Player Kinematics & Dash Tests
console.log('\n5. Testing Player Kinematics:');
{
  const player = new Player(0, 0);
  const moveDir = new Vec2(1, 0);

  // Accelerate for 0.1s
  player.updateKinematics(0.1, moveDir, 0);
  assert(player.vx > 0, 'Player gains positive velocity in X direction');
  assert(player.x > 0, 'Player position advances');

  // Trigger dash
  const dashSuccess = player.dash(new Vec2(1, 0));
  assert(dashSuccess === true, 'Dash activates successfully when ready');
  assert(player.isDashing === true, 'Player enters dashing state');
  assert(player.dashReady === false, 'Dash enters cooldown state');

  const secondDash = player.dash(new Vec2(1, 0));
  assert(secondDash === false, 'Second immediate dash is prevented by cooldown');
}

console.log(`\n=== TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('ALL PHASE 1 ENGINE INVARIANTS VERIFIED SUCCESSFULLY!');
}
