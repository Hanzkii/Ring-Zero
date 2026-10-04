/**
 * Ring Zero - Procedural Cyber BGM Synthesizer
 * Real-time 4-channel step-sequencer using native Web Audio API nodes.
 * Zero external audio dependencies.
 *
 * Procedural Darksynth / Cyberpunk OST:
 * - Aggressive high-tempo cyber/darksynth (140-165 BPM)
 * - Minor & Phrygian modes (D Minor, C# Phrygian)
 * - Detuned sawtooth basslines with resonant lowpass filter sweeps
 * - 4-on-the-floor punchy kick (150Hz -> 35Hz pitch drop), crisp white-noise snares/claps, open 16th hats
 * - 3 procedural tracks with dynamic rotation:
 *    1. OVERCLOCK_PULSE (145 BPM driving industrial techno)
 *    2. CYBER_PURGE (158 BPM aggressive darksynth / EBM)
 *    3. KERNEL_BREACH (165 BPM relentless breakbeat / drum & bass for boss encounters)
 *
 * Intensity Modes:
 *  - AMBIENT: Subdued drums, lowpass-filtered lead (menus, pause, draft)
 *  - COMBAT: Full driving rhythm section (active gameplay)
 */

export const MUSIC_INTENSITY = {
  AMBIENT: 'AMBIENT',
  COMBAT: 'COMBAT',
};

export const MUSIC_TRACKS = {
  OVERCLOCK_PULSE: 'OVERCLOCK_PULSE', // Ring 3: Userland (138 BPM, D minor)
  BUS_COLLISION: 'BUS_COLLISION',     // Ring 2: Hardware Drivers (148 BPM, A minor)
  SANDBOX_PURGE: 'SANDBOX_PURGE',     // Ring 1: Hypervisor (158 BPM, C# Phrygian)
  KERNEL_PANIC: 'KERNEL_PANIC',       // Ring 0: Kernel Execution (168 BPM, F minor)

  // Backward compatibility aliases
  CYBER_PURGE: 'SANDBOX_PURGE',
  KERNEL_BREACH: 'KERNEL_PANIC',
};

const NOTE = {
  // Octave 1
  CS1: 34.65,
  D1: 36.71,
  DS1: 38.89,
  E1: 41.20,
  F1: 43.65,
  FS1: 46.25,
  G1: 49.00,
  GS1: 51.91,
  A1: 55.00,
  AS1: 58.27,
  B1: 61.74,

  // Octave 2
  C2: 65.41,
  CS2: 69.30,
  D2: 73.42,
  DS2: 77.78,
  E2: 82.41,
  F2: 87.31,
  FS2: 92.50,
  G2: 98.00,
  GS2: 103.83,
  A2: 110.00,
  AS2: 116.54,
  B2: 123.47,

  // Octave 3
  C3: 130.81,
  CS3: 138.59,
  D3: 146.83,
  DS3: 155.56,
  E3: 164.81,
  F3: 174.61,
  FS3: 185.00,
  G3: 196.00,
  GS3: 207.65,
  A3: 220.00,
  AS3: 233.08,
  B3: 246.94,

  // Octave 4
  C4: 261.63,
  CS4: 277.18,
  D4: 293.66,
  DS4: 311.13,
  E4: 329.63,
  F4: 349.23,
  FS4: 369.99,
  G4: 392.00,
  GS4: 415.30,
  A4: 440.00,
  AS4: 466.16,
  B4: 493.88,

  // Octave 5
  C5: 523.25,
  CS5: 554.37,
  D5: 587.33,
  DS5: 622.25,
  E5: 659.25,
  F5: 698.46,
  FS5: 739.99,
  G5: 783.99,
};

