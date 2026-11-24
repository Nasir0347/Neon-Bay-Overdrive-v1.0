/**
 * 1 to 5-Star Police Pursuit Manager with Fixed Object Pools,
 * Rubber-Banding AI, PIT Maneuvers, SWAT + Helicopter Searchlight,
 * City Lockdown (5-Star), and Line-of-Sight Escape Cooldown.
 * Pure ES Module with zero static imports.
 */

export const POLICE_POOL_LIMITS = {
  maxCruisers: 4,
  maxSwat: 2,
  maxRoadblocks: 3
};

export const WANTED_TIERS = [
  { stars: 0, label: 'CLEAR', cruisers: 0, swat: 0, roadblocks: 0, helicopter: false, lockdown: false, pitEnabled: false, cooldownSec: 0, baseSpeed: 0 },
  { stars: 1, label: '1-STAR PATROL', cruisers: 1, swat: 0, roadblocks: 0, helicopter: false, lockdown: false, pitEnabled: false, cooldownSec: 10, baseSpeed: 15 },
  { stars: 2, label: '2-STAR PURSUIT', cruisers: 2, swat: 0, roadblocks: 0, helicopter: false, lockdown: false, pitEnabled: false, cooldownSec: 10, baseSpeed: 18 },
  { stars: 3, label: '3-STAR ROADBLOCKS', cruisers: 3, swat: 0, roadblocks: 1, helicopter: false, lockdown: false, pitEnabled: true, cooldownSec: 12, baseSpeed: 21 },
  { stars: 4, label: '4-STAR SWAT + AERIAL', cruisers: 3, swat: 1, roadblocks: 2, helicopter: true, lockdown: false, pitEnabled: true, cooldownSec: 14, baseSpeed: 24 },
  { stars: 5, label: '5-STAR CITY LOCKDOWN', cruisers: 4, swat: 2, roadblocks: 3, helicopter: true, lockdown: true, pitEnabled: true, cooldownSec: 16, baseSpeed: 27 }
];

function obbOverlap(a, b) {
  if (!a || !b) return null;
  const aW = a.halfW || 0.90;
  const aL = a.halfL || 2.22;
  const bW = b.halfW || 0.90;
  const bL = b.halfL || 2.22;
  const maxR = aW + aL + bW + bL;
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  if (Math.abs(dx) > maxR || Math.abs(dz) > maxR) return null;

  const yA = a.yaw || 0;
  const yB = b.yaw || 0;
  const faX = Math.sin(yA), faZ = Math.cos(yA), raX = faZ, raZ = -faX;
  const fbX = Math.sin(yB), fbZ = Math.cos(yB), rbX = fbZ, rbZ = -fbX;

  let minPen = Infinity;
  let nx = 0;
  let nz = 0;
  const axes = [raX, raZ, faX, faZ, rbX, rbZ, fbX, fbZ];
  for (let i = 0; i < 8; i += 2) {
    const ux = axes[i], uz = axes[i + 1];
    const pA = aW * Math.abs(raX * ux + raZ * uz) + aL * Math.abs(faX * ux + faZ * uz);
    const pB = bW * Math.abs(rbX * ux + rbZ * uz) + bL * Math.abs(fbX * ux + fbZ * uz);
    const d = dx * ux + dz * uz;
    const pen = (pA + pB) - Math.abs(d);
    if (pen <= 0) return null;
    if (pen < minPen) {
      minPen = pen;
      const sign = d < 0 ? -1 : 1;
      nx = ux * sign;
      nz = uz * sign;
    }
  }
  return { pen: minPen, nx, nz };
}

export function computeRubberBandSpeed(baseSpeed, playerSpeed, distToPlayer, isSwat = false) {
  const b = Math.max(4, Number(baseSpeed) || 15);
  const pAbs = Math.abs(Number(playerSpeed) || 0);
  const d = Math.max(0, Number(distToPlayer) || 0);
  const farCap = isSwat ? 34 : 42;
  const farSpd = Math.min(farCap, Math.max(b, pAbs * 1.18 + 6));
  const nearSpd = Math.max(b * 0.85, Math.min(pAbs * 1.06 + 1.5, b + 8));

  if (d >= 55) return farSpd;
  if (d <= 16) return nearSpd;
  const t = (d - 16) / (55 - 16);
  return nearSpd + (farSpd - nearSpd) * t;
}

