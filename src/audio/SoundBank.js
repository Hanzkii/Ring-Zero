/**
 * Ring Zero - SoundBank Preset Dispatcher
 * Houses all procedural audio presets using the SynthAudio engine. Zero external audio assets.
 */

import { SynthAudio } from './SynthAudio.js';

export class SoundBank {
  /**
   * @param {SynthAudio} [synth=null]
   */
  constructor(synth = null) {
    this.synth = synth || new SynthAudio();
  }

  init() {
    return this.synth.init();
  }

  setVolume(vol) {
    this.synth.setVolume(vol);
  }

  toggleMute() {
    return this.synth.toggleMute();
  }

  get isMuted() {
    return this.synth.isMuted;
  }

  /**
   * Plays weapon firing ballistic sound
   * @param {string} weaponId
   * @param {boolean} [isCritical=false]
   */
  playShoot(weaponId = 'kernel_pistol', isCritical = false) {
    if (!this.synth.initialized) return;

    // Dynamic procedural pitch variation to eliminate audio fatigue on automatic fire
    const jitter = 1.0 + (Math.random() - 0.5) * 0.12;

    switch (weaponId) {
      case 'flak_submachine':
      case 'pulse_smg':
        this.synth.playTone(1100 * jitter, 150 * jitter, 0.05, 'sawtooth', 0.22);
        this.synth.playFilteredNoise(0.04, 'bandpass', 1800 * jitter, 400, 0.2);
        break;

      case 'combat_sweeper':
      case 'scrap_blaster':
        this.synth.playTone(450 * jitter, 60 * jitter, 0.14, 'triangle', 0.45);
        this.synth.playFilteredNoise(0.12, 'lowpass', 1400, 150, 0.5);
        break;

      case 'rotary_minigun':
        this.synth.playTone(850 * jitter, 120 * jitter, 0.045, 'sawtooth', 0.25);
        break;

      case 'vector_railgun':
        this.synth.playTone(2600 * jitter, 120, 0.25, 'sawtooth', 0.55);
        this.synth.playTone(120, 30, 0.35, 'sine', 0.6);
        this.synth.playFilteredNoise(0.2, 'highpass', 1200, 200, 0.35);
        break;

      case 'memory_corruptor':
        this.synth.playTone(620 * jitter, 160 * jitter, 0.09, 'sawtooth', 0.35);
        this.synth.playFilteredNoise(0.08, 'bandpass', 1300 * jitter, 350, 0.28);
        break;

      case 'kernel_pistol':
      case 'pistol_sys':
      default:
        this.synth.playTone(900 * jitter, 90 * jitter, 0.08, 'sawtooth', 0.28);
        this.synth.playFilteredNoise(0.05, 'lowpass', 1200, 300, 0.18);
        break;
    }

    if (isCritical) {
      // High-frequency metallic ping for critical vector strikes
      this.synth.playTone(2800 * jitter, 1400 * jitter, 0.09, 'sine', 0.2);
    }
  }

  /**
   * Plays bullet impact tick
   */
  playHit() {
    if (!this.synth.initialized) return;
    this.synth.playTone(700, 200, 0.02, 'triangle', 0.2);
  }

  /**
   * Sub-bass thud combined with lowpass-filtered white noise explosion
   * @param {boolean} [isLarge=false]
   */
  playExplosion(isLarge = false) {
    if (!this.synth.initialized) return;

    const dur = isLarge ? 0.5 : 0.35;
    // Sub-bass sweep
    this.synth.playTone(isLarge ? 140 : 110, 20, dur, 'sine', isLarge ? 0.6 : 0.45);
    // Filtered noise thud
    this.synth.playFilteredNoise(dur, 'lowpass', isLarge ? 400 : 300, 40, isLarge ? 0.55 : 0.4);
  }

  /**
   * Dual micro-beeps at 1800Hz / 2400Hz for Aimbot & Silent Aim target lock
   */
  playLockOn() {
    if (!this.synth.initialized || !this.synth.ctx) return;
    this.synth.playTone(1800, 1800, 0.02, 'sine', 0.15);
    setTimeout(() => {
      this.synth.playTone(2400, 2400, 0.025, 'sine', 0.18);
    }, 25);
  }

  /**
   * Resonant telemetry scanline pulse for Wallhack
   */
  playWallhackPulse() {
    if (!this.synth.initialized) return;
    this.synth.playTone(440, 880, 0.08, 'sine', 0.12);
  }

  /**
   * Modulated square wave for Spinbot glance evasion or Backtrack spacetime rewind
   */
  playGlitch() {
    if (!this.synth.initialized) return;
    this.synth.playGlitchTone(480, 120, 0.1, 700);
  }

  /**
   * Catastrophic radial explosion and glitch audio cue for Kernel Panic
   */
  playKernelPanic() {
    if (!this.synth.initialized) return;
    this.synth.playTone(220, 50, 0.4, 'sawtooth', 0.6);
    this.synth.playFilteredNoise(0.35, 'lowpass', 600, 50, 0.6);
    this.synth.playGlitchTone(900, 150, 0.25, 1200);
  }

  /**
   * Ascending arpeggio chime for level up / exploit draft unlock
   */
  playLevelUp() {
    if (!this.synth.initialized || !this.synth.ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.synth.playTone(freq, freq * 1.02, 0.14, 'sine', 0.22);
      }, idx * 55);
    });
  }

  /**
   * Dash hyper-velocity whoosh
   */
  playDash() {
    if (!this.synth.initialized) return;
    this.synth.playFilteredNoise(0.18, 'bandpass', 1200, 180, 0.4);
    this.synth.playTone(280, 60, 0.15, 'sine', 0.3);
  }

  /**
   * Mechanical click on reload start
   */
  playReloadStart() {
    if (!this.synth.initialized) return;
    this.synth.playTone(1400, 600, 0.03, 'triangle', 0.25);
  }

  /**
   * Mechanical slide-rack on reload completion
   */
  playReloadDone() {
    if (!this.synth.initialized || !this.synth.ctx) return;
    this.synth.playTone(900, 1600, 0.035, 'triangle', 0.28);
    setTimeout(() => {
      this.synth.playTone(1800, 2200, 0.03, 'sine', 0.3);
    }, 45);
  }

  /**
   * Terminal click
   */
  playUIClick() {
    if (!this.synth.initialized) return;
    this.synth.playTone(1200, 800, 0.02, 'sine', 0.16);
  }

  /**
   * Terminal error / deauthorization buzz
   */
  playUIError() {
    if (!this.synth.initialized) return;
    this.synth.playTone(180, 140, 0.15, 'square', 0.3);
  }
}
