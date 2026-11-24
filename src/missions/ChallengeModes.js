/**
 * Viral Challenge Modes Manager for Neon Bay: Overdrive.
 * Implements:
 * 1. The 1% Impossible Rooftop Ramp
 * 2. Reverse-Gear Race (Driving forward > 3.5 m/s fails!)
 * 3. 1-HP Survival (Car burning at 1 HP for 60s — single collision fails!)
 * Pure zero-import ES Module.
 */

export const CHALLENGE_STATES = Object.freeze({
  IDLE: 'IDLE',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
});

export const CHALLENGE_MODES = Object.freeze([
  Object.freeze({
    id: 'CH_ROOFTOP_1PCT',
    title: 'The 1% Impossible Rooftop Ramp',
    shortDesc: 'Hit the Skyline Mega-Ramp at 220+ km/h and fly 95m+ across the rooftops.',
    vehicleId: 'C10',
    timeLimitSec: 45,
    rewardCash: 3500,
    spawn: Object.freeze({ x: 0, z: 200, yaw: 0 }),
    rampCoord: Object.freeze({ x: 0, z: 600, radius: 18 }),
    minLaunchSpeedKmh: 220,
    minAirDistanceM: 95,
    minJumpHeightM: 5.0
  }),
  Object.freeze({
    id: 'CH_REVERSE_RACE',
    title: 'Reverse-Gear Race',
    shortDesc: 'Clear all 4 Neon Boulevard gates strictly in REVERSE gear!',
    vehicleId: 'C02',
    timeLimitSec: 65,
    rewardCash: 3000,
    spawn: Object.freeze({ x: 0, z: 20, yaw: 0 }),
    maxForwardVelAllowed: 3.5,
    maxForwardGraceSec: 1.2,
    checkpoints: Object.freeze([
      Object.freeze({ id: 'cr_1', label: 'Reverse Gate 1', x: 0, z: -20, radius: 16 }),
      Object.freeze({ id: 'cr_2', label: 'Reverse Gate 2', x: 0, z: -150, radius: 16 }),
      Object.freeze({ id: 'cr_3', label: 'Reverse Gate 3', x: 0, z: -300, radius: 16 }),
      Object.freeze({ id: 'cr_finish', label: 'Sunset Strip Reverse Finish', x: 0, z: -450, radius: 18 })
    ])
  }),
  Object.freeze({
    id: 'CH_ONE_HP_SURVIVAL',
    title: '1-HP Survival',
    shortDesc: 'Engine on fire at 1 HP! Survive 60 seconds without taking a single scratch.',
    vehicleId: 'C03',
    timeLimitSec: 60,
    surviveSec: 60,
    rewardCash: 4500,
    spawn: Object.freeze({ x: 0, z: -300, yaw: Math.PI / 2 }),
    initialHp: 1
  })
]);

export const CHALLENGE_MAP = Object.freeze(
  CHALLENGE_MODES.reduce((acc, c) => {
    acc[c.id] = c;
    return acc;
  }, {})
);

export function validateChallengeSchema(ch) {
  const errors = [];
  if (!ch || typeof ch !== 'object') return { valid: false, errors: ['Challenge must be an object'] };
  if (typeof ch.id !== 'string' || !ch.id.trim()) errors.push('Missing challenge id');
  if (typeof ch.title !== 'string' || !ch.title.trim()) errors.push(`Missing title for ${ch.id}`);
  if (!Number.isFinite(ch.timeLimitSec) || ch.timeLimitSec <= 0) errors.push(`Invalid timeLimitSec for ${ch.id}`);
  if (!Number.isFinite(ch.rewardCash) || ch.rewardCash <= 0) errors.push(`Invalid rewardCash for ${ch.id}`);
  if (!ch.spawn || !Number.isFinite(ch.spawn.x) || !Number.isFinite(ch.spawn.z)) errors.push(`Invalid spawn for ${ch.id}`);
  return { valid: errors.length === 0, errors };
}

function dist2D(a, b) {
  if (!a || !b) return Infinity;
  return Math.hypot((a.x || 0) - (b.x || 0), (a.z || 0) - (b.z || 0));
}

export class ChallengeModeManager {
  constructor({ saveManager = null, eventBus = null, callbacks = {} } = {}) {
    this.saveManager = saveManager || null;
    this.eventBus = eventBus || null;
    this.callbacks = callbacks || {};

    this.state = CHALLENGE_STATES.IDLE;
    this.activeChallenge = null;
    this.remainingTimeSec = 0;
    this.elapsedSec = 0;
    this.checkpointIndex = 0;
    this.meta = {};
    this.lastResult = null;
  }

  isActive() {
    return this.state === CHALLENGE_STATES.ACTIVE;
  }

  getChallengeList() {
    const completed = new Set(this.saveManager?.getData?.()?.retention?.completedChallenges || []);
    return CHALLENGE_MODES.map((c) => ({
      ...c,
      completed: completed.has(c.id)
    }));
  }

  startChallenge(id) {
    const ch = CHALLENGE_MAP[id];
    if (!ch) return { ok: false, reason: 'unknown-challenge' };

    this.activeChallenge = ch;
    this.state = CHALLENGE_STATES.ACTIVE;
    this.remainingTimeSec = ch.timeLimitSec;
    this.elapsedSec = 0;
    this.checkpointIndex = 0;
    this.lastResult = null;
    this.meta = {
      launched: false,
      peakSpeedKmh: 0,
      peakJumpY: 0,
      airDistanceM: 0,
      launchStartPos: null,
      forwardViolationSec: 0,
      survivedSec: 0
    };

    this.callbacks.onChallengeStart?.(ch);
    this.eventBus?.emit?.('challenge:start', { challengeId: ch.id, title: ch.title });
    return { ok: true, challengeId: ch.id, state: this.state };
  }

