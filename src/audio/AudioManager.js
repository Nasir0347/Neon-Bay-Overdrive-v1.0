/**
 * Adaptive Web Audio Engine for Neon Bay: Overdrive.
 * Handles continuous RPM pitch & gear modulation, tire drift screech, velocity-scaled
 * crash impacts, distance-attenuated police sirens, 3 Neon Bay radio stations
 * (99.5 Neon FM, 104.2 Drift Radio, 88.0 Bay Beats), and visibilitychange auto-mute.
 * Pure zero-import ES Module.
 */

export const NEON_RADIO_STATIONS = Object.freeze([
  Object.freeze({
    id: 0,
    name: 'OFF',
    genre: 'Muted',
    caption: 'Radio off — Neon Bay skyline ambience active.',
    tempoSec: 0,
    notes: Object.freeze([]),
    bass: Object.freeze([])
  }),
  Object.freeze({
    id: 1,
    name: '99.5 Neon FM',
    genre: 'Miami Synthwave',
    caption: 'Now playing: Outrun Sunset Skyline (Synthwave)',
    tempoSec: 0.34,
    notes: Object.freeze([261.63, 329.63, 392.0, 493.88, 440.0, 392.0, 329.63, 293.66]),
    bass: Object.freeze([130.81, 130.81, 146.83, 146.83, 164.81, 164.81, 196.0, 146.83])
  }),
  Object.freeze({
    id: 2,
    name: '104.2 Drift Radio',
    genre: 'Phonk / Bass',
    caption: 'Now playing: Iron Docks Slide (Phonk)',
    tempoSec: 0.28,
    notes: Object.freeze([220.0, 220.0, 261.63, 246.94, 196.0, 220.0, 329.63, 293.66]),
    bass: Object.freeze([82.41, 82.41, 98.0, 92.5, 73.42, 82.41, 110.0, 98.0])
  }),
  Object.freeze({
    id: 3,
    name: '88.0 Bay Beats',
    genre: 'Hip-Hop / Trap',
    caption: 'Now playing: Palm Strip Afterhours (808 Beats)',
    tempoSec: 0.38,
    notes: Object.freeze([196.0, 233.08, 261.63, 293.66, 349.23, 293.66, 261.63, 233.08]),
    bass: Object.freeze([65.41, 65.41, 87.31, 87.31, 73.42, 73.42, 98.0, 77.78])
  })
]);

const ENGINE_PROFILE_MAP = Object.freeze({
  sedan: { idleHz: 46, maxHz: 190, shiftSpeeds: [0, 36, 78, 122, 162, 220] },
  sports: { idleHz: 58, maxHz: 235, shiftSpeeds: [0, 42, 90, 140, 190, 265] },
  supercar: { idleHz: 74, maxHz: 295, shiftSpeeds: [0, 52, 108, 168, 235, 330] },
  muscle: { idleHz: 44, maxHz: 185, shiftSpeeds: [0, 40, 86, 132, 178, 240] },
  suv: { idleHz: 40, maxHz: 165, shiftSpeeds: [0, 35, 72, 114, 155, 200] },
  bike: { idleHz: 78, maxHz: 310, shiftSpeeds: [0, 38, 82, 130, 178, 230] },
  superbike: { idleHz: 94, maxHz: 370, shiftSpeeds: [0, 50, 106, 168, 238, 320] },
  boat: { idleHz: 52, maxHz: 205, shiftSpeeds: [0, 35, 70, 105, 135, 170] }
});