export function computePitManeuver(unit, player, playerVelocity, dt = 0.016) {
  const uid = unit?.id || 'unit';
  if (!unit?.active || !player || (unit.pitCooldown || 0) > 0) {
    return { triggered: false, yawImpulse: 0, speedMultiplier: 1, shakeAmp: 0, unitId: uid };
  }
  if (Math.abs(Number(playerVelocity) || 0) <= 8) {
    return { triggered: false, yawImpulse: 0, speedMultiplier: 1, shakeAmp: 0, unitId: uid };
  }
  const rx = unit.x - player.x;
  const rz = unit.z - player.z;
  const dist = Math.hypot(rx, rz);
  if (dist >= 7.5 || dist <= 1.5) {
    return { triggered: false, yawImpulse: 0, speedMultiplier: 1, shakeAmp: 0, unitId: uid };
  }
  const pyaw = Number(player.yaw) || 0;
  const fwdX = Math.sin(pyaw);
  const fwdZ = Math.cos(pyaw);
  const fwdDot = rx * fwdX + rz * fwdZ;
  const lat = rx * fwdZ - rz * fwdX;

  if (fwdDot > -5.5 && fwdDot < 2.2 && Math.abs(lat) > 0.6 && Math.abs(lat) < 4.5) {
    unit.pitCooldown = 4.5;
    const side = lat >= 0 ? 1 : -1;
    return {
      triggered: true,
      yawImpulse: side * 0.32,
      speedMultiplier: 0.86,
      shakeAmp: 0.34,
      unitId: uid
    };
  }
  return { triggered: false, yawImpulse: 0, speedMultiplier: 1, shakeAmp: 0, unitId: uid };
}

export class PoliceManager {
  constructor({
    eventBus = null,
    roadAxes = [-900, -600, -300, 0, 300, 600, 900],
    hasLineOfSight = null,
    isBlocked = null,
    routeFn = null
  } = {}) {
    this.eventBus = eventBus || null;
    this.roadAxes = Array.isArray(roadAxes) && roadAxes.length ? roadAxes : [-900, -600, -300, 0, 300, 600, 900];
    this.hasLineOfSight = typeof hasLineOfSight === 'function' ? hasLineOfSight : () => true;
    this.isBlocked = typeof isBlocked === 'function' ? isBlocked : () => false;
    this.routeFn = typeof routeFn === 'function' ? routeFn : null;

    // Fixed pre-allocated pools (never resized after construction)
    this.cruisers = Array.from({ length: POLICE_POOL_LIMITS.maxCruisers }, (_, i) => ({
      id: `cruiser_${i}`,
      slot: i,
      kind: 'cruiser',
      active: false,
      x: 165 * (i % 2 ? -1 : 1),
      z: -80 + i * 40,
      yaw: 0,
      speed: 0,
      wheelSpin: 0,
      pitCooldown: 0
    }));

    this.swatUnits = Array.from({ length: POLICE_POOL_LIMITS.maxSwat }, (_, i) => ({
      id: `swat_${i}`,
      slot: i,
      kind: 'swat',
      active: false,
      x: -165 * (i % 2 ? -1 : 1),
      z: 165,
      yaw: 0,
      speed: 0,
      wheelSpin: 0,
      pitCooldown: 0
    }));

    this.roadblocks = Array.from({ length: POLICE_POOL_LIMITS.maxRoadblocks }, (_, i) => ({
      id: `roadblock_${i}`,
      slot: i,
      active: false,
      intact: false,
      x: 0,
      z: 0,
      yaw: 0,
      hitCooldown: 0
    }));

    this.helicopter = {
      active: false,
      x: -40,
      y: 21,
      z: 40,
      yaw: 0,
      sx: 0,
      sz: 0,
      searchRadius: 8.5
    };

    this.wantedLevel = 0;
    this.state = 'CLEAR';
    this.cooldownTimer = 0;
    this.cooldownDuration = 0;
    this.starsFlashing = false;
    this.lastKnownPos = { x: 0, z: 0 };
    this.lockdownActive = false;
    this.pitEventsCount = 0;
    this.totalEscapes = 0;

    this._lastUpdateOut = {
      wantedLevel: 0,
      state: 'CLEAR',
      starsFlashing: false,
      cooldownTimer: 0,
      lockdownActive: false,
      pitEvents: [],
      roadblockHits: [],
      activeCruisers: 0,
      activeSwat: 0,
      activeRoadblocks: 0,
      helicopterActive: false
    };
  }

