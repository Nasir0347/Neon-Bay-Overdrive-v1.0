import { eventBus as defaultEventBus, EVENTS } from '../core/EventBus.js';

export const BASE_FOV = 60;
export const NITRO_FOV = 80;
export const MEGA_RAMP_SLOWMO_SCALE = 0.3;
export const MEGA_RAMP_SLOWMO_DURATION = 1.5;

/**
 * Smoothly interpolate chase camera FOV (`60°` idle -> `80°` full Nitro boost).
 * @param {number} currentFov
 * @param {{ inCar?: boolean, speed?: number, nitroActive?: boolean, jumpHeight?: number, dt?: number }} opts
 * @returns {number}
 */
export function computeDynamicFov(currentFov, opts = {}) {
  const {
    inCar = false,
    speed = 0,
    nitroActive = false,
    jumpHeight = 0,
    dt = 0.016,
    baseFov = BASE_FOV,
    nitroFov = NITRO_FOV
  } = opts;

  const target = inCar
    ? Math.min(
        nitroFov,
        nitroActive
          ? nitroFov
          : baseFov + Math.min(10, Math.abs(speed) * 0.28) + Math.min(5, jumpHeight * 1.1)
      )
    : baseFov;

  if (Math.abs(currentFov - target) <= 0.05) return target;
  const alpha = Math.min(1, Math.max(0, dt) * 8);
  return currentFov + (target - currentFov) * alpha;
}

/** Zero-GC micro camera shake controller for collision and hard-landing impacts. */
export class CameraShake {
  constructor() {
    this.time = 0;
    this.duration = 0.28;
    this.amplitude = 0;
    this.offset = { x: 0, y: 0 };
    this._phase = 0;
  }

  trigger(amplitude = 0.28, duration = 0.28) {
    if (amplitude <= 0 || duration <= 0) return;
    if (amplitude >= this.amplitude || this.time <= 0) {
      this.amplitude = amplitude;
      this.duration = duration;
      this.time = duration;
    }
  }

  update(dt, reducedEffects = false) {
    if (this.time <= 0) {
      this.offset.x = 0;
      this.offset.y = 0;
      return this.offset;
    }
    this.time = Math.max(0, this.time - dt);
    this._phase += dt * 48;
    const decay = this.duration > 0 ? this.time / this.duration : 0;
    const scale = this.amplitude * decay * decay * (reducedEffects ? 0.45 : 1);
    this.offset.x = Math.sin(this._phase) * scale;
    this.offset.y = Math.cos(this._phase * 1.37) * scale * 0.65;
    return this.offset;
  }

  reset() {
    this.time = 0;
    this.amplitude = 0;
    this.offset.x = 0;
    this.offset.y = 0;
  }
}

/** Smooth 0.3x time dilation controller for 1.5s mega-ramp launches. */
export class SlowMotionController {
  constructor(scale = MEGA_RAMP_SLOWMO_SCALE) {
    this.scale = scale;
    this.remaining = 0;
  }

  trigger(duration = MEGA_RAMP_SLOWMO_DURATION, scale = MEGA_RAMP_SLOWMO_SCALE) {
    this.scale = Math.max(0.05, Math.min(1, scale));
    this.remaining = Math.max(this.remaining, duration);
  }

  update(dt) {
    if (this.remaining <= 0) return 1;
    this.remaining = Math.max(0, this.remaining - Math.max(0, dt));
    return this.remaining > 0 ? this.scale : 1;
  }

  isActive() {
    return this.remaining > 0;
  }

  cancel() {
    this.remaining = 0;
  }
}

/** Fixed-size pre-allocated particle pool (zero runtime heap churn for smoke & skid decals). */
export class ParticlePool {
  /** @param {number} [capacity] */
  constructor(capacity = 96) {
    this.capacity = capacity;
    this.items = Array.from({ length: capacity }, () => ({
      active: false,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      age: 0,
      life: 1,
      scale: 1,
      dark: false
    }));
    this._cursor = 0;
    this.activeCount = 0;
  }

  spawn(x, y, z, vx = 0, vy = 0, vz = 0, life = 0.6, scale = 0.4, dark = false) {
    const slot = this.items[this._cursor];
    this._cursor = (this._cursor + 1) % this.capacity;
    if (!slot.active) this.activeCount++;
    slot.active = true;
    slot.x = x;
    slot.y = y;
    slot.z = z;
    slot.vx = vx;
    slot.vy = vy;
    slot.vz = vz;
    slot.age = 0;
    slot.life = Math.max(0.05, life);
    slot.scale = scale;
    slot.dark = !!dark;
    return slot;
  }

  update(dt) {
    let active = 0;
    for (let i = 0; i < this.capacity; i++) {
      const p = this.items[i];
      if (!p.active) continue;
      p.age += dt;
      if (p.age >= p.life) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      active++;
    }
    this.activeCount = active;
    return active;
  }

  forEachActive(fn) {
    for (let i = 0; i < this.capacity; i++) {
      if (this.items[i].active) fn(this.items[i], i);
    }
  }

  reset() {
    for (let i = 0; i < this.capacity; i++) this.items[i].active = false;
    this.activeCount = 0;
    this._cursor = 0;
  }
}

/**
 * Anti-Stuck Flip Car helper: zeros roll/pitch/airborne state cleanly and,
 * if currently trapped inside blocked geometry, relocates to `findSafeSpot(x, z)`.
 */
export function flipCar(vehicleState, options = {}) {
  if (!vehicleState || typeof vehicleState !== 'object') {
    return { flipped: false, relocated: false };
  }
  const {
    isBlocked = null,
    findSafeSpot = null,
    eventBus = defaultEventBus,
    source = 'manual'
  } = options;

  vehicleState.roll = 0;
  vehicleState.pitch = 0;
  vehicleState.jumpY = 0;
  vehicleState.jumpVy = 0;
  vehicleState.jumpPitch = 0;
  vehicleState.airborne = false;
  vehicleState.onRamp = null;
  vehicleState.driftVisualYaw = 0;
  vehicleState.velocity = 0;

  let relocated = false;
  if (typeof isBlocked === 'function' && isBlocked(vehicleState.x, vehicleState.z)) {
    const safe = typeof findSafeSpot === 'function' ? findSafeSpot(vehicleState.x, vehicleState.z) : null;
    if (safe && Number.isFinite(safe.x) && Number.isFinite(safe.z)) {
      vehicleState.x = safe.x;
      vehicleState.z = safe.z;
      relocated = true;
    }
  }

  eventBus.emit(EVENTS.PHYSICS_FLIP_CAR, {
    source,
    relocated,
    x: vehicleState.x,
    z: vehicleState.z
  });

  return {
    flipped: true,
    relocated,
    x: vehicleState.x,
    z: vehicleState.z,
    roll: 0,
    pitch: 0
  };
}
