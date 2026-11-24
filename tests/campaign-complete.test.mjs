import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { EventBus } from '../src/core/EventBus.js';
import { SaveManager } from '../src/core/SaveManager.js';
import { GameState, STATES } from '../src/core/GameState.js';
import { VEHICLE_ROSTER } from '../src/garage/GarageManager.js';
import {
  ACT_1_MISSIONS,
  ACT_2_MISSIONS,
  ACT_3_MISSIONS,
  ACT_4_MISSIONS,
  STORY_MISSIONS,
  MISSION_MAP,
  hasNoNaN,
  validateMissionSchema,
  isPointInPlayableBounds
} from '../src/missions/missionsConfig.js';
import { MISSION_STATES, MissionManager } from '../src/missions/MissionManager.js';
import {
  DAILY_TASK_POOL,
  STREAK_REWARD_DAYS,
  STREAK_REWARD_SKIN,
  generateDailyMissions,
  validateDailyTasks,
  DailyMissionManager
} from '../src/missions/DailyMissions.js';
import {
  CHALLENGE_STATES,
  CHALLENGE_MODES,
  validateChallengeSchema,
  ChallengeModeManager
} from '../src/missions/ChallengeModes.js';
import {
  EASTER_EGGS,
  SIDE_HUSTLE_TYPES,
  VIP_TEST_DRIVE_CONFIG,
  validateEasterEggSchema,
  SideHustleManager
} from '../src/missions/SideHustles.js';

function makeMockStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k)
  };
}

function createHarness(callbacks = {}) {
  const storage = makeMockStorage();
  const bus = new EventBus();
  const saveManager = new SaveManager({ storage, eventBus: bus });
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
  return { storage, bus, saveManager, gameState, manager };
}

describe('Complete 20-Mission Schema & Zero-NaN Validation (Acts 1-4)', () => {
  it('verifies all 20 IDs (M1-M20), 4 acts, finite values (0 NaN), valid coordinates & Garage vehicles', () => {
    assert.equal(ACT_1_MISSIONS.length, 5);
    assert.equal(ACT_2_MISSIONS.length, 5);
    assert.equal(ACT_3_MISSIONS.length, 5);
    assert.equal(ACT_4_MISSIONS.length, 5);
    assert.equal(STORY_MISSIONS.length, 20);

    const catalogIds = new Set(VEHICLE_ROSTER.map((v) => v.id));
    for (let i = 1; i <= 20; i++) {
      const id = `M${i}`;
      const m = MISSION_MAP[id];
      assert.ok(m, `Missing story mission ID ${id}`);
      assert.equal(hasNoNaN(m), true, `${id} contains NaN or Infinity`);
      const res = validateMissionSchema(m);
      assert.equal(res.valid, true, `${id} invalid: ${res.errors.join('; ')}`);
      assert.ok(catalogIds.has(m.vehicleId), `${id} uses valid vehicle ${m.vehicleId}`);
      assert.ok(isPointInPlayableBounds(m.spawn), `${id} spawn in bounds`);
    }
  });
});

