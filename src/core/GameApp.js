/**
 * Ring Zero - Main Game Application Coordinator
 * State machine, high-DPI canvas orchestration, fixed simulation dispatch, and vector telemetry rendering.
 */

import { SIMULATION, COLOR, WORLD, COLLISION_LAYER, PLAYER_CONFIG, CLEARANCE_RING, SECTOR_THEMES } from './Constants.js';
import { GameLoop } from './GameLoop.js';
import { InputManager } from './InputManager.js';
import { Camera2D } from './Camera2D.js';
import { ObjectPool } from './ObjectPool.js';
import { SpatialHashGrid } from '../systems/SpatialHashGrid.js';
import { ParticleSystem } from '../systems/ParticleSystem.js';
import { WeaponSystem } from '../systems/WeaponSystem.js';
import { WaveManager, WAVE_STATE } from '../systems/WaveManager.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { CheatManager } from '../systems/CheatManager.js';
import { DraftModal } from '../ui/DraftModal.js';
import { PauseOverlay } from '../ui/PauseOverlay.js';
import { SettingsModal } from '../ui/SettingsModal.js';
import { Player } from '../entities/Player.js';
import { Projectile } from '../entities/Projectile.js';
import { Enemy } from '../entities/Enemy.js';
import { Drop } from '../entities/Drop.js';
import { VectorRenderer } from '../ui/VectorRenderer.js';
import { Vec2 } from './VectorMath.js';
import { BSPFacilityMap } from '../world/BSPFacilityMap.js';
import { CellularCavernMap } from '../world/CellularCavernMap.js';
import { Raycaster2D } from '../world/Raycaster2D.js';
import { SoundBank } from '../audio/SoundBank.js';
import { StorageService } from '../services/StorageService.js';
import { LeaderboardService } from '../services/LeaderboardService.js';
import { TerminalUI } from '../ui/TerminalUI.js';
import { WEAPON_ARCHETYPES, WeaponInstance, getUnlockedWeaponsForWave, getEscalationWeaponsForRing } from '../systems/WeaponSystem.js';
import { PickupSystem } from '../systems/PickupSystem.js';
import { SynthMusic, MUSIC_INTENSITY } from '../audio/SynthMusic.js';
import { DebugRenderer } from '../ui/DebugRenderer.js';
import { DebugConsole } from '../ui/DebugConsole.js';
import { ArsenalModal } from '../ui/ArsenalModal.js';
import { AchievementSystem } from '../systems/AchievementSystem.js';

export const APP_STATE = {
  BOOT: 'BOOT',
  RUN: 'RUN',
  DRAFT: 'DRAFT',
  PAUSED: 'PAUSED',
  ARSENAL: 'ARSENAL',
  ESCALATION_DRAFT: 'ESCALATION_DRAFT',
  GAMEOVER: 'GAMEOVER',
};

export class GameApp {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {HTMLElement} [hudRoot]
   */
  constructor(canvas, hudRoot = null) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.hudRoot = hudRoot;

    this.state = APP_STATE.BOOT;
    this.showSpatialGridDebug = false;

    // Run Telemetry & Scoring
    this.score = 0;
    this.stats = {
      shotsFired: 0,
      shotsHit: 0,
      enemiesKilled: 0,
    };

    // Subsystems
    this.input = new InputManager(canvas);
    this.camera = new Camera2D(window.innerWidth, window.innerHeight);
    this.spatialGrid = new SpatialHashGrid(128);

    // Audio Synthesis, Storage & Terminal UI Subsystems
    this.soundBank = new SoundBank();
    this.synthMusic = new SynthMusic({ synth: this.soundBank.synth });
    this.storage = new StorageService();
    this.leaderboard = new LeaderboardService();
    this.pickupSystem = new PickupSystem({ storage: this.storage });

    // Sync input sensitivity from persistent storage
    this.input.setSensitivity(this.storage.settings?.mouseSensitivity ?? 1.0);

    this.cheatManager = new CheatManager();
    this.cheatManager.clearanceRing = this.storage.clearanceRing;

    this.draftRerollTokens = 0;

    this.draftModal = new DraftModal(
      document.body,
      (chosenDef) => this.onExploitDrafted(chosenDef),
      () => this.onDraftReroll()
    );

    this.arsenalModal = new ArsenalModal(
      document.body,
      (slot1Config, slot2Config) => this.onArsenalConfirmed(slot1Config, slot2Config)
    );

    this.settingsModal = new SettingsModal({
      storage: this.storage,
      synth: this.soundBank.synth,
      soundBank: this.soundBank,
      camera: this.camera,
      input: this.input,
      synthMusic: this.synthMusic,
      onGridDebugToggle: (val) => {
        this.showSpatialGridDebug = val;
      },
    });

    // Sync debug grid setting
    this.showSpatialGridDebug = !!this.storage.settings?.showDebugGrid;

    this.achievementSystem = new AchievementSystem({
      soundBank: this.soundBank,
    });

    this.terminalUI = new TerminalUI({
      storage: this.storage,
      soundBank: this.soundBank,
      leaderboard: this.leaderboard,
      achievementSystem: this.achievementSystem,
      onStartRun: () => this.start(),
      onRestartRun: () => this.restart(),
      onOpenSettings: () => this.openSettings(),
    });

    // World bounds
    this.worldBounds = {
      minX: -WORLD.DEFAULT_WIDTH * 0.5,
      minY: -WORLD.DEFAULT_HEIGHT * 0.5,
      maxX: WORLD.DEFAULT_WIDTH * 0.5,
      maxY: WORLD.DEFAULT_HEIGHT * 0.5,
    };
    this.camera.setBounds(
      this.worldBounds.minX,
      this.worldBounds.minY,
      this.worldBounds.maxX,
      this.worldBounds.maxY
    );

    // Entities & Pools
    this.player = new Player(0, 0);
    this.spatialGrid.insert(this.player);

    /** @type {Enemy[]} */
    this.enemies = [];
    /** @type {Drop[]} */
    this.drops = [];

    // Preallocated Bullet & Particle Pools
    this.projectilePool = new ObjectPool({
      factory: () => new Projectile(),
      reset: (p) => p.reset(),
      initialCapacity: 500,
      maxCapacity: 1200,
    });
    this.particleSystem = new ParticleSystem(1024);

    // Weapon & Wave Systems
    this.weaponSystem = new WeaponSystem(this.projectilePool);
    this.weaponSystem.onFire = (weapon) => {
      this.stats.shotsFired++;
      const isCrit = this.cheatManager.hasCheat('silentaim');
      this.soundBank.playShoot(weapon.id, isCrit);
    };
    this.weaponSystem.onReloadStart = () => {
      this.soundBank.playReloadStart();
    };
    this.weaponSystem.onReloadDone = () => {
      this.soundBank.playReloadDone();
    };

