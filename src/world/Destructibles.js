/**
 * Breakable Open-World Street Props:
 * - Lampposts (directional knock-down topple)
 * - Construction/Road Barricades (launch + spin physics)
 * - Fire Hydrants (knock-off + pressurized 8s water geyser effect)
 * Fixed object-pooled state; zero runtime scene allocations.
 */

export const PROP_TYPES = {
  LAMPPOST: 'lamppost',
  BARRICADE: 'barricade',
  HYDRANT: 'hydrant'
};

export class DestructiblesManager {
  constructor({ respawnDelay = 45, eventBus = null } = {}) {
    this.respawnDelay = respawnDelay;
    this.eventBus = eventBus || null;
    this.props = [];
    this.brokenTotal = 0;
    this._hitsScratch = [];
  }

  initDefaultCityProps(roadAxes = [-900, -600, -300, 0, 300, 600, 900], isBlocked = () => false) {
    this.props.length = 0;
    let id = 0;

    const addProp = (type, x, z, yaw = 0) => {
      if (isBlocked(x, z, 0.3)) return;
      const isLamp = type === PROP_TYPES.LAMPPOST;
      const isHydrant = type === PROP_TYPES.HYDRANT;
      this.props.push({
        id: id++,
        type,
        homeX: x,
        homeZ: z,
        homeYaw: yaw,
        x,
        y: 0,
        z,
        yaw,
        tilt: 0,
        tiltDirX: 0,
        tiltDirZ: 1,
        tiltVel: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        intact: true,
        respawnTimer: 0,
        geyserTimer: 0,
        radius: isLamp ? 0.45 : isHydrant ? 0.55 : 1.05,
        minBreakSpeed: isLamp ? 5.5 : isHydrant ? 3.5 : 4.0
      });
    };

    // 24 Breakable Lampposts across all 4 districts along boulevard curbs (clear of building colliders)
    for (const z of [-92, -64, -36, 36, 64, 92, -260, -560, 260, 460, -780, 720]) {
      for (const side of [-1, 1]) {
        addProp(PROP_TYPES.LAMPPOST, side * 11.4, z, side > 0 ? Math.PI / 2 : -Math.PI / 2);
      }
    }

    // 18 Breakable Street Barricades across Industrial Port, Suburbs & Avenues
    const barricadeCoords = [
      [-288, -35, 0], [288, -35, 0], [-288, 55, 0], [288, 55, 0],
      [-35, -288, Math.PI / 2], [35, -288, Math.PI / 2], [-35, 288, Math.PI / 2], [35, 288, Math.PI / 2],
      [-588, -80, 0], [-588, 80, 0], [588, -80, 0], [588, 80, 0],
      [-140, -588, Math.PI / 2], [140, -612, Math.PI / 2], [-312, -360, 0], [312, 360, 0],
      [-612, 240, 0], [612, -240, 0]
    ];
    for (const [bx, bz, byaw] of barricadeCoords) {
      addProp(PROP_TYPES.BARRICADE, bx, bz, byaw);
    }

    // 14 Fire Hydrants at intersection corners across Apex Core & outer districts
    const hydrantCoords = [
      [-11.4, -16], [11.4, -16], [-11.4, 16], [11.4, 16],
      [-287, -16], [287, -16], [-287, 287], [287, 287],
      [-11.4, -287], [11.4, -287], [-11.4, 287], [11.4, 287],
      [-11.4, -587], [11.4, 587]
    ];
    for (const [hx, hz] of hydrantCoords) {
      addProp(PROP_TYPES.HYDRANT, hx, hz, 0);
    }

    return this.props.length;
  }

