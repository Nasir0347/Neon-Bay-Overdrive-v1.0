/**
 * Runtime Bridge connecting `AudioManager` and `PerformanceManager` (Quality toggle,
 * Half-Resolution Bloom `w/2 x h/2`, InstancedMesh prop batches, explicit `.dispose()`
 * vehicle cleanup, VRAM estimator, and LazyChunkLoader) into the live Three.js engine.
 * Pure zero-import ES Module.
 */

export function initRuntimeAudioPerf({
  AudioModule,
  PerfModule,
  win = globalThis.window,
  doc = globalThis.document
} = {}) {
  if (!win || !doc || !AudioModule || !PerfModule) return null;

  const bus = win.NeonEventBus || null;
  const saveMgr = win.NeonSave || null;
  const audio = new AudioModule.AudioManager({
    win,
    doc,
    eventBus: bus,
    saveManager: saveMgr
  }).bindVisibilityListener();
  win.NeonAudio = audio;
  win.radioStations = AudioModule.NEON_RADIO_STATIONS;
  win.radioStation = audio.activeStationIndex;

  const perf = new PerfModule.PerformanceManager({
    THREE_ref: globalThis.THREE || null,
    gl: typeof gl !== 'undefined' ? gl : null,
    saveManager: saveMgr,
    eventBus: bus,
    doc,
    win,
    preserveTextures: win.cityEnvMap ? [win.cityEnvMap] : []
  });
  win.NeonPerf = perf;

  // Pre-allocate 2 batched InstancedMesh city prop groups ONCE at boot (zero runtime churn)
  if (typeof THREE !== 'undefined' && typeof scene !== 'undefined') {
    const bollardTransforms = [];
    for (let i = 0; i < 64; i++) {
      bollardTransforms.push({
        x: -900 + i * 28.5,
        y: 0.45,
        z: -910,
        color: i % 2 === 0 ? '#00f0ff' : '#ff007f'
      });
    }
    const bollardBatch = perf.registerBatcher(new PerfModule.InstancedPropBatcher({
      THREE_ref: THREE,
      geometry: new THREE.CylinderGeometry(0.14, 0.18, 0.9, 8),
      material: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
      transforms: bollardTransforms,
      name: 'NeonCoastBollards'
    }));
    if (bollardBatch.mesh) scene.add(bollardBatch.mesh);

    const pylonTransforms = [];
    for (let i = 0; i < 16; i++) {
      const z = -600 + i * 80;
      pylonTransforms.push({ x: -314, y: 1.5, z, color: '#00f0ff' });
      pylonTransforms.push({ x: 314, y: 1.5, z, color: '#ff007f' });
    }
    const pylonBatch = perf.registerBatcher(new PerfModule.InstancedPropBatcher({
      THREE_ref: THREE,
      geometry: new THREE.BoxGeometry(0.32, 3.0, 0.32),
      material: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
      transforms: pylonTransforms,
      name: 'NeonBoulevardPylons'
    }));
    if (pylonBatch.mesh) scene.add(pylonBatch.mesh);
  }

  let syncingQuality = false;
  perf.onQualitySync = (rawQ, width, height) => {
    if (syncingQuality) return perf.getReport();
    syncingQuality = true;
    try {
      const w = Number.isFinite(width) ? width : (typeof W === 'number' ? W : 960);
      const h = Number.isFinite(height) ? height : (typeof H === 'number' ? H : 540);
      const res = perf.setQuality(rawQ, w, h);
      win.NeonHUD?.setQualityPreset?.(res.quality);
      return res;
    } finally {
      syncingQuality = false;
    }
  };

  const baseSetQuality = perf.setQuality.bind(perf);
  perf.setQuality = (rawQuality, width, height) => {
    const q = PerfModule.normalizeQualityId(rawQuality);
    const w = Number.isFinite(width) ? width : (typeof W === 'number' ? W : 960);
    const h = Number.isFinite(height) ? height : (typeof H === 'number' ? H : 540);
    const out = baseSetQuality(q, w, h);
    if (!syncingQuality && typeof setQuality === 'function') {
      syncingQuality = true;
      try {
        setQuality(q, false);
        const w2 = typeof W === 'number' ? W : w;
        const h2 = typeof H === 'number' ? H : h;
        baseSetQuality(q, w2, h2);
      } finally {
        syncingQuality = false;
      }
    }
    win.NeonHUD?.setQualityPreset?.(q);
    return out;
  };

  // Sync saved quality preference cleanly at startup
  const legacyQ = typeof settings !== 'undefined' ? settings.quality : null;
  const initialSavedQ = saveMgr?.getData?.()?.settings?.graphicsQuality || 'low';
  if (legacyQ === 'ultra' && initialSavedQ === 'high') {
    baseSetQuality('high', typeof W === 'number' ? W : 1920, typeof H === 'number' ? H : 1080);
    win.NeonHUD?.setQualityPreset?.('high');
  } else if (initialSavedQ !== 'low' && typeof setQuality === 'function') {
    perf.setQuality(initialSavedQ);
  } else {
    baseSetQuality(initialSavedQ, typeof W === 'number' ? W : 960, typeof H === 'number' ? H : 540);
  }

  // Authoritative global audio helpers routed directly through AudioManager
  win.audioStart = () => {
    if (!audio.muted && (typeof settings === 'undefined' || ((settings.master ?? 1) > 0 && (settings.sound ?? 0.45) > 0))) {
      audio.unlock();
      win.NeonAudioUnlocked = true;
    }
  };
  win.audioCue = (type) => audio.playCue(type);
  win.playCrash = (intensity = 0.6) => audio.playCrash(intensity);
  win.playNosBurst = () => audio.playNosBurst();
  win.playTurboPop = () => audio.playTurboPop();
  win.playDoorSound = (mode) => audio.playDoorSound(mode);
  win.horn = () => audio.playHorn();
  win.cycleRadio = () => {
    const st = audio.cycleStation();
    win.radioStation = audio.activeStationIndex;
    win.NeonHUD?.showRadioToast?.(st.name, st.caption || '');
    return st;
  };

  // Keep Radio station synced across Smartphone -> AudioManager
  bus?.on?.('ui:phoneAction', (p) => {
    if (p?.app === 'radio' && p?.action === 'navigate') {
      audio.setStation(win.radioStation || 0);
    }
  });
  bus?.on?.('audio:syncStation', ({ index }) => {
    audio.setStation(index || 0);
  });

  function update(dt) {
    const curRunning = typeof running !== 'undefined' ? !!running : true;
    const curInCar = typeof inCar !== 'undefined' ? !!inCar : false;
    const curVel = typeof velocity !== 'undefined' ? velocity : 0;
    const curRide = typeof ride === 'string' ? ride : 'sedan';
    const vehType = curRide === 'cruiser' ? 'sedan'
      : curRide === 'pickup' ? 'muscle'
      : (curRide === 'car' ? 'sedan' : curRide);

    const isWanted = typeof wanted !== 'undefined' ? !!wanted : false;
    const activeCops = win.NeonPolice?.getActivePoliceCoords?.() || [];
    let copDist = 40;
    if (activeCops.length > 0 && typeof player !== 'undefined') {
      copDist = Math.hypot(activeCops[0].x - player.x, activeCops[0].z - player.z);
    }

    if (typeof win.radioStation === 'number' && win.radioStation !== audio.activeStationIndex) {
      audio.setStation(win.radioStation);
    }

    audio.update(dt, {
      running: curRunning,
      inCar: curInCar,
      speedKmh: Math.abs(curVel) * 3.6,
      vehicleType: vehType,
      nitro: !!win.nosActive,
      driftAmount: win.driftAmount || 0,
      sirenActive: isWanted || !!(curInCar && win.cityVehicles?.[curRide]?.siren),
      wantedLevel: win.wantedLevel || 0,
      sirenDistanceM: copDist
    });
  }

  return { audio, perf, update };
}
