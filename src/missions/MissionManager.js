/**
 * Story Mission Engine for Neon Bay: Overdrive.
 * Handles mission initialization, 2-line radio intro banners, countdown timers,
 * checkpoint progression, Act 1 & Act 2 unique mechanics, silent 3-fail difficulty assist,
 * and Win/Fail summary modal with 1-3 Star ratings and next mission preview.
 * Pure zero-import ES Module.
 */

export const MISSION_STATES = Object.freeze({
  IDLE: 'IDLE',
  INTRO: 'INTRO',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
});

export const ASSIST_FAIL_THRESHOLD = 3;
export const ASSIST_BONUS_TIME_SEC = 10;
export const ASSIST_POLICE_AGGRESSION_MULT = 0.85;

export function computeStarRating(mission, { remainingTimeSec = 0, conditionPct = 100 } = {}) {
  const th = mission?.starThresholds || { threeStarSec: 20, twoStarSec: 8, minConditionPct: 0 };
  const minCond = th.minConditionPct || 0;
  if (conditionPct < minCond) return 1;
  if (remainingTimeSec >= th.threeStarSec && conditionPct >= Math.max(90, minCond)) return 3;
  if (remainingTimeSec >= th.twoStarSec && conditionPct >= Math.max(80, minCond)) return 2;
  return 1;
}

function dist2D(a, b) {
  if (!a || !b) return Infinity;
  return Math.hypot((a.x || 0) - (b.x || 0), (a.z || 0) - (b.z || 0));
}

function failureReasonLabel(reason, customMessage = '') {
  if (customMessage) return customMessage;
  switch (reason) {
    case 'time_expired':
      return 'Countdown expired before reaching the objective.';
    case 'vehicle_destroyed':
      return 'Your mission vehicle was destroyed.';
    case 'vehicle_scratched':
      return 'Vehicle condition dropped below 80% threshold!';
    case 'rival_escaped':
      return 'Syndicate courier crossed the north finish gate first.';
    case 'spotted_by_searchlight':
      return 'Caught in the Syndicate blackout searchlight beam!';
    case 'partner_escaped':
      return 'Your rogue partner escaped past the Airport runway!';
    case 'speed_bomb_detonated':
      return 'Speed dropped below 60 km/h for 3 seconds — chassis bomb detonated!';
    default:
      return 'Contract aborted before extraction.';
  }
}

export class MissionManager {
  constructor({
    missions = [],
    saveManager = null,
    gameState = null,
    eventBus = null,
    i18n = null,
    doc = globalThis.document || null,
    win = globalThis.window || null,
    callbacks = {}
  } = {}) {
    this.missions = Array.isArray(missions) ? missions : [];
    this.missionById = new Map(this.missions.map((m) => [m.id, m]));
    this.saveManager = saveManager || null;
    this.gameState = gameState || null;
    this.eventBus = eventBus || null;
    this.i18n = i18n || null;
    this.doc = doc || null;
    this.win = win || null;
    this.callbacks = callbacks || {};
    this._hintCooldown = 0;

    this.state = MISSION_STATES.IDLE;
    this.activeMission = null;
    this.remainingTimeSec = 0;
    this.elapsedSec = 0;
    this.totalTimeLimitSec = 0;
    this.checkpointIndex = 0;
    this.checkpointsCleared = 0;
    this.assistActive = false;
    this.policeAggressionMult = 1.0;
    this.disableBrakes = false;
    this.introRemainingSec = 0;
    this._commsRemainingSec = 0;
    this._triggeredComms = new Set();
    this.mechanicState = {};
    this.lastResult = null;
    this.lastPlayerPos = { x: 0, z: 0 };
    this.lastInCar = true;

    this._mounted = false;
    this._radioEl = null;
    this._mechanicEl = null;
    this._ambushEl = null;
    this._modalEl = null;
    this._cleanups = [];
  }

  isActive() {
    return this.state === MISSION_STATES.INTRO || this.state === MISSION_STATES.ACTIVE;
  }

  getMission(id) {
    return this.missionById.get(id) || null;
  }

  getConsecutiveFails(missionId) {
    const data = this.saveManager?.getData?.();
    return Number(data?.stats?.consecutiveFails?.[missionId] || 0);
  }

  getStarProgress() {
    const ratings = this.saveManager?.getData?.()?.starRatings || {};
    const earned = this.missions.reduce((sum, mission) =>
      sum + Math.max(0, Math.min(3, Math.floor(Number(ratings[mission.id]) || 0))), 0);
    return { earned, total: this.missions.length * 3 };
  }

  getMissionList() {
    const data = this.saveManager?.getData?.() || {};
    const completedSet = new Set(Array.isArray(data.completedMissions) ? data.completedMissions : []);
    const starsMap = data.starRatings || {};
    const failsMap = data.stats?.consecutiveFails || {};

    return this.missions.map((m, idx) => {
      const prevCompleted = idx === 0 || completedSet.has(this.missions[idx - 1].id);
      return {
        id: m.id,
        number: m.number,
        act: m.act,
        title: `${m.id} — ${m.title}`,
        shortTitle: m.title,
        subtitle: `${m.timeLimitSec}s · ${m.vehicleId} · Rs ${m.rewardCash} — ${m.objectiveSummary}`,
        rewardCash: m.rewardCash,
        timeLimitSec: m.timeLimitSec,
        vehicleId: m.vehicleId,
        chapterTag: m.chapterTag || `ACT ${m.act}`,
        storyHook: m.storyHook || m.objectiveSummary,
        steps: Array.isArray(m.steps) ? m.steps : [],
        hasOnFootStage: !!(m.checkpoints || []).some((c) => c.requiresOnFoot),
        unlocked: prevCompleted,
        completed: completedSet.has(m.id),
        stars: Number(starsMap[m.id] || 0),
        consecutiveFails: Number(failsMap[m.id] || 0)
      };
    });
  }

  getNextIncompleteMissionId() {
    const list = this.getMissionList();
    return list.find((m) => m.unlocked && !m.completed)?.id || list.find((m) => !m.completed)?.id || 'M1';
  }

  _t(key, fallback) {
    if (this.i18n && typeof this.i18n.t === 'function') {
      const val = this.i18n.t(key);
      if (val && val !== key) return val;
    }
    return fallback;
  }

  _emitHint(msg) {
    if (!msg || this._hintCooldown > 0) return;
    this._hintCooldown = 2.6;
    this.callbacks.onHint?.(msg);
  }

  getPlainObjectiveBanner(playerPos = null, i18n = this.i18n) {
    const tr = (key, fb) => {
      if (i18n && typeof i18n.t === 'function') {
        const v = i18n.t(key);
        if (v && v !== key) return v;
      }
      return fb;
    };
    if (!this.isActive() || !this.activeMission) {
      return tr('obj.freeRoam', 'FREE ROAM — DRIVE OR TAP MISSION');
    }
    const m = this.activeMission;
    const ms = this.mechanicState || {};
    const tgt = this.getActiveTarget();
    const dStr = tgt && playerPos ? ` (${Math.round(dist2D(playerPos, tgt))}m)` : '';
    const tp = m.mechanics?.type;
    if (tp === 'rain_drift') {
      return `${tr('obj.drift', 'DRIFT')} ${ms.zonesHit}/${ms.driftZonesRequired} · ${Math.round(ms.driftScore)}/${ms.targetDriftScore}${dStr}`;
    }
    if (tp === 'decoy_siren' && ms.sirenTriggered) {
      return `${tr('obj.survivePursuit', 'SURVIVE 2-STAR PURSUIT')} (${Math.max(0, Math.ceil(ms.surviveTargetSec - ms.survivedSec))}s)`;
    }
    if (tp === 'ambush_escape') {
      if (ms.phase === 'ambush_reverse') return tr('obj.reverseAmbush', 'REVERSE CLEAR OF AMBUSH!');
      if (ms.phase === 'escape_garage') return `${tr('obj.escapeGarage', "ESCAPE TO VEGA'S GARAGE")}${dStr}`;
    }
    if (tp === 'hacker_hijack') {
      if (ms.phase === 'chase_ram') return `${tr('obj.ramTarget', 'RAM TARGET')} (${Math.round(ms.targetHp)}% HP${dStr ? ' · ' + Math.round(dist2D(playerPos, tgt)) + 'm' : ''})`;
      return `${tr('obj.deliverGarage', "DRIVE TO VEGA'S GARAGE")}${dStr}`;
    }
    if (tp === 'no_brakes') {
      return ms.checkpointsDone
        ? tr('obj.beachStop', 'COAST TO STOP ON BEACH SAND (<5 KM/H)')
        : `${tr('obj.noBrakes', 'NO BRAKES! STEER SOUTH')}${dStr}`;
    }
    if (tp === 'zero_scratch') {
      if (tgt?.requiresOnFoot) {
        const stepTxt = this.lastInCar
          ? `${tr('obj.exitAndEnter', 'EXIT CAR (E) -> ENTER')} ${(tgt.buildingLabel || tgt.label).toUpperCase()}${dStr}`
          : `${tr('obj.walkInside', 'WALK INSIDE')} ${(tgt.buildingLabel || tgt.label).toUpperCase()}${dStr}`;
        return `${tr('obj.zeroScratch', 'CONDITION')} ${Math.round(ms.conditionPct)}% · ${stepTxt}`;
      }
      return `${tr('obj.zeroScratch', 'CONDITION')} ${Math.round(ms.conditionPct)}% · ${tgt ? tgt.label.toUpperCase() : m.title.toUpperCase()}${dStr}`;
    }
    if (tp === 'barricade_breaker') {
      if (ms.barricadesSmashed < ms.targetBarricades) {
        return `${tr('obj.smashBarricades', 'SMASH BARRICADES')} ${ms.barricadesSmashed}/${ms.targetBarricades}${dStr}`;
      }
      if (!tgt?.requiresOnFoot) {
        if (this.lastInCar === false && playerPos && dist2D(playerPos, tgt) > 35) {
          return `${tr('obj.getInCar', 'GET IN CAR (E) ->')} ${tgt.label.toUpperCase()}${dStr}`;
        }
        return `${tr('obj.driveTo', 'DRIVE TO')} ${tgt ? tgt.label.toUpperCase() : 'EAST DOCKS'}${dStr}`;
      }
    }
    if (tp === 'skyline_ramp_jump') {
      return ms.jumpCleared
        ? `${tr('obj.driveTo', 'LAND AT')} ${tgt ? tgt.label.toUpperCase() : 'FINISH'}${dStr}`
        : `${tr('obj.megaRamp', 'HIT MEGA-RAMP >= 180 KM/H')}${dStr}`;
    }
    if (tp === 'convoy_smash' && ms.takedowns < ms.pursuerCount && this.checkpointIndex >= 1) {
      return `${tr('obj.ramPursuers', 'RAM PURSUERS')} ${ms.takedowns}/${ms.pursuerCount}${dStr}`;
    }
    if (tp === 'blackout_stealth') {
      if (tgt?.requiresOnFoot && playerPos && dist2D(playerPos, tgt) < 42) {
        return this.lastInCar
          ? `${tr('obj.exitAndEnter', 'EXIT CAR (E) -> ENTER')} ${(tgt.buildingLabel || tgt.label).toUpperCase()}${dStr}`
          : `${tr('obj.walkInside', 'WALK INSIDE')} ${(tgt.buildingLabel || tgt.label).toUpperCase()}${dStr}`;
      }
      return `${tr('obj.stealth', 'LIGHTS OFF · DODGE BEAMS')} (${Math.round(ms.detectionPct)}%)${dStr}`;
    }
    if (tp === 'double_cross_intercept') {
      return `${tr('obj.intercept', 'INTERCEPT PARTNER')} ${ms.interceptHits}/${ms.interceptHitsRequired}${dStr}`;
    }
    if (tp === 'lockdown_survival') {
      return `${tr('obj.lockdown', 'SURVIVE 4-STAR LOCKDOWN')} (${Math.max(0, Math.ceil(ms.surviveTargetSec - ms.survivedSec))}s)`;
    }
    if (tp === 'speed_bomb') {
      return `${tr('obj.speedBomb', 'KEEP >= 60 KM/H!')} (${Math.round(ms.lastSpeedKmh || 0)} KM/H)${dStr}`;
    }
    if (tp === 'boss_takedown') {
      return `${tr('obj.ramBoss', 'RAM BOSS LIMO')} (${Math.round(ms.bossHp)} HP)${dStr}`;
    }
    if (tgt?.requiresOnFoot) {
      return this.lastInCar
        ? `${tr('obj.exitAndEnter', 'EXIT CAR (E) -> ENTER')} ${(tgt.buildingLabel || tgt.label).toUpperCase()}${dStr}`
        : `${tr('obj.walkInside', 'WALK INSIDE')} ${(tgt.buildingLabel || tgt.label).toUpperCase()}${dStr}`;
    }
    if (tgt && this.lastInCar === false && playerPos && dist2D(playerPos, tgt) > 35) {
      return `${tr('obj.getInCar', 'GET IN CAR (E) ->')} ${tgt.label.toUpperCase()}${dStr}`;
    }
    if (tgt) {
      return `${tr('obj.driveTo', 'DRIVE TO')} ${tgt.label.toUpperCase()}${dStr}`;
    }
    return m.objectiveSummary.toUpperCase();
  }

