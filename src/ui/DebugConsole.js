/**
 * Ring Zero - Developer Debug Console & Authenticated Runtime Inspector
 * Toggled via Backquote (`) or F1.
 * Secured by Kernel Passphrase: "null404".
 *
 * Supported Commands:
 *  - auth <passphrase> : Unlocks elevated developer session (passphrase: null404)
 *  - god               : Toggles complete player invulnerability
 *  - unlockall         : Unlocks all 16 exploits (max rank), all weapons, and maxes firmware perks
 *  - givecrypto <amt>  : Injects Bitcoin / crypto bounties to run and persistent wallet
 *  - noclip            : Toggles geometry wall-phasing
 *  - killall           : Purges all currently active enemies in wave with drops
 *  - nextwave          : Skips current wave tier immediately
 *  - timescale <val>   : Sets fixed simulation loop time scale (e.g. 0.2 slow-mo, 2.0 fast)
 *  - debug <mode>      : Toggles visual overlays (hitboxes, spatial, raycast, backtrack, all, none)
 *  - help              : Lists available commands and authentication state
 *  - clear             : Clears console output
 */

import { COLOR } from '../core/Constants.js';
import { CHEAT_REGISTRY, RING_TIER } from '../cheats/CheatDefinition.js';
import { WEAPON_ARCHETYPES, WeaponInstance } from '../systems/WeaponSystem.js';

export const AUTH_PASSPHRASE = 'null404';

export const COMMAND_REGISTRY = {
  auth: {
    args: ['null404'],
    syntax: 'auth <passphrase>',
    desc: 'Elevate session privileges (auth null404)',
  },
  god: {
    args: [],
    syntax: 'god',
    desc: 'Toggle complete player invulnerability',
  },
  unlockall: {
    args: [],
    syntax: 'unlockall',
    desc: 'Unlock all 16 exploits, weapons, & max firmware',
  },
  givecrypto: {
    args: ['100', '500', '1000'],
    syntax: 'givecrypto <amount>',
    desc: 'Add Bitcoin / crypto bounty funds',
  },
  noclip: {
    args: [],
    syntax: 'noclip',
    desc: 'Toggle geometry wall-phasing',
  },
  killall: {
    args: [],
    syntax: 'killall',
    desc: 'Purge all active wave daemons',
  },
  nextwave: {
    args: [],
    syntax: 'nextwave',
    desc: 'Skip to next wave tier',
  },
  timescale: {
    args: ['0.2', '0.5', '1.0', '2.0'],
    syntax: 'timescale <float>',
    desc: 'Adjust fixed game loop simulation speed',
  },
  debug: {
    args: ['hitboxes', 'spatial', 'raycast', 'backtrack', 'all', 'none'],
    syntax: 'debug <mode>',
    desc: 'Toggle visual diagnostics [hitboxes|spatial|raycast|backtrack|all|none]',
  },
  help: {
    args: [],
    syntax: 'help',
    desc: 'List available commands',
  },
  clear: {
    args: [],
    syntax: 'clear',
    desc: 'Clear console display',
  },
};

