/**
 * Ring Zero - In-Run Pause Menu Overlay
 * Freezes 60Hz physics accumulator while rendering active exploits, weapon status,
 * settings launcher, and abort controls.
 */

import { COLOR } from '../core/Constants.js';
import { VectorIcons } from './VectorIcons.js';

export class PauseOverlay {
  /**
   * @param {Object} options
   * @param {import('../systems/CheatManager.js').CheatManager} options.cheatManager
   * @param {import('../systems/WeaponSystem.js').WeaponSystem} options.weaponSystem
   * @param {import('../audio/SoundBank.js').SoundBank} options.soundBank
   * @param {function(): void} options.onResume
   * @param {function(): void} options.onOpenSettings
   * @param {function(): void} options.onAbortRun
   * @param {function(): void} [options.onOpenDebugConsole]
   */
  constructor({ cheatManager, weaponSystem, soundBank, onResume, onOpenSettings, onAbortRun, onOpenDebugConsole = null }) {
    this.cheatManager = cheatManager;
    this.weaponSystem = weaponSystem;
    this.soundBank = soundBank;
    this.onResume = onResume;
    this.onOpenSettings = onOpenSettings;
    this.onAbortRun = onAbortRun;
    this.onOpenDebugConsole = onOpenDebugConsole;

    this.isOpen = false;
    this.overlayEl = document.createElement('div');
    this.overlayEl.id = 'pause-overlay';
    this.overlayEl.style.position = 'absolute';
    this.overlayEl.style.top = '0';
    this.overlayEl.style.left = '0';
    this.overlayEl.style.width = '100vw';
    this.overlayEl.style.height = '100vh';
    this.overlayEl.style.zIndex = '105';
    this.overlayEl.style.background = 'rgba(7, 10, 15, 0.9)';
    this.overlayEl.style.backdropFilter = 'blur(5px)';
    this.overlayEl.style.display = 'none';
    this.overlayEl.style.alignItems = 'center';
    this.overlayEl.style.justifyContent = 'center';

    document.body.appendChild(this.overlayEl);
  }

  get currentWeaponSystem() {
    if (typeof this.weaponSystem === 'function') {
      return this.weaponSystem();
    }
    return this.weaponSystem;
  }

  open() {
    this.isOpen = true;
    this.soundBank?.playUIClick();
    this.overlayEl.style.display = 'flex';
    this.render();
  }

  close() {
    this.isOpen = false;
    this.soundBank?.playUIClick();
    this.overlayEl.style.display = 'none';
  }