export function computeEngineRpmPitch({
  speedKmh = 0,
  vehicleType = 'sedan',
  nitro = false
} = {}) {
  const spd = Math.max(0, Math.min(400, Number.isFinite(Number(speedKmh)) ? Math.abs(Number(speedKmh)) : 0));
  const prof = ENGINE_PROFILE_MAP[vehicleType] || ENGINE_PROFILE_MAP.sedan;
  const shifts = prof.shiftSpeeds;

  let gear = 1;
  for (let i = 1; i < shifts.length - 1; i++) {
    if (spd >= shifts[i]) gear = i + 1;
  }
  const lowBound = shifts[gear - 1];
  const highBound = shifts[gear];
  const span = Math.max(1, highBound - lowBound);
  const gearFrac = Math.max(0, Math.min(1, (spd - lowBound) / span));
  const rpm = Math.min(1, Math.max(0.15, 0.22 + gearFrac * 0.72 + Math.min(0.16, spd / 380)));

  const nitroMult = nitro ? 1.26 : 1.0;
  const baseFreqHz = Math.round((prof.idleHz + (prof.maxHz - prof.idleHz) * rpm) * nitroMult * 100) / 100;
  const filterCutoffHz = Math.round((280 + spd * 7.2 + (nitro ? 380 : 0)) * 10) / 10;

  return {
    gear,
    rpm: Math.round(rpm * 1000) / 1000,
    baseFreqHz,
    subFreqHz: Math.round(baseFreqHz * 0.5 * 100) / 100,
    filterCutoffHz: Math.min(2600, filterCutoffHz)
  };
}

export class AudioManager {
  constructor({
    win = globalThis.window || null,
    doc = globalThis.document || null,
    eventBus = null,
    saveManager = null,
    AudioContextCtor = null
  } = {}) {
    this.win = win || null;
    this.doc = doc || null;
    this.eventBus = eventBus || null;
    this.saveManager = saveManager || null;
    this._AudioCtor = AudioContextCtor || this.win?.AudioContext || this.win?.webkitAudioContext || null;

    const saved = this.saveManager?.getData?.()?.settings || {};
    this.muted = !!saved.muted;
    this.visibilityMuted = !!(this.doc && this.doc.hidden);
    this.masterVolume = Number.isFinite(saved.masterVolume) ? saved.masterVolume : 1.0;
    this.sfxVolume = Number.isFinite(saved.sfxVolume) ? saved.sfxVolume : 0.7;
    this.musicVolume = Number.isFinite(saved.musicVolume) ? saved.musicVolume : 0.35;

    this.activeStationIndex = 0;
    this.unlocked = false;
    this.isSuspended = false;

    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.engineOsc = null;
    this.engineSubOsc = null;
    this.engineFilter = null;
    this.engineGain = null;
    this.driftGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.radioLeadOsc = null;
    this.radioBassOsc = null;
    this.radioGain = null;
    this.noiseBuffer = null;

    this._radioClock = 0;
    this._radioNoteIndex = 0;
    this._sirenPhase = 0;
    this._cleanups = [];
    this.lastEngineMetrics = computeEngineRpmPitch({ speedKmh: 0 });
  }

  _canEmitSound() {
    return !!this.ctx && !this.muted && !this.visibilityMuted && this.masterVolume > 0;
  }

  getOrCreateContext() {
    if (!this.ctx && !this.muted && this.masterVolume > 0) {
      this._buildAudioGraph();
    }
    return this.ctx;
  }

  _setGain(gainNode, value, tc = 0.06) {
    if (!gainNode?.gain || !this.ctx) return;
    const t = this.ctx.currentTime || 0;
    if (typeof gainNode.gain.setTargetAtTime === 'function') {
      gainNode.gain.setTargetAtTime(value, t, tc);
    } else {
      gainNode.gain.value = value;
    }
  }

