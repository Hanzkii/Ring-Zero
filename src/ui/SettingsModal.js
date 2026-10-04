/**
 * Ring Zero - System Preferences & Audio Settings Modal
 * Pure vector-styled interactive settings controls:
 * - Master Volume (0-100%)
 * - SFX Volume (0-100%)
 * - Screen Shake Trauma Multiplier (0-100%)
 * - Spatial Hash Grid Debug Toggle
 */

import { COLOR } from '../core/Constants.js';

export class SettingsModal {
  /**
   * @param {Object} options
   * @param {import('../services/StorageService.js').StorageService} options.storage
   * @param {import('../audio/SynthAudio.js').SynthAudio} options.synth
   * @param {import('../audio/SoundBank.js').SoundBank} options.soundBank
   * @param {import('../core/Camera2D.js').Camera2D} options.camera
   * @param {import('../core/InputManager.js').InputManager} [options.input]
   * @param {import('../audio/SynthMusic.js').SynthMusic} [options.synthMusic]
   * @param {function(boolean): void} [options.onGridDebugToggle]
   * @param {function(boolean): void} [options.onPerfTelemetryToggle]
   * @param {function(): void} [options.onClose]
   */
  constructor({ storage, synth, soundBank, camera, input = null, synthMusic = null, onGridDebugToggle = null, onPerfTelemetryToggle = null, onClose = null }) {
    this.storage = storage;
    this.synth = synth;
    this.soundBank = soundBank;
    this.camera = camera;
    this.input = input;
    this.synthMusic = synthMusic;
    this.onGridDebugToggle = onGridDebugToggle;
    this.onPerfTelemetryToggle = onPerfTelemetryToggle;
    this.onClose = onClose;

    this.isOpen = false;
    this.modalEl = document.createElement('div');
    this.modalEl.id = 'settings-modal';
    this.modalEl.style.position = 'absolute';
    this.modalEl.style.top = '0';
    this.modalEl.style.left = '0';
    this.modalEl.style.width = '100vw';
    this.modalEl.style.height = '100vh';
    this.modalEl.style.zIndex = '110';
    this.modalEl.style.background = 'rgba(7, 10, 15, 0.94)';
    this.modalEl.style.backdropFilter = 'blur(6px)';
    this.modalEl.style.display = 'none';
    this.modalEl.style.alignItems = 'center';
    this.modalEl.style.justifyContent = 'center';

    document.body.appendChild(this.modalEl);

    // Apply initial settings from storage
    this._applySettings();
  }

  _applySettings() {
    const s = this.storage.settings;
    if (this.synth) {
      this.synth.setMasterVolume(s.masterVolume !== undefined ? s.masterVolume : 0.7);
      this.synth.setSfxVolume(s.sfxVolume !== undefined ? s.sfxVolume : 0.8);
      if (typeof this.synth.setMusicVolume === 'function') {
        this.synth.setMusicVolume(s.musicVolume !== undefined ? s.musicVolume : 0.6);
      }
    }
    if (this.synthMusic && typeof this.synthMusic.setVolume === 'function') {
      this.synthMusic.setVolume(s.musicVolume !== undefined ? s.musicVolume : 0.6);
    }
    if (this.input && typeof this.input.setSensitivity === 'function') {
      this.input.setSensitivity(s.mouseSensitivity !== undefined ? s.mouseSensitivity : 1.0);
    }
    if (this.camera) {
      this.camera.traumaMultiplier = s.screenShake !== undefined ? s.screenShake : 1.0;
    }
    if (this.onGridDebugToggle && s.showDebugGrid !== undefined) {
      this.onGridDebugToggle(s.showDebugGrid);
    }
    if (this.onPerfTelemetryToggle && s.showPerformanceOverlay !== undefined) {
      this.onPerfTelemetryToggle(s.showPerformanceOverlay);
    }
  }

  open() {
    this.isOpen = true;
    this.soundBank?.playUIClick();
    this.modalEl.style.display = 'flex';
    this.render();
  }

  close() {
    this.isOpen = false;
    this.soundBank?.playUIClick();
    this.modalEl.style.display = 'none';
    if (this.onClose) this.onClose();
  }

