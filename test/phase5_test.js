/**
 * Ring Zero - Phase 5 Automated Verification Suite
 * Tests:
 * 1. Web Audio Synthesizer & SoundBank headless execution
 * 2. Persistent Storage Service, Schema & Privilege Escalation
 * 3. Privilege Hierarchy & Clearance Filtering in CheatManager & Weapon Drops
 * 4. Risk Multipliers & Anti-Cheat Daemons
 * 5. Leaderboard Service & SHA-256 Cryptographic Run Verification
 */

import { SynthAudio } from '../src/audio/SynthAudio.js';
import { SoundBank } from '../src/audio/SoundBank.js';
import { StorageService } from '../src/services/StorageService.js';
import { LeaderboardService } from '../src/services/LeaderboardService.js';
import { CheatManager } from '../src/systems/CheatManager.js';
import { RING_TIER } from '../src/cheats/CheatDefinition.js';
import { Enemy, ENEMY_ARCHETYPES } from '../src/entities/Enemy.js';

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

// In-memory mock localStorage for Node.js test environment
const mockStorage = new Map();
globalThis.localStorage = {
  getItem: (k) => mockStorage.get(k) || null,
  setItem: (k, v) => mockStorage.set(k, String(v)),
  removeItem: (k) => mockStorage.delete(k),
  clear: () => mockStorage.clear(),
};

console.log('=== RUNNING PHASE 5 AUTOMATED VERIFICATION ===\n');

// 1. Audio Synthesizer & SoundBank
console.log('1. Testing Web Audio API Synthesizer & SoundBank:');
{
  const synth = new SynthAudio();
  assert(synth !== null, 'SynthAudio instance created');
  assert(synth.ctx === null, 'AudioContext initially null prior to user gesture');

  const soundBank = new SoundBank(synth);
  assert(soundBank !== null, 'SoundBank instance created');

  // Test that all sound triggers execute safely headlessly without unhandled throws
  let threw = false;
  try {
    soundBank.playShoot('kernel_pistol', false);
    soundBank.playShoot('vector_railgun', true);
    soundBank.playHit();
    soundBank.playExplosion(false);
    soundBank.playExplosion(true);
    soundBank.playLockOn();
    soundBank.playWallhackPulse();
    soundBank.playGlitch();
    soundBank.playLevelUp();
    soundBank.playDash();
    soundBank.playReloadStart();
    soundBank.playReloadDone();
    soundBank.playUIClick();
    soundBank.playUIError();
  } catch (err) {
    threw = true;
    console.error(err);
  }
  assert(!threw, 'All 14 SoundBank triggers execute without error prior to gesture');
}

// 2. Persistent Storage Service & Schema
console.log('\n2. Testing Persistent Storage Service & Schema:');
{
  mockStorage.clear();
  const storage = new StorageService();

  assert(storage.clearanceRing === RING_TIER.RING_3, 'Default clearance ring is Ring 3 (Userland)');
  assert(storage.cryptoBounties === 0, 'Default crypto bounties is 0');
  assert(storage.highScore === 0, 'Default high score is 0');
  assert(storage.highestWave === 0, 'Default highest wave is 0');
  assert(storage.getClearanceName() === 'RING 3 [USERLAND]', 'Clearance name reports RING 3 [USERLAND]');

  // Test Risk Multipliers
  assert(storage.getRiskMultiplier() === 1.0, 'Initial risk multiplier is 1.0x');
  storage.setRiskModifier('watchdogAI', true);
  assert(storage.getRiskMultiplier() === 1.25, 'watchdogAI adds +0.25 (1.25x)');
  storage.setRiskModifier('integrityShield', true);
  assert(storage.getRiskMultiplier() === 1.6, 'integrityShield adds +0.35 (1.60x)');
  storage.setRiskModifier('kernelPurge', true);
  assert(Math.abs(storage.getRiskMultiplier() - 2.1) < 0.001, 'kernelPurge adds +0.50 (2.10x)');

  // Test Privilege Escalation logic
  assert(!storage.escalatePrivilege(RING_TIER.RING_2), 'Cannot escalate to Ring 2 with 0 bounties');
  assert(storage.clearanceRing === RING_TIER.RING_3, 'Clearance remains Ring 3');

  // Add bounties
  storage.cryptoBounties = 500;
  assert(!storage.escalatePrivilege(RING_TIER.RING_0), 'Cannot skip rings (cannot escalate directly to Ring 0 from Ring 3)');
  assert(storage.escalatePrivilege(RING_TIER.RING_2), 'Successfully escalated to Ring 2 (Driver Space)');
  assert(storage.clearanceRing === RING_TIER.RING_2, 'Clearance updated to Ring 2');
  assert(storage.cryptoBounties === 150, 'Bounties deducted correctly (500 - 350 = 150)');

  // Next escalation to Ring 1
  storage.cryptoBounties += 800; // 950 total
  assert(storage.escalatePrivilege(RING_TIER.RING_1), 'Successfully escalated to Ring 1 (Hypervisor Space)');
  assert(storage.clearanceRing === RING_TIER.RING_1, 'Clearance updated to Ring 1');
  assert(storage.cryptoBounties === 100, 'Bounties deducted correctly (950 - 850 = 100)');

  // Final escalation to Ring 0
  storage.cryptoBounties += 2000;
  assert(storage.escalatePrivilege(RING_TIER.RING_0), 'Successfully escalated to Ring 0 (Kernel Execution)');
  assert(storage.clearanceRing === RING_TIER.RING_0, 'Clearance updated to Ring 0');
  assert(storage.getClearanceName() === 'RING 0 [KERNEL SPACE]', 'Clearance name reports RING 0 [KERNEL SPACE]');

  // Test run recording
  storage.recordRun({ score: 45000, wavesCleared: 12, bountiesEarned: 220 });
  assert(storage.highScore === 45000, 'High score updated to 45000');
  assert(storage.highestWave === 12, 'Highest wave updated to 12');
}

