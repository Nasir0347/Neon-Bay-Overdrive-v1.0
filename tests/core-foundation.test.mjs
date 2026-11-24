import test from 'node:test';
import assert from 'node:assert/strict';

import { EventBus, EVENTS } from '../src/core/EventBus.js';
import {
  SaveManager,
  SAVE_KEY,
  SCHEMA_VERSION,
  STARTER_CARS,
  STARTER_BIKES
} from '../src/core/SaveManager.js';
import { GameState, STATES, VALID_TRANSITIONS } from '../src/core/GameState.js';

function makeMockStorage(seed = {}, opts = {}) {
  const store = new Map(Object.entries(seed));
  return {
    getItem(k) {
      if (opts.throwOnGet) throw new DOMException('Blocked', 'SecurityError');
      return store.has(k) ? store.get(k) : null;
    },
    setItem(k, v) {
      if (opts.throwOnProbe || opts.throwOnSet) {
        const err = new DOMException('Quota exceeded', opts.errorName || 'QuotaExceededError');
        throw err;
      }
      store.set(k, String(v));
    },
    removeItem(k) {
      store.delete(k);
    },
    dump: () => store
  };
}

// ============================================================================
// 1. EventBus Tests
// ============================================================================
test('EventBus: on, emit order, off & unsubscribe closure', () => {
  const bus = new EventBus();
  const seen = [];
  const ctx = { tag: 'police' };

  const unsub1 = bus.on(EVENTS.POLICE_WANTED_CHANGE, function (p) {
    seen.push(`${this.tag}:${p.stars}`);
  }, ctx);
  const fn2 = (p) => seen.push(`hud:${p.stars}`);
  bus.on(EVENTS.POLICE_WANTED_CHANGE, fn2);

  assert.equal(bus.listenerCount(EVENTS.POLICE_WANTED_CHANGE), 2);
  const invoked1 = bus.emit(EVENTS.POLICE_WANTED_CHANGE, { stars: 3 });
  assert.equal(invoked1, 2);
  assert.deepEqual(seen, ['police:3', 'hud:3']);

  // Off via returned closure & explicit off(event, fn)
  unsub1();
  assert.equal(bus.listenerCount(EVENTS.POLICE_WANTED_CHANGE), 1);
  bus.off(EVENTS.POLICE_WANTED_CHANGE, fn2);
  assert.equal(bus.listenerCount(EVENTS.POLICE_WANTED_CHANGE), 0);
  assert.deepEqual(bus.eventNames(), []);
  assert.equal(bus.emit(EVENTS.POLICE_WANTED_CHANGE, { stars: 4 }), 0);
});

test('EventBus: once executes only once, survives re-entrant emit & pre-fire off', () => {
  const bus = new EventBus();
  let calls = 0;

  bus.once(EVENTS.MISSION_COMPLETE, (p) => {
    calls++;
    if (p.reenter) bus.emit(EVENTS.MISSION_COMPLETE, { reenter: false });
  });
  // Emitting with reenter:true triggers emit inside callback; handler must NOT fire twice.
  bus.emit(EVENTS.MISSION_COMPLETE, { reenter: true });
  assert.equal(calls, 1);
  assert.equal(bus.listenerCount(EVENTS.MISSION_COMPLETE), 0);

  // Explicit off before firing cancels once cleanly
  let cancelledCalls = 0;
  const cancelledFn = () => { cancelledCalls++; };
  bus.once(EVENTS.AUDIO_SFX, cancelledFn);
  bus.off(EVENTS.AUDIO_SFX, cancelledFn);
  bus.emit(EVENTS.AUDIO_SFX, { sfx: 'nos' });
  assert.equal(cancelledCalls, 0);
});

test('EventBus: mid-emit unsubscribe & listener error isolation', () => {
  const errors = [];
  const bus = new EventBus({ onError: (e, ev) => errors.push(`${ev}:${e.message}`) });
  const hits = [];
  let unsubSelf = () => {};

  unsubSelf = bus.on('physics:tick', () => {
    hits.push('first');
    unsubSelf();
  });
  bus.on('physics:tick', () => {
    throw new Error('boom');
  });
  bus.on('physics:tick', () => {
    hits.push('third');
  });

  const count = bus.emit('physics:tick', { dt: 0.016 });
  assert.equal(count, 3);
  assert.deepEqual(hits, ['first', 'third']);
  assert.deepEqual(errors, ['physics:tick:boom']);
  assert.equal(bus.listenerCount('physics:tick'), 2);

  bus.clear();
  assert.equal(bus.listenerCount(), 0);
});