  _pickRoadSpawn(px, pz, slotIdx, isSwat = false) {
    const dirSign = slotIdx % 2 === 0 ? 1 : -1;
    const dist = 56 + (slotIdx % 3) * 16 + (isSwat ? 12 : 0);
    const axisX = this.roadAxes.reduce((a, v) => (Math.abs(v - px) < Math.abs(a - px) ? v : a), 0);
    const axisZ = this.roadAxes.reduce((a, v) => (Math.abs(v - pz) < Math.abs(a - pz) ? v : a), 0);

    const candidates = [
      { x: axisX, z: Math.max(-830, Math.min(930, pz + dirSign * dist)) },
      { x: Math.max(-930, Math.min(930, px + dirSign * dist)), z: axisZ },
      { x: axisX, z: Math.max(-830, Math.min(930, pz - dirSign * dist)) },
      { x: axisX, z: axisZ }
    ];

    for (const c of candidates) {
      const d = Math.hypot(c.x - px, c.z - pz);
      if (d >= 42 && !this.isBlocked(c.x, c.z, 1.25)) return c;
    }
    return { x: axisX, z: Math.max(-830, Math.min(930, pz + dirSign * 60)) };
  }

  _placeRoadblock(rb, playerPos, idx) {
    const px = Number(playerPos?.x) || 0;
    const pz = Number(playerPos?.z) || 0;
    const pyaw = Number(playerPos?.yaw) || 0;
    const offset = [48, 92, 136][idx % 3];
    const bestX = this.roadAxes.reduce((a, v) => (Math.abs(v - px) < Math.abs(a - px) ? v : a), 0);
    const bestZ = this.roadAxes.reduce((a, v) => (Math.abs(v - pz) < Math.abs(a - pz) ? v : a), 0);

    if (Math.abs(px - bestX) <= Math.abs(pz - bestZ)) {
      const dir = Math.cos(pyaw) >= 0 ? 1 : -1;
      rb.x = bestX;
      rb.z = Math.max(-830, Math.min(930, pz + dir * offset * (idx === 2 ? -0.8 : 1)));
      rb.yaw = 0;
    } else {
      const dir = Math.sin(pyaw) >= 0 ? 1 : -1;
      rb.x = Math.max(-930, Math.min(930, px + dir * offset * (idx === 2 ? -0.8 : 1)));
      rb.z = bestZ;
      rb.yaw = Math.PI / 2;
    }
    rb.intact = true;
    rb.hitCooldown = 0;
  }