  _buildAudioGraph() {
    if (this.ctx || !this._AudioCtor) return false;
    if (this.muted || this.masterVolume <= 0) return false;

    const ctx = new this._AudioCtor();
    this.ctx = ctx;

    const masterGain = ctx.createGain();
    masterGain.gain.value = this._canEmitSound() ? this.masterVolume : 0;
    masterGain.connect(ctx.destination);
    this.masterGain = masterGain;

    const sfxGain = ctx.createGain();
    sfxGain.gain.value = this.sfxVolume;
    sfxGain.connect(masterGain);
    this.sfxGain = sfxGain;

    const musicGain = ctx.createGain();
    musicGain.gain.value = this.musicVolume;
    musicGain.connect(masterGain);
    this.musicGain = musicGain;

    // Noise buffer for drift screech + crash impacts
    const sr = ctx.sampleRate || 44100;
    const buf = ctx.createBuffer(1, sr, sr);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buf;

    // Continuous Engine RPM Oscillator + Sub + Filter
    const engOsc = ctx.createOscillator();
    engOsc.type = 'sawtooth';
    engOsc.frequency.value = 48;
    const engSub = ctx.createOscillator();
    engSub.type = 'triangle';
    engSub.frequency.value = 24;
    const engFilter = ctx.createBiquadFilter();
    engFilter.type = 'lowpass';
    engFilter.frequency.value = 340;
    const engGain = ctx.createGain();
    engGain.gain.value = 0;
    engOsc.connect(engFilter);
    engSub.connect(engFilter);
    engFilter.connect(engGain).connect(sfxGain);
    engOsc.start();
    engSub.start();
    this.engineOsc = engOsc;
    this.engineSubOsc = engSub;
    this.engineFilter = engFilter;
    this.engineGain = engGain;

    // Tire Drift Screech Noise Loop
    const driftSrc = ctx.createBufferSource();
    driftSrc.buffer = buf;
    driftSrc.loop = true;
    const driftFilter = ctx.createBiquadFilter();
    driftFilter.type = 'bandpass';
    driftFilter.frequency.value = 1480;
    driftFilter.Q.value = 3.2;
    const driftGain = ctx.createGain();
    driftGain.gain.value = 0;
    driftSrc.connect(driftFilter).connect(driftGain).connect(sfxGain);
    driftSrc.start();
    this.driftGain = driftGain;

    // Police Siren Oscillator
    const sirenOsc = ctx.createOscillator();
    sirenOsc.type = 'sine';
    sirenOsc.frequency.value = 720;
    const sirenGain = ctx.createGain();
    sirenGain.gain.value = 0;
    sirenOsc.connect(sirenGain).connect(sfxGain);
    sirenOsc.start();
    this.sirenOsc = sirenOsc;
    this.sirenGain = sirenGain;

    // 3-Station Procedural Radio Synth
    const radioGain = ctx.createGain();
    radioGain.gain.value = 0;
    radioGain.connect(musicGain);
    const radioLeadOsc = ctx.createOscillator();
    radioLeadOsc.type = 'triangle';
    radioLeadOsc.frequency.value = 261.63;
    const radioBassOsc = ctx.createOscillator();
    radioBassOsc.type = 'sine';
    radioBassOsc.frequency.value = 130.81;
    const bassTrim = ctx.createGain();
    bassTrim.gain.value = 0.55;
    radioLeadOsc.connect(radioGain);
    radioBassOsc.connect(bassTrim).connect(radioGain);
    radioLeadOsc.start();
    radioBassOsc.start();
    this.radioGain = radioGain;
    this.radioLeadOsc = radioLeadOsc;
    this.radioBassOsc = radioBassOsc;

    this.unlocked = true;
    this.isSuspended = ctx.state === 'suspended';
    return true;
  }

  unlock() {
    if (this.muted || this.visibilityMuted || this.masterVolume <= 0) {
      return Promise.resolve({ unlocked: false, reason: 'muted-or-hidden' });
    }
    if (!this.ctx) {
      this._buildAudioGraph();
    }
    if (!this.ctx) {
      return Promise.resolve({ unlocked: false, reason: 'no-audiocontext' });
    }
    if (typeof this.ctx.resume === 'function' && this.ctx.state === 'suspended') {
      return Promise.resolve(this.ctx.resume())
        .then(() => {
          this.unlocked = true;
          this.isSuspended = this.ctx.state === 'suspended';
          return { unlocked: true, state: this.ctx.state };
        })
        .catch(() => ({ unlocked: false, reason: 'resume-blocked' }));
    }
    this.unlocked = true;
    this.isSuspended = false;
    return Promise.resolve({ unlocked: true, state: this.ctx.state || 'running' });
  }