describe('Act 3 (M11-M15) & Act 4 (M16-M20) Mechanics + Mission 20 Unlock Persistence', () => {
  it('M11 Barricade Breaker, M12 Skyline Ramp Jump (180+ km/h slow-mo), M13 Gold Convoy (3 pursuers)', () => {
    let slowMoCalled = false;
    const { manager } = createHarness({
      onTriggerSlowMo: () => { slowMoCalled = true; }
    });

    // M11
    manager.startMission('M11');
    for (const b of manager.mechanicState.barricades) {
      manager.update(0.25, { player: { x: b.x, z: b.z }, velocity: 12, inCar: true });
    }
    assert.equal(manager.mechanicState.barricadesSmashed, 6);
    // Requires on-foot entry inside Titan National Bank Vault
    manager.update(0.25, { player: { x: -42, z: 260 }, velocity: 5, inCar: true });
    assert.equal(manager.checkpointIndex, 0);
    manager.update(0.25, { player: { x: -42, z: 260 }, velocity: 3, inCar: false });
    assert.equal(manager.checkpointIndex, 1);
    manager.update(0.25, { player: { x: 600, z: 300 }, velocity: 12, inCar: true });
    assert.equal(manager.state, MISSION_STATES.COMPLETED);

    // M12 (reject slow <180 km/h at ramp, accept >=180 km/h with slow-mo)
    manager.startMission('M12');
    manager.update(0.25, { player: { x: 0, z: 450 }, velocity: 35 });
    manager.update(0.25, { player: { x: 0, z: 600 }, velocity: 35 }); // 126 km/h < 180
    assert.equal(manager.mechanicState.jumpCleared, false);
    manager.update(0.25, { player: { x: 0, z: 600 }, velocity: 54 }); // 194.4 km/h >= 180
    assert.equal(manager.mechanicState.jumpCleared, true);
    assert.equal(slowMoCalled, true);
    manager.update(0.25, { player: { x: 0, z: 740 }, velocity: 45 });
    assert.equal(manager.state, MISSION_STATES.COMPLETED);

    // M13
    manager.startMission('M13');
    for (let i = 0; i < 3; i++) {
      const pur = manager.mechanicState.pursuers[i];
      for (let t = 0; t < 3; t++) {
        manager.update(0.25, { player: { x: pur.x, z: pur.z }, velocity: t === 2 ? 15 : 0 });
      }
    }
    assert.equal(manager.mechanicState.takedowns, 3);
    manager.update(0.25, { player: { x: 0, z: 300 }, velocity: 15 });
    manager.update(0.25, { player: { x: -600, z: 0 }, velocity: 15 });
    assert.equal(manager.state, MISSION_STATES.COMPLETED);
  });

  it('M14 Blackout Stealth searchlights & M15 Double Cross intercept', () => {
    const blackouts = [];
    const { manager } = createHarness({
      onBlackoutModeChange: (v) => blackouts.push(v)
    });

    // M14 spotted fail
    manager.startMission('M14');
    assert.equal(blackouts.at(-1), true);
    for (let t = 0; t < 12; t++) {
      const cone = manager.mechanicState.activeCones[0];
      const out = manager.update(0.25, { player: { x: cone.x, z: cone.z }, velocity: 8 });
      if (out.state === MISSION_STATES.FAILED) break;
    }
    assert.equal(manager.state, MISSION_STATES.FAILED);
    assert.equal(manager.lastResult.reason, 'spotted_by_searchlight');
    assert.equal(blackouts.at(-1), false);

    // M14 clean stealth completion (on foot into Iron Docks Sanctuary)
    manager.retryMission();
    manager.update(0.25, { player: { x: 0, z: -300 }, velocity: 15, inCar: true });
    manager.update(0.25, { player: { x: -300, z: -300 }, velocity: 15, inCar: true });
    manager.update(0.25, { player: { x: -300, z: 0 }, velocity: 15, inCar: true });
    manager.update(0.25, { player: { x: -600, z: 0 }, velocity: 15, inCar: true });
    manager.update(0.25, { player: { x: -626, z: -36 }, velocity: 3, inCar: false });
    assert.equal(manager.state, MISSION_STATES.COMPLETED);

    // M15 Double Cross 2 intercept hits
    manager.startMission('M15');
    for (let h = 0; h < 2; h++) {
      for (let t = 0; t < 4; t++) {
        const tp = manager.mechanicState.targetPos;
        manager.update(0.25, { player: { x: tp.x, z: tp.z }, velocity: t === 3 ? 20 : 0 });
      }
    }
    assert.equal(manager.state, MISSION_STATES.COMPLETED);
  });

  it('M16 4-Star Lockdown survival, M17 mid-mission vehicle switch, M18 60 km/h Bomb, M19 Boss Limo', () => {
    let switchedTo = null;
    const { manager } = createHarness({
      onSwitchToTargetVehicle: (vid) => { switchedTo = vid; }
    });

    // M16 survives 120s
    manager.startMission('M16');
    for (let i = 0; i < 120 * 4; i++) {
      manager.update(0.25, { player: { x: 10, z: 10 }, velocity: 18 });
    }
    assert.equal(manager.state, MISSION_STATES.COMPLETED);

    // M17 B01 -> C10 switch
    manager.startMission('M17');
    manager.update(0.25, { player: { x: 0, z: 0 }, velocity: 15 });
    manager.update(0.25, { player: { x: -600, z: 0 }, velocity: 15 });
    assert.equal(switchedTo, 'C10');
    assert.equal(manager.mechanicState.switched, true);
    manager.update(0.25, { player: { x: -300, z: 600 }, velocity: 25 });
    manager.update(0.25, { player: { x: 0, z: 900 }, velocity: 35 });
    assert.equal(manager.state, MISSION_STATES.COMPLETED);

    // M18 60 km/h Bomb: detonate below 60 km/h for 3s, then retry and disarm above 60 km/h
    manager.startMission('M18');
    manager.update(0.25, { player: { x: 0, z: -580 }, velocity: 22 }); // 79 km/h arms fuse
    for (let t = 0; t < 16; t++) {
      manager.update(0.25, { player: { x: 0, z: -560 }, velocity: 10 }); // 36 km/h < 60 -> detonates after 3s
      if (manager.state === MISSION_STATES.FAILED) break;
    }
    assert.equal(manager.state, MISSION_STATES.FAILED);
    assert.equal(manager.lastResult.reason, 'speed_bomb_detonated');

    manager.retryMission();
    manager.update(0.25, { player: { x: 0, z: -300 }, velocity: 25 });
    manager.update(0.25, { player: { x: 0, z: 0 }, velocity: 25 });
    manager.update(0.25, { player: { x: 0, z: 300 }, velocity: 25 });
    manager.update(0.25, { player: { x: 0, z: 600 }, velocity: 25 });
    manager.update(0.25, { player: { x: 0, z: 880 }, velocity: 25 });
    assert.equal(manager.state, MISSION_STATES.COMPLETED);

    // M19 Boss Limo 5x ram (150 HP -> 0)
    manager.startMission('M19');
    for (let r = 0; r < 5; r++) {
      for (let t = 0; t < 4; t++) {
        const bp = manager.mechanicState.bossPos;
        manager.update(0.25, { player: { x: bp.x, z: bp.z }, velocity: t === 3 ? 16 : 0 });
      }
    }
    assert.equal(manager.state, MISSION_STATES.COMPLETED);
  });

  it('M20 Golden Sunrise Finale unlocks C11 + Mirage Valley (City 2) bridge & persists across SaveManager reload', () => {
    let bridgeHook = null;
    const { storage, bus, saveManager, manager } = createHarness({
      onUnlockCity2Bridge: (info) => { bridgeHook = info; }
    });

    manager.startMission('M20');
    manager.update(0.25, { player: { x: 0, z: 600 }, velocity: 35, inCar: true });
    manager.update(0.25, { player: { x: 300, z: 600 }, velocity: 35, inCar: true });
    manager.update(0.25, { player: { x: 600, z: 300 }, velocity: 35, inCar: true });
    manager.update(0.25, { player: { x: 600, z: 0 }, velocity: 35, inCar: true });
    manager.update(0.25, { player: { x: 665, z: -36 }, velocity: 3, inCar: false });
    const win = manager.update(0.25, { player: { x: 750, z: -260 }, velocity: 35, inCar: true });

    assert.equal(manager.state, MISSION_STATES.COMPLETED);
    assert.equal(win.unlockedVehicleId, 'C11');
    assert.equal(win.city2Unlocked, true);
    assert.equal(bridgeHook?.targetCity, 'Mirage Valley');

    // Reload from raw storage to guarantee persistence across cold restart
    const reloaded = new SaveManager({ storage, eventBus: bus }).getData();
    assert.ok(reloaded.completedMissions.includes('M20'));
    assert.ok(reloaded.unlockedVehicles.cars.includes('C11'));
    assert.equal(reloaded.city2Unlocked, true);
    assert.equal(reloaded.starRatings.M20, 3);
  });
});