  checkVehicleCollision(vehiclePos, velocity, vehicleRadius = 1.2) {
    this._hitsScratch.length = 0;
    if (!vehiclePos || !Number.isFinite(vehiclePos.x) || !Number.isFinite(vehiclePos.z)) {
      return this._hitsScratch;
    }
    const speedAbs = Math.abs(Number(velocity) || 0);
    if (speedAbs < 3.0) return this._hitsScratch;

    const dirSign = (Number(velocity) || 0) >= 0 ? 1 : -1;
    const vxUnit = Math.sin(vehiclePos.yaw || 0) * dirSign;
    const vzUnit = Math.cos(vehiclePos.yaw || 0) * dirSign;

    for (let i = 0; i < this.props.length; i++) {
      const p = this.props[i];
      if (!p.intact) continue;
      if (speedAbs < p.minBreakSpeed) continue;
      const d = Math.hypot(vehiclePos.x - p.x, vehiclePos.z - p.z);
      if (d > vehicleRadius + p.radius) continue;

      p.intact = false;
      p.respawnTimer = this.respawnDelay;
      this.brokenTotal += 1;

      if (p.type === PROP_TYPES.LAMPPOST) {
        p.tiltDirX = vxUnit;
        p.tiltDirZ = vzUnit;
        p.tiltVel = Math.min(7.5, 2.5 + speedAbs * 0.18);
      } else if (p.type === PROP_TYPES.BARRICADE) {
        p.vx = vxUnit * Math.min(12, speedAbs * 0.45);
        p.vy = Math.min(5.2, 2.2 + speedAbs * 0.12);
        p.vz = vzUnit * Math.min(12, speedAbs * 0.45);
        p.tiltVel = 6.5;
      } else if (p.type === PROP_TYPES.HYDRANT) {
        p.vx = vxUnit * Math.min(8, speedAbs * 0.3);
        p.vy = 4.2;
        p.vz = vzUnit * Math.min(8, speedAbs * 0.3);
        p.geyserTimer = 8.0;
      }

      const hitInfo = {
        prop: p,
        type: p.type,
        speedFactor: p.type === PROP_TYPES.LAMPPOST ? 0.86 : 0.92,
        shakeAmp: p.type === PROP_TYPES.LAMPPOST ? 0.22 : 0.14,
        geyserStarted: p.type === PROP_TYPES.HYDRANT
      };
      this._hitsScratch.push(hitInfo);
      this.eventBus?.emit?.('world:propBroken', { id: p.id, type: p.type, x: p.homeX, z: p.homeZ });
    }

    return this._hitsScratch;
  }

  update(dt, playerPos = null) {
    const stepDt = Math.max(0, Math.min(0.25, Number(dt) || 0));
    for (let i = 0; i < this.props.length; i++) {
      const p = this.props[i];
      if (p.intact) continue;

      if (p.type === PROP_TYPES.LAMPPOST) {
        if (p.tilt < Math.PI / 2) {
          p.tilt = Math.min(Math.PI / 2, p.tilt + (p.tiltVel || 3.5) * stepDt);
        }
      } else {
        if (p.y > 0 || p.vy > 0) {
          p.x += p.vx * stepDt;
          p.z += p.vz * stepDt;
          p.vy -= 14 * stepDt;
          p.y = Math.max(0, p.y + p.vy * stepDt);
          p.yaw += (p.tiltVel || 4) * stepDt;
          if (p.y === 0) {
            p.vx *= 0.4;
            p.vz *= 0.4;
            p.vy = 0;
          }
        }
      }

      if (p.geyserTimer > 0) {
        p.geyserTimer = Math.max(0, p.geyserTimer - stepDt);
      }

      if (p.respawnTimer > 0) {
        p.respawnTimer = Math.max(0, p.respawnTimer - stepDt);
      }
      if (p.respawnTimer === 0 && p.geyserTimer === 0) {
        const farEnough = !playerPos || Math.hypot(playerPos.x - p.homeX, playerPos.z - p.homeZ) > 95;
        if (farEnough) {
          this._restoreProp(p);
        }
      }
    }
  }

  _restoreProp(p) {
    p.intact = true;
    p.x = p.homeX;
    p.y = 0;
    p.z = p.homeZ;
    p.yaw = p.homeYaw;
    p.tilt = 0;
    p.tiltVel = 0;
    p.vx = 0;
    p.vy = 0;
    p.vz = 0;
    p.respawnTimer = 0;
    p.geyserTimer = 0;
  }

  resetAll() {
    for (let i = 0; i < this.props.length; i++) {
      this._restoreProp(this.props[i]);
    }
  }

  getStats() {
    let intactCount = 0;
    let activeGeysers = 0;
    for (let i = 0; i < this.props.length; i++) {
      if (this.props[i].intact) intactCount++;
      if (this.props[i].geyserTimer > 0) activeGeysers++;
    }
    return {
      totalProps: this.props.length,
      intactCount,
      brokenCount: this.props.length - intactCount,
      activeGeysers,
      brokenTotal: this.brokenTotal
    };
  }
}
