/**
 * Runtime Bridge connecting `SaveManager`, `GameState`, `GarageManager`,
 * `Smartphone`, and `PhotoMode` into the live Three.js NEON BAY: OVERDRIVE runtime.
 * Pure ES Module with zero static imports.
 */

export function initRuntimeFeatures({
  CoreModules,
  GarageModule,
  PhoneModule,
  PhotoModule,
  win = globalThis.window,
  doc = globalThis.document
} = {}) {
  if (!win || !doc || !CoreModules || !GarageModule || !PhoneModule || !PhotoModule) {
    return null;
  }

  const bus = win.NeonEventBus || new CoreModules.EventBus();
  const saveMgr = new CoreModules.SaveManager({ eventBus: bus });
  const gameState = new CoreModules.GameState({ eventBus: bus });
  gameState.transition(CoreModules.STATES.FREE_ROAM);

  win.NeonEventBus = bus;
  win.NeonSave = saveMgr;
  win.NeonGameState = gameState;
  // SaveManager owns the balance, including passive daily/hustle rewards.
  bus.on('save:written', ({data}) => { if (typeof cash === 'number') cash = data.cash; });
  win._jumpMultiplier = 1.0;
  win._gravityScale = 1.0;

  function applyVehicleVisuals(spec, cfg, stats) {
    const key = spec?.runtimeKey || 'car';
    const paintHex = cfg?.paint || spec?.defaultPaint || '#00f0ff';

    win.NeonActiveVisuals = {
      id: spec?.id || 'C01',
      key,
      paint: paintHex,
      neon: cfg?.neon || 'off',
      turboLv: cfg?.turboLv || 0
    };

    if (key === 'car') {
      win.setCarPaint?.(paintHex);
    }

    const mesh = win.NeonVehicles?.heroMeshes?.[key];
    if (mesh) {
      if (mesh.userData?.paint?.color?.set) {
        mesh.userData.paint.color.set(paintHex);
      }
      if (globalThis.THREE && typeof GarageModule.normalizeVehicleMeshScale === 'function') {
        GarageModule.normalizeVehicleMeshScale(mesh, spec, globalThis.THREE);
      }
    }

    if (win.vehicleSpecs?.[key] && stats) {
      win.vehicleSpecs[key].max = Math.max(win.vehicleSpecs[key].max || 22, stats.topSpeedKmh / 3.6);
      if (Number.isFinite(stats.handling)) win.vehicleSpecs[key].steer = stats.handling;
      if (Number.isFinite(stats.accel)) win.vehicleSpecs[key].accel = stats.accel;
    }
    win.sceneDirty = true;
  }

  function spawnVehicleFromGarage(spec, cfg, stats) {
    const p = typeof player !== 'undefined' ? player : null;
    const cv = win.cityVehicles || {};
    const key = (spec?.runtimeKey && cv[spec.runtimeKey]) ? spec.runtimeKey : 'car';
    const veh = cv[key];
    if (!veh || !p) return false;

    const landCheck = typeof win.landBlocked === 'function' ? win.landBlocked : (x, z, r) => (typeof blocked === 'function' ? blocked(x, z, r) : false);

    // Place safely nearby if currently on foot, or swap right beneath player if driving
    let spawnX = p.x;
    let spawnZ = p.z;
    const currentlyInCar = typeof inCar !== 'undefined' ? !!inCar : false;
    if (!currentlyInCar) {
      const offsets = [
        [p.x + Math.sin(p.yaw) * 4.2, p.z + Math.cos(p.yaw) * 4.2],
        [p.x + 4.0, p.z],
        [p.x - 4.0, p.z],
        [p.x, p.z + 4.0]
      ];
      const clear = offsets.find(([cx, cz]) => !landCheck(cx, cz, 1.3));
      if (clear) {
        spawnX = clear[0];
        spawnZ = clear[1];
      } else {
        spawnX = 0;
        spawnZ = -20;
      }
    }

    // If swapping from another ride while driving, return previous or overlapping rides to curbside parking so two meshes never overlap
    const prevKey = typeof ride === 'string' ? ride : 'car';
    veh.x = spawnX;
    veh.z = spawnZ;
    veh.yaw = p.yaw || 0;
    win.parkOtherHeroVehiclesClearOf?.(key, spawnX, spawnZ, (currentlyInCar && prevKey !== key) ? prevKey : null);
    veh.hp = 100;
    win.NeonActiveVehicleId = spec.id;
    veh.jumpY = 0;
    veh.jumpVy = 0;
    veh.jumpPitch = 0;
    veh.airborne = false;
    veh.onRamp = null;
    win.NeonVehicleDamage?.repair?.(veh);

    if (typeof ride !== 'undefined') ride = key;
    if (typeof inCar !== 'undefined') inCar = true;
    if (typeof velocity !== 'undefined') velocity = 0;
    if (typeof jumpY !== 'undefined') jumpY = 0;
    if (typeof jumpVelocity !== 'undefined') jumpVelocity = 0;
    p.x = veh.x;
    p.z = veh.z;
    p.yaw = veh.yaw;
    win.swimming = false;
    win.nosActive = false;
    win.nosCharge = 100;

    applyVehicleVisuals(spec, cfg, stats);
    if (typeof firstFrame !== 'undefined') firstFrame = true;
    win.clearControls?.();
    if (typeof toast === 'function') toast(`SPAWNED: ${spec.id} ${spec.name}`);
    win.audioCue?.('success');
    win.updateHUD?.();
    win.updateTouchUI?.();
    return true;
  }

  const garage = new GarageModule.GarageManager({
    saveManager: saveMgr,
    eventBus: bus,
    onApplyVisuals: applyVehicleVisuals,
    onSpawnVehicle: spawnVehicleFromGarage
  });
  win.NeonGarage = garage;

  // Synchronize live 3D vehicle ride & appearance with saved selectedVehicle on boot
  const bootSpec = garage.getSelectedVehicle();
  if (bootSpec && bootSpec.id !== 'C01') {
    garage.selectVehicle(bootSpec.id, { spawn: true });
  } else {
    garage.selectVehicle('C01', { spawn: false });
  }

  function syncSaveCashFromGame() {
    if (typeof cash === 'number') {
      const cur = saveMgr.getData().cash;
      if (cur !== cash) saveMgr.save({ cash });
    }
  }

  let wasRunningBeforePhoto = true;
  const photoMode = new PhotoModule.PhotoMode({
    doc,
    win,
    gameState,
    eventBus: bus,
    getTargetPos: () => {
      const p = typeof player !== 'undefined' ? player : { x: 0, z: 0, yaw: 0 };
      const j = typeof inCar !== 'undefined' && inCar && typeof currentRide === 'function' ? (currentRide()?.jumpY || 0) : 0;
      return { x: p.x, y: 1.35 + j, z: p.z, yaw: p.yaw || 0 };
    },
    getCamera: () => (typeof view !== 'undefined' ? view : null),
    renderFrame: () => {
      if (typeof gl !== 'undefined' && typeof scene !== 'undefined' && typeof view !== 'undefined') {
        gl.render(scene, view);
      }
    },
    getCanvas: () => doc.getElementById('game'),
    canEnter: () => {
      const hasActiveMission = !!win.NeonMissions?.isActive?.();
      if (hasActiveMission && gameState.getState() === CoreModules.STATES.FREE_ROAM) {
        gameState.transition(CoreModules.STATES.MISSION_ACTIVE);
      } else if (!hasActiveMission && gameState.getState() === CoreModules.STATES.MISSION_ACTIVE) {
        gameState.transition(CoreModules.STATES.FREE_ROAM);
      }
      const isRunning = typeof running !== 'undefined' ? !!running : true;
      return isRunning;
    },
    onPausePhysics: () => {
      wasRunningBeforePhoto = typeof running !== 'undefined' ? !!running : true;
      if (typeof running !== 'undefined') running = false;
      win.photoModeActive = true;
      if (win.NeonPhone?.isOpen) win.NeonPhone.close();
      win.clearControls?.();
      win.updateTouchUI?.();
    },
    onResumePhysics: () => {
      win.photoModeActive = false;
      if (typeof running !== 'undefined') running = wasRunningBeforePhoto;
      if (typeof firstFrame !== 'undefined') firstFrame = true;
      if (typeof last !== 'undefined' && win.performance) last = win.performance.now();
      win.sceneDirty = true;
      win.updateHUD?.();
      win.updateTouchUI?.();
    },
    onToast: (msg) => {
      if (typeof toast === 'function') toast(msg);
    }
  }).mount();
  win.NeonPhotoMode = photoMode;

  const phone = new PhoneModule.Smartphone({
    doc,
    win,
    eventBus: bus,
    garageManager: garage,
    handlers: {
      canOpen: () => {
        const isRunning = typeof running !== 'undefined' ? running : true;
        return isRunning && !win.photoModeActive;
      },
      getCash: () => {
        syncSaveCashFromGame();
        return typeof cash === 'number' ? cash : saveMgr.getData().cash;
      },
      getMissions: () => {
        if (!win.NeonMissions?.getMissionList) return [];
        const items = win.NeonMissions.getMissionList().map((m) => ({
          id: m.id,
          category: 'story',
          act: m.act,
          title: m.title,
          subtitle: `${m.stars > 0 ? '★'.repeat(m.stars) + ' ' : ''}${m.subtitle}`,
          stars: m.stars,
          rewardCash: m.rewardCash,
          timeLimitSec: m.timeLimitSec,
          vehicleId: m.vehicleId,
          chapterTag: m.chapterTag,
          storyHook: m.storyHook,
          steps: m.steps,
          hasOnFootStage: m.hasOnFootStage,
          unlocked: m.unlocked,
          completed: m.completed
        }));
        const dailies = win.NeonDailyMissions?.getTasks?.() || [];
        for (const d of dailies) {
          items.push({
            id: `DAILY:${d.id}`,
            category: 'daily',
            title: `DAILY · ${d.title}`,
            subtitle: `${d.description} (${Math.round(d.progress)}/${d.target} · +Rs ${d.rewardCash})`,
            rewardCash: d.rewardCash,
            unlocked: true,
            completed: !!d.completed
          });
        }
        const challenges = win.NeonChallenges?.getChallengeList?.() || [];
        for (const ch of challenges) {
          items.push({
            id: `CHALLENGE:${ch.id}`,
            category: 'challenge',
            title: `CHALLENGE · ${ch.title}`,
            subtitle: `${ch.shortDesc} (+Rs ${ch.rewardCash})`,
            rewardCash: ch.rewardCash,
            unlocked: true,
            completed: !!ch.completed
          });
        }
        if (win.NeonSideHustles) {
          items.push(
            { id: 'HUSTLE:VIP_TAXI', category: 'hustle', title: 'HUSTLE · VIP Taxi Escort', subtitle: 'Pick up & drop off VIP clients for fares + clean-drive tips', unlocked: true, completed: false },
            { id: 'HUSTLE:POLICE_VIGILANTE', category: 'hustle', title: 'HUSTLE · Police Vigilante (C12)', subtitle: 'Intercept fleeing suspects in NBPD Interceptor', unlocked: true, completed: false }
          );
        }
        return items;
      },
      onStartMission: (id) => {
        if (typeof id === 'string') {
          if (id.startsWith('CHALLENGE:')) {
            win.NeonChallenges?.startChallenge?.(id.slice(10));
            return;
          }
          if (id === 'HUSTLE:VIP_TAXI') {
            win.NeonSideHustles?.startVipTaxi?.();
            return;
          }
          if (id === 'HUSTLE:POLICE_VIGILANTE') {
            win.NeonSideHustles?.startVigilante?.();
            return;
          }
          if (id.startsWith('DAILY:')) {
            const taskId = id.slice(6);
            const t = win.NeonDailyMissions?.getTasks?.()?.find((x) => x.id === taskId);
            if (t && typeof toast === 'function') {
              toast(`DAILY: ${t.title} (${Math.round(t.progress)}/${t.target})`);
            }
            return;
          }
          if (win.NeonMissions?.startMission) {
            win.NeonMissions.startMission(id);
          }
        }
      },
      getRadioStations: () => PhoneModule.RADIO_STATIONS_SPEC,
      getActiveStation: () => (win.radioStation || 0),
      onTuneRadio: (idx, st) => {
        win.audioStart?.();
        win.radioStation = idx;
        bus.emit('audio:syncStation', { index: idx, station: st });
        win.NeonHUD?.showRadioToast?.(st.name, st.caption || '');
        if (typeof toast === 'function') toast(`RADIO: ${st.name}`);
      },
      getQuality: () => win.NeonPerf?.quality || saveMgr.getData().settings?.graphicsQuality || 'low',
      onSetQuality: (q) => {
        win.NeonPerf?.setQuality?.(q);
        if (typeof toast === 'function') toast(`GRAPHICS: ${String(q).toUpperCase()}`);
        win.updateTouchUI?.();
      },
      getHudOpacity: () => saveMgr.getData().settings?.hudOpacity || 'glass',
      onSetHudOpacity: (mode) => {
        const next = win.setHudOpacity?.(mode) || saveMgr.setHudOpacity?.(mode) || mode;
        if (typeof toast === 'function') toast(`HUD OPACITY: ${String(next).toUpperCase()}`);
      },
      getSteerMode: () => win.NeonTouch?._steerMode || saveMgr.getData().settings?.steerMode || 'joystick',
      onSetSteerMode: (mode) => {
        const clean = mode === 'buttons' ? 'buttons' : 'joystick';
        saveMgr.setSteerMode?.(clean);
        win.NeonTouch?.setSteerMode?.(clean, false);
        if (typeof toast === 'function') toast(clean === 'buttons' ? 'CONTROLS: STEER BUTTONS' : 'CONTROLS: VIRTUAL JOYSTICK');
      },
      getMuted: () => !!win.NeonAudio?.muted,
      onToggleMute: () => {
        const nextMuted = !win.NeonAudio?.muted;
        win.NeonAudio?.setMuted?.(nextMuted);
        if (typeof toast === 'function') toast(nextMuted ? 'SOUND MUTED' : 'SOUND ON');
        win.updateTouchUI?.();
      },
      onOpenMap: () => {
        win.NeonMinimap?.toggleFullMap?.(true);
      },
      t: (key, fallback) => win.NeonI18n?.t?.(key) ?? fallback,
      getLanguage: () => win.NeonI18n?.getLanguage?.() || saveMgr.getData().settings?.language || 'en',
      onSetLanguage: (code) => {
        const res = win.NeonI18n?.setLanguage?.(code);
        if (typeof toast === 'function') toast(`LANGUAGE: ${String(res?.locale || code).toUpperCase()}`);
      },
      onShareCard: () => {
        const res = win.NeonShareCard?.shareOrDownload?.();
        if (res && typeof toast === 'function') toast(`SCORE CARD READY (${res.stats?.completedCount || 0}/20)`);
      },
      onSuperJump: (enabled, mult) => {
        win._jumpMultiplier = mult;
        if (typeof toast === 'function') toast(`CHEAT 9999: Super Jump ${enabled ? 'ON (2.5x)' : 'OFF'}`);
        win.audioCue?.('collect');
      },
      onSpawnGolden: () => {
        return garage.spawnGoldenSupercar();
      },
      onClearWanted: () => {
        win.clearWanted?.('CHEAT 0000: Police Wanted Cleared!');
        win.NeonPolice?.clearWanted?.('cheat-0000');
        if (typeof toast === 'function') toast('CHEAT 0000: Police Wanted Cleared!');
        win.audioCue?.('success');
      },
      onMoonGravity: (enabled, scale) => {
        win._gravityScale = scale;
        if (typeof toast === 'function') toast(`CHEAT 5555: Moon Gravity ${enabled ? 'ON (0.35x)' : 'OFF'}`);
        win.audioCue?.('collect');
      },
      onOpenPhotoMode: () => {
        const hasActiveMission = !!win.NeonMissions?.isActive?.();
        if (hasActiveMission && gameState.getState() === CoreModules.STATES.FREE_ROAM) {
          gameState.transition(CoreModules.STATES.MISSION_ACTIVE);
        } else if (!hasActiveMission && gameState.getState() === CoreModules.STATES.MISSION_ACTIVE) {
          gameState.transition(CoreModules.STATES.FREE_ROAM);
        }
        photoMode.enter();
      }
    }
  }).mount();
  win.NeonPhone = phone;

  // Bind KeyP shortcut to toggle Smartphone alongside Tab/KeyI
  win.addEventListener('keydown', (e) => {
    const tag = e.target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.code === 'KeyP') {
      e.preventDefault();
      phone.toggle('home');
    }
  });

  // Keep cash synced when Smartphone Garage unlocks or upgrades vehicles
  const syncCash = () => {
    const newCash = saveMgr.getData().cash;
    if (typeof cash === 'number') cash = newCash;
    if (typeof persist === 'function') persist();
    win.updateHUD?.();
  };
  bus.on('garage:vehicleUnlocked', syncCash);
  bus.on('vehicle:customize', syncCash);

  // Expose Photo Mode launcher helper matching mission/free-roam GameState
  win.togglePhotoMode = () => {
    if (photoMode.active) return photoMode.exit();
    const hasActiveMission = !!win.NeonMissions?.isActive?.();
    if (hasActiveMission && gameState.getState() === CoreModules.STATES.FREE_ROAM) {
      gameState.transition(CoreModules.STATES.MISSION_ACTIVE);
    } else if (!hasActiveMission && gameState.getState() === CoreModules.STATES.MISSION_ACTIVE) {
      gameState.transition(CoreModules.STATES.FREE_ROAM);
    }
    return photoMode.enter();
  };

  return { bus, saveMgr, gameState, garage, phone, photoMode };
}