  setMuted(flag) {
    this.muted = !!flag;
    if (this.saveManager?.getData) {
      const s = this.saveManager.getData().settings || {};
      this.saveManager.save({ settings: { ...s, muted: this.muted } });
    }
    if (this.ctx) {
      this._setGain(this.masterGain, this._canEmitSound() ? this.masterVolume : 0, 0.02);
      if (this.muted && typeof this.ctx.suspend === 'function') {
        Promise.resolve(this.ctx.suspend()).catch(() => {});
        this.isSuspended = true;
      } else if (!this.muted && !this.visibilityMuted && typeof this.ctx.resume === 'function') {
        Promise.resolve(this.ctx.resume()).catch(() => {});
        this.isSuspended = false;
      }
    }
    this.eventBus?.emit?.('audio:muteChange', { muted: this.muted });
    return this.muted;
  }

  setVolumes({ master, sfx, music } = {}) {
    if (Number.isFinite(master)) this.masterVolume = Math.max(0, Math.min(1, master));
    if (Number.isFinite(sfx)) this.sfxVolume = Math.max(0, Math.min(1, sfx));
    if (Number.isFinite(music)) this.musicVolume = Math.max(0, Math.min(1, music));

    if (this.ctx) {
      this._setGain(this.masterGain, this._canEmitSound() ? this.masterVolume : 0, 0.05);
      this._setGain(this.sfxGain, this.sfxVolume, 0.05);
      this._setGain(this.musicGain, this.musicVolume, 0.05);
    }

    if (this.saveManager?.getData) {
      const s = this.saveManager.getData().settings || {};
      this.saveManager.save({
        settings: {
          ...s,
          masterVolume: this.masterVolume,
          sfxVolume: this.sfxVolume,
          musicVolume: this.musicVolume
        }
      });
    }
  }

  setStation(index) {
    const clean = ((Math.floor(Number(index)) % NEON_RADIO_STATIONS.length) + NEON_RADIO_STATIONS.length) % NEON_RADIO_STATIONS.length;
    this.activeStationIndex = clean;
    this._radioClock = 0;
    this._radioNoteIndex = 0;
    const station = NEON_RADIO_STATIONS[clean];
    this.eventBus?.emit?.('audio:stationChange', { index: clean, station });
    return station;
  }

  cycleStation() {
    return this.setStation((this.activeStationIndex + 1) % NEON_RADIO_STATIONS.length);
  }

  handleVisibilityChange(isHidden) {
    this.visibilityMuted = !!isHidden;
    if (this.visibilityMuted) {
      if (this.ctx) {
        this._setGain(this.masterGain, 0, 0.01);
        if (typeof this.ctx.suspend === 'function') {
          this._pendingStatePromise = Promise.resolve(this.ctx.suspend()).catch(() => {});
        }
      }
      this.isSuspended = true;
      this.eventBus?.emit?.('audio:visibilityMute', { hidden: true });
    } else {
      if (this.ctx && !this.muted && this.masterVolume > 0) {
        this._setGain(this.masterGain, this.masterVolume, 0.04);
        if (this.unlocked && typeof this.ctx.resume === 'function') {
          this._pendingStatePromise = Promise.resolve(this.ctx.resume()).catch(() => {});
        }
        this.isSuspended = false;
      }
      this.eventBus?.emit?.('audio:visibilityUnmute', { hidden: false, muted: this.muted });
    }
    return this.visibilityMuted;
  }

  bindVisibilityListener() {
    if (this.doc?.addEventListener) {
      const onVis = () => this.handleVisibilityChange(!!this.doc.hidden);
      this.doc.addEventListener('visibilitychange', onVis);
      this._cleanups.push(() => this.doc.removeEventListener('visibilitychange', onVis));
    }
    if (this.win?.addEventListener) {
      const onBlur = () => this.handleVisibilityChange(true);
      const onFocus = () => {
        if (!this.doc?.hidden) this.handleVisibilityChange(false);
      };
      this.win.addEventListener('blur', onBlur);
      this.win.addEventListener('focus', onFocus);
      this._cleanups.push(() => {
        this.win.removeEventListener('blur', onBlur);
        this.win.removeEventListener('focus', onFocus);
      });
    }
    return this;
  }

