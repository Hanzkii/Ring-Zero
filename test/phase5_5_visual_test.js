/**
 * Ring Zero - Phase 5.5 Visual & UI Overhaul Automated Verification Suite
 * Verifies procedural vector iconography, cyber-chassis evolution, enemy daemon rendering,
 * HUD vector bounding panels, and firmware lab UI expansion.
 */

import { VectorIcons } from '../src/ui/VectorIcons.js';
import { CHEAT_REGISTRY } from '../src/cheats/CheatDefinition.js';
import { Player } from '../src/entities/Player.js';
import { Enemy, ENEMY_ARCHETYPES } from '../src/entities/Enemy.js';
import { StorageService } from '../src/services/StorageService.js';
import { SoundBank } from '../src/audio/SoundBank.js';
import { TerminalUI } from '../src/ui/TerminalUI.js';
import { COLOR } from '../src/core/Constants.js';

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failedTests++;
  }
}

// Minimal mock canvas context for headless testing
class MockCanvasContext {
  constructor() {
    this.calls = [];
    this.globalAlpha = 1.0;
    this.strokeStyle = '#000';
    this.fillStyle = '#000';
    this.lineWidth = 1;
    this.lineCap = 'butt';
    this.lineJoin = 'miter';
  }
  save() { this.calls.push('save'); }
  restore() { this.calls.push('restore'); }
  translate(x, y) { this.calls.push(`translate(${x},${y})`); }
  rotate(rad) { this.calls.push(`rotate(${rad})`); }
  scale(x, y) { this.calls.push(`scale(${x},${y})`); }
  beginPath() { this.calls.push('beginPath'); }
  closePath() { this.calls.push('closePath'); }
  moveTo(x, y) { this.calls.push(`moveTo(${x},${y})`); }
  lineTo(x, y) { this.calls.push(`lineTo(${x},${y})`); }
  arc(x, y, r, sa, ea, ac) { this.calls.push(`arc(${x},${y},${r})`); }
  ellipse(x, y, rx, ry, rot, sa, ea) { this.calls.push(`ellipse(${x},${y})`); }
  rect(x, y, w, h) { this.calls.push(`rect(${x},${y},${w},${h})`); }
  fillRect(x, y, w, h) { this.calls.push(`fillRect(${x},${y},${w},${h})`); }
  strokeRect(x, y, w, h) { this.calls.push(`strokeRect(${x},${y},${w},${h})`); }
  stroke() { this.calls.push('stroke'); }
  fill() { this.calls.push('fill'); }
  setLineDash(arr) { this.calls.push(`setLineDash(${arr.length})`); }
  fillText(txt, x, y) { this.calls.push(`fillText(${txt})`); }
  strokeText(txt, x, y) { this.calls.push(`strokeText(${txt})`); }
  quadraticCurveTo(cx, cy, x, y) { this.calls.push(`quadraticCurveTo(${cx},${cy},${x},${y})`); }
}

console.log('=== RUNNING PHASE 5.5 VISUAL & UI OVERHAUL SUITE ===\n');

// 1. Procedural Vector Iconography
console.log('1. Testing Procedural Vector Iconography (VectorIcons.js):');
const mockCtx = new MockCanvasContext();

const exploitKeys = Object.keys(CHEAT_REGISTRY);
assert(exploitKeys.length >= 16, `CHEAT_REGISTRY contains exploits for icon synthesis (found: ${exploitKeys.length})`);

for (const key of exploitKeys) {
  const cheat = CHEAT_REGISTRY[key];
  const initialCallCount = mockCtx.calls.length;
  VectorIcons.draw(mockCtx, cheat.id, 50, 50, 48, cheat.color || COLOR.CYAN);
  assert(mockCtx.calls.length > initialCallCount, `VectorIcons synthesized vector paths for [${cheat.id}]`);
}

// Fallback icon check
const fallbackCalls = mockCtx.calls.length;
VectorIcons.draw(mockCtx, 'unknown_exploit_id', 50, 50, 32, COLOR.CYAN);
assert(mockCtx.calls.length > fallbackCalls, 'VectorIcons draws fallback chip for unknown id without throwing');

// 2. Cyber-Chassis & Thrusters
console.log('\n2. Testing Cyber-Chassis Kinematics & Thruster Visuals:');
const player = new Player(100, 100);
assert(typeof player.animTime === 'number', 'Player tracks continuous animTime for thrusters & aura');

player.updateKinematics(0.016, { x: 1, y: 0, magSq: () => 1 }, 0);
assert(player.animTime > 0, 'Player animTime advances during kinematics update');

const playerCtx = new MockCanvasContext();
player.render(playerCtx, 1.0);
assert(playerCtx.calls.some((c) => c.includes('translate')), 'Player render executes world coordinate translations');
assert(playerCtx.calls.some((c) => c === 'stroke'), 'Player render executes chassis vector strokes');

// Dash state thruster plume check
player.dash({ x: 1, y: 0, magSq: () => 1 });
assert(player.isDashing, 'Player successfully entered dash state');
player.render(playerCtx, 1.0);
assert(playerCtx.calls.some((c) => c === 'fill'), 'Player renders filled booster flame during dash state');

// 3. Security Daemon Archetype Renders
console.log('\n3. Testing Security Daemon Archetype Render Passes:');
const archetypes = [
  ENEMY_ARCHETYPES.BIT_SCANNER,
  ENEMY_ARCHETYPES.WATCHDOG,
  ENEMY_ARCHETYPES.MEMORY_LEAK,
  ENEMY_ARCHETYPES.SENTINEL,
];

for (const arch of archetypes) {
  const enemy = new Enemy(200, 200, arch);
  const enemyCtx = new MockCanvasContext();
  enemy.render(enemyCtx, 1.0);
  assert(enemyCtx.calls.length > 5, `Daemon [${arch.type}] rendered multi-segment vector wireframes`);
}

// 4. Firmware Lab UI Expansion
console.log('\n4. Testing Firmware Lab Rank Pips & Balance Previews:');
// Mock storage for headless environment
class MockLocalStorage {
  constructor() { this.store = {}; }
  getItem(k) { return this.store[k] || null; }
  setItem(k, v) { this.store[k] = String(v); }
  removeItem(k) { delete this.store[k]; }
}
globalThis.localStorage = new MockLocalStorage();

const storage = new StorageService();
storage.cryptoBounties = 1000;
storage.upgradeFirmware('bufferExpansion');
const soundBank = new SoundBank();

// Mock DOM container
const mockContainer = {
  innerHTML: '',
  querySelectorAll: () => [],
};

const terminalUI = new TerminalUI({ storage, soundBank, onExecuteRun: () => {} });
terminalUI._renderFirmwareTab(mockContainer);

assert(mockContainer.innerHTML.includes('■'), 'Firmware tab renders filled vector rank pips (■)');
assert(mockContainer.innerHTML.includes('□'), 'Firmware tab renders empty vector rank pips (□)');
assert(mockContainer.innerHTML.includes('BTC'), 'Firmware tab renders real-time crypto balance preview');
assert(mockContainer.innerHTML.includes('►'), 'Firmware tab renders stat comparison preview (►)');

console.log(`\n=== PHASE 5.5 SUITE SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED ===\n`);
if (failedTests > 0) {
  process.exit(1);
}