// 3. Privilege Escalation & Ring Hierarchy Filtering
console.log('\n3. Testing Privilege Hierarchy & Clearance Filtering:');
{
  const manager = new CheatManager();

  // Test Ring 3 Filtering
  manager.clearanceRing = RING_TIER.RING_3;
  const ring3Options = manager.generateDraftOptions(10);
  const ring3Ids = ring3Options.map((o) => o.def.id);
  assert(ring3Ids.includes('aimbot'), 'Ring 3 draft pool includes Aimbot');
  assert(ring3Ids.includes('wallhack'), 'Ring 3 draft pool includes Wallhack');
  assert(ring3Ids.includes('overclock_dash'), 'Ring 3 draft pool includes Overclocked Dash');
  assert(!ring3Ids.includes('doubletap'), 'Ring 3 draft pool excludes DoubleTap (Ring 2)');
  assert(!ring3Ids.includes('backtrack'), 'Ring 3 draft pool excludes Backtrack (Ring 2)');
  assert(!ring3Ids.includes('spinbot'), 'Ring 3 draft pool excludes Spinbot (Ring 1)');
  assert(!ring3Ids.includes('silentaim'), 'Ring 3 draft pool excludes SilentAim (Ring 0)');

  // Test Ring 2 Filtering
  manager.clearanceRing = RING_TIER.RING_2;
  const ring2Options = manager.generateDraftOptions(10);
  const ring2Ids = ring2Options.map((o) => o.def.id);
  assert(ring2Ids.includes('doubletap'), 'Ring 2 draft pool unlocks DoubleTap');
  assert(ring2Ids.includes('backtrack'), 'Ring 2 draft pool unlocks Backtrack');
  assert(!ring2Ids.includes('spinbot'), 'Ring 2 draft pool excludes Spinbot (Ring 1)');
  assert(!ring2Ids.includes('silentaim'), 'Ring 2 draft pool excludes SilentAim (Ring 0)');

  // Test Ring 1 Filtering
  manager.clearanceRing = RING_TIER.RING_1;
  const ring1Options = manager.generateDraftOptions(10);
  const ring1Ids = ring1Options.map((o) => o.def.id);
  assert(ring1Ids.includes('spinbot'), 'Ring 1 draft pool unlocks Spinbot');
  assert(!ring1Ids.includes('silentaim'), 'Ring 1 draft pool excludes SilentAim (Ring 0)');

  // Test Ring 0 Filtering
  manager.clearanceRing = RING_TIER.RING_0;
  const ring0Options = manager.generateDraftOptions(10);
  const ring0Ids = ring0Options.map((o) => o.def.id);
  assert(ring0Ids.includes('silentaim'), 'Ring 0 draft pool unlocks SilentAim');
}