export class DebugConsole {
  /**
   * @param {Object} options
   * @param {import('../core/GameApp.js').GameApp} options.gameApp
   * @param {import('./DebugRenderer.js').DebugRenderer} options.debugRenderer
   */
  constructor({ gameApp, debugRenderer }) {
    this.gameApp = gameApp;
    this.debugRenderer = debugRenderer;

    this.isOpen = false;
    this.isAuthenticated = false;
    this.history = [];
    this.historyIndex = -1;

    this.tabMatches = [];
    this.tabIndex = 0;
    this.lastTabQuery = null;
    this.tabMode = 'command';

    if (typeof document !== 'undefined') {
      this.container = document.createElement('div');
      this.container.id = 'debug-console';
      this.container.style.position = 'absolute';
      this.container.style.bottom = '0';
      this.container.style.left = '0';
      this.container.style.width = '100vw';
      this.container.style.height = '280px';
      this.container.style.background = 'rgba(5, 8, 12, 0.95)';
      this.container.style.borderTop = `2px solid ${COLOR.CYAN}`;
      this.container.style.boxShadow = '0 -4px 20px rgba(0, 240, 255, 0.2)';
      this.container.style.zIndex = '9999';
      this.container.style.display = 'none';
      this.container.style.flexDirection = 'column';
      this.container.style.fontFamily = 'monospace';
      this.container.style.fontSize = '12px';
      this.container.style.padding = '8px 12px';
      this.container.style.boxSizing = 'border-box';

      this.container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(0,240,255,0.25); padding-bottom: 4px; margin-bottom: 6px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="color: ${COLOR.CYAN}; font-weight: bold;">// RING_ZERO KERNEL CONSOLE //</span>
            <span id="dbg-auth-badge" style="color: ${COLOR.RED}; font-size: 11px;">[ACCESS LOCKED: UNAUTHENTICATED]</span>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="color: rgba(255,255,255,0.5); font-size: 11px;">OPEN: [ ESC &gt; DEV CONSOLE ] | TOGGLE: [ \` / F1 ]</span>
            <button id="dbg-close-btn" style="background: rgba(255,0,60,0.15); border: 1px solid ${COLOR.RED}; color: ${COLOR.RED}; padding: 2px 8px; font-family: monospace; font-size: 11px; cursor: pointer;">[X] CLOSE</button>
          </div>
        </div>
        <div id="dbg-log" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; padding-right: 6px; margin-bottom: 6px;">
          <div style="color: rgba(255,255,255,0.6);">Ring Zero Developer Diagnostics initialized. Type 'help' for available commands.</div>
          <div style="color: ${COLOR.AMBER};">Elevated commands require authentication: 'auth null404'</div>
        </div>
        <div id="dbg-hints" style="
          display: none; padding: 4px 8px; margin-bottom: 6px;
          background: rgba(8, 16, 24, 0.95); border: 1px solid rgba(0, 240, 255, 0.3);
          border-left: 3px solid ${COLOR.CYAN}; color: ${COLOR.CYAN}; font-size: 11px;
        "></div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="color: ${COLOR.CYAN}; font-weight: bold;">root@ring0:~#</span>
          <input type="text" id="dbg-input" autocomplete="off" spellcheck="false" style="
            flex: 1; background: #080D14; border: 1px solid ${COLOR.CYAN}; color: #FFFFFF;
            font-family: monospace; font-size: 12px; padding: 4px 8px; outline: none;
          ">
        </div>
      `;

      if (document.body) {
        document.body.appendChild(this.container);
      }

      this.logEl = this.container.querySelector('#dbg-log');
      this.inputEl = this.container.querySelector('#dbg-input');
      this.badgeEl = this.container.querySelector('#dbg-auth-badge');
      this.closeBtn = this.container.querySelector('#dbg-close-btn');
      this.hintsEl = this.container.querySelector('#dbg-hints');

      this._bindEvents();
    } else {
      this.container = null;
      this.logEl = null;
      this.inputEl = null;
      this.badgeEl = null;
      this.closeBtn = null;
      this.hintsEl = null;
    }
  }

  _bindEvents() {
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
    }

    if (this.container) {
      this.container.addEventListener('keydown', (e) => {
        // Stop propagation of console container key events to prevent engine interference
        if (e.target !== this.inputEl) {
          e.stopPropagation();
          if (e.code === 'Backquote' || e.key === '`' || e.code === 'F1' || e.code === 'Escape') {
            e.preventDefault();
            this.close();
          }
        }
      });
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (e) => {
        if (e.code === 'Backquote' || e.key === '`' || e.code === 'F1') {
          e.preventDefault();
          this.toggle();
        } else if (e.code === 'Escape' && this.isOpen) {
          e.preventDefault();
          this.close();
        }
      });
    }

