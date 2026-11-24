import { eventBus as defaultEventBus, EVENTS } from './EventBus.js';

export const SAVE_KEY = 'neon_bay_save_v1';
export const SCHEMA_VERSION = 1;

export const VALID_CAR_IDS = Object.freeze([
  'C01', 'C02', 'C03', 'C04', 'C05', 'C06',
  'C07', 'C08', 'C09', 'C10', 'C11', 'C12'
]);
export const VALID_BIKE_IDS = Object.freeze(['B01', 'B02', 'B03', 'B04']);
export const STARTER_CARS = Object.freeze(['C01', 'C02']);
export const STARTER_BIKES = Object.freeze(['B01']);
export const VALID_MISSION_IDS = Object.freeze(
  Array.from({ length: 20 }, (_, i) => `M${i + 1}`)
);
export const VALID_QUALITIES = Object.freeze(['low', 'medium', 'high']);
export const VALID_LANGUAGES = Object.freeze(['en', 'es', 'pt', 'fr', 'de', 'ar']);
export const VALID_HUD_OPACITIES = Object.freeze(['clear', 'glass', 'solid']);

const VALID_CAR_SET = new Set(VALID_CAR_IDS);
const VALID_BIKE_SET = new Set(VALID_BIKE_IDS);
const VALID_MISSION_SET = new Set(VALID_MISSION_IDS);
const VALID_NEON_SET = new Set(['off', 'cyan', 'magenta', 'gold', 'red', 'green', 'purple']);
const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const clone = (v) => JSON.parse(JSON.stringify(v));
const clampInt = (n, min, max, fallback) => {
  const num = Number(n);
  return Number.isFinite(num) ? Math.max(min, Math.min(max, Math.floor(num))) : fallback;
};
const clampFloat = (n, min, max, fallback) => {
  const num = Number(n);
  return Number.isFinite(num) ? Math.max(min, Math.min(max, num)) : fallback;
};
const missionNum = (id) => Number(String(id).slice(1)) || 999;

/** Build a clean default V1.0 save payload aligned with GAME_MASTER_SPEC_V1. */
export function createDefaultSave() {
  return {
    schemaVersion: SCHEMA_VERSION,
    cash: 500,
    unlockedVehicles: {
      cars: [...STARTER_CARS],
      bikes: [...STARTER_BIKES]
    },
    selectedVehicle: 'C01',
    customizations: {},
    completedMissions: [],
    starRatings: {},
    city2Unlocked: false,
    settings: {
      graphicsQuality: 'low',
      language: 'en',
      steerMode: 'joystick',
      hudOpacity: 'glass',
      fpsCap: 60,
      masterVolume: 1,
      sfxVolume: 0.7,
      musicVolume: 0.35,
      muted: false,
      haptics: true
    },
    dailyStreak: {
      count: 0,
      lastClaimDate: null,
      bestStreak: 0,
      completedToday: false
    },
    stats: {
      totalDriftMeters: 0,
      totalJumps: 0,
      highestWantedCleared: 0,
      consecutiveFails: {}
    },
    monetization: {
      removeAds: false,
      unlockAllVehicles: false,
      missionsSinceInterstitial: 0
    },
    retention: {
      streakSkinUnlocked: false,
      dailyDate: null,
      dailyCompletedIds: [],
      completedChallenges: [],
      discoveredSecrets: [],
      hustlesCompleted: 0
    },
    lastMissionId: null,
    lastMissionState: null,
    vehicleState: null
  };
}

/**
 * Schema-versioned save persistence with corrupt-JSON recovery and automatic
 * in-memory fallback when `localStorage` is blocked or over quota.
 */