// 4. Weapon Drop Filtering by Clearance Ring
console.log('\n4. Testing Weapon Drop Filtering by Clearance Ring:');
{
  const enemy = new Enemy(0, 0, ENEMY_ARCHETYPES.WATCHDOG);
  enemy.crateDropChance = 1.0; // Guarantee weapon drop for test

  // Test Ring 3 weapon drops
  const ring3Weapons = new Set();
  for (let i = 0; i < 60; i++) {
    const drops = enemy.generateDrops(RING_TIER.RING_3);
    const weaponDrop = drops.find((d) => d.type === 'WEAPON');
    if (weaponDrop) ring3Weapons.add(weaponDrop.weapon.id);
  }
  assert(ring3Weapons.has('kernel_pistol') || ring3Weapons.has('combat_sweeper'), 'Ring 3 drops starter weapons');
  assert(!ring3Weapons.has('flak_submachine'), 'Ring 3 drops do NOT include Flak Submachine');
  assert(!ring3Weapons.has('vector_railgun'), 'Ring 3 drops do NOT include Vector Railgun');

  // Test Ring 2 weapon drops
  const ring2Weapons = new Set();
  for (let i = 0; i < 80; i++) {
    const drops = enemy.generateDrops(RING_TIER.RING_2);
    const weaponDrop = drops.find((d) => d.type === 'WEAPON');
    if (weaponDrop) ring2Weapons.add(weaponDrop.weapon.id);
  }
  assert(ring2Weapons.has('flak_submachine'), 'Ring 2 drops unlock Flak Submachine');

  // Test Ring 1 weapon drops
  const ring1Weapons = new Set();
  for (let i = 0; i < 80; i++) {
    const drops = enemy.generateDrops(RING_TIER.RING_1);
    const weaponDrop = drops.find((d) => d.type === 'WEAPON');
    if (weaponDrop) ring1Weapons.add(weaponDrop.weapon.id);
  }
  assert(ring1Weapons.has('vector_railgun'), 'Ring 1 drops unlock Vector Railgun');
}

// 5. Leaderboard & Cryptographic SHA-256 Checksum Service
console.log('\n5. Testing Leaderboard & Cryptographic Verification:');
(async () => {
  const lb = new LeaderboardService();

  const runSample = {
    score: 52400,
    wavesCleared: 16,
    clearanceRing: 1,
    bountiesEarned: 340,
    accuracy: 88.5,
    riskMultiplier: 1.6,
  };

  const checksum1 = await lb.computeChecksum(runSample);
  assert(typeof checksum1 === 'string' && checksum1.length >= 16, 'Computed SHA-256 verification checksum string');

  // Test determinism
  const checksum2 = await lb.computeChecksum(runSample);
  assert(checksum1 === checksum2, 'Checksum is completely deterministic for identical run data');

  // Test tampering detection
  const tamperedRun = { ...runSample, score: 999999 };
  const tamperedChecksum = await lb.computeChecksum(tamperedRun);
  assert(checksum1 !== tamperedChecksum, 'Tampering run score drastically alters verification checksum');

  const isValidOriginal = await lb.verifyChecksum({ ...runSample, checksum: checksum1 });
  assert(isValidOriginal, 'verifyChecksum validates authentic checksum');

  const isValidTampered = await lb.verifyChecksum({ ...tamperedRun, checksum: checksum1 });
  assert(!isValidTampered, 'verifyChecksum rejects tampered score with stale checksum');

  // Test score submission and top scores
  const submitResult = await lb.submitScore({
    callsign: 'TEST_AGENT',
    score: 65000,
    wavesCleared: 20,
    clearanceRing: 0,
    accuracy: 92.4,
    riskMultiplier: 1.75,
    bountiesEarned: 400,
  });

  assert(submitResult.success, 'Score submitted successfully');
  assert(submitResult.rank >= 1, `Assigned leaderboard rank #${submitResult.rank}`);

  const topScores = await lb.fetchTopScores(10);
  assert(topScores.length > 0, 'Fetched top scores list');
  assert(topScores[0].score >= topScores[1].score, 'Top scores are strictly sorted descending');
  assert(topScores.some((s) => s.callsign === 'TEST_AGENT'), 'Submitted score appears in top rankings');

  console.log(`\n=== TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed === 0) {
    console.log('ALL PHASE 5 REQUIREMENTS FULLY VERIFIED!');
  } else {
    process.exit(1);
  }
})();