  update(dt, ctx = {}) {
    if (!this.isActive() || !this.activeChallenge) return { state: this.state };
    const step = Math.max(0, Math.min(0.25, Number(dt) || 0));
    const ch = this.activeChallenge;
    const p = ctx.player || { x: 0, z: 0 };
    const vel = Number(ctx.velocity || 0);
    const speedKmh = Number.isFinite(ctx.speedKmh) ? Math.abs(ctx.speedKmh) : Math.abs(vel) * 3.6;

    this.elapsedSec += step;
    this.remainingTimeSec = Math.max(0, this.remainingTimeSec - step);

    // 1. 1% Impossible Rooftop Ramp
    if (ch.id === 'CH_ROOFTOP_1PCT') {
      this.meta.peakSpeedKmh = Math.max(this.meta.peakSpeedKmh, speedKmh);
      if (!this.meta.launched && dist2D(p, ch.rampCoord) <= ch.rampCoord.radius && speedKmh >= ch.minLaunchSpeedKmh) {
        this.meta.launched = true;
        this.meta.launchStartPos = { x: p.x, z: p.z };
      }
      if (this.meta.launched) {
        this.meta.peakJumpY = Math.max(this.meta.peakJumpY, Number(ctx.jumpY || 0));
        const dAir = Math.max(Number(ctx.airDistanceM || 0), dist2D(p, this.meta.launchStartPos));
        this.meta.airDistanceM = Math.max(this.meta.airDistanceM, dAir);
        if (this.meta.airDistanceM >= ch.minAirDistanceM && this.meta.peakJumpY >= ch.minJumpHeightM) {
          return this.completeChallenge();
        }
      }
      if (this.remainingTimeSec <= 0) return this.failChallenge('time_expired');
    }

    // 2. Reverse-Gear Race
    else if (ch.id === 'CH_REVERSE_RACE') {
      if (vel > ch.maxForwardVelAllowed) {
        this.meta.forwardViolationSec += step;
        if (this.meta.forwardViolationSec >= ch.maxForwardGraceSec) {
          return this.failChallenge('drove_forward');
        }
      } else {
        this.meta.forwardViolationSec = 0;
      }
      const cp = ch.checkpoints[this.checkpointIndex];
      if (cp && dist2D(p, cp) <= cp.radius) {
        this.checkpointIndex += 1;
        if (this.checkpointIndex >= ch.checkpoints.length) {
          return this.completeChallenge();
        }
      }
      if (this.remainingTimeSec <= 0) return this.failChallenge('time_expired');
    }

    // 3. 1-HP Survival
    else if (ch.id === 'CH_ONE_HP_SURVIVAL') {
      if (ctx.collided || (ctx.vehicleHp !== undefined && ctx.vehicleHp < 1)) {
        return this.failChallenge('scratched_on_1hp');
      }
      this.meta.survivedSec += step;
      if (this.meta.survivedSec >= ch.surviveSec) {
        return this.completeChallenge();
      }
    }

    return {
      state: this.state,
      remainingTimeSec: this.remainingTimeSec,
      checkpointIndex: this.checkpointIndex,
      meta: { ...this.meta }
    };
  }

  getActiveTarget() {
    if (!this.isActive() || !this.activeChallenge) return null;
    const ch = this.activeChallenge;
    if (ch.id === 'CH_ROOFTOP_1PCT') return { ...ch.rampCoord, label: '1% Rooftop Mega-Ramp', color: '#ff007f' };
    if (ch.id === 'CH_REVERSE_RACE') {
      const cp = ch.checkpoints[Math.min(this.checkpointIndex, ch.checkpoints.length - 1)];
      return cp ? { ...cp, color: '#00f0ff' } : null;
    }
    return null;
  }

  failChallenge(reason = 'failed') {
    if (!this.isActive() || !this.activeChallenge) return { ok: false };
    const ch = this.activeChallenge;
    this.state = CHALLENGE_STATES.FAILED;
    const payload = { ok: false, challengeId: ch.id, title: ch.title, reason, elapsedSec: this.elapsedSec };
    this.lastResult = payload;
    this.callbacks.onChallengeFail?.(ch, payload);
    this.eventBus?.emit?.('challenge:fail', payload);
    return payload;
  }

  completeChallenge() {
    if (!this.isActive() || !this.activeChallenge) return { ok: false };
    const ch = this.activeChallenge;
    this.state = CHALLENGE_STATES.COMPLETED;
    this.saveManager?.recordChallengeComplete?.(ch.id, ch.rewardCash);
    const payload = {
      ok: true,
      challengeId: ch.id,
      title: ch.title,
      rewardCash: ch.rewardCash,
      elapsedSec: this.elapsedSec
    };
    this.lastResult = payload;
    this.callbacks.onChallengeComplete?.(ch, payload);
    this.eventBus?.emit?.('challenge:complete', payload);
    return payload;
  }

  abortChallenge() {
    const prevId = this.activeChallenge?.id || null;
    this.state = CHALLENGE_STATES.IDLE;
    this.activeChallenge = null;
    this.callbacks.onChallengeAbort?.(prevId);
    return { ok: true, state: this.state };
  }
}