// 32-step patterns for the 4 distinct procedural tracks
export const TRACK_CONFIGS = {
  [MUSIC_TRACKS.OVERCLOCK_PULSE]: {
    id: MUSIC_TRACKS.OVERCLOCK_PULSE,
    name: 'OVERCLOCK_PULSE',
    bpm: 114, // Ring 3: Mellow Synthwave (~114 BPM, D minor pentatonic, warm filtered saws)
    mode: 'D_MINOR_PENTATONIC',
    profile: 'SYNTHWAVE',
    resonance: 2.5, // Warm, gentle resonance
    // Warm pumping 8th/16th saw bassline
    bass: [
      NOTE.D2, 0, NOTE.D2, 0, NOTE.F2, 0, NOTE.D2, 0,
      NOTE.G2, 0, NOTE.D2, 0, NOTE.A2, 0, NOTE.F2, 0,
      NOTE.D2, 0, NOTE.D2, 0, NOTE.F2, 0, NOTE.G2, 0,
      NOTE.A2, 0, NOTE.C3, 0, NOTE.A2, 0, NOTE.F2, NOTE.G2,
    ],
    // Mellow nostalgic synthwave melody (D minor pentatonic)
    lead: [
      NOTE.D4, 0, NOTE.F4, NOTE.G4, NOTE.A4, 0, NOTE.C5, 0,
      NOTE.A4, 0, NOTE.G4, 0, NOTE.F4, NOTE.D4, 0, NOTE.C4,
      NOTE.D4, 0, NOTE.F4, 0, NOTE.G4, NOTE.A4, NOTE.C5, 0,
      NOTE.D5, 0, NOTE.C5, NOTE.A4, NOTE.G4, 0, NOTE.F4, 0,
    ],
    // Laid-back 4-on-the-floor synthwave kick
    kick: [
      1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0,
      1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0,
    ],
    // Snappy vintage clap/snare on 4 & 12 (every 8 steps)
    snare: [
      0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0,
      0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0,
    ],
    // Soft steady 8th/16th hats
    hats: [
      1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 0,
      1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 1,
    ],
  },

  [MUSIC_TRACKS.BUS_COLLISION]: {
    id: MUSIC_TRACKS.BUS_COLLISION,
    name: 'BUS_COLLISION',
    bpm: 132, // Ring 2: Industrial EBM (~132 BPM, sharp FM-style bass, driving 16th arps)
    mode: 'A_MINOR',
    profile: 'EBM',
    resonance: 6.5, // Sharp punchy resonance
    // Relentless 16th-note driving EBM bass sequence
    bass: [
      NOTE.A1, NOTE.A1, NOTE.C2, NOTE.A1, NOTE.D2, NOTE.A1, NOTE.E2, NOTE.D2,
      NOTE.A1, NOTE.A1, NOTE.G2, NOTE.E2, NOTE.D2, NOTE.C2, NOTE.D2, NOTE.E2,
      NOTE.A1, NOTE.A1, NOTE.C2, NOTE.A1, NOTE.D2, NOTE.A1, NOTE.G2, NOTE.A2,
      NOTE.C3, NOTE.A2, NOTE.G2, NOTE.E2, NOTE.D2, NOTE.C2, NOTE.B1, NOTE.A1,
    ],
    // Sharp driving 16th-note industrial arpeggio
    lead: [
      NOTE.A4, NOTE.C5, NOTE.E5, NOTE.D5, NOTE.C5, NOTE.A4, NOTE.G4, NOTE.E4,
      NOTE.A4, NOTE.D5, NOTE.C5, NOTE.A4, NOTE.G4, NOTE.A4, NOTE.C5, NOTE.D5,
      NOTE.E5, NOTE.G5, NOTE.E5, NOTE.D5, NOTE.C5, NOTE.A4, NOTE.G4, NOTE.E4,
      NOTE.D4, NOTE.E4, NOTE.G4, NOTE.A4, NOTE.C5, NOTE.D5, NOTE.C5, NOTE.A4,
    ],
    // Driving industrial punch kick
    kick: [
      1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1,
      1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0,
    ],
    // Crisp snappy industrial snare
    snare: [
      0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0,
      0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0,
    ],
    // Driving 16th-note hats
    hats: [
      1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2,
      1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 2, 2,
    ],
  },

  [MUSIC_TRACKS.SANDBOX_PURGE]: {
    id: MUSIC_TRACKS.SANDBOX_PURGE,
    name: 'SANDBOX_PURGE',
    bpm: 150, // Ring 1: Aggressive Darksynth (~150 BPM, C# Phrygian, distorted square leads, pitch slides)
    mode: 'CSHARP_PHRYGIAN',
    profile: 'DARKSYNTH',
    resonance: 7.8, // Heavy aggressive resonance
    // Heavy distorted bass chug in C# Phrygian
    bass: [
      NOTE.CS2, NOTE.CS2, NOTE.D2, NOTE.CS2, NOTE.CS2, NOTE.E2, NOTE.D2, NOTE.CS2,
      NOTE.CS2, NOTE.CS2, NOTE.FS2, NOTE.E2, NOTE.D2, NOTE.CS2, NOTE.B1, NOTE.CS2,
      NOTE.CS2, NOTE.CS2, NOTE.D2, NOTE.CS2, NOTE.CS2, NOTE.GS2, NOTE.FS2, NOTE.E2,
      NOTE.D2, NOTE.E2, NOTE.D2, NOTE.CS2, NOTE.D2, NOTE.CS2, NOTE.B1, NOTE.CS2,
    ],
    // Aggressive piercing darksynth lead with slides
    lead: [
      NOTE.CS4, NOTE.E4, NOTE.D4, NOTE.CS4, NOTE.GS4, NOTE.A4, NOTE.GS4, NOTE.E4,
      NOTE.D4, NOTE.CS4, NOTE.D4, NOTE.E4, NOTE.FS4, NOTE.E4, NOTE.D4, NOTE.CS4,
      NOTE.E4, NOTE.FS4, NOTE.GS4, NOTE.A4, NOTE.GS4, NOTE.FS4, NOTE.E4, NOTE.D4,
      NOTE.CS4, NOTE.D4, NOTE.E4, NOTE.FS4, NOTE.E4, NOTE.D4, NOTE.CS4, NOTE.B3,
    ],
    // Relentless double-kick groove
    kick: [
      1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0,
      1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0,
    ],
    // Hard claps/snares with roll
    snare: [
      0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0,
      0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0,
    ],
    // Rapid open/closed 16th hats
    hats: [
      1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2,
      1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 2, 2,
    ],
  },

  [MUSIC_TRACKS.KERNEL_PANIC]: {
    id: MUSIC_TRACKS.KERNEL_PANIC,
    name: 'KERNEL_PANIC',
    bpm: 170, // Ring 0: Dark Drum & Bass / Cybercore (~170 BPM, chaotic Reese bass, high-speed breakbeats)
    mode: 'F_LOCRIAN_DNB',
    profile: 'CYBERCORE',
    resonance: 8.5, // Piercing high resonance
    // Heavy churning Reese bass in F
    bass: [
      NOTE.F1, NOTE.F1, NOTE.GS1, NOTE.F1, NOTE.AS1, NOTE.F1, NOTE.C2, NOTE.AS1,
      NOTE.F1, NOTE.F1, NOTE.CS2, NOTE.C2, NOTE.AS1, NOTE.GS1, NOTE.AS1, NOTE.C2,
      NOTE.F1, NOTE.F1, NOTE.GS1, NOTE.F1, NOTE.AS1, NOTE.F1, NOTE.DS2, NOTE.F2,
      NOTE.GS2, NOTE.F2, NOTE.DS2, NOTE.CS2, NOTE.C2, NOTE.AS1, NOTE.GS1, NOTE.F1,
    ],
    // High-speed cybercore lead riff
    lead: [
      NOTE.F4, NOTE.GS4, NOTE.C5, NOTE.AS4, NOTE.GS4, NOTE.F4, NOTE.DS4, NOTE.C4,
      NOTE.F4, NOTE.AS4, NOTE.GS4, NOTE.F4, NOTE.DS4, NOTE.F4, NOTE.GS4, NOTE.AS4,
      NOTE.C5, NOTE.DS5, NOTE.C5, NOTE.AS4, NOTE.GS4, NOTE.F4, NOTE.DS4, NOTE.C4,
      NOTE.AS3, NOTE.C4, NOTE.DS4, NOTE.F4, NOTE.GS4, NOTE.AS4, NOTE.GS4, NOTE.F4,
    ],
    // DNB breakbeat syncopated kick pattern
    kick: [
      1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0,
      1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0,
    ],
    // Fast breakbeat snare with ghost notes
    snare: [
      0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1,
      0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1,
    ],
    // Intense rapid-fire hats
    hats: [
      2, 1, 2, 1, 2, 1, 2, 2, 2, 1, 2, 1, 2, 1, 2, 2,
      2, 1, 2, 1, 2, 1, 2, 2, 2, 1, 2, 1, 2, 2, 2, 2,
    ],
  },
};