  getLiveHelpGuide(playerPos = null, { isMobile = false, i18n = this.i18n } = {}) {
    const tr = (key, fb) => {
      if (i18n && typeof i18n.t === 'function') {
        const v = i18n.t(key);
        if (v && v !== key) return v;
      }
      return fb;
    };

    if (!this.isActive() || !this.activeMission) {
      const nextId = this.getNextIncompleteMissionId();
      const nextM = this.getMission(nextId);
      const rawSteps = Array.isArray(nextM?.steps) && nextM.steps.length
        ? nextM.steps
        : [
          'Follow cyan GPS arrows to reach mission markers or contracts',
          'Use EXIT / [E] near doors to walk inside Titan Bank or Pier 99',
          'Open Neon Phone or Pause Hub for Garage, Upgrades & All 20 Missions'
        ];
      return {
        active: false,
        missionId: nextId,
        act: nextM?.act || 1,
        title: nextM ? `${nextId} — ${nextM.title}` : tr('help.freeRoamTitle', 'QUICK GUIDE & CONTROLS'),
        chapterTag: nextM?.chapterTag || 'FREE ROAM',
        storyHook: nextM?.storyHook || nextM?.objectiveSummary || 'Explore Neon Bay Districts or launch your next story contract.',
        remainingTimeSec: null,
        distanceMeters: null,
        targetLabel: '',
        liveDirective: tr('obj.freeRoam', 'FREE ROAM — DRIVE OR TAP MISSION'),
        steps: rawSteps.map((text, idx) => ({ index: idx + 1, text, status: idx === 0 ? 'active' : 'todo' })),
        controlTip: isMobile
          ? 'Steer with Left Joystick (or STICK/BTNS toggle), accelerate with Green GAS, boost with Neon NOS Ring, hop out with EXIT orb, and tap TOOLS for 12 quick actions.'
          : 'WASD / Arrows to Drive & Walk · SHIFT / X for Nitro · SPACE to Drift / Jump · [E] Enter/Exit Car · [M] Full GPS Map · [TAB/P] Phone · [R] Flip Car.'
      };
    }

    const m = this.activeMission;
    const ms = this.mechanicState || {};
    const tgt = this.getActiveTarget();
    const distM = tgt && playerPos ? Math.round(dist2D(playerPos, tgt)) : null;
    const rawSteps = Array.isArray(m.steps) && m.steps.length
      ? m.steps
      : (m.checkpoints || []).map((c) => c.label || m.objectiveSummary);

    let activeIdx = 0;
    const tp = m.mechanics?.type;
    if (tp === 'barricade_breaker') {
      activeIdx = ms.barricadesSmashed < ms.targetBarricades ? 0 : Math.min(rawSteps.length - 1, 1 + this.checkpointIndex);
    } else if (tp === 'rain_drift') {
      const ratio = (ms.zonesHit || 0) / Math.max(1, ms.driftZonesRequired || 5);
      activeIdx = Math.min(rawSteps.length - 1, Math.floor(ratio * rawSteps.length));
    } else if (tp === 'ambush_escape') {
      activeIdx = ms.phase === 'approach' ? 0 : ms.phase === 'ambush_reverse' ? Math.min(rawSteps.length - 1, 1) : rawSteps.length - 1;
    } else if (tp === 'hacker_hijack') {
      activeIdx = ms.phase === 'chase_ram' ? 0 : rawSteps.length - 1;
    } else if (tp === 'no_brakes') {
      activeIdx = ms.checkpointsDone ? rawSteps.length - 1 : Math.min(rawSteps.length - 1, this.checkpointIndex);
    } else if (tp === 'skyline_ramp_jump') {
      activeIdx = ms.jumpCleared ? rawSteps.length - 1 : 0;
    } else if (tp === 'convoy_smash') {
      activeIdx = this.checkpointIndex === 0 ? 0 : ms.takedowns < ms.pursuerCount ? Math.min(rawSteps.length - 1, 1) : rawSteps.length - 1;
    } else if (tp === 'double_cross_intercept') {
      activeIdx = Math.min(rawSteps.length - 1, ms.interceptHits || 0);
    } else if (rawSteps.length > 0) {
      const cpTotal = Math.max(1, m.checkpoints?.length || 1);
      activeIdx = Math.min(rawSteps.length - 1, Math.floor((this.checkpointIndex / cpTotal) * rawSteps.length));
    }
    if (tgt?.requiresOnFoot && rawSteps.length > 0) {
      const footIdx = rawSteps.findIndex((s) => /exit car|walk inside|on foot|interior|vault|lounge|terminal/i.test(String(s)));
      if (footIdx >= 0) activeIdx = footIdx;
    }

    let controlTip = isMobile
      ? 'Follow the glowing cyan GPS route line with Joystick + Green GAS. Tap cyan NOS ring on straightaways to save seconds!'
      : 'Follow the cyan GPS route line with WASD / Arrows. Hold SHIFT on straightaways for Nitro boost!';

    if (tgt?.requiresOnFoot) {
      if (this.lastInCar) {
        controlTip = isMobile
          ? `Park near ${tgt.buildingLabel || tgt.label}, tap the circular EXIT orb (bottom-left), then walk into the glowing door with the Joystick!`
          : `Pull up outside ${tgt.buildingLabel || tgt.label}, press [E] to exit your car, and walk inside with WASD!`;
      } else {
        controlTip = isMobile
          ? `You are on foot — walk straight into the glowing ${(tgt.buildingLabel || tgt.label)} doorway using the Left Joystick!`
          : `You are on foot — walk directly into the glowing ${(tgt.buildingLabel || tgt.label)} entrance with WASD!`;
      }
    } else if (tgt && this.lastInCar === false && distM !== null && distM > 35) {
      controlTip = isMobile
        ? 'You are on foot — tap the ENTER/CALL orb (bottom-left) to hop back into your car and drive to the cyan marker!'
        : 'Press [E] next to your car (or [R] to call/flip) to get back inside and drive toward the waypoint!';
    } else if (tp === 'rain_drift') {
      controlTip = isMobile
        ? 'Drive into cyan Drift Zones, then hold Magenta DRIFT while steering left/right to stack Drift points!'
        : 'Enter each cyan Drift Zone and hold SPACE while turning with A/D to stack Drift points!';
    } else if (tp === 'no_brakes') {
      controlTip = isMobile
        ? 'Brakes are cut! Steer cleanly using only the Left Joystick and aim onto Palm Strip Beach Sand to coast to a stop.'
        : 'Brakes are cut! Use ONLY A/D steering and guide the car onto Palm Strip Beach Sand until speed drops under 5 km/h.';
    } else if (tp === 'ambush_escape') {
      controlTip = isMobile
        ? (ms.phase === 'ambush_reverse' ? 'Ambush! Hold Red BRAKE (reverse) to back out of Iron Docks trap, then sprint for Vega Garage!' : 'Sprint to Vega Garage using GAS + NOS!')
        : (ms.phase === 'ambush_reverse' ? 'Ambush! Hold [S / Down Arrow] to reverse clear of the trap, then race back to Vega Garage!' : 'Race to Vega Garage using SHIFT Nitro!');
    } else if (tp === 'hacker_hijack' && ms.phase === 'chase_ram') {
      controlTip = isMobile
        ? 'Boost with NOS and ram Zed’s blue sports car at high speed until its HP bar hits 0%!'
        : 'Use SHIFT Nitro and slam into Zed’s blue sports car until its HP hits 0%, then steal it!';
    } else if (tp === 'zero_scratch') {
      controlTip = 'Keep car condition >= 80%! Feather steering through corners, dodge AI traffic, and avoid slamming walls.';
    } else if (tp === 'barricade_breaker') {
      controlTip = 'Keep momentum high and smash straight through all 6 Syndicate barricades blocking the road — then walk inside Titan Bank on foot!';
    } else if (tp === 'skyline_ramp_jump') {
      controlTip = isMobile
        ? 'Line up straight with the Neon Sky-Ramp and hold GAS + cyan NOS Ring so speed exceeds 180 km/h at launch!'
        : 'Align straight toward the Neon Sky-Ramp and hold W + SHIFT Nitro to launch past 180 km/h!';
    } else if (tp === 'convoy_smash' || tp === 'boss_takedown' || tp === 'double_cross_intercept') {
      controlTip = isMobile
        ? 'Use Green GAS + cyan NOS Ring to sideswipe & ram targets hard!'
        : 'Hold W + SHIFT Nitro to slam targets off the road cleanly!';
    } else if (tp === 'blackout_stealth') {
      controlTip = isMobile
        ? 'Keep Headlights OFF (check TOOLS -> LIGHTS) and steer around sweeping Syndicate searchlight cones!'
        : 'Press [N] to turn Headlights OFF and steer clear of the sweeping searchlight cones!';
    } else if (tp === 'speed_bomb') {
      controlTip = 'NEVER drop below 60 km/h for 3 seconds! Feather wide drifts instead of hard braking on corners.';
    } else if (tp === 'lockdown_survival') {
      controlTip = 'Stay moving on wide Perimeter Highways, watch your Radar for blue police interceptors, and use Nitro to shake PIT maneuvers!';
    }

    return {
      active: true,
      missionId: m.id,
      act: m.act,
      title: `${m.id} — ${m.title}`,
      chapterTag: m.chapterTag || `ACT ${m.act}`,
      storyHook: m.storyHook || m.objectiveSummary,
      remainingTimeSec: Math.ceil(this.remainingTimeSec || 0),
      distanceMeters: distM,
      targetLabel: tgt?.buildingLabel || tgt?.label || '',
      liveDirective: this.getPlainObjectiveBanner(playerPos, i18n),
      steps: rawSteps.map((text, idx) => ({
        index: idx + 1,
        text,
        status: idx < activeIdx ? 'done' : idx === activeIdx ? 'active' : 'todo'
      })),
      controlTip
    };
  }

  refreshI18n() {
    if (this.isActive() && this.activeMission) {
      if (this.state === MISSION_STATES.INTRO) this._renderRadioBanner();
      this._renderMechanicHud();
    } else if ((this.state === MISSION_STATES.COMPLETED || this.state === MISSION_STATES.FAILED) && this.lastResult) {
      this._renderSummaryModal(this.lastResult);
    }
  }