describe('Extra Retention Layers (Daily Missions, Challenge Modes, 3 Easter Eggs & Side Hustles)', () => {
  it('DailyMissions generates 3 unique finite tasks (0 NaN) and unlocks 7-Day Streak skin on day 7', () => {
    const bus = new EventBus();
    const saveManager = new SaveManager({ storage: makeMockStorage(), eventBus: bus });

    for (const iso of ['2026-11-17', '2026-11-18', '2026-11-23']) {
      const tasks = generateDailyMissions(iso);
      assert.equal(hasNoNaN(tasks), true);
      const v = validateDailyTasks(tasks);
      assert.equal(v.valid, true, v.errors.join(', '));
    }
    assert.equal(hasNoNaN(DAILY_TASK_POOL), true);

    // Complete 7 consecutive days -> 7th day unlocks STREAK_GOLD_CHROME skin
    for (let day = 17; day <= 23; day++) {
      const iso = `2026-11-${day}`;
      const dm = new DailyMissionManager({ saveManager, eventBus: bus, isoDate: iso });
      for (const task of dm.getTasks()) {
        dm.recordProgress(task.metric, task.target, { stars: 3, elapsedSec: 20 });
      }
    }

    const status = new DailyMissionManager({ saveManager, eventBus: bus, isoDate: '2026-11-23' }).getStreakStatus();
    assert.equal(status.count, STREAK_REWARD_DAYS);
    assert.equal(status.skinUnlocked, true);
    assert.equal(status.skin.id, STREAK_REWARD_SKIN.id);
    assert.equal(saveManager.getData().retention.streakSkinUnlocked, true);
  });

  it('ChallengeModes validates & runs 1% Ramp, Reverse Race, and 1-HP Survival cleanly', () => {
    assert.equal(CHALLENGE_MODES.length, 3);
    for (const ch of CHALLENGE_MODES) {
      assert.equal(hasNoNaN(ch), true);
      const v = validateChallengeSchema(ch);
      assert.equal(v.valid, true, v.errors.join(', '));
    }

    const bus = new EventBus();
    const saveManager = new SaveManager({ storage: makeMockStorage(), eventBus: bus });
    const cm = new ChallengeModeManager({ saveManager, eventBus: bus });

    // 1. 1% Rooftop Ramp
    cm.startChallenge('CH_ROOFTOP_1PCT');
    cm.update(0.25, { player: { x: 0, z: 600 }, velocity: 65 }); // 234 km/h launch
    cm.update(0.25, { player: { x: 0, z: 740 }, velocity: 60, jumpY: 6.2 });
    assert.equal(cm.state, CHALLENGE_STATES.COMPLETED);

    // 2. Reverse-Gear Race (fail if driving forward >= 1.2s, win on reverse)
    cm.startChallenge('CH_REVERSE_RACE');
    for (let i = 0; i < 6; i++) cm.update(0.25, { player: { x: 0, z: 25 }, velocity: 12 });
    assert.equal(cm.state, CHALLENGE_STATES.FAILED);
    assert.equal(cm.lastResult.reason, 'drove_forward');

    cm.startChallenge('CH_REVERSE_RACE');
    cm.update(0.25, { player: { x: 0, z: -20 }, velocity: -10 });
    cm.update(0.25, { player: { x: 0, z: -150 }, velocity: -10 });
    cm.update(0.25, { player: { x: 0, z: -300 }, velocity: -10 });
    cm.update(0.25, { player: { x: 0, z: -450 }, velocity: -10 });
    assert.equal(cm.state, CHALLENGE_STATES.COMPLETED);

    // 3. 1-HP Survival (1 collision fails; 60s clean wins)
    cm.startChallenge('CH_ONE_HP_SURVIVAL');
    cm.update(0.25, { player: { x: 10, z: -300 }, velocity: 20, collided: true });
    assert.equal(cm.state, CHALLENGE_STATES.FAILED);

    cm.startChallenge('CH_ONE_HP_SURVIVAL');
    for (let i = 0; i < 60 * 4; i++) {
      cm.update(0.25, { player: { x: i, z: -300 }, velocity: 20, vehicleHp: 1 });
    }
    assert.equal(cm.state, CHALLENGE_STATES.COMPLETED);
    assert.deepEqual(saveManager.getData().retention.completedChallenges.length, 3);
  });

  it('SideHustles runs 3 Hidden Easter Eggs, VIP Taxi, Police Vigilante (C12) & VIP Test-Drive', () => {
    assert.equal(EASTER_EGGS.length, 3);
    for (const egg of EASTER_EGGS) {
      assert.equal(hasNoNaN(egg), true);
      const v = validateEasterEggSchema(egg);
      assert.equal(v.valid, true, v.errors.join(', '));
    }

    const storage = makeMockStorage();
    const bus = new EventBus();
    const saveManager = new SaveManager({ storage, eventBus: bus });
    const sh = new SideHustleManager({ saveManager, eventBus: bus });

    // 1. Midnight Ghost Racer (night + horn near 600,0 -> win at 600,600 -> unlocks B04)
    sh.update(0.25, { player: { x: 600, z: 0 }, velocity: 0, isNight: true, honked: true });
    assert.equal(sh.ghostDuel.active, true);
    sh.update(0.25, { player: { x: 600, z: 600 }, velocity: 30, isNight: true });
    assert.ok(saveManager.getData().unlockedVehicles.bikes.includes('B04'));

    // 2. Hidden Tunnel Vault & 3. Rooftop Stunt
    sh.update(0.25, { player: { x: -900, z: -300 }, velocity: 15 });
    sh.update(0.25, { player: { x: 120, z: -860 }, velocity: 25, jumpY: 5.0 });
    assert.equal(saveManager.getData().retention.discoveredSecrets.length, 3);

    // VIP Taxi pickup -> clean dropoff -> next fare
    sh.startVipTaxi(0);
    assert.equal(sh.activeType, SIDE_HUSTLE_TYPES.VIP_TAXI);
    const tx = sh.taxiState;
    sh.update(0.25, { player: { x: tx.pickup.x, z: tx.pickup.z }, velocity: 5 });
    assert.equal(sh.taxiState.phase, 'dropoff');
    sh.update(0.25, { player: { x: tx.dropoff.x, z: tx.dropoff.z }, velocity: 5 });
    assert.equal(saveManager.getData().retention.hustlesCompleted, 1);

    // Police Vigilante (C12) 2 rams neutralize suspect
    let assignedC12 = false;
    const sh2 = new SideHustleManager({
      saveManager,
      eventBus: bus,
      callbacks: { onAssignVigilanteCruiser: (vid) => { assignedC12 = vid === 'C12'; } }
    });
    sh2.startVigilante();
    assert.equal(assignedC12, true);
    for (let r = 0; r < 2; r++) {
      for (let t = 0; t < 4; t++) {
        const sp = sh2.vigilanteState.suspectPos;
        sh2.update(0.25, { player: { x: sp.x, z: sp.z }, velocity: t === 3 ? 16 : 0 });
      }
    }
    assert.equal(sh2.vigilanteState.takedowns, 1);

    // VIP Test-Drive loan
    const td = sh2.startVipTestDrive(100000);
    assert.equal(td.ok, true);
    assert.equal(td.vehicleId, VIP_TEST_DRIVE_CONFIG.vehicleId);
  });
});