  setWantedLevel(level, playerPos = null, reason = '') {
    const nextLevel = Math.max(0, Math.min(5, Math.floor(Number(level) || 0)));
    const prevLevel = this.wantedLevel;
    const tier = WANTED_TIERS[nextLevel];

    this.wantedLevel = nextLevel;
    this.lockdownActive = tier.lockdown;
    this.cooldownDuration = tier.cooldownSec;

    const px = Number(playerPos?.x ?? this.lastKnownPos.x) || 0;
    const pz = Number(playerPos?.z ?? this.lastKnownPos.z) || 0;
    if (nextLevel > 0 && playerPos) {
      this.lastKnownPos.x = px;
      this.lastKnownPos.z = pz;
    }

    for (let i = 0; i < this.cruisers.length; i++) {
      const unit = this.cruisers[i];
      const shouldBeActive = i < tier.cruisers;
      if (shouldBeActive && !unit.active) {
        const sp = this._pickRoadSpawn(px, pz, i, false);
        unit.x = sp.x;
        unit.z = sp.z;
        unit.yaw = Math.atan2(px - sp.x, pz - sp.z);
        unit.pitCooldown = 0;
        unit.wheelSpin = 0;
      }
      unit.active = shouldBeActive;
      if (!shouldBeActive) unit.speed = 0;
    }

    for (let i = 0; i < this.swatUnits.length; i++) {
      const unit = this.swatUnits[i];
      const shouldBeActive = i < tier.swat;
      if (shouldBeActive && !unit.active) {
        const sp = this._pickRoadSpawn(px, pz, i + 2, true);
        unit.x = sp.x;
        unit.z = sp.z;
        unit.yaw = Math.atan2(px - sp.x, pz - sp.z);
        unit.pitCooldown = 0;
        unit.wheelSpin = 0;
      }
      unit.active = shouldBeActive;
      if (!shouldBeActive) unit.speed = 0;
    }

    for (let i = 0; i < this.roadblocks.length; i++) {
      const rb = this.roadblocks[i];
      const shouldBeActive = i < tier.roadblocks;
      if (shouldBeActive && !rb.active) {
        this._placeRoadblock(rb, playerPos || this.lastKnownPos, i);
      }
      rb.active = shouldBeActive;
      if (!shouldBeActive) rb.intact = false;
    }

    this.helicopter.active = tier.helicopter;
    if (tier.helicopter) {
      this.helicopter.x = px - 28;
      this.helicopter.z = pz + 28;
      this.helicopter.sx = px;
      this.helicopter.sz = pz;
      this.helicopter.searchRadius = tier.lockdown ? 10.5 : 8.5;
    }

    if (nextLevel === 0) {
      this.state = 'CLEAR';
      this.cooldownTimer = 0;
      this.starsFlashing = false;
    } else {
      this.state = tier.lockdown ? 'LOCKDOWN' : 'CHASE';
      this.cooldownTimer = tier.cooldownSec;
      this.starsFlashing = false;
    }

    if (prevLevel !== nextLevel) {
      this.eventBus?.emit?.('police:wantedChanged', {
        prevLevel,
        wantedLevel: nextLevel,
        tier: tier.label,
        reason
      });
    }
    return this.wantedLevel;
  }

  escalate(delta = 1, playerPos = null, reason = '') {
    const step = Math.max(1, Math.floor(Number(delta) || 1));
    return this.setWantedLevel(this.wantedLevel + step, playerPos, reason);
  }

  clearWanted(reason = '') {
    return this.setWantedLevel(0, null, reason);
  }

  _stepPursuitUnit(unit, tier, dt, player, playerVelocity, aggressionMult, isSwat, playerHalfW = 0.90, playerHalfL = 2.22, playerJumpY = 0) {
    unit.pitCooldown = Math.max(0, (unit.pitCooldown || 0) - dt);
    const target = this.lastKnownPos;
    const dxToTarget = target.x - unit.x;
    const dzToTarget = target.z - unit.z;
    const directDist = Math.hypot(dxToTarget, dzToTarget);

    let wp = target;
    if (this.routeFn && directDist > 22) {
      const nodes = this.routeFn(unit, target);
      if (Array.isArray(nodes) && nodes.length > 1) {
        wp = nodes[1];
      }
    }

    // Apply small flank offset so multiple interceptors encircle instead of stacking
    const flankAngle = (unit.slot % 2 === 0 ? 1 : -1) * 0.45;
    let dx = wp.x - unit.x;
    let dz = wp.z - unit.z;
    if (directDist > 8 && directDist < 26 && player) {
      const baseYaw = Math.atan2(player.x - unit.x, player.z - unit.z) + flankAngle * (unit.slot > 0 ? 0.5 : 0);
      dx = Math.sin(baseYaw);
      dz = Math.cos(baseYaw);
    }

    const len = Math.hypot(dx, dz) || 1;
    const rawSpeed = computeRubberBandSpeed(tier.baseSpeed * aggressionMult, playerVelocity, directDist, isSwat);
    unit.speed = rawSpeed;
    unit.yaw = Math.atan2(dx, dz);

    const minSep = isSwat ? 2.0 : 1.7;
    if (directDist > minSep) {
      const stepDist = Math.min(directDist - minSep, rawSpeed * dt);
      const nx = (dx / len) * stepDist;
      const nz = (dz / len) * stepDist;
      const radius = isSwat ? 1.1 : 1.0;
      if (!this.isBlocked(unit.x + nx, unit.z, radius)) unit.x += nx;
      if (!this.isBlocked(unit.x, unit.z + nz, radius)) unit.z += nz;
      unit.wheelSpin = (unit.wheelSpin || 0) + (stepDist / 0.415);
    }
    if (player && playerJumpY < 1.8) {
      const uBox = { x: unit.x, z: unit.z, yaw: unit.yaw, halfW: isSwat ? 1.08 : 0.90, halfL: isSwat ? 2.64 : 2.22 };
      const pBox = { x: player.x, z: player.z, yaw: Number(player.yaw) || 0, halfW: playerHalfW, halfL: playerHalfL };
      const mtv = obbOverlap(uBox, pBox);
      if (mtv) {
        const push = mtv.pen + 0.04;
        const ux = unit.x + mtv.nx * push;
        const uz = unit.z + mtv.nz * push;
        if (!this.isBlocked(ux, uz, 1.05)) {
          unit.x = ux;
          unit.z = uz;
        } else {
          if (!this.isBlocked(ux, unit.z, 1.05)) unit.x = ux;
          if (!this.isBlocked(unit.x, uz, 1.05)) unit.z = uz;
        }
      }
    }

    if (tier.pitEnabled && player) {
      return computePitManeuver(unit, player, playerVelocity, dt);
    }
    return null;
  }

