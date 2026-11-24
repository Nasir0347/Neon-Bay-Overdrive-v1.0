/**
 * Runtime Bridge connecting `src/ui/HUD.js` and `src/ui/Minimap.js`
 * into the live NEON BAY: OVERDRIVE engine.
 */

export function initRuntimeUI({ HUDModule, MinimapModule, win = globalThis.window, doc = globalThis.document } = {}) {
  if (!win || !doc || !HUDModule || !MinimapModule) return null;

  const hud = new HUDModule.HUD({
    doc,
    win,
    eventBus: win.NeonEventBus || null,
    onLayoutChange: (layout) => {
      win._portraitFovBonus = layout.portraitFovBonus;
      win.fitCamera?.();
      win.sceneDirty = true;
    }
  }).mount();

  const minimap = new MinimapModule.Minimap({
    doc,
    win,
    radarCanvas: doc.getElementById('map'),
    mapWrap: doc.getElementById('mapWrap'),
    eventBus: win.NeonEventBus || null,
    canToggle: () => {
      const isRunning = typeof running !== 'undefined' ? running : true;
      return isRunning && !win.photoModeActive;
    },
    onToggle: () => {
      win.sceneDirty = true;
    }
  }).mount();

  win.NeonHUD = hud;
  win.NeonMinimap = minimap;

  // Apply initial graphics preset blur toggle
  if (typeof settings !== 'undefined' && settings?.quality) {
    hud.setQualityPreset(settings.quality);
  }

  // Authoritative rotating 2D GPS minimap renderer (throttled to ~20Hz on mobile for 60 FPS headroom)
  let mobileMapTick = 0;
  win.drawCityMap = () => {
    if (doc.body.classList.contains('mobile') && !minimap.isExpanded && (++mobileMapTick % 3 !== 0)) return;
    const p = typeof player !== 'undefined' ? player : null;
    if (!p || typeof CityLayout === 'undefined') return;

    const isInCar = typeof inCar !== 'undefined' ? inCar : false;
    const yaw = typeof lookYaw !== 'undefined' ? lookYaw : 0;
    const isFront = typeof frontView !== 'undefined' ? frontView : false;
    const heading = isInCar ? p.yaw : yaw + (isFront ? Math.PI : 0);
    const targets = typeof activeTargets === 'function' ? activeTargets() : [];
    const primaryTarget = targets[0] || null;
    const routePoints = primaryTarget
      ? ((primaryTarget.z < -908 && p.z < -880) ? [p, primaryTarget] : CityLayout.route(p, primaryTarget))
      : [];

    const vehicles = [];
    const pushVeh = (pos, color, radius = 2.1) => {
      if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.z)) {
        vehicles.push({ pos, color, radius });
      }
    };
    const cv = win.cityVehicles || {};
    pushVeh(cv.car, '#00F0FF', 2.0);
    pushVeh(cv.bike, '#7fd3dd', 2.0);
    pushVeh(cv.sports, '#FF007F', 2.1);
    pushVeh(cv.muscle, '#FF5500', 2.1);
    pushVeh(cv.pickup, '#a4b87a', 2.1);
    pushVeh(cv.cruiser, '#6d9ae8', 2.1);
    pushVeh(cv.supercar, '#FFD700', 2.3);
    pushVeh(cv.suv, '#38F288', 2.2);
    pushVeh(cv.superbike, '#B100FF', 2.0);

    const policeUnits = win.NeonPolice?.getActivePoliceCoords?.() || [];

    minimap.render({
      player: p,
      heading,
      playTime: typeof playTime !== 'undefined' ? playTime : 0,
      wanted: typeof wanted !== 'undefined' ? wanted : false,
      wantedLevel: win.wantedLevel || 0,
      buildings: typeof buildings !== 'undefined' ? buildings : [],
      roadAxes: CityLayout.axes,
      sites: [],
      shops: [],
      foodVenues: [],
      vehicles,
      policeUnits,
      targets,
      routePoints,
      roadblock: win.NeonPolice?.roadblocks?.[0] || null,
      heli: win.NeonPolice?.helicopter || null,
      extraDrawHooks: []
    });

    const mapSpan = doc.querySelector('#mapWrap span');
    if (mapSpan) {
      const district = HUDModule.resolveNeonDistrict(p.x, p.z);
      const compact = doc.body.classList.contains('mobile') || doc.body.classList.contains('portrait');
      const mapTag = win.NeonI18n?.t?.('hud.minimapTap') || 'MAP (M)';
      mapSpan.textContent = compact ? (win.NeonI18n?.t?.('hud.map') || 'MAP') : `${district.name.toUpperCase()} · ${mapTag}`;
    }
  };

  let lastDistrictId = null;
  let lastStreetToastTime = 0;

  // Authoritative Neon Bay HUD updater
  let lastHudTime = win.performance?.now?.() || Date.now();
  const authoritativeUpdateHUD = () => {
    const now = win.performance?.now?.() || Date.now();
    const isRunning = typeof running !== 'undefined' ? !!running : true;
    const dt = isRunning ? Math.min(0.1, Math.max(0.001, (now - lastHudTime) / 1000)) : 0;
    lastHudTime = now;
    const tr = (key, fb) => {
      const val = win.NeonI18n?.t?.(key);
      return val && val !== key ? val : fb;
    };

    const p = typeof player !== 'undefined' ? player : { x: 0, z: 0 };
    const spd = typeof velocity !== 'undefined' ? Math.abs(velocity) * 3.6 : 0;
    const isWanted = typeof wanted !== 'undefined' ? !!wanted : false;
    const curCash = typeof cash !== 'undefined' ? cash : 0;
    const isInCar = typeof inCar !== 'undefined' ? !!inCar : false;
    const timerSeconds = win.NeonMissions?.isActive?.() ? win.NeonMissions.remainingTimeSec : null;

    if (spd > 2 && win._bootOrbitActive) {
      win.dismissBootOverlay?.();
    }

    hud.update({
      cash: curCash,
      currency: 'Rs ',
      wanted: isWanted,
      wantedLevel: win.wantedLevel || 0,
      speedKmh: Math.round(spd),
      nosActive: !!win.nosActive,
      nosCharge: win.nosCharge || 0,
      drifting: (win.driftAmount || 0) > 0.25,
      x: p.x,
      z: p.z,
      running: isRunning,
      inCar: isInCar,
      timerSeconds,
      reducedEffects: typeof settings !== 'undefined' ? !!settings?.reducedEffects : false,
      quality: typeof settings !== 'undefined' ? settings?.quality : 'low'
    }, dt);

    const district = HUDModule.resolveNeonDistrict(p.x, p.z);
    const streetName = HUDModule.resolveNeonStreet(p.x, p.z);
    if (district && district.id !== lastDistrictId && now - lastStreetToastTime > 1200) {
      const firstInit = lastDistrictId === null;
      lastDistrictId = district.id;
      if (!firstInit) {
        lastStreetToastTime = now;
        hud.showDistrictToast(district, streetName);
      }
    }

    const districtSpan = doc.querySelector('.district span');
    if (districtSpan) {
      districtSpan.textContent = `${district.name.toUpperCase()} · ${streetName.toUpperCase()}${win.worldClock?.badge?.() || ''}`;
    }

    const objBanner = doc.getElementById('objectiveBanner');
    if (objBanner) {
      const directive = win.NeonMissions?.getPlainObjectiveBanner?.(p, win.NeonI18n)
        || tr('obj.freeRoam', 'FREE ROAM — DRIVE OR TAP MISSION');
      const objTextEl = doc.getElementById('objectiveBannerText') || objBanner;
      objTextEl.textContent = directive;
      objBanner.classList.toggle('active-mission', !!win.NeonMissions?.isActive?.());
      objBanner.hidden = !!win.photoModeActive;
    }

    const qEl = doc.getElementById('quality');
    if (qEl) {
      if (isWanted) {
        qEl.textContent = `WANTED ★${win.wantedLevel || 1}`;
      } else {
        const q = (win.NeonPerf?.quality || (typeof settings !== 'undefined' ? settings?.quality : 'low') || 'low').toUpperCase();
        qEl.textContent = `${q} GRAPHICS`;
      }
    }

    // Update #mission banner
    const eyebrow = doc.querySelector('#mission .eyebrow');
    const objEl = doc.getElementById('objective');
    const descEl = doc.getElementById('description');
    const tipEl = doc.getElementById('tip');
    const distEl = doc.getElementById('distance');
    const quickBtn = doc.getElementById('quickStartMissionBtn');

    if (win.NeonMissions?.isActive?.()) {
      const hs = win.NeonMissions.getHudState();
      if (hs) {
        if (eyebrow) eyebrow.textContent = `ACT ${hs.act} · ${hs.missionId}`;
        if (objEl) objEl.textContent = hs.title;
        if (descEl) descEl.textContent = hs.description;
        if (tipEl) tipEl.textContent = hs.tip;
        if (distEl && hs.target) {
          const d = Math.round(Math.hypot((hs.target.x || 0) - p.x, (hs.target.z || 0) - p.z));
          distEl.textContent = `${d}m`;
        }
      }
      if (quickBtn) quickBtn.hidden = true;
    } else if (win.NeonChallenges?.isActive?.()) {
      const ch = win.NeonChallenges.activeChallenge;
      const tgt = win.NeonChallenges.getActiveTarget?.();
      if (eyebrow) eyebrow.textContent = 'VIRAL CHALLENGE';
      if (objEl) objEl.textContent = ch?.title || 'CHALLENGE ACTIVE';
      if (descEl) descEl.textContent = ch?.shortDesc || 'Complete the viral challenge goal.';
      if (tipEl) tipEl.textContent = 'Hold SHIFT for Nitro · TAB for Phone';
      if (distEl && tgt) {
        distEl.textContent = `${Math.round(Math.hypot((tgt.x || 0) - p.x, (tgt.z || 0) - p.z))}m`;
      }
      if (quickBtn) quickBtn.hidden = true;
    } else {
      const savedMid = win.NeonSave?.getLastMission?.() || null;
      const nextId = savedMid?.id || win.NeonMissions?.getNextIncompleteMissionId?.() || 'M1';
      const nextM = win.NeonMissions?.getMission?.(nextId);
      if (eyebrow) eyebrow.textContent = savedMid?.id ? `SAVED MISSION · ACT ${nextM?.act || 1} · ${nextId}` : `NEXT MISSION · ACT ${nextM?.act || 1} · ${nextId}`;
      if (objEl) objEl.textContent = (nextM?.title || 'Neon Midnight Drop').toUpperCase();
      if (descEl) descEl.textContent = nextM?.objectiveSummary || 'Deliver the encrypted ledger south down Oceanic Boulevard to Pier 99.';
      const rewardTxt = nextM?.rewardCash ? `Reward: Rs ${Number(nextM.rewardCash).toLocaleString('en-US')}` : 'Reward: Rs 800';
      if (tipEl) tipEl.textContent = savedMid?.id ? `${rewardTxt} · Tap below to resume checkpoint` : `${rewardTxt} · 1-Click Instant Start`;
      const tgt = nextM?.checkpoints?.[0] || { x: 0, z: -910 };
      if (distEl) {
        distEl.textContent = `${Math.round(Math.hypot((tgt.x || 0) - p.x, (tgt.z || 0) - p.z))}m`;
      }
      if (quickBtn) {
        quickBtn.hidden = false;
        const actionLabel = savedMid?.id ? '▶ RESUME' : `▶ ${tr('hud.startMission', 'START')}`;
        quickBtn.textContent = `${actionLabel} ${nextId}: ${(nextM?.title || 'NEON MIDNIGHT DROP').toUpperCase()}`;
      }
    }

    // Telemetry & Circular Radial SVG Speedometer
    const telemetryEl = doc.getElementById('telemetry');
    const modeEl = doc.getElementById('mode');
    const speedEl = doc.getElementById('speed');
    const unitEl = doc.getElementById('unit');
    const gearPillEl = doc.getElementById('gearPill');
    const speedArcEl = doc.getElementById('speedArcFill');
    const nosArcEl = doc.getElementById('nosArcFill');
    const nosWrap = doc.getElementById('nosWrap');
    const nosFill = doc.getElementById('nosFill');
    const selectedVeh = win.NeonGarage?.getVehicle?.(win.NeonActiveVehicleId) || win.NeonGarage?.getSelectedVehicle?.();
    const vehLabel = isInCar ? (selectedVeh?.name || 'Kuro Civic-X').toUpperCase() : 'RICO VEGA · ON FOOT';
    const gear = isInCar ? ` · G${win.gearNow || 1}` : '';
    const nosBadge = isInCar && win.nosActive ? ' · NITRO' : '';
    const nosPct = Math.max(0, Math.min(100, Math.round(win.nosCharge ?? 100)));
    if (modeEl) modeEl.textContent = `${vehLabel}${gear}${nosBadge}`;
    if (gearPillEl) gearPillEl.textContent = isInCar ? `G${win.gearNow || 1}` : 'FOOT';
    if (speedEl) speedEl.textContent = String(Math.round(spd));
    if (unitEl) unitEl.textContent = tr('hud.kmh', 'KM/H');
    if (speedArcEl) {
      const spdRatio = Math.max(0, Math.min(1, spd / 280));
      speedArcEl.style.strokeDashoffset = (218.2 * (1 - spdRatio)).toFixed(1);
    }
    if (nosArcEl) {
      const nosRatio = isInCar ? nosPct / 100 : 0;
      nosArcEl.style.strokeDashoffset = (183.3 * (1 - nosRatio)).toFixed(1);
    }
    if (telemetryEl) {
      telemetryEl.classList.toggle('redline', isInCar && spd >= 180);
      telemetryEl.classList.toggle('nos-active', isInCar && !!win.nosActive);
      telemetryEl.classList.toggle('on-foot-gauge', !isInCar);
    }
    if (nosWrap) {
      nosWrap.hidden = !isInCar;
      nosWrap.classList.toggle('active', !!win.nosActive);
    }
    if (nosFill) {
      nosFill.style.width = `${nosPct}%`;
    }

    const hudPhoneBtn = doc.getElementById('hudPhoneBtn');
    if (hudPhoneBtn) hudPhoneBtn.textContent = tr('hud.phoneBtn', 'PHONE (P)');
    const hudMapBtn = doc.getElementById('hudMapBtn');
    if (hudMapBtn) hudMapBtn.textContent = tr('hud.minimapTap', 'MAP (M)');
    const hudPhotoBtn = doc.getElementById('hudPhotoBtn');
    if (hudPhotoBtn) hudPhotoBtn.textContent = `${tr('hud.photo', 'PHOTO')} (O)`;
    const hudPauseBtn = doc.getElementById('hudPauseBtn');
    if (hudPauseBtn) hudPauseBtn.textContent = `${tr('hud.pause', 'PAUSE')} (ESC)`;

    const bootMissionBtnEl = doc.getElementById('bootMissionBtn');
    if (bootMissionBtnEl) {
      const save = win.NeonSave?.getData?.() || {};
      const doneCount = Array.isArray(save.completedMissions) ? save.completedMissions.length : 0;
      const savedMid = win.NeonSave?.getLastMission?.() || null;
      const activeM = win.NeonMissions?.activeMission || null;
      if (activeM) {
        bootMissionBtnEl.textContent = `▶ ${tr('pause.resume', 'RESUME')} ${activeM.id}: ${activeM.title.toUpperCase()}`;
      } else if (savedMid?.id) {
        const mObj = win.NeonMissions?.getMission?.(savedMid.id);
        bootMissionBtnEl.textContent = `▶ ${tr('pause.resume', 'RESUME')} ${savedMid.id}: ${(mObj?.title || 'MISSION').toUpperCase()}`;
      } else if (doneCount > 0 && doneCount < 20) {
        const nextId = win.NeonMissions?.getNextIncompleteMissionId?.() || 'M1';
        const nextM = win.NeonMissions?.getMission?.(nextId);
        bootMissionBtnEl.textContent = nextM
          ? `▶ ${tr('pause.resume', 'RESUME')} — ${nextId}: ${nextM.title.toUpperCase()}`
          : `▶ ${tr('pause.resume', 'RESUME')}`;
      } else if (doneCount >= 20) {
        bootMissionBtnEl.textContent = `▶ ${tr('pause.resume', 'RESUME')} — REPLAY M1`;
      } else {
        const m1 = win.NeonMissions?.getMission?.('M1');
        bootMissionBtnEl.textContent = m1
          ? `▶ ${tr('hud.startMission', 'START')} M1: ${m1.title.toUpperCase()}`
          : `▶ ${tr('boot.startMission', 'START M1: NEON MIDNIGHT DROP')}`;
      }
    }
    syncBootOverlay();

    const flipBtn = doc.getElementById('flipCarBtn');
    if (flipBtn) {
      flipBtn.hidden = !isRunning || !isInCar || !!win.photoModeActive;
      flipBtn.textContent = tr('hud.flipCar', 'FLIP CAR (R)');
    }

    const statusEl = doc.getElementById('status');
    if (statusEl) {
      statusEl.textContent = `RICO VEGA · ${district.name.toUpperCase()} · ${HUDModule.formatCash(curCash, 'Rs ')}`;
    }

    const hintEl = doc.getElementById('hint');
    if (hintEl && !doc.body.classList.contains('mobile')) {
      const nearby = !isInCar ? win.getNearbyVehicle?.() : null;
      if (nearby) {
        hintEl.textContent = `Press E / F to enter ${nearby.name}`;
        hintEl.style.display = 'block';
      } else if (hintEl.dataset.autoEnterHint === '1') {
        hintEl.style.display = 'none';
      }
      hintEl.dataset.autoEnterHint = nearby ? '1' : '0';
    }
  };

  if (typeof updateHUD === 'function') {
    updateHUD = authoritativeUpdateHUD;
  }
  win.updateHUD = authoritativeUpdateHUD;

  // Boot Play Overlay & Console-Grade Tabbed Pause Hub Controllers
  const syncBootOverlay = () => {
    const bootEl = doc.getElementById('bootPlayOverlay');
    const isVisible = !!(bootEl && !bootEl.hidden);
    doc.body.classList.toggle('boot-open', isVisible);
    if (!isVisible) return;
    const tr = (key, fb) => {
      const val = win.NeonI18n?.t?.(key);
      return val && val !== key ? val : fb;
    };
    const save = win.NeonSave?.getData?.() || {};
    const doneCount = Array.isArray(save.completedMissions) ? save.completedMissions.length : 0;
    const starValues = Object.values(save.starRatings || {});
    const totalStars = starValues.reduce((acc, s) => acc + (Number(s) || 0), 0);
    const cashVal = typeof cash !== 'undefined' ? cash : (save.cash ?? 500);
    const hasProgress = doneCount > 0 || !!win.NeonSave?.getLastMission?.() || !!win.NeonMissions?.isActive?.();
    const pill = doc.getElementById('bootProgressPill');
    if (pill) {
      pill.textContent = `${doneCount}/20 ${tr('hud.missions', 'MISSIONS')} · ★ ${totalStars} · ${HUDModule.formatCash(cashVal, 'Rs ')}`;
    }
    const newGameBtn = doc.getElementById('bootNewGameBtn');
    if (newGameBtn) {
      newGameBtn.hidden = !hasProgress;
      if (!newGameBtn.classList.contains('confirm-armed')) {
        newGameBtn.textContent = 'NEW GAME · RESET PROGRESS';
      }
    }
    const soundOrb = doc.getElementById('bootSoundOrb');
    const soundLbl = doc.getElementById('bootSoundLbl');
    const muted = !!win.NeonAudio?.muted;
    if (soundOrb) soundOrb.classList.toggle('is-muted', muted);
    if (soundLbl) soundLbl.textContent = muted ? tr('hud.muted', 'MUTED') : tr('hud.sound', 'SOUND');
  };

  win.dismissBootOverlay = () => {
    win._bootOrbitActive = false;
    doc.body.classList.remove('boot-open');
    const bootEl = doc.getElementById('bootPlayOverlay');
    if (bootEl && !bootEl.hidden) {
      bootEl.hidden = true;
      win.sceneDirty = true;
    }
  };
  win.pause = (force) => {
    if (typeof win.togglePauseMenu === 'function') return win.togglePauseMenu(force === undefined ? true : !!force);
    return false;
  };

  const makeEl = (tag, cls, text = '') => {
    const el = doc.createElement(tag);
    if (cls) el.className = cls;
    if (text) el.textContent = text;
    return el;
  };

  const applyHudOpacityClass = (mode = 'glass') => {
    const clean = ['clear', 'glass', 'solid'].includes(mode) ? mode : 'glass';
    doc.body.classList.remove('hud-op-clear', 'hud-op-glass', 'hud-op-solid');
    doc.body.classList.add(`hud-op-${clean}`);
    return clean;
  };

  win.setHudOpacity = (mode, { persist = true } = {}) => {
    const clean = applyHudOpacityClass(mode);
    if (persist) win.NeonSave?.setHudOpacity?.(clean);
    syncPauseSettings?.();
    if (win.NeonPhone?.isOpen) win.NeonPhone.render?.();
    return clean;
  };

  const syncPauseSettings = () => {
    const tr = (key, fb) => {
      const val = win.NeonI18n?.t?.(key);
      return val && val !== key ? val : fb;
    };
    const steerBtn = doc.getElementById('pauseSteerBtn');
    const muteBtn = doc.getElementById('pauseMuteBtn');
    const gfxBtn = doc.getElementById('pauseGfxBtn');
    const opBtn = doc.getElementById('pauseOpacityBtn');
    if (steerBtn) {
      const sm = win.NeonTouch?._steerMode || win.NeonSave?.getData?.()?.settings?.steerMode || 'joystick';
      steerBtn.textContent = `STEER: ${sm === 'buttons' ? tr('hud.btnMode', 'BTNS') : tr('hud.stickMode', 'STICK')}`;
      steerBtn.hidden = !doc.body.classList.contains('mobile');
    }
    if (muteBtn) {
      const m = !!win.NeonAudio?.muted;
      muteBtn.textContent = m ? `${tr('hud.sound', 'SOUND')}: OFF` : `${tr('hud.sound', 'SOUND')}: ON`;
    }
    if (gfxBtn) {
      const q = (win.NeonPerf?.quality || (typeof settings !== 'undefined' ? settings?.quality : 'low') || 'low').toUpperCase();
      gfxBtn.textContent = `${tr('hud.gfx', 'GFX')}: ${q}`;
    }
    if (opBtn) {
      const curOp = win.NeonSave?.getData?.()?.settings?.hudOpacity || 'glass';
      const opKey = curOp === 'clear' ? 'hud.opClear' : curOp === 'solid' ? 'hud.opSolid' : 'hud.opGlass';
      opBtn.textContent = `HUD: ${tr(opKey, curOp.toUpperCase())}`;
    }
  };

  let pauseOpen = false;
  let activePauseTab = 'resume';

  const setPauseTab = (tabId = 'resume') => {
    const valid = ['resume', 'map', 'missions', 'garage', 'help', 'settings'].includes(tabId) ? tabId : 'resume';
    activePauseTab = valid;
    const pauseEl = doc.getElementById('pauseOverlay');
    if (!pauseEl) return;
    for (const btn of pauseEl.querySelectorAll('[data-pause-tab]')) {
      const on = btn.dataset.pauseTab === valid;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    }
    for (const panel of pauseEl.querySelectorAll('[data-pause-panel]')) {
      panel.hidden = panel.dataset.pausePanel !== valid;
    }
  };

  const renderPauseHub = () => {
    const pauseEl = doc.getElementById('pauseOverlay');
    if (!pauseEl || pauseEl.hidden) return;
    const tr = (key, fb) => {
      const val = win.NeonI18n?.t?.(key);
      return val && val !== key ? val : fb;
    };
    const p = typeof player !== 'undefined' ? player : { x: 0, z: 0 };
    const district = HUDModule.resolveNeonDistrict(p.x, p.z);
    const street = HUDModule.resolveNeonStreet(p.x, p.z);
    const save = win.NeonSave?.getData?.() || {};
    const doneCount = Array.isArray(save.completedMissions) ? save.completedMissions.length : 0;
    const totalStars = Object.values(save.starRatings || {}).reduce((acc, s) => acc + (Number(s) || 0), 0);
    const cashVal = typeof cash !== 'undefined' ? cash : (save.cash ?? 500);
    const selVeh = win.NeonGarage?.getVehicle?.(win.NeonActiveVehicleId) || win.NeonGarage?.getSelectedVehicle?.();

    const badgeEl = doc.getElementById('pauseStatusBadge');
    const activeMission = win.NeonMissions?.isActive?.() ? win.NeonMissions.activeMission : null;
    if (badgeEl) {
      badgeEl.textContent = activeMission ? `${tr('mission.contract', 'CONTRACT')} · ${activeMission.id}` : tr('freeRoam', 'FREE ROAM');
      badgeEl.classList.toggle('is-mission', !!activeMission);
    }

    const statCash = doc.getElementById('pauseStatCash');
    const statMissions = doc.getElementById('pauseStatMissions');
    const statVehicle = doc.getElementById('pauseStatVehicle');
    const statDistrict = doc.getElementById('pauseStatDistrict');
    if (statCash) statCash.textContent = HUDModule.formatCash(cashVal, 'RS ');
    if (statMissions) statMissions.textContent = `${doneCount}/20 · ★ ${totalStars}`;
    if (statVehicle) statVehicle.textContent = (selVeh?.name || 'KURO CIVIC-X').toUpperCase();
    if (statDistrict) statDistrict.textContent = (district?.name || 'APEX CORE').toUpperCase();

    // Resume Tab Objective Card
    const objCard = doc.getElementById('pauseActiveObjCard');
    if (objCard) {
      objCard.textContent = '';
      if (activeMission) {
        const hs = win.NeonMissions.getHudState?.();
        const distM = hs?.target ? Math.round(Math.hypot((hs.target.x || 0) - p.x, (hs.target.z || 0) - p.z)) : 0;
        const headRow = makeEl('div', 'pause-card-row');
        headRow.append(
          makeEl('span', 'pause-card-tag cyan', `ACT ${activeMission.act} · ${activeMission.id}`),
          makeEl('span', 'pause-card-tag gold', `${Math.ceil(win.NeonMissions.remainingTimeSec || 0)}S · ${distM}M`)
        );
        objCard.append(
          headRow,
          makeEl('strong', 'pause-card-title', hs?.title || activeMission.title),
          makeEl('p', 'pause-card-desc', win.NeonMissions.getPlainObjectiveBanner?.(p, win.NeonI18n) || hs?.description || ''),
          makeEl('p', 'pause-card-hint', activeMission.storyHook || hs?.tip || '')
        );
      } else {
        const nextId = win.NeonMissions?.getNextIncompleteMissionId?.() || 'M1';
        const nextM = win.NeonMissions?.getMission?.(nextId);
        const headRow = makeEl('div', 'pause-card-row');
        headRow.append(
          makeEl('span', 'pause-card-tag cyan', tr('freeRoam', 'FREE ROAM')),
          makeEl('span', 'pause-card-tag gold', `${district.name.toUpperCase()} · ${street.toUpperCase()}`)
        );
        objCard.append(
          headRow,
          makeEl('strong', 'pause-card-title', nextM ? `NEXT: ${nextId} — ${nextM.title}` : 'EXPLORE NEON BAY'),
          makeEl('p', 'pause-card-desc', nextM?.storyHook || nextM?.objectiveSummary || 'Cruise the 4 Neon Bay districts, customize rides, or launch your next story contract.')
        );
      }
    }

    // Map Tab Current Location & 4 Districts
    const mapCard = doc.getElementById('pauseMapCurrentCard');
    if (mapCard) {
      mapCard.textContent = '';
      const tgt = activeMission ? win.NeonMissions?.getActiveTarget?.() : null;
      const distStr = tgt ? `${Math.round(Math.hypot((tgt.x || 0) - p.x, (tgt.z || 0) - p.z))}m to active waypoint` : '2000m x 2000m Open City · Bridges & Pier 99 Live';
      mapCard.append(
        makeEl('div', 'pause-card-tag cyan', `${district.name.toUpperCase()} · ${street.toUpperCase()}`),
        makeEl('strong', 'pause-card-title', district.subtitle || 'Miami Neon District'),
        makeEl('p', 'pause-card-desc', distStr)
      );
    }
    const distGrid = doc.getElementById('pauseDistrictGrid');
    if (distGrid) {
      distGrid.textContent = '';
      for (const d of HUDModule.NEON_DISTRICTS) {
        const isHere = d.id === district?.id;
        const card = makeEl('div', `pause-district-card${isHere ? ' current' : ''}`);
        const top = makeEl('div', 'pause-card-row');
        top.append(
          makeEl('strong', '', d.name.toUpperCase()),
          makeEl('span', `pause-card-tag${isHere ? ' cyan' : ''}`, isHere ? 'YOU ARE HERE' : `${Math.round(Math.hypot(d.x - p.x, d.z - p.z))}M`)
        );
        card.append(top, makeEl('p', 'pause-card-desc', d.subtitle));
        distGrid.appendChild(card);
      }
    }

    // Missions Tab List
    const mProg = doc.getElementById('pauseMissionsProgress');
    if (mProg) {
      mProg.textContent = '';
      const row = makeEl('div', 'pause-card-row');
      row.append(
        makeEl('strong', 'pause-card-title', `CAMPAIGN ${doneCount}/20`),
        makeEl('span', 'pause-card-tag gold', `★ ${totalStars} / 60`)
      );
      const track = makeEl('div', 'pause-stat-track');
      const fill = makeEl('div', 'pause-stat-fill cyan');
      fill.style.width = `${Math.round((doneCount / 20) * 100)}%`;
      track.appendChild(fill);
      mProg.append(row, track);
    }
    const mList = doc.getElementById('pauseMissionsList');
    if (mList) {
      mList.textContent = '';
      const list = win.NeonMissions?.getMissionList?.() || [];
      for (const m of list) {
        const row = makeEl('div', `pause-mission-row${m.completed ? ' is-done' : m.unlocked ? '' : ' is-locked'}`);
        const info = makeEl('div', 'pause-mission-info');
        const head = makeEl('div', 'pause-card-row');
        head.append(
          makeEl('strong', '', m.title),
          makeEl('span', `pause-card-tag${m.completed ? ' gold' : m.unlocked ? ' cyan' : ''}`, m.completed ? `★${m.stars || 1}` : m.unlocked ? `${m.timeLimitSec}S · RS ${m.rewardCash}` : 'LOCKED')
        );
        info.append(head, makeEl('p', 'pause-card-desc', m.storyHook || m.subtitle));
        const btn = makeEl(
          'button',
          `pause-btn${m.unlocked && !m.completed ? ' primary' : ''} pause-row-btn`,
          m.completed ? tr('mission.retryBtn', 'REPLAY') : m.unlocked ? 'PLAY' : 'LOCKED'
        );
        btn.type = 'button';
        btn.disabled = !m.unlocked;
        btn.addEventListener('click', () => {
          win.togglePauseMenu(false);
          win.NeonMissions?.startMission?.(m.id);
        });
        row.append(info, btn);
        mList.appendChild(row);
      }
    }

    // Garage Tab Hero & Owned Fleet
    const gHero = doc.getElementById('pauseGarageHero');
    const gGrid = doc.getElementById('pauseGarageGrid');
    if (gHero && win.NeonGarage && selVeh) {
      gHero.textContent = '';
      const stats = win.NeonGarage.getEffectiveStats(selVeh.id);
      const cfg = win.NeonGarage.getCustomization(selVeh.id);
      const top = makeEl('div', 'pause-card-row');
      top.append(
        makeEl('strong', 'pause-card-title', `${selVeh.id} · ${selVeh.name.toUpperCase()}`),
        makeEl('span', 'pause-card-tag cyan', `${stats.topSpeedKmh} KM/H · TURBO LV ${cfg.turboLv}/3`)
      );
      gHero.append(top, makeEl('p', 'pause-card-desc', `${selVeh.archetype} · Neon: ${(cfg.neon || 'off').toUpperCase()}`));
      const statMetrics = [
        ['SPEED', Math.min(100, Math.round((stats.topSpeedKmh / 340) * 100)), 'cyan'],
        ['ACCEL', Math.min(100, Math.round((stats.accel / 26) * 100)), 'mag'],
        ['HANDLING', Math.min(100, Math.round((stats.handling / 2.2) * 100)), 'gold']
      ];
      for (const [lbl, pct, col] of statMetrics) {
        const sRow = makeEl('div', 'pause-stat-bar-row');
        sRow.appendChild(makeEl('span', 'pause-stat-lbl', lbl));
        const track = makeEl('div', 'pause-stat-track');
        const fill = makeEl('div', `pause-stat-fill ${col}`);
        fill.style.width = `${pct}%`;
        track.appendChild(fill);
        sRow.append(track, makeEl('span', 'pause-stat-val', `${pct}%`));
        gHero.appendChild(sRow);
      }
    }
    if (gGrid && win.NeonGarage) {
      gGrid.textContent = '';
      const owned = [...(win.NeonGarage.getCars?.() || []), ...(win.NeonGarage.getBikes?.() || [])]
        .filter((v) => win.NeonGarage.isUnlocked?.(v.id));
      for (const v of owned) {
        const active = selVeh?.id === v.id;
        const btn = makeEl('button', `pause-veh-card${active ? ' active' : ''}`);
        btn.type = 'button';
        btn.append(
          makeEl('strong', '', `${v.id} · ${v.name}`),
          makeEl('span', '', `${v.topSpeedKmh} KM/H · ${v.type.toUpperCase()}`)
        );
        btn.addEventListener('click', () => {
          win.NeonGarage.selectVehicle(v.id, { spawn: true });
          win.togglePauseMenu(false);
        });
        gGrid.appendChild(btn);
      }
    }

    // Settings Tab: Radio & 6 Languages
    syncPauseSettings();
    const radioGrid = doc.getElementById('pauseRadioGrid');
    if (radioGrid) {
      radioGrid.textContent = '';
      const stations = [
        { id: 0, name: 'OFF', genre: 'Ambient' },
        { id: 1, name: '99.5 Neon FM', genre: 'Synthwave' },
        { id: 2, name: '104.2 Drift Radio', genre: 'Phonk' },
        { id: 3, name: '88.0 Bay Beats', genre: 'Trap' }
      ];
      const curIdx = win.NeonAudio?.activeStationIndex ?? 0;
      for (const st of stations) {
        const b = makeEl('button', `pause-btn pause-pill-btn${curIdx === st.id ? ' active' : ''}`, st.name);
        b.type = 'button';
        b.addEventListener('click', () => {
          const tuned = win.NeonAudio?.setStation?.(st.id) || st;
          win.radioStation = st.id;
          win.NeonHUD?.showRadioToast?.(tuned.name || st.name, tuned.genre || st.genre);
          renderPauseHub();
        });
        radioGrid.appendChild(b);
      }
    }
    const langGrid = doc.getElementById('pauseLangGrid');
    if (langGrid && win.NeonI18n) {
      langGrid.textContent = '';
      const curLoc = win.NeonI18n.getLanguage?.() || 'en';
      for (const loc of (win.NeonI18n.getLocales?.() || [])) {
        const b = makeEl('button', `pause-btn pause-pill-btn${curLoc === loc.code ? ' active' : ''}`, `${loc.short} · ${loc.name}`);
        b.type = 'button';
        b.dataset.locale = loc.code;
        b.addEventListener('click', () => {
          win.NeonI18n.setLanguage(loc.code);
          win.NeonPhone?.updateChromeLabels?.();
          win.updateHUD?.();
          win.updateTouchUI?.();
          renderPauseHub();
        });
        langGrid.appendChild(b);
      }
    }
  };

  let helpOpen = false;
  let helpPausedSim = false;

  const renderMissionHelpDrawer = () => {
    const drawer = doc.getElementById('missionHelpDrawer');
    if (!drawer || !win.NeonMissions?.getLiveHelpGuide) return;
    const tr = (key, fb) => {
      const val = win.NeonI18n?.t?.(key);
      return val && val !== key ? val : fb;
    };
    const p = typeof player !== 'undefined' ? player : { x: 0, z: 0 };
    const isMob = doc.body.classList.contains('mobile');
    const guide = win.NeonMissions.getLiveHelpGuide(p, { isMobile: isMob, i18n: win.NeonI18n });

    const badge = doc.getElementById('missionHelpBadge');
    const title = doc.getElementById('missionHelpTitle');
    const meta = doc.getElementById('missionHelpMeta');
    const directive = doc.getElementById('missionHelpDirective');
    const hook = doc.getElementById('missionHelpHook');
    const stepsEl = doc.getElementById('missionHelpSteps');
    const ctrlTip = doc.getElementById('missionHelpControlTip');
    const primaryAction = doc.getElementById('missionHelpPrimaryActionBtn');

    if (badge) badge.textContent = guide.active ? `${guide.chapterTag} · ${guide.missionId}` : 'FREE ROAM';
    if (title) title.textContent = guide.active ? guide.title : tr('help.freeRoamTitle', 'QUICK GUIDE & CONTROLS');
    if (meta) {
      meta.textContent = guide.active
        ? `${guide.remainingTimeSec}S${guide.distanceMeters !== null ? ` · ${guide.distanceMeters}M` : ''}`
        : tr('freeRoam', 'FREE ROAM');
    }
    if (directive) directive.textContent = guide.liveDirective;
    if (hook) hook.textContent = guide.storyHook || '';
    if (ctrlTip) ctrlTip.textContent = guide.controlTip || '';
    if (stepsEl) {
      stepsEl.textContent = '';
      for (const st of (guide.steps || [])) {
        const li = makeEl('li', `mission-help-step step-${st.status}`);
        const mark = st.status === 'done' ? '✓' : st.status === 'active' ? '→' : String(st.index);
        li.append(
          makeEl('span', 'step-badge', mark),
          makeEl('span', 'step-text', st.text)
        );
        stepsEl.appendChild(li);
      }
    }
    if (primaryAction) {
      primaryAction.textContent = guide.active
        ? tr('pause.restartMission', 'RESTART MISSION')
        : `${tr('hud.startMission', 'START')} ${guide.missionId || 'M1'}`;
    }
  };

  win.toggleMissionHelp = (forceState) => {
    const drawer = doc.getElementById('missionHelpDrawer');
    if (!drawer) return false;
    win.dismissBootOverlay?.();
    const next = typeof forceState === 'boolean' ? forceState : !helpOpen;
    if (next) {
      if (pauseOpen) win.togglePauseMenu(false);
      if (win.NeonPhone?.isOpen) win.NeonPhone.close();
      helpOpen = true;
      if (typeof running !== 'undefined' && running === true) {
        running = false;
        helpPausedSim = true;
      }
      renderMissionHelpDrawer();
      drawer.hidden = false;
      win.clearControls?.();
      win.updateTouchUI?.();
    } else {
      helpOpen = false;
      drawer.hidden = true;
      if (helpPausedSim && !pauseOpen && !win.photoModeActive && typeof running !== 'undefined') {
        running = true;
        if (typeof firstFrame !== 'undefined') firstFrame = true;
      }
      helpPausedSim = false;
      win.updateHUD?.();
      win.updateTouchUI?.();
    }
    return next;
  };

  win.togglePauseMenu = (forceState, initialTab = null) => {
    const pauseEl = doc.getElementById('pauseOverlay');
    if (!pauseEl) return false;
    win.dismissBootOverlay?.();
    const next = typeof forceState === 'boolean' ? forceState : !pauseOpen;
    if (next && helpOpen) {
      helpOpen = false;
      helpPausedSim = false;
      const hd = doc.getElementById('missionHelpDrawer');
      if (hd) hd.hidden = true;
    }
    pauseOpen = next;
    pauseEl.hidden = !next;
    if (typeof running !== 'undefined') {
      running = !next;
    }
    win.clearControls?.();
    if (next) {
      setPauseTab(initialTab || 'resume');
      renderPauseHub();
    }
    if (!next && typeof firstFrame !== 'undefined') firstFrame = true;
    win.updateHUD?.();
    win.updateTouchUI?.();
    return next;
  };

  const bootPlayBtn = doc.getElementById('bootPlayBtn');
  if (bootPlayBtn && !bootPlayBtn._neonBound) {
    bootPlayBtn._neonBound = true;
    bootPlayBtn.addEventListener('click', (e) => {
      e.preventDefault();
      win.NeonAudio?.unlock?.();
      win.dismissBootOverlay();
    });
  }

  const bootMissionBtn = doc.getElementById('bootMissionBtn');
  if (bootMissionBtn && !bootMissionBtn._neonBound) {
    bootMissionBtn._neonBound = true;
    bootMissionBtn.addEventListener('click', (e) => {
      e.preventDefault();
      win.NeonAudio?.unlock?.();
      win.dismissBootOverlay();
      if (win.NeonMissions?.isActive?.()) {
        win.updateHUD?.();
        return;
      }
      const savedMid = win.NeonSave?.getLastMission?.() || null;
      if (savedMid?.id && typeof win.NeonMissions?.resumeMission === 'function') {
        win.NeonMissions.resumeMission(savedMid);
        win.updateHUD?.();
        return;
      }
      const nextId = win.NeonMissions?.getNextIncompleteMissionId?.() || 'M1';
      win.NeonMissions?.startMission?.(nextId);
    });
  }

  const bootNewGameBtn = doc.getElementById('bootNewGameBtn');
  if (bootNewGameBtn && !bootNewGameBtn._neonBound) {
    bootNewGameBtn._neonBound = true;
    let confirmResetTimer = null;
    bootNewGameBtn.addEventListener('click', (e) => {
      e.preventDefault();
      win.NeonAudio?.unlock?.();
      if (!bootNewGameBtn.classList.contains('confirm-armed')) {
        bootNewGameBtn.classList.add('confirm-armed');
        bootNewGameBtn.textContent = 'TAP AGAIN TO CONFIRM NEW GAME';
        if (confirmResetTimer) clearTimeout(confirmResetTimer);
        confirmResetTimer = setTimeout(() => {
          bootNewGameBtn.classList.remove('confirm-armed');
          bootNewGameBtn.textContent = 'NEW GAME · RESET PROGRESS';
        }, 4000);
        return;
      }
      if (confirmResetTimer) clearTimeout(confirmResetTimer);
      bootNewGameBtn.classList.remove('confirm-armed');
      win.NeonMissions?.abortMission?.();
      win.NeonSave?.reset?.();
      if (typeof cash !== 'undefined') cash = 500;
      win.dismissBootOverlay();
      win.NeonMissions?.startMission?.('M1');
      win.updateHUD?.();
    });
  }

  const bindBootOrb = (id, fn) => {
    const btn = doc.getElementById(id);
    if (btn && !btn._neonBound) {
      btn._neonBound = true;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        win.NeonAudio?.unlock?.();
        fn();
      });
    }
  };
  bindBootOrb('bootGarageOrb', () => {
    win.dismissBootOverlay();
    win.NeonPhone?.open?.('garage');
  });
  bindBootOrb('bootMissionsOrb', () => {
    win.dismissBootOverlay();
    win.NeonPhone?.open?.('missions');
  });
  bindBootOrb('bootSoundOrb', () => {
    const nextMuted = !win.NeonAudio?.muted;
    win.NeonAudio?.setMuted?.(nextMuted);
    syncBootOverlay();
    win.updateTouchUI?.();
  });
  bindBootOrb('bootHelpOrb', () => {
    win.togglePauseMenu(true, 'help');
  });

  const objHelpPill = doc.getElementById('objectiveHelpPill');
  if (objHelpPill && !objHelpPill._neonBound) {
    objHelpPill._neonBound = true;
    objHelpPill.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      win.NeonAudio?.unlock?.();
      win.toggleMissionHelp();
    });
  }

  const objBannerEl = doc.getElementById('objectiveBanner');
  if (objBannerEl && !objBannerEl._neonBound) {
    objBannerEl._neonBound = true;
    objBannerEl.addEventListener('click', () => {
      win.NeonAudio?.unlock?.();
      win.dismissBootOverlay();
      if (win.NeonMissions?.isActive?.()) {
        win.toggleMissionHelp(true);
      } else {
        const nextId = win.NeonMissions?.getNextIncompleteMissionId?.() || 'M1';
        win.NeonMissions?.startMission?.(nextId);
      }
    });
  }

  const helpDrawerEl = doc.getElementById('missionHelpDrawer');
  if (helpDrawerEl && !helpDrawerEl._neonBound) {
    helpDrawerEl._neonBound = true;
    helpDrawerEl.addEventListener('click', (e) => {
      if (e.target === helpDrawerEl) win.toggleMissionHelp(false);
    });
  }
  const bindHelpBtn = (id, fn) => {
    const btn = doc.getElementById(id);
    if (btn && !btn._neonBound) {
      btn._neonBound = true;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        fn();
      });
    }
  };
  bindHelpBtn('missionHelpCloseBtn', () => win.toggleMissionHelp(false));
  bindHelpBtn('missionHelpResumeBtn', () => win.toggleMissionHelp(false));
  bindHelpBtn('missionHelpMapBtn', () => {
    win.toggleMissionHelp(false);
    win.NeonMinimap?.toggleFullMap?.(true);
  });
  bindHelpBtn('missionHelpFlipBtn', () => {
    win.toggleMissionHelp(false);
    win.flipCar?.();
  });
  bindHelpBtn('missionHelpPrimaryActionBtn', () => {
    win.toggleMissionHelp(false);
    const id = win.NeonMissions?.activeMission?.id || win.NeonMissions?.getNextIncompleteMissionId?.() || 'M1';
    win.NeonMissions?.startMission?.(id);
  });

  if (!win._neonHelpKeysBound) {
    win._neonHelpKeysBound = true;
    win.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.code === 'KeyH' && !win.photoModeActive) {
        e.preventDefault();
        win.toggleMissionHelp();
      } else if (e.code === 'Escape' && helpOpen) {
        e.preventDefault();
        e.stopImmediatePropagation?.();
        win.toggleMissionHelp(false);
      }
    }, true);
  }

  const bindPauseBtn = (id, fn) => {
    const btn = doc.getElementById(id);
    if (btn && !btn._neonBound) {
      btn._neonBound = true;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        fn();
      });
    }
  };
  const pauseOverlayEl = doc.getElementById('pauseOverlay');
  if (pauseOverlayEl && !pauseOverlayEl._neonBound) {
    pauseOverlayEl._neonBound = true;
    for (const tabBtn of pauseOverlayEl.querySelectorAll('[data-pause-tab]')) {
      tabBtn.addEventListener('click', (e) => {
        e.preventDefault();
        setPauseTab(tabBtn.dataset.pauseTab);
        renderPauseHub();
      });
    }
    pauseOverlayEl.addEventListener('click', (e) => {
      if (e.target === pauseOverlayEl) win.togglePauseMenu(false);
    });
  }
  bindPauseBtn('pauseCloseOrb', () => win.togglePauseMenu(false));
  bindPauseBtn('pauseFooterResumeBtn', () => win.togglePauseMenu(false));
  bindPauseBtn('pauseResumeBtn', () => win.togglePauseMenu(false));
  bindPauseBtn('pauseRestartBtn', () => {
    win.togglePauseMenu(false);
    const id = win.NeonMissions?.activeMission?.id || win.NeonMissions?.getNextIncompleteMissionId?.() || 'M1';
    win.NeonMissions?.startMission?.(id);
  });
  bindPauseBtn('pausePhoneBtn', () => {
    win.togglePauseMenu(false);
    win.NeonPhone?.open?.('home');
  });
  bindPauseBtn('pauseFreeRoamBtn', () => {
    win.togglePauseMenu(false);
    if (win.NeonMissions?.isActive?.()) win.NeonMissions.abortMission();
  });
  bindPauseBtn('pauseQuickMapBtn', () => {
    win.togglePauseMenu(false);
    win.NeonMinimap?.toggleFullMap?.(true);
  });
  bindPauseBtn('pauseOpenFullMapBtn', () => {
    win.togglePauseMenu(false);
    win.NeonMinimap?.toggleFullMap?.(true);
  });
  bindPauseBtn('pauseQuickPhotoBtn', () => {
    win.togglePauseMenu(false);
    (win.togglePhotoMode || win.NeonPhotoMode?.toggle)?.();
  });
  bindPauseBtn('pauseQuickFlipBtn', () => {
    win.togglePauseMenu(false);
    win.flipCar?.();
  });
  bindPauseBtn('pauseOpenGaragePhoneBtn', () => {
    win.togglePauseMenu(false);
    win.NeonPhone?.open?.('garage');
  });
  bindPauseBtn('pauseSteerBtn', () => {
    if (win.NeonTouch?.toggleSteerMode) {
      win.NeonTouch.toggleSteerMode();
    } else if (win.NeonSave) {
      const cur = win.NeonSave.getData?.()?.settings?.steerMode || 'joystick';
      win.NeonSave.setSteerMode?.(cur === 'joystick' ? 'buttons' : 'joystick');
    }
    syncPauseSettings();
  });
  bindPauseBtn('pauseMuteBtn', () => {
    const nextMuted = !win.NeonAudio?.muted;
    win.NeonAudio?.setMuted?.(nextMuted);
    syncPauseSettings();
    win.updateTouchUI?.();
  });
  bindPauseBtn('pauseGfxBtn', () => {
    const order = ['low', 'medium', 'high'];
    const cur = win.NeonPerf?.quality || 'low';
    const next = order[(order.indexOf(cur) + 1) % order.length];
    win.NeonPerf?.setQuality?.(next);
    syncPauseSettings();
    win.updateHUD?.();
    win.updateTouchUI?.();
  });
  bindPauseBtn('pauseOpacityBtn', () => {
    const order = ['clear', 'glass', 'solid'];
    const cur = win.NeonSave?.getData?.()?.settings?.hudOpacity || 'glass';
    const next = order[(order.indexOf(cur) + 1) % order.length];
    win.setHudOpacity?.(next);
    if (typeof toast === 'function') toast(`HUD OPACITY: ${next.toUpperCase()}`);
  });

  // Wire header quick buttons & quick-start contract button
  const bindHeaderBtn = (id, fn) => {
    const btn = doc.getElementById(id);
    if (btn && !btn._neonBound) {
      btn._neonBound = true;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        win.dismissBootOverlay();
        fn();
      });
    }
  };
  bindHeaderBtn('hudPhoneBtn', () => win.NeonPhone?.toggle?.('home'));
  bindHeaderBtn('hudMapBtn', () => win.NeonMinimap?.toggleFullMap?.());
  bindHeaderBtn('hudPhotoBtn', () => win.togglePhotoMode?.() || win.NeonPhotoMode?.toggle?.());
  bindHeaderBtn('hudPauseBtn', () => win.togglePauseMenu?.());

  const quickBtn = doc.getElementById('quickStartMissionBtn');
  if (quickBtn && !quickBtn._neonBound) {
    quickBtn._neonBound = true;
    quickBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      win.dismissBootOverlay();
      const savedMid = win.NeonSave?.getLastMission?.() || null;
      if (savedMid?.id && typeof win.NeonMissions?.resumeMission === 'function') {
        win.NeonMissions.resumeMission(savedMid);
        win.updateHUD?.();
        return;
      }
      const nextId = win.NeonMissions?.getNextIncompleteMissionId?.() || 'M1';
      win.NeonMissions?.startMission?.(nextId);
    });
  }

  const pauseHeader = doc.querySelector('.pause-header-right');
  if (pauseHeader && !doc.getElementById('pauseMissionStarBadge')) {
    const badge = doc.createElement('div'); badge.id='pauseMissionStarBadge'; badge.className='mission-star badge'; pauseHeader.prepend(badge);
  }
  const syncMissionStars = () => {
    const { earned, total } = win.NeonMissions.getStarProgress();
    const text = `⭐ ${earned}/${total}`;
    const label = `Mission stars: ${earned} of ${total}`;
    if (hud.els.missionStar) { hud.els.missionStar.textContent = text; hud.els.missionStar.setAttribute('aria-label', label); }
    const pauseBadge = doc.getElementById('pauseMissionStarBadge');
    if (pauseBadge) {pauseBadge.textContent = text;pauseBadge.setAttribute('aria-label',label);}
    if (win.NeonPhone?.isOpen && win.NeonPhone.activeApp === 'home') win.NeonPhone.render();
  };
  win.NeonEventBus?.on('save:written', syncMissionStars);
  syncMissionStars();
  const mgr = win.NeonMissions;
  if (mgr) {
    mgr.captureRuntime = () => ({player:{x:player.x,z:player.z,yaw:player.yaw},inCar,ride,
      vehicleId:win.NeonActiveVehicleId,vehicle:{...currentRide(),doorAnim:null},velocity,wantedLevel:win.wantedLevel || 0});
    mgr.restoreRuntime = (data) => {
      if (!data?.player || ![data.player.x,data.player.z,data.player.yaw].every(Number.isFinite)) return;
      if (Math.abs(data.player.x)>980 || data.player.z < -975 || data.player.z>980) return;
      if (data.ride && win.cityVehicles?.[data.ride]) ride=data.ride;
      const spec=win.NeonGarage?.getVehicle?.(data.vehicleId);
      if(spec) {win.NeonActiveVehicleId=spec.id;win.NeonGarage.onApplyVisuals?.(spec,win.NeonGarage.getCustomization(spec.id),win.NeonGarage.getEffectiveStats(spec.id));}
      const vehicle=currentRide();
      if (data.vehicle) for (const key of ['x','z','yaw','hp','jumpY','jumpVy','jumpPitch','wheelSpin']) if (Number.isFinite(data.vehicle[key])) vehicle[key]=data.vehicle[key];
      vehicle.airborne=!!data.vehicle?.airborne;vehicle.onRamp=data.vehicle?.onRamp || null;
      Object.assign(player,data.player);inCar=data.inCar !== false;
      velocity=Number.isFinite(data.velocity)?Math.max(-7,Math.min(120,data.velocity)):0;
      win.setWantedLevel?.(Math.max(0,Math.min(5,data.wantedLevel || 0)));
      firstFrame=true;
    };
    const saveOnLeave = () => mgr.saveProgress();
    win.addEventListener('pagehide',saveOnLeave);
    doc.addEventListener('visibilitychange',()=>{if(doc.hidden)saveOnLeave();});
    win.resumeSavedMission = () => {
      const saved=win.NeonSave?.getLastMission?.();
      if (saved && !mgr.isActive()) { const result=mgr.resumeMission(saved.id,saved.state); if(result.ok)win.dismissBootOverlay?.(); return result; }
    };
  }

  // Run initial HUD, saved HUD opacity & layout sync
  applyHudOpacityClass(win.NeonSave?.getData?.()?.settings?.hudOpacity || 'glass');
  authoritativeUpdateHUD();
  hud.applyResponsiveLayout();
  win.fitCamera?.();

  return { hud, minimap };
}
