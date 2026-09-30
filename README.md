# Ring Zero

> **Privilege Escalation // 2D Procedural Kernel Shooter**  
> Built strictly with **Vanilla Modern JavaScript (ES6+ modules)**, **HTML5 Canvas 2D API**, and **CSS**.  
> **Zero external dependencies. Zero npm packages. Zero bundlers.**

---

## ⚡ Thematic Hook: Game Hacking / Privilege Escalation

In computer architecture, **Ring 0** represents kernel space with unrestricted direct memory access. In *Ring Zero*, the player weaponizes classic game exploits (`Aimbot.dll`, `Wallhack.lua`, `Spinbot.asi`, `DoubleTap.pkg`, `SilentAim.vmp`, `Backtrack.sys`) to dismantle relentless security waves and purge corrupted memory blocks.

### Visual Aesthetic: Minimalist Vector HUD
* **Razor-sharp vector primitives**: Crisp 1px strokes, clean circles, geometric hulls on a deep charcoal/slate background (`#070A0F`).
* **Telemetry-driven UI**: Precision crosshairs, angle dials, target lock boxes, vector trajectory lines, and minimalist geometric health/ammo gauges.
* **Coordinate & Glitch Feedback**: Subtle coordinate flickers and momentary vector slicing on critical hits or damage, preserving absolute combat readability.

---

## 🎮 Controls

| Action | Input |
| :--- | :--- |
| **Move** | `[W]`, `[A]`, `[S]`, `[D]` or Arrow Keys |
| **Target / Aim** | `[Mouse Pointer]` |
| **Primary Ballistic Fire** | `[LMB] (Left Mouse Button)` |
| **Hyper-Velocity Dash** | `[Space]` or `[RMB] (Right Mouse Button)` |
| **Toggle Spatial Hash Grid Debug** | `[G]` |

---

## 🛠️ System Architecture

* **Zero Build Step**: Native browser ES6 modules (`type="module"`). Push directly to GitHub and serve on GitHub Pages.
* **Deterministic 60 Hz Simulation**: Decoupled fixed-timestep physics accumulator loop (`src/core/GameLoop.js`) with sub-frame alpha lerp interpolation.
* **2D Uniform Spatial Hash Grid**: $128 \times 128\text{ px}$ broadphase partitioning (`src/systems/SpatialHashGrid.js`) ensuring $O(1)$ amortized collision queries.
* **Preallocated Object Pooling**: Zero-allocation pools (`src/core/ObjectPool.js`) for projectiles, damage floaters, and particles.
* **Smooth Camera2D**: Exponential tracking lerp, mouse lead offset, and non-linear trauma shake (`Trauma^2`).

### Directory Layout
```
ring-zero/
├── .github/
│   └── workflows/
│       └── deploy.yml        # Static validation & GitHub Pages CI/CD
├── index.html                # Entry point & boot terminal
├── styles/
│   ├── main.css              # Canvas responsive layout & reset
│   └── hud.css               # Minimalist vector HUD & terminal styling
├── src/
│   ├── main.js               # Bootstrap & user gesture audio unlock
│   ├── core/
│   │   ├── Constants.js      # Simulation rates, colors, collision layers
│   │   ├── VectorMath.js     # Zero-allocation Vec2 math & helpers
│   │   ├── GameLoop.js       # 60Hz fixed accumulator loop
│   │   ├── InputManager.js   # Keyboard & mouse targeting manager
│   │   ├── Camera2D.js       # Viewport tracking, mouse lead, trauma shake
│   │   ├── ObjectPool.js     # Preallocated zero-GC object pool
│   │   └── GameApp.js        # State machine & engine orchestrator
│   ├── systems/
│   │   └── SpatialHashGrid.js# 2D broadphase spatial partitioning
│   ├── entities/
│   │   ├── Entity.js         # Base entity with tick interpolation
│   │   └── Player.js         # Cyber-chassis with vector rendering & dash
│   └── ui/
│       └── VectorRenderer.js # Crisp 1px line paths & telemetry primitives
└── test/
    └── phase1_test.js        # Node.js automated verification test suite
```

---

## 🚀 Running Locally

Because Ring Zero uses standard ES6 modules, modern browsers require an HTTP server when running locally (to satisfy standard CORS policies on modules):

### Using Python (Built-in)
```bash
python -m http.server 8000
```
Then navigate to: `http://localhost:8000`

### Using Node.js (Built-in `npx`)
```bash
npx serve .
```

### Automated GitHub Pages Deployment
Any push to the `main` branch automatically triggers `.github/workflows/deploy.yml` which validates all ES6 modules and deploys the game directly to GitHub Pages.
