# Ring Zero

```text
  ██████╗ ██╗███╗   ██╗ ██████╗     ███████╗███████╗██████╗  ██████╗ 
  ██╔══██╗██║████╗  ██║██╔════╝     ╚══███╔╝██╔════╝██╔══██╗██╔═══██╗
  ██████╔╝██║██╔██╗ ██║██║  ███╗      ███╔╝ █████╗  ██████╔╝██║   ██║
  ██╔══██╗██║██║╚██╗██║██║   ██║     ███╔╝  ██╔══╝  ██╔══██╗██║   ██║
  ██║  ██║██║██║ ╚████║╚██████╔╝    ███████╗███████╗██║  ██║╚██████╔╝
  ╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝ ╚═════╝     ╚══════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ 
```

> **4-Tier Protection Ring Privilege Escalation // Vector Cyber Shooter**  
> Built strictly with **Vanilla Modern JavaScript (ES6+ Modules)**, **HTML5 Canvas 2D API**, and native **Web Audio API**.  
> **Zero external dependencies. Zero npm packages. Zero bundlers. Zero binary audio assets.**

[![Deploy Ring Zero to GitHub Pages](https://github.com/Hanzkii/Ring-Zero/actions/workflows/deploy.yml/badge.svg)](https://github.com/Hanzkii/Ring-Zero/actions/workflows/deploy.yml)

---

## ⚡ Project Overview & Architecture Pillars

In CPU protection ring architecture, system privilege is hierarchical:
- **Ring 3**: Userland applications (sandboxed, restricted permissions).
- **Ring 2**: Hardware device drivers & communication buses.
- **Ring 1**: Hypervisor & virtual machine monitors (VMM).
- **Ring 0**: Kernel space (unrestricted physical CPU execution & raw memory).

In **Ring Zero**, your cyber-chassis is trapped in a virtualized user space container. Hostile sanitization daemons systematically eliminate all running userland threads. To survive and breach kernel space, you must fight through milestone waves (15, 30, 45, 60+), drafting exploit injections, acquiring ring-specific prototype weaponry, triggering signature privilege abilities, and ascending through the protection hierarchy down to **Ring 0**.

### Core Technical Pillars:
1. **Zero External Dependencies**: 100% vanilla ES6+ modules with native browser APIs.
2. **Deterministic 60Hz Physics**: Fixed simulation step accumulator (`dt = 1/60s`) with sub-frame alpha interpolation for buttery-smooth high-refresh rendering.
3. **Procedural Web Audio Engine**: 4 procedural soundtrack profiles synthesized at runtime with real-time FM synthesis, dual-detuned Reese bass oscillators, and resonant filter sweeps.
4. **Zero-GC Object Pools**: Preallocated 1,200 projectile objects and 1,024 particle structs recycled with zero runtime garbage collection hitches.
5. **Spatial Hash Partitioning**: 128px uniform spatial hash grid accelerating collision queries from $O(N^2)$ to $O(N)$.
6. **Cryptographic Anti-Tamper Verification**: SubtleCrypto SHA-256 telemetry signing for leaderboard score integrity.

---

## 🛡️ 4-Tier Protection Ring Content Matrix

| Ring Clearance | Waves | Visual Theme & Palette | Procedural OST Profile | Signature Ability |
| :--- | :---: | :--- | :--- | :--- |
| **Ring 3: Userland** | 1–15 | Terminal Cyan (`#00F0FF`) & Matrix Green (`#00FF66`) | Mellow Synthwave (~114 BPM, D minor pentatonic, warm filtered saws) | `FORK()` — Directional thruster dash leaving high-density particle trails |
| **Ring 2: Device Drivers** | 16–30 | PCB Trace Amber (`#FFB000`) & Warning Orange (`#FF5500`) | Industrial EBM (~132 BPM, sharp 2:1 FM metallic bass, driving 16th arps) | `IRQ_TRIGGER` — Reflective parry shockwave deflecting bullets and damaging hostiles |
| **Ring 1: Hypervisor** | 31–45 | Virtual Magenta (`#D900FF`) & Ultraviolet (`#8800FF`) | Aggressive Darksynth (~150 BPM, C# Phrygian, distorted saw chugs & pitch slides) | `PAGE_FAULT` — Phase blink leaving an aggro-drawing holographic decoy |
| **Ring 0: Kernel Space** | 46+ | Crimson Hazard (`#FF003C`) & Monolithic Black (`#070A0F`) | Cybercore / Dark D&B (~170 BPM, chaotic dual-detuned Reese bass & breakbeats) | `ROOTKIT.SYS` — Global screen purge ('F') destroying bullets & freezing memory |

---

## 🔫 Complete 16-Weapon Arsenal

All 16 weapons feature distinct ballistic profiles, damage formulas, pellet dynamics, and vector projectile aesthetics:

### Ring 3: Userland (Waves 1–15)
- **`SIGTERM`**: Semi-automatic precision pulse pistol. Clean kinetic accuracy and reliable single-target stopping power.
- **`STDERR_STREAM`**: Short-range wide cone error spray. Triple-pellet scatter ideal for early crowd suppression.
- **`SOCKET_BLASTER`**: High fire-rate spray carbine. Rapid transmission cycling for continuous suppression.
- **`CHMOD_777`**: Wide 8-pellet flak scatter shotgun. Maximum point-blank permissions and heavy knockback.

### Ring 2: Device Drivers (Waves 16–30)
- **`DMA_RAIL`**: High-velocity direct memory access railgun piercing through up to 3 hostiles.
- **`INTERRUPT_VECTOR`**: Arc-lightning disruptor discharging volatile sub-pulses across clustered hostiles.
- **`BUS_BURST`**: 4-round hardware bus burst carbine delivering dense kinetic bursts with sharp recoil climb.
- **`OVERCLOCK_ROTARY`**: Spooling rotary autocannon with progressive 16.0 fire-rate output.

### Ring 1: Hypervisor (Waves 31–45)
- **`SHADOW_PAGE`**: Synchronized twin-beam weapon firing mirrored projectiles on parallel axes.
- **`CONTAINER_BREACH`**: Pressurized cluster projectile detonating into 4 volatile sub-munitions upon impact.
- **`VMM_PHASOR`**: Relativistic beam weapon boring through shielding, armor, and concrete walls.
- **`VM_SINGULARITY`**: Gravitational vortex core generating negative knockback that draws minor hostiles toward impact zero.

### Ring 0: Kernel Space (Waves 46+)
- **`NULL_POINTER`**: Absolute de-allocation laser instantly vaporizing memory structures with 260 damage and 8-target wall pierce.
- **`BUFFER_OVERFLOW`**: Hyper-frequency cascade firing 18 rounds/sec that fragments into memory leak clusters.
- **`KERNEL_PANIC`**: Catastrophic 12-pellet omnidirectional pulse wave blasting through walls with 350 damage.
- **`ROOTKIT_EXEC`**: Parasitic exploit shot that corrupts hostiles, converting eliminated targets into secondary explosive nodes.

---

## 🏆 Ring-Specific Achievements System

The engine tracks both run-scoped milestones and career persistent achievements. Achievement notifications auto-dismiss after 4.0 seconds without UI clutter or DOM leaks:

| Achievement ID | Title | Unlock Condition | Badge Tag |
| :--- | :--- | :--- | :--- |
| `[ACH_R3_ESCAPE]` | **Sandbox Escape** | Clear Wave 15 and ascend to Ring 2 (Device Drivers). | `[R3_ESCAPE]` |
| `[ACH_R3_CLEAN]` | **Clean Memory** | Survive 5 consecutive waves without sustaining chassis damage. | `[MEM_CLEAN]` |
| `[ACH_R2_HARDWARE]` | **Driver Initialized** | Clear Wave 30 and ascend to Ring 1 (Hypervisor). | `[R2_DRIVER]` |
| `[ACH_R2_PARRY]` | **IRQ Handler** | Eliminate 25 hostiles using the `IRQ_TRIGGER` reflective parry shockwave. | `[IRQ_PARRY]` |
| `[ACH_R1_BREACH]` | **Hypervisor Collapse** | Clear Wave 45 and breach Ring 0 (Kernel Space). | `[R1_BREACH]` |
| `[ACH_R1_GHOST]` | **Ghost Thread** | Evade damage 30 times using the `PAGE_FAULT` phase blink. | `[PAGE_FAULT]` |
| `[ACH_R0_ROOT]` | **UID 0 Attained** | Breach and survive inside Ring 0 Kernel Execution (Wave 46+). | `[UID_0]` |
| `[ACH_R0_PANIC]` | **Kernel Panic Survivor** | Survive for 90 cumulative seconds within the Ring 0 hazard zone. | `[KERNEL_SURV]` |

---

## 🎮 Controls Reference

| Action | Primary Input | Secondary / Alternative |
| :--- | :--- | :--- |
| **Movement / Strafe** | `[W]`, `[A]`, `[S]`, `[D]` | Arrow Keys |
| **Aim Direction** | `[Mouse Pointer]` | Dynamic 360° Cursor Tracking |
| **Primary Fire** | `[LMB]` (Left Mouse Button) | Auto-Fire via Triggerbot exploit |
| **Signature Ability / Dash** | `[Space]` | `[Shift]` or `[RMB]` (Right Mouse Button) |
| **Rootkit EMP Purge** | `[F]` | Ring 0 Active Screen Wiping Shockwave |
| **Manual Reload** | `[R]` | Automatic on empty clip |
| **Swap Weapon Slot** | `[Q]` | `[1]` / `[2]` Direct Slot Select |
| **Draft Card Select** | `[1]`, `[2]`, `[3]`, `[4]`, `[5]` | Direct Card Click |
| **Re-roll Draft Options** | `[R]` (in draft modal) | Spends Heuristic Spoofing token |
| **Pause / Resume** | `[ESC]` or `[P]` | Suspends simulation clock & opens menu |
| **Spatial Grid Debug Overlay**| `[G]` | Toggles real-time spatial hash grid cells |

---

## 🧪 Local Testing & Development Guide

Ring Zero uses standard ES Modules and requires an HTTP/HTTPS context (browser security restrictions disallow `file:///` ES module loading).

### Option 1: Python HTTP Server (Recommended)
```bash
python -m http.server 8000
# Open http://localhost:8000 in your browser
```

### Option 2: Node.js Serve
```bash
npx serve .
# Open the displayed localhost URL
```

### Option 3: Syntax Validation Suite
Verify all JavaScript modules before deployment:
```bash
node --check src/core/GameApp.js
node --check src/systems/WeaponSystem.js
node --check src/systems/AchievementSystem.js
node --check src/ui/AchievementUI.js
node --check src/ui/DraftModal.js
node --check src/ui/TerminalUI.js
node --check src/audio/SynthMusic.js
node --check src/audio/SoundBank.js
```

---

## 🚀 GitHub Pages Deployment

The project contains a pre-configured GitHub Actions workflow located at `.github/workflows/deploy.yml`. 

Any push directly to the `main` branch automatically verifies and deploys the static game bundle to GitHub Pages:
1. Commit and push changes: `git push origin main`.
2. The GitHub Actions runner builds and deploys artifacts to the `github-pages` environment.
3. Access the live production game at: `https://<username>.github.io/Ring-Zero/`.