export class SaveManager {
  /**
   * @param {{ storage?: Storage|null, storageKey?: string, eventBus?: import('./EventBus.js').EventBus }} [options]
   */
  constructor(options = {}) {
    this.storageKey = options.storageKey || SAVE_KEY;
    this.bus = options.eventBus || defaultEventBus;
    this._memoryStore = new Map();
    this._explicitStorage = 'storage' in options ? options.storage : undefined;
    this.usingMemoryFallback = false;
    this.lastLoadRecovered = false;
    this.lastRecoveryReason = null;
    this._storage = this._resolveStorage();
    this._data = this.load();
  }

  /** Detect working storage via a read/write probe; degrade gracefully on Safari/iFrame errors. */
  _resolveStorage() {
    const candidate =
      this._explicitStorage !== undefined
        ? this._explicitStorage
        : (() => {
            try {
              return globalThis.localStorage ?? null;
            } catch {
              return null;
            }
          })();

    if (!candidate || typeof candidate.getItem !== 'function' || typeof candidate.setItem !== 'function') {
      this._activateFallback('storage-unavailable');
      return null;
    }

    const probeKey = `${this.storageKey}__probe`;
    try {
      candidate.setItem(probeKey, '1');
      if (candidate.getItem(probeKey) !== '1') {
        this._activateFallback('storage-probe-mismatch');
        return null;
      }
      candidate.removeItem?.(probeKey);
      this.usingMemoryFallback = false;
      return candidate;
    } catch (error) {
      this._activateFallback(error?.name || 'storage-blocked');
      return null;
    }
  }

  _activateFallback(reason) {
    if (!this.usingMemoryFallback) {
      this.usingMemoryFallback = true;
      this.bus.emit(EVENTS.SAVE_FALLBACK, { reason });
    }
  }

  _readRaw() {
    if (this.usingMemoryFallback || !this._storage) {
      return this._memoryStore.get(this.storageKey) ?? null;
    }
    try {
      return this._storage.getItem(this.storageKey);
    } catch (error) {
      this._activateFallback(error?.name || 'storage-read-error');
      return this._memoryStore.get(this.storageKey) ?? null;
    }
  }

  _writeRaw(serialized) {
    this._memoryStore.set(this.storageKey, serialized);
    if (this.usingMemoryFallback || !this._storage) return true;
    try {
      this._storage.setItem(this.storageKey, serialized);
      return true;
    } catch (error) {
      this._activateFallback(error?.name || 'storage-write-error');
      return false;
    }
  }

  /** Migrate legacy/unversioned payloads to current SCHEMA_VERSION before sanitization. */
  migrate(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return createDefaultSave();
    }
    const ver = Number(raw.schemaVersion || 0);
    if (ver === SCHEMA_VERSION) return raw;

