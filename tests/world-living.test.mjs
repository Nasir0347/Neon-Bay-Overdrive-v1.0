import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  POLICE_POOL_LIMITS,
  WANTED_TIERS,
  computeRubberBandSpeed,
  computePitManeuver,
  PoliceManager
} from '../src/world/PoliceManager.js';
import {
  TRAFFIC_VARIANTS,
  TrafficManager
} from '../src/world/TrafficManager.js';
import {
  PROP_TYPES,
  DestructiblesManager
} from '../src/world/Destructibles.js';
import {
  DAMAGE_STATES,
  FIRE_EJECT_DURATION,
  classifyDamageState,
  VehicleDamageController
} from '../src/world/VehicleDamage.js';

describe('Step 5 Living Open-World Systems Unit Suite', () => {
  it('PoliceManager escalates 0 -> 5 -> 0 (LOS escape), enforces fixed pool bounds, rubber-banding & PIT maneuvers', () => {
    let losEnabled = true;
    const events = [];
    const mockBus = { emit: (ev, payload) => events.push([ev, payload]) };
    const pm = new PoliceManager({
      eventBus: mockBus,
      hasLineOfSight: () => losEnabled,
      isBlocked: () => false
    });

    assert.equal(pm.cruisers.length, POLICE_POOL_LIMITS.maxCruisers);
    assert.equal(pm.swatUnits.length, POLICE_POOL_LIMITS.maxSwat);
    assert.equal(pm.roadblocks.length, POLICE_POOL_LIMITS.maxRoadblocks);
    assert.equal(pm.getSnapshot().wantedLevel, 0);

    const player = { x: 0, z: 0, yaw: 0 };
    for (let star = 1; star <= 5; star++) {
      pm.setWantedLevel(star, player);
      const snap = pm.getSnapshot();
      assert.equal(snap.wantedLevel, star);
      assert.equal(snap.activeCruisers, WANTED_TIERS[star].cruisers);
      assert.equal(snap.activeSwat, WANTED_TIERS[star].swat);
      assert.equal(snap.activeRoadblocks, WANTED_TIERS[star].roadblocks);
      assert.equal(snap.helicopterActive, WANTED_TIERS[star].helicopter);
      assert.equal(snap.lockdownActive, WANTED_TIERS[star].lockdown);
    }

    // Rubber-banding boosts far pursuit speed above near speed
    const farSpeed = computeRubberBandSpeed(20, 30, 80, false);
    const nearSpeed = computeRubberBandSpeed(20, 30, 10, false);
    assert.ok(farSpeed > nearSpeed, `expected far rubber-band speed (${farSpeed}) > near speed (${nearSpeed})`);

    // 3★+ PIT maneuver triggers yaw impulse when positioned on rear quarter
    const pitUnit = { id: 'cruiser_0', active: true, x: 2.2, z: -2.0, pitCooldown: 0 };
    const pit = computePitManeuver(pitUnit, { x: 0, z: 0, yaw: 0 }, 16, 0.016);
    assert.equal(pit.triggered, true);
    assert.ok(Math.abs(pit.yawImpulse) > 0.2);
    assert.ok(pit.speedMultiplier < 1);
    assert.equal(computePitManeuver(pitUnit, { x: 0, z: 0, yaw: 0 }, 16, 0.016).triggered, false, 'respects cooldown');

    // Break LOS & move player out of searchlight cone -> 16s lockdown cooldown expires -> 0 stars
    losEnabled = false;
    player.x = 220;
    player.z = 220;
    let simTime = 0;
    for (let i = 0; i < 90; i++) {
      simTime += 0.2;
      const tick = pm.update(0.2, { player, playerVelocity: 24, inCar: true, playTime: simTime });
      if (i < 75 && tick.wantedLevel > 0) {
        assert.equal(tick.starsFlashing, true);
        assert.equal(tick.state, 'COOLDOWN');
      }
    }
    const escapedSnap = pm.getSnapshot();
    assert.equal(escapedSnap.wantedLevel, 0);
    assert.equal(escapedSnap.state, 'CLEAR');
    assert.equal(escapedSnap.activeCruisers, 0);
    assert.equal(escapedSnap.activeSwat, 0);
    assert.equal(escapedSnap.activeRoadblocks, 0);
    assert.equal(escapedSnap.helicopterActive, false);
    assert.equal(escapedSnap.totalEscapes, 1);
    assert.equal(pm.cruisers.length, POLICE_POOL_LIMITS.maxCruisers);
    assert.equal(pm.swatUnits.length, POLICE_POOL_LIMITS.maxSwat);
    assert.equal(pm.roadblocks.length, POLICE_POOL_LIMITS.maxRoadblocks);
    assert.ok(events.some(([ev]) => ev === 'police:escaped'));
  });

  it('TrafficManager spawns & despawns across districts within fixed object pool bounds', () => {
    assert.ok(TRAFFIC_VARIANTS.length >= 4);
    const tm = new TrafficManager({ poolSize: 16 });
    const player = { x: 0, z: 0 };

    const route = [
      { x: 0, z: 0 },
      { x: 0, z: -280 },
      { x: -240, z: 0 },
      { x: 0, z: 260 },
      { x: 0, z: 0 }
    ];

    for (let step = 0; step < 300; step++) {
      const wp = route[Math.floor(step / 60) % route.length];
      player.x = wp.x;
      player.z = wp.z;
      const lockdown = step >= 150 && step < 210;
      const stats = tm.update(0.1, {
        player,
        sirenActive: step % 50 === 0,
        lockdownActive: lockdown,
        targetDensity: 14,
        maxSpawnsPerTick: 3
      });
      assert.equal(tm.pool.length, 16, 'pool array length must never change');
      assert.ok(stats.activeCount <= 16 && stats.activeCount >= 0);
      if (lockdown && step > 165) {
        assert.ok(stats.activeCount <= 14);
      }
    }

    const finalStats = tm.getStats();
    assert.ok(finalStats.totalSpawns > 16, 'recycled slots across districts');
    assert.ok(finalStats.totalDespawns > 0, 'despawned far traffic slots cleanly');

    tm.clearAll();
    assert.equal(tm.getStats().activeCount, 0);
    assert.equal(tm.pool.length, 16);
  });

  it('TrafficManager OBB passing never false-brakes in adjacent lane (2.3m center dist) and separates cleanly on real overlap', () => {
    const tm = new TrafficManager({ poolSize: 4 });
    const slot = tm.pool[0];
    slot.active = true;
    slot.x = 4.8;
    slot.z = 100;
    slot.yaw = 0;
    slot.axis = 'z';
    slot.direction = 1;
    slot.roadCenter = 0;
    slot.laneOffset = 4.8;
    slot.halfW = 0.90;
    slot.halfL = 2.13;
    slot.targetSpeed = 7.4;
    slot.speed = 7.4;
    tm.activeCount = 1;

    // 1. Adjacent lane driving ahead by 2m, centerDist = 2.3m (~0.5m air gap): zero false braking, zero lateral shove!
    const playerAdj = { x: 2.5, z: 102, yaw: 0 };
    tm.update(0.05, { player: playerAdj, playerHalfW: 0.90, playerHalfL: 2.22, targetDensity: 1, maxSpawnsPerTick: 0 });
    assert.equal(slot.braking, false, 'should not brake when player is cleanly in adjacent lane');
    assert.ok(Math.abs(slot.x - 4.8) < 0.05, 'should not push traffic car sideways when visually clear');
    assert.ok(slot.speed >= 7.0, `traffic keeps rolling smoothly (speed=${slot.speed})`);

    // 2. Same lane directly ahead within 6m: brakes cleanly!
    const playerAhead = { x: 4.8, z: 106, yaw: 0 };
    tm.update(0.05, { player: playerAhead, playerHalfW: 0.90, playerHalfL: 2.22, targetDensity: 1, maxSpawnsPerTick: 0 });
    assert.equal(slot.braking, true, 'should brake when player is directly ahead in same lane');

    // 3. Real side-door OBB overlap (centerDist = 1.4m < 1.80m combined half-widths): pushes slot outward cleanly
    slot.x = 4.8;
    slot.z = 100;
    slot.speed = 7.4;
    const playerOverlap = { x: 3.4, z: 100, yaw: 0 };
    tm.update(0.016, { player: playerOverlap, playerHalfW: 0.90, playerHalfL: 2.22, targetDensity: 1, maxSpawnsPerTick: 0 });
    assert.ok(slot.x >= 5.2, `OBB pushed overlapping traffic outward cleanly (x=${slot.x})`);
  });

  it('DestructiblesManager breaks lampposts, barricades & hydrants cleanly and respawns when far away', () => {
    const dm = new DestructiblesManager({ respawnDelay: 10 });
    const total = dm.initDefaultCityProps();
    assert.ok(total >= 40);

    const lamp = dm.props.find((p) => p.type === PROP_TYPES.LAMPPOST);
    const bar = dm.props.find((p) => p.type === PROP_TYPES.BARRICADE);
    const hyd = dm.props.find((p) => p.type === PROP_TYPES.HYDRANT);
    assert.ok(lamp && bar && hyd);

    const lampHit = dm.checkVehicleCollision({ x: lamp.x, z: lamp.z, yaw: 0 }, 15, 1.2);
    assert.equal(lampHit.length, 1);
    assert.equal(lamp.intact, false);

    const barHit = dm.checkVehicleCollision({ x: bar.x, z: bar.z, yaw: Math.PI / 2 }, 15, 1.2);
    assert.equal(barHit.length, 1);
    assert.equal(bar.intact, false);

    const hydHit = dm.checkVehicleCollision({ x: hyd.x, z: hyd.z, yaw: 0 }, 12, 1.2);
    assert.equal(hydHit.length, 1);
    assert.equal(hydHit[0].geyserStarted, true);
    assert.ok(hyd.geyserTimer > 0);

    // Step physics forward while player stays near -> remains broken until delay & distance met
    for (let i = 0; i < 60; i++) dm.update(0.2, { x: lamp.x, z: lamp.z });
    assert.ok(lamp.tilt > 1.0, 'lamppost toppled cleanly');
    assert.equal(dm.getStats().totalProps, total);

    // Move player far away after timers expire -> props respawn cleanly
    dm.update(0.2, { x: 350, z: 350 });
    assert.equal(lamp.intact, true);
    assert.equal(dm.getStats().intactCount, total);
  });

  it('VehicleDamageController transitions clean -> white -> black -> fire (5s) -> destroyed eject/fail', () => {
    const ctrl = new VehicleDamageController({ ejectDuration: FIRE_EJECT_DURATION });
    const veh = { hp: 100 };
    let ejectCalls = 0;

    assert.equal(classifyDamageState(100), DAMAGE_STATES.CLEAN);
    assert.equal(ctrl.applyDamage(veh, 45), DAMAGE_STATES.WHITE_SMOKE);
    assert.equal(ctrl.applyDamage(veh, 25), DAMAGE_STATES.BLACK_SMOKE);
    assert.equal(ctrl.applyDamage(veh, 20), DAMAGE_STATES.FIRE);
    assert.equal(veh.fireCountdown, 5.0);

    // Tick 4.5s (18 x 0.25s) -> still on fire, not yet exploded
    for (let i = 0; i < 18; i++) {
      const st = ctrl.update(veh, 0.25, { inCar: true, onEjectFail: () => { ejectCalls++; } });
      assert.equal(st.state, DAMAGE_STATES.FIRE);
      assert.equal(st.exploded, false);
    }
    assert.equal(ejectCalls, 0);

    // Final 0.5s -> reaches 5.0s, triggers single explosion & eject callback cleanly
    ctrl.update(veh, 0.25, { inCar: true, onEjectFail: () => { ejectCalls++; } });
    const finalRes = ctrl.update(veh, 0.25, { inCar: true, onEjectFail: () => { ejectCalls++; } });
    assert.equal(finalRes.state, DAMAGE_STATES.DESTROYED);
    assert.equal(finalRes.exploded, true);
    assert.equal(ejectCalls, 1);

    // Subsequent tick does not double-fire eject callback
    const afterRes = ctrl.update(veh, 0.1, { inCar: true, onEjectFail: () => { ejectCalls++; } });
    assert.equal(afterRes.state, DAMAGE_STATES.DESTROYED);
    assert.equal(afterRes.exploded, false);
    assert.equal(ejectCalls, 1);

    ctrl.repair(veh);
    assert.equal(veh.hp, 100);
    assert.equal(veh.damageState, DAMAGE_STATES.CLEAN);
    assert.equal(veh.wrecked, false);
  });
});
