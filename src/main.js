/**
 * NEON BAY: OVERDRIVE — Master V1.0 Application Entry Orchestrator (`src/main.js`)
 * Wires all 10 Prompt Engineering Modules (`EventBus`, `SaveManager`, `GameState`,
 * `InputManager`, `DrivingJuice`, `GarageManager`, `Smartphone`, `PhotoMode`,
 * `AudioManager`, `PerformanceManager`, `PoliceManager`, `TrafficManager`,
 * `Destructibles`, `VehicleDamage`, `EnvironmentFX`, `HUD`, `Minimap`,
 * `TouchControls`, `MissionManager`, `DailyMissions`, `ChallengeModes`,
 * `SideHustles`, `AdManager`, `I18nManager`, `ShareCardGenerator`) into the
 * live Three.js render and update loop.
 */

export function initNeonBayApp({
  CoreModules,
  InputModule,
  DrivingJuiceModule,
  GarageModule,
  PhoneModule,
  PhotoModule,
  FeaturesWiringModule,
  AudioModule,
  PerfModule,
  AudioPerfWiringModule,
  PoliceModule,
  TrafficModule,
  DestructiblesModule,
  DamageModule,
  WorldWiringModule,
  EnvFXModule,
  HUDModule,
  MinimapModule,
  UIWiringModule,
  TouchModule,
  MissionsConfigModule,
  MissionManagerModule,
  DailyMissionsModule,
  ChallengeModesModule,
  SideHustlesModule,
  MissionsWiringModule,
  AdModule,
  I18nModule,
  ShareModule,
  ReleaseWiringModule,
  win = globalThis.window,
  doc = globalThis.document
} = {}) {
  if (!win || !doc) return null;

  // 1. Core Features: EventBus, SaveManager, GameState, GarageManager, Smartphone, PhotoMode
  const featuresRuntime = FeaturesWiringModule?.initRuntimeFeatures?.({
    CoreModules,
    GarageModule,
    PhoneModule,
    PhotoModule,
    win,
    doc
  });

  const bus = win.NeonEventBus;

  // 2. Unified InputManager (Keyboard + Mobile Touch + Gamepad + 1-Tap Audio Unlock)
  let inputManager = null;
  if (InputModule?.InputManager) {
    inputManager = new InputModule.InputManager({ eventBus: bus });
    inputManager.attachKeyboard(win);
    inputManager.bindAudioUnlock(
      () => win.NeonAudio?.getOrCreateContext?.() || null,
      () => {
        win.NeonAudio?.unlock?.();
        win.NeonAudioUnlocked = true;
      },
      win
    );
    win.NeonInput = inputManager;
  }

  // 3. Driving Juice (CameraShake, SlowMotionController, ParticlePool, Dynamic FOV, Flip Car)
  let drivingJuice = null;
  if (DrivingJuiceModule) {
    drivingJuice = {
      cameraShake: new DrivingJuiceModule.CameraShake(),
      slowMo: new DrivingJuiceModule.SlowMotionController(),
      smokePool: new DrivingJuiceModule.ParticlePool(64),
      skidPool: new DrivingJuiceModule.ParticlePool(80),
      computeDynamicFov: DrivingJuiceModule.computeDynamicFov,
      flipCar: DrivingJuiceModule.flipCar
    };
    win.NeonDrivingJuice = drivingJuice;
    win.triggerCameraShake = (amp = 0.25, dur = 0.22) => drivingJuice.cameraShake.trigger(amp, dur);
  }

  // 4. Audio & Performance Manager (Low/Med/High, Half-Res Bloom, InstancedMesh, .dispose())
  const audioPerfRuntime = AudioPerfWiringModule?.initRuntimeAudioPerf?.({
    AudioModule,
    PerfModule,
    win,
    doc
  });

  // 5. Living Open World (1-5★ PoliceManager, Object-Pooled TrafficManager, Destructibles, Damage)
  const worldRuntime = WorldWiringModule?.initRuntimeWorld?.({
    PoliceModule,
    TrafficModule,
    DestructiblesModule,
    DamageModule,
    win,
    doc
  });

  // 6. Environment FX (Day/Night Cycle, Wet Neon Rain, 4 Merged 3D Stunt Ramps)
  let envFx = null;
  if (EnvFXModule?.EnvironmentFX) {
    envFx = new EnvFXModule.EnvironmentFX({
      win,
      doc,
      saveManager: win.NeonSave,
      eventBus: bus,
      drivingJuice,
      audioManager: win.NeonAudio
    }).mountScene(globalThis.THREE);
    win.NeonEnvFX = envFx;
    win.worldClock = envFx.worldClock;
    win.stuntRamps = envFx.stuntRamps;
    win.computeAtmosphere = (time, dt, prevFestive) => {
      const atm = envFx.computeAtmosphere(time, dt, prevFestive ?? 0.82, {
        playTime: typeof playTime !== 'undefined' ? playTime : 0,
        running: typeof running !== 'undefined' ? !!running : true,
        activeMission: win.NeonMissions?.activeMission || null
      });
      return {
        nightAlpha: atm.festive,
        dusk: atm.dusk,
        rainIntensity: atm.rain,
        lightningFlash: atm.lightning
      };
    };
    win.updateVehicleJump = (veh, effDt, curVelocity) => {
      const spec = win.vehicleSpecs?.[typeof ride === 'string' ? ride : 'car'];
      return envFx.updateVehicleJump(veh, spec, effDt, {
        speed: curVelocity ?? (typeof velocity !== 'undefined' ? velocity : 0),
        activeMission: win.NeonMissions?.activeMission || null,
        onJumpLaunch: () => {
          bus?.emit?.('physics:jumpLaunch', {});
          if (typeof toast === 'function') toast('STUNT JUMP!');
        },
        onJumpLanded: (airDist, bonus) => {
          if (typeof cash === 'number' && win.NeonSave) {
            cash = win.NeonSave.getData().cash;
          }
          if (typeof toast === 'function') toast(`STUNT JUMP LANDED! ${airDist}m · +Rs ${bonus}`);
          win.updateHUD?.();
        }
      });
    };
  }

  // 7. Story Campaign (20 Missions) + Daily Missions + Viral Challenges + Easter Eggs + Side Hustles
  const missionsRuntime = MissionsWiringModule?.initRuntimeMissions?.({
    MissionsConfigModule,
    MissionManagerModule,
    DailyMissionsModule,
    ChallengeModesModule,
    SideHustlesModule,
    win,
    doc
  });

  // 8. Miami Neon Glassmorphism HUD & Rotating 2D GPS Minimap
  const uiRuntime = UIWiringModule?.initRuntimeUI?.({
    HUDModule,
    MinimapModule,
    win,
    doc
  });

  // 9. Mobile Touch Controls Overlay (>= 48x48px ergonomic targets + pinch-zoom lock)
  let touchControls = null;
  if (TouchModule?.TouchControls) {
    const isMob = typeof mobileMode !== 'undefined' ? !!mobileMode : false;
    const savedSteerMode = win.NeonSave?.getData?.()?.settings?.steerMode || 'joystick';
    touchControls = new TouchModule.TouchControls({
      doc,
      win,
      inputManager,
      isMobile: isMob,
      steerMode: savedSteerMode,
      handlers: {
        onOpenPhone: () => win.NeonPhone?.toggle?.('home'),
        onFlip: () => win.flipCar?.(),
        onCenterCamera: () => {
          if (typeof win.toggleCameraView === 'function') {
            win.toggleCameraView();
          } else {
            if (typeof frontView !== 'undefined') frontView = !frontView;
            if (typeof lookYaw !== 'undefined' && typeof player !== 'undefined') lookYaw = player.yaw;
            if (typeof toast === 'function') toast(typeof frontView !== 'undefined' && frontView ? 'Front camera' : 'Chase camera');
          }
        },
        onCycleRadio: () => {
          const st = win.NeonAudio?.cycleStation?.();
          if (st) {
            win.radioStation = win.NeonAudio.activeStationIndex;
            win.NeonHUD?.showRadioToast?.(st.name, st.genre || '');
          }
        },
        onCycleQuality: () => {
          const order = ['low', 'medium', 'high'];
          const cur = win.NeonPerf?.quality || 'low';
          const next = order[(order.indexOf(cur) + 1) % order.length];
          win.NeonPerf?.setQuality?.(next);
          if (typeof toast === 'function') toast(`GRAPHICS: ${next.toUpperCase()}`);
          win.updateTouchUI?.();
        },
        onTogglePhoto: () => win.togglePhotoMode?.(),
        onTogglePause: () => (typeof win.togglePauseMenu === 'function' ? win.togglePauseMenu() : win.NeonPhone?.toggle?.('home')),
        onToggleLights: () => win.toggleVehicleLights?.(),
        onHorn: () => {
          win.horn?.();
          if (typeof player !== 'undefined') win.NeonTraffic?.reactToHorn?.(player);
        },
        onOpenMap: () => win.NeonMinimap?.toggleFullMap?.(),
        onOpenGarage: () => win.NeonPhone?.open?.('garage'),
        onOpenMissions: () => win.NeonPhone?.open?.('missions'),
        onToggleMute: () => {
          const nextMuted = !win.NeonAudio?.muted;
          win.NeonAudio?.setMuted?.(nextMuted);
          if (typeof toast === 'function') toast(nextMuted ? 'SOUND MUTED' : 'SOUND ON');
          win.updateTouchUI?.();
        },
        onSteerModeChange: (mode) => {
          win.NeonSave?.setSteerMode?.(mode);
          if (typeof toast === 'function') toast(mode === 'buttons' ? 'CONTROLS: STEER BUTTONS' : 'CONTROLS: VIRTUAL JOYSTICK');
        },
        onInteractVehicle: () => win.interactVehicle?.(),
        onCallVehicle: () => win.flipCar?.(),
        onJump: () => win.triggerPlayerJump?.(),
        onLookDelta: (dx) => win.adjustLookYaw?.(dx)
      }
    }).mount();
    win.NeonTouch = touchControls;
    if (!isMob) {
      doc.body.classList.remove('mobile', 'input-touch');
      doc.body.classList.add('input-kb');
    }
    win.updateTouchUI = () =>
      touchControls.update({
        running: (typeof running !== 'undefined' ? !!running : true) && !win.NeonPhone?.isOpen && !win.NeonMinimap?.fullMapOpen && !win.photoModeActive,
        inCar: typeof inCar !== 'undefined' ? !!inCar : true,
        nearbyVehicleName: win.getNearbyVehicle?.()?.name || '',
        quality: win.NeonPerf?.quality || 'low',
        nosActive: !!win.nosActive,
        nosCharge: win.nosCharge ?? 100,
        isEmergency: typeof ride === 'string' && ride === 'cruiser',
        muted: !!win.NeonAudio?.muted,
        headlightsOn: !!win.headlightsOn
      });
    win.resetTouch = () => touchControls.reset();
  }

  // 10. Monetization (CrazyGames/Poki/AdMob), Multi-Language i18n (6 Locales), Viral Score Card
  const releaseRuntime = ReleaseWiringModule?.initRuntimeRelease?.({
    AdModule,
    I18nModule,
    ShareModule,
    win,
    doc
  });

  // 11. Direct Boot into NEON BAY: OVERDRIVE (Rico Vega in C01 Kuro Civic-X at Apex Core)
  const saveData = win.NeonSave?.getData?.() || { cash: 500, selectedVehicle: 'C01' };
  if (typeof cash !== 'undefined') {
    cash = Number.isFinite(saveData.cash) ? saveData.cash : 500;
  }
  win.nosCharge = 100;
  win.nosActive = false;

  const selectedSpec = win.NeonGarage?.getSelectedVehicle?.() || win.NeonGarage?.getVehicle?.('C01');
  if (selectedSpec && win.NeonGarage) {
    const key = (selectedSpec.runtimeKey && win.cityVehicles?.[selectedSpec.runtimeKey])
      ? selectedSpec.runtimeKey
      : 'car';
    const veh = win.cityVehicles?.[key];
    if (veh) {
      veh.x = 0;
      veh.z = -20;
      veh.yaw = Math.PI;
      veh.hp = 100;
      if (typeof ride !== 'undefined') ride = key;
      if (typeof inCar !== 'undefined') inCar = true;
      if (typeof player !== 'undefined') {
        player.x = veh.x;
        player.z = veh.z;
        player.yaw = veh.yaw;
      }
      win.parkOtherHeroVehiclesClearOf?.(key, veh.x, veh.z);
    }
    const cfg = win.NeonGarage.getCustomization(selectedSpec.id);
    const stats = win.NeonGarage.getEffectiveStats(selectedSpec.id);
    win.NeonGarage.onApplyVisuals?.(selectedSpec, cfg, stats);
  }

  if (typeof running !== 'undefined') running = true;
  if (typeof firstFrame !== 'undefined') firstFrame = true;
  win._bootOrbitActive = true;

  // 12. Master Frame Update & Render Hooks called by game.js and world3d.js
  win.updateNeonSystems = (dt) => {
    inputManager?.pollGamepad?.();
    worldRuntime?.update?.(dt);
    missionsRuntime?.update?.(dt);
    audioPerfRuntime?.update?.(dt);
  };

  win.renderNeonSystems = (time, dt) => {
    envFx?.render?.(dt, {
      player: typeof player !== 'undefined' ? player : { x: 0, z: 0 },
      running: typeof running !== 'undefined' ? !!running : true
    });
    win.NeonVehicles?.renderVehicles?.(time, dt);
    worldRuntime?.render?.(time, dt);
  };

  win.updateHUD?.();
  win.updateTouchUI?.();
  win.drawCityMap?.();
  win.resumeSavedMission?.();
  win.gameReady = true;

  return {
    featuresRuntime,
    inputManager,
    drivingJuice,
    audioPerfRuntime,
    worldRuntime,
    envFx,
    missionsRuntime,
    uiRuntime,
    touchControls,
    releaseRuntime
  };
}