  _initMechanicState(mission) {
    const mech = mission.mechanics || {};
    const type = mech.type;
    if (type === 'late_cop_drop') {
      return { type, lateCopSpawned: false };
    }
    if (type === 'rain_drift') {
      return {
        type,
        driftScore: 0,
        targetDriftScore: mech.targetDriftScore || 1000,
        zonesHit: 0,
        driftZonesRequired: mech.driftZonesRequired || 5
      };
    }
    if (type === 'alley_stunt') {
      return {
        type,
        rampsJumped: 0,
        rampsRequired: mech.rampsRequired || 2,
        lastSlowMoTriggered: false
      };
    }
    if (type === 'decoy_siren') {
      return {
        type,
        sirenTriggered: false,
        survivedSec: 0,
        surviveTargetSec: mech.surviveSec || 45
      };
    }
    if (type === 'ambush_escape') {
      const trapCp = mission.checkpoints[0];
      return {
        type,
        phase: 'approach',
        ambushFlashSec: 0,
        trapPoint: { x: trapCp.x, z: trapCp.z },
        reversedClear: false,
        suvPositions: []
      };
    }
    if (type === 'hacker_hijack') {
      const ts = mech.targetStart || { x: 0, z: -120, yaw: 0 };
      return {
        type,
        phase: 'chase_ram',
        targetName: mech.targetName || "Zed's Blue Sports Car",
        targetHp: mech.targetMaxHp || 100,
        targetMaxHp: mech.targetMaxHp || 100,
        ramCount: 0,
        ramCooldown: 0,
        switchedVehicle: false,
        targetPos: { x: ts.x, z: ts.z, yaw: ts.yaw || 0 },
        targetSegment: 0
      };
    }
    if (type === 'signal_ghost') {
      return {
        type,
        towersScrambled: 0,
        totalTowers: mech.cellTowers || 4,
        beepTimer: 0,
        beepIntervalSec: mech.baseBeepIntervalSec || 1.4,
        beepCount: 0
      };
    }
    if (type === 'highway_duel') {
      const rs = mech.rivalStart || { x: 165, z: -265, yaw: 0 };
      return {
        type,
        rivalName: mech.rivalName || 'Syndicate Courier',
        rivalPos: { x: rs.x, z: rs.z, yaw: rs.yaw || 0 },
        rivalFinished: false
      };
    }
    if (type === 'no_brakes') {
      return {
        type,
        disableBrakes: true,
        brakeAttemptsIgnored: 0,
        inBeachSand: false,
        checkpointsDone: false
      };
    }
    if (type === 'zero_scratch') {
      return {
        type,
        conditionPct: 100,
        minConditionPct: mech.minConditionPct || 80
      };
    }
    if (type === 'barricade_breaker') {
      const positions = (mech.barricadePositions || []).map((b, i) => ({ x: b.x, z: b.z, broken: false, idx: i }));
      return {
        type,
        barricadesSmashed: 0,
        targetBarricades: mech.targetBarricades || positions.length || 6,
        barricades: positions,
        heatTriggered: false
      };
    }
    if (type === 'skyline_ramp_jump') {
      return {
        type,
        minJumpSpeedKmh: mech.minJumpSpeedKmh || 180,
        jumpCleared: false,
        peakSpeedKmh: 0
      };
    }
    if (type === 'convoy_smash') {
      const count = mech.pursuerCount || 3;
      const sx = mission.spawn?.x || 165;
      const sz = mission.spawn?.z || 165;
      return {
        type,
        cargoMassKg: mech.cargoMassKg || 500,
        takedowns: 0,
        pursuerCount: count,
        ramCooldown: 0,
        pursuers: Array.from({ length: count }, (_, i) => ({
          id: i,
          x: sx + (i - 1) * 8,
          z: sz + 18 + i * 6,
          yaw: mission.spawn?.yaw || 0,
          active: true
        }))
      };
    }
    if (type === 'blackout_stealth') {
      return {
        type,
        sweepTime: 0,
        detectionPct: 0,
        activeCones: (mech.searchlights || []).map((s) => ({ x: s.x, z: s.z, coneRadius: s.coneRadius || 15 }))
      };
    }
    if (type === 'double_cross_intercept') {
      const ts = mech.targetStart || { x: -120, z: 165, yaw: Math.PI / 2 };
      return {
        type,
        targetName: mech.targetName || 'Rogue Partner',
        targetPos: { x: ts.x, z: ts.z, yaw: ts.yaw || 0 },
        waypointIdx: 0,
        interceptHits: 0,
        interceptHitsRequired: mech.interceptHitsRequired || 2,
        ramCooldown: 0,
        targetEscaped: false
      };
    }
    if (type === 'lockdown_survival') {
      return {
        type,
        survivedSec: 0,
        surviveTargetSec: mech.surviveSec || 120
      };
    }
    if (type === 'mid_mission_switch') {
      return {
        type,
        switched: false,
        currentVehicleId: mech.startVehicleId || 'B01'
      };
    }
    if (type === 'speed_bomb') {
      return {
        type,
        minSpeedKmh: mech.minSpeedKmh || 60,
        explodeDelaySec: mech.explodeDelaySec || 3.0,
        armGraceSec: mech.armGraceSec || 5.0,
        armed: false,
        lowSpeedTimerSec: 0,
        lastSpeedKmh: 0
      };
    }
    if (type === 'boss_takedown') {
      const bs = mech.bossStart || { x: -165, z: -120, yaw: 0 };
      return {
        type,
        bossName: mech.bossName || "Don Salazar's Armoured Limo",
        bossHp: mech.bossMaxHp || 150,
        bossMaxHp: mech.bossMaxHp || 150,
        ramCount: 0,
        ramCooldown: 0,
        bossPos: { x: bs.x, z: bs.z, yaw: bs.yaw || 0 },
        bossSegment: 0
      };
    }
    if (type === 'sunrise_finale') {
      return {
        type,
        unlockVehicleId: mech.unlockVehicleId || 'C11',
        unlockCity2: !!mech.unlockCity2
      };
    }
    return { type: type || 'standard' };
  }

  _setDisableBrakes(val) {
    this.disableBrakes = !!val;
    this.callbacks.onDisableBrakesChange?.(this.disableBrakes);
  }

  startMission(missionId) {
    const mission = this.getMission(missionId);
    if (!mission) {
      return { ok: false, reason: 'not-found' };
    }

    const fails = this.getConsecutiveFails(mission.id);
    const assistActive = fails >= ASSIST_FAIL_THRESHOLD;
    const totalTimeLimitSec = mission.timeLimitSec + (assistActive ? ASSIST_BONUS_TIME_SEC : 0);
    const policeAggressionMult = assistActive ? ASSIST_POLICE_AGGRESSION_MULT : 1.0;

    this.activeMission = mission;
    this.state = MISSION_STATES.INTRO;
    this.elapsedSec = 0;
    this.totalTimeLimitSec = totalTimeLimitSec;
    this.remainingTimeSec = totalTimeLimitSec;
    this.checkpointIndex = 0;
    this.checkpointsCleared = 0;
    this.assistActive = assistActive;
    this.policeAggressionMult = policeAggressionMult;
    this.introRemainingSec = 3.0;
    this._commsRemainingSec = 0;
    this._triggeredComms?.clear?.();
    this.mechanicState = this._initMechanicState(mission);
    this.lastResult = null;
    this.lastPlayerPos = { x: mission.spawn.x, z: mission.spawn.z };
    this.lastInCar = true;

    this._setDisableBrakes(!!mission.mechanics?.disableBrakes);
    this.callbacks.onBlackoutModeChange?.(mission.mechanics?.type === 'blackout_stealth');

    if (this.gameState?.getState) {
      const curState = this.gameState.getState();
      if (curState === 'GARAGE' || curState === 'PHOTO_MODE' || curState === 'PAUSED') {
        this.gameState.transition('FREE_ROAM');
      }
      if (this.gameState.getState() !== 'MISSION_ACTIVE') {
        this.gameState.transition('MISSION_ACTIVE');
      }
    }

    this.callbacks.onMissionStart?.(mission, {
      assistActive,
      policeAggressionMult,
      disableBrakes: this.disableBrakes
    });

    if (mission.mechanics?.type === 'lockdown_survival' || mission.mechanics?.type === 'sunrise_finale') {
      this.callbacks.onSpawnPolice?.(
        mission.mechanics.triggerWantedStars || 4,
        `${mission.id}: ${mission.mechanics.triggerWantedStars || 4}-STAR PURSUIT ACTIVE!`
      );
    }

    this.eventBus?.emit?.('mission:start', {
      missionId: mission.id,
      title: mission.title,
      act: mission.act,
      vehicleId: mission.vehicleId,
      timeLimitSec: totalTimeLimitSec,
      assistActive
    });

    this.saveProgress();
    this._hideModal();
    this._renderRadioBanner();
    this._renderMechanicHud();
    return {
      ok: true,
      missionId: mission.id,
      state: this.state,
      assistActive,
      totalTimeLimitSec,
      policeAggressionMult,
      disableBrakes: this.disableBrakes
    };
  }

  _advanceHackerTarget(dt) {
    const ms = this.mechanicState;
    const m = this.activeMission;
    if (!ms || ms.phase !== 'chase_ram' || !ms.targetPos) return;
    const spd = (m.mechanics?.targetSpeed || 15) * (this.policeAggressionMult < 1 ? 0.9 : 1.0);
    // Patrol clockwise along wide Apex Core axes (x in [0..300], z in [-300..300])
    const pos = ms.targetPos;
    if (ms.targetSegment === 0) {
      pos.z += spd * dt;
      pos.yaw = 0;
      if (pos.z >= 300) { pos.z = 300; ms.targetSegment = 1; }
    } else if (ms.targetSegment === 1) {
      pos.x += spd * dt;
      pos.yaw = Math.PI / 2;
      if (pos.x >= 300) { pos.x = 300; ms.targetSegment = 2; }
    } else if (ms.targetSegment === 2) {
      pos.z -= spd * dt;
      pos.yaw = Math.PI;
      if (pos.z <= -300) { pos.z = -300; ms.targetSegment = 3; }
    } else {
      pos.x -= spd * dt;
      pos.yaw = -Math.PI / 2;
      if (pos.x <= 0) { pos.x = 0; ms.targetSegment = 0; }
    }
  }

  _advanceRivalCourier(dt) {
    const ms = this.mechanicState;
    const m = this.activeMission;
    if (!ms || !ms.rivalPos) return;
    const speed = (m.mechanics?.rivalSpeed || 17.5) * (this.policeAggressionMult < 1 ? 0.85 : 1.0);
    ms.rivalPos.z += speed * dt;
    ms.rivalPos.yaw = 0;
    if (ms.rivalPos.z >= (m.mechanics?.finishZ || 330)) {
      ms.rivalFinished = true;
    }
  }

  _advanceDoubleCrossTarget(dt) {
    const ms = this.mechanicState;
    const m = this.activeMission;
    const wps = m.mechanics?.targetWaypoints || [];
    if (!ms || !wps.length || ms.targetEscaped) return;
    const tgtWp = wps[ms.waypointIdx];
    if (!tgtWp) {
      ms.targetEscaped = true;
      return;
    }
    const dx = tgtWp.x - ms.targetPos.x;
    const dz = tgtWp.z - ms.targetPos.z;
    const d = Math.hypot(dx, dz);
    const spd = (m.mechanics?.targetSpeed || 16.5) * (this.policeAggressionMult < 1 ? 0.85 : 1.0);
    if (d <= Math.max(2, spd * dt)) {
      ms.targetPos.x = tgtWp.x;
      ms.targetPos.z = tgtWp.z;
      ms.waypointIdx += 1;
      if (ms.waypointIdx >= wps.length) ms.targetEscaped = true;
    } else if (d > 0.001) {
      ms.targetPos.x += (dx / d) * spd * dt;
      ms.targetPos.z += (dz / d) * spd * dt;
      ms.targetPos.yaw = Math.atan2(dx, dz);
    }
  }

