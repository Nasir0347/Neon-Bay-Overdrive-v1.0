/**
 * Vehicle Roster & Garage Customization Manager for Neon Bay: Overdrive.
 * Defines all 12 Cars (C01-C12) and 4 Bikes (B01-B04) at exact 1 unit = 1 meter scales,
 * copyright-safe fictional brands, speed/handling stats, and SaveManager customization persistence.
 */

export const VEHICLE_ROSTER = Object.freeze([
  // 12 Cars
  {
    id: 'C01',
    type: 'car',
    name: 'Kuro Civic-X',
    archetype: 'Street Starter Sedan',
    role: 'Balanced starter (M1, Free)',
    scale: { l: 4.50, w: 1.85, h: 1.42 },
    topSpeedKmh: 175,
    massKg: 1350,
    handling: 1.45,
    accel: 10.5,
    price: 0,
    starter: true,
    runtimeKey: 'car',
    defaultPaint: '#a4b8bb'
  },
  {
    id: 'C02',
    type: 'car',
    name: 'Kuro Drift-R',
    archetype: 'JDM Street Coupe',
    role: 'High drift angle (M2, Free)',
    scale: { l: 4.55, w: 1.90, h: 1.35 },
    topSpeedKmh: 210,
    massKg: 1420,
    handling: 1.65,
    accel: 14.5,
    price: 0,
    starter: true,
    runtimeKey: 'sports',
    defaultPaint: '#9e2a2b'
  },
  {
    id: 'C03',
    type: 'car',
    name: 'Stallion V8 GT',
    archetype: 'American Muscle',
    role: 'Heavy torque, loud V8 (M4, M5)',
    scale: { l: 4.85, w: 1.95, h: 1.40 },
    topSpeedKmh: 225,
    massKg: 1750,
    handling: 1.50,
    accel: 15.8,
    price: 2500,
    starter: false,
    runtimeKey: 'muscle',
    defaultPaint: '#ff007f'
  },
  {
    id: 'C04',
    type: 'car',
    name: 'Kuro Turbo-RS',
    archetype: 'Rally Turbo Hatchback',
    role: 'Agile ramming & corners (M6)',
    scale: { l: 4.30, w: 1.85, h: 1.45 },
    topSpeedKmh: 215,
    massKg: 1300,
    handling: 1.78,
    accel: 15.2,
    price: 3200,
    starter: false,
    runtimeKey: 'sports',
    defaultPaint: '#00f0ff'
  },
  {
    id: 'C05',
    type: 'car',
    name: 'Vortex Spyder',
    archetype: 'Mid-Engine Sports',
    role: 'Sharp grip, high speed (M7, M12)',
    scale: { l: 4.60, w: 1.98, h: 1.22 },
    topSpeedKmh: 265,
    massKg: 1450,
    handling: 1.76,
    accel: 17.5,
    price: 6500,
    starter: false,
    runtimeKey: 'supercar',
    defaultPaint: '#e63946'
  },
  {
    id: 'C06',
    type: 'car',
    name: 'Solaris Drop-Top',
    archetype: 'Luxury Coastal Convertible',
    role: 'Smooth cruiser (M9 No-Brakes)',
    scale: { l: 4.75, w: 1.92, h: 1.32 },
    topSpeedKmh: 235,
    massKg: 1600,
    handling: 1.58,
    accel: 14.8,
    price: 4800,
    starter: false,
    runtimeKey: 'muscle',
    defaultPaint: '#2ec4b6'
  },
  {
    id: 'C07',
    type: 'car',
    name: 'Titan Executive',
    archetype: 'Armoured Utility SUV',
    role: 'High HP, ramming boss (M10, M19)',
    scale: { l: 4.95, w: 2.05, h: 1.95 },
    topSpeedKmh: 195,
    massKg: 2600,
    handling: 1.32,
    accel: 12.2,
    price: 5500,
    starter: false,
    runtimeKey: 'suv',
    defaultPaint: '#181c24'
  },
  {
    id: 'C08',
    type: 'car',
    name: 'Titan 4x4 Crusher',
    archetype: 'Heavy Off-Road Truck',
    role: 'Smashes barricades (M11, M13)',
    scale: { l: 5.40, w: 2.15, h: 2.05 },
    topSpeedKmh: 185,
    massKg: 3100,
    handling: 1.25,
    accel: 11.4,
    price: 6000,
    starter: false,
    runtimeKey: 'pickup',
    defaultPaint: '#f4f6fa'
  },
  {
    id: 'C09',
    type: 'car',
    name: 'Vortex Shadow',
    archetype: 'Matte-Black Stealth Coupe',
    role: 'Stealth & lockdown (M14, M16)',
    scale: { l: 4.65, w: 1.98, h: 1.24 },
    topSpeedKmh: 275,
    massKg: 1480,
    handling: 1.74,
    accel: 18.0,
    price: 8500,
    starter: false,
    runtimeKey: 'sports',
    defaultPaint: '#181c24'
  },
  {
    id: 'C10',
    type: 'car',
    name: 'Vortex Veneno-X',
    archetype: 'Wedge Hypercar',
    role: 'Flagship speedster (M15, M17, M18)',
    scale: { l: 4.78, w: 2.06, h: 1.16 },
    topSpeedKmh: 320,
    massKg: 1520,
    handling: 1.80,
    accel: 19.6,
    price: 15000,
    starter: false,
    runtimeKey: 'supercar',
    defaultPaint: '#00f0ff'
  },
  {
    id: 'C11',
    type: 'car',
    name: 'Vortex Apex Gold',
    archetype: 'Exclusive Golden Hypercar',
    role: 'M20 Grand Finale Reward / VIP',
    scale: { l: 4.80, w: 2.08, h: 1.15 },
    topSpeedKmh: 340,
    massKg: 1490,
    handling: 1.88,
    accel: 21.0,
    price: 25000,
    starter: false,
    runtimeKey: 'supercar',
    defaultPaint: '#ffd700'
  },
  {
    id: 'C12',
    type: 'car',
    name: 'NBPD Interceptor',
    archetype: 'Police Pursuit Cruiser',
    role: 'Siren + Vigilante Mode Unlock',
    scale: { l: 4.90, w: 1.96, h: 1.48 },
    topSpeedKmh: 250,
    massKg: 1850,
    handling: 1.62,
    accel: 15.5,
    price: 9500,
    starter: false,
    runtimeKey: 'cruiser',
    defaultPaint: '#f4f6fa'
  },

  // 4 Bikes
  {
    id: 'B01',
    type: 'bike',
    name: 'Phantom Street 600',
    archetype: 'Agile Sport Bike',
    role: 'Narrow alleys & ramps (M3, M17, Free)',
    scale: { l: 2.05, w: 0.78, h: 1.12 },
    topSpeedKmh: 220,
    massKg: 195,
    handling: 1.92,
    accel: 15.5,
    price: 0,
    starter: true,
    runtimeKey: 'bike',
    defaultPaint: '#7b3029'
  },
  {
    id: 'B02',
    type: 'bike',
    name: 'Phantom Dirt-X',
    archetype: 'Stunt / Enduro Bike',
    role: 'High air control, mega-jumps',
    scale: { l: 2.15, w: 0.82, h: 1.25 },
    topSpeedKmh: 185,
    massKg: 125,
    handling: 2.08,
    accel: 14.2,
    price: 2800,
    starter: false,
    runtimeKey: 'bike',
    defaultPaint: '#2ec4b6'
  },
  {
    id: 'B03',
    type: 'bike',
    name: 'Phantom R1000',
    archetype: 'Heavy Highway Superbike',
    role: 'Highway duels (M8, M15)',
    scale: { l: 2.10, w: 0.80, h: 1.15 },
    topSpeedKmh: 295,
    massKg: 210,
    handling: 2.04,
    accel: 20.0,
    price: 7500,
    starter: false,
    runtimeKey: 'superbike',
    defaultPaint: '#e63946'
  },
  {
    id: 'B04',
    type: 'bike',
    name: 'Phantom Neon-Z',
    archetype: 'Futuristic Cyber Light-Bike',
    role: 'Secret/Boss unlock, neon trails',
    scale: { l: 2.20, w: 0.85, h: 1.10 },
    topSpeedKmh: 315,
    massKg: 180,
    handling: 2.18,
    accel: 21.5,
    price: 18000,
    starter: false,
    runtimeKey: 'superbike',
    defaultPaint: '#00f0ff'
  }
]);