    if (this.inputEl) {
      // 1. ISOLATE ALL KEY EVENTS: Stop propagation to prevent window / InputManager / GameApp from intercepting
      this.inputEl.addEventListener('keydown', (e) => {
        // Stop propagation so Space, P, WASD, Numbers, Escape do not bubble to InputManager or GameApp
        e.stopPropagation();

        if (e.code === 'Backquote' || e.key === '`' || e.code === 'F1') {
          e.preventDefault();
          this.close();
          return;
        }

        if (e.code === 'Escape') {
          e.preventDefault();
          this.close();
          return;
        }

        if (e.code === 'Tab') {
          e.preventDefault(); // Prevent default browser focus shifts
          this.handleTab();
          return;
        }

        if (e.code === 'Enter') {
          e.preventDefault();
          const cmd = this.inputEl.value.trim();
          if (cmd) {
            this.execute(cmd);
            this.history.push(cmd);
            this.historyIndex = this.history.length;
            this.inputEl.value = '';
            this.updateHints('');
          }
          return;
        }

        if (e.code === 'ArrowUp') {
          e.preventDefault();
          if (this.historyIndex > 0) {
            this.historyIndex--;
            this.inputEl.value = this.history[this.historyIndex] || '';
            this.updateHints(this.inputEl.value);
          }
          return;
        }

        if (e.code === 'ArrowDown') {
          e.preventDefault();
          if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.inputEl.value = this.history[this.historyIndex] || '';
            this.updateHints(this.inputEl.value);
          } else {
            this.historyIndex = this.history.length;
            this.inputEl.value = '';
            this.updateHints('');
          }
          return;
        }

        // Space and all character keys:
        // Do NOT call e.preventDefault(), allowing Space and typing to append normally into the input.
        // Invalidate tab cycling when typing new characters.
        if (e.key.length === 1 || e.code === 'Backspace' || e.code === 'Delete') {
          this.tabMatches = [];
          this.tabIndex = 0;
          this.lastTabQuery = null;
        }
      });

      this.inputEl.addEventListener('keyup', (e) => {
        e.stopPropagation();
      });

