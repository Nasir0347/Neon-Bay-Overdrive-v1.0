import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { EventBus } from '../src/core/EventBus.js';
import { SaveManager } from '../src/core/SaveManager.js';
import { GameState, STATES } from '../src/core/GameState.js';
import { VEHICLE_ROSTER } from '../src/garage/GarageManager.js';
import {
  PLAYABLE_BOUNDS,
  ACT_1_MISSIONS,
  ACT_2_MISSIONS,
  STORY_MISSIONS,
  validateMissionSchema,
  isPointInPlayableBounds
} from '../src/missions/missionsConfig.js';
import {
  MISSION_STATES,
  ASSIST_FAIL_THRESHOLD,
  ASSIST_BONUS_TIME_SEC,
  ASSIST_POLICE_AGGRESSION_MULT,
  MissionManager
} from '../src/missions/MissionManager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function makeMockStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k)
  };
}

function createHarness(callbacks = {}) {
  const bus = new EventBus();
  const saveManager = new SaveManager({ storage: makeMockStorage(), eventBus: bus });
  const gameState = new GameState({ eventBus: bus });
  gameState.transition(STATES.FREE_ROAM);
  const manager = new MissionManager({
    missions: STORY_MISSIONS,
    saveManager,
    gameState,
    eventBus: bus,
    doc: null,
    callbacks
  });
  return { bus, saveManager, gameState, manager };
}

describe('Missions Config Schema (Act 1-4 M1-M20)', () => {
  it('defines Act 1 & Act 2 plus full 20 story missions cleanly with valid coordinates, timers, dialogues, and vehicles', () => {
    assert.equal(ACT_1_MISSIONS.length, 5);
    assert.equal(ACT_2_MISSIONS.length, 5);
    assert.equal(STORY_MISSIONS.length, 20);

    const catalogIds = new Set(VEHICLE_ROSTER.map((v) => v.id));
    const expectedTimers = [60, 75, 60, 90, 90, 90, 75, 90, 80, 120, 90, 75, 120, 90, 120, 120, 120, 90, 150, 150];

    STORY_MISSIONS.forEach((m, idx) => {
      const check = validateMissionSchema(m);
      assert.equal(check.valid, true, `${m.id} schema errors: ${check.errors.join(', ')}`);
      assert.equal(m.id, `M${idx + 1}`);
      assert.equal(m.number, idx + 1);
      assert.equal(m.timeLimitSec, expectedTimers[idx]);
      assert.ok(catalogIds.has(m.vehicleId), `${m.id} vehicleId ${m.vehicleId} must exist in Garage catalog`);
      assert.equal(m.dialogue.length, 2, `${m.id} must have 2-line radio dialogue`);
      assert.ok(m.rewardCash >= 600, `${m.id} must grant cash reward`);
      for (const cp of m.checkpoints) {
        assert.ok(isPointInPlayableBounds(cp), `${m.id} checkpoint ${cp.id} within playable bounds`);
      }
    });
  });

  it('contains zero TODO placeholders and zero copyrighted brand names in src/missions/', () => {
    const banned = /\b(grand theft auto|vice city|rockstar|lamborghini|ferrari|bmw|lucia|jason)\b|\bgta\b/i;
    const todoRe = /\/\/\s*TODO|\/\*\s*TODO/i;
    for (const file of ['missionsConfig.js', 'MissionManager.js', 'DailyMissions.js', 'ChallengeModes.js', 'SideHustles.js', 'missions-runtime-wiring.js']) {
      const content = fs.readFileSync(path.join(rootDir, 'src', 'missions', file), 'utf8');
      assert.equal(todoRe.test(content), false, `${file} must have zero TODO placeholders`);
      assert.equal(banned.test(content), false, `${file} must have zero banned copyright terms`);
    }
  });
});