  _advanceBossLimo(dt) {
    const ms = this.mechanicState;
    const m = this.activeMission;
    if (!ms || !ms.bossPos) return;
    const spd = (m.mechanics?.bossSpeed || 14.5) * (this.policeAggressionMult < 1 ? 0.88 : 1.0);
    const pos = ms.bossPos;
    if (ms.bossSegment === 0) {
      pos.z += spd * dt;
      pos.yaw = 0;
      if (pos.z >= 300) { pos.z = 300; ms.bossSegment = 1; }
    } else if (ms.bossSegment === 1) {
      pos.x += spd * dt;
      pos.yaw = Math.PI / 2;
      if (pos.x >= 300) { pos.x = 300; ms.bossSegment = 2; }
    } else if (ms.bossSegment === 2) {
      pos.z -= spd * dt;
      pos.yaw = Math.PI;
      if (pos.z <= -300) { pos.z = -300; ms.bossSegment = 3; }
    } else {
      pos.x -= spd * dt;
      pos.yaw = -Math.PI / 2;
      if (pos.x <= -300) { pos.x = -300; ms.bossSegment = 0; }
    }
  }

  _advanceConvoyPursuers(dt, playerPos) {
    const ms = this.mechanicState;
    const m = this.activeMission;
    if (!ms || !Array.isArray(ms.pursuers)) return;
    const spd = (m.mechanics?.pursuerSpeed || 17) * (this.policeAggressionMult < 1 ? 0.85 : 1.0);
    for (const pur of ms.pursuers) {
      if (!pur.active) continue;
      const dx = (playerPos.x || 0) - pur.x;
      const dz = (playerPos.z || 0) - pur.z;
      const d = Math.hypot(dx, dz);
      if (d > 1.5) {
        pur.x += (dx / d) * spd * dt;
        pur.z += (dz / d) * spd * dt;
        pur.yaw = Math.atan2(dx, dz);
      }
    }
  }

  _showMidComms(key, comm, badge = 'LIVE COMMS') {
    const m = this.activeMission;
    if (!m || !comm?.line || this._triggeredComms?.has?.(key)) return;
    this._triggeredComms?.add?.(key);
    this._commsRemainingSec = 3.2;
    this.eventBus?.emit?.('mission:comms', { missionId: m.id, key, speaker: comm.speaker, line: comm.line });
    if (!this._radioEl) return;
    this._radioEl.replaceChildren();
    const header = this._el('div', 'mission-radio-head', `${badge} · ${m.id}`);
    const row = this._el('div', 'mission-radio-line');
    const spk = this._el('strong', 'mission-radio-speaker', `${comm.speaker || 'Fixer'}:`);
    spk.style.color = comm.color || '#00f0ff';
    const txt = this._el('span', 'mission-radio-text', comm.line);
    row.append(spk, txt);
    this._radioEl.append(header, row);
    this._radioEl.hidden = false;
  }

  _checkMidComms(key) {
    const comm = this.activeMission?.midComms?.[key];
    if (comm) this._showMidComms(key, comm);
  }

  _advanceCheckpointAndComms(m, activeCp) {
    this.checkpointIndex += 1;
    this.checkpointsCleared += 1;
    this.eventBus?.emit?.('mission:checkpoint', { missionId: m.id, checkpoint: activeCp, index: this.checkpointIndex });
    const nextCp = m.checkpoints[this.checkpointIndex];
    if (nextCp?.requiresOnFoot) {
      this._checkMidComms('onFoot');
    }
  }

  _canClearCheckpoint(cp, p, ctx = {}) {
    if (!cp) return false;
    const d = dist2D(p, cp);
    if (d > cp.radius) {
      if (cp.requiresOnFoot && ctx.inCar === true && d <= Math.max(cp.radius + 18, 26)) {
        this._emitHint(cp.enterHint || `Park & EXIT CAR (E) -> Walk inside ${cp.buildingLabel || cp.label}!`);
      }
      return false;
    }
    if (cp.requiresOnFoot && ctx.inCar === true) {
      this._emitHint(cp.enterHint || `EXIT CAR (E) first to walk inside ${cp.buildingLabel || cp.label}!`);
      return false;
    }
    return true;
  }

  saveProgress() {
    if (!this.isActive() || !this.activeMission) return false;
    return this.saveManager?.setLastMission?.(this.activeMission.id, {
      version:1, state:this.state, remainingTimeSec:this.remainingTimeSec,
      elapsedSec:this.elapsedSec, totalTimeLimitSec:this.totalTimeLimitSec,
      checkpointIndex:this.checkpointIndex, checkpointsCleared:this.checkpointsCleared,
      introRemainingSec:this.introRemainingSec, mechanicState:this.mechanicState,
      triggeredComms:[...(this._triggeredComms || [])],
      runtime:this.captureRuntime?.() || {player:this.lastPlayerPos,inCar:this.lastInCar}
    });
  }

  resumeMission(id, snapshot) {
    const m = this.getMission(id);
    if (!m || !this.saveManager?._validMissionState?.(snapshot) ||
        !Number.isInteger(snapshot.checkpointIndex) || snapshot.checkpointIndex < 0 || snapshot.checkpointIndex > m.checkpoints.length ||
        snapshot.mechanicState?.type !== m.mechanics.type) {
      this.saveManager?.setLastMission?.(null); return {ok:false,reason:'invalid-resume'};
    }
    const copy = JSON.parse(JSON.stringify(snapshot));
    this.startMission(id);
    this.state = copy.state;
    this.remainingTimeSec = Math.min(copy.remainingTimeSec, this.totalTimeLimitSec);
    this.elapsedSec = Math.max(0, Number(copy.elapsedSec) || 0);
    this.checkpointIndex = copy.checkpointIndex;
    this.checkpointsCleared = Math.max(0, Number(copy.checkpointsCleared) || 0);
    this.introRemainingSec = Math.max(0, Math.min(3, Number(copy.introRemainingSec) || 0));
    this.mechanicState = copy.mechanicState;
    this._triggeredComms = new Set(Array.isArray(copy.triggeredComms) ? copy.triggeredComms : []);
    if (copy.runtime?.player) this.lastPlayerPos = {x:copy.runtime.player.x,z:copy.runtime.player.z};
    this.lastInCar = copy.runtime?.inCar !== false;
    this.restoreRuntime?.(copy.runtime);
    if (this.state === MISSION_STATES.ACTIVE) this._hideRadioBanner();
    this._renderMechanicHud();
    this.saveProgress();
    return {ok:true,resumed:true};
  }

  update(dt, ctx = {}) {
    const result = this._updateMission(dt, ctx);
    this._resumeSaveClock = (this._resumeSaveClock || 0) + Math.max(0, Number(dt) || 0);
    if (this._resumeSaveClock >= 1) { this._resumeSaveClock = 0; this.saveProgress(); }
    return result;
  }