  update(dt, {
    player = null,
    playerVelocity = 0,
    playerHalfW = 0.90,
    playerHalfL = 2.22,
    playerJumpY = 0,
    inCar = false,
    playTime = 0,
    aggressionMult = 1
  } = {}) {
    const out = this._lastUpdateOut;
    out.pitEvents.length = 0;
    out.roadblockHits.length = 0;

    const stepDt = Math.max(0, Math.min(0.25, Number(dt) || 0));
    if (this.wantedLevel === 0 || !player) {
      out.wantedLevel = 0;
      out.state = 'CLEAR';
      out.starsFlashing = false;
      out.cooldownTimer = 0;
      out.lockdownActive = false;
      out.activeCruisers = 0;
      out.activeSwat = 0;
      out.activeRoadblocks = 0;
      out.helicopterActive = false;
      return out;
    }

    const tier = WANTED_TIERS[this.wantedLevel];
    const sightRange = (52 + this.wantedLevel * 4) * (aggressionMult >= 1 ? 1 : 0.9);
    let spotted = false;

    for (const unit of this.cruisers) {
      if (!unit.active) continue;
      const d = Math.hypot(unit.x - player.x, unit.z - player.z);
      if (d <= sightRange && this.hasLineOfSight(unit, player)) {
        spotted = true;
        break;
      }
    }

    if (!spotted) {
      for (const unit of this.swatUnits) {
        if (!unit.active) continue;
        const d = Math.hypot(unit.x - player.x, unit.z - player.z);
        if (d <= sightRange + 4 && this.hasLineOfSight(unit, player)) {
          spotted = true;
          break;
        }
      }
    }

    if (this.helicopter.active) {
      const h = this.helicopter;
      const orbAngle = playTime * 0.55;
      const tx = this.lastKnownPos.x + Math.cos(orbAngle) * 14;
      const tz = this.lastKnownPos.z + Math.sin(orbAngle) * 14;
      h.x += (tx - h.x) * Math.min(1, stepDt * 1.8);
      h.z += (tz - h.z) * Math.min(1, stepDt * 1.8);
      h.yaw = Math.atan2(this.lastKnownPos.x - h.x, this.lastKnownPos.z - h.z);
      const sweepRadius = tier.lockdown ? 11.5 : 15;
      h.sx = this.lastKnownPos.x + Math.sin(playTime * 1.45) * sweepRadius;
      h.sz = this.lastKnownPos.z + Math.cos(playTime * 1.15) * sweepRadius;
      if (Math.hypot(h.sx - player.x, h.sz - player.z) < h.searchRadius) {
        spotted = true;
      }
    }

    if (spotted) {
      this.lastKnownPos.x = player.x;
      this.lastKnownPos.z = player.z;
      this.state = tier.lockdown ? 'LOCKDOWN' : 'CHASE';
      this.starsFlashing = false;
      this.cooldownTimer = tier.cooldownSec;
    } else {
      this.state = 'COOLDOWN';
      this.starsFlashing = true;
      this.cooldownTimer = Math.max(0, this.cooldownTimer - stepDt);
      if (this.cooldownTimer <= 0) {
        this.totalEscapes += 1;
        this.clearWanted('Escaped police pursuit');
        this.eventBus?.emit?.('police:escaped', { totalEscapes: this.totalEscapes });
        out.wantedLevel = 0;
        out.state = 'CLEAR';
        out.starsFlashing = false;
        out.cooldownTimer = 0;
        out.lockdownActive = false;
        out.activeCruisers = 0;
        out.activeSwat = 0;
        out.activeRoadblocks = 0;
        out.helicopterActive = false;
        return out;
      }
    }

    let activeCruisers = 0;
    for (const unit of this.cruisers) {
      if (!unit.active) continue;
      activeCruisers++;
      const pit = this._stepPursuitUnit(unit, tier, stepDt, player, playerVelocity, aggressionMult, false, playerHalfW, playerHalfL, playerJumpY);
      if (pit?.triggered) {
        this.pitEventsCount++;
        out.pitEvents.push(pit);
        this.eventBus?.emit?.('police:pit', pit);
      }
    }

    let activeSwat = 0;
    for (const unit of this.swatUnits) {
      if (!unit.active) continue;
      activeSwat++;
      const pit = this._stepPursuitUnit(unit, tier, stepDt, player, playerVelocity, aggressionMult, true, playerHalfW, playerHalfL, playerJumpY);
      if (pit?.triggered) {
        this.pitEventsCount++;
        out.pitEvents.push(pit);
        this.eventBus?.emit?.('police:pit', pit);
      }
    }

    let activeRoadblocks = 0;
    for (let i = 0; i < this.roadblocks.length; i++) {
      const rb = this.roadblocks[i];
      if (!rb.active) continue;
      activeRoadblocks++;
      rb.hitCooldown = Math.max(0, rb.hitCooldown - stepDt);
      const distRb = Math.hypot(player.x - rb.x, player.z - rb.z);
      if (distRb > 110) {
        this._placeRoadblock(rb, player, i);
      } else if (inCar && rb.intact && distRb < 3.8 && Math.abs(playerVelocity) > 8 && rb.hitCooldown <= 0) {
        rb.intact = false;
        rb.hitCooldown = 1.5;
        out.roadblockHits.push({ id: rb.id, x: rb.x, z: rb.z, speedFactor: 0.6 });
        this.eventBus?.emit?.('police:roadblockSmashed', { id: rb.id });
      }
    }

    out.wantedLevel = this.wantedLevel;
    out.state = this.state;
    out.starsFlashing = this.starsFlashing;
    out.cooldownTimer = this.cooldownTimer;
    out.lockdownActive = this.lockdownActive;
    out.activeCruisers = activeCruisers;
    out.activeSwat = activeSwat;
    out.activeRoadblocks = activeRoadblocks;
    out.helicopterActive = this.helicopter.active;
    return out;
  }

  getActivePoliceCoords() {
    const out = [];
    for (const u of this.cruisers) if (u.active) out.push({ x: u.x, z: u.z, yaw: u.yaw, kind: 'cruiser', halfW: 0.90, halfL: 2.22, unit: u });
    for (const u of this.swatUnits) if (u.active) out.push({ x: u.x, z: u.z, yaw: u.yaw, kind: 'swat', halfW: 1.08, halfL: 2.64, unit: u });
    return out;
  }

  getSnapshot() {
    return {
      wantedLevel: this.wantedLevel,
      state: this.state,
      starsFlashing: this.starsFlashing,
      cooldownTimer: this.cooldownTimer,
      cooldownDuration: this.cooldownDuration,
      lockdownActive: this.lockdownActive,
      pitEventsCount: this.pitEventsCount,
      totalEscapes: this.totalEscapes,
      activeCruisers: this.cruisers.filter((u) => u.active).length,
      activeSwat: this.swatUnits.filter((u) => u.active).length,
      activeRoadblocks: this.roadblocks.filter((r) => r.active).length,
      helicopterActive: this.helicopter.active
    };
  }
}