describe('Mission 1 (Neon Midnight Drop): start -> fail -> retry -> complete', () => {
  it('runs M1 full lifecycle including late 15s cop twist, failure retry reset, star rating & SaveManager persistence', () => {
    const copSpawns = [];
    const { saveManager, gameState, manager } = createHarness({
      onSpawnPolice: (stars, msg) => copSpawns.push({ stars, msg })
    });

    const initialCash = saveManager.getData().cash;
    const startRes = manager.startMission('M1');
    assert.equal(startRes.ok, true);
    assert.equal(gameState.getState(), STATES.MISSION_ACTIVE);
    assert.equal(manager.remainingTimeSec, 60);

    // Advance 46s so remainingTimeSec hits 14s (<= 15s triggers 1-Star late patrol twist)
    for (let i = 0; i < 46 * 4; i++) {
      manager.update(0.25, { player: { x: 0, z: -100 }, velocity: 12 });
    }
    assert.equal(manager.state, MISSION_STATES.ACTIVE);
    assert.equal(manager.mechanicState.lateCopSpawned, true);
    assert.equal(copSpawns.length, 1);
    assert.equal(copSpawns[0].stars, 1);

    // Expire remaining 14s -> must FAIL
    for (let i = 0; i < 15 * 4; i++) {
      manager.update(0.25, { player: { x: 0, z: -100 }, velocity: 0 });
    }
    assert.equal(manager.state, MISSION_STATES.FAILED);
    assert.equal(manager.lastResult.reason, 'time_expired');
    assert.equal(saveManager.getData().stats.consecutiveFails.M1, 1);

    // Retry cleanly
    const retryRes = manager.retryMission();
    assert.equal(retryRes.ok, true);
    assert.equal(manager.remainingTimeSec, 60);
    assert.equal(manager.mechanicState.lateCopSpawned, false);

    // Pass checkpoints m1_cp1 (0,-300) -> m1_cp2 (0,-600) -> m1_pier99 (0,-875) -> m1_lounge (24,-875 on foot!)
    manager.update(0.25, { player: { x: 0, z: -300 }, velocity: 20, inCar: true });
    manager.update(0.25, { player: { x: 0, z: -600 }, velocity: 20, inCar: true });
    manager.update(0.25, { player: { x: 0, z: -875 }, velocity: 15, inCar: true });
    // Driving into interior while still inCar must NOT clear Pier 99 Lounge
    manager.update(0.25, { player: { x: 24, z: -875 }, velocity: 4, inCar: true });
    assert.equal(manager.isActive(), true);
    const winSnap = manager.update(0.25, { player: { x: 24, z: -875 }, velocity: 3, inCar: false });

    assert.equal(manager.state, MISSION_STATES.COMPLETED);
    assert.equal(winSnap.stars, 3);
    assert.equal(winSnap.rewardCash, 600);
    assert.equal(saveManager.getData().cash, initialCash + 600);
    assert.ok(saveManager.getData().completedMissions.includes('M1'));
    assert.equal(saveManager.getData().starRatings.M1, 3);
    assert.equal(saveManager.getData().stats.consecutiveFails.M1, 0);
  });
});

describe('Mission 9 (NO BRAKES!): start -> fail -> retry -> complete', () => {
  it('disables brakes during active mission, restores on fail, re-arms on retry, and completes upon stopping in Palm Strip Beach Sand', () => {
    const brakeTransitions = [];
    const { saveManager, manager } = createHarness({
      onDisableBrakesChange: (val) => brakeTransitions.push(val)
    });

    const startRes = manager.startMission('M9');
    assert.equal(startRes.ok, true);
    assert.equal(startRes.disableBrakes, true);
    assert.equal(manager.disableBrakes, true);
    assert.equal(manager.remainingTimeSec, 80);

    // Braking attempts are tracked/ignored without stopping
    manager.update(0.25, { player: { x: 0, z: 120 }, velocity: 22, brakingAttempted: true });
    assert.equal(manager.mechanicState.brakeAttemptsIgnored, 1);
    assert.equal(manager.disableBrakes, true);

    // Simulate failure by vehicle damage (0 HP) -> must fail and restore brakes
    const failRes = manager.update(0.25, { player: { x: 0, z: 80 }, velocity: 18, vehicleHp: 0 });
    assert.equal(manager.state, MISSION_STATES.FAILED);
    assert.equal(failRes.reason, 'vehicle_destroyed');
    assert.equal(manager.disableBrakes, false);
    assert.equal(saveManager.getData().stats.consecutiveFails.M9, 1);

    // Retry cleanly -> re-arms disableBrakes
    const retryRes = manager.retryMission();
    assert.equal(retryRes.ok, true);
    assert.equal(manager.disableBrakes, true);
    assert.equal(manager.remainingTimeSec, 80);

    // Weave through m9_cp1 (0,0) -> m9_cp2 (0,-300) -> m9_cp3 (0,-600)
    manager.update(0.25, { player: { x: 0, z: 0 }, velocity: 24 });
    manager.update(0.25, { player: { x: 0, z: -300 }, velocity: 24 });
    manager.update(0.25, { player: { x: 0, z: -600 }, velocity: 24 });
    assert.equal(manager.mechanicState.checkpointsDone, true);

    // Enter Palm Strip Beach Sand (z <= -840) while still fast (18 m/s) -> must NOT complete until speed <= 2.0
    manager.update(0.25, { player: { x: 0, z: -855 }, velocity: 18 });
    assert.equal(manager.isActive(), true);
    assert.equal(manager.mechanicState.inBeachSand, true);

    // Advance intro fade timer cleanly so state reaches ACTIVE
    for (let t = 0; t < 8; t++) {
      manager.update(0.25, { player: { x: 0, z: -858 }, velocity: 10 });
    }
    assert.equal(manager.state, MISSION_STATES.ACTIVE);

    // Decelerated in sand to 1.2 m/s -> must complete cleanly and restore brakes!
    const done = manager.update(0.25, { player: { x: 0, z: -862 }, velocity: 1.2 });
    assert.equal(manager.state, MISSION_STATES.COMPLETED);
    assert.equal(done.stars, 3);
    assert.equal(manager.disableBrakes, false);
    assert.equal(brakeTransitions.at(-1), false);
    assert.ok(saveManager.getData().completedMissions.includes('M9'));
  });
});