export const PAINT_PRESETS = Object.freeze([
  { id: 'cyan', label: 'Electric Cyan', hex: '#00f0ff' },
  { id: 'magenta', label: 'Sunset Magenta', hex: '#ff007f' },
  { id: 'gold', label: 'Apex Gold', hex: '#ffd700' },
  { id: 'pearl', label: 'Pearl White', hex: '#f4f6fa' },
  { id: 'stealth', label: 'Stealth Black', hex: '#181c24' },
  { id: 'crimson', label: 'Venom Red', hex: '#e63946' },
  { id: 'teal', label: 'Bay Teal', hex: '#2ec4b6' },
  { id: 'violet', label: 'Midnight Purple', hex: '#7b2cbf' }
]);

export const NEON_PRESETS = Object.freeze([
  { id: 'off', label: 'Off', hex: null },
  { id: 'cyan', label: 'Cyan', hex: '#00f0ff' },
  { id: 'magenta', label: 'Magenta', hex: '#ff007f' },
  { id: 'gold', label: 'Gold', hex: '#ffd700' },
  { id: 'red', label: 'Red', hex: '#ff2a2a' },
  { id: 'green', label: 'Green', hex: '#38f288' },
  { id: 'purple', label: 'Purple', hex: '#b845ff' }
]);