      this.inputEl.addEventListener('input', () => {
        this.tabMatches = [];
        this.tabIndex = 0;
        this.lastTabQuery = null;
        this.updateHints(this.inputEl.value);
      });
    }
  }

  /**
   * Generates autocomplete suggestions and syntax information based on current input buffer
   * @param {string} inputStr
   * @returns {Object}
   */
  getSuggestions(inputStr) {
    const raw = (inputStr || '').trimStart();
    if (!raw) {
      return {
        mode: 'empty',
        matches: Object.keys(COMMAND_REGISTRY),
        syntax: 'Type command or press TAB to view/cycle commands',
      };
    }

    const hasTrailingSpace = /\s+$/.test(raw);
    const parts = raw.split(/\s+/);
    const cmdInput = parts[0].toLowerCase();

    // If there is only one token and NO trailing space, we are typing the command name
    if (parts.length === 1 && !hasTrailingSpace) {
      const matches = Object.keys(COMMAND_REGISTRY).filter((c) => c.startsWith(cmdInput));
      const exact = COMMAND_REGISTRY[cmdInput];
      return {
        mode: 'command',
        query: cmdInput,
        matches,
        exactDef: exact || null,
        syntax: exact ? `${exact.syntax} — ${exact.desc}` : `Matches: [ ${matches.join(', ')} ]`,
      };
    }

    // Otherwise, we are completing arguments for the command
    const cmdDef = COMMAND_REGISTRY[cmdInput];
    if (!cmdDef) {
      return {
        mode: 'unknown',
        matches: [],
        syntax: `Unknown command "${cmdInput}". Type "help" for list.`,
      };
    }

    // Argument prefix is what's being typed after the command
    const argInput = hasTrailingSpace && parts.length === 1 ? '' : (parts[1] || '').toLowerCase();
    const argMatches = (cmdDef.args || []).filter((arg) => arg.toLowerCase().startsWith(argInput));

    return {
      mode: 'argument',
      command: cmdInput,
      query: argInput,
      matches: argMatches,
      allArgs: cmdDef.args,
      syntax: `${cmdDef.syntax} — ${cmdDef.desc}`,
    };
  }

  /**
   * Renders real-time command syntax and argument suggestions above the prompt
   * @param {string} value
   */
  updateHints(value) {
    if (!this.hintsEl) return;
    const info = this.getSuggestions(value);

    if (info.mode === 'empty') {
      this.hintsEl.style.display = 'none';
      this.hintsEl.innerHTML = '';
      return;
    }

    this.hintsEl.style.display = 'block';

    if (info.mode === 'command') {
      if (info.exactDef) {
        this.hintsEl.innerHTML = `
          <span style="color: ${COLOR.CYAN}; font-weight: bold;">SYNTAX:</span>
          <span style="color: #FFF;"> ${info.exactDef.syntax}</span>
          <span style="color: rgba(255,255,255,0.6);"> &bull; ${info.exactDef.desc}</span>
          ${info.exactDef.args.length > 0 ? `<span style="color: ${COLOR.AMBER};"> (Press TAB for arguments)</span>` : ''}
        `;
      } else if (info.matches.length > 0) {
        const formatted = info.matches
          .map((m, i) => `<span style="color: ${i === 0 ? COLOR.GREEN : COLOR.CYAN}; font-weight: ${i === 0 ? 'bold' : 'normal'};">[${m}]</span>`)
          .join(' ');
        this.hintsEl.innerHTML = `
          <span style="color: rgba(255,255,255,0.7);">MATCHES: </span>${formatted}
          <span style="color: ${COLOR.AMBER}; font-size: 10px;"> (Press TAB to complete)</span>
        `;
      } else {
        this.hintsEl.innerHTML = `<span style="color: ${COLOR.RED};">No matching commands. Type 'help' for commands.</span>`;
      }
    } else if (info.mode === 'argument') {
      if (info.allArgs && info.allArgs.length > 0) {
        const formatted = info.allArgs
          .map((a) => {
            const isMatch = info.matches.includes(a);
            return `<span style="color: ${isMatch ? COLOR.GREEN : 'rgba(255,255,255,0.3)'}; font-weight: ${isMatch ? 'bold' : 'normal'};">[${a}]</span>`;
          })
          .join(' ');
        this.hintsEl.innerHTML = `
          <span style="color: ${COLOR.CYAN}; font-weight: bold;">${info.syntax}</span>
          <div style="margin-top: 2px;">
            <span style="color: rgba(255,255,255,0.7);">OPTIONS: </span>${formatted}
            <span style="color: ${COLOR.AMBER}; font-size: 10px;"> (Press TAB to cycle)</span>
          </div>
        `;
      } else {
        this.hintsEl.innerHTML = `<span style="color: ${COLOR.CYAN}; font-weight: bold;">${info.syntax}</span>`;
      }
    } else {
      this.hintsEl.innerHTML = `<span style="color: ${COLOR.RED};">${info.syntax}</span>`;
    }
  }

  /**
   * Handles Tab completion and argument cycling
   */
  handleTab() {
    if (!this.inputEl) return;
    const currentVal = this.inputEl.value;

    // Check if we need to query new suggestions
    if (this.lastTabQuery === null || this.lastTabQuery !== currentVal || this.tabMatches.length === 0) {
      const info = this.getSuggestions(currentVal);
      if (!info.matches || info.matches.length === 0) return;

      this.tabMatches = info.matches;
      this.tabIndex = 0;
      this.tabMode = info.mode;
      this.tabCommand = info.command || null;
    }

    if (this.tabMatches.length === 0) return;

    const chosen = this.tabMatches[this.tabIndex % this.tabMatches.length];
    this.tabIndex++;

    if (this.tabMode === 'command' || this.tabMode === 'empty') {
      const cmdDef = COMMAND_REGISTRY[chosen];
      if (cmdDef && cmdDef.args.length > 0) {
        this.inputEl.value = `${chosen} `;
      } else {
        this.inputEl.value = chosen;
      }
      // If there was only 1 command match (e.g. "deb" -> "debug "), reset tab query
      // so the next Tab press immediately starts completing arguments!
      if (this.tabMatches.length === 1) {
        this.lastTabQuery = null;
        this.tabMatches = [];
      } else {
        this.lastTabQuery = this.inputEl.value;
      }
    } else if (this.tabMode === 'argument') {
      const parts = currentVal.trimStart().split(/\s+/);
      const cmd = parts[0];
      this.inputEl.value = `${cmd} ${chosen}`;
      this.lastTabQuery = this.inputEl.value;
    }

    this.updateHints(this.inputEl.value);
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    this.isOpen = true;
    if (this.container) {
      this.container.style.display = 'flex';
    }
    this.updateHints(this.inputEl ? this.inputEl.value : '');
    if (this.inputEl && typeof setTimeout !== 'undefined') {
      setTimeout(() => this.inputEl.focus(), 20);
    }
  }

  close() {
    this.isOpen = false;
    if (this.container) {
      this.container.style.display = 'none';
    }
    if (this.hintsEl) {
      this.hintsEl.style.display = 'none';
    }
    this.tabMatches = [];
    this.tabIndex = 0;
    this.lastTabQuery = null;
    if (this.inputEl) {
      this.inputEl.blur();
    }
  }

  log(message, color = '#FFFFFF') {
    if (this.logEl && typeof document !== 'undefined') {
      const el = document.createElement('div');
      el.style.color = color;
      el.textContent = message;
      this.logEl.appendChild(el);
      this.logEl.scrollTop = this.logEl.scrollHeight;
    }
  }

  /**
   * Parses and executes input command string
   * @param {string} rawCommand
   * @returns {string} Result message
   */
  execute(rawCommand) {
    this.log(`root@ring0:~# ${rawCommand}`, COLOR.CYAN);

    const parts = rawCommand.trim().split(/\s+/);
    const cmd = parts[0]?.toLowerCase();
    const arg1 = parts[1];
    const arg2 = parts[2];

    switch (cmd) {
      case 'help':
        this.log('--- RING ZERO DEVELOPER COMMANDS ---', COLOR.CYAN);
        this.log('  auth <passphrase> : Elevate session privileges (auth null404)', '#DDD');
        this.log('  god               : Toggle complete player invulnerability', '#DDD');
        this.log('  unlockall         : Unlock all 16 exploits, weapons, & max firmware', '#DDD');
        this.log('  givecrypto <amt>  : Add Bitcoin / crypto bounty funds', '#DDD');
        this.log('  noclip            : Toggle geometry wall-phasing', '#DDD');
        this.log('  killall           : Purge all active wave daemons', '#DDD');
        this.log('  nextwave          : Skip to next wave tier', '#DDD');
        this.log('  timescale <float> : Adjust fixed game loop simulation speed', '#DDD');
        this.log('  debug <mode>      : Toggles [hitboxes|spatial|raycast|backtrack|all|none]', '#DDD');
        this.log('  clear             : Clear console display', '#DDD');
        return 'Help rendered';

      case 'clear':
        if (this.logEl) {
          this.logEl.innerHTML = '';
        }
        return 'Console cleared';

      case 'auth':
        if (arg1 === AUTH_PASSPHRASE) {
          this.isAuthenticated = true;
          if (this.badgeEl) {
            this.badgeEl.textContent = '[KERNEL PRIVILEGES ELEVATED: RING 0]';
            this.badgeEl.style.color = COLOR.GREEN;
          }
          this.log('[SUCCESS] Cryptographic signature verified. Elevated session granted.', COLOR.GREEN);
          return 'Authenticated';
        } else {
          this.log('[ERROR] Invalid cryptographic passphrase. Access denied.', COLOR.RED);
          return 'Auth failed';
        }

      // -------------------------------------------------------------
      // PRIVILEGED DEVELOPER COMMANDS (Requires Authentication)
      // -------------------------------------------------------------
      default: {
        if (!this.isAuthenticated) {
          this.log('ACCESS DENIED: KERNEL AUTH REQUIRED. USE \'auth <passphrase>\'', COLOR.RED);
          return 'Access denied';
        }

        return this._executePrivileged(cmd, arg1, arg2);
      }
    }
  }

  _executePrivileged(cmd, arg1, arg2) {
    const app = this.gameApp;
    if (app) {
      app.cheatedThisRun = true;
    }

    switch (cmd) {
      case 'god': {
        if (!app.player) return 'No player';
        app.player.godMode = !app.player.godMode;
        if (app.player.godMode) {
          app.player.health = app.player.maxHealth;
        }
        const msg = `[GODMODE] ${app.player.godMode ? 'ENABLED (INVULNERABLE)' : 'DISABLED'}`;
        this.log(msg, COLOR.AMBER);
        return msg;
      }

      case 'unlockall': {
        // 1. Install all 16 exploits at max level 3
        if (app.cheatManager) {
          for (const cheatDef of Object.values(CHEAT_REGISTRY)) {
            const cheat = app.cheatManager.addOrUpgradeCheat(cheatDef.id);
            if (cheat) {
              cheat.level = 3;
              cheat.enabled = true;
            }
          }
          app.cheatManager.clearanceRing = RING_TIER.RING_0;
        }
        if (app.storage) {
          app.storage.state.clearanceRing = RING_TIER.RING_0;

          // 3. Max out all permanent firmware perks to Level 5
          const nodes = ['bufferExpansion', 'overclockedBus', 'fastDma', 'heuristicSpoofing', 'cacheMagnet'];
          for (const node of nodes) {
            app.storage.state.firmware[node] = 5;
          }
          if (typeof app.storage.save === 'function') {
            app.storage.save();
          }
        }

        // 2. Unlock all weapons in slots / inventory
        if (app.weaponSystem) {
          const weapons = Object.values(WEAPON_ARCHETYPES);
          app.weaponSystem.slots = [];
          for (const w of weapons) {
            app.weaponSystem.slots.push(app.weaponSystem._wireInstance(new WeaponInstance(w)));
          }
        }

        if (typeof app.applyFirmwareBonuses === 'function') {
          app.applyFirmwareBonuses();
        }

        const msg = '[UNLOCKALL] All 16 exploits maxed, all weapons granted, all firmware perks elevated to Rank 5.';
        this.log(msg, COLOR.GREEN);
        return msg;
      }

      case 'givecrypto': {
        const amount = parseInt(arg1, 10) || 500;
        if (app.player) {
          app.player.bounties = (app.player.bounties || 0) + amount;
        }
        if (app.storage && typeof app.storage.addBounties === 'function') {
          app.storage.addBounties(amount);
        }
        const total = app.storage ? app.storage.cryptoBounties : amount;
        const msg = `[ECONOMY] Injected +${amount} BTC into current run and persistent wallet. (Total: ${total} BTC)`;
        this.log(msg, COLOR.AMBER);
        return msg;
      }

      case 'noclip': {
        let isNew = false;
        let noclip = app.cheatManager ? app.cheatManager.getCheat('noclip') : null;
        if (!noclip && app.cheatManager) {
          noclip = app.cheatManager.addOrUpgradeCheat('noclip');
          isNew = true;
        }
        if (noclip) {
          if (!isNew) {
            noclip.enabled = !noclip.enabled;
          } else {
            noclip.enabled = true;
          }
          if (app.player) {
            app.player.noclip = noclip.enabled;
          }
          const msg = `[NOCLIP] Geometry bypass ${noclip.enabled ? 'ACTIVE' : 'DEACTIVATED'}`;
          this.log(msg, COLOR.CYAN);
          return msg;
        }
        if (app.player) {
          app.player.noclip = !app.player.noclip;
          const msg = `[NOCLIP] Geometry bypass ${app.player.noclip ? 'ACTIVE' : 'DEACTIVATED'}`;
          this.log(msg, COLOR.CYAN);
          return msg;
        }
        return 'Noclip toggle failed';
      }

      case 'killall': {
        let killed = 0;
        if (app.enemies) {
          for (const enemy of app.enemies) {
            if (enemy.active && !enemy.markedForRemoval) {
              enemy.takeDamage(9999, null, 0);
              killed++;
              if (app.drops && typeof enemy.generateDrops === 'function') {
                const drops = enemy.generateDrops(app.cheatManager ? app.cheatManager.clearanceRing : 3);
                for (const drop of drops) {
                  app.drops.push(drop);
                }
              }
            }
          }
          app.enemies = app.enemies.filter(e => !e.markedForRemoval);
        }
        const msg = `[PURGE] Purged ${killed} security daemons. Drops spawned.`;
        this.log(msg, COLOR.RED);
        return msg;
      }

      case 'nextwave': {
        app.waveManager.waveTime = app.waveManager.waveDuration;
        const msg = `[DIRECTOR] Wave skipped to Wave ${app.waveManager.waveNumber + 1}.`;
        this.log(msg, COLOR.CYAN);
        return msg;
      }

      case 'timescale': {
        const scale = parseFloat(arg1);
        if (isNaN(scale) || scale <= 0) {
          this.log('[ERROR] Invalid timescale value. Expected positive float (e.g. 0.2, 1.0, 2.0).', COLOR.RED);
          return 'Invalid scale';
        }
        app.loop.setTimeScale(scale);
        const msg = `[TIMESCALE] Fixed simulation loop speed set to ${scale.toFixed(2)}x.`;
        this.log(msg, COLOR.AMBER);
        return msg;
      }

      case 'debug': {
        const mode = arg1?.toLowerCase();
        if (mode === 'hitboxes') {
          this.debugRenderer.showHitboxes = !this.debugRenderer.showHitboxes;
          this.log(`[DEBUG] Hitbox/Hurtbox overlay: ${this.debugRenderer.showHitboxes ? 'ON' : 'OFF'}`, COLOR.CYAN);
        } else if (mode === 'spatial') {
          this.debugRenderer.showSpatialGrid = !this.debugRenderer.showSpatialGrid;
          this.log(`[DEBUG] Spatial hash grid overlay: ${this.debugRenderer.showSpatialGrid ? 'ON' : 'OFF'}`, COLOR.CYAN);
        } else if (mode === 'raycast') {
          this.debugRenderer.showRaycasts = !this.debugRenderer.showRaycasts;
          this.log(`[DEBUG] Raycast LOS overlay: ${this.debugRenderer.showRaycasts ? 'ON' : 'OFF'}`, COLOR.CYAN);
        } else if (mode === 'backtrack') {
          this.debugRenderer.showBacktrack = !this.debugRenderer.showBacktrack;
          this.log(`[DEBUG] Backtrack ghost trail overlay: ${this.debugRenderer.showBacktrack ? 'ON' : 'OFF'}`, COLOR.CYAN);
        } else if (mode === 'all') {
          const state = this.debugRenderer.toggleAll(true);
          this.log(`[DEBUG] All diagnostic overlays: ON`, COLOR.GREEN);
        } else if (mode === 'none') {
          this.debugRenderer.toggleAll(false);
          this.log(`[DEBUG] All diagnostic overlays: OFF`, COLOR.AMBER);
        } else {
          this.log(`[DEBUG] Modes: hitboxes | spatial | raycast | backtrack | all | none`, COLOR.CYAN);
        }
        return 'Debug toggled';
      }

      default:
        this.log(`[ERROR] Unknown command: '${cmd}'. Type 'help' for commands.`, COLOR.RED);
        return 'Unknown command';
    }
  }
}
