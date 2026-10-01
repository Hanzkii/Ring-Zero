# Ring Zero

> **Privilege Escalation // 2D Procedural Kernel Shooter**  
> Built strictly with **Vanilla Modern JavaScript (ES6+ modules)**, **HTML5 Canvas 2D API**, and **Web Audio API**.  
> **Zero external dependencies. Zero npm packages. Zero bundlers. Zero audio assets.**

[![Deploy Ring Zero to GitHub Pages](https://github.com/Hanzkii/Ring-Zero/actions/workflows/deploy.yml/badge.svg)](https://github.com/Hanzkii/Ring-Zero/actions/workflows/deploy.yml)

---

## ⚡ Lore & Premise: Kernel Privilege Escalation

In CPU protection ring architecture, execution privilege is strictly hierarchical:
* **Ring 3**: Userland applications (heavily sandboxed, limited system access).
* **Ring 2**: Device drivers & hardware communication routines.
* **Ring 1**: Hypervisor & virtualization management layer.
* **Ring 0**: Kernel space (unrestricted physical memory and hardware execution).

In **Ring Zero**, your cyber-chassis is trapped in a hostile memory virtualization container. Sanitization daemons and anti-tamper security routines are systematically purging active memory blocks. To escape, you must weaponize classic game hacking exploits—injecting memory hooks, desyncing network packets, rewriting physics clocks, and piercing spatial geometry—to fight your way down into **Ring 0**.

---

## 🎮 Controls

| Action | Key / Input | Notes |
| :--- | :--- | :--- |
| **Movement** | `[W]`, `[A]`, `[S]`, `[D]` | Kinematic cyber-chassis thrusters |
| **Aim & Direct Fire** | `[Mouse Pointer]` + `[LMB]` | 360° cursor tracking with recoil trauma |
| **Autonomous Triggerbot** | Autonomous | Fires automatically when crosshairs intersect targets |
| **Hyper-Velocity Dash** | `[Space]` or `[RMB]` | High-speed omnidirectional evasion & ram damage |
| **Weapon Reload** | `[R]` | Auto-reloads on empty clip; accelerated by Fast DMA |
| **Swap Weapon Slot** | `[Q]` | Toggle between Primary and Secondary weapon loadouts |
| **Rootkit Screen Purge** | `[F]` | Ring 0 active exploit: EMP screen purge, wipes hostile bullets, deals massive shockwave damage & grants invulnerability |
| **Draft Re-roll** | `[R]` *(in Draft Modal)* | Spend Heuristic Spoofing tokens to reroll exploit cards |
| **Pause Menu** | `[ESC]` or `[P]` | Suspends 60Hz physics; inspects active exploits & loadout |
| **Spatial Grid Debug** | `[G]` | Real-time visual overlay of the uniform spatial hash cells |

---

## 🧬 Exploit Matrix (16 Injected Exploits)

Exploits are gated behind your clearance ring. Spend crypto bounties earned during runs to unlock deeper Rings in the **Meta-Terminal**.

| Ring Clearance | Exploit File | Name | Type | Mechanics & Rank Scaling |
| :---: | :--- | :--- | :---: | :--- |
| **Ring 3**<br>*(Userland)* | `Aimbot.dll` | **Aimbot** | Passive/Assist | Predictive trajectory lead targeting closest daemon. Rank 1: snap angle; Rank 2: predictive lead; Rank 3: autonomous triggerbot. |
| **Ring 3**<br>*(Userland)* | `Wallhack.lua` | **ESP / Wallhack** | Visual/Bullet | Highlights daemons through walls and smoke. Rank 1: bounding boxes; Rank 2: telemetry radar; Rank 3: +2 bullet armor pierce. |
| **Ring 3**<br>*(Userland)* | `OverclockDash.bin` | **Overclocked Dash** | Agility | Enhances thruster capacitor. Rank 1: -25% cooldown; Rank 2: +30% dash impulse; Rank 3: double dash charges. |
| **Ring 3**<br>*(Userland)* | `Speedhack.exe` | **Speedhack** | Kinematics | Overclocks movement bus velocity. Rank 1: +25% speed; Rank 2: +45% speed; Rank 3: +70% speed. |
| **Ring 3**<br>*(Userland)* | `Triggerbot.cs` | **Triggerbot** | Firing | 0ms reaction auto-fire when crosshair ray intersects hostile hitboxes. Rank 1: 14px ray; Rank 2: 24px ray; Rank 3: 34px cone. |
| **Ring 2**<br>*(Hardware Drivers)* | `DoubleTap.pkg` | **Double Tap** | Ballistics | Packet multiplexing shoots an immediate phantom second volley with zero spread penalty. Rank 1: 40% chance; Rank 2: 70% chance; Rank 3: 100% guaranteed. |
| **Ring 2**<br>*(Hardware Drivers)* | `Backtrack.sys` | **Backtrack** | Temporal | Records 90-tick historical ring buffer for all daemons. Bullets hit ghost positions and physically rewind enemies in spacetime. |
| **Ring 2**<br>*(Hardware Drivers)* | `PacketChoke.net` | **Packet Choke** | Defensive | Simulates socket packet loss to drop incoming damage hit confirmations. Rank 1: 25% evasion; Rank 2: 40% evasion; Rank 3: 55% evasion. |
| **Ring 2**<br>*(Hardware Drivers)* | `RadarTelemetry.ini` | **Tactical Radar** | Telemetry | Sweeping military-spec HUD mini-map displaying daemons, weapon drops, and explosive canisters in world space. |
| **Ring 1**<br>*(Hypervisor)* | `Spinbot.asi` | **Spinbot Anti-Aim** | Evasion | Rapidly modulates visual chassis rotation offset, desyncing hostile pulse calculations and deflecting 35%-65% incoming damage. |
| **Ring 1**<br>*(Hypervisor)* | `PenetrationBucker.bin`| **Penetration Bucker**| Ballistics | Overclocks bullet kinetic core to pierce multiple static walls and props. Rank 1: +2 pierce; Rank 2: +4 pierce; Rank 3: +8 pierce. |
| **Ring 1**<br>*(Hypervisor)* | `RapidFire.ovl` | **Rapid Fire** | Ballistics | Accelerates firing hammer and clip cycles. Rank 1: +40% fire rate, -20% reload; Rank 2: +80% fire rate, -35% reload; Rank 3: +120% fire rate, -50% reload. |
| **Ring 0**<br>*(Kernel Execution)* | `SilentAim.vmp` | **Silent Aim** | Reality-Bending | Disconnects visual camera aim from bullet trajectory. 100% predictive targeting, guaranteed critical hits, overrides and purges standard Aimbot. |
| **Ring 0**<br>*(Kernel Execution)* | `Noclip.drv` | **Noclip** | Physics Bypass | Unbinds chassis from collision matrices. Completely phases through static concrete walls and server rack obstacles without collision clamping. |
| **Ring 0**<br>*(Kernel Execution)* | `Rootkit.sys` | **Rootkit Purge** | Active Control | Tap `[F]` to discharge an EMP screen purge: incinerates all hostile projectiles across the arena, deals massive kernel shockwave damage (300-950), and grants 2.5s-4.0s invulnerability. |
| **Ring 0**<br>*(Kernel Execution)* | `KernelPanic.rip` | **Kernel Panic** | Catastrophic | Triggers severe memory dump: every 10/7/5 shots or upon receiving damage, erupts an omnidirectional ring of 16-32 critical piercing lasers. |

---

## 🔬 Permanent Firmware Micro-Upgrades

In the **Terminal Firmware Lab**, spend surplus crypto bounties to permanently upgrade your chassis hardware:
* **Buffer Expansion**: +20 Max HP per rank (up to +100 HP).
* **Overclocked Bus**: +14 Movement Speed per rank (up to +70 px/s).
* **Fast DMA I/O**: -10% Weapon Reload Time per rank (up to -50%).
* **Heuristic Spoofing**: Grants Draft Re-roll tokens (`[R]` in draft modal) per run.
* **Cache Magnet**: +40px Fragment & Crate Pickup Radius per rank (up to +200px).

---

## 🔊 Zero-Asset Procedural Web Audio Engine

Ring Zero contains **zero external audio files** (.mp3, .wav, .ogg). All audio synthesis is computed in real-time via the native browser `AudioContext`:
* **Exponential Ballistic Drop**: Snappy pitch bends with exponential gain decay envelopes.
* **Sub-Bass Shockwave Resonance**: Biquad low-pass filtered noise combined with low frequency sine sweeps.
* **Aimbot Target Lock Chimes**: Dual high-frequency micro-beeps at 1800 Hz and 2400 Hz.
* **Spinbot / Glitch Modulations**: Frequency-modulated square wave oscillators with rapid LFO vibrato.
* **Master & SFX Gain Buses**: Independent vector slider volume controls wired dynamically in settings.

---

## 🛡️ Anti-Tamper & Cryptographic Leaderboard

All run completions are cryptographically signed using browser-native **SubtleCrypto** (SHA-256):
$$\text{Checksum} = \text{SHA256}(\text{score} \parallel \text{waves} \parallel \text{kills} \parallel \text{bounties} \parallel \text{salt})$$
Runs submitted with modified memory state, tampered scores, or stale hashes are automatically rejected.

---

## 📐 System Architecture

* **Zero Build Step**: Native browser ES6 modules (`type="module"`). Compatible with any static HTTP server or GitHub Pages.
* **Fixed-Timestep Simulation Loop**: 60 Hz deterministic physics accumulator (`dt = 1/60`) with sub-frame alpha lerp interpolation for silky smooth high-refresh rendering.
* **Spatial Hash Partitioning**: 128 px uniform 2D grid reducing narrowphase tests from $O(N^2)$ to $O(N)$.
* **Zero-GC Preallocated Pools**: 1,200 projectile objects and 1,024 particle structs recycled with zero runtime heap allocation.
* **Procedural Environments**: BSP Binary Space Partitioning (Facility sector) and Cellular Automata rock caves (Decrypted Caverns) with 2D raycast visibility cones.

### Directory Structure
```
ring-zero/
├── .github/workflows/
│   └── deploy.yml              # Syntax validation, test suite & GitHub Pages CD
├── index.html                  # Boot terminal shell and canvas mounting point
├── styles/
│   ├── main.css                # Base responsive canvas styling
│   └── hud.css                 # Vector HUD, modals, sliders, and terminal CSS
├── src/
│   ├── main.js                 # Application bootstrap & user-gesture audio unlock
│   ├── core/
│   │   ├── Constants.js        # Simulation parameters, colors, collision bitmasks
│   │   ├── VectorMath.js       # Zero-allocation Vec2 math and geometric utilities
│   │   ├── GameLoop.js         # 60Hz fixed accumulator & sub-frame alpha loop
│   │   ├── InputManager.js     # Keyboard, mouse, crosshair, and aim tracking
│   │   ├── Camera2D.js         # Smooth tracking, mouse lead, trauma shake (T^2)
│   │   ├── ObjectPool.js       # High-performance zero-GC object pool
│   │   └── GameApp.js          # Core state orchestrator, pause, and lifecycle manager
│   ├── audio/
│   │   ├── SynthAudio.js       # Web Audio API pure synthesizer (zero audio files)
│   │   └── SoundBank.js        # Procedural SFX dispatchers and sound presets
│   ├── cheats/
│   │   ├── CheatDefinition.js  # 16-exploit registry, tiers, and interceptor base class
│   │   ├── AimbotCheat.js      # Predictive lead targeting
│   │   ├── WallhackCheat.js    # ESP wireframes and wall pierce
│   │   ├── SpinbotCheat.js     # Angle desync anti-aim
│   │   ├── OverclockDashCheat.js # Thruster cooldown and impulse
│   │   ├── SpeedhackCheat.js   # Bus velocity overclock
│   │   ├── TriggerbotCheat.js  # 0ms crosshair ray auto-fire
│   │   ├── DoubleTapCheat.js   # Multi-bullet packet duplicate
│   │   ├── BacktrackCheat.js   # 90-tick temporal spacetime rewind
│   │   ├── PacketChokeCheat.js # Incoming damage packet evasion
│   │   ├── RadarTelemetryCheat.js # Tactical circular radar HUD
│   │   ├── PenetrationBuckerCheat.js # Multi-wall bullet pierce
│   │   ├── RapidFireCheat.js   # Fire rate & reload cycle acceleration
│   │   ├── SilentAimCheat.js   # Kernel lock, triggerbot, trajectory curving
│   │   ├── NoclipCheat.js      # Geometric wall phasing
│   │   ├── RootkitCheat.js     # Active [F] Ring 0 EMP screen purge
│   │   └── KernelPanicCheat.js # Omnidirectional critical laser rings
│   ├── entities/
│   │   ├── Entity.js           # Base spatial entity
│   │   ├── Player.js           # Cyber-chassis kinematics, dash, and health
│   │   ├── Enemy.js            # Security daemons, flocking AI, and drop loot
│   │   ├── Projectile.js       # High-velocity ballistics, pierce, and lifetimes
│   │   └── Drop.js             # XP fragments, crypto bounties, weapon crates
│   ├── services/
│   │   ├── StorageService.js   # LocalStorage schema, firmware nodes, clearance
│   │   └── LeaderboardService.js # Async cryptographic SHA-256 verification
│   ├── systems/
│   │   ├── CheatManager.js     # Pipeline interceptor dispatcher & drafting
│   │   ├── CollisionSystem.js  # Narrowphase contacts, noclip, and bullet pierce
│   │   ├── SpatialHashGrid.js  # Uniform 2D broadphase spatial acceleration
│   │   ├── WeaponSystem.js     # Dual weapon slots, ballistics, and reloading
│   │   ├── WaveManager.js      # Procedural daemon scaling director
│   │   └── ParticleSystem.js   # High-efficiency vector debris emitter
│   ├── ui/
│   │   ├── VectorRenderer.js   # Procedural vector HUD drawing primitives
│   │   ├── TerminalUI.js       # Boot terminal, firmware lab, clearance shop
│   │   ├── DraftModal.js       # Exploit cards draft interface with [R] re-rolls
│   │   ├── PauseOverlay.js     # [ESC]/[P] hardware loadout & exploit inspector
│   │   └── SettingsModal.js    # Vector sliders for volume, shake, and debug grid
│   └── world/
│       ├── BSPFacilityMap.js   # Binary space partitioning concrete rooms
│       ├── CellularCavernMap.js # Cellular automata rock cavern generator
│       ├── DestructibleProp.js # Server racks and explosive fuel canisters
│       └── Raycaster2D.js      # Dynamic line-of-sight fog-of-war vision cone
└── test/
    ├── phase1_test.js          # Core math, physics loop, spatial hash tests
    ├── phase2_test.js          # Ballistics, weapons, and particle tests
    ├── phase3_test.js          # Exploit interceptor pipeline tests
    ├── phase4_test.js          # Procedural BSP, cellular maps, and raycast tests
    ├── phase5_test.js          # Web Audio, clearance hierarchy, and checksum tests
    └── arsenal_expansion_test.js # Settings, firmware, rerolls, and all 16 exploits
```

---

## 🚀 Local Development & Execution

Because **Ring Zero** uses pure standard ES6 modules without external packages or transpilers, no build tools or package managers are required.

### Quick Start:
```bash
# Clone repository
git clone https://github.com/Hanzkii/Ring-Zero.git
cd Ring-Zero

# Run with any static HTTP server (e.g. Node, Python, or VS Code Live Server)
python -m http.server 8080
# Or: npx serve .

# Open browser
open http://localhost:8080
```

### Running Automated Test Suites:
Run all 319 unit, regression, and gameplay invariant tests headless via Node.js:
```bash
node test/phase1_test.js
node test/phase2_test.js
node test/phase3_test.js
node test/phase4_test.js
node test/phase5_test.js
node test/arsenal_expansion_test.js
```

---

## 📜 License

MIT License. Crafted with precision for pure vector arcade fidelity.