export const TURBO_UPGRADE_COSTS = Object.freeze([0, 600, 1200, 2000]);

const ROSTER_MAP = new Map(VEHICLE_ROSTER.map((v) => [v.id, v]));
const VALID_HEX_RE = /^#[0-9a-f]{6}$/i;
const VALID_NEON_SET = new Set(NEON_PRESETS.map((n) => n.id));

/**
 * Normalize an arbitrary procedural or imported Three.js vehicle mesh group so its
 * chassis Box3 matches `spec.scale` (`l` along Z, `w` along X, `h` along Y)
 * with tires resting cleanly at `y = 0`, excluding FX/headlight beam children.
 */
export function normalizeVehicleMeshScale(mesh, spec, THREE_ref = globalThis.THREE) {
  if (!mesh || !spec?.scale) return { ok: false, reason: 'invalid-input' };

  const targetL = Number(spec.scale.l) || 4.5;
  const targetW = Number(spec.scale.w) || 1.85;
  const targetH = Number(spec.scale.h) || 1.4;

  // Hide FX beam planes during measurement so beams don't distort Box3 dimensions
  const beams = Array.isArray(mesh.userData?.beams) ? mesh.userData.beams : [];
  const beamVis = beams.map((b) => b.visible);
  beams.forEach((b) => { b.visible = false; });

  if (THREE_ref?.Box3) {
    const savedPosition = mesh.position?.clone?.();
    const savedRotation = mesh.rotation?.clone?.();
    mesh.position?.set?.(0, 0, 0);
    mesh.rotation?.set?.(0, 0, 0);
    const parents = beams.map(b => b.parent);
    beams.forEach(b => b.removeFromParent?.());
    mesh.scale?.set?.(1, 1, 1);
    mesh.position && (mesh.position.y = 0);
    mesh.updateMatrixWorld?.(true);
    const box = new THREE_ref.Box3().setFromObject(mesh);
    const sizeX = Math.max(0.01, box.max.x - box.min.x);
    const sizeY = Math.max(0.01, box.max.y - box.min.y);
    const sizeZ = Math.max(0.01, box.max.z - box.min.z);

    const sx = targetW / sizeX;
    const sy = targetH / sizeY;
    const sz = targetL / sizeZ;
    mesh.scale.set(sx, sy, sz);
    mesh.updateMatrixWorld?.(true);

    const groundedBox = new THREE_ref.Box3().setFromObject(mesh);
    if (Number.isFinite(groundedBox.min.y)) {
      mesh.position.y = -groundedBox.min.y;
    }
    beams.forEach((b, i) => { parents[i]?.add?.(b); b.visible = beamVis[i]; });
    if (savedRotation) mesh.rotation.copy(savedRotation);
    if (savedPosition) { mesh.position.x = savedPosition.x; mesh.position.z = savedPosition.z; }
    return {
      ok: true,
      scaleFactors: { x: sx, y: sy, z: sz },
      bounds: { w: targetW, h: targetH, l: targetL },
      minY: 0
    };
  }

  // Fallback for lightweight unit mocks without THREE.Box3
  const dims = mesh.userData?.rawDims || { x: targetW, y: targetH, z: targetL, minY: 0 };
  const sx = targetW / Math.max(0.01, dims.x);
  const sy = targetH / Math.max(0.01, dims.y);
  const sz = targetL / Math.max(0.01, dims.z);
  mesh.scale?.set?.(sx, sy, sz);
  if (mesh.position) mesh.position.y = -(Number(dims.minY) || 0) * sy;
  beams.forEach((b, i) => { b.visible = beamVis[i]; });
  return {
    ok: true,
    scaleFactors: { x: sx, y: sy, z: sz },
    bounds: { w: targetW, h: targetH, l: targetL },
    minY: 0
  };
}