  playCrash(intensity = 0.6) {
    if (!this._canEmitSound() || this.sfxVolume <= 0 || !this.noiseBuffer) {
      return { played: false };
    }
    const t = this.ctx.currentTime || 0;
    const lvl = Math.max(0.2, Math.min(1, Number(intensity) || 0.6));

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 680;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.22 * lvl, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    noise.connect(lp).connect(ng).connect(this.sfxGain);
    noise.start(t);
    noise.stop(t + 0.23);

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    const sg = this.ctx.createGain();
    osc.frequency.setValueAtTime(98, t);
    osc.frequency.exponentialRampToValueAtTime(34, t + 0.18);
    sg.gain.setValueAtTime(0.18 * lvl, t);
    sg.gain.exponentialRampToValueAtTime(0.001, t + 0.19);
    osc.connect(sg).connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.2);

    return { played: true, intensity: lvl };
  }

  playUiClick(kind = 'tap') {
    if (!this._canEmitSound() || this.sfxVolume <= 0) {
      return { played: false };
    }
    const t = this.ctx.currentTime || 0;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = kind === 'confirm' ? 780 : kind === 'error' ? 240 : 540;
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(g).connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.065);
    return { played: true, kind };
  }

  playCue(type = 'collect') {
    if (type === 'crash') return this.playCrash(0.5);
    if (!this._canEmitSound() || this.sfxVolume <= 0) {
      return { played: false };
    }
    const freqs =
      type === 'success'
        ? [523.25, 659.25, 783.99]
        : type === 'tick'
          ? [880]
          : type === 'soft'
            ? [330]
            : [659.25, 880];
    const baseTime = this.ctx.currentTime || 0;
    freqs.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      const t = baseTime + i * 0.1;
      osc.type = type === 'tick' ? 'sine' : 'triangle';
      osc.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(type === 'tick' ? 0.07 : 0.12, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, t + (type === 'tick' ? 0.075 : 0.18));
      osc.connect(g).connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + (type === 'tick' ? 0.085 : 0.19));
    });
    return { played: true, type };
  }

  playNosBurst() {
    if (!this._canEmitSound() || this.sfxVolume <= 0 || !this.noiseBuffer) {
      return { played: false };
    }
    const t = this.ctx.currentTime || 0;
    const n = this.ctx.createBufferSource();
    n.buffer = this.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(900, t);
    bp.frequency.exponentialRampToValueAtTime(2400, t + 0.25);
    bp.Q.value = 1.4;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.16, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    n.connect(bp).connect(g).connect(this.sfxGain);
    n.start(t);
    n.stop(t + 0.29);

    const osc = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(420, t + 0.22);
    og.gain.setValueAtTime(0.09, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.23);
    osc.connect(og).connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.24);
    return { played: true };
  }

  playTurboPop() {
    if (!this._canEmitSound() || this.sfxVolume <= 0 || !this.noiseBuffer) {
      return { played: false };
    }
    const t = this.ctx.currentTime || 0;
    const n = this.ctx.createBufferSource();
    n.buffer = this.noiseBuffer;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 950;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.14, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    n.connect(lp).connect(g).connect(this.sfxGain);
    n.start(t);
    n.stop(t + 0.09);
    return { played: true };
  }

  playHorn() {
    if (!this._canEmitSound() || this.sfxVolume <= 0) {
      return { played: false };
    }
    const t = this.ctx.currentTime || 0;
    for (const freq of [349.23, 440]) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.06, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      osc.connect(g).connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.25);
    }
    return { played: true };
  }

  playDoorSound(mode = 'open') {
    if (!this._canEmitSound() || this.sfxVolume <= 0) {
      return { played: false };
    }
    const t = this.ctx.currentTime || 0;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(mode === 'slam' ? 110 : 210, t);
    osc.frequency.exponentialRampToValueAtTime(mode === 'slam' ? 42 : 95, t + 0.09);
    g.gain.setValueAtTime(0.11, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(g).connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.11);
    return { played: true, mode };
  }

  update(dt, {
    running = true,
    inCar = false,
    speedKmh = 0,
    vehicleType = 'sedan',
    nitro = false,
    driftAmount = 0,
    sirenActive = false,
    wantedLevel = 0,
    sirenDistanceM = 12
  } = {}) {
    const step = Math.max(0, Math.min(0.25, Number(dt) || 0));
    this.lastEngineMetrics = computeEngineRpmPitch({ speedKmh, vehicleType, nitro });

    if (!this.ctx) return this.lastEngineMetrics;
    const active = running && this._canEmitSound();

    // Master & channel gains
    this._setGain(this.masterGain, active ? this.masterVolume : 0, 0.04);
    this._setGain(this.sfxGain, this.sfxVolume, 0.05);
    this._setGain(this.musicGain, this.musicVolume, 0.05);

    const t = this.ctx.currentTime || 0;

    // 1. Engine RPM Pitch + Filter
    if (this.engineOsc?.frequency) {
      if (typeof this.engineOsc.frequency.setTargetAtTime === 'function') {
        this.engineOsc.frequency.setTargetAtTime(this.lastEngineMetrics.baseFreqHz, t, 0.07);
        this.engineSubOsc?.frequency?.setTargetAtTime?.(this.lastEngineMetrics.subFreqHz, t, 0.07);
        this.engineFilter?.frequency?.setTargetAtTime?.(this.lastEngineMetrics.filterCutoffHz, t, 0.07);
      } else {
        this.engineOsc.frequency.value = this.lastEngineMetrics.baseFreqHz;
        if (this.engineSubOsc) this.engineSubOsc.frequency.value = this.lastEngineMetrics.subFreqHz;
        if (this.engineFilter) this.engineFilter.frequency.value = this.lastEngineMetrics.filterCutoffHz;
      }
    }
    this._setGain(this.engineGain, active && inCar ? 0.042 : 0, 0.08);

    // 2. Tire Drift Screech
    const cleanDrift = Math.max(0, Math.min(1, Number(driftAmount) || 0));
    const driftLevel = active && inCar && cleanDrift > 0.15 ? cleanDrift * 0.065 : 0;
    this._setGain(this.driftGain, driftLevel, 0.05);

    // 3. Spatial Police Siren
    const sirenOn = active && (sirenActive || wantedLevel > 0);
    const atten = 1 / (1 + Math.max(0, Number(sirenDistanceM) || 0) / 45);
    this._setGain(this.sirenGain, sirenOn ? 0.055 * atten : 0, 0.06);
    if (sirenOn && this.sirenOsc?.frequency) {
      this._sirenPhase += step * 5.2;
      const sFreq = 880 + Math.sin(this._sirenPhase) * 240;
      if (typeof this.sirenOsc.frequency.setTargetAtTime === 'function') {
        this.sirenOsc.frequency.setTargetAtTime(sFreq, t, 0.04);
      } else {
        this.sirenOsc.frequency.value = sFreq;
      }
    }

    // 4. 3-Station Procedural Radio Synth
    const st = NEON_RADIO_STATIONS[this.activeStationIndex] || NEON_RADIO_STATIONS[0];
    const radioOn = active && this.activeStationIndex > 0 && st.notes.length > 0 && this.musicVolume > 0;
    this._setGain(this.radioGain, radioOn ? 0.09 : 0, 0.08);
    if (radioOn) {
      this._radioClock += step;
      if (this._radioClock >= (st.tempoSec || 0.34)) {
        this._radioClock = 0;
        const nIdx = this._radioNoteIndex++ % st.notes.length;
        const leadHz = st.notes[nIdx];
        const bassHz = st.bass[nIdx % st.bass.length];
        if (this.radioLeadOsc?.frequency) {
          if (typeof this.radioLeadOsc.frequency.setTargetAtTime === 'function') {
            this.radioLeadOsc.frequency.setTargetAtTime(leadHz, t, 0.03);
            this.radioBassOsc?.frequency?.setTargetAtTime?.(bassHz, t, 0.03);
          } else {
            this.radioLeadOsc.frequency.value = leadHz;
            if (this.radioBassOsc) this.radioBassOsc.frequency.value = bassHz;
          }
        }
      }
    }

    return this.lastEngineMetrics;
  }

  destroy() {
    for (const fn of this._cleanups.splice(0)) fn();
    if (this.ctx && typeof this.ctx.close === 'function') {
      Promise.resolve(this.ctx.close()).catch(() => {});
    }
    this.ctx = null;
    this.unlocked = false;
  }
}
