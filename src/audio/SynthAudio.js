/**
 * Ring Zero - Web Audio Procedural Sound Synthesizer
 * Pure Web Audio API synthesis engine. Zero external audio dependencies.
 * Creates procedural sound effects via oscillators, noise buffers, and biquad filters.
 */

export class SynthAudio {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.compressor = null;
    this.noiseBuffer = null;
    this.isMuted = false;
    this.masterVolume = 0.7;
    this.sfxVolume = 0.8;
    this.initialized = false;
  }

  /**
   * Initializes AudioContext upon user gesture
   * @returns {boolean} Whether audio context is ready
   */
  init() {
    if (this.initialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return true;
    }

    const AudioContextClass =
      (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) ||
      (typeof globalThis !== 'undefined' && (globalThis.AudioContext || globalThis.webkitAudioContext)) ||
      null;

    if (!AudioContextClass) {
      // Headless / non-browser environment
      return false;
    }

    try {
      this.ctx = new AudioContextClass();

      // Master Dynamics Compressor to prevent digital clipping
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-12, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(8, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(6, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.15, this.ctx.currentTime);
      this.compressor.connect(this.ctx.destination);

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.compressor);

      // SFX Bus Gain
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // Dedicated Music Bus Gain
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicVolume || 0.6, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      // Pre-synthesize 2-second looped white noise buffer
      this._generateNoiseBuffer();

      this.initialized = true;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return true;
    } catch (e) {
      console.warn('SynthAudio: AudioContext initialization failed', e);
      return false;
    }
  }

  /**
   * Generates a 2-second white noise buffer for procedural explosions and whooshes
   * @private
   */
  _generateNoiseBuffer() {
    if (!this.ctx) return;
    const sampleRate = this.ctx.sampleRate;
    const bufferSize = sampleRate * 2;
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const output = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  }

  setMasterVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
    }
  }

  setSfxVolume(volume) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    }
  }

  setMusicVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
    }
  }

  setVolume(volume) {
    this.setMasterVolume(volume);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.setMasterVolume(this.masterVolume);
    return this.isMuted;
  }

  /**
   * Plays a pitch-swept oscillator tone with exponential decay
   * @param {number} startFreq
   * @param {number} endFreq
   * @param {number} duration
   * @param {OscillatorType} [type='sawtooth']
   * @param {number} [peakGain=0.3]
   */
  playTone(startFreq, endFreq, duration, type = 'sawtooth', peakGain = 0.3) {
    if (!this.initialized || !this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(10, endFreq), t + duration);

    gain.gain.setValueAtTime(peakGain, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain || this.masterGain);

    osc.start(t);
    osc.stop(t + duration);
  }

  /**
   * Plays filtered noise burst with resonant sweep
   * @param {number} duration
   * @param {BiquadFilterType} filterType
   * @param {number} startCutoff
   * @param {number} endCutoff
   * @param {number} peakGain
   */
  playFilteredNoise(duration, filterType = 'lowpass', startCutoff = 800, endCutoff = 100, peakGain = 0.4) {
    if (!this.initialized || !this.ctx || !this.noiseBuffer || this.isMuted) return;

    const t = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(startCutoff, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, endCutoff), t + duration);
    filter.Q.setValueAtTime(4.0, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(peakGain, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain || this.masterGain);

    source.start(t);
    source.stop(t + duration);
  }

  /**
   * Plays frequency-modulated glitch tone
   * @param {number} carrierFreq
   * @param {number} modFreq
   * @param {number} duration
   * @param {number} modDepth
   */
  playGlitchTone(carrierFreq, modFreq, duration, modDepth = 600) {
    if (!this.initialized || !this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const carrier = this.ctx.createOscillator();
    const modulator = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const outGain = this.ctx.createGain();

    carrier.type = 'square';
    carrier.frequency.setValueAtTime(carrierFreq, t);

    modulator.type = 'sawtooth';
    modulator.frequency.setValueAtTime(modFreq, t);
    modulator.frequency.linearRampToValueAtTime(modFreq * 2.5, t + duration);

    modGain.gain.setValueAtTime(modDepth, t);

    modulator.connect(carrier.frequency);

    outGain.gain.setValueAtTime(0.25, t);
    outGain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    carrier.connect(outGain);
    outGain.connect(this.sfxGain || this.masterGain);

    carrier.start(t);
    modulator.start(t);
    carrier.stop(t + duration);
    modulator.stop(t + duration);
  }
}