export class GarageManager {
  constructor({ saveManager = null, eventBus = null, onApplyVisuals = null, onSpawnVehicle = null } = {}) {
    this.saveManager = saveManager;
    this.eventBus = eventBus || saveManager?.bus || null;
    this.onApplyVisuals = typeof onApplyVisuals === 'function' ? onApplyVisuals : null;
    this.onSpawnVehicle = typeof onSpawnVehicle === 'function' ? onSpawnVehicle : null;
  }

  getAllVehicles() {
    return VEHICLE_ROSTER;
  }

  getCars() {
    return VEHICLE_ROSTER.filter((v) => v.type === 'car');
  }

  getBikes() {
    return VEHICLE_ROSTER.filter((v) => v.type === 'bike');
  }

  getVehicle(id) {
    return ROSTER_MAP.get(id) || null;
  }

  isUnlocked(id) {
    const spec = this.getVehicle(id);
    if (!spec) return false;
    if (spec.starter) return true;
    const data = this.saveManager?.getData?.();
    if (!data) return false;
    if (data.monetization?.unlockAllVehicles) return true;
    const list = spec.type === 'bike' ? data.unlockedVehicles?.bikes : data.unlockedVehicles?.cars;
    return Array.isArray(list) && list.includes(id);
  }

  getSelectedVehicle() {
    const selectedId = this.saveManager?.getData?.()?.selectedVehicle || 'C01';
    return this.getVehicle(selectedId) || VEHICLE_ROSTER[0];
  }

  getCustomization(id) {
    const spec = this.getVehicle(id) || VEHICLE_ROSTER[0];
    const saved = this.saveManager?.getData?.()?.customizations?.[spec.id];
    return {
      paint: saved?.paint || spec.defaultPaint,
      neon: saved?.neon || 'off',
      turboLv: Number.isFinite(saved?.turboLv) ? saved.turboLv : 0,
      handlingLv: Number.isFinite(saved?.handlingLv) ? saved.handlingLv : 0
    };
  }

  getEffectiveStats(id) {
    const spec = this.getVehicle(id);
    if (!spec) return null;
    const cfg = this.getCustomization(spec.id);
    const turboMult = 1 + cfg.turboLv * 0.08;
    const accelMult = 1 + cfg.turboLv * 0.10;
    const handlingMult = 1 + cfg.handlingLv * 0.06;
    return {
      id: spec.id,
      topSpeedKmh: Math.round(spec.topSpeedKmh * turboMult),
      maxMetersPerSec: Math.round((spec.topSpeedKmh * turboMult / 3.6) * 10) / 10,
      accel: Math.round(spec.accel * accelMult * 10) / 10,
      handling: Math.round(spec.handling * handlingMult * 100) / 100,
      turboLv: cfg.turboLv,
      neon: cfg.neon,
      paint: cfg.paint
    };
  }

  unlockVehicle(id, { free = false } = {}) {
    const spec = this.getVehicle(id);
    if (!spec) return { ok: false, reason: 'unknown-vehicle' };
    if (this.isUnlocked(id)) return { ok: true, alreadyUnlocked: true, vehicle: spec };

    if (!free && this.saveManager && spec.price > 0) {
      const paid = this.saveManager.spendCash(spec.price);
      if (!paid) return { ok: false, reason: 'insufficient-funds', price: spec.price };
    }

    this.saveManager?.unlockVehicle?.(id);
    this.eventBus?.emit?.('garage:vehicleUnlocked', { id, price: free ? 0 : spec.price });
    return { ok: true, alreadyUnlocked: false, vehicle: spec };
  }