describe('Act 1 & Act 2 Unique Mechanics + Silent 3-Fail Difficulty Assist', () => {
  it('handles M5 Ambush red flash, reverse escape & extraction to Vega Garage', () => {
    let ambushCalled = false;
    const { manager } = createHarness({
      onAmbushTrap: (suvs) => { ambushCalled = suvs.length === 3; }
    });

    manager.startMission('M5');
    assert.equal(manager.mechanicState.phase, 'approach');

    // Enter Iron Docks pickup (-600, 0) -> triggers trap
    manager.update(0.25, { player: { x: -600, z: 0 }, velocity: 8 });
    assert.equal(ambushCalled, true);
    assert.equal(manager.mechanicState.phase, 'ambush_reverse');
    assert.ok(manager.mechanicState.ambushFlashSec > 2.0);

    // Reverse clear >= 12m away -> enters escape_garage phase
    manager.update(0.25, { player: { x: -580, z: 0 }, velocity: -6, reverseInput: true });
    assert.equal(manager.mechanicState.phase, 'escape_garage');

    // Reach Vega's Garage (0, 420) -> complete!
    manager.update(0.25, { player: { x: 0, z: 420 }, velocity: 15 });
    assert.equal(manager.state, MISSION_STATES.COMPLETED);
  });

  it('handles M6 Hijack the Hacker: 4 rams reduce HP bar to 0 -> switch car -> deliver to garage', () => {
    let switchedId = null;
    const { manager } = createHarness({
      onSwitchToTargetVehicle: (vid) => { switchedId = vid; }
    });

    manager.startMission('M6');
    assert.equal(manager.mechanicState.targetHp, 100);

    // 4 ram hits spaced by > 0.7s cooldown: 100 -> 70 -> 40 -> 10 -> 0
    for (let hit = 0; hit < 4; hit++) {
      for (let t = 0; t < 4; t++) {
        const tp = manager.mechanicState.targetPos;
        manager.update(0.25, { player: { x: tp.x, z: tp.z }, velocity: t === 3 ? 14 : 0 });
      }
    }
    assert.equal(manager.mechanicState.targetHp, 0);
    assert.equal(manager.mechanicState.phase, 'deliver_garage');
    assert.equal(switchedId, 'C04');

    manager.update(0.25, { player: { x: 0, z: 420 }, velocity: 12 });
    assert.equal(manager.state, MISSION_STATES.COMPLETED);
  });

  it('handles M10 Zero-Scratch Heist condition threshold (<80% immediate fail, >=80% success)', () => {
    const { manager } = createHarness();
    manager.startMission('M10');

    // Scratch below 80% fails immediately
    const failRes = manager.update(0.25, { player: { x: 0, z: 250 }, velocity: 12, vehicleHp: 79 });
    assert.equal(manager.state, MISSION_STATES.FAILED);
    assert.equal(failRes.reason, 'vehicle_scratched');

    // Retry and keep condition at 92% -> passes (including on-foot entry inside Vega's Garage)
    manager.retryMission();
    manager.update(0.25, { player: { x: 0, z: 900 }, velocity: 15, vehicleHp: 95, inCar: true });
    manager.update(0.25, { player: { x: 0, z: 600 }, velocity: 15, vehicleHp: 95, inCar: true });
    manager.update(0.25, { player: { x: -300, z: 600 }, velocity: 15, vehicleHp: 94, inCar: true });
    manager.update(0.25, { player: { x: -300, z: 300 }, velocity: 15, vehicleHp: 93, inCar: true });
    manager.update(0.25, { player: { x: 0, z: 420 }, velocity: 10, vehicleHp: 92, inCar: true });
    manager.update(0.25, { player: { x: 36, z: 420 }, velocity: 2, vehicleHp: 92, inCar: false });
    assert.equal(manager.state, MISSION_STATES.COMPLETED);
    assert.equal(manager.lastResult.stars, 3);
  });

  it('activates Silent 3-Fail Difficulty Assist (+10s timer & 0.85 police aggression) on 4th attempt', () => {
    const { saveManager, manager } = createHarness();
    for (let i = 0; i < ASSIST_FAIL_THRESHOLD; i++) {
      const s = manager.startMission('M4');
      assert.equal(s.assistActive, false);
      assert.equal(s.totalTimeLimitSec, 90);
      manager.failMission('time_expired');
    }

    assert.equal(saveManager.getData().stats.consecutiveFails.M4, 3);
    const assisted = manager.startMission('M4');
    assert.equal(assisted.assistActive, true);
    assert.equal(assisted.totalTimeLimitSec, 90 + ASSIST_BONUS_TIME_SEC);
    assert.equal(assisted.policeAggressionMult, ASSIST_POLICE_AGGRESSION_MULT);

    // Winning resets consecutive fail counter to 0 (walk inside Solaris Tower Lobby on foot!)
    manager.update(0.25, { player: { x: 52, z: 52 }, velocity: 3, inCar: false });
    for (let t = 0; t < 45 * 4 + 2; t++) {
      manager.update(0.25, { player: { x: 10, z: 120 }, velocity: 12, inCar: true });
    }
    assert.equal(manager.state, MISSION_STATES.COMPLETED);
    assert.equal(saveManager.getData().stats.consecutiveFails.M4, 0);
  });
});