  render() {
    const s = this.storage.settings;
    const masterVal = Math.round((s.masterVolume ?? 0.7) * 100);
    const sfxVal = Math.round((s.sfxVolume ?? 0.8) * 100);
    const musicVal = Math.round((s.musicVolume ?? 0.6) * 100);
    const sensVal = Number(s.mouseSensitivity ?? 1.0);
    const shakeVal = Math.round((s.screenShake ?? 1.0) * 100);
    const debugGrid = !!s.showDebugGrid;
    const perfOverlay = !!s.showPerformanceOverlay;

    this.modalEl.innerHTML = `
      <div class="terminal-box" style="max-width: 580px; width: 90%;">
        <div class="terminal-header">
          <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <h2 class="terminal-title" style="font-size: 20px;">SYSTEM SETTINGS</h2>
            <button id="btn-close-settings" style="
              background: transparent; border: 1px solid rgba(255,255,255,0.2);
              color: ${COLOR.CYAN}; cursor: pointer; padding: 4px 8px; font-family: monospace; font-size: 11px;
            ">[ ESC / CLOSE ]</button>
          </div>
          <div class="terminal-subtitle">AUDIO SYNTHESIS & TELEMETRY PREFERENCES</div>
        </div>

        <div class="terminal-body" style="display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px;">
          <!-- Master Volume -->
          <div style="background: rgba(0,0,0,0.3); padding: 12px 14px; border: 1px solid rgba(0,240,255,0.15);">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-size: 12px; color: ${COLOR.WHITE}; font-weight: bold;">MASTER VOLUME</span>
              <span id="txt-master-val" style="font-size: 12px; color: ${COLOR.CYAN}; font-weight: bold;">${masterVal}%</span>
            </div>
            <input type="range" id="rng-master-vol" min="0" max="100" value="${masterVal}" style="
              width: 100%; accent-color: ${COLOR.CYAN}; cursor: pointer;
            ">
          </div>

          <!-- SFX Volume -->
          <div style="background: rgba(0,0,0,0.3); padding: 12px 14px; border: 1px solid rgba(0,240,255,0.15);">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-size: 12px; color: ${COLOR.WHITE}; font-weight: bold;">SFX SYNTHESIZER VOLUME</span>
              <span id="txt-sfx-val" style="font-size: 12px; color: ${COLOR.CYAN}; font-weight: bold;">${sfxVal}%</span>
            </div>
            <input type="range" id="rng-sfx-vol" min="0" max="100" value="${sfxVal}" style="
              width: 100%; accent-color: ${COLOR.CYAN}; cursor: pointer;
            ">
          </div>

          <!-- Music Volume -->
          <div style="background: rgba(0,0,0,0.3); padding: 12px 14px; border: 1px solid rgba(0,240,255,0.15);">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-size: 12px; color: ${COLOR.WHITE}; font-weight: bold;">MUSIC VOLUME (PROCEDURAL BGM)</span>
              <span id="txt-music-val" style="font-size: 12px; color: ${COLOR.CYAN}; font-weight: bold;">${musicVal}%</span>
            </div>
            <input type="range" id="rng-music-vol" min="0" max="100" value="${musicVal}" style="
              width: 100%; accent-color: ${COLOR.CYAN}; cursor: pointer;
            ">
          </div>

          <!-- Mouse Aim Sensitivity -->
          <div style="background: rgba(0,0,0,0.3); padding: 12px 14px; border: 1px solid rgba(0,240,255,0.15);">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-size: 12px; color: ${COLOR.WHITE}; font-weight: bold;">MOUSE AIM SENSITIVITY</span>
              <span id="txt-sens-val" style="font-size: 12px; color: ${COLOR.AMBER}; font-weight: bold;">${sensVal.toFixed(1)}x</span>
            </div>
            <input type="range" id="rng-mouse-sens" min="20" max="300" step="5" value="${Math.round(sensVal * 100)}" style="
              width: 100%; accent-color: ${COLOR.AMBER}; cursor: pointer;
            ">
          </div>

          <!-- Screen Shake -->
          <div style="background: rgba(0,0,0,0.3); padding: 12px 14px; border: 1px solid rgba(0,240,255,0.15);">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-size: 12px; color: ${COLOR.WHITE}; font-weight: bold;">SCREEN SHAKE (TRAUMA)</span>
              <span id="txt-shake-val" style="font-size: 12px; color: ${COLOR.AMBER}; font-weight: bold;">${shakeVal}%</span>
            </div>
            <input type="range" id="rng-screen-shake" min="0" max="100" value="${shakeVal}" style="
              width: 100%; accent-color: ${COLOR.AMBER}; cursor: pointer;
            ">
          </div>

          <!-- Performance Telemetry Overlay -->
          <label style="
            background: rgba(0,0,0,0.3); padding: 12px 14px; border: 1px solid rgba(0,240,255,0.15);
            display: flex; align-items: center; justify-content: space-between; cursor: pointer;
          ">
            <div>
              <div style="font-size: 12px; color: ${COLOR.WHITE}; font-weight: bold;">PERFORMANCE TELEMETRY (FPS / TPS / FRAMETIME)</div>
              <div style="font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 2px;">Real-time diagnostics chip with FPS, TPS, and frametime in ms (Hotkey: [F3] / [Shift+F])</div>
            </div>
            <input type="checkbox" id="chk-perf-overlay" ${perfOverlay ? 'checked' : ''} style="
              transform: scale(1.3); cursor: pointer; accent-color: ${COLOR.CYAN};
            ">
          </label>

          <!-- Spatial Grid Debug -->
          <label style="
            background: rgba(0,0,0,0.3); padding: 12px 14px; border: 1px solid rgba(0,240,255,0.15);
            display: flex; align-items: center; justify-content: space-between; cursor: pointer;
          ">
            <div>
              <div style="font-size: 12px; color: ${COLOR.WHITE}; font-weight: bold;">SPATIAL HASH GRID TELEMETRY</div>
              <div style="font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 2px;">Renders 128px uniform spatial hash cells (Hotkey: [G])</div>
            </div>
            <input type="checkbox" id="chk-grid-debug" ${debugGrid ? 'checked' : ''} style="
              transform: scale(1.3); cursor: pointer; accent-color: ${COLOR.CYAN};
            ">
          </label>
        </div>

        <div class="terminal-footer" style="display: flex; justify-content: flex-end;">
          <button id="btn-save-close" class="btn-vector">APPLY & RETURN</button>
        </div>
      </div>
    `;

    // Hook listeners
    const rngMaster = this.modalEl.querySelector('#rng-master-vol');
    const txtMaster = this.modalEl.querySelector('#txt-master-val');
    rngMaster?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      txtMaster.textContent = `${val}%`;
      const ratio = val / 100;
      this.storage.settings.masterVolume = ratio;
      this.synth?.setMasterVolume(ratio);
      this.storage.save();
    });

    const rngSfx = this.modalEl.querySelector('#rng-sfx-vol');
    const txtSfx = this.modalEl.querySelector('#txt-sfx-val');
    rngSfx?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      txtSfx.textContent = `${val}%`;
      const ratio = val / 100;
      this.storage.settings.sfxVolume = ratio;
      this.synth?.setSfxVolume(ratio);
      this.storage.save();
    });

    const rngMusic = this.modalEl.querySelector('#rng-music-vol');
    const txtMusic = this.modalEl.querySelector('#txt-music-val');
    rngMusic?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      txtMusic.textContent = `${val}%`;
      const ratio = val / 100;
      this.storage.settings.musicVolume = ratio;
      if (typeof this.synth?.setMusicVolume === 'function') {
        this.synth.setMusicVolume(ratio);
      }
      if (typeof this.synthMusic?.setVolume === 'function') {
        this.synthMusic.setVolume(ratio);
      }
      this.storage.save();
    });

    const rngSens = this.modalEl.querySelector('#rng-mouse-sens');
    const txtSens = this.modalEl.querySelector('#txt-sens-val');
    rngSens?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10) / 100;
      txtSens.textContent = `${val.toFixed(1)}x`;
      this.storage.settings.mouseSensitivity = val;
      if (typeof this.input?.setSensitivity === 'function') {
        this.input.setSensitivity(val);
      }
      this.storage.save();
    });

    const rngShake = this.modalEl.querySelector('#rng-screen-shake');
    const txtShake = this.modalEl.querySelector('#txt-shake-val');
    rngShake?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      txtShake.textContent = `${val}%`;
      const ratio = val / 100;
      this.storage.settings.screenShake = ratio;
      if (this.camera) this.camera.traumaMultiplier = ratio;
      this.storage.save();
    });

    const chkPerf = this.modalEl.querySelector('#chk-perf-overlay');
    chkPerf?.addEventListener('change', (e) => {
      const checked = e.target.checked;
      this.storage.settings.showPerformanceOverlay = checked;
      this.storage.updateSettings({ showPerformanceOverlay: checked });
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('rz_perf_overlay', String(checked));
        } catch (_) {}
      }
      if (this.onPerfTelemetryToggle) this.onPerfTelemetryToggle(checked);
      this.soundBank?.playUIClick();
      this.storage.save();
    });

    const chkGrid = this.modalEl.querySelector('#chk-grid-debug');
    chkGrid?.addEventListener('change', (e) => {
      const checked = e.target.checked;
      this.storage.settings.showDebugGrid = checked;
      if (this.onGridDebugToggle) this.onGridDebugToggle(checked);
      this.soundBank?.playUIClick();
      this.storage.save();
    });

    this.modalEl.querySelector('#btn-close-settings')?.addEventListener('click', () => this.close());
    this.modalEl.querySelector('#btn-save-close')?.addEventListener('click', () => this.close());
  }
}