  selectVehicle(id, { spawn = true } = {}) {
    const spec = this.getVehicle(id);
    if (!spec) return { ok: false, reason: 'unknown-vehicle' };
    if (!this.isUnlocked(id)) return { ok: false, reason: 'locked', price: spec.price };

    this.saveManager?.save?.({ selectedVehicle: id });
    const cfg = this.getCustomization(id);
    const stats = this.getEffectiveStats(id);
    this.onApplyVisuals?.(spec, cfg, stats);
    if (spawn) this.onSpawnVehicle?.(spec, cfg, stats);
    this.eventBus?.emit?.('garage:vehicleSelected', { id, customization: cfg, stats });
    return { ok: true, vehicle: spec, customization: cfg, stats };
  }

  setPaintColor(id, hex, { cost = 0 } = {}) {
    const spec = this.getVehicle(id);
    if (!spec) return { ok: false, reason: 'unknown-vehicle' };
    const cleanHex = String(hex || '').toLowerCase();
    if (!VALID_HEX_RE.test(cleanHex)) return { ok: false, reason: 'invalid-color' };
    if (cost > 0 && this.saveManager && !this.saveManager.spendCash(cost)) {
      return { ok: false, reason: 'insufficient-funds', price: cost };
    }

    const updated = this.saveManager?.setCustomization?.(id, { paint: cleanHex }) || { ...this.getCustomization(id), paint: cleanHex };
    const stats = this.getEffectiveStats(id);
    this.onApplyVisuals?.(spec, updated, stats);
    this.eventBus?.emit?.('vehicle:customize', { id, field: 'paint', value: cleanHex, customization: updated });
    return { ok: true, customization: updated, stats };
  }

  setNeonUnderglow(id, neonId, { cost = 0 } = {}) {
    const spec = this.getVehicle(id);
    if (!spec) return { ok: false, reason: 'unknown-vehicle' };
    const cleanNeon = String(neonId || 'off').toLowerCase();
    if (!VALID_NEON_SET.has(cleanNeon)) return { ok: false, reason: 'invalid-neon' };
    if (cost > 0 && this.saveManager && !this.saveManager.spendCash(cost)) {
      return { ok: false, reason: 'insufficient-funds', price: cost };
    }

    const updated = this.saveManager?.setCustomization?.(id, { neon: cleanNeon }) || { ...this.getCustomization(id), neon: cleanNeon };
    const stats = this.getEffectiveStats(id);
    this.onApplyVisuals?.(spec, updated, stats);
    this.eventBus?.emit?.('vehicle:customize', { id, field: 'neon', value: cleanNeon, customization: updated });
    return { ok: true, customization: updated, stats };
  }

  upgradeTurbo(id, targetLevel = null, { free = false } = {}) {
    const spec = this.getVehicle(id);
    if (!spec) return { ok: false, reason: 'unknown-vehicle' };
    const current = this.getCustomization(id);
    const nextLv = targetLevel === null ? current.turboLv + 1 : Math.floor(Number(targetLevel));
    if (!Number.isFinite(nextLv) || nextLv < 0 || nextLv > 3) {
      return { ok: false, reason: 'invalid-level' };
    }
    if (nextLv > current.turboLv && !free && this.saveManager) {
      const price = TURBO_UPGRADE_COSTS[nextLv] || 0;
      if (price > 0 && !this.saveManager.spendCash(price)) {
        return { ok: false, reason: 'insufficient-funds', price };
      }
    }

    const updated = this.saveManager?.setCustomization?.(id, { turboLv: nextLv }) || { ...current, turboLv: nextLv };
    const stats = this.getEffectiveStats(id);
    this.onApplyVisuals?.(spec, updated, stats);
    this.eventBus?.emit?.('vehicle:customize', { id, field: 'turboLv', value: nextLv, customization: updated });
    return { ok: true, customization: updated, stats };
  }

  spawnGoldenSupercar() {
    this.unlockVehicle('C11', { free: true });
    this.saveManager?.setCustomization?.('C11', {
      paint: '#ffd700',
      neon: 'gold',
      turboLv: 3
    });
    return this.selectVehicle('C11', { spawn: true });
  }
}
