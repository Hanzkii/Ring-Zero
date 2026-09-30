/**
 * Ring Zero - Main Game Application Coordinator
 * State machine, high-DPI canvas orchestration, fixed simulation dispatch, and vector telemetry rendering.
 */

import { SIMULATION, COLOR, WORLD, COLLISION_LAYER, PLAYER_CONFIG } from './Constants.js';
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
import { WEAPON_ARCHETYPES, WeaponInstance } from '../systems/WeaponSystem.js';

export const APP_STATE = {
  BOOT: 'BOOT',
  RUN: 'RUN',
  DRAFT: 'DRAFT',
  PAUSED: 'PAUSED',
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
    this.storage = new StorageService();
    this.leaderboard = new LeaderboardService();

    this.cheatManager = new CheatManager();
    this.cheatManager.clearanceRing = this.storage.clearanceRing;

    this.draftRerollTokens = 0;

    this.draftModal = new DraftModal(
      document.body,
      (chosenDef) => this.onExploitDrafted(chosenDef),
      () => this.onDraftReroll()
    );

    this.settingsModal = new SettingsModal({
      storage: this.storage,
      synth: this.soundBank.synth,
      soundBank: this.soundBank,
      camera: this.camera,
      onGridDebugToggle: (val) => {
        this.showSpatialGridDebug = val;
      },
    });

    // Sync debug grid setting
    this.showSpatialGridDebug = !!this.storage.settings?.showDebugGrid;

    this.terminalUI = new TerminalUI({
      storage: this.storage,
      soundBank: this.soundBank,
      leaderboard: this.leaderboard,
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
      onAbortRun: () => this.abortRun(),
    });

    this.weaponSystem.fireInterceptor = (bulletParams, spawnCb) => {
      this.cheatManager.applyWeaponFireInterceptors(
        bulletParams,
        {
          player: this.player,
          spatialGrid: this.spatialGrid,
          weapon: this.weaponSystem.activeWeapon,
        },
        spawnCb
      );
    };

    this.waveManager = new WaveManager({
      onSpawnEnemy: (enemy) => this.spawnEnemy(enemy),
    });
    this.waveManager.onWaveCleared = (waveNum) => {
      const bonusBounties = 30 + waveNum * 20;
      this.player.bounties = (this.player.bounties || 0) + bonusBounties;
      this.score += 250 * waveNum;
      this.soundBank.playWallhackPulse();
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
    });

    // Procedural World Architecture & Raycasting
    this.raycaster = new Raycaster2D(950);
    this.currentBiome = 'facility';
    this.currentSeed = 1337;
    /** @type {import('../world/DestructibleProp.js').DestructibleProp[]} */
    this.props = [];
    this.map = null;
    this.loadMap(this.currentBiome, this.currentSeed);

    // Game loop setup
    this.loop = new GameLoop({
      onUpdate: (dt) => this.update(dt),
      onRender: (alpha) => this.render(alpha),
    });

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
    this.state = APP_STATE.PAUSED;
    this.pauseOverlay.open();
  }

  resumeSimulation() {
    if (this.state !== APP_STATE.PAUSED) return;
    if (this.settingsModal.isOpen) {
      this.settingsModal.close();
    }
    this.pauseOverlay.close();
    this.state = APP_STATE.RUN;
  }

  openSettings() {
    this.settingsModal.open();
  }

  abortRun() {
    this.pauseOverlay.close();
    this.settingsModal.close();
    this.player.health = 0;
    this.player.markedForRemoval = true;
    this.state = APP_STATE.GAMEOVER;
    this.soundBank.playExplosion(true);

    const mult = this.storage.getRiskMultiplier();
    const accuracy = this.stats.shotsFired > 0
      ? (this.stats.shotsHit / this.stats.shotsFired) * 100
      : 0;

    const summary = {
      score: Math.floor(this.score * mult),
      wavesCleared: Math.max(0, this.waveManager.waveNumber - 1),
      enemiesKilled: this.stats.enemiesKilled,
      accuracy: Math.min(100, accuracy),
      riskMultiplier: mult,
      bountiesEarned: this.player.bounties || 0,
      clearanceRing: this.storage.clearanceRing,
    };

    this.terminalUI.showRunDiagnostic(summary);
  }

  /**
   * Transitions from BOOT to RUN state and starts game loop
   */
  start() {
    this.applyFirmwareBonuses();
    this.state = APP_STATE.RUN;
    this.loop.start();
  }

  /**
   * Restarts simulation for a new run
   */
  restart() {
    this.applyFirmwareBonuses();
    this.player.reset();
    this.player.x = 0;
    this.player.y = 0;
    this.score = 0;
    this.stats = { shotsFired: 0, shotsHit: 0, enemiesKilled: 0 };
    this.cheatManager.activeCheats.clear();
    this.cheatManager.clearanceRing = this.storage.clearanceRing;

    this.weaponSystem.slots[0] = this.weaponSystem._wireInstance(new WeaponInstance(WEAPON_ARCHETYPES.KERNEL_PISTOL));
    this.weaponSystem.slots[1] = null;
    this.weaponSystem.activeSlot = 0;

    for (const e of this.enemies) this.spatialGrid.remove(e);
    for (const d of this.drops) this.spatialGrid.remove(d);
    this.enemies.length = 0;
    this.drops.length = 0;
    this.projectilePool.releaseAll();
    this.particleSystem.clear();

    this.waveManager.reset();
    this.loadMap('facility', 1337);
    this.spatialGrid.update(this.player);

    this.state = APP_STATE.RUN;
  }

  /**
   * Invoked when user selects an exploit card in the draft modal
   * @param {Object} chosenDef
   */
  onExploitDrafted(chosenDef) {
    this.soundBank.playLevelUp();
    this.cheatManager.addOrUpgradeCheat(chosenDef.id);
    this.player.pendingLevelUps--;

    // If another level-up is pending, open next draft round
    if (this.player.pendingLevelUps > 0) {
      const nextOptions = this.cheatManager.generateDraftOptions(3);
      if (nextOptions.length > 0) {
        this.draftModal.open(nextOptions, this.draftRerollTokens);
        return;
      }
    }

    // Resume simulation
    this.state = APP_STATE.RUN;
  }

  /**
   * Deterministic 60Hz physics and simulation update
   * @param {number} dt - Fixed delta time (1/60 s)
   */
  update(dt) {
    // If paused, handle ESC / KeyP to resume or close settings modal
    if (this.state === APP_STATE.PAUSED) {
      if (this.input.isKeyJustPressed('Escape') || this.input.isKeyJustPressed('KeyP')) {
        if (this.settingsModal.isOpen) {
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
        this.soundBank.playLevelUp();
        this.state = APP_STATE.DRAFT;
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

    // Lagswitch KeyF trigger
    if (this.input.isKeyJustPressed('KeyF')) {
      const lagswitch = this.cheatManager.getCheat('lagswitch');
      if (lagswitch && lagswitch.trigger()) {
        this.soundBank.playGlitchTick();
        this.camera.addTrauma(0.2);
        this.particleSystem.emitBurst(this.player.x, this.player.y, 25, COLOR.RED, 300);
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
    this.weaponSystem.update(dt, this.input, this.player, this.camera, autoFire, modifiedAimAngle);

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

    const freezeWorld = !!this.cheatManager.getCheat('lagswitch')?.shouldFreezeWorld();

    // Enemy AI & Kinematics
    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];
      if (!freezeWorld) {
        enemy.updateAI(dt, this.player, this.spatialGrid, (pulseParams) => {
          const p = this.projectilePool.obtain();
          if (p) p.spawn(pulseParams);
        });
      }
      this.cheatManager.updateEnemy(enemy, dt, { player: this.player });
      this.spatialGrid.update(enemy);
    }

    // Drops Vacuum Magnet & Physics
    for (let i = 0; i < this.drops.length; i++) {
      const drop = this.drops[i];
      drop.update(dt, this.player);
      this.spatialGrid.update(drop);
    }

    // Projectile Ballistics Simulation
    this.projectilePool.forEachActiveReverse((proj) => {
      if (freezeWorld && proj.layer === COLLISION_LAYER.PROJECTILE_ENEMY) {
        return;
      }
      proj.update(dt);
      if (proj.markedForRemoval) {
        this.projectilePool.release(proj);
      }
    });

    // Particle Simulation
    this.particleSystem.update(dt);

    // Camera follow tracking with lead
    const aimDistance = this.input.screenPointer.dist(
      new Vec2(this.camera.viewportWidth * 0.5, this.camera.viewportHeight * 0.5)
    );
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
      this.camera.addTrauma(0.8);
      this.particleSystem.emitBurst(this.player.x, this.player.y, 40, COLOR.RED, 450);
      this.soundBank.playExplosion(true);

      const mult = this.storage.getRiskMultiplier();
      const accuracy = this.stats.shotsFired > 0
        ? (this.stats.shotsHit / this.stats.shotsFired) * 100
        : 0;

      const summary = {
        score: Math.floor(this.score * mult),
        wavesCleared: Math.max(0, this.waveManager.waveNumber - 1),
        enemiesKilled: this.stats.enemiesKilled,
        accuracy: Math.min(100, accuracy),
        riskMultiplier: mult,
        bountiesEarned: this.player.bounties || 0,
        clearanceRing: this.storage.clearanceRing,
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
    VectorRenderer.drawWorldGrid(ctx, bounds, 64, 4);

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

    // 7. Render Security Daemons
    for (const enemy of this.enemies) {
      enemy.render(ctx, alpha);
    }

    // 8. Render Player Cyber-Chassis
    if (this.player.health > 0) {
      this.player.render(ctx, alpha);
    }

    // 9. Render Projectiles
    this.projectilePool.forEachActive((proj) => {
      proj.render(ctx, alpha);
    });

    // 10. Render Vector Particles
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
    ctx.strokeStyle = COLOR.CYAN_DIM;
    ctx.lineWidth = 2;
    ctx.strokeRect(-hw, -hh, WORLD.DEFAULT_WIDTH, WORLD.DEFAULT_HEIGHT);

    // Perimeter warning accents
    VectorRenderer.drawTargetBracket(ctx, -hw, -hh, 32, COLOR.CYAN);
    VectorRenderer.drawTargetBracket(ctx, hw, -hh, 32, COLOR.CYAN);
    VectorRenderer.drawTargetBracket(ctx, hw, hh, 32, COLOR.CYAN);
    VectorRenderer.drawTargetBracket(ctx, -hw, hh, 32, COLOR.CYAN);

    ctx.font = '10px monospace';
    ctx.fillStyle = COLOR.CYAN_MUTED;
    ctx.textAlign = 'center';
    ctx.fillText('// HIGH-FREQUENCY MEMORY BUS // ARENA PERIMETER //', 0, -hh + 20);
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

  _renderScreenHUD(ctx) {
    const dpr = this.camera.dpr;
    const w = this.camera.viewportWidth;
    const h = this.camera.viewportHeight;

    ctx.save();
    ctx.scale(dpr, dpr);

    // Top-Left: System Telemetry
    ctx.font = '12px monospace';
    ctx.fillStyle = COLOR.CYAN;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('RING ZERO // KERNEL RUNTIME', 20, 20);

    ctx.font = '11px monospace';
    ctx.fillStyle = COLOR.WHITE_DIM;
    ctx.fillText(`FPS: ${this.loop.fps} | TPS: ${this.loop.tps} | FRAME: ${this.loop.frameTimeMs.toFixed(1)}ms`, 20, 38);
    ctx.fillText(`SECTOR: ${this.currentBiome.toUpperCase()} [SEED:${this.currentSeed}] | PROPS: ${this.props.length} | DAEMONS: ${this.enemies.length}`, 20, 54);

    // Active Exploit Badges
    this.cheatManager.renderHUD(ctx, 20, 74);

    // Top-Center: Wave Director Telemetry
    ctx.textAlign = 'center';
    ctx.font = '14px monospace';
    ctx.fillStyle = this.waveManager.state === WAVE_STATE.PREPARING ? COLOR.AMBER : COLOR.CYAN;
    const waveText =
      this.waveManager.state === WAVE_STATE.PREPARING
        ? `// INCOMING SECURITY WAVE ${this.waveManager.waveNumber} //`
        : `// PURGING SECURITY DAEMONS // WAVE ${this.waveManager.waveNumber} //`;
    ctx.fillText(waveText, w * 0.5, 20);

    // Wave progress gauge
    const waveBarW = 240;
    VectorRenderer.drawVectorBar(
      ctx,
      w * 0.5 - waveBarW * 0.5,
      40,
      waveBarW,
      6,
      this.waveManager.progressPercent,
      COLOR.CYAN,
      ''
    );

    // Top-Right: Coordinates & Level
    ctx.textAlign = 'right';
    ctx.fillStyle = COLOR.CYAN;
    ctx.fillText(`LEVEL ${this.player.level} // XP: ${this.player.xp} / ${this.player.xpToNextLevel}`, w - 20, 20);
    ctx.fillStyle = COLOR.WHITE_DIM;
    ctx.fillText(`COORDS: [${Math.round(this.player.x)}, ${Math.round(this.player.y)}]`, w - 20, 38);
    ctx.fillText(`SPATIAL CELLS: ${this.spatialGrid.totalOccupiedCells} [G] DEBUG`, w - 20, 54);

    // Bottom-Left: Integrity & Dash Meters
    const barWidth = 190;
    const barHeight = 12;
    VectorRenderer.drawVectorBar(
      ctx,
      20,
      h - 75,
      barWidth,
      barHeight,
      this.player.health / this.player.maxHealth,
      this.player.health < 30 ? COLOR.RED : COLOR.GREEN,
      `INTEGRITY // ${Math.max(0, Math.round(this.player.health))} / ${this.player.maxHealth}`
    );

    VectorRenderer.drawVectorBar(
      ctx,
      20,
      h - 45,
      barWidth,
      barHeight,
      this.player.dashCooldownPercent,
      this.player.dashReady ? COLOR.CYAN : COLOR.AMBER,
      this.player.dashReady ? 'DASH BOOST // READY [SPACE / RMB]' : 'DASH BOOST // RECHARGING'
    );

    // Bottom-Right: Active Weapon & Ammo Telemetry
    const weapon = this.weaponSystem.activeWeapon;
    if (weapon) {
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.font = '14px monospace';
      ctx.fillStyle = weapon.color;
      ctx.fillText(`${weapon.name}`, w - 20, h - 55);

      ctx.font = '12px monospace';
      ctx.fillStyle = COLOR.WHITE;
      const ammoStr = weapon.isReloading
        ? `RELOADING... (${(weapon.reloadTime - weapon.reloadTimer).toFixed(1)}s)`
        : `AMMO: ${weapon.currentAmmo} / ${weapon.clipSize}`;
      ctx.fillText(ammoStr, w - 20, h - 38);

      // Reload progress mini bar
      if (weapon.isReloading) {
        VectorRenderer.drawVectorBar(
          ctx,
          w - 180,
          h - 32,
          160,
          5,
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
      ctx.fillText(`${s1Tag}  |  ${s2Tag}  ([Q] SWAP)`, w - 20, h - 18);
    }

    // Tactical Radar Telemetry Overlay
    const radar = this.cheatManager.getCheat('radartelemetry');
    if (radar && radar.enabled) {
      radar.renderRadar(ctx, w, h, this.player, this.enemies, this.drops, this.props);
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
    ctx.fillText('PRESS [F5] OR RELOAD TO RE-INITIALIZE KERNEL ACCESS', w * 0.5, h * 0.56);

    ctx.restore();
  }
}