  _updateMission(dt, ctx = {}) {
    if (!this.isActive() || !this.activeMission) {
      return { state: this.state };
    }
    const step = Math.max(0, Math.min(0.25, Number(dt) || 0));
    const m = this.activeMission;
    const mech = m.mechanics || {};
    const ms = this.mechanicState;
    const p = ctx.player || this.lastPlayerPos;
    this.lastPlayerPos = { x: p.x || 0, z: p.z || 0 };
    if (typeof ctx.inCar === 'boolean') {
      this.lastInCar = ctx.inCar;
    }
    const vel = Number(ctx.velocity || 0);

    this.elapsedSec += step;
    this.remainingTimeSec = Math.max(0, this.remainingTimeSec - step);
    this._hintCooldown = Math.max(0, (this._hintCooldown || 0) - step);

    if (this.state === MISSION_STATES.INTRO) {
      this.introRemainingSec = Math.max(0, this.introRemainingSec - step);
      if (this.introRemainingSec <= 0) {
        this.state = MISSION_STATES.ACTIVE;
        this._hideRadioBanner();
      }
    } else if (this._commsRemainingSec > 0) {
      this._commsRemainingSec = Math.max(0, this._commsRemainingSec - step);
      if (this._commsRemainingSec <= 0) {
        this._hideRadioBanner();
      }
    }

    if (ctx.vehicleDestroyed || (ctx.vehicleHp !== undefined && ctx.vehicleHp !== null && ctx.vehicleHp <= 0)) {
      return this.failMission('vehicle_destroyed');
    }
    // M16 survives 120s lockdown right as countdown hits 0 -> do not expire if target survival reached
    if (this.remainingTimeSec <= 0 && !(mech.type === 'lockdown_survival' && ms.survivedSec + step >= ms.surviveTargetSec)) {
      return this.failMission('time_expired');
    }

    const activeCp = m.checkpoints[this.checkpointIndex] || null;

    // ── M1: Late 15s patrol spawn ─────────────────────────────────────────────
    if (mech.type === 'late_cop_drop') {
      if (!ms.lateCopSpawned && this.remainingTimeSec <= (mech.lateCopAtRemainingSec ?? 15)) {
        ms.lateCopSpawned = true;
        this.callbacks.onSpawnPolice?.(mech.lateCopStars || 1, 'Patrol spotted your signal! Reach Pier 99!');
        this.eventBus?.emit?.('mission:twist', { missionId: m.id, kind: 'late_cop' });
        this._checkMidComms('twist');
      }
      if (this._canClearCheckpoint(activeCp, p, ctx)) {
        this._advanceCheckpointAndComms(m, activeCp);
        if (this.checkpointIndex >= m.checkpoints.length) {
          return this.completeMission();
        }
      }
    }

    // ── M2: Rain & Drift (Wet tarmac + 5 Neon Drift Zones) ───────────────────
    else if (mech.type === 'rain_drift') {
      const isSliding = !!ctx.drifting || Number(ctx.driftAmount || 0) > 0.2 || (Math.abs(vel) > 10 && Math.abs(ctx.steer || 0) > 0.35);
      if (isSliding) {
        const zoneBoost = activeCp && dist2D(p, activeCp) <= activeCp.radius * 1.6 ? 1.5 : 1.0;
        ms.driftScore += (mech.driftScoreRate || 280) * zoneBoost * step;
      }
      if (activeCp && dist2D(p, activeCp) <= activeCp.radius) {
        ms.zonesHit += 1;
        ms.driftScore += mech.zoneBonusPoints || 220;
        this._advanceCheckpointAndComms(m, activeCp);
        if (ms.zonesHit >= 3) this._checkMidComms('halfway');
      }
      if (ms.zonesHit >= ms.driftZonesRequired && ms.driftScore >= ms.targetDriftScore) {
        return this.completeMission();
      }
      if (this.checkpointIndex >= m.checkpoints.length && ms.driftScore < ms.targetDriftScore) {
        this._emitHint(`Keep drifting in turns! Score ${Math.round(ms.driftScore)}/${ms.targetDriftScore}`);
      }
    }

    // ── M3: Alleyway Phantom (Shadow Alley + 2 Stunt Ramps + Slow-Mo) ─────────
    else if (mech.type === 'alley_stunt') {
      if (activeCp && dist2D(p, activeCp) <= activeCp.radius) {
        if (activeCp.isRamp) {
          ms.rampsJumped += 1;
          this.callbacks.onTriggerSlowMo?.(mech.slowMoSec || 1.5);
          this._checkMidComms('ramp');
        }
        this._advanceCheckpointAndComms(m, activeCp);
        if (this.checkpointIndex >= m.checkpoints.length) {
          return this.completeMission();
        }
      }
    }

    // ── M4: The Decoy Siren (2-Star Trigger + 45s Survival) ───────────────────
    else if (mech.type === 'decoy_siren') {
      if (!ms.sirenTriggered) {
        if (this._canClearCheckpoint(activeCp, p, ctx)) {
          ms.sirenTriggered = true;
          this.checkpointsCleared = 1;
          this.callbacks.onSpawnPolice?.(mech.triggerWantedStars || 2, 'DECOY SIREN TRIPPED! Survive 45s pursuit!');
          this.eventBus?.emit?.('mission:twist', { missionId: m.id, kind: 'decoy_siren' });
          this._checkMidComms('twist');
        }
      } else {
        ms.survivedSec += step;
        if (ms.survivedSec >= ms.surviveTargetSec) {
          return this.completeMission();
        }
      }
    }

    // ── M5: THE AMBUSH (3 Black SUVs + Red Screen Flash + Reverse Escape) ─────
    else if (mech.type === 'ambush_escape') {
      if (ms.ambushFlashSec > 0) {
        ms.ambushFlashSec = Math.max(0, ms.ambushFlashSec - step);
      }
      if (ms.phase === 'approach') {
        const trapCp = m.checkpoints[0];
        if (dist2D(p, trapCp) <= trapCp.radius) {
          ms.phase = 'ambush_reverse';
          ms.ambushFlashSec = 2.6;
          ms.trapEntryPos = { x: p.x || 0, z: p.z || 0 };
          ms.hasReversed = false;
          this.checkpointsCleared = 1;
          this.checkpointIndex = 1;
          // Position 3 blocking SUVs immediately west ahead of Iron Docks exit
          ms.suvPositions = [
            { x: trapCp.x - 10, z: trapCp.z - 4.5, yaw: Math.PI / 2 },
            { x: trapCp.x - 10, z: trapCp.z, yaw: Math.PI / 2 },
            { x: trapCp.x - 10, z: trapCp.z + 4.5, yaw: Math.PI / 2 }
          ];
          this.callbacks.onAmbushTrap?.(ms.suvPositions, mech.ambushFlashText);
          this.callbacks.onSpawnPolice?.(mech.ambushWantedStars || 2, mech.ambushFlashText || "IT'S A TRAP! ESCAPE!");
          this.eventBus?.emit?.('mission:twist', { missionId: m.id, kind: 'ambush_trap' });
          this._checkMidComms('trap');
        }
      } else if (ms.phase === 'ambush_reverse') {
        if (vel < -0.5 || !!ctx.reverseInput) {
          ms.hasReversed = true;
        }
        const clearDist = mech.reverseClearDistance || 12;
        const dTrap = dist2D(p, ms.trapPoint);
        const dEntry = dist2D(p, ms.trapEntryPos || ms.trapPoint);
        if (dEntry >= clearDist && dTrap >= clearDist) {
          ms.reversedClear = true;
          ms.phase = 'escape_garage';
          this.eventBus?.emit?.('mission:checkpoint', { missionId: m.id, phase: 'escape_garage' });
          this._checkMidComms('cleared');
        }
      } else if (ms.phase === 'escape_garage') {
        const goal = mech.escapeGoal || m.checkpoints[1];
        if (dist2D(p, goal) <= (goal.radius || 16)) {
          return this.completeMission();
        }
      }
    }

    // ── M6: Hijack the Hacker (Ram Blue Sports Car HP Bar -> Switch -> Garage) ─
    else if (mech.type === 'hacker_hijack') {
      ms.ramCooldown = Math.max(0, ms.ramCooldown - step);
      if (ms.phase === 'chase_ram') {
        this._advanceHackerTarget(step);
        const dTarget = dist2D(p, ms.targetPos);
        if (dTarget <= (mech.ramRadius || 7.5) && Math.abs(vel) >= (mech.minRamSpeed || 6) && ms.ramCooldown <= 0) {
          ms.ramCooldown = mech.ramCooldownSec || 0.7;
          ms.ramCount += 1;
          ms.targetHp = Math.max(0, ms.targetHp - (mech.ramDamage || 30));
          this.callbacks.onTargetRammed?.(ms.targetHp, ms.targetMaxHp, ms.targetPos);
          this.eventBus?.emit?.('mission:mechanicUpdate', { missionId: m.id, targetHp: ms.targetHp, ramCount: ms.ramCount });
        }
        if (ms.targetHp <= 0) {
          ms.switchedVehicle = true;
          ms.phase = 'deliver_garage';
          this.callbacks.onSwitchToTargetVehicle?.(mech.switchVehicleId || 'C04', { ...ms.targetPos });
          this.eventBus?.emit?.('mission:twist', { missionId: m.id, kind: 'target_hijacked' });
          this._checkMidComms('hijacked');
        }
      } else if (ms.phase === 'deliver_garage') {
        const goal = mech.dropoffGoal || m.checkpoints[0];
        if (dist2D(p, goal) <= (goal.radius || 16)) {
          return this.completeMission();
        }
      }
    }

    // ── M7: Signal Ghost (Accelerating Bomb Beep + 4 Cell Towers) ────────────
    else if (mech.type === 'signal_ghost') {
      const ratio = this.totalTimeLimitSec > 0 ? Math.max(0, Math.min(1, this.remainingTimeSec / this.totalTimeLimitSec)) : 0;
      const minB = mech.minBeepIntervalSec || 0.22;
      const maxB = mech.baseBeepIntervalSec || 1.4;
      ms.beepIntervalSec = minB + (maxB - minB) * ratio;
      ms.beepTimer += step;
      if (ms.beepTimer >= ms.beepIntervalSec) {
        ms.beepTimer = 0;
        ms.beepCount += 1;
        this.callbacks.onBeep?.(ms.beepIntervalSec, ms.beepCount);
      }
      if (activeCp && dist2D(p, activeCp) <= activeCp.radius) {
        ms.towersScrambled += 1;
        this._advanceCheckpointAndComms(m, activeCp);
        if (ms.towersScrambled === 2) this._checkMidComms('halfway');
        if (ms.towersScrambled >= ms.totalTowers || this.checkpointIndex >= m.checkpoints.length) {
          return this.completeMission();
        }
      }
    }

    // ── M8: Midnight Highway Duel (Race Syndicate Courier on Expressway) ─────
    else if (mech.type === 'highway_duel') {
      this._advanceRivalCourier(step);
      if (activeCp && dist2D(p, activeCp) <= activeCp.radius) {
        this._advanceCheckpointAndComms(m, activeCp);
        if (this.checkpointIndex >= 2) this._checkMidComms('halfway');
        if (this.checkpointIndex >= m.checkpoints.length) {
          return this.completeMission();
        }
      }
      if (ms.rivalFinished) {
        return this.failMission('rival_escaped');
      }
    }

    // ── M9: NO BRAKES! (Brakes Disabled -> Crash-Stop in Palm Strip Beach Sand) ─
    else if (mech.type === 'no_brakes') {
      this._setDisableBrakes(true);
      ms.disableBrakes = true;
      if (ctx.brakingAttempted) {
        ms.brakeAttemptsIgnored += 1;
      }
      if (activeCp && !activeCp.isBeachSand && dist2D(p, activeCp) <= activeCp.radius) {
        this._advanceCheckpointAndComms(m, activeCp);
        if (this.checkpointIndex >= 2) this._checkMidComms('sandApproach');
      }
      const roadDone = this.checkpointIndex >= m.checkpoints.length - 1;
      if (roadDone) ms.checkpointsDone = true;
      const inSand = p.z <= (mech.beachSandZMax ?? -392);
      ms.inBeachSand = inSand;
      if (ms.checkpointsDone && inSand && Math.abs(vel) <= (mech.stopSpeedMax ?? 2.0)) {
        return this.completeMission();
      }
    }

    // ── M10: Zero-Scratch Heist (Live Condition Meter >= 80%) ────────────────
    else if (mech.type === 'zero_scratch') {
      const cond = ctx.vehicleHp !== undefined && ctx.vehicleHp !== null ? Math.max(0, Math.min(100, Number(ctx.vehicleHp))) : ms.conditionPct;
      ms.conditionPct = cond;
      if (cond < (mech.minConditionPct || 80)) {
        return this.failMission('vehicle_scratched');
      }
      if (this._canClearCheckpoint(activeCp, p, ctx)) {
        this._advanceCheckpointAndComms(m, activeCp);
        if (this.checkpointIndex >= m.checkpoints.length) {
          return this.completeMission();
        }
      }
    }

    // ── M11: Barricade Breaker (Smash 6 Police Barricades at Titan Bank) ─────
    else if (mech.type === 'barricade_breaker') {
      const smashR = mech.smashRadius || 9;
      const minSpd = mech.minSmashSpeed || 5;
      for (const b of ms.barricades) {
        if (!b.broken && dist2D(p, b) <= smashR && Math.abs(vel) >= minSpd) {
          b.broken = true;
          ms.barricadesSmashed += 1;
          this.callbacks.onBarricadeSmash?.(b, ms.barricadesSmashed, ms.targetBarricades);
          if (ms.barricadesSmashed >= ms.targetBarricades) {
            this._checkMidComms('barsCleared');
          }
          if (!ms.heatTriggered) {
            ms.heatTriggered = true;
            this.callbacks.onSpawnPolice?.(mech.triggerWantedStars || 2, 'Barricade breached! Evade Patrol to East Docks!');
          }
        }
      }
      if (ctx.barricadesBrokenDelta > 0) {
        ms.barricadesSmashed = Math.min(ms.targetBarricades, ms.barricadesSmashed + Number(ctx.barricadesBrokenDelta));
        if (ms.barricadesSmashed >= ms.targetBarricades) this._checkMidComms('barsCleared');
      }
      if (this._canClearCheckpoint(activeCp, p, ctx)) {
        const isBank = activeCp.id === 'm11_bank';
        const isLast = this.checkpointIndex === m.checkpoints.length - 1;
        if ((!isBank && !isLast) || ms.barricadesSmashed >= ms.targetBarricades) {
          this._advanceCheckpointAndComms(m, activeCp);
          if (isBank) this._checkMidComms('vaultGrabbed');
          if (this.checkpointIndex >= m.checkpoints.length && ms.barricadesSmashed >= ms.targetBarricades) {
            return this.completeMission();
          }
        } else if (ms.barricadesSmashed < ms.targetBarricades) {
          const leftB = ms.targetBarricades - ms.barricadesSmashed;
          this._emitHint(`Smash ${leftB} more police barricade${leftB > 1 ? 's' : ''} outside Titan Bank first!`);
        }
      }
    }

    // ── M12: Skyline Ramp Jump (180+ km/h + Slow-Mo Side Camera) ─────────────
    else if (mech.type === 'skyline_ramp_jump') {
      const speedKmh = Math.max(Math.abs(vel) * 3.6, Number(ctx.speedKmh || 0));
      ms.peakSpeedKmh = Math.max(ms.peakSpeedKmh, speedKmh);
      if (activeCp && dist2D(p, activeCp) <= activeCp.radius) {
        if (activeCp.isMegaRamp) {
          if (speedKmh >= (mech.minJumpSpeedKmh || 180) || ms.peakSpeedKmh >= (mech.minJumpSpeedKmh || 180)) {
            ms.jumpCleared = true;
            this.callbacks.onTriggerSlowMo?.(mech.slowMoSec || 1.5, 'side_cam');
            this._checkMidComms('ramp');
            this._advanceCheckpointAndComms(m, activeCp);
          } else {
            this._emitHint(`Need ${mech.minJumpSpeedKmh || 180}+ km/h on the ramp! Back up south & hold NITRO (Shift)!`);
          }
        } else {
          this._advanceCheckpointAndComms(m, activeCp);
          if (this.checkpointIndex >= m.checkpoints.length && ms.jumpCleared) {
            return this.completeMission();
          }
        }
      }
    }

    // ── M13: Gold Convoy Escape (500kg Cargo + Smash 3 Pursuers) ─────────────
    else if (mech.type === 'convoy_smash') {
      ms.ramCooldown = Math.max(0, ms.ramCooldown - step);
      this._advanceConvoyPursuers(step, p);
      if (ms.ramCooldown <= 0 && Math.abs(vel) >= (mech.minSmashSpeed || 7)) {
        for (const pur of ms.pursuers) {
          if (pur.active && dist2D(p, pur) <= (mech.smashRadius || 9.0)) {
            pur.active = false;
            ms.takedowns += 1;
            ms.ramCooldown = mech.ramCooldownSec || 0.55;
            this.callbacks.onTargetRammed?.(ms.pursuerCount - ms.takedowns, ms.pursuerCount, pur);
            if (ms.takedowns >= ms.pursuerCount) this._checkMidComms('clearedPursuers');
            break;
          }
        }
      }
      if (activeCp && dist2D(p, activeCp) <= activeCp.radius) {
        const isLast = this.checkpointIndex === m.checkpoints.length - 1;
        if (!isLast || ms.takedowns >= ms.pursuerCount) {
          this._advanceCheckpointAndComms(m, activeCp);
        } else {
          this._emitHint(`Smash all ${ms.pursuerCount} pursuing trucks first (${ms.takedowns}/${ms.pursuerCount})!`);
        }
      }
      if (this.checkpointIndex >= m.checkpoints.length && ms.takedowns >= ms.pursuerCount) {
        return this.completeMission();
      }
    }

    // ── M14: Blackout Stealth (Headlights Off + Sweeping Ground Searchlights) ─
    else if (mech.type === 'blackout_stealth') {
      ms.sweepTime += step;
      const lights = mech.searchlights || [];
      let inLight = false;
      for (let i = 0; i < lights.length; i++) {
        const s = lights[i];
        const lx = s.x + Math.cos(ms.sweepTime * s.speed + s.phase) * s.sweepRadius;
        const lz = s.z + Math.sin(ms.sweepTime * s.speed + s.phase) * s.sweepRadius;
        ms.activeCones[i] = { x: lx, z: lz, coneRadius: s.coneRadius || 15 };
        if (dist2D(p, ms.activeCones[i]) <= (s.coneRadius || 15)) {
          inLight = true;
        }
      }
      if (inLight) {
        ms.detectionPct = Math.min(100, ms.detectionPct + (mech.detectionRatePerSec || 65) * step);
      } else {
        ms.detectionPct = Math.max(0, ms.detectionPct - (mech.decayRatePerSec || 35) * step);
      }
      if (ms.detectionPct >= 100) {
        return this.failMission('spotted_by_searchlight');
      }
      if (this._canClearCheckpoint(activeCp, p, ctx)) {
        this._advanceCheckpointAndComms(m, activeCp);
        if (this.checkpointIndex >= m.checkpoints.length) {
          return this.completeMission();
        }
      }
    }

    // ── M15: THE DOUBLE CROSS (Cut off Rogue Partner before Airport Runway) ───
    else if (mech.type === 'double_cross_intercept') {
      ms.ramCooldown = Math.max(0, ms.ramCooldown - step);
      this._advanceDoubleCrossTarget(step);
      if (dist2D(p, ms.targetPos) <= (mech.interceptRadius || 11) && Math.abs(vel) >= 6 && ms.ramCooldown <= 0) {
        ms.ramCooldown = mech.ramCooldownSec || 0.65;
        ms.interceptHits += 1;
        this.callbacks.onTargetRammed?.(ms.interceptHitsRequired - ms.interceptHits, ms.interceptHitsRequired, ms.targetPos);
        if (ms.interceptHits === 1) this._checkMidComms('firstHit');
        if (ms.interceptHits >= ms.interceptHitsRequired) {
          return this.completeMission();
        }
      }
      if (ms.targetEscaped) {
        return this.failMission('partner_escaped');
      }
    }

    // ── M16: 4-Star Lockdown (Survive 120s 4-Star Pursuit) ───────────────────
    else if (mech.type === 'lockdown_survival') {
      ms.survivedSec += step;
      if (ms.survivedSec >= 60) this._checkMidComms('halfway');
      if (ms.survivedSec >= ms.surviveTargetSec) {
        return this.completeMission();
      }
    }

    // ── M17: The Bay Switch (Mid-Mission B01 Bike -> C10 Hypercar Swap) ──────
    else if (mech.type === 'mid_mission_switch') {
      if (activeCp && dist2D(p, activeCp) <= activeCp.radius) {
        if (activeCp.isVehicleSwap && !ms.switched) {
          ms.switched = true;
          ms.currentVehicleId = mech.switchVehicleId || 'C10';
          this.callbacks.onSwitchToTargetVehicle?.(ms.currentVehicleId, mech.swapPoint || activeCp);
          this.eventBus?.emit?.('mission:twist', { missionId: m.id, kind: 'vehicle_switch', vehicleId: ms.currentVehicleId });
          this._checkMidComms('swapped');
        }
        this._advanceCheckpointAndComms(m, activeCp);
        if (this.checkpointIndex >= m.checkpoints.length) {
          return this.completeMission();
        }
      }
    }

    // ── M18: 60 KM/H BOMB (< 60 km/h for 3s Detonates!) ──────────────────────
    else if (mech.type === 'speed_bomb') {
      const speedKmh = Number.isFinite(ctx.speedKmh) ? Math.abs(ctx.speedKmh) : Math.abs(vel) * 3.6;
      ms.lastSpeedKmh = speedKmh;
      if (!ms.armed && (speedKmh >= ms.minSpeedKmh || this.elapsedSec >= ms.armGraceSec)) {
        ms.armed = true;
      }
      if (ms.armed) {
        if (speedKmh < ms.minSpeedKmh) {
          ms.lowSpeedTimerSec += step;
          if (ms.lowSpeedTimerSec >= ms.explodeDelaySec) {
            return this.failMission('speed_bomb_detonated');
          }
        } else {
          ms.lowSpeedTimerSec = Math.max(0, ms.lowSpeedTimerSec - step * 3);
        }
      }
      if (this._canClearCheckpoint(activeCp, p, ctx)) {
        this._advanceCheckpointAndComms(m, activeCp);
        if (this.checkpointIndex >= 2) this._checkMidComms('halfway');
        if (this.checkpointIndex >= m.checkpoints.length) {
          return this.completeMission();
        }
      }
    }

    // ── M19: Cartel Boss Takedown (Ram Don Salazar's Limo 5+ Times) ──────────
    else if (mech.type === 'boss_takedown') {
      ms.ramCooldown = Math.max(0, ms.ramCooldown - step);
      this._advanceBossLimo(step);
      if (dist2D(p, ms.bossPos) <= (mech.ramRadius || 9.0) && Math.abs(vel) >= (mech.minRamSpeed || 7) && ms.ramCooldown <= 0) {
        ms.ramCooldown = mech.ramCooldownSec || 0.7;
        ms.ramCount += 1;
        ms.bossHp = Math.max(0, ms.bossHp - (mech.ramDamage || 30));
        this.callbacks.onTargetRammed?.(ms.bossHp, ms.bossMaxHp, ms.bossPos);
        if (ms.bossHp <= (ms.bossMaxHp || 150) * 0.5 && ms.bossHp > 0) this._checkMidComms('halfHp');
        if (ms.bossHp <= 0) {
          return this.completeMission();
        }
      }
    }

    // ── M20: Golden Sunrise Finale (4-Star Runway Escape -> Unlock C11+City 2)
    else if (mech.type === 'sunrise_finale') {
      if (this._canClearCheckpoint(activeCp, p, ctx)) {
        const wasTerminal = activeCp.id === 'm20_terminal';
        this._advanceCheckpointAndComms(m, activeCp);
        if (wasTerminal) this._checkMidComms('terminalCleared');
        if (this.checkpointIndex >= m.checkpoints.length) {
          return this.completeMission();
        }
      }
    }

    this._renderMechanicHud();
    return {
      state: this.state,
      remainingTimeSec: this.remainingTimeSec,
      checkpointIndex: this.checkpointIndex,
      activeTarget: this.getActiveTarget(),
      mechanicState: { ...this.mechanicState },
      assistActive: this.assistActive,
      disableBrakes: this.disableBrakes
    };
  }