// ============================================================================
// 2. SaveManager Tests
// ============================================================================
test('SaveManager: defaults, save/load round-trip & full field persistence', () => {
  const bus = new EventBus();
  const storage = makeMockStorage();
  const sm = new SaveManager({ storage, eventBus: bus });

  assert.equal(sm.usingMemoryFallback, false);
  const init = sm.getData();
  assert.equal(init.schemaVersion, SCHEMA_VERSION);
  assert.equal(init.cash, 500);
  assert.deepEqual(init.unlockedVehicles.cars, [...STARTER_CARS]);
  assert.deepEqual(init.unlockedVehicles.bikes, [...STARTER_BIKES]);

  sm.addCash(2500);
  assert.equal(sm.spendCash(10000), false);
  assert.equal(sm.spendCash(500), true);
  assert.equal(sm.unlockVehicle('C10'), true);
  assert.equal(sm.unlockVehicle('B03'), true);
  assert.equal(sm.unlockVehicle('UNKNOWN'), false);
  sm.setCustomization('C10', { paint: '#ff007f', neon: 'cyan', turboLv: 3, handlingLv: 2 });
  sm.recordMissionResult('M1', 2, 800);
  sm.recordMissionResult('M1', 3, 0); // Best stars preserved (max(2,3) === 3)
  sm.recordMissionResult('M1', 1, 0); // Lower score must not downgrade 3 -> 1
  sm.recordMissionResult('M20', 3, 5000);
  sm.setGraphicsQuality('high');
  sm.setLanguage('ar');
  sm.claimDailyStreak('2026-11-22');
  sm.claimDailyStreak('2026-11-23');
  sm.serializeVehicleState({ id: 'C10', position: { x: 10, y: 0, z: -45 }, yaw: 1.5, speed: 42, hp: 94 });

  // Reload fresh SaveManager instance against same storage
  const sm2 = new SaveManager({ storage, eventBus: new EventBus() });
  const reloaded = sm2.getData();
  assert.equal(reloaded.cash, 2500 + 500 - 500 + 800 + 5000); // 8300
  assert.ok(reloaded.unlockedVehicles.cars.includes('C10'));
  assert.ok(reloaded.unlockedVehicles.bikes.includes('B03'));
  assert.deepEqual(reloaded.customizations.C10, { paint: '#ff007f', neon: 'cyan', turboLv: 3, handlingLv: 2 });
  assert.deepEqual(reloaded.completedMissions, ['M1', 'M20']);
  assert.equal(reloaded.starRatings.M1, 3);
  assert.equal(reloaded.starRatings.M20, 3);
  assert.equal(reloaded.city2Unlocked, true);
  assert.equal(reloaded.settings.graphicsQuality, 'high');
  assert.equal(reloaded.settings.language, 'ar');
  assert.equal(reloaded.dailyStreak.count, 2);
  assert.equal(reloaded.dailyStreak.bestStreak, 2);
  assert.equal(reloaded.dailyStreak.lastClaimDate, '2026-11-23');
  assert.equal(reloaded.vehicleState.id, 'C10');
});