    this.pauseOverlay = new PauseOverlay({
      cheatManager: this.cheatManager,
      weaponSystem: this.weaponSystem,
      soundBank: this.soundBank,
      onResume: () => this.resumeSimulation(),
      onOpenSettings: () => this.openSettings(),
      onOpenDebugConsole: () => this.openDebugConsole(),
      onAbortRun: () => this.abortRun(),
    });

    this.weaponSystem.fireInterceptor = (bulletParams, spawnCb) => {
      this.cheatManager.applyWeaponFireInterceptors(
        bulletParams,
        {
          player: this.player,
          spatialGrid: this.spatialGrid,
          weapon: this.weaponSystem.activeWeapon,
          projectilePool: this.projectilePool,
          camera: this.camera,
        },
        spawnCb
      );
    };

    this._lastMusicWave = 0;
    this.cheatedThisRun = false;
    this.clearanceRing = 2;
    this.currentSectorTheme = SECTOR_THEMES[CLEARANCE_RING.RING_2];
    this.ringTransitionTimer = 0;
    this.hazards = [];

    this._onSentinelShoot = (pulseParams) => {
      const p = this.projectilePool.obtain();
      if (p) p.spawn(pulseParams);
    };
    this.waveManager = new WaveManager({
      onSpawnEnemy: (enemy) => this.spawnEnemy(enemy),
    });
    this.waveManager.onWaveCleared = (waveNum) => {
      const bonusBounties = 30 + waveNum * 20;
      this.player.bounties = (this.player.bounties || 0) + bonusBounties;
      this.score += 250 * waveNum;

      // Combat sustain: restore +35% max HP upon clearing each wave
      const healAmount = Math.round(this.player.maxHealth * 0.35);
      this.player.health = Math.min(this.player.maxHealth, this.player.health + healAmount);
      this.particleSystem.emitBurst(this.player.x, this.player.y, 20, COLOR.GREEN, 320);

      this.soundBank.playWallhackPulse();

      // Notify achievements
      const acc = this.stats.shotsFired > 0 ? (this.stats.shotsHit / this.stats.shotsFired) * 100 : 0;
      const hasSilent = this.cheatManager.hasCheat('silentaim');
      const fwCount = Object.values(this.storage.firmware || {}).reduce((a, b) => a + b, 0);
      this.achievementSystem?.onWaveCompleted(waveNum, acc, hasSilent, fwCount);
      this.achievementSystem?.onBountiesUpdated(this.storage.cryptoBounties + (this.player.bounties || 0));

      // Milestone waves (Wave 3, Wave 6, Wave 10) trigger Arsenal Selection
      if (waveNum === 3 || waveNum === 6 || waveNum === 10) {
        this.openArsenalModal(waveNum);
      } else if (waveNum === 15) {
        this.elevateClearance(1);
      } else if (waveNum === 30) {
        this.elevateClearance(0);
      }
    };

    // Collision Arbiter
    this.collisionSystem = new CollisionSystem({
      spatialGrid: this.spatialGrid,
      projectilePool: this.projectilePool,
      particleSystem: this.particleSystem,
      weaponSystem: this.weaponSystem,
      camera: this.camera,
      cheatManager: this.cheatManager,
      soundBank: this.soundBank,
      achievementSystem: this.achievementSystem,
      onSpawnHazard: (x, y, r, d, dps) => this.spawnHazard(x, y, r, d, dps),
    });

    // Procedural World Architecture & Raycasting
    this.raycaster = new Raycaster2D(950);
    this.currentBiome = 'facility';
    this.currentSeed = 1337;
    this.props = [];
    this.map = null;
    this.loadMap(this.currentBiome, this.currentSeed);

    // Developer Diagnostic Visualizer & Authenticated Debug Console
    this.debugRenderer = new DebugRenderer();
    this.debugConsole = new DebugConsole({
      gameApp: this,
      debugRenderer: this.debugRenderer,
    });

    // Game loop setup
    this.loop = new GameLoop({
      onUpdate: (dt) => this.update(dt),
      onRender: (alpha) => this.render(alpha),
    });
    this.collisionSystem.loop = this.loop;

