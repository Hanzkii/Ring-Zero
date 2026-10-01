/**
 * Ring Zero - Procedural Cyber BGM Synthesizer
 * Real-time 4-channel step-sequencer using native Web Audio API nodes.
 * Zero external audio dependencies.
 *
 * Tempo: 130 BPM
 * Key: D Minor Pentatonic
 * Channels:
 *  1. Rolling 16th Sub-bass (Triangle)
 *  2. Cyber Arpeggio (Square + dynamic lowpass decay)
 *  3. Synthesized Kick (Sine pitch sweep) + Snare (Noise + Tone)
 *  4. 16th Hi-hats (Filtered noise)
 *
 * Intensity Modes:
 *  - AMBIENT: Subdued drums, lowpass-filtered lead (menus, pause, draft)
 *  - COMBAT: Full driving rhythm section (active gameplay)
 */

export const MUSIC_INTENSITY = {
  AMBIENT: 'AMBIENT',
  COMBAT: 'COMBAT',
};

const NOTE = {
  D1: 36.71,
  D2: 73.42,
  F2: 87.31,
  G2: 98.00,
  A2: 110.00,
  C3: 130.81,
  D3: 146.83,
  F3: 174.61,
  G3: 196.00,
  A3: 220.00,
  C4: 261.63,
  D4: 293.66,
  F4: 349.23,
  G4: 392.00,
  A4: 440.00,
  C5: 523.25,
  D5: 587.33,
  F5: 698.46,
};

// 32-step patterns (2 bars at 16th notes)
const BASS_SEQUENCE = [
  NOTE.D2, NOTE.D2, NOTE.D2, NOTE.F2, NOTE.D2, NOTE.D2, NOTE.G2, NOTE.D2,
  NOTE.D2, NOTE.D2, NOTE.A2, NOTE.G2, NOTE.F2, NOTE.D2, NOTE.C3, NOTE.D2,
  NOTE.D2, NOTE.D2, NOTE.D2, NOTE.F2, NOTE.D2, NOTE.D2, NOTE.G2, NOTE.A2,
  NOTE.C3, NOTE.A2, NOTE.G2, NOTE.F2, NOTE.G2, NOTE.F2, NOTE.C3, NOTE.D2,
];

const ARP_SEQUENCE = [
  NOTE.D4, NOTE.A4, NOTE.F4, NOTE.D5, NOTE.C5, NOTE.A4, NOTE.F4, NOTE.G4,
  NOTE.A4, NOTE.F4, NOTE.D4, NOTE.A3, NOTE.C4, NOTE.D4, NOTE.F4, NOTE.A4,
  NOTE.D5, NOTE.C5, NOTE.A4, NOTE.F4, NOTE.G4, NOTE.A4, NOTE.C5, NOTE.D5,
  NOTE.F5, NOTE.D5, NOTE.C5, NOTE.A4, NOTE.G4, NOTE.F4, NOTE.D4, NOTE.C4,
];

export class SynthMusic {
  /**
   * @param {Object} [options={}]
   * @param {import('./SynthAudio.js').SynthAudio} [options.synth]
   * @param {AudioContext} [options.ctx]
   * @param {AudioNode} [options.destination]
   */
  constructor({ synth = null, ctx = null, destination = null } = {}) {
    this.synth = synth;
    this.ctx = ctx || synth?.ctx || null;
    this.destination = destination || synth?.musicGain || synth?.masterGain || null;

    this.bpm = 130;
    this.stepDuration = 60 / (this.bpm * 4); // ~0.11538s per 16th note
    this.scheduleAheadTime = 0.12; // 120ms lookahead
    this.lookaheadIntervalMs = 25;

    this.intensity = MUSIC_INTENSITY.AMBIENT;
    this.isPlaying = false;
    this.volume = 0.6;

    this.currentStep = 0;
    this.nextNoteTime = 0.0;
    this.timerId = null;

    this.masterGain = null;
    this.noiseBuffer = null;
  }

  /**
   * Initializes audio nodes for music bus
   */
  init() {
    if (!this.ctx && this.synth?.ctx) {
      this.ctx = this.synth.ctx;
    }
    if (!this.ctx) {
      const AudioContextClass =
        (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) ||
        (typeof globalThis !== 'undefined' && (globalThis.AudioContext || globalThis.webkitAudioContext)) ||
        null;
      if (AudioContextClass) {
        try {
          this.ctx = new AudioContextClass();
        } catch (_) {}
      }
    }
    if (!this.ctx) return false;

    if (!this.destination) {
      this.destination = this.synth?.musicGain || this.synth?.masterGain || this.ctx.destination;
    }

    if (!this.masterGain) {
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      if (this.destination) {
        this.masterGain.connect(this.destination);
      }
    }

    if (!this.noiseBuffer) {
      this._generateNoiseBuffer();
    }

    return true;
  }