test('SaveManager: recovers cleanly from corrupt JSON, non-object JSON & malformed fields', () => {
  const bus = new EventBus();
  const recoveredEvents = [];
  bus.on(EVENTS.SAVE_RECOVERED, (e) => recoveredEvents.push(e));

  // 1) SyntaxError corrupt JSON string
  const corruptStorage = makeMockStorage({ [SAVE_KEY]: '{"cash":500,"broken":' });
  const smCorrupt = new SaveManager({ storage: corruptStorage, eventBus: bus });
  assert.equal(smCorrupt.lastLoadRecovered, true);
  assert.equal(smCorrupt.lastRecoveryReason, 'corrupt-json');
  assert.equal(recoveredEvents.length, 1);
  assert.equal(smCorrupt.getData().cash, 500);
  assert.equal(JSON.parse(corruptStorage.dump().get(SAVE_KEY)).schemaVersion, SCHEMA_VERSION);

  // 2) Wrong JSON root type (Array / number)
  const arrayStorage = makeMockStorage({ [SAVE_KEY]: '[1,2,3]' });
  const smArray = new SaveManager({ storage: arrayStorage, eventBus: bus });
  assert.equal(smArray.lastLoadRecovered, true);
  assert.equal(smArray.lastRecoveryReason, 'invalid-root-type');

  // 3) Out-of-range / corrupted nested values sanitize without crash & preserve valid parts
  const wildStorage = makeMockStorage({
    [SAVE_KEY]: JSON.stringify({
      cash: -9999,
      unlockedVehicles: { cars: ['FAKE', 'C05'], bikes: 'bad' },
      selectedVehicle: 'INVALID_CAR',
      customizations: { C05: { paint: 'not-hex', neon: 'ultraviolet', turboLv: 99, handlingLv: -4 } },
      completedMissions: ['M99', 'M3'],
      starRatings: { M3: 9, M2: 'NaN' },
      settings: { graphicsQuality: 'potato', language: 'xx', fpsCap: 999 },
      dailyStreak: { count: -3, lastClaimDate: 'bad-date' }
    })
  });
  const smSan = new SaveManager({ storage: wildStorage, eventBus: bus });
  const d = smSan.getData();
  assert.equal(d.schemaVersion, SCHEMA_VERSION);
  assert.equal(d.cash, 0); // negative finite number clamps safely to 0 floor
  assert.deepEqual(d.unlockedVehicles.cars, ['C01', 'C02', 'C05']);
  assert.deepEqual(d.unlockedVehicles.bikes, ['B01']);
  assert.equal(d.selectedVehicle, 'C01');
  assert.deepEqual(d.customizations.C05, { paint: '#00f0ff', neon: 'off', turboLv: 3, handlingLv: 0 });
  assert.deepEqual(d.completedMissions, ['M3']);
  assert.equal(d.starRatings.M3, 3);
  assert.equal(d.settings.graphicsQuality, 'low');
  assert.equal(d.settings.language, 'en');
  assert.equal(d.settings.fpsCap, 60);
  assert.equal(d.dailyStreak.lastClaimDate, null);
});

test('SaveManager: clamps negative cash to 0 & activates in-memory fallback when localStorage is blocked', () => {
  const wildNeg = new SaveManager({
    storage: makeMockStorage({ [SAVE_KEY]: JSON.stringify({ schemaVersion: 1, cash: -250 }) }),
    eventBus: new EventBus()
  });
  assert.equal(wildNeg.getData().cash, 0);

  // Blocked localStorage (Safari Private Mode / sandboxed cross-origin iframe)
  const bus = new EventBus();
  const fallbackEvents = [];
  bus.on(EVENTS.SAVE_FALLBACK, (e) => fallbackEvents.push(e));
  const blocked = makeMockStorage({}, { throwOnProbe: true, errorName: 'SecurityError' });
  const sm = new SaveManager({ storage: blocked, eventBus: bus });

  assert.equal(sm.usingMemoryFallback, true);
  assert.equal(fallbackEvents.length, 1);
  sm.addCash(1200);
  sm.setLanguage('es');
  assert.equal(sm.getData().cash, 1700);
  assert.equal(sm.getData().settings.language, 'es');
  // Reload from same SaveManager instance still works via internal in-memory store
  assert.equal(sm.load().cash, 1700);

  // Mid-session QuotaExceededError fallback works seamlessly too
  let failWrite = false;
  const quotaStorage = {
    store: new Map(),
    getItem(k) { return this.store.get(k) ?? null; },
    setItem(k, v) {
      if (failWrite) throw new DOMException('Full', 'QuotaExceededError');
      this.store.set(k, v);
    },
    removeItem(k) { this.store.delete(k); }
  };
  const smQuota = new SaveManager({ storage: quotaStorage, eventBus: new EventBus() });
  failWrite = true;
  smQuota.addCash(300);
  assert.equal(smQuota.usingMemoryFallback, true);
  assert.equal(smQuota.getData().cash, 800);
});

