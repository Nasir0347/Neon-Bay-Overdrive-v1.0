/**
 * Fixed-Size Object-Pooled AI Traffic Manager (2000m x 2000m Grid).
 * Supports smooth lane navigation, intersection caution, horn yield reactions,
 * rotating wheel spin state, and hard bumper separation.
 * Pure ES Module with zero static imports.
 */

export const TRAFFIC_VARIANTS = [
  { kind: 'sedan', w: 1.88, h: 1.38, d: 4.35, speed: 7.4, color: '#f4f6fa' },
  { kind: 'coupe', w: 1.92, h: 1.26, d: 4.45, speed: 9.0, color: '#00F0FF' },
  { kind: 'pickup', w: 2.02, h: 1.66, d: 4.75, speed: 6.8, color: '#FF007F' },
  { kind: 'suv', w: 2.00, h: 1.70, d: 4.65, speed: 7.0, color: '#ffd700' },
  { kind: 'van', w: 2.05, h: 1.82, d: 4.85, speed: 6.0, color: '#38f288' }
];

function obbOverlap(a, b) {
  if (!a || !b) return null;
  const aW = a.halfW || 0.90;
  const aL = a.halfL || 2.18;
  const bW = b.halfW || 0.90;
  const bL = b.halfL || 2.18;
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

export class TrafficManager {
  constructor({
    poolSize = 24,
    roadAxes = [-900, -600, -300, 0, 300, 600, 900],
    minSpawnDist = 60,
    maxSpawnDist = 200,
    despawnDist = 245,
    cityLimit = 950,
    isBlocked = null,
    eventBus = null
  } = {}) {
    this.poolSize = Math.max(1, Math.floor(Number(poolSize) || 24));
    this.roadAxes = Array.isArray(roadAxes) && roadAxes.length ? roadAxes : [-900, -600, -300, 0, 300, 600, 900];
    this.minSpawnDist = minSpawnDist;
    this.maxSpawnDist = maxSpawnDist;
    this.despawnDist = despawnDist;
    this.cityLimit = cityLimit;
    this.isBlocked = typeof isBlocked === 'function' ? isBlocked : () => false;
    this.eventBus = eventBus || null;

    this.pool = Array.from({ length: this.poolSize }, (_, id) => {
      const vr = TRAFFIC_VARIANTS[id % TRAFFIC_VARIANTS.length];
      return {
        id,
        active: false,
        x: 0,
        z: 0,
        yaw: 0,
        axis: 'z',
        direction: 1,
        roadCenter: 0,
        laneOffset: 4.8,
        speed: 0,
        targetSpeed: vr.speed,
        wheelSpin: 0,
        braking: false,
        hornReactTimer: 0,
        variantIndex: id % TRAFFIC_VARIANTS.length,
        color: vr.color,
        halfW: vr.w * 0.48,
        halfL: vr.d * 0.49,
        yielding: false
      };
    });

    this.activeCount = 0;
    this.totalSpawns = 0;
    this.totalDespawns = 0;
    this.peakActive = 0;
    this._spawnCursor = 0;
    this._activeCache = [];
    this._pBox = { x: 0, z: 0, yaw: 0, halfW: 0.90, halfL: 2.22 };
    this._sBox = { x: 0, z: 0, yaw: 0, halfW: 0.90, halfL: 2.18 };
  }

  acquireSlot() {
    for (let i = 0; i < this.pool.length; i++) {
      if (!this.pool[i].active) return this.pool[i];
    }
    return null;
  }

  reactToHorn(playerPos = { x: 0, z: 0 }) {
    const px = Number(playerPos?.x) || 0;
    const pz = Number(playerPos?.z) || 0;
    let reacted = 0;
    for (let i = 0; i < this.pool.length; i++) {
      const slot = this.pool[i];
      if (!slot.active) continue;
      if (Math.hypot(slot.x - px, slot.z - pz) <= 32) {
        slot.hornReactTimer = 2.6;
        slot.yielding = true;
        reacted += 1;
      }
    }
    return reacted;
  }

  _canOccupy(x, z, skipSlot) {
    if (Math.abs(x) > this.cityLimit || Math.abs(z) > this.cityLimit || z < -825) return false;
    if (this.isBlocked(x, z, 1.25)) return false;
    for (let i = 0; i < this.pool.length; i++) {
      const other = this.pool[i];
      if (!other.active || other === skipSlot) continue;
      if (Math.hypot(other.x - x, other.z - z) < 13) return false;
    }
    return true;
  }

  spawnNear(playerPos = { x: 0, z: 0 }, options = {}) {
    const slot = this.acquireSlot();
    if (!slot) return null;

    const px = Number(playerPos?.x) || 0;
    const pz = Number(playerPos?.z) || 0;
    const minD = Number.isFinite(options.minDist) ? options.minDist : this.minSpawnDist;
    const maxD = Number.isFinite(options.maxDist) ? options.maxDist : this.maxSpawnDist;

    for (let attempt = 0; attempt < 20; attempt++) {
      const seq = (this._spawnCursor + attempt) >>> 0;
      const axisName = seq % 2 === 0 ? 'z' : 'x';
      const direction = (seq % 4 < 2) ? 1 : -1;
      const laneOffset = direction > 0 ? 4.8 : -4.8;

      const sortedAxes = [...this.roadAxes].sort((a, b) => {
        const ref = axisName === 'z' ? px : pz;
        return Math.abs(a - ref) - Math.abs(b - ref);
      });
      const roadCenter = sortedAxes[seq % Math.min(3, sortedAxes.length)] ?? 0;
      const span = minD + ((seq * 29) % Math.max(14, Math.floor(maxD - minD)));
      const signAlong = (seq % 3 === 0) ? -1 : 1;

      const x = axisName === 'z'
        ? roadCenter + laneOffset
        : Math.max(-this.cityLimit + 10, Math.min(this.cityLimit - 10, px + signAlong * span));
      const z = axisName === 'z'
        ? Math.max(-820, Math.min(this.cityLimit - 10, pz + signAlong * span))
        : roadCenter + laneOffset;

      const distPlayer = Math.hypot(x - px, z - pz);
      if (distPlayer < minD * 0.65 || distPlayer > maxD + 35) continue;
      if (!this._canOccupy(x, z, slot)) continue;

      const vIdx = (slot.id + seq) % TRAFFIC_VARIANTS.length;
      const variant = TRAFFIC_VARIANTS[vIdx];
      slot.active = true;
      slot.x = x;
      slot.z = z;
      slot.axis = axisName;
      slot.direction = direction;
      slot.roadCenter = roadCenter;
      slot.laneOffset = laneOffset;
      slot.variantIndex = vIdx;
      slot.color = variant.color;
      slot.halfW = variant.w * 0.48;
      slot.halfL = variant.d * 0.49;
      slot.targetSpeed = variant.speed;
      slot.speed = variant.speed;
      slot.wheelSpin = 0;
      slot.braking = false;
      slot.hornReactTimer = 0;
      slot.yielding = false;
      slot.yaw = axisName === 'z'
        ? (direction > 0 ? 0 : Math.PI)
        : (direction > 0 ? Math.PI / 2 : -Math.PI / 2);

      this._spawnCursor = (seq + 1) & 0xffff;
      this.activeCount += 1;
      this.totalSpawns += 1;
      if (this.activeCount > this.peakActive) this.peakActive = this.activeCount;
      this.eventBus?.emit?.('traffic:spawn', { id: slot.id, x: slot.x, z: slot.z });
      return slot;
    }

    return null;
  }

  despawn(slot) {
    if (!slot || !slot.active) return false;
    slot.active = false;
    slot.speed = 0;
    slot.braking = false;
    slot.hornReactTimer = 0;
    slot.yielding = false;
    this.activeCount = Math.max(0, this.activeCount - 1);
    this.totalDespawns += 1;
    this.eventBus?.emit?.('traffic:despawn', { id: slot.id });
    return true;
  }

  clearAll() {
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].active) this.despawn(this.pool[i]);
    }
  }

  update(dt, {
    player = { x: 0, z: 0 },
    playerHalfW = 0.90,
    playerHalfL = 2.22,
    playerJumpY = 0,
    sirenActive = false,
    lockdownActive = false,
    targetDensity = 16,
    maxSpawnsPerTick = 2
  } = {}) {
    const stepDt = Math.max(0, Math.min(0.25, Number(dt) || 0));
    const px = Number(player?.x) || 0;
    const pz = Number(player?.z) || 0;
    const pYaw = Number(player?.yaw) || 0;
    const pSin = Math.sin(pYaw);
    const pCos = Math.cos(pYaw);
    const pBox = this._pBox;
    pBox.x = px;
    pBox.z = pz;
    pBox.yaw = pYaw;
    pBox.halfW = Number.isFinite(playerHalfW) ? playerHalfW : 0.90;
    pBox.halfL = Number.isFinite(playerHalfL) ? playerHalfL : 2.22;
    const sBox = this._sBox;
    const pJumpY = Number(playerJumpY) || 0;

    const desired = Math.min(
      this.poolSize,
      lockdownActive ? Math.max(4, Math.floor(targetDensity * 0.45)) : targetDensity
    );

    for (let i = 0; i < this.pool.length; i++) {
      const slot = this.pool[i];
      if (!slot.active) continue;
      const distPlayer = Math.hypot(slot.x - px, slot.z - pz);
      if (distPlayer > this.despawnDist || Math.abs(slot.x) > this.cityLimit + 10 || slot.z > this.cityLimit + 10 || slot.z < -835) {
        this.despawn(slot);
      }
    }

    let spawnedThisTick = 0;
    while (this.activeCount < desired && spawnedThisTick < maxSpawnsPerTick) {
      if (!this.spawnNear(player)) break;
      spawnedThisTick++;
    }

    for (let i = 0; i < this.pool.length; i++) {
      const slot = this.pool[i];
      if (!slot.active) continue;

      if (slot.hornReactTimer > 0) slot.hornReactTimer = Math.max(0, slot.hornReactTimer - stepDt);
      const vr = TRAFFIC_VARIANTS[slot.variantIndex] || TRAFFIC_VARIANTS[0];
      const sHW = slot.halfW || vr.w * 0.48;
      const sHL = slot.halfL || vr.d * 0.49;
      slot.halfW = sHW;
      slot.halfL = sHL;

      const lateralKey = slot.axis === 'x' ? 'z' : 'x';
      const distPlayer = Math.hypot(slot.x - px, slot.z - pz);
      slot.yielding = (sirenActive && distPlayer < 32) || slot.hornReactTimer > 0;

      const targetLat = slot.yielding
        ? slot.roadCenter + (Math.sign(slot.laneOffset) || 1) * 8.6
        : slot.roadCenter + slot.laneOffset;
      if (Math.abs(slot[lateralKey] - targetLat) > 0.05) {
        slot[lateralKey] += (targetLat - slot[lateralKey]) * Math.min(1, stepDt * 3.0);
      }

      const fwdX = Math.sin(slot.yaw);
      const fwdZ = Math.cos(slot.yaw);
      const toPlayerX = px - slot.x;
      const toPlayerZ = pz - slot.z;
      const ahead = toPlayerX * fwdX + toPlayerZ * fwdZ;
      const latDiff = toPlayerX * fwdZ - toPlayerZ * fwdX;
      const pLatProj = pBox.halfW * Math.abs(pCos * fwdZ + pSin * fwdX) + pBox.halfL * Math.abs(pSin * fwdZ - pCos * fwdX);
      const laneClear = sHW + pLatProj + 0.18;
      const stopAhead = sHL + pBox.halfL + 4.5;
      let headwayStop = pJumpY < 1.8 && ahead > 0.4 && ahead < stopAhead && Math.abs(latDiff) < laneClear;

      if (!headwayStop) {
        for (let j = 0; j < this.pool.length; j++) {
          if (i === j) continue;
          const o = this.pool[j];
          if (!o.active || o.axis !== slot.axis || o.direction !== slot.direction) continue;
          const deltaMain = (o[slot.axis] - slot[slot.axis]) * slot.direction;
          if (deltaMain > 0 && deltaMain < 9.5 && Math.abs(o[lateralKey] - slot[lateralKey]) < 2.6) {
            headwayStop = true;
            break;
          }
        }
      }

      slot.braking = headwayStop || slot.yielding;
      const desiredSpd = headwayStop ? 0 : (slot.yielding ? slot.targetSpeed * 0.4 : slot.targetSpeed);
      slot.speed += (desiredSpd - slot.speed) * Math.min(1, stepDt * 4.5);

      if (pJumpY < 1.8) {
        sBox.x = slot.x;
        sBox.z = slot.z;
        sBox.yaw = slot.yaw;
        sBox.halfW = sHW;
        sBox.halfL = sHL;
        const mtv = obbOverlap(sBox, pBox);
        if (mtv) {
          const push = mtv.pen + 0.04;
          const nxPush = slot.x + mtv.nx * push;
          const nzPush = slot.z + mtv.nz * push;
          if (!this.isBlocked(nxPush, nzPush, 1.05)) {
            slot.x = nxPush;
            slot.z = nzPush;
          } else {
            if (!this.isBlocked(nxPush, slot.z, 1.05)) slot.x = nxPush;
            if (!this.isBlocked(slot.x, nzPush, 1.05)) slot.z = nzPush;
          }
          const headDot = mtv.nx * fwdX + mtv.nz * fwdZ;
          if (headDot < -0.35) {
            slot.speed = 0;
            slot.braking = true;
          } else {
            slot.speed *= 0.72;
          }
        }
      }

      const moveDist = slot.speed * stepDt;
      if (moveDist > 0.001) {
        slot.wheelSpin += moveDist / 0.36;
        const nextMain = slot[slot.axis] + slot.direction * moveDist;
        const nx = slot.axis === 'x' ? nextMain : slot.x;
        const nz = slot.axis === 'z' ? nextMain : slot.z;

        let hitsPlayerNext = false;
        if (pJumpY < 1.8) {
          sBox.x = nx;
          sBox.z = nz;
          sBox.yaw = slot.yaw;
          sBox.halfW = sHW;
          sBox.halfL = sHL;
          hitsPlayerNext = !!obbOverlap(sBox, pBox);
        }

        if (hitsPlayerNext) {
          slot.speed = 0;
          slot.braking = true;
        } else if (!this.isBlocked(nx, nz, 1.05) && Math.abs(nextMain) <= this.cityLimit && nz >= -825) {
          slot[slot.axis] = nextMain;
        } else {
          slot.direction *= -1;
          slot.laneOffset = -slot.laneOffset;
          slot.yaw += Math.PI;
        }
      }
    }

    return this.getStats();
  }

  getActiveVehicles() {
    this._activeCache.length = 0;
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].active) this._activeCache.push(this.pool[i]);
    }
    return this._activeCache;
  }

  getStats() {
    return {
      poolSize: this.poolSize,
      activeCount: this.activeCount,
      freeCount: this.poolSize - this.activeCount,
      totalSpawns: this.totalSpawns,
      totalDespawns: this.totalDespawns,
      peakActive: this.peakActive
    };
  }
}