    // Resize handling
    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);
    this._onResize();
  }

  _onResize() {
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);

    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.camera.resize(width, height, dpr);
  }

  /**
   * Loads or switches procedural map architecture and updates spatial grid
   * @param {string} biomeType - 'facility' or 'cavern'
   * @param {number} [seed=1337]
   */
  loadMap(biomeType, seed = 1337) {
    if (this.map) {
      for (const wall of this.map.walls) {
        this.spatialGrid.remove(wall);
      }
      for (const prop of this.props) {
        this.spatialGrid.remove(prop);
      }
    }

    this.currentBiome = biomeType;
    this.currentSeed = seed;

    if (biomeType === 'cavern') {
      this.map = new CellularCavernMap(seed);
    } else {
      this.map = new BSPFacilityMap(seed);
    }

    this.props = this.map.props;

    for (const wall of this.map.walls) {
      this.spatialGrid.insert(wall);
    }
    for (const prop of this.props) {
      this.spatialGrid.insert(prop);
    }
  }

  /**
   * Spawns a lingering area hazard that damages the player on contact
   * @param {number} x
   * @param {number} y
   * @param {number} [radius=55]
   * @param {number} [duration=3.0]
   * @param {number} [dps=30]
   */
  spawnHazard(x, y, radius = 55, duration = 3.0, dps = 30) {
    this.hazards.push({
      x,
      y,
      radius,
      duration,
      maxDuration: duration,
      dps,
    });
  }

  /**
   * Elevates clearance ring (Supervisor Ring 1 or Pure Kernel Ring 0)
   * @param {number} targetRing - 1 (Supervisor) or 0 (Pure Kernel)
   */
  elevateClearance(targetRing) {
    this.clearanceRing = targetRing;
    const ringKey = targetRing === 0 ? CLEARANCE_RING.RING_0 : CLEARANCE_RING.RING_1;
    this.currentSectorTheme = SECTOR_THEMES[ringKey];
    this.ringTransitionTimer = 0.5;

    // Full integrity restore & camera punch
    this.player.health = this.player.maxHealth;
    this.camera.addTrauma(0.5);

    // Crossfade into aggressive sector darksynth OST
    if (this.synthMusic) {
      this.synthMusic.crossfadeToTrack(this.currentSectorTheme.track, 1.0);
    }

    // Elevate cheat manager clearance and persistent storage
    this.cheatManager.clearanceRing = targetRing;
    this.storage.setClearanceRing(targetRing);

    // Dynamic arena shift: Supervisor -> Cavern chokepoints; Kernel -> High-density Facility core
    const newBiome = targetRing === 0 ? 'facility' : 'cavern';
    this.loadMap(newBiome, 8192 + targetRing);

    // Trigger Clearance Escalation Weapon Draft
    this.state = APP_STATE.ESCALATION_DRAFT;
    const weapons = getEscalationWeaponsForRing(targetRing);
    this.draftModal.openEscalationDraft({
      targetRing,
      weapons,
      currentWeapon: this.weaponSystem.activeWeapon,
      onSelectWeapon: (chosenWpn) => {
        this.weaponSystem.setSlot(1, new WeaponInstance(chosenWpn));
        this.state = APP_STATE.RUN;
      },
      onKeepCurrent: () => {
        this.storage.addCrypto(2500);
        this.soundBank?.playPurchase();
        this.state = APP_STATE.RUN;
      },
    });
  }

  /**
   * Spawns an enemy into the simulation and registers it with the spatial grid
   * @param {Enemy} enemy
   */
  spawnEnemy(enemy) {
    if (this.storage?.riskModifiers?.watchdogAI) {
      enemy.speed *= 1.25;
    }
    if (this.storage?.riskModifiers?.integrityShield) {
      enemy.maxHealth = Math.floor(enemy.maxHealth * 1.5);
      enemy.health = enemy.maxHealth;
    }
    this.enemies.push(enemy);
    this.spatialGrid.insert(enemy);
  }

  /**
   * Applies permanent firmware upgrades to player cyber-chassis and systems
   */
  applyFirmwareBonuses() {
    const hpBonus = this.storage.getFirmwareBonus('bufferExpansion');
    this.player.baseMaxHealth = PLAYER_CONFIG.MAX_HEALTH + hpBonus;
    this.player.maxHealth = this.player.baseMaxHealth;
    this.player.health = this.player.maxHealth;

    const speedBonus = this.storage.getFirmwareBonus('overclockedBus');
    this.player.baseMaxSpeed = PLAYER_CONFIG.MAX_SPEED + speedBonus;
    this.player.maxSpeed = this.player.baseMaxSpeed;

    const magnetBonus = this.storage.getFirmwareBonus('cacheMagnet');
    this.player.baseMagnetRadius = 180 + magnetBonus;
    this.player.magnetRadius = this.player.baseMagnetRadius;

    this.draftRerollTokens = this.storage.getFirmwareBonus('heuristicSpoofing');
  }

  /**
   * Rerolls available exploit drafting choices using a Heuristic Spoofing token
   * @returns {boolean}
   */
  onDraftReroll() {
    if (this.draftRerollTokens <= 0) return false;
    this.draftRerollTokens--;
    this.soundBank.playGlitchTick();
    const newOptions = this.cheatManager.generateDraftOptions(3);
    this.draftModal.open(newOptions, this.draftRerollTokens);
    return true;
  }

  pauseSimulation() {
    if (this.state !== APP_STATE.RUN) return;
    this.input.resetInputs();
    this.state = APP_STATE.PAUSED;
    this.synthMusic?.setIntensity(MUSIC_INTENSITY.AMBIENT);
    this.pauseOverlay.open();
  }

  resumeSimulation() {
    if (this.state !== APP_STATE.PAUSED) return;
    this.input.resetInputs();
    if (this.debugConsole && this.debugConsole.isOpen) {
      this.debugConsole.close();
    }
    if (this.settingsModal.isOpen) {
      this.settingsModal.close();
    }
    this.pauseOverlay.close();
    this.state = APP_STATE.RUN;
    this.synthMusic?.setIntensity(MUSIC_INTENSITY.COMBAT);
  }

  openSettings() {
    this.input.resetInputs();
    this.settingsModal.open();
  }

  openDebugConsole() {
    this.input.resetInputs();
    if (this.debugConsole) {
      this.debugConsole.open();
    }
  }

  openArsenalModal(waveNum) {
    this.state = APP_STATE.ARSENAL;
    this.input.resetInputs();
    this.synthMusic?.setIntensity(MUSIC_INTENSITY.AMBIENT);
    this.soundBank.playLevelUp();

    const unlocked = getUnlockedWeaponsForWave(waveNum);
    this.arsenalModal.open(waveNum, unlocked, this.weaponSystem.slots, (s1, s2) => {
      this.onArsenalConfirmed(s1, s2);
    });
  }

  onArsenalConfirmed(slot1Config, slot2Config) {
    if (slot1Config) {
      this.weaponSystem.slots[0] = this.weaponSystem._wireInstance(new WeaponInstance(slot1Config));
    }
    if (slot2Config) {
      this.weaponSystem.slots[1] = this.weaponSystem._wireInstance(new WeaponInstance(slot2Config));
    }
    this.weaponSystem.activeSlot = 0;
    this.input.resetInputs();
    this.state = APP_STATE.RUN;
    this.synthMusic?.setIntensity(MUSIC_INTENSITY.COMBAT);
  }

  abortRun() {
    this.pauseOverlay.close();
    this.settingsModal.close();
    if (this.debugConsole && this.debugConsole.isOpen) {
      this.debugConsole.close();
    }
    this.player.health = 0;
    this.player.markedForRemoval = true;
    this.state = APP_STATE.GAMEOVER;
    this.synthMusic?.setIntensity(MUSIC_INTENSITY.AMBIENT);
    this.soundBank.playExplosion(true);

    const mult = this.storage.getRiskMultiplier();
    const accuracy = this.stats.shotsFired > 0
      ? (this.stats.shotsHit / this.stats.shotsFired) * 100
      : 0;
    const durationSeconds = Math.max(1, Math.round((Date.now() - (this.runStartTime || Date.now())) / 1000));

    const summary = {
      score: Math.floor(this.score * mult),
      wavesCleared: Math.max(0, this.waveManager.waveNumber - 1),
      waveNumber: this.waveManager.waveNumber,
      enemiesKilled: this.stats.enemiesKilled,
      accuracy: Math.min(100, accuracy),
      riskMultiplier: mult,
      bountiesEarned: this.player.bounties || 0,
      clearanceRing: this.storage.clearanceRing,
      durationSeconds,
      sessionStartTime: this.runStartTime,
      seed: this.currentSeed,
      cheatedThisRun: this.cheatedThisRun,
    };

    this.terminalUI.showRunDiagnostic(summary);
  }

  /**
   * Resets and starts run
   */
  resetRun() {
    this.restartRun();
  }

  /**
   * Starts a brand new run
   */
  startRun() {
    this.restartRun();
  }

  /**
   * Transitions from BOOT to RUN state and starts game loop
   */
  start() {
    this.startRun();
  }

  /**
   * Resets all simulation state and begins/restarts run in-place without page reload
   */
  restartRun() {
    // 1. Reset player state and apply permanent firmware bonuses
    this.applyFirmwareBonuses();
    this.player.reset();
    this.player.x = 0;
    this.player.y = 0;
    this.player.vx = 0;
    this.player.vy = 0;
    this.score = 0;
    this.stats = { shotsFired: 0, shotsHit: 0, enemiesKilled: 0 };
    this.runStartTime = Date.now();
    this.cheatedThisRun = false;
    this.clearanceRing = 2;
    this.currentSectorTheme = SECTOR_THEMES[CLEARANCE_RING.RING_2];
    this.ringTransitionTimer = 0;
    this.hazards.length = 0;
    this.achievementSystem?.resetRun();

    // 2. Clear and teardown cheats
    this.cheatManager.reset();
    this.cheatManager.clearanceRing = 2;

    // 3. Reset weapons with Tier 0 baseline sidearms
    this.weaponSystem.cheatManager = this.cheatManager;
    this.weaponSystem.slots[0] = this.weaponSystem._wireInstance(new WeaponInstance(WEAPON_ARCHETYPES.PISTOL_SYS));
    this.weaponSystem.slots[1] = this.weaponSystem._wireInstance(new WeaponInstance(WEAPON_ARCHETYPES.PULSE_SMG));
    this.weaponSystem.activeSlot = 0;

    // Clear any latched inputs
    this.input.resetInputs();

    // 4. Clear active entities, pools, and spatial grid
    for (const e of this.enemies) this.spatialGrid.remove(e);
    for (const d of this.drops) this.spatialGrid.remove(d);
    this.enemies.length = 0;
    this.drops.length = 0;
    this.projectilePool.releaseAll();
    this.particleSystem.clear();

    // 5. Reset camera
    this.camera.pos.set(0, 0);
    this.camera.prevPos.set(0, 0);
    this.camera.targetPos.set(0, 0);
    this.camera.trauma = 0;
    this.camera.screenFlash = 0;

    // 6. Reset wave timers and wave director back to Wave 1
    this.waveManager.reset();

    // 7. Rebuild / reseed procedural map and update player cell
    this.loadMap('facility', 1337);
    this.spatialGrid.update(this.player);

    // 8. Close pause/draft/arsenal modals if open
    if (this.pauseOverlay && this.pauseOverlay.isOpen) this.pauseOverlay.close();
    if (this.draftModal && this.draftModal.isOpen) this.draftModal.close();
    if (this.arsenalModal && this.arsenalModal.isOpen) this.arsenalModal.close();

    // 9. Transition state, update music, and launch game loop
    this.state = APP_STATE.RUN;
    if (this.synthMusic) {
      this.synthMusic.start();
      this.synthMusic.setTrackForWave(this.waveManager.waveNumber || 1);
      this.synthMusic.setIntensity(MUSIC_INTENSITY.COMBAT);
      this._lastMusicWave = this.waveManager.waveNumber || 1;
    }
    if (!this.loop.isRunning) {
      this.loop.start();
    } else {
      this.loop.resume();
    }
  }

  /**
   * Backward-compatible restart alias
   */
  restart() {
    this.restartRun();
  }

  /**
   * Invoked when user selects an exploit card in the draft modal
   * @param {Object} chosenDef
   */
  onExploitDrafted(chosenDef) {
    this.input.resetInputs();
    this.soundBank.playLevelUp();
    this.cheatManager.addOrUpgradeCheat(chosenDef.id);
    this.achievementSystem?.onCheatUnlocked(chosenDef.id, chosenDef.ringTier);
    this.player.pendingLevelUps--;

    // If another level-up is pending, open next draft round
    if (this.player.pendingLevelUps > 0) {
      const nextOptions = this.cheatManager.generateDraftOptions(3);
      if (nextOptions.length > 0) {
        this.input.resetInputs();
        this.draftModal.open(nextOptions, this.draftRerollTokens);
        return;
      }
    }

    // Resume simulation
    this.input.resetInputs();
    this.state = APP_STATE.RUN;
    this.synthMusic?.setIntensity(MUSIC_INTENSITY.COMBAT);
  }

  /**
   * Deterministic 60Hz physics and simulation update
   * @param {number} dt - Fixed delta time (1/60 s)
   */
  update(dt) {
    this.achievementSystem?.update(dt);

    // If game over, handle Enter to re-deploy or Escape for main menu
    if (this.state === APP_STATE.GAMEOVER) {
      if (this.input.isKeyJustPressed('Enter')) {
        if (this.terminalUI?.diagnosticModal) {
          this.terminalUI.diagnosticModal.style.display = 'none';
        }
        this.restartRun();
      } else if (this.input.isKeyJustPressed('Escape')) {
        if (this.terminalUI?.diagnosticModal) {
          this.terminalUI.diagnosticModal.style.display = 'none';
        }
        if (this.terminalUI?.bootOverlay) {
          this.terminalUI.bootOverlay.style.display = 'flex';
          this.terminalUI.bootOverlay.classList.remove('terminal-hidden');
          this.terminalUI.switchTab('briefing');
        }
      }
      this.input.postUpdate();
      return;
    }

    // If paused, handle ESC / KeyP to resume or close settings modal / debug console
    if (this.state === APP_STATE.PAUSED) {
      if (this.input.isKeyJustPressed('Escape') || this.input.isKeyJustPressed('KeyP')) {
        if (this.debugConsole && this.debugConsole.isOpen) {
          this.debugConsole.close();
        } else if (this.settingsModal.isOpen) {
          this.settingsModal.close();
        } else {
          this.resumeSimulation();
        }
      }
      this.input.postUpdate();
      return;
    }

    // Toggle Pause with Escape or KeyP during RUN state
    if (this.state === APP_STATE.RUN) {
      if (this.input.isKeyJustPressed('Escape') || this.input.isKeyJustPressed('KeyP')) {
        this.pauseSimulation();
        this.input.postUpdate();
        return;
      }
    }

    // Check pending level-up draft trigger
    if (this.player.pendingLevelUps > 0 && this.state === APP_STATE.RUN) {
      const options = this.cheatManager.generateDraftOptions(3);
      if (options.length > 0) {
        this.input.resetInputs();
        this.soundBank.playLevelUp();
        this.state = APP_STATE.DRAFT;
        this.synthMusic?.setIntensity(MUSIC_INTENSITY.AMBIENT);
        this.draftModal.open(options, this.draftRerollTokens);
        return;
      } else {
        // All clearance cheats maxed
        this.player.pendingLevelUps = 0;
      }
    }

    if (this.state !== APP_STATE.RUN) {
      this.input.postUpdate();
      return;
    }

    // Ring transition screen glitch timer
    if (this.ringTransitionTimer > 0) {
      this.ringTransitionTimer = Math.max(0, this.ringTransitionTimer - dt);
    }

    // Active Area Hazards
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      h.duration -= dt;
      if (h.duration <= 0) {
        this.hazards.splice(i, 1);
        continue;
      }

      const hdx = this.player.x - h.x;
      const hdy = this.player.y - h.y;
      const hdistSq = hdx * hdx + hdy * hdy;
      const hitRadius = h.radius + this.player.radius;
      if (hdistSq <= hitRadius * hitRadius) {
        this.player.takeDamage(h.dps * dt, this.cheatManager, {
          isHazard: true,
          camera: this.camera,
          soundBank: this.soundBank,
        });
        if (Math.random() < 0.15) {
          this.particleSystem.emitBurst(this.player.x, this.player.y, 2, '#FF3300', 120);
        }
      }
    }

    // Rootkit Kernel EMP Purge KeyF trigger
    if (this.input.isKeyJustPressed('KeyF')) {
      const rootkit = this.cheatManager.getCheat('rootkit');
      if (rootkit && rootkit.trigger({
        player: this.player,
        enemies: this.enemies,
        projectilePool: this.projectilePool,
        spatialGrid: this.spatialGrid,
        camera: this.camera,
        particleSystem: this.particleSystem,
        soundBank: this.soundBank,
      })) {
        this.soundBank.playGlitchTick();
      }
    }

    // Toggle Spatial Grid Debug with 'KeyG'
    if (this.input.isKeyJustPressed('KeyG')) {
      this.showSpatialGridDebug = !this.showSpatialGridDebug;
      this.storage.updateSettings({ showDebugGrid: this.showSpatialGridDebug });
    }

    // Input collection & Aim Interception
    const moveDir = this.input.getMovementVector();
    this.input.updateAim(this.player, this.camera);

    const wallhack = this.cheatManager.getCheat('wallhack');
    const canShootThroughWalls = !!(wallhack && wallhack.level >= 3);

    // Apply cheat aim interceptors (e.g. Aimbot predictive angle lock)
    const modifiedAimAngle = this.cheatManager.applyAimInterceptors(
      this.input.aimAngle,
      this.input.aimVector,
      {
        player: this.player,
        spatialGrid: this.spatialGrid,
        enemies: this.enemies,
        dt,
        weapon: this.weaponSystem.activeWeapon,
        raycaster: this.raycaster,
        wallSegments: this.map ? this.map.getSegments() : [],
        hasWallhack: canShootThroughWalls,
        backtrackCheat: this.cheatManager.getCheat('backtrack'),
        penetrationCheat: this.cheatManager.getCheat('penetrationbucker'),
        silentAimCheat: this.cheatManager.getCheat('silentaim'),
      }
    );

    // Player dash impulse check (Space or Right Mouse Button)
    if (this.input.isKeyJustPressed('Space') || this.input.isMouseButtonJustPressed(2)) {
      if (this.player.dash(moveDir)) {
        this.camera.addTrauma(0.24);
        this.particleSystem.emitBurst(this.player.x, this.player.y, 8, COLOR.CYAN, 200);
        this.soundBank.playDash();
      }
    }

    // Check if any cheat (Aimbot Triggerbot) requests autonomous fire
    const autoFire = this.cheatManager.wantsAutoFire(dt, this.weaponSystem.activeWeapon);

    // Weapon Ballistics Update (passes autoFire state and aimbot-modified aim angle)
    this.weaponSystem.update(dt, this.input, this.player, this.camera, autoFire, modifiedAimAngle, this.cheatManager);

    // Player Kinematics
    this.player.updateKinematics(dt, moveDir, modifiedAimAngle);
    this.cheatManager.updatePlayer(this.player, dt, {
      player: this.player,
      weapon: this.weaponSystem.activeWeapon,
      reloadReduction: this.storage.getFirmwareBonus('fastDMA'),
    });

    // Clamp player to arena perimeter
    const halfW = WORLD.DEFAULT_WIDTH * 0.5 - 32;
    const halfH = WORLD.DEFAULT_HEIGHT * 0.5 - 32;
    this.player.x = Math.max(-halfW, Math.min(halfW, this.player.x));
    this.player.y = Math.max(-halfH, Math.min(halfH, this.player.y));
    this.spatialGrid.update(this.player);

    // Dynamic music track rotation per wave progression and clearance ring
    if (this.waveManager.waveNumber !== this._lastMusicWave) {
      this._lastMusicWave = this.waveManager.waveNumber;
      this.synthMusic?.setTrackForRing(this.clearanceRing, this.waveManager.waveNumber);
    }

    // Wave Director Update
    this.waveManager.update(dt, this.player, this.enemies.length);

    // Dynamic Biome Progression: Waves 1-5 Facility, Wave 6+ Decrypted Caverns
    const targetBiome = this.waveManager.currentWave >= 6 ? 'cavern' : 'facility';
    if (this.currentBiome !== targetBiome) {
      this.loadMap(targetBiome, 2048 + this.waveManager.currentWave);
      this.camera.addTrauma(0.4);
      this.particleSystem.emitBurst(0, 0, 40, COLOR.CYAN, 360);
    }

    // Destructible Props Update
    for (let i = this.props.length - 1; i >= 0; i--) {
      const prop = this.props[i];
      prop.update(dt);
      if (prop.markedForRemoval) {
        this.spatialGrid.remove(prop);
        this.props.splice(i, 1);
      }
    }

    // Enemy AI & Kinematics
    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];
      enemy.updateAI(dt, this.player, this.spatialGrid, this._onSentinelShoot);
      this.cheatManager.updateEnemy(enemy, dt, { player: this.player });
      this.spatialGrid.update(enemy);
    }

    // Drops Vacuum Magnet & Physics
    if (this.pickupSystem) {
      this.pickupSystem.update(this.drops, this.player, dt);
    }
    for (let i = 0; i < this.drops.length; i++) {
      const drop = this.drops[i];
      drop.update(dt, this.player);
      this.spatialGrid.update(drop);
    }

    // Projectile Ballistics Simulation
    this.projectilePool.forEachActiveReverse((proj) => {
      proj.update(dt, this.cheatManager);
      if (proj.markedForRemoval) {
        this.projectilePool.release(proj);
      }
    });

    // Particle Simulation
    this.particleSystem.update(dt);

    // Camera follow tracking with lead
    const cx = this.camera.viewportWidth * 0.5;
    const cy = this.camera.viewportHeight * 0.5;
    const aimDistance = Math.hypot(this.input.screenPointer.x - cx, this.input.screenPointer.y - cy);
    this.camera.update(dt, this.player, this.input.aimVector, aimDistance);

    // Resolve Narrowphase Collisions
    this.collisionSystem.resolve(
      dt,
      this.player,
      this.enemies,
      this.drops,
      (childEnemy) => this.spawnEnemy(childEnemy),
      this.props
    );

    // Cleanup dead enemies & drops from active lists and spatial hash
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (enemy.markedForRemoval) {
        this.spatialGrid.remove(enemy);
        this.enemies.splice(i, 1);
      }
    }

    for (let i = this.drops.length - 1; i >= 0; i--) {
      const drop = this.drops[i];
      if (drop.markedForRemoval) {
        this.spatialGrid.remove(drop);
        this.drops.splice(i, 1);
      }
    }

    // Check Player Death
    if (this.player.health <= 0 && this.state !== APP_STATE.GAMEOVER) {
      this.state = APP_STATE.GAMEOVER;
      this.synthMusic?.setIntensity(MUSIC_INTENSITY.AMBIENT);
      this.camera.addTrauma(0.8);
      this.particleSystem.emitBurst(this.player.x, this.player.y, 40, COLOR.RED, 450);
      this.soundBank.playExplosion(true);

      const mult = this.storage.getRiskMultiplier();
      const accuracy = this.stats.shotsFired > 0
        ? (this.stats.shotsHit / this.stats.shotsFired) * 100
        : 0;
      const durationSeconds = Math.max(1, Math.round((Date.now() - (this.runStartTime || Date.now())) / 1000));

      const summary = {
        score: Math.floor(this.score * mult),
        wavesCleared: Math.max(0, this.waveManager.waveNumber - 1),
        waveNumber: this.waveManager.waveNumber,
        enemiesKilled: this.stats.enemiesKilled,
        accuracy: Math.min(100, accuracy),
        riskMultiplier: mult,
        bountiesEarned: this.player.bounties || 0,
        clearanceRing: this.storage.clearanceRing,
        durationSeconds,
        sessionStartTime: this.runStartTime,
        seed: this.currentSeed,
        cheatedThisRun: this.cheatedThisRun,
      };

      this.terminalUI.showRunDiagnostic(summary);
    }

    // Clear single-frame input states
    this.input.postUpdate();
  }

  /**
   * High-DPI canvas rendering pass with sub-tick interpolation
   * @param {number} alpha - In [0, 1]
   */
  render(alpha) {
    const ctx = this.ctx;
    const bounds = this.camera.getVisibleBounds(128);

    // Clear background
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = COLOR.BG_DARK;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.restore();

    // Begin camera world coordinate space
    this.camera.begin(ctx, alpha);

    // 1. Draw World Coordinate Grid
    VectorRenderer.drawWorldGrid(
      ctx,
      bounds,
      64,
      4,
      this.currentSectorTheme.gridMinor,
      this.currentSectorTheme.gridMajor,
      this.currentSectorTheme.accentDim
    );

    // 2. Draw Arena Boundaries
    this._renderWorldBoundaries(ctx);

    // 3. Render Procedural Map Architecture (walls, floor accents, props)
    if (this.map) {
      this.map.render(ctx, this.camera);
    }

    // 4. Render Dynamic Smoke Cooling Plumes
    if (this.map && this.map.smokeVents) {
      this.raycaster.renderSmokePlumes(ctx, this.map.smokeVents, performance.now() * 0.001);
    }

    // 5. Draw Spatial Grid Overlay (if toggled)
    if (this.showSpatialGridDebug) {
      this.spatialGrid.renderDebug(ctx, bounds);
    }

    // 6. Render Drops (XP gems and Hardware Weapon Crates)
    for (const drop of this.drops) {
      drop.render(ctx, alpha);
    }

    // 7. Render Lingering Area Hazards
    for (const h of this.hazards) {
      ctx.save();
      const alphaPct = Math.max(0.2, h.duration / h.maxDuration);
      VectorRenderer.strokeCircle(ctx, h.x, h.y, h.radius, `rgba(255, 51, 0, ${alphaPct * 0.8})`, 2);
      const pulseR = h.radius * (0.3 + 0.6 * (1 - (h.duration % 0.8) / 0.8));
      VectorRenderer.strokeCircle(ctx, h.x, h.y, pulseR, `rgba(255, 120, 0, ${alphaPct * 0.5})`, 1);
      ctx.restore();
    }

    // 8. Render Security Daemons
    for (const enemy of this.enemies) {
      enemy.render(ctx, alpha);
    }

    // 9. Render Player Cyber-Chassis
    if (this.player.health > 0) {
      this.player.render(ctx, alpha);
    }

    // 10. Render Projectiles
    this.projectilePool.forEachActive((proj) => {
      proj.render(ctx, alpha);
    });

    // 11. Render Vector Particles
    this.particleSystem.render(ctx, alpha);

    // 11. 2D Dynamic Line-of-Sight Fog of War (Forward Vision Cone following crosshair)
    if (this.map) {
      const px = this.player.prevX + (this.player.x - this.player.prevX) * alpha;
      const py = this.player.prevY + (this.player.y - this.player.prevY) * alpha;
      const aimAngle = this.player.getInterpolatedRotation(alpha);
      const segments = this.map.getSegments();
      const poly = this.raycaster.computeVisibilityPolygon(px, py, segments, aimAngle);
      const wallhackActive = this.cheatManager.hasCheat('wallhack');
      this.raycaster.renderFogOfWar(ctx, px, py, poly, this.camera, wallhackActive, aimAngle);
    }

    // 12. Draw Targeting Laser & Crosshair
    this._renderTargetingHUD(ctx);

    // 13. Render Active Cheat World Overlays (ESP boxes, lock lines, backtrack ghosts)
    this.cheatManager.renderWorld(ctx, alpha, {
      player: this.player,
      enemies: this.enemies,
      camera: this.camera,
    });

    // 14. Render Developer Debug Diagnostics (Hitboxes, Spatial Grid, Raycasts, Backtrack trails)
    if (this.debugRenderer) {
      this.debugRenderer.render(ctx, {
        camera: this.camera,
        player: this.player,
        enemies: this.enemies,
        drops: this.drops,
        props: this.props,
        projectilePool: this.projectilePool,
        spatialGrid: this.spatialGrid,
        backtrackCheat: this.cheatManager.getCheat('backtrack'),
        raycaster: this.raycaster,
        wallSegments: this.map ? this.map.getSegments() : [],
      });
    }

    // End camera world coordinate space
    this.camera.end(ctx);

    // 10. Render Screen-Space Vector HUD & Telemetry
    this._renderScreenHUD(ctx);

    // 11. Render Game Over Screen if deceased
    if (this.state === APP_STATE.GAMEOVER) {
      this._renderGameOver(ctx);
    }
  }

  _renderWorldBoundaries(ctx) {
    const hw = WORLD.DEFAULT_WIDTH * 0.5;
    const hh = WORLD.DEFAULT_HEIGHT * 0.5;

    ctx.save();
    ctx.strokeStyle = this.currentSectorTheme.accentDim;
    ctx.lineWidth = 2;
    ctx.strokeRect(-hw, -hh, WORLD.DEFAULT_WIDTH, WORLD.DEFAULT_HEIGHT);

    // Perimeter warning accents
    VectorRenderer.drawTargetBracket(ctx, -hw, -hh, 32, this.currentSectorTheme.accent);
    VectorRenderer.drawTargetBracket(ctx, hw, -hh, 32, this.currentSectorTheme.accent);
    VectorRenderer.drawTargetBracket(ctx, hw, hh, 32, this.currentSectorTheme.accent);
    VectorRenderer.drawTargetBracket(ctx, -hw, hh, 32, this.currentSectorTheme.accent);

    ctx.font = '10px monospace';
    ctx.fillStyle = this.currentSectorTheme.accentDim;
    ctx.textAlign = 'center';
    ctx.fillText(`// HIGH-FREQUENCY MEMORY BUS // ${this.currentSectorTheme.name} //`, 0, -hh + 20);
    ctx.restore();
  }

  _renderTargetingHUD(ctx) {
    const pointer = this.input.worldPointer;
    const weapon = this.weaponSystem.activeWeapon;
    const activeAim =
      (this.cheatManager.hasCheat('silentaim') && this.cheatManager.getCheat('silentaim')) ||
      (this.cheatManager.hasCheat('aimbot') && this.cheatManager.getCheat('aimbot'));

    if (activeAim && activeAim.hasTarget && activeAim.currentTarget && !activeAim.currentTarget.markedForRemoval) {
      const isSilent = activeAim.id === 'silentaim';
      const isBacktrack = activeAim.isBacktrackTarget;
      const lockColor = isBacktrack ? COLOR.AMBER : (isSilent ? COLOR.RED : COLOR.CYAN);
      // Laser sight locks straight onto enemy predictive lead position
      VectorRenderer.strokeLine(
        ctx,
        this.player.x,
        this.player.y,
        activeAim.targetLeadPos.x,
        activeAim.targetLeadPos.y,
        lockColor,
        isSilent ? 2 : 1.5
      );
      // Targeting brackets around locked enemy
      VectorRenderer.drawTargetBracket(
        ctx,
        activeAim.targetLeadPos.x,
        activeAim.targetLeadPos.y,
        activeAim.currentTarget.radius * 2.4 + 4,
        lockColor,
        4
      );
    } else {
      // Laser sight line from player to pointer
      VectorRenderer.strokeLine(
        ctx,
        this.player.x,
        this.player.y,
        pointer.x,
        pointer.y,
        COLOR.CYAN_MUTED,
        1
      );
    }

    // Combat crosshair with spread expansion
    const spreadPx = weapon ? (weapon.spreadRad * 180) / Math.PI * 1.5 : 0;
    VectorRenderer.drawCrosshair(ctx, pointer.x, pointer.y, spreadPx, COLOR.CYAN);
  }

  _renderVectorPanel(ctx, x, y, width, height, borderColor = COLOR.CYAN_DIM, bracketSize = 8) {
    ctx.save();
    // Translucent background
    ctx.fillStyle = 'rgba(7, 10, 15, 0.78)';
    ctx.fillRect(x, y, width, height);

    // Frame
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    // Corner brackets
    ctx.strokeStyle = COLOR.CYAN;
    const b = bracketSize;
    ctx.beginPath();
    // Top-left
    ctx.moveTo(x, y + b); ctx.lineTo(x, y); ctx.lineTo(x + b, y);
    // Top-right
    ctx.moveTo(x + width - b, y); ctx.lineTo(x + width, y); ctx.lineTo(x + width, y + b);
    // Bottom-right
    ctx.moveTo(x + width, y + height - b); ctx.lineTo(x + width, y + height); ctx.lineTo(x + width - b, y + height);
    // Bottom-left
    ctx.moveTo(x + b, y + height); ctx.lineTo(x, y + height); ctx.lineTo(x, y + height - b);
    ctx.stroke();

    ctx.restore();
  }

  _renderScreenHUD(ctx) {
    const dpr = this.camera.dpr;
    const w = this.camera.viewportWidth;
    const h = this.camera.viewportHeight;

    ctx.save();
    ctx.scale(dpr, dpr);

    // 1. Top-Left: System Telemetry Card
    const tlW = 280;
    const tlH = 58;
    this._renderVectorPanel(ctx, 16, 16, tlW, tlH, this.currentSectorTheme.accentDim);

    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = this.currentSectorTheme.accent;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`${this.currentSectorTheme.name} // RUNTIME`, 26, 23);

    ctx.font = '10px monospace';
    ctx.fillStyle = COLOR.WHITE_DIM;
    ctx.fillText(`FPS: ${this.loop.fps} | TPS: ${this.loop.tps} | FRAME: ${this.loop.frameTimeMs.toFixed(1)}ms`, 26, 40);
    ctx.fillText(`SECTOR: ${this.currentBiome.toUpperCase()} [SEED:${this.currentSeed}] | DAEMONS: ${this.enemies.length}`, 26, 54);

    // Active Exploit Badges list below telemetry panel
    this.cheatManager.renderHUD(ctx, 18, 88);

    // 2. Top-Center: Wave Director Banner Card
    const waveColor = this.waveManager.state === WAVE_STATE.PREPARING ? COLOR.AMBER : COLOR.CYAN;
    const tcW = 320;
    const tcH = 54;
    const tcX = Math.round(w * 0.5 - tcW * 0.5);
    this._renderVectorPanel(ctx, tcX, 16, tcW, tcH, waveColor);

    ctx.textAlign = 'center';
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = waveColor;
    const waveText =
      this.waveManager.state === WAVE_STATE.PREPARING
        ? `// INCOMING SECURITY WAVE ${this.waveManager.waveNumber} //`
        : `// PURGING SECURITY DAEMONS // WAVE ${this.waveManager.waveNumber} //`;
    ctx.fillText(waveText, w * 0.5, 24);

    // Wave progress vector gauge
    const waveBarW = 270;
    VectorRenderer.drawVectorBar(
      ctx,
      w * 0.5 - waveBarW * 0.5,
      43,
      waveBarW,
      7,
      this.waveManager.progressPercent,
      waveColor,
      ''
    );

    // 3. Top-Right: Spatial Coordinates & Level Card
    const trW = 260;
    const trH = 58;
    const trX = w - trW - 16;
    this._renderVectorPanel(ctx, trX, 16, trW, trH, 'rgba(0, 240, 255, 0.25)');

    ctx.textAlign = 'right';
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = COLOR.CYAN;
    ctx.fillText(`LEVEL ${this.player.level} // XP: ${this.player.xp} / ${this.player.xpToNextLevel}`, w - 26, 23);

    // XP mini progress line
    const xpPercent = Math.min(1.0, this.player.xp / Math.max(1, this.player.xpToNextLevel));
    ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
    ctx.fillRect(trX + 10, 39, trW - 20, 2);
    ctx.fillStyle = COLOR.CYAN;
    ctx.fillRect(trX + 10, 39, (trW - 20) * xpPercent, 2);

    ctx.font = '10px monospace';
    ctx.fillStyle = COLOR.WHITE_DIM;
    ctx.fillText(`COORDS: [${Math.round(this.player.x)}, ${Math.round(this.player.y)}]`, w - 26, 45);
    ctx.fillText(`SPATIAL CELLS: ${this.spatialGrid.totalOccupiedCells} [G] DEBUG`, w - 26, 57);

    // 4. Bottom-Left: Integrity & Dash Agility Card
    const blW = 250;
    const blH = 84;
    const blY = h - blH - 16;
    this._renderVectorPanel(ctx, 16, blY, blW, blH, 'rgba(0, 240, 255, 0.3)');

    // Chassis Health Meter
    const barWidth = 226;
    const barHeight = 13;
    const hpRatio = Math.max(0, this.player.health / this.player.maxHealth);
    VectorRenderer.drawVectorBar(
      ctx,
      28,
      blY + 16,
      barWidth,
      barHeight,
      hpRatio,
      this.player.health < 30 ? COLOR.RED : COLOR.GREEN,
      `INTEGRITY // ${Math.max(0, Math.round(this.player.health))} / ${this.player.maxHealth}`
    );

    // Dash Boost Meter
    VectorRenderer.drawVectorBar(
      ctx,
      28,
      blY + 48,
      barWidth,
      barHeight,
      this.player.dashCooldownPercent,
      this.player.dashReady ? COLOR.CYAN : COLOR.AMBER,
      this.player.dashReady ? 'DASH BOOST // READY [SPACE / RMB]' : 'DASH BOOST // RECHARGING'
    );

    // 5. Bottom-Right: Active Weapon & Cartridge Pip Counter Card
    const weapon = this.weaponSystem.activeWeapon;
    if (weapon) {
      const brW = 280;
      const brH = 96;
      const brX = w - brW - 16;
      const brY = h - brH - 16;
      this._renderVectorPanel(ctx, brX, brY, brW, brH, weapon.color || COLOR.CYAN);

      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.font = 'bold 15px monospace';
      ctx.fillStyle = weapon.color || COLOR.CYAN;
      ctx.fillText(`${weapon.name}`, w - 26, brY + 10);

      // Numeric ammo label
      ctx.font = '11px monospace';
      ctx.fillStyle = COLOR.WHITE;
      const isInfiniteAmmo = this.cheatManager.isActive('infiniteammo');
      let ammoStr = '';
      if (isInfiniteAmmo) {
        ammoStr = 'AMMO: INF / INF [DMA_LOCK]';
      } else if (weapon.isReloading) {
        ammoStr = `RELOADING... (${(weapon.reloadTime - weapon.reloadTimer).toFixed(1)}s)`;
      } else {
        ammoStr = `AMMO: ${weapon.currentAmmo} / ${weapon.clipSize}`;
      }
      ctx.fillText(ammoStr, w - 26, brY + 30);

      // Cartridge Bullet Pips
      if (isInfiniteAmmo) {
        const maxDisplayPips = 24;
        const pipW = Math.max(3, Math.floor((brW - 40) / maxDisplayPips) - 2);
        const pipH = 8;
        const startX = brX + 20;
        const pipY = brY + 46;
        for (let i = 0; i < maxDisplayPips; i++) {
          ctx.fillStyle = COLOR.RED;
          ctx.fillRect(startX + i * (pipW + 2), pipY, pipW, pipH);
        }
      } else if (!weapon.isReloading) {
        const maxDisplayPips = Math.min(24, weapon.clipSize);
        const pipW = Math.max(3, Math.floor((brW - 40) / maxDisplayPips) - 2);
        const pipH = 8;
        const startX = brX + 20;
        const pipY = brY + 46;

        for (let i = 0; i < maxDisplayPips; i++) {
          const isLoaded = i < weapon.currentAmmo;
          ctx.fillStyle = isLoaded ? (weapon.color || COLOR.CYAN) : 'rgba(255,255,255,0.15)';
          ctx.fillRect(startX + i * (pipW + 2), pipY, pipW, pipH);
        }
      } else {
        // Reload progress vector bar
        VectorRenderer.drawVectorBar(
          ctx,
          brX + 20,
          brY + 48,
          brW - 40,
          6,
          weapon.reloadProgress,
          COLOR.AMBER,
          ''
        );
      }

      // Dual Slot indicators with active slot marker
      ctx.font = '10px monospace';
      const slot1Name = this.weaponSystem.slots[0] ? this.weaponSystem.slots[0].name : 'EMPTY';
      const slot2Name = this.weaponSystem.slots[1] ? this.weaponSystem.slots[1].name : 'EMPTY';
      const s1Tag = this.weaponSystem.activeSlot === 0 ? `► [1] ${slot1Name}` : `  [1] ${slot1Name}`;
      const s2Tag = this.weaponSystem.activeSlot === 1 ? `► [2] ${slot2Name}` : `  [2] ${slot2Name}`;
      ctx.fillStyle = COLOR.CYAN;
      ctx.fillText(`${s1Tag}  |  ${s2Tag}  ([Q] SWAP)`, w - 26, brY + 72);
    }

    // 6. Tactical Radar Telemetry Overlay
    const radar = this.cheatManager.getCheat('radartelemetry');
    if (radar && radar.enabled) {
      radar.renderRadar(ctx, w, h, this.player, this.enemies, this.drops, this.props);
    }

    // 7. Cyber-Clearance Achievement Toasts
    if (this.achievementSystem) {
      this.achievementSystem.renderToasts(ctx, w);
    }

    // 8. Full-screen CRT Glitch Flash & Tactical Elevation Banner
    if (this.ringTransitionTimer > 0) {
      const flashAlpha = this.ringTransitionTimer / 0.5;
      ctx.save();
      ctx.fillStyle = this.currentSectorTheme.id === CLEARANCE_RING.RING_0
        ? `rgba(255, 0, 60, ${flashAlpha * 0.35})`
        : `rgba(255, 176, 0, ${flashAlpha * 0.30})`;
      ctx.fillRect(0, 0, w, h);

      // Horizontal CRT glitch scanlines
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      const scanCount = 8;
      for (let s = 0; s < scanCount; s++) {
        const sy = (Math.sin(s * 1.5 + performance.now() * 0.02) * 0.5 + 0.5) * h;
        ctx.fillRect(0, sy, w, 2 + Math.random() * 4);
      }

      // Tactical Elevation Banner
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = this.currentSectorTheme.accent;
      ctx.shadowBlur = 14;
      ctx.fillText(`[CLEARANCE ELEVATION: ${this.currentSectorTheme.name} GRANTED]`, w * 0.5, h * 0.35);
      ctx.font = '13px monospace';
      ctx.fillStyle = this.currentSectorTheme.accent;
      ctx.fillText(this.currentSectorTheme.description, w * 0.5, h * 0.35 + 28);
      ctx.restore();
    }

    ctx.restore();
  }

  _renderGameOver(ctx) {
    const dpr = this.camera.dpr;
    const w = this.camera.viewportWidth;
    const h = this.camera.viewportHeight;

    ctx.save();
    ctx.scale(dpr, dpr);

    ctx.fillStyle = 'rgba(7, 10, 15, 0.85)';
    ctx.fillRect(0, 0, w, h);

    ctx.font = '32px monospace';
    ctx.fillStyle = COLOR.RED;
    ctx.textAlign = 'center';
    ctx.fillText('// KERNEL PANIC // SYSTEM PURGED //', w * 0.5, h * 0.4);

    ctx.font = '14px monospace';
    ctx.fillStyle = COLOR.WHITE;
    ctx.fillText(`SURVIVED TO WAVE ${this.waveManager.waveNumber} &bull; REACHED LEVEL ${this.player.level}`, w * 0.5, h * 0.48);

    ctx.font = '12px monospace';
    ctx.fillStyle = COLOR.CYAN;
    ctx.fillText('PRESS [ENTER] TO RE-DEPLOY // [ESC] FOR MAIN MENU', w * 0.5, h * 0.56);

    ctx.restore();
  }
}