// ============================================================================
// 3. GameState Tests
// ============================================================================
test('GameState: valid full lifecycle across all 6 states + EventBus notifications', () => {
  const bus = new EventBus();
  const changes = [];
  bus.on(EVENTS.STATE_CHANGE, (e) => changes.push(`${e.from}->${e.to}`));

  const gs = new GameState({ eventBus: bus });
  assert.equal(gs.getState(), STATES.LOADING);
  assert.equal(gs.isGameplayRunning(), false);

  assert.equal(gs.transition(STATES.FREE_ROAM), true);
  assert.equal(gs.is(STATES.FREE_ROAM), true);
  assert.equal(gs.isGameplayRunning(), true);

  assert.equal(gs.transition(STATES.GARAGE), true);
  assert.equal(gs.isGameplayRunning(), false);
  assert.equal(gs.enterPhotoMode({ source: 'garage' }), true);
  assert.equal(gs.exitPhotoMode(), true);
  assert.equal(gs.getState(), STATES.GARAGE);

  assert.equal(gs.transition(STATES.FREE_ROAM), true);
  assert.equal(gs.transition(STATES.MISSION_ACTIVE, { mission: 'M1' }), true);
  assert.equal(gs.isGameplayRunning(), true);

  assert.equal(gs.pause(), true);
  assert.equal(gs.getState(), STATES.PAUSED);
  assert.equal(gs.isGameplayRunning(), false);
  assert.equal(gs.resume(), true);
  assert.equal(gs.getState(), STATES.MISSION_ACTIVE);

  assert.equal(gs.enterPhotoMode(), true);
  assert.equal(gs.exitPhotoMode(), true);
  assert.equal(gs.getState(), STATES.MISSION_ACTIVE);

  assert.equal(gs.transition(STATES.FREE_ROAM), true);
  assert.deepEqual(changes, [
    'LOADING->FREE_ROAM',
    'FREE_ROAM->GARAGE',
    'GARAGE->PHOTO_MODE',
    'PHOTO_MODE->GARAGE',
    'GARAGE->FREE_ROAM',
    'FREE_ROAM->MISSION_ACTIVE',
    'MISSION_ACTIVE->PAUSED',
    'PAUSED->MISSION_ACTIVE',
    'MISSION_ACTIVE->PHOTO_MODE',
    'PHOTO_MODE->MISSION_ACTIVE',
    'MISSION_ACTIVE->FREE_ROAM'
  ]);
  assert.ok(Object.keys(VALID_TRANSITIONS).length === 6);
});

test('GameState: invalid transition guards reject cleanly without mutating state', () => {
  const bus = new EventBus();
  const rejections = [];
  bus.on(EVENTS.STATE_REJECTED, (e) => rejections.push(e));

  const gs = new GameState({ eventBus: bus, strict: false });

  // From LOADING, only FREE_ROAM is valid
  for (const bad of [STATES.MISSION_ACTIVE, STATES.PAUSED, STATES.GARAGE, STATES.PHOTO_MODE, STATES.LOADING, 'UNKNOWN']) {
    assert.equal(gs.transition(bad), false, `LOADING -> ${bad} must be rejected`);
    assert.equal(gs.getState(), STATES.LOADING);
  }

  gs.transition(STATES.FREE_ROAM);
  // Cannot jump back to LOADING or same state
  assert.equal(gs.transition(STATES.LOADING), false);
  assert.equal(gs.transition(STATES.FREE_ROAM), false);

  // MISSION_ACTIVE cannot enter GARAGE directly
  gs.transition(STATES.MISSION_ACTIVE);
  assert.equal(gs.canTransition(STATES.GARAGE), false);
  assert.equal(gs.transition(STATES.GARAGE), false);
  assert.equal(gs.getState(), STATES.MISSION_ACTIVE);

  // PAUSED from MISSION_ACTIVE cannot resume into GARAGE; PHOTO_MODE from GARAGE cannot exit into MISSION_ACTIVE
  gs.pause();
  assert.equal(gs.transition(STATES.GARAGE), false);
  assert.equal(gs.getState(), STATES.PAUSED);
  gs.resume();
  gs.transition(STATES.FREE_ROAM);

  gs.pause(); // paused from FREE_ROAM
  assert.equal(gs.transition(STATES.MISSION_ACTIVE), false);
  assert.equal(gs.transition(STATES.GARAGE), false);
  gs.resume();

  gs.transition(STATES.GARAGE);
  assert.equal(gs.transition(STATES.MISSION_ACTIVE), false);
  gs.enterPhotoMode();
  assert.equal(gs.transition(STATES.FREE_ROAM), false);
  assert.equal(gs.transition(STATES.MISSION_ACTIVE), false);
  assert.equal(gs.getState(), STATES.PHOTO_MODE);
  assert.equal(gs.exitPhotoMode(), true);
  assert.equal(gs.getState(), STATES.GARAGE);

  // Strict mode throws descriptive Error on illegal transition
  const strictGs = new GameState({ eventBus: new EventBus(), strict: true });
  assert.throws(() => strictGs.transition(STATES.GARAGE), /Invalid GameState transition LOADING -> GARAGE/);
  assert.ok(rejections.length >= 12);
});