  render() {
    const ws = this.currentWeaponSystem;
    const activeCheats = this.cheatManager ? Array.from(this.cheatManager.activeCheats.values()) : [];
    const weapon1 = ws?.slots?.[0] || null;
    const weapon2 = ws?.slots?.[1] || null;
    const activeIdx = ws?.activeSlot ?? 0;

    let exploitsHtml = '';
    if (activeCheats.length === 0) {
      exploitsHtml = `<div style="font-size: 11px; color: rgba(255,255,255,0.4);">NO RUNTIME EXPLOITS INJECTED YET</div>`;
    } else {
      exploitsHtml = activeCheats
        .map((c) => {
          const cheatColor = c.color || COLOR.CYAN;
          const iconUrl = VectorIcons.renderToDataURL(c.id, 32, cheatColor);
          return `
            <div style="background: rgba(0,0,0,0.35); border: 1px solid ${cheatColor}; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; gap: 12px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 32px; height: 32px; flex-shrink: 0; border: 1px solid ${cheatColor}80; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;">
                  <img src="${iconUrl}" width="26" height="26" style="filter: drop-shadow(0 0 4px ${cheatColor});" alt="${c.name}" />
                </div>
                <div>
                  <div style="font-weight: bold; font-size: 11px; color: ${cheatColor};">${c.filename} &bull; ${c.name}</div>
                  <div style="font-size: 10px; color: rgba(255,255,255,0.6); margin-top: 2px;">${c.getPerkDescription()}</div>
                </div>
              </div>
              <div style="font-size: 10px; font-weight: bold; color: ${COLOR.WHITE}; white-space: nowrap; border: 1px solid rgba(255,255,255,0.2); padding: 3px 6px;">RANK ${c.level}/${c.maxLevel}</div>
            </div>
          `;
        })
        .join('');
    }

    this.overlayEl.innerHTML = `
      <div class="terminal-box" style="max-width: 640px; width: 92%;">
        <div class="terminal-header">
          <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <h2 class="terminal-title" style="color: ${COLOR.AMBER}; font-size: 22px;">// SIMULATION PAUSED //</h2>
            <div style="font-size: 11px; color: rgba(255,255,255,0.5);">PRESS [ESC] OR [P] TO RESUME</div>
          </div>
          <div class="terminal-subtitle">ACTIVE HARDWARE & EXPLOIT PIPELINE TELEMETRY</div>
        </div>

        <div class="terminal-body" style="display: flex; flex-direction: column; gap: 14px; margin-bottom: 20px;">
          <!-- Hardware Loadout Status -->
          <div style="border-left: 2px solid ${COLOR.CYAN}; padding-left: 10px;">
            <div style="font-size: 11px; color: ${COLOR.CYAN}; font-weight: bold; margin-bottom: 6px;">HARDWARE LOADOUT</div>
            <div style="display: flex; gap: 12px; font-size: 11px;">
              <div style="flex: 1; background: rgba(0,0,0,0.3); padding: 8px; border: 1px solid ${activeIdx === 0 ? COLOR.CYAN : 'rgba(255,255,255,0.15)'};">
                <div style="color: ${activeIdx === 0 ? COLOR.CYAN : 'rgba(255,255,255,0.5)'}; font-weight: bold;">
                  ${activeIdx === 0 ? '► [1] PRIMARY' : '  [1] PRIMARY'}
                </div>
                <div style="color: ${COLOR.WHITE}; font-size: 12px; margin-top: 2px;">${weapon1 ? weapon1.name : 'EMPTY'}</div>
                <div style="color: rgba(255,255,255,0.5); font-size: 10px;">AMMO: ${weapon1 ? `${weapon1.currentAmmo}/${weapon1.clipSize}` : '-'}</div>
              </div>
              <div style="flex: 1; background: rgba(0,0,0,0.3); padding: 8px; border: 1px solid ${activeIdx === 1 ? COLOR.CYAN : 'rgba(255,255,255,0.15)'};">
                <div style="color: ${activeIdx === 1 ? COLOR.CYAN : 'rgba(255,255,255,0.5)'}; font-weight: bold;">
                  ${activeIdx === 1 ? '► [2] SECONDARY' : '  [2] SECONDARY'}
                </div>
                <div style="color: ${COLOR.WHITE}; font-size: 12px; margin-top: 2px;">${weapon2 ? weapon2.name : 'EMPTY'}</div>
                <div style="color: rgba(255,255,255,0.5); font-size: 10px;">AMMO: ${weapon2 ? `${weapon2.currentAmmo}/${weapon2.clipSize}` : '-'}</div>
              </div>
            </div>
          </div>

          <!-- Active Injected Exploits -->
          <div style="border-left: 2px solid ${COLOR.AMBER}; padding-left: 10px;">
            <div style="font-size: 11px; color: ${COLOR.AMBER}; font-weight: bold; margin-bottom: 6px;">INJECTED RUNTIME EXPLOITS</div>
            <div style="display: flex; flex-direction: column; gap: 8px; max-height: 180px; overflow-y: auto;">
              ${exploitsHtml}
            </div>
          </div>
        </div>

        <div class="terminal-footer" style="display: flex; gap: 12px; justify-content: flex-end; flex-wrap: wrap;">
          <button id="btn-pause-abort" class="btn-vector" style="border-color: ${COLOR.RED}; color: ${COLOR.RED};">
            ABORT RUN
          </button>
          <button id="btn-pause-debug" class="btn-vector" style="border-color: ${COLOR.CYAN}; color: ${COLOR.CYAN};">
            DEV CONSOLE
          </button>
          <button id="btn-pause-settings" class="btn-vector" style="border-color: ${COLOR.AMBER}; color: ${COLOR.AMBER};">
            SETTINGS
          </button>
          <button id="btn-pause-resume" class="btn-vector">
            RESUME [ESC]
          </button>
        </div>
      </div>
    `;

    // Hook buttons
    this.overlayEl.querySelector('#btn-pause-resume')?.addEventListener('click', () => {
      this.close();
      if (this.onResume) this.onResume();
    });

    this.overlayEl.querySelector('#btn-pause-debug')?.addEventListener('click', () => {
      this.soundBank?.playUIClick();
      if (this.onOpenDebugConsole) this.onOpenDebugConsole();
    });

    this.overlayEl.querySelector('#btn-pause-settings')?.addEventListener('click', () => {
      if (this.onOpenSettings) this.onOpenSettings();
    });

    this.overlayEl.querySelector('#btn-pause-abort')?.addEventListener('click', () => {
      this.close();
      if (this.onAbortRun) this.onAbortRun();
    });
  }
}