  getActiveTarget() {
    if (!this.isActive() || !this.activeMission) return null;
    const m = this.activeMission;
    const ms = this.mechanicState;
    const p = this.lastPlayerPos || { x: 0, z: 0 };
    if (m.mechanics?.type === 'decoy_siren' && ms.sirenTriggered) {
      return null;
    }
    if (m.mechanics?.type === 'lockdown_survival') {
      return null;
    }
    if (m.mechanics?.type === 'barricade_breaker' && ms.barricadesSmashed < ms.targetBarricades && Array.isArray(ms.barricades)) {
      let nearest = null;
      let bestD = Infinity;
      for (const b of ms.barricades) {
        if (b.broken) continue;
        const d = dist2D(p, b);
        if (d < bestD) { bestD = d; nearest = b; }
      }
      if (nearest) {
        return {
          id: `m11_bar_${nearest.idx}`,
          label: `Smash Barricade (${ms.barricadesSmashed}/${ms.targetBarricades})`,
          x: nearest.x,
          z: nearest.z,
          radius: 7.5,
          color: '#ffea00'
        };
      }
    }
    if (m.mechanics?.type === 'convoy_smash' && ms.takedowns < ms.pursuerCount && this.checkpointIndex >= 1 && Array.isArray(ms.pursuers)) {
      let nearest = null;
      let bestD = Infinity;
      for (const pur of ms.pursuers) {
        if (!pur.active) continue;
        const d = dist2D(p, pur);
        if (d < bestD) { bestD = d; nearest = pur; }
      }
      if (nearest) {
        return {
          id: `m13_pursuer_${nearest.id}`,
          label: `Ram Pursuer (${ms.takedowns}/${ms.pursuerCount})`,
          x: nearest.x,
          z: nearest.z,
          radius: 10,
          color: '#ff3333'
        };
      }
    }
    if (m.mechanics?.type === 'hacker_hijack' && ms.phase === 'chase_ram') {
      return {
        id: 'm6_target',
        label: ms.targetName,
        x: ms.targetPos.x,
        z: ms.targetPos.z,
        radius: m.mechanics.ramRadius || 7.5,
        color: '#009dff'
      };
    }
    if (m.mechanics?.type === 'double_cross_intercept') {
      return {
        id: 'm15_partner',
        label: ms.targetName,
        x: ms.targetPos.x,
        z: ms.targetPos.z,
        radius: m.mechanics.interceptRadius || 11,
        color: '#ff007f'
      };
    }
    if (m.mechanics?.type === 'boss_takedown') {
      return {
        id: 'm19_boss',
        label: ms.bossName,
        x: ms.bossPos.x,
        z: ms.bossPos.z,
        radius: m.mechanics.ramRadius || 9.0,
        color: '#ff2a2a'
      };
    }
    if (m.mechanics?.type === 'ambush_escape') {
      if (ms.phase === 'approach') {
        const c = m.checkpoints[0];
        return { ...c, color: '#ffd166' };
      }
      if (ms.phase === 'ambush_reverse') {
        return {
          id: 'm5_reverse',
          label: 'REVERSE OUT OF AMBUSH!',
          x: ms.trapPoint.x + 26,
          z: ms.trapPoint.z,
          radius: 14,
          color: '#ff2a2a'
        };
      }
      const g = m.mechanics.escapeGoal || m.checkpoints[1];
      return { id: 'm5_escape', label: g.label || "Vega's Garage", x: g.x, z: g.z, radius: 16, color: '#00f0ff' };
    }
    const cp = m.checkpoints[Math.min(this.checkpointIndex, m.checkpoints.length - 1)];
    return cp ? { ...cp, color: cp.isBeachSand ? '#ffd166' : cp.isFinish ? '#ff007f' : '#00f0ff' } : null;
  }