    // Migrate unversioned v0 payloads smoothly to SCHEMA_VERSION.
    const next = { ...raw, schemaVersion: SCHEMA_VERSION };
    if (raw.settings?.quality && !raw.settings?.graphicsQuality) {
      const legacyQ = raw.settings.quality === 'ultra' ? 'high' : raw.settings.quality;
      next.settings = { ...raw.settings, graphicsQuality: legacyQ };
    }
    return next;
  }

  /** Normalize every field to strict bounds; recovers cleanly from malformed types. */
  _validMissionState(state) {
    if (!state || state.version !== 1 || !['INTRO','ACTIVE'].includes(state.state)) return false;
    if (!Number.isFinite(state.remainingTimeSec) || state.remainingTimeSec <= 0 || state.remainingTimeSec > 3600) return false;
    try {
      let valid = true;
      const json = JSON.stringify(state, (key, value) => {
        if (['__proto__','prototype','constructor'].includes(key) || (typeof value === 'number' && !Number.isFinite(value))) valid = false;
        return value;
      });
      return valid && json.length < 50000;
    } catch { return false; }
  }

  setLastMission(id, state) {
    if (id === null) return this.save({lastMissionId:null,lastMissionState:null});
    if (!VALID_MISSION_SET.has(id) || !this._validMissionState(state)) return false;
    return this.save({lastMissionId:id,lastMissionState:clone(state)});
  }

  getLastMission() {
    return this._data.lastMissionId ? {id:this._data.lastMissionId,state:clone(this._data.lastMissionState)} : null;
  }

  sanitize(raw) {
    const out = createDefaultSave();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;

    const src = this.migrate(raw);
    out.schemaVersion = SCHEMA_VERSION;
    out.cash = clampInt(src.cash, 0, 999999999, out.cash);

    if (VALID_MISSION_SET.has(src.lastMissionId) && this._validMissionState(src.lastMissionState)) {
      out.lastMissionId = src.lastMissionId;
      out.lastMissionState = clone(src.lastMissionState);
    }
    // Unlocked vehicles (always guarantee starters + valid unique IDs)
    const rawCars = Array.isArray(src.unlockedVehicles?.cars) ? src.unlockedVehicles.cars : [];
    const rawBikes = Array.isArray(src.unlockedVehicles?.bikes) ? src.unlockedVehicles.bikes : [];
    const cars = [...new Set([...STARTER_CARS, ...rawCars].filter((id) => VALID_CAR_SET.has(id)))];
    const bikes = [...new Set([...STARTER_BIKES, ...rawBikes].filter((id) => VALID_BIKE_SET.has(id)))];
    out.unlockedVehicles = { cars, bikes };

    const allUnlocked = new Set([...cars, ...bikes]);
    out.selectedVehicle =
      typeof src.selectedVehicle === 'string' && allUnlocked.has(src.selectedVehicle)
        ? src.selectedVehicle
        : 'C01';

    // Vehicle customizations per car/bike
    if (src.customizations && typeof src.customizations === 'object' && !Array.isArray(src.customizations)) {
      for (const [vehId, cfg] of Object.entries(src.customizations)) {
        if (!VALID_CAR_SET.has(vehId) && !VALID_BIKE_SET.has(vehId)) continue;
        if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) continue;
        out.customizations[vehId] = {
          paint: typeof cfg.paint === 'string' && HEX_COLOR_RE.test(cfg.paint) ? cfg.paint.toLowerCase() : '#00f0ff',
          neon: VALID_NEON_SET.has(cfg.neon) ? cfg.neon : 'off',
          turboLv: clampInt(cfg.turboLv, 0, 3, 0),
          handlingLv: clampInt(cfg.handlingLv, 0, 3, 0)
        };
      }
    }

    // Completed missions & 1-3 star ratings
    const rawCompleted = Array.isArray(src.completedMissions) ? src.completedMissions : [];
    const completedSet = new Set(rawCompleted.filter((id) => VALID_MISSION_SET.has(id)));

    if (src.starRatings && typeof src.starRatings === 'object' && !Array.isArray(src.starRatings)) {
      for (const [mId, stars] of Object.entries(src.starRatings)) {
        if (!VALID_MISSION_SET.has(mId)) continue;
        const s = clampInt(stars, 1, 3, 0);
        if (s >= 1) {
          out.starRatings[mId] = s;
          completedSet.add(mId);
        }
      }
    }
    out.completedMissions = [...completedSet].sort((a, b) => missionNum(a) - missionNum(b));
    out.city2Unlocked = !!src.city2Unlocked || completedSet.has('M20');

    // Settings
    const s = src.settings && typeof src.settings === 'object' ? src.settings : {};
    out.settings = {
      graphicsQuality: VALID_QUALITIES.includes(s.graphicsQuality) ? s.graphicsQuality : 'low',
      language: VALID_LANGUAGES.includes(s.language) ? s.language : 'en',
      steerMode: s.steerMode === 'buttons' ? 'buttons' : 'joystick',
      hudOpacity: VALID_HUD_OPACITIES.includes(s.hudOpacity) ? s.hudOpacity : 'glass',
      fpsCap: Number(s.fpsCap) === 30 ? 30 : 60,
      masterVolume: clampFloat(s.masterVolume, 0, 1, 1),
      sfxVolume: clampFloat(s.sfxVolume, 0, 1, 0.7),
      musicVolume: clampFloat(s.musicVolume, 0, 1, 0.35),
      muted: !!s.muted,
      haptics: s.haptics !== false
    };

    // Daily streak
    const d = src.dailyStreak && typeof src.dailyStreak === 'object' ? src.dailyStreak : {};
    const count = clampInt(d.count, 0, 9999, 0);
    out.dailyStreak = {
      count,
      lastClaimDate: typeof d.lastClaimDate === 'string' && ISO_DATE_RE.test(d.lastClaimDate) ? d.lastClaimDate : null,
      bestStreak: Math.max(count, clampInt(d.bestStreak, 0, 9999, 0)),
      completedToday: !!d.completedToday
    };

    // Stats & anti-rage-quit counters
    const st = src.stats && typeof src.stats === 'object' ? src.stats : {};
    const fails = {};
    if (st.consecutiveFails && typeof st.consecutiveFails === 'object' && !Array.isArray(st.consecutiveFails)) {
      for (const [mId, n] of Object.entries(st.consecutiveFails)) {
        if (VALID_MISSION_SET.has(mId)) fails[mId] = clampInt(n, 0, 99, 0);
      }
    }
    out.stats = {
      totalDriftMeters: clampInt(st.totalDriftMeters, 0, 1e9, 0),
      totalJumps: clampInt(st.totalJumps, 0, 1e9, 0),
      highestWantedCleared: clampInt(st.highestWantedCleared, 0, 5, 0),
      consecutiveFails: fails
    };

    // Monetization
    const mon = src.monetization && typeof src.monetization === 'object' ? src.monetization : {};
    out.monetization = {
      removeAds: !!mon.removeAds,
      unlockAllVehicles: !!mon.unlockAllVehicles,
      missionsSinceInterstitial: clampInt(mon.missionsSinceInterstitial, 0, 99, 0)
    };

    // Retention (Daily tasks, 7-day skin, Challenge modes, Easter eggs, Side hustles)
    const ret = src.retention && typeof src.retention === 'object' ? src.retention : {};
    const sanitizeIdList = (arr, limit = 64) => (
      Array.isArray(arr)
        ? [...new Set(arr.filter((v) => typeof v === 'string' && v.trim().length > 0).map((v) => v.trim()))].slice(0, limit)
        : []
    );
    out.retention = {
      streakSkinUnlocked: !!ret.streakSkinUnlocked || out.dailyStreak.count >= 7,
      dailyDate: typeof ret.dailyDate === 'string' && ISO_DATE_RE.test(ret.dailyDate) ? ret.dailyDate : null,
      dailyCompletedIds: sanitizeIdList(ret.dailyCompletedIds, 12),
      completedChallenges: sanitizeIdList(ret.completedChallenges, 32),
      discoveredSecrets: sanitizeIdList(ret.discoveredSecrets, 32),
      hustlesCompleted: clampInt(ret.hustlesCompleted, 0, 999999, 0)
    };

    // V2.0 serialized vehicle state hook
    if (src.vehicleState && typeof src.vehicleState === 'object' && !Array.isArray(src.vehicleState)) {
      const vs = src.vehicleState;
      const posOk = ['x', 'y', 'z'].every((k) => Number.isFinite(Number(vs.position?.[k])));
      const yawOk = Number.isFinite(Number(vs.yaw));
      if (posOk && yawOk) {
        out.vehicleState = {
          id: VALID_CAR_SET.has(vs.id) || VALID_BIKE_SET.has(vs.id) ? vs.id : out.selectedVehicle,
          position: { x: Number(vs.position.x), y: Number(vs.position.y), z: Number(vs.position.z) },
          yaw: Number(vs.yaw),
          speed: Number.isFinite(Number(vs.speed)) ? Number(vs.speed) : 0,
          hp: clampFloat(vs.hp, 0, 100, 100)
        };
      }
    }

    return out;
  }

  /** Load, parse, migrate, and recover from any corruption safely. */
  load() {
    this.lastLoadRecovered = false;
    this.lastRecoveryReason = null;
    const rawText = this._readRaw();

    if (rawText === null || rawText === undefined || rawText === '') {
      const fresh = createDefaultSave();
      this._data = fresh;
      this._writeRaw(JSON.stringify(fresh));
      this.bus.emit(EVENTS.SAVE_LOADED, { data: this.getData(), recovered: false });
      return this.getData();
    }

    let parsed;
    try {
      parsed = typeof rawText === 'string' ? JSON.parse(rawText) : rawText;
    } catch (error) {
      return this._recoverFromCorruption('corrupt-json', error?.message);
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return this._recoverFromCorruption('invalid-root-type', typeof parsed);
    }

    const sanitized = this.sanitize(parsed);
    const hadMissingSchema = Number(parsed.schemaVersion) !== SCHEMA_VERSION;
    this._data = sanitized;
    if (hadMissingSchema) this._writeRaw(JSON.stringify(sanitized));
    this.bus.emit(EVENTS.SAVE_LOADED, { data: this.getData(), recovered: false });
    return this.getData();
  }

  _recoverFromCorruption(reason, detail) {
    const fresh = createDefaultSave();
    this._data = fresh;
    this.lastLoadRecovered = true;
    this.lastRecoveryReason = reason;
    this._writeRaw(JSON.stringify(fresh));
    this.bus.emit(EVENTS.SAVE_RECOVERED, { reason, detail });
    this.bus.emit(EVENTS.SAVE_LOADED, { data: this.getData(), recovered: true });
    return this.getData();
  }

  /** Merge an optional patch, sanitize, and persist immediately. */
  save(patch = null) {
    const merged = patch && typeof patch === 'object' ? { ...this._data, ...patch } : this._data;
    this._data = this.sanitize(merged);
    const persistedToStorage = this._writeRaw(JSON.stringify(this._data));
    this.bus.emit(EVENTS.SAVE_WRITTEN, {
      persistedToStorage,
      usingMemoryFallback: this.usingMemoryFallback,
      data: this.getData()
    });
    return this.getData();
  }

  /** Return a defensive clone of current save state. */
  getData() {
    return clone(this._data);
  }

  /** Reset progression to clean defaults (optionally preserving settings). */
  reset(preserveSettings = false) {
    const fresh = createDefaultSave();
    if (preserveSettings && this._data?.settings) fresh.settings = clone(this._data.settings);
    this._data = fresh;
    this._writeRaw(JSON.stringify(fresh));
    return this.getData();
  }

  addCash(amount) {
    const delta = Math.max(0, Math.floor(Number(amount) || 0));
    this._data.cash = clampInt(this._data.cash + delta, 0, 999999999, this._data.cash);
    return this.save().cash;
  }

  spendCash(amount) {
    const cost = Math.max(0, Math.floor(Number(amount) || 0));
    if (this._data.cash < cost) return false;
    this._data.cash -= cost;
    this.save();
    return true;
  }

  unlockVehicle(id) {
    if (VALID_CAR_SET.has(id)) {
      if (!this._data.unlockedVehicles.cars.includes(id)) this._data.unlockedVehicles.cars.push(id);
      this.save();
      return true;
    }
    if (VALID_BIKE_SET.has(id)) {
      if (!this._data.unlockedVehicles.bikes.includes(id)) this._data.unlockedVehicles.bikes.push(id);
      this.save();
      return true;
    }
    return false;
  }

  setCustomization(vehicleId, patch) {
    if (!VALID_CAR_SET.has(vehicleId) && !VALID_BIKE_SET.has(vehicleId)) return null;
    const prev = this._data.customizations[vehicleId] || { paint: '#00f0ff', neon: 'off', turboLv: 0, handlingLv: 0 };
    this._data.customizations[vehicleId] = { ...prev, ...patch };
    return this.save().customizations[vehicleId];
  }

  recordMissionResult(missionId, stars = 1, cashReward = 0) {
    if (!VALID_MISSION_SET.has(missionId)) return null;
    const clampedStars = clampInt(stars, 1, 3, 1);
    const prevBest = this._data.starRatings[missionId] || 0;
    this._data.starRatings[missionId] = Math.max(prevBest, clampedStars);
    if (!this._data.completedMissions.includes(missionId)) this._data.completedMissions.push(missionId);
    if (missionId === 'M20') this._data.city2Unlocked = true;
    this._data.stats.consecutiveFails[missionId] = 0;
    this._data.cash += Math.max(0, Math.floor(Number(cashReward) || 0));
    return this.save();
  }

  setGraphicsQuality(quality) {
    if (!VALID_QUALITIES.includes(quality)) return false;
    this._data.settings.graphicsQuality = quality;
    this.save();
    return true;
  }

  setLanguage(language) {
    if (!VALID_LANGUAGES.includes(language)) return false;
    this._data.settings.language = language;
    this.save();
    return true;
  }

  setSteerMode(mode) {
    const clean = mode === 'buttons' ? 'buttons' : 'joystick';
    this._data.settings.steerMode = clean;
    this.save();
    return clean;
  }

  setHudOpacity(mode) {
    const clean = VALID_HUD_OPACITIES.includes(mode) ? mode : 'glass';
    this._data.settings.hudOpacity = clean;
    this.save();
    return clean;
  }

  claimDailyStreak(isoDate) {
    if (typeof isoDate !== 'string' || !ISO_DATE_RE.test(isoDate)) return this._data.dailyStreak;
    const prev = this._data.dailyStreak.lastClaimDate;
    if (prev === isoDate) return this._data.dailyStreak;
    let nextCount = 1;
    if (prev) {
      const diffDays = Math.round((Date.parse(isoDate) - Date.parse(prev)) / 86400000);
      if (diffDays === 1) nextCount = this._data.dailyStreak.count + 1;
    }
    this._data.dailyStreak.count = nextCount;
    this._data.dailyStreak.lastClaimDate = isoDate;
    this._data.dailyStreak.bestStreak = Math.max(this._data.dailyStreak.bestStreak, nextCount);
    this._data.dailyStreak.completedToday = true;
    if (nextCount >= 7) {
      this._data.retention = this._data.retention || {};
      this._data.retention.streakSkinUnlocked = true;
    }
    return this.save().dailyStreak;
  }

  recordChallengeComplete(challengeId, cashReward = 0) {
    if (typeof challengeId !== 'string' || !challengeId.trim()) return null;
    const id = challengeId.trim();
    const list = this._data.retention?.completedChallenges || [];
    if (!list.includes(id)) list.push(id);
    this._data.retention = { ...this._data.retention, completedChallenges: list };
    this._data.cash += Math.max(0, Math.floor(Number(cashReward) || 0));
    return this.save();
  }

  recordSecretDiscovered(secretId, cashReward = 0) {
    if (typeof secretId !== 'string' || !secretId.trim()) return null;
    const id = secretId.trim();
    const list = this._data.retention?.discoveredSecrets || [];
    const firstTime = !list.includes(id);
    if (firstTime) list.push(id);
    this._data.retention = { ...this._data.retention, discoveredSecrets: list };
    if (firstTime) this._data.cash += Math.max(0, Math.floor(Number(cashReward) || 0));
    return this.save();
  }

  recordHustleComplete(cashReward = 0) {
    const prev = Number(this._data.retention?.hustlesCompleted || 0);
    this._data.retention = { ...this._data.retention, hustlesCompleted: prev + 1 };
    this._data.cash += Math.max(0, Math.floor(Number(cashReward) || 0));
    return this.save();
  }

  /** V2.0 decoupled vehicle state snapshot helper. */
  serializeVehicleState(state) {
    return this.save({ vehicleState: state }).vehicleState;
  }
}

export const saveManager = new SaveManager();
export default saveManager;
