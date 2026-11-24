/**
 * Runtime Bridge connecting `MissionsConfig` and `MissionManager` into the live
 * Three.js NEON BAY: OVERDRIVE runtime with pre-allocated 3D meshes (constant scene node count).
 * Pure zero-import ES Module.
 */

export function initRuntimeMissions({
  MissionsConfigModule,
  MissionManagerModule,
  DailyMissionsModule = null,
  ChallengeModesModule = null,
  SideHustlesModule = null,
  win = globalThis.window,
  doc = globalThis.document
} = {}) {
  if (!win || !doc || !MissionsConfigModule || !MissionManagerModule) {
    return null;
  }

  const hasThree = typeof THREE !== 'undefined' && typeof scene !== 'undefined';

  // Pre-allocate ALL mission 3D meshes ONCE at startup (visible = false when idle)
  let checkpointRingMesh = null;
  let ringMat = null;
  let innerRingMesh = null;
  let beaconMat = null;
  let guideArrowMesh = null;
  let targetCarMesh = null;
  const ambushSuvMeshes = [];
  const barricadeMeshes = [];
  let searchlightGroup = null;
  const searchlightDiscs = [];

  if (hasThree) {
    checkpointRingMesh = new THREE.Group();
    const ringGeo = new THREE.TorusGeometry(4.4, 0.34, 10, 32);
    ringMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.9 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.45;
    innerRingMesh = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.8, 28), new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false }));
    innerRingMesh.rotation.x = -Math.PI / 2;
    innerRingMesh.position.y = 0.16;
    const beaconGeo = new THREE.CylinderGeometry(1.1, 2.2, 80, 16, 1, true);
    beaconMat = new THREE.MeshBasicMaterial({
      color: 0xff007f,
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.y = 40;
    checkpointRingMesh.add(ring, innerRingMesh, beacon);
    checkpointRingMesh.visible = false;
    scene.add(checkpointRingMesh);

    // Floating 3D directional arrow above/ahead of player pointing to active objective
    guideArrowMesh = new THREE.Group();
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.92 });
    const tipMat = new THREE.MeshBasicMaterial({ color: 0xffea00, transparent: true, opacity: 0.96 });
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 1.35), arrowMat);
    shaft.position.set(0, 0, -0.25);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.58, 1.05, 8), tipMat);
    head.rotation.x = Math.PI / 2;
    head.position.set(0, 0, 0.85);
    guideArrowMesh.add(shaft, head);
    guideArrowMesh.visible = false;
    scene.add(guideArrowMesh);

    const makeMissionCar = (bodyHex, length = 4.6, height = 1.4) => {
      const g = new THREE.Group();
      const bodyMat = new THREE.MeshLambertMaterial({ color: bodyHex });
      const darkMat = new THREE.MeshLambertMaterial({ color: 0x151922 });
      const neonMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.92, height * 0.55, length), bodyMat);
      chassis.position.y = height * 0.42;
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.62, height * 0.45, length * 0.48), darkMat);
      cabin.position.set(0, height * 0.86, -length * 0.04);
      const trim = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.12, length * 1.01), neonMat);
      trim.position.y = 0.22;
      g.add(chassis, cabin, trim);
      g.visible = false;
      scene.add(g);
      return g;
    };

    targetCarMesh = makeMissionCar(0x009dff, 4.65, 1.32);
    for (let i = 0; i < 3; i++) {
      ambushSuvMeshes.push(makeMissionCar(0x14171f, 4.95, 1.85));
    }

    // Pre-allocate 6 high-visibility 3D police barricades for M11 Barricade Breaker
    const barBodyMat = new THREE.MeshLambertMaterial({ color: 0xff6b1a });
    const barStripeMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const barLegMat = new THREE.MeshLambertMaterial({ color: 0x1a2230 });
    for (let i = 0; i < 6; i++) {
      const bg = new THREE.Group();
      const board = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.15, 0.45), barBodyMat);
      board.position.y = 1.0;
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.45, 0.24, 0.49), barStripeMat);
      stripe.position.y = 1.15;
      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.65, 0.72), barLegMat);
      legL.position.set(-1.35, 0.32, 0);
      const legR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.65, 0.72), barLegMat);
      legR.position.set(1.35, 0.32, 0);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.38), barStripeMat);
      lamp.position.y = 1.72;
      bg.add(board, stripe, legL, legR, lamp);
      bg.visible = false;
      scene.add(bg);
      barricadeMeshes.push(bg);
    }

    searchlightGroup = new THREE.Group();
    const discGeo = new THREE.CircleGeometry(16, 24);
    const discMat = new THREE.MeshBasicMaterial({
      color: 0xffe49e,
      transparent: true,
      opacity: 0.32,
      depthWrite: false
    });
    const coneGeo = new THREE.ConeGeometry(16, 32, 16, 1, true);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xffe49e,
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    for (let i = 0; i < 3; i++) {
      const sg = new THREE.Group();
      const disc = new THREE.Mesh(discGeo, discMat);
      disc.rotation.x = -Math.PI / 2;
      disc.position.y = 0.14;
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.y = 16;
      sg.add(disc, cone);
      searchlightGroup.add(sg);
      searchlightDiscs.push(sg);
    }
    searchlightGroup.visible = false;
    scene.add(searchlightGroup);
  }

  win.mission3DState = {
    checkpointRingMesh,
    guideArrowMesh,
    barricadeMeshes,
    searchlightDiscs
  };

  function hideMissionMeshes() {
    if (checkpointRingMesh) checkpointRingMesh.visible = false;
    if (guideArrowMesh) guideArrowMesh.visible = false;
    if (targetCarMesh) targetCarMesh.visible = false;
    for (const m of ambushSuvMeshes) m.visible = false;
    for (const b of barricadeMeshes) b.visible = false;
    if (searchlightGroup) searchlightGroup.visible = false;
  }

  function spawnMissionVehicle(vehicleId, pos) {
    const garage = win.NeonGarage;
    const spec = garage?.getVehicle?.(vehicleId);
    const p = typeof player !== 'undefined' ? player : null;
    const cv = win.cityVehicles || {};
    const prevKey = typeof ride === 'string' ? ride : 'car';
    const key = (spec?.runtimeKey && cv[spec.runtimeKey]) ? spec.runtimeKey : 'car';
    const veh = cv[key];
    if (!veh || !p) return false;

    veh.x = pos?.x ?? 0;
    veh.z = pos?.z ?? 0;
    veh.yaw = pos?.yaw ?? 0;
    veh.hp = 100;
    win.NeonActiveVehicleId = vehicleId;
    veh.jumpY = 0;
    veh.jumpVy = 0;
    veh.jumpPitch = 0;
    veh.airborne = false;
    veh.onRamp = null;
    win.NeonVehicleDamage?.repair?.(veh);
    win.parkOtherHeroVehiclesClearOf?.(key, veh.x, veh.z, prevKey !== key ? prevKey : null);

    if (typeof ride !== 'undefined') ride = key;
    if (typeof inCar !== 'undefined') inCar = true;
    if (typeof velocity !== 'undefined') velocity = 0;
    p.x = veh.x;
    p.z = veh.z;
    p.yaw = veh.yaw;
    win.swimming = false;
    win.nosActive = false;

    if (garage && spec) {
      const cfg = garage.getCustomization(spec.id);
      const stats = garage.getEffectiveStats(spec.id);
      garage.onApplyVisuals?.(spec, cfg, stats);
    }

    if (typeof firstFrame !== 'undefined') firstFrame = true;
    win.clearControls?.();
    win.sceneDirty = true;
    return true;
  }

  function clearMissionEffects() {
    win._missionDisableBrakes = false;
    win._missionBrakeAttempted = false;
    win._missionPoliceAggressionMult = 1.0;
    win._missionBlackoutActive = false;
    if (win.worldClock) {
      win.worldClock.rainIntensity = 0;
    }
    hideMissionMeshes();
  }

  const city2Bridge = {
    unlocked: !!win.NeonSave?.getData?.()?.city2Unlocked,
    targetCity: 'Mirage Valley',
    causewayCoord: { x: 0, z: 960 },
    travelToCity2() {
      const unlocked = this.unlocked || !!win.NeonSave?.getData?.()?.city2Unlocked;
      if (!unlocked) {
        if (typeof toast === 'function') toast('Complete M20 Golden Sunrise Finale to unlock Mirage Valley!');
        return { ok: false, reason: 'locked' };
      }
      win.NeonEventBus?.emit?.('world:city2TransitionRequested', { targetCity: this.targetCity });
      if (typeof toast === 'function') toast('BAYVIEW CAUSEWAY OPEN -> MIRAGE VALLEY (CITY 2) READY!');
      return { ok: true, targetCity: this.targetCity, causewayCoord: this.causewayCoord };
    }
  };
  win.NeonCity2Bridge = city2Bridge;

  const missionMgr = new MissionManagerModule.MissionManager({
    missions: MissionsConfigModule.STORY_MISSIONS,
    saveManager: win.NeonSave || null,
    gameState: win.NeonGameState || null,
    eventBus: win.NeonEventBus || null,
    i18n: win.NeonI18n || null,
    doc,
    win,
    callbacks: {
      onHint: (msg) => {
        if (msg && typeof toast === 'function') toast(msg);
      },
      onBarricadeSmash: (_b, count, total) => {
        win.triggerCameraShake?.(0.28, 0.22);
        win.playCrash?.(0.65);
        if (typeof toast === 'function') toast(`BARRICADE SMASHED! ${count}/${total}`);
      },
      onDisableBrakesChange: (disabled) => {
        win._missionDisableBrakes = !!disabled;
        if (!disabled) win._missionBrakeAttempted = false;
      },
      onBlackoutModeChange: (blackout) => {
        win._missionBlackoutActive = !!blackout;
        if (blackout && win.cityVehicles && typeof ride === 'string') {
          const v = win.cityVehicles[ride];
          if (v && 'lights' in v) v.lights = false;
        }
      },
      onUnlockCity2Bridge: ({ targetCity, unlockedVehicleId }) => {
        city2Bridge.unlocked = true;
        if (unlockedVehicleId && typeof toast === 'function') {
          toast(`UNLOCKED: ${unlockedVehicleId} VORTEX APEX GOLD + ${targetCity.toUpperCase()}!`);
        }
      },
      onMissionStart: (mission, meta) => {
        win._missionPoliceAggressionMult = meta.policeAggressionMult ?? 1.0;
        if (typeof running !== 'undefined') running = true;
        if (win.NeonPhone?.isOpen) win.NeonPhone.close();

        win.clearWanted?.();
        win.NeonPolice?.clearWanted?.('mission-start');
        spawnMissionVehicle(mission.vehicleId, mission.spawn);

        if (win.worldClock) {
          win.worldClock.rainIntensity = mission.weather === 'rain' ? (mission.mechanics?.rainIntensity || 0.9) : 0;
        }
        if (typeof toast === 'function') toast(`${mission.id}: ${mission.title.toUpperCase()}`);
        win.updateHUD?.();
        win.updateTouchUI?.();
      },
      onSpawnPolice: (stars, msg) => {
        const p = typeof player !== 'undefined' ? player : null;
        if (typeof win.setWantedLevel === 'function') win.setWantedLevel(stars);
        if (p) win.NeonPolice?.setWantedLevel?.(stars, p);
        if (msg && typeof toast === 'function') toast(msg);
      },
      onTriggerSlowMo: (sec) => {
        win.NeonDrivingJuice?.slowMo?.trigger?.(sec || 1.5, 0.35);
        if (typeof toast === 'function') toast('STUNT RAMP LAUNCH!');
      },
      onAmbushTrap: (_suvs, msg) => {
        win.triggerCameraShake?.(0.32, 0.35);
        if (msg && typeof toast === 'function') toast(msg);
      },
      onTargetRammed: (_hp, _maxHp) => {
        if (typeof velocity !== 'undefined') velocity *= 0.65;
        win.triggerCameraShake?.(0.34, 0.25);
        win.playCrash?.(0.7);
      },
      onSwitchToTargetVehicle: (vehId, pos) => {
        spawnMissionVehicle(vehId || 'C04', pos);
        if (typeof toast === 'function') {
          toast(
            vehId === 'C10'
              ? 'VEHICLE SWAP: VORTEX VENENO-X HYPERCAR READY!'
              : "HIJACKED ZED'S COUPE! Drive to Vega's Garage!"
          );
        }
        win.audioCue?.('success');
      },
      onBeep: () => {
        if (win.NeonAudioUnlocked) win.audioCue?.('tick');
      },
      onMissionComplete: (_m, payload) => {
        clearMissionEffects();
        if (typeof cash === 'number' && win.NeonSave?.getData) {
          cash = win.NeonSave.getData().cash;
        }
        if (typeof toast === 'function') {
          toast(`MISSION COMPLETE! +Rs ${payload.rewardCash} (${payload.stars}★)`);
        }
        win.audioCue?.('success');
        win.updateHUD?.();
      },
      onMissionFail: (_m, payload) => {
        clearMissionEffects();
        if (typeof toast === 'function') toast(`MISSION FAILED: ${payload.message}`);
        win.audioCue?.('crash');
        win.updateHUD?.();
      },
      onAbort: () => {
        clearMissionEffects();
        win.updateHUD?.();
      }
    }
  }).mount();

  win.NeonMissions = missionMgr;

  // Instantiate Daily Missions, Challenge Modes & Side Hustles + 3 Easter Eggs
  const dailyMgr = DailyMissionsModule
    ? new DailyMissionsModule.DailyMissionManager({
        saveManager: win.NeonSave || null,
        eventBus: win.NeonEventBus || null,
        onRewardToast: (msg) => { if (typeof toast === 'function') toast(msg); }
      })
    : null;
  win.NeonDailyMissions = dailyMgr;
  let chaseStart = 0, chaseStars = 0, nitroWasActive = false;
  win.NeonEventBus?.on('police:wantedChanged', ({stars, wantedLevel}) => {
    const level = stars ?? wantedLevel ?? win.NeonPolice.wantedLevel;
    if (level > 0 && chaseStars === 0) chaseStart = playTime;
    chaseStars = Math.max(chaseStars, level);
  });
  win.NeonEventBus?.on('police:escaped', () => {
    dailyMgr?.recordProgress('escape_3star_under_sec', 1, {stars: chaseStars, elapsedSec: playTime - chaseStart});
    chaseStars = 0;
  });
  win.NeonEventBus?.on('world:propBroken', () => dailyMgr?.recordProgress('props_smashed', 1));

  const challengeMgr = ChallengeModesModule
    ? new ChallengeModesModule.ChallengeModeManager({
        saveManager: win.NeonSave || null,
        eventBus: win.NeonEventBus || null,
        callbacks: {
          onChallengeStart: (ch) => {
            if (missionMgr.isActive()) missionMgr.abortMission();
            spawnMissionVehicle(ch.vehicleId, ch.spawn);
            const rv = typeof currentRide === 'function' ? currentRide() : null;
            if (rv && Number.isFinite(ch.initialHp)) rv.hp = ch.initialHp;
            if (typeof toast === 'function') toast(`CHALLENGE: ${ch.title}`);
            win.updateHUD?.();
          },
          onChallengeComplete: (_ch, payload) => {
            if (typeof cash === 'number' && win.NeonSave?.getData) cash = win.NeonSave.getData().cash;
            if (typeof toast === 'function') toast(`CHALLENGE CLEARED! +Rs ${payload.rewardCash}`);
            win.audioCue?.('success');
            win.updateHUD?.();
          },
          onChallengeFail: (_ch, payload) => {
            if (typeof toast === 'function') toast(`CHALLENGE FAILED: ${payload.reason}`);
            win.audioCue?.('crash');
            win.updateHUD?.();
          }
        }
      })
    : null;
  win.NeonChallenges = challengeMgr;

  const sideHustlesMgr = SideHustlesModule
    ? new SideHustlesModule.SideHustleManager({
        saveManager: win.NeonSave || null,
        eventBus: win.NeonEventBus || null,
        dailyManager: dailyMgr,
        callbacks: {
          onHustleToast: (msg) => { if (typeof toast === 'function') toast(msg); },
          onAssignVigilanteCruiser: (vid) => spawnMissionVehicle(vid, { x: 0, z: -20, yaw: 0 }),
          onVipTestDriveStart: (vid) => {
            spawnMissionVehicle(vid, typeof player !== 'undefined' ? player : { x: 0, z: -20, yaw: 0 });
            if (typeof toast === 'function') toast('VIP TEST-DRIVE: Vortex Apex Gold (C11) unlocked for 2 mins!');
          },
          onVipTestDriveEnd: () => {
            if (typeof toast === 'function') toast('VIP Test-Drive ended! Unlock C11 by finishing M20.');
          }
        }
      })
    : null;
  win.NeonSideHustles = sideHustlesMgr;

  // Authoritative activeTargets for Minimap GPS route & 3D waypoint arrow
  const getActiveTargets = () => {
    if (missionMgr.isActive()) {
      const tgt = missionMgr.getActiveTarget();
      return tgt ? [tgt] : [];
    }
    if (challengeMgr?.isActive?.()) {
      const tgt = challengeMgr.getActiveTarget();
      return tgt ? [tgt] : [];
    }
    const hustleTgt = sideHustlesMgr?.getActiveTarget?.();
    if (hustleTgt) return [hustleTgt];
    return [];
  };
  if (typeof activeTargets === 'function') {
    activeTargets = getActiveTargets;
  }
  win.activeTargets = getActiveTargets;

  // Frame update function called by src/main.js
  let continuousDriftM = 0;
  let wasAirborne = false;
  let lastHornAt = false;
  function update(dt) {
    const p = typeof player !== 'undefined' ? player : { x: 0, z: 0 };
    const curInCar = typeof inCar !== 'undefined' ? !!inCar : false;
    const rv = curInCar && typeof currentRide === 'function' ? currentRide() : null;
    const curVel = typeof velocity !== 'undefined' ? velocity : 0;
    const curSpeedKmh = Math.abs(curVel) * 3.6;

    // Daily tasks & Side Hustles passive tracking
    if (dailyMgr && curInCar) {
      if (win.nosActive && !nitroWasActive) dailyMgr.recordProgress('nos_activations', 1);
      nitroWasActive = !!win.nosActive;
      dailyMgr.recordProgress('top_speed_kmh', curSpeedKmh);
      if ((win.driftAmount || 0) > 0.25 && Math.abs(curVel) > 6) {
        continuousDriftM += Math.abs(curVel) * Math.max(0, Math.min(0.25, Number(dt) || 0));
        dailyMgr.recordProgress('continuous_drift_m', continuousDriftM);
      } else {
        continuousDriftM = 0;
      }
      const isBike = typeof ride === 'string' && (win.vehicleSpecs[ride]?.isBike);
      const curAir = (rv?.jumpY || 0) > 2.2;
      if (isBike && curAir && !wasAirborne) {
        dailyMgr.recordProgress('bike_ramps', 1);
      }
      wasAirborne = curAir;
    }

    if (challengeMgr?.isActive?.()) {
      challengeMgr.update(dt, {
        player: p,
        velocity: curVel,
        speedKmh: curSpeedKmh,
        jumpY: rv?.jumpY || 0,
        vehicleHp: rv?.hp ?? 100
      });
    }

    if (sideHustlesMgr) {
      const inputState = win.NeonInput?.getState?.();
      const hornNow = inputState ? !!inputState.horn : (typeof keys !== 'undefined' ? (keys.has('KeyH') || keys.has('KeyV')) : false);
      const honked = hornNow && !lastHornAt;
      lastHornAt = hornNow;
      sideHustlesMgr.update(dt, {
        player: p,
        velocity: curVel,
        jumpY: rv?.jumpY || 0,
        isNight: (win.worldClock?.nightAlpha ?? 0.5) > 0.35 || (typeof settings !== 'undefined' && settings.time === 'night'),
        honked
      });
    }

    if (!missionMgr.isActive()) {
      hideMissionMeshes();
      const target = getActiveTargets()[0];
      const pt = typeof playTime !== 'undefined' ? playTime : 0;
      if (target && checkpointRingMesh) {
        checkpointRingMesh.visible = true;
        checkpointRingMesh.position.set(target.x, 0, target.z);
        checkpointRingMesh.rotation.y = pt * 1.6;
        if (ringMat && target.color) ringMat.color.set(target.color);
        if (innerRingMesh?.material && target.color) innerRingMesh.material.color.set(target.color);
        if (beaconMat && target.color) beaconMat.color.set(target.color);
      }
      if (guideArrowMesh && target && !win.photoModeActive) {
        guideArrowMesh.visible = true;
        guideArrowMesh.position.set(p.x, (rv?.jumpY || 0) + 3.6 + Math.sin(pt * 5) * 0.14, p.z);
        guideArrowMesh.rotation.y = Math.atan2(target.x - p.x, target.z - p.z);
      }
      return;
    }

    const inputState = win.NeonInput?.getState?.();
    const revInput = inputState
      ? inputState.reverse > 0
      : (typeof keys !== 'undefined' ? (keys.has('ArrowDown') || keys.has('KeyS')) : false);

    missionMgr.update(dt, {
      player: p,
      velocity: curVel,
      speedKmh: curSpeedKmh,
      steer: win.steerSmooth || 0,
      inCar: curInCar,
      vehicleHp: rv?.hp ?? 100,
      vehicleDestroyed: !!rv?.destroyed,
      drifting: (win.driftAmount || 0) > 0.25,
      driftAmount: win.driftAmount || 0,
      wantedLevel: win.wantedLevel || 0,
      brakingAttempted: !!win._missionBrakeAttempted,
      reverseInput: revInput
    });
    win._missionBrakeAttempted = false;

    // Update pre-allocated 3D mission visuals cleanly (zero scene.add/remove)
    const tgt = missionMgr.getActiveTarget();
    const pt = typeof playTime !== 'undefined' ? playTime : 0;
    if (checkpointRingMesh) {
      if (tgt && missionMgr.isActive()) {
        checkpointRingMesh.visible = true;
        checkpointRingMesh.position.set(tgt.x, 0, tgt.z);
        checkpointRingMesh.rotation.y = pt * 1.6;
        const baseScale = tgt.requiresOnFoot ? 0.48 : 1;
        const pulse = baseScale * (1 + Math.sin(pt * 5) * 0.08);
        checkpointRingMesh.scale.set(pulse, 1, pulse);
        if (ringMat && tgt.color) ringMat.color.set(tgt.color);
        if (innerRingMesh?.material && tgt.color) innerRingMesh.material.color.set(tgt.color);
        if (beaconMat && tgt.color) beaconMat.color.set(tgt.color);
      } else {
        checkpointRingMesh.visible = false;
      }
    }

    if (guideArrowMesh) {
      if (tgt && missionMgr.isActive() && !win.photoModeActive) {
        guideArrowMesh.visible = true;
        const gy = curInCar ? (rv?.jumpY || 0) + 3.6 + Math.sin(pt * 5) * 0.14 : 2.55 + Math.sin(pt * 5) * 0.12;
        guideArrowMesh.position.set(p.x, gy, p.z);
        guideArrowMesh.rotation.y = Math.atan2(tgt.x - p.x, tgt.z - p.z);
      } else {
        guideArrowMesh.visible = false;
      }
    }

    const ms = missionMgr.mechanicState;
    if (barricadeMeshes.length === 6) {
      const showBars = missionMgr.isActive() && ms?.type === 'barricade_breaker' && Array.isArray(ms.barricades);
      for (let i = 0; i < 6; i++) {
        const b = showBars ? ms.barricades[i] : null;
        if (b && !b.broken) {
          barricadeMeshes[i].visible = true;
          barricadeMeshes[i].position.set(b.x, 0, b.z);
          barricadeMeshes[i].rotation.y = 0;
        } else {
          barricadeMeshes[i].visible = false;
        }
      }
    }
    if (targetCarMesh) {
      if (missionMgr.isActive() && ms?.type === 'hacker_hijack' && ms.phase === 'chase_ram' && ms.targetPos) {
        targetCarMesh.visible = true;
        targetCarMesh.position.set(ms.targetPos.x, 0, ms.targetPos.z);
        targetCarMesh.rotation.y = ms.targetPos.yaw || 0;
      } else if (missionMgr.isActive() && ms?.type === 'highway_duel' && ms.rivalPos) {
        targetCarMesh.visible = true;
        targetCarMesh.position.set(ms.rivalPos.x, 0, ms.rivalPos.z);
        targetCarMesh.rotation.y = ms.rivalPos.yaw || 0;
      } else if (missionMgr.isActive() && ms?.type === 'double_cross_intercept' && ms.targetPos) {
        targetCarMesh.visible = true;
        targetCarMesh.position.set(ms.targetPos.x, 0, ms.targetPos.z);
        targetCarMesh.rotation.y = ms.targetPos.yaw || 0;
      } else if (missionMgr.isActive() && ms?.type === 'boss_takedown' && ms.bossPos) {
        targetCarMesh.visible = true;
        targetCarMesh.position.set(ms.bossPos.x, 0, ms.bossPos.z);
        targetCarMesh.rotation.y = ms.bossPos.yaw || 0;
      } else {
        targetCarMesh.visible = false;
      }
    }

    if (searchlightGroup) {
      if (missionMgr.isActive() && ms?.type === 'blackout_stealth' && Array.isArray(ms.activeCones)) {
        searchlightGroup.visible = true;
        for (let i = 0; i < searchlightDiscs.length; i++) {
          const cone = ms.activeCones[i];
          if (cone) {
            searchlightDiscs[i].visible = true;
            searchlightDiscs[i].position.set(cone.x, 0.14, cone.z);
          } else {
            searchlightDiscs[i].visible = false;
          }
        }
      } else {
        searchlightGroup.visible = false;
      }
    }

    if (ambushSuvMeshes.length === 3) {
      const showSuvs = missionMgr.isActive() && ms?.type === 'ambush_escape' && ms.phase !== 'approach' && Array.isArray(ms.suvPositions);
      const showPursuers = missionMgr.isActive() && ms?.type === 'convoy_smash' && Array.isArray(ms.pursuers);
      for (let i = 0; i < 3; i++) {
        if (showSuvs && ms.suvPositions[i]) {
          ambushSuvMeshes[i].visible = true;
          ambushSuvMeshes[i].position.set(ms.suvPositions[i].x, 0, ms.suvPositions[i].z);
          ambushSuvMeshes[i].rotation.y = ms.suvPositions[i].yaw || 0;
        } else if (showPursuers && ms.pursuers[i]?.active) {
          ambushSuvMeshes[i].visible = true;
          ambushSuvMeshes[i].position.set(ms.pursuers[i].x, 0, ms.pursuers[i].z);
          ambushSuvMeshes[i].rotation.y = ms.pursuers[i].yaw || 0;
        } else {
          ambushSuvMeshes[i].visible = false;
        }
      }
    }
  }

  return { missionMgr, dailyMgr, challengeMgr, sideHustlesMgr, city2Bridge, update };
}