  getHudState() {
    if (!this.activeMission || !this.isActive()) return null;
    const m = this.activeMission;
    const ms = this.mechanicState;
    const target = this.getActiveTarget();
    let tip = m.objectiveSummary;
    if (m.mechanics?.type === 'ambush_escape' && ms.phase === 'ambush_reverse') {
      tip = "IT'S A TRAP! Reverse clear of the black SUVs!";
    } else if (m.mechanics?.type === 'hacker_hijack') {
      tip = ms.phase === 'chase_ram'
        ? `Ram ${ms.targetName} (HP: ${Math.round(ms.targetHp)}%)`
        : "Hijacked! Drive to Vega's Garage!";
    } else if (m.mechanics?.type === 'no_brakes') {
      tip = ms.checkpointsDone
        ? 'Drive into Palm Strip Beach Sand and coast to a stop!'
        : 'BRAKES CUT! Thread checkpoints south toward Palm Strip Beach!';
    } else if (m.mechanics?.type === 'zero_scratch') {
      tip = `Condition: ${Math.round(ms.conditionPct)}% (Keep >= ${ms.minConditionPct}%)`;
    } else if (m.mechanics?.type === 'rain_drift') {
      tip = `Zones ${ms.zonesHit}/${ms.driftZonesRequired} · Drift Score: ${Math.round(ms.driftScore)}/${ms.targetDriftScore}`;
    } else if (m.mechanics?.type === 'decoy_siren' && ms.sirenTriggered) {
      tip = `Hold 2-Star Pursuit: ${Math.max(0, Math.ceil(ms.surviveTargetSec - ms.survivedSec))}s left`;
    } else if (m.mechanics?.type === 'barricade_breaker') {
      tip = `Barricades Smashed: ${ms.barricadesSmashed}/${ms.targetBarricades}`;
    } else if (m.mechanics?.type === 'skyline_ramp_jump') {
      tip = ms.jumpCleared ? 'Land clean at the North Zone!' : `Hit Mega-Ramp >= ${ms.minJumpSpeedKmh} km/h!`;
    } else if (m.mechanics?.type === 'convoy_smash') {
      tip = `Pursuers Smashed: ${ms.takedowns}/${ms.pursuerCount} (500kg Vault Cargo)`;
    } else if (m.mechanics?.type === 'blackout_stealth') {
      tip = `LIGHTS OFF · Searchlight Exposure: ${Math.round(ms.detectionPct)}%`;
    } else if (m.mechanics?.type === 'double_cross_intercept') {
      tip = `Intercept Rogue Veneno-X (${ms.interceptHits}/${ms.interceptHitsRequired})`;
    } else if (m.mechanics?.type === 'lockdown_survival') {
      tip = `Survive 4-Star Lockdown: ${Math.max(0, Math.ceil(ms.surviveTargetSec - ms.survivedSec))}s left`;
    } else if (m.mechanics?.type === 'mid_mission_switch') {
      tip = ms.switched ? 'Hypercar C10 Active — Blitz North Expressway!' : 'Cross traffic on B01 Bike to Iron Docks C10 Swap!';
    } else if (m.mechanics?.type === 'speed_bomb') {
      tip = ms.armed
        ? `KEEP >= ${ms.minSpeedKmh} KM/H! (${Math.round(ms.lastSpeedKmh)} km/h)`
        : 'Accelerate past 60 km/h — Velocity Fuse Arming!';
    } else if (m.mechanics?.type === 'boss_takedown') {
      tip = `Ram ${ms.bossName} (HP: ${Math.round(ms.bossHp)}/${ms.bossMaxHp})`;
    } else if (m.mechanics?.type === 'sunrise_finale') {
      tip = 'Golden Sunrise Finale — Race to Airport Private Jet!';
    }

    return {
      missionId: m.id,
      act: m.act,
      title: `${m.id}: ${m.title}`,
      description: target ? `Next: ${target.label}` : m.objectiveSummary,
      tip,
      remainingTimeSec: this.remainingTimeSec,
      target
    };
  }

  failMission(reason = 'aborted', customMessage = '') {
    if (!this.activeMission || (this.state !== MISSION_STATES.INTRO && this.state !== MISSION_STATES.ACTIVE)) {
      return { ok: false, state: this.state };
    }
    const m = this.activeMission;
    this.saveManager?.setLastMission?.(null);
    this.state = MISSION_STATES.FAILED;
    this._setDisableBrakes(false);
    this.callbacks.onBlackoutModeChange?.(false);

    let nextFailCount = 1;
    if (this.saveManager?.getData) {
      const data = this.saveManager.getData();
      const prevStats = data.stats || {};
      const prevFails = { ...(prevStats.consecutiveFails || {}) };
      nextFailCount = Number(prevFails[m.id] || 0) + 1;
      prevFails[m.id] = nextFailCount;
      this.saveManager.save({
        stats: {
          ...prevStats,
          consecutiveFails: prevFails
        }
      });
    }

    const payload = {
      ok: false,
      missionId: m.id,
      title: m.title,
      state: this.state,
      reason,
      message: failureReasonLabel(reason, customMessage),
      consecutiveFails: nextFailCount,
      elapsedSec: this.elapsedSec
    };
    this.lastResult = payload;

    this._hideRadioBanner();
    this._hideAmbushFlash();
    this._renderMechanicHud();
    this._renderSummaryModal(payload);

    this.callbacks.onMissionFail?.(m, payload);
    this.eventBus?.emit?.('mission:fail', payload);
    return payload;
  }

  completeMission() {
    if (!this.activeMission || (this.state !== MISSION_STATES.INTRO && this.state !== MISSION_STATES.ACTIVE)) {
      return { ok: false, state: this.state };
    }
    const m = this.activeMission;
    this.saveManager?.setLastMission?.(null);
    this.state = MISSION_STATES.COMPLETED;
    this._setDisableBrakes(false);
    this.callbacks.onBlackoutModeChange?.(false);

    const conditionPct = m.mechanics?.type === 'zero_scratch'
      ? (this.mechanicState.conditionPct ?? 100)
      : (m.mechanics?.type === 'lockdown_survival' ? 100 : 100);
    const stars = computeStarRating(m, {
      remainingTimeSec: this.remainingTimeSec,
      conditionPct
    });

    if (this.saveManager?.recordMissionResult) {
      this.saveManager.recordMissionResult(m.id, stars, m.rewardCash);
    }

    let unlockedVehicleId = null;
    let city2Unlocked = !!this.saveManager?.getData?.()?.city2Unlocked;
    if (m.id === 'M20') {
      unlockedVehicleId = m.mechanics?.unlockVehicleId || 'C11';
      this.saveManager?.unlockVehicle?.(unlockedVehicleId);
      city2Unlocked = true;
      this.callbacks.onUnlockCity2Bridge?.({
        targetCity: m.mechanics?.city2Name || 'Mirage Valley',
        causewayCoord: m.mechanics?.city2BridgeCoord || { x: 0, z: 960 },
        unlockedVehicleId
      });
      this.eventBus?.emit?.('world:city2Unlocked', {
        targetCity: m.mechanics?.city2Name || 'Mirage Valley',
        causewayCoord: m.mechanics?.city2BridgeCoord || { x: 0, z: 960 },
        unlockedVehicleId
      });
      this.eventBus?.emit?.('progression:finaleComplete', {
        missionId: 'M20',
        unlockedVehicleId,
        city2Unlocked: true
      });
    }

    const nextNumber = m.number + 1;
    const nextId = nextNumber <= 20 ? `M${nextNumber}` : null;
    const payload = {
      ok: true,
      missionId: m.id,
      title: m.title,
      state: this.state,
      stars,
      rewardCash: m.rewardCash,
      remainingTimeSec: this.remainingTimeSec,
      elapsedSec: this.elapsedSec,
      nextMissionId: nextId,
      nextTeaser: m.nextTeaser,
      unlockedVehicleId,
      city2Unlocked
    };
    this.lastResult = payload;

    this._hideRadioBanner();
    this._hideAmbushFlash();
    this._renderMechanicHud();
    this._renderSummaryModal(payload);

    this.callbacks.onMissionComplete?.(m, payload);
    this.eventBus?.emit?.('mission:complete', payload);
    return payload;
  }

  retryMission() {
    if (!this.activeMission) return { ok: false, reason: 'no-active-mission' };
    return this.startMission(this.activeMission.id);
  }

  abortMission() {
    this.saveManager?.setLastMission?.(null);
    this.state = MISSION_STATES.IDLE;
    this._setDisableBrakes(false);
    this.callbacks.onBlackoutModeChange?.(false);
    const endedId = this.activeMission?.id || null;
    this.activeMission = null;
    this.mechanicState = {};

    this._hideRadioBanner();
    this._hideAmbushFlash();
    this._hideModal();
    this._renderMechanicHud();

    if (this.gameState?.getState && this.gameState.getState() === 'MISSION_ACTIVE') {
      this.gameState.transition('FREE_ROAM');
    }

    this.callbacks.onAbort?.(endedId);
    this.eventBus?.emit?.('mission:abort', { missionId: endedId });
    return { ok: true, state: this.state };
  }

  // ── DOM UI Rendering ───────────────────────────────────────────────────────
  _el(tag, className, text = '') {
    const el = this.doc.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    return el;
  }

  mount() {
    if (!this.doc?.body || this._mounted) return this;

    let radio = this.doc.getElementById('missionRadioBanner');
    if (!radio) {
      radio = this._el('aside', 'mission-radio-banner');
      radio.id = 'missionRadioBanner';
      radio.hidden = true;
      this.doc.body.appendChild(radio);
    }

    let mechHud = this.doc.getElementById('missionMechanicHud');
    if (!mechHud) {
      mechHud = this._el('div', 'mission-mechanic-hud');
      mechHud.id = 'missionMechanicHud';
      mechHud.hidden = true;
      this.doc.body.appendChild(mechHud);
    }

    let ambush = this.doc.getElementById('missionAmbushFlash');
    if (!ambush) {
      ambush = this._el('div', 'mission-ambush-flash');
      ambush.id = 'missionAmbushFlash';
      ambush.hidden = true;
      this.doc.body.appendChild(ambush);
    }

    let modal = this.doc.getElementById('missionSummaryModal');
    if (!modal) {
      modal = this._el('section', 'mission-summary-modal');
      modal.id = 'missionSummaryModal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.hidden = true;
      this.doc.body.appendChild(modal);
    }

    this._radioEl = radio;
    this._mechanicEl = mechHud;
    this._ambushEl = ambush;
    this._modalEl = modal;
    this._mounted = true;
    return this;
  }

  _renderRadioBanner() {
    if (!this._radioEl || !this.activeMission) return;
    this._radioEl.replaceChildren();
    const header = this._el(
      'div',
      'mission-radio-head',
      `${this._t('mission.contract', 'CONTRACT')} ${this.activeMission.id} — ${this.activeMission.title.toUpperCase()}`
    );
    this._radioEl.appendChild(header);
    for (const d of this.activeMission.dialogue) {
      const row = this._el('div', 'mission-radio-line');
      const spk = this._el('strong', 'mission-radio-speaker', `${d.speaker}:`);
      spk.style.color = d.color || '#00f0ff';
      const txt = this._el('span', 'mission-radio-text', d.line);
      row.append(spk, txt);
      this._radioEl.appendChild(row);
    }
    this._radioEl.hidden = false;
  }

  _hideRadioBanner() {
    if (this._radioEl) this._radioEl.hidden = true;
  }

  _hideAmbushFlash() {
    if (this._ambushEl) this._ambushEl.hidden = true;
  }

  _hideModal() {
    if (this._modalEl) this._modalEl.hidden = true;
  }