// Aliases for legacy configurations
TRACK_CONFIGS['CYBER_PURGE'] = TRACK_CONFIGS[MUSIC_TRACKS.SANDBOX_PURGE];
TRACK_CONFIGS['KERNEL_BREACH'] = TRACK_CONFIGS[MUSIC_TRACKS.KERNEL_PANIC];

export class SynthMusic {
  /**
   * @param {Object} [options={}]
   * @param {import('./SynthAudio.js').SynthAudio} [options.synth]
   * @param {AudioContext} [options.ctx]
   * @param {AudioNode} [options.destination]
   * @param {string} [options.track]
   */
  constructor({ synth = null, ctx = null, destination = null, track = null } = {}) {
    this.synth = synth;
    this.ctx = ctx || synth?.ctx || null;
    this.destination = destination || synth?.musicGain || synth?.masterGain || null;

    this.currentTrack = MUSIC_TRACKS.OVERCLOCK_PULSE;
    this.currentTrackConfig = TRACK_CONFIGS[this.currentTrack];

    // Maintain legacy 130 BPM default if no track was explicitly provided
    if (track && TRACK_CONFIGS[track]) {
      this.setTrack(track);
    } else {
      this.bpm = 130;
      this.stepDuration = 60 / (this.bpm * 4); // ~0.11538s per 16th note
    }

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
   * Switches the active procedural darksynth track
   * @param {string} trackId - 'OVERCLOCK_PULSE', 'CYBER_PURGE', or 'KERNEL_BREACH'
   */
  setTrack(trackId) {
    const config = TRACK_CONFIGS[trackId];
    if (!config) return;

    this.currentTrack = trackId;
    this.currentTrackConfig = config;
    this.bpm = config.bpm;
    this.stepDuration = 60 / (this.bpm * 4);
  }

  /**
   * Smoothly crossfades to a target procedural darksynth track over duration seconds
   * Uses safe linear gain ramps with a 0.001 floor to prevent WebAudio exceptions
   * @param {string} trackId
   * @param {number} [duration=1.0]
   */
  crossfadeToTrack(trackId, duration = 1.0) {
    if (this.currentTrack === trackId) return;
    const config = TRACK_CONFIGS[trackId];
    if (!config) return;

    if (!this.ctx || !this.masterGain || !this.isPlaying) {
      this.setTrack(trackId);
      return;
    }

    const now = this.ctx.currentTime;
    const half = Math.max(0.1, duration * 0.5);
    const curVol = Math.max(0.001, this.volume);

    try {
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(Math.max(0.001, this.masterGain.gain.value), now);
      this.masterGain.gain.linearRampToValueAtTime(0.001, now + half);

      setTimeout(() => {
        this.setTrack(trackId);
        if (this.ctx && this.masterGain && this.isPlaying) {
          const resumeTime = this.ctx.currentTime;
          this.masterGain.gain.cancelScheduledValues(resumeTime);
          this.masterGain.gain.setValueAtTime(0.001, resumeTime);
          this.masterGain.gain.linearRampToValueAtTime(curVol, resumeTime + half);
        }
      }, half * 1000);
    } catch (_) {
      this.setTrack(trackId);
    }
  }

  /**
   * Smoothly crossfades to a target procedural darksynth track by ring number or track ID
   * @param {number|string} ringOrTrack - 3, 2, 1, 0, or track name
   * @param {number} [duration=1.0]
   */
  crossfadeTo(ringOrTrack, duration = 1.0) {
    if (typeof ringOrTrack === 'number' || ringOrTrack === 'RING_0' || ringOrTrack === 'RING_1' || ringOrTrack === 'RING_2' || ringOrTrack === 'RING_3') {
      const r = typeof ringOrTrack === 'string'
        ? (ringOrTrack === 'RING_0' ? 0 : ringOrTrack === 'RING_1' ? 1 : ringOrTrack === 'RING_2' ? 2 : 3)
        : Number(ringOrTrack);
      const trackMap = {
        0: MUSIC_TRACKS.KERNEL_PANIC,
        1: MUSIC_TRACKS.SANDBOX_PURGE,
        2: MUSIC_TRACKS.BUS_COLLISION,
        3: MUSIC_TRACKS.OVERCLOCK_PULSE,
      };
      const trackId = trackMap[r] || MUSIC_TRACKS.OVERCLOCK_PULSE;
      this.crossfadeToTrack(trackId, duration);
    } else if (typeof ringOrTrack === 'string') {
      this.crossfadeToTrack(ringOrTrack, duration);
    }
  }

  /**
   * Dynamically rotates tracks according to clearance ring and wave progression
   * @param {number|string} ring - 3, 2, 1, 0 or 'RING_3', 'RING_2', 'RING_1', 'RING_0'
   * @param {number} [waveNumber]
   */
  setTrackForRing(ring, waveNumber) {
    const r = typeof ring === 'string'
      ? (ring === 'RING_0' ? 0 : ring === 'RING_1' ? 1 : ring === 'RING_2' ? 2 : 3)
      : Number(ring);

    // Milestone boss encounters (Waves 15, 30, 45, 60)
    if (waveNumber && (waveNumber === 15 || waveNumber === 30 || waveNumber === 45 || waveNumber === 60 || (waveNumber > 60 && waveNumber % 15 === 0))) {
      this.crossfadeToTrack(MUSIC_TRACKS.KERNEL_PANIC, 1.0);
      return;
    }

    if (r === 0) {
      this.crossfadeToTrack(MUSIC_TRACKS.KERNEL_PANIC, 1.0);
    } else if (r === 1) {
      this.crossfadeToTrack(MUSIC_TRACKS.SANDBOX_PURGE, 1.0);
    } else if (r === 2) {
      this.crossfadeToTrack(MUSIC_TRACKS.BUS_COLLISION, 1.0);
    } else {
      this.crossfadeToTrack(MUSIC_TRACKS.OVERCLOCK_PULSE, 1.0);
    }
  }

  /**
   * Dynamically rotates tracks according to wave progression and milestone boss encounters
   * @param {number} waveNumber
   */
  setTrackForWave(waveNumber) {
    if (waveNumber === 15 || waveNumber === 30 || waveNumber === 45 || waveNumber === 60 || (waveNumber > 60 && waveNumber % 15 === 0)) {
      this.crossfadeToTrack(MUSIC_TRACKS.KERNEL_PANIC, 1.0);
    } else if (waveNumber >= 46) {
      this.crossfadeToTrack(MUSIC_TRACKS.KERNEL_PANIC, 1.0);
    } else if (waveNumber >= 31) {
      this.crossfadeToTrack(MUSIC_TRACKS.SANDBOX_PURGE, 1.0);
    } else if (waveNumber >= 16) {
      this.crossfadeToTrack(MUSIC_TRACKS.BUS_COLLISION, 1.0);
    } else {
      this.crossfadeToTrack(MUSIC_TRACKS.OVERCLOCK_PULSE, 1.0);
    }
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
    const bufferSize = sampleRate * 1; // 1-second preallocated noise
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
    const track = this.currentTrackConfig || TRACK_CONFIGS[MUSIC_TRACKS.OVERCLOCK_PULSE];

    // 1. Channel 1: Driving 16th Sawtooth Bass with resonant lowpass sweep
    const bassFreq = track.bass[step % track.bass.length];
    if (bassFreq) {
      this._playBassNote(bassFreq, time, isCombat ? 0.38 : 0.22, track.resonance || 6.5);
    }

    // 2. Channel 2: Cyber / Darksynth Arp (Square with dynamic lowpass decay)
    const arpFreq = track.lead[step % track.lead.length];
    if (arpFreq) {
      if (isCombat || step % 2 === 0) {
        this._playArpNote(arpFreq, time, isCombat);
      }
    }

    // 3. Channel 3: Synthesized 4-on-the-Floor Kick Punch & Snare/Clap
    const kickHit = track.kick[step % track.kick.length];
    if (kickHit) {
      const isDownbeat = step % 8 === 0;
      if (isCombat || isDownbeat) {
        this._playKick(time, isCombat ? 0.58 : 0.32);
      }
    }

    const snareHit = track.snare[step % track.snare.length];
    if (snareHit) {
      this._playSnare(time, isCombat ? 0.38 : 0.14);
    }

    // 4. Channel 4: 16th Hi-Hats with open accents on offbeats
    const hatType = track.hats[step % track.hats.length];
    if (hatType) {
      const isOpen = hatType === 2;
      if (isCombat) {
        this._playHiHat(time, isOpen ? 0.16 : 0.08, isOpen);
      } else if (isOpen) {
        this._playHiHat(time, 0.06, false);
      }
    }
  }

  /**
   * Triggers an audible transition (tape-stop pitch drop, resonant filter sweep, drum cut) on Ring escalation
   */
  triggerEscalationTransition() {
    if (!this.ctx || !this.masterGain || !this.isPlaying) return;
    try {
      const now = this.ctx.currentTime;
      const dur = 0.45;

      // Filter sweep / tape-stop effect
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(640, now);
      // Tape-stop pitch dive down to 35Hz
      osc.frequency.exponentialRampToValueAtTime(35, now + dur);

      filter.type = 'lowpass';
      filter.Q.setValueAtTime(8.0, now);
      filter.frequency.setValueAtTime(2400, now);
      filter.frequency.exponentialRampToValueAtTime(100, now + dur);

      const sweepVol = Math.min(0.4, this.volume * 0.7);
      gain.gain.setValueAtTime(Math.max(0.001, sweepVol), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.onended = () => {
        try {
          osc.disconnect();
          filter.disconnect();
          gain.disconnect();
        } catch (_) {}
      };
      osc.start(now);
      osc.stop(now + dur);
    } catch (_) {}
  }

  /**
   * Channel 1: Bass note with distinct voice profiles per ring:
   * - Ring 3 (SYNTHWAVE): Warm filtered saw (resonance 2.5)
   * - Ring 2 (EBM): Sharp punchy FM bass
   * - Ring 1 (DARKSYNTH): Aggressive distorted bass chug
   * - Ring 0 (CYBERCORE): Chaotic dual detuned Reese bass (±14 cents detune beating)
   * @private
   */
  _playBassNote(freq, time, gainLevel, resonance = 6.5) {
    if (!freq) return;
    const dur = this.stepDuration * 0.92;
    const isCombat = this.intensity === MUSIC_INTENSITY.COMBAT;
    const profile = this.currentTrackConfig?.profile || 'DARKSYNTH';

    if (profile === 'CYBERCORE') {
      // Ring 0: Relentless dual detuned Reese bass (two detuned sawtooth oscillators)
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(freq, time);
      osc2.frequency.setValueAtTime(freq, time);

      // Dual detuning creates thick analog Reese beat phasing
      osc1.detune.setValueAtTime(-14, time);
      osc2.detune.setValueAtTime(14, time);

      filter.type = 'lowpass';
      filter.Q.setValueAtTime(resonance || 8.5, time);
      const cutoffPeak = isCombat ? 3200 : 900;
      const cutoffBase = isCombat ? 320 : 150;
      filter.frequency.setValueAtTime(cutoffPeak, time);
      filter.frequency.exponentialRampToValueAtTime(cutoffBase, time + dur * 0.7);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(gainLevel * 0.75, time + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      const cleanup = () => {
        try {
          osc1.disconnect();
          osc2.disconnect();
          filter.disconnect();
          gain.disconnect();
        } catch (_) {}
      };
      osc1.onended = cleanup;
      osc1.start(time);
      osc2.start(time);
      osc1.stop(time + dur);
      osc2.stop(time + dur);
      return;
    }

    if (profile === 'EBM') {
      // Ring 2: Punchy FM-style bass (carrier modulated by modulator oscillator)
      const carrier = this.ctx.createOscillator();
      const modulator = this.ctx.createOscillator();
      const modGain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      carrier.type = 'sawtooth';
      carrier.frequency.setValueAtTime(freq, time);

      modulator.type = 'sine';
      modulator.frequency.setValueAtTime(freq * 2, time); // 2:1 FM ratio for metallic bite
      modGain.gain.setValueAtTime(freq * 1.5, time);
      modGain.gain.exponentialRampToValueAtTime(Math.max(1, freq * 0.1), time + dur * 0.5);

      modulator.connect(carrier.frequency);

      filter.type = 'lowpass';
      filter.Q.setValueAtTime(resonance || 6.5, time);
      filter.frequency.setValueAtTime(isCombat ? 2400 : 700, time);
      filter.frequency.exponentialRampToValueAtTime(isCombat ? 250 : 120, time + dur * 0.6);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(gainLevel, time + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

      carrier.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      carrier.onended = () => {
        try {
          modulator.disconnect();
          modGain.disconnect();
          carrier.disconnect();
          filter.disconnect();
          gain.disconnect();
        } catch (_) {}
      };
      modulator.start(time);
      carrier.start(time);
      modulator.stop(time + dur);
      carrier.stop(time + dur);
      return;
    }

    // Default & Ring 3 (SYNTHWAVE) / Ring 1 (DARKSYNTH)
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = profile === 'SYNTHWAVE' ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    osc.detune.setValueAtTime(profile === 'SYNTHWAVE' ? -4 : -8, time);

    filter.type = 'lowpass';
    filter.Q.setValueAtTime(resonance, time);

    const cutoffPeak = isCombat ? (profile === 'SYNTHWAVE' ? 1400 : 2600) : 650;
    const cutoffBase = isCombat ? (profile === 'SYNTHWAVE' ? 180 : 200) : 100;

    filter.frequency.setValueAtTime(cutoffPeak, time);
    filter.frequency.exponentialRampToValueAtTime(cutoffBase, time + dur * 0.7);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(gainLevel, time + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.onended = () => {
      try {
        osc.disconnect();
        filter.disconnect();
        gain.disconnect();
      } catch (_) {}
    };
    osc.start(time);
    osc.stop(time + dur);
  }

  /**
   * Channel 2: Lead synth with distinct characteristics per ring:
   * - Ring 3 (SYNTHWAVE): Warm soft square / triangle lead
   * - Ring 2 (EBM): Crisp driving 16th square arp
   * - Ring 1 (DARKSYNTH): Distorted square lead with aggressive pitch slides
   * - Ring 0 (CYBERCORE): Screaming rapid lead
   * @private
   */
  _playArpNote(freq, time, isCombat) {
    if (!freq) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    const profile = this.currentTrackConfig?.profile || 'DARKSYNTH';

    osc.type = profile === 'SYNTHWAVE' ? 'sawtooth' : 'square';
    osc.frequency.setValueAtTime(freq, time);

    // Ring 1 Darksynth pitch slides on accents
    if (profile === 'DARKSYNTH' && this.currentStep % 4 === 0) {
      const slideTarget = Math.max(20, freq * 1.06);
      osc.frequency.exponentialRampToValueAtTime(slideTarget, time + this.stepDuration * 0.4);
    }

    filter.type = 'lowpass';
    filter.Q.setValueAtTime(isCombat ? (profile === 'DARKSYNTH' ? 7 : 4) : 2, time);

    const cutoffPeak = isCombat ? (profile === 'SYNTHWAVE' ? 1600 : 2800) : 750;
    const cutoffBase = isCombat ? (profile === 'SYNTHWAVE' ? 320 : 450) : 250;
    const dur = this.stepDuration * (profile === 'SYNTHWAVE' ? 0.95 : 0.85);

    filter.frequency.setValueAtTime(cutoffPeak, time);
    filter.frequency.exponentialRampToValueAtTime(cutoffBase, time + dur);

    const gainPeak = isCombat ? (profile === 'CYBERCORE' ? 0.18 : 0.15) : 0.08;
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(gainPeak, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.onended = () => {
      try {
        osc.disconnect();
        filter.disconnect();
        gain.disconnect();
      } catch (_) {}
    };
    osc.start(time);
    osc.stop(time + dur);
  }

  /**
   * Channel 3a: 4-on-the-floor kick punch (pitch drop from 150Hz to 35Hz)
   * @private
   */
  _playKick(time, gainLevel) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(35, time + 0.08);

    const dur = 0.12;
    gain.gain.setValueAtTime(gainLevel, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch (_) {}
    };
    osc.start(time);
    osc.stop(time + dur);
  }

  /**
   * Channel 3b: Noise + tone crisp snare/clap
   * @private
   */
  _playSnare(time, gainLevel) {
    if (!this.noiseBuffer) return;

    // Noise body
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1400, time);
    noiseFilter.Q.setValueAtTime(1.8, time);

    const noiseGain = this.ctx.createGain();
    const dur = 0.11;
    noiseGain.gain.setValueAtTime(gainLevel, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noiseSource.onended = () => {
      try {
        noiseSource.disconnect();
        noiseFilter.disconnect();
        noiseGain.disconnect();
      } catch (_) {}
    };
    noiseSource.start(time);
    noiseSource.stop(time + dur);

    // Subtle tone punch
    const toneOsc = this.ctx.createOscillator();
    const toneGain = this.ctx.createGain();

    toneOsc.type = 'triangle';
    toneOsc.frequency.setValueAtTime(190, time);
    toneOsc.frequency.exponentialRampToValueAtTime(65, time + 0.05);

    toneGain.gain.setValueAtTime(gainLevel * 0.65, time);
    toneGain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);

    toneOsc.connect(toneGain);
    toneGain.connect(this.masterGain);

    toneOsc.onended = () => {
      try {
        toneOsc.disconnect();
        toneGain.disconnect();
      } catch (_) {}
    };
    toneOsc.start(time);
    toneOsc.stop(time + 0.06);
  }

  /**
   * Channel 4: Highpass filtered noise hi-hat (closed vs open 16th hats)
   * @private
   */
  _playHiHat(time, gainLevel, isOpen = false) {
    if (!this.noiseBuffer) return;

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(isOpen ? 6500 : 8000, time);

    const gain = this.ctx.createGain();
    const dur = isOpen ? 0.09 : 0.025;
    gain.gain.setValueAtTime(gainLevel, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noiseSource.onended = () => {
      try {
        noiseSource.disconnect();
        filter.disconnect();
        gain.disconnect();
      } catch (_) {}
    };
    noiseSource.start(time);
    noiseSource.stop(time + dur);
  }
}