  _generateNoiseBuffer() {
    if (!this.ctx) return;
    const sampleRate = this.ctx.sampleRate;
    const bufferSize = sampleRate * 1; // 1-second noise
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  /**
   * Sets music playback volume [0.0, 1.0]
   * @param {number} vol
   */
  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  /**
   * Updates sequencer intensity state
   * @param {'AMBIENT'|'COMBAT'} intensity
   */
  setIntensity(intensity) {
    if (intensity === MUSIC_INTENSITY.COMBAT || intensity === MUSIC_INTENSITY.AMBIENT) {
      this.intensity = intensity;
    }
  }

  /**
   * Starts procedural music sequencer
   */
  start() {
    if (this.isPlaying) return;

    if (!this.ctx || !this.masterGain) {
      const ok = this.init();
      if (!ok) return;
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    this.isPlaying = true;
    this.currentStep = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;

    this.timerId = setInterval(() => this._scheduler(), this.lookaheadIntervalMs);
  }

  /**
   * Stops procedural music playback
   */
  stop() {
    this.isPlaying = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  /**
   * Lookahead timer scheduling notes into Web Audio clock
   * @private
   */
  _scheduler() {
    if (!this.isPlaying || !this.ctx) return;

    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this._scheduleStep(this.currentStep, this.nextNoteTime);
      this._advanceStep();
    }
  }

  /**
   * Advances step counter and timestamp
   * @private
   */
  _advanceStep() {
    this.nextNoteTime += this.stepDuration;
    this.currentStep = (this.currentStep + 1) % 32;
  }

  /**
   * Schedules synthesis nodes for step index at target time
   * @param {number} step
   * @param {number} time
   * @private
   */
  _scheduleStep(step, time) {
    if (!this.ctx || !this.masterGain) return;

    const isCombat = this.intensity === MUSIC_INTENSITY.COMBAT;

    // 1. Channel 1: Sub-Bass Line (Triangle)
    const bassFreq = BASS_SEQUENCE[step % BASS_SEQUENCE.length];
    if (bassFreq) {
      this._playBassNote(bassFreq, time, isCombat ? 0.35 : 0.22);
    }

    // 2. Channel 2: Cyber Arp (Square with dynamic lowpass decay)
    const arpFreq = ARP_SEQUENCE[step % ARP_SEQUENCE.length];
    if (arpFreq) {
      // In ambient, play every other 16th to create breathing space
      if (isCombat || step % 2 === 0) {
        this._playArpNote(arpFreq, time, isCombat);
      }
    }

    // 3. Channel 3: Synthesized Kick & Snare
    // Kick: 4-on-the-floor in combat (0, 4, 8, 12, ...), 1 and 3 in ambient (0, 8, 16, 24)
    const isKickStep = isCombat
      ? step % 4 === 0
      : step % 8 === 0;

    if (isKickStep) {
      this._playKick(time, isCombat ? 0.55 : 0.3);
    }

    // Snare: steps 4, 12, 20, 28 (beats 2 and 4)
    if (step % 8 === 4) {
      if (isCombat) {
        this._playSnare(time, 0.35);
      } else {
        this._playSnare(time, 0.12);
      }
    }

    // 4. Channel 4: 16th Hi-Hats
    if (isCombat) {
      // Accent off-beats (step % 4 === 2)
      const isAccent = step % 4 === 2;
      this._playHiHat(time, isAccent ? 0.15 : 0.08, isAccent ? 0.04 : 0.02);
    } else if (step % 4 === 2) {
      // Subdued 8th-note hats in ambient
      this._playHiHat(time, 0.06, 0.02);
    }
  }

  /**
   * Channel 1: Triangle sub-bass note
   * @private
   */
  _playBassNote(freq, time, gainLevel) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    const dur = this.stepDuration * 0.9;
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(gainLevel, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + dur);
  }

  /**
   * Channel 2: Square wave arp with dynamic lowpass sweep
   * @private
   */
  _playArpNote(freq, time, isCombat) {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.Q.setValueAtTime(isCombat ? 5 : 2, time);

    const cutoffPeak = isCombat ? 2400 : 700;
    const cutoffBase = isCombat ? 400 : 250;
    const dur = this.stepDuration * 0.85;

    filter.frequency.setValueAtTime(cutoffPeak, time);
    filter.frequency.exponentialRampToValueAtTime(cutoffBase, time + dur);

    const gainPeak = isCombat ? 0.16 : 0.09;
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(gainPeak, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + dur);
  }

  /**
   * Channel 3a: Sine pitch-swept kick drum
   * @private
   */
  _playKick(time, gainLevel) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(35, time + 0.08);

    const dur = 0.12;
    gain.gain.setValueAtTime(gainLevel, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + dur);
  }

  /**
   * Channel 3b: Noise + tone snare drum
   * @private
   */
  _playSnare(time, gainLevel) {
    if (!this.noiseBuffer) return;

    // Noise body
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1200, time);
    noiseFilter.Q.setValueAtTime(1.5, time);

    const noiseGain = this.ctx.createGain();
    const dur = 0.1;
    noiseGain.gain.setValueAtTime(gainLevel, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noiseSource.start(time);
    noiseSource.stop(time + dur);

    // Subtle tone body
    const toneOsc = this.ctx.createOscillator();
    const toneGain = this.ctx.createGain();

    toneOsc.type = 'triangle';
    toneOsc.frequency.setValueAtTime(180, time);
    toneOsc.frequency.exponentialRampToValueAtTime(70, time + 0.05);

    toneGain.gain.setValueAtTime(gainLevel * 0.6, time);
    toneGain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);

    toneOsc.connect(toneGain);
    toneGain.connect(this.masterGain);

    toneOsc.start(time);
    toneOsc.stop(time + 0.06);
  }

  /**
   * Channel 4: Highpass filtered noise hi-hat
   * @private
   */
  _playHiHat(time, gainLevel, dur = 0.03) {
    if (!this.noiseBuffer) return;

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7500, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainLevel, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noiseSource.start(time);
    noiseSource.stop(time + dur);
  }
}