  _renderMechanicHud() {
    if (!this._mechanicEl) return;
    if (!this.isActive() || !this.activeMission) {
      this._mechanicEl.hidden = true;
      this._hideAmbushFlash();
      return;
    }

    const ms = this.mechanicState;
    const type = ms.type;
    this._mechanicEl.replaceChildren();
    const addBar = (labelText, pctVal, fillCls = 'ok') => {
      const pct = Math.max(0, Math.min(100, pctVal));
      const lbl = this._el('div', 'mech-label', labelText);
      const track = this._el('div', 'mech-bar-track');
      const fill = this._el('div', `mech-bar-fill ${fillCls}`);
      fill.style.width = `${pct}%`;
      track.appendChild(fill);
      this._mechanicEl.append(lbl, track);
      this._mechanicEl.hidden = false;
    };

    if (type === 'hacker_hijack' && ms.phase === 'chase_ram') {
      const pct = (ms.targetHp / (ms.targetMaxHp || 100)) * 100;
      addBar(`${ms.targetName} — HP ${Math.round(pct)}%`, pct, 'danger');
    } else if (type === 'zero_scratch') {
      const pct = ms.conditionPct ?? 100;
      addBar(`VEHICLE CONDITION: ${Math.round(pct)}% (MIN ${ms.minConditionPct}%)`, pct, pct < 86 ? 'warn' : 'ok');
    } else if (type === 'no_brakes') {
      const badge = this._el(
        'div',
        'mech-alert',
        ms.inBeachSand ? 'IN BEACH SAND — COASTING TO STOP!' : 'NO BRAKES! STEER TO PALM STRIP BEACH SAND'
      );
      this._mechanicEl.appendChild(badge);
      this._mechanicEl.hidden = false;
    } else if (type === 'rain_drift') {
      const pct = (ms.driftScore / (ms.targetDriftScore || 1000)) * 100;
      addBar(`ZONES ${ms.zonesHit}/${ms.driftZonesRequired} · DRIFT ${Math.round(ms.driftScore)}/${ms.targetDriftScore}`, pct, 'ok');
    } else if (type === 'decoy_siren' && ms.sirenTriggered) {
      const left = Math.max(0, Math.ceil(ms.surviveTargetSec - ms.survivedSec));
      const pct = (ms.survivedSec / (ms.surviveTargetSec || 45)) * 100;
      addBar(`DECOY SIREN ACTIVE · SURVIVE ${left}s`, pct, 'warn');
    } else if (type === 'signal_ghost') {
      const pct = (ms.towersScrambled / (ms.totalTowers || 4)) * 100;
      addBar(`SIGNAL BOMB · TOWERS ${ms.towersScrambled}/${ms.totalTowers} · BEEP ${ms.beepIntervalSec.toFixed(2)}s`, pct, 'warn');
    } else if (type === 'ambush_escape') {
      if (this._ambushEl) {
        if (ms.ambushFlashSec > 0) {
          this._ambushEl.textContent = this.activeMission.mechanics?.ambushFlashText || "IT'S A TRAP! ESCAPE!";
          this._ambushEl.hidden = false;
        } else {
          this._ambushEl.hidden = true;
        }
      }
      this._mechanicEl.appendChild(
        this._el('div', 'mech-alert', ms.phase === 'ambush_reverse' ? 'REVERSE OUT OF IRON DOCKS TRAP!' : ms.phase === 'escape_garage' ? "ESCAPE TO VEGA'S GARAGE!" : 'APPROACH IRON DOCKS PICKUP')
      );
      this._mechanicEl.hidden = false;
    } else if (type === 'barricade_breaker') {
      if (ms.barricadesSmashed < ms.targetBarricades) {
        const pct = (ms.barricadesSmashed / (ms.targetBarricades || 6)) * 100;
        addBar(`BARRICADES SMASHED: ${ms.barricadesSmashed} / ${ms.targetBarricades}`, pct, 'warn');
      } else {
        const tot = Math.max(1, this.activeMission.checkpoints?.length || 2);
        addBar(`STEP ${Math.min(tot, this.checkpointIndex + 1)}/${tot} · ${this.checkpointIndex === 0 ? 'TITAN BANK VAULT (ON FOOT)' : 'EXTRACT TO EAST DOCKS'}`, (this.checkpointsCleared / tot) * 100, 'ok');
      }
    } else if (type === 'convoy_smash') {
      const pct = (ms.takedowns / (ms.pursuerCount || 3)) * 100;
      addBar(`500KG GOLD CONVOY · PURSUERS SMASHED: ${ms.takedowns}/${ms.pursuerCount}`, pct, 'warn');
    } else if (type === 'blackout_stealth') {
      const pct = ms.detectionPct;
      addBar(`BLACKOUT STEALTH · EXPOSURE ${Math.round(pct)}%`, pct, pct > 60 ? 'danger' : 'warn');
    } else if (type === 'speed_bomb') {
      const spd = Math.round(ms.lastSpeedKmh || 0);
      const msg = ms.lowSpeedTimerSec > 0.05
        ? `DANGER ${spd} KM/H! DETONATION IN ${(ms.explodeDelaySec - ms.lowSpeedTimerSec).toFixed(1)}s!`
        : `60 KM/H BOMB ARMED · SPEED: ${spd} KM/H`;
      this._mechanicEl.appendChild(this._el('div', 'mech-alert', msg));
      this._mechanicEl.hidden = false;
    } else if (type === 'boss_takedown') {
      const pct = (ms.bossHp / (ms.bossMaxHp || 150)) * 100;
      addBar(`${ms.bossName} — ARMOUR ${Math.round(pct)}%`, pct, 'danger');
    } else if (type === 'lockdown_survival') {
      const left = Math.max(0, Math.ceil(ms.surviveTargetSec - ms.survivedSec));
      const pct = (ms.survivedSec / (ms.surviveTargetSec || 120)) * 100;
      addBar(`4-STAR LOCKDOWN · SURVIVE ${left}s`, pct, 'danger');
    } else {
      const cps = this.activeMission.checkpoints || [];
      if (cps.length > 0) {
        const nextCp = cps[Math.min(this.checkpointIndex, cps.length - 1)];
        const tag = nextCp?.requiresOnFoot ? 'ON FOOT' : 'CHECKPOINT';
        addBar(`${tag} ${Math.min(cps.length, this.checkpointIndex + 1)}/${cps.length} · ${nextCp?.label?.toUpperCase() || ''}`, (this.checkpointsCleared / cps.length) * 100, 'ok');
      } else {
        this._mechanicEl.hidden = true;
      }
    }
  }

  _renderSummaryModal(payload) {
    if (!this._modalEl) return;
    this._modalEl.replaceChildren();
    const card = this._el('div', `mission-summary-card ${payload.ok ? 'win' : 'fail'}`);
    card.appendChild(this._el('div', 'mission-sum-ribbon'));

    const eyebrow = this._el(
      'div',
      'mission-sum-eyebrow',
      payload.ok
        ? `${this._t('mission.complete', 'MISSION COMPLETE')} · ${payload.missionId}`
        : `${this._t('mission.failed', 'MISSION FAILED')} · ${payload.missionId}`
    );
    const title = this._el('h2', 'mission-sum-title', payload.title);

    card.append(eyebrow, title);

    if (payload.ok) {
      const starsRow = this._el('div', 'mission-sum-stars');
      for (let i = 1; i <= 3; i++) {
        const earned = i <= payload.stars;
        const orb = this._el('span', `mission-star-orb ${earned ? 'earned' : 'empty'} d${i}`, earned ? '★' : '☆');
        starsRow.appendChild(orb);
      }
      starsRow.appendChild(this._el('span', 'mission-star-count', `${payload.stars}/3 ${this._t('mission.stars', 'STARS')}`));

      const statsGrid = this._el('div', 'mission-sum-grid');
      const kpis = [
        [this._t('mission.reward', 'REWARD'), `+Rs ${payload.rewardCash.toLocaleString('en-US')}`, 'gold'],
        [this._t('mission.timeLeft', 'TIME LEFT'), `${payload.remainingTimeSec.toFixed(1)}s`, 'cyan'],
        [this._t('mission.stars', 'STARS'), `${payload.stars} / 3`, 'green']
      ];
      for (const [lbl, val, tone] of kpis) {
        const box = this._el('div', `mission-sum-kpi ${tone}`);
        box.append(this._el('span', 'kpi-lbl', lbl), this._el('strong', 'kpi-val', val));
        statsGrid.appendChild(box);
      }
      card.append(starsRow, statsGrid);

      if (payload.unlockedVehicleId || payload.city2Unlocked) {
        const unlockBanner = this._el('div', 'mission-sum-unlock');
        const parts = [];
        if (payload.unlockedVehicleId) parts.push(`${payload.unlockedVehicleId} VORTEX APEX GOLD`);
        if (payload.city2Unlocked) parts.push('MIRAGE VALLEY BRIDGE');
        unlockBanner.append(
          this._el('span', 'unlock-tag', this._t('mission.unlocked', 'NEW UNLOCK')),
          this._el('strong', '', parts.join(' + '))
        );
        card.appendChild(unlockBanner);
      }

      const nextBox = this._el('div', 'mission-sum-next-box');
      const nextTag = this._el('div', 'mission-sum-next-tag', `${this._t('mission.nextPrefix', 'NEXT')} ${payload.nextMissionId ? `· ${payload.nextMissionId}` : '· CAMPAIGN CLEARED'}`);
      const teaserEl = this._el('p', 'mission-sum-teaser', payload.nextTeaser);
      nextBox.append(nextTag, teaserEl);
      card.appendChild(nextBox);
    } else {
      const msgEl = this._el('p', 'mission-sum-reason', payload.message);
      card.appendChild(msgEl);
      const failTip = payload.consecutiveFails >= ASSIST_FAIL_THRESHOLD
        ? 'Support Protocol Active on Retry: +10s bonus time & calmer NBPD patrols!'
        : 'Tip: Check the Live Guide (?) during missions to see your step checklist, target distance & exact buttons.';
      const tipBox = this._el('div', 'mission-sum-tip-box', failTip);
      card.appendChild(tipBox);
    }

    const actions = this._el('div', 'mission-sum-actions');
    if (payload.ok && payload.nextMissionId && this.getMission(payload.nextMissionId)) {
      const nextBtn = this._el('button', 'mission-btn primary', `${this._t('mission.nextBtn', 'NEXT')} (${payload.nextMissionId})`);
      nextBtn.dataset.missionAction = 'next';
      nextBtn.addEventListener('click', () => this.startMission(payload.nextMissionId));
      actions.appendChild(nextBtn);
    }

    const retryBtn = this._el('button', `mission-btn ${payload.ok ? '' : 'primary'}`, this._t('mission.retryBtn', 'RETRY'));
    retryBtn.dataset.missionAction = 'retry';
    retryBtn.addEventListener('click', () => this.retryMission());
    actions.appendChild(retryBtn);

    const adLabel = payload.ok
      ? this._t('mission.adDoubleCash', 'WATCH AD FOR 2X CASH')
      : this._t('mission.adRetryTime', 'WATCH AD (+20s RETRY)');
    const adBtn = this._el('button', 'mission-btn accent', adLabel);
    adBtn.dataset.missionAction = 'rewarded-ad';
    adBtn.addEventListener('click', () => {
      this.eventBus?.emit?.('monetization:rewardedAdRequest', {
        missionId: payload.missionId,
        kind: payload.ok ? 'double_cash' : 'retry_bonus_time'
      });
    });
    actions.appendChild(adBtn);

    const roamBtn = this._el('button', 'mission-btn', this._t('mission.freeRoamBtn', 'FREE ROAM'));
    roamBtn.dataset.missionAction = 'free-roam';
    roamBtn.addEventListener('click', () => this.abortMission());
    actions.appendChild(roamBtn);

    card.appendChild(actions);
    this._modalEl.appendChild(card);
    this._modalEl.hidden = false;
  }

  destroy() {
    this._setDisableBrakes(false);
    for (const fn of this._cleanups.splice(0)) fn();
    this._radioEl?.remove?.();
    this._mechanicEl?.remove?.();
    this._ambushEl?.remove?.();
    this._modalEl?.remove?.();
    this._radioEl = null;
    this._mechanicEl = null;
    this._ambushEl = null;
    this._modalEl = null;
    this._mounted = false;
  }
}
