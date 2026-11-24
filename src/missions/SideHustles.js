/**
 * Free-Roam Side Hustles & 3 Hidden Easter Eggs for Neon Bay: Overdrive.
 * Includes:
 * - 3 Hidden Easter Eggs: Midnight Ghost Racer, Hidden Tunnel Vault, Rooftop Stunt
 * - Side Hustles: VIP Taxi / Escape Uber, Police Vigilante Mode (C12), 30-Min VIP Test-Drive
 * Pure zero-import ES Module.
 */

export const SIDE_HUSTLE_TYPES = Object.freeze({
  IDLE: 'IDLE',
  VIP_TAXI: 'VIP_TAXI',
  POLICE_VIGILANTE: 'POLICE_VIGILANTE'
});

export const VIP_TEST_DRIVE_CONFIG = Object.freeze({
  vehicleId: 'C11',
  durationSec: 120,
  cooldownSec: 1800
});

export const EASTER_EGGS = Object.freeze([
  Object.freeze({
    id: 'EGG_GHOST_RACER',
    name: 'Midnight Ghost Racer',
    description: 'Honk near Skyline Highway (600, 0) at night to race & unlock Phantom Neon-Z (B04)!',
    triggerCoord: Object.freeze({ x: 600, z: 0, radius: 28 }),
    finishCoord: Object.freeze({ x: 600, z: 600, radius: 20 }),
    unlockVehicleId: 'B04',
    rewardCash: 5000,
    ghostSpeed: 22
  }),
  Object.freeze({
    id: 'EGG_TUNNEL_VAULT',
    name: 'Hidden Tunnel Vault',
    description: 'Smash the cracked secret tunnel bulkhead at Iron Docks (-900, -300) for stashed cash!',
    triggerCoord: Object.freeze({ x: -900, z: -300, radius: 16 }),
    minRamSpeed: 12,
    rewardCash: 4000
  }),
  Object.freeze({
    id: 'EGG_ROOFTOP_STUNT',
    name: 'Marina Rooftop Secret Stunt',
    description: 'Launch 4.5m+ high off the Marina Coastal Ramp (120, -860) for a hidden stunt bounty!',
    triggerCoord: Object.freeze({ x: 120, z: -860, radius: 18 }),
    minJumpHeightM: 4.5,
    rewardCash: 3000
  })
]);

export const VIP_TAXI_STOPS = Object.freeze([
  Object.freeze({ id: 'tx_apex', label: 'Apex Core Tower', x: 0, z: 0, radius: 15 }),
  Object.freeze({ id: 'tx_sunset', label: 'Sunset Strip Club', x: -300, z: -600, radius: 15 }),
  Object.freeze({ id: 'tx_pier', label: 'Marina Pier 99', x: 0, z: -910, radius: 16 }),
  Object.freeze({ id: 'tx_bayview', label: 'Bayview Hotel', x: 300, z: 600, radius: 15 }),
  Object.freeze({ id: 'tx_docks', label: 'Iron Docks Terminal', x: -600, z: 0, radius: 15 }),
  Object.freeze({ id: 'tx_airport', label: 'Neon Bay Airport Terminal', x: 750, z: -260, radius: 16 })
]);

export function validateEasterEggSchema(egg) {
  const errors = [];
  if (!egg || typeof egg !== 'object') return { valid: false, errors: ['Easter egg must be object'] };
  if (typeof egg.id !== 'string' || !egg.id.startsWith('EGG_')) errors.push(`Invalid egg id: ${egg.id}`);
  if (typeof egg.name !== 'string' || !egg.name.trim()) errors.push(`Missing egg name: ${egg.id}`);
  if (!egg.triggerCoord || !Number.isFinite(egg.triggerCoord.x) || !Number.isFinite(egg.triggerCoord.z)) {
    errors.push(`Invalid triggerCoord for ${egg.id}`);
  }
  if (!Number.isFinite(egg.rewardCash) || egg.rewardCash <= 0) errors.push(`Invalid rewardCash for ${egg.id}`);
  return { valid: errors.length === 0, errors };
}

function dist2D(a, b) {
  if (!a || !b) return Infinity;
  return Math.hypot((a.x || 0) - (b.x || 0), (a.z || 0) - (b.z || 0));
}

export class SideHustleManager {
  constructor({ saveManager = null, eventBus = null, dailyManager = null, callbacks = {} } = {}) {
    this.saveManager = saveManager || null;
    this.eventBus = eventBus || null;
    this.dailyManager = dailyManager || null;
    this.callbacks = callbacks || {};

    this.activeType = SIDE_HUSTLE_TYPES.IDLE;
    this.taxiState = null;
    this.vigilanteState = null;
    this.ghostDuel = null;
    this.vipTestDrive = { active: false, remainingSec: 0, lastTriggeredAtMs: -9999999 };
  }

  getDiscoveredSecrets() {
    return [...(this.saveManager?.getData?.()?.retention?.discoveredSecrets || [])];
  }

  startVipTaxi(startIdx = 0) {
    const pickupIdx = Math.abs(Math.floor(startIdx)) % VIP_TAXI_STOPS.length;
    const dropoffIdx = (pickupIdx + 2) % VIP_TAXI_STOPS.length;
    this.activeType = SIDE_HUSTLE_TYPES.VIP_TAXI;
    this.vigilanteState = null;
    this.taxiState = {
      phase: 'pickup',
      pickup: VIP_TAXI_STOPS[pickupIdx],
      dropoff: VIP_TAXI_STOPS[dropoffIdx],
      baseFare: 650,
      tipBonus: 350,
      crashed: false,
      faresCompleted: 0,
      fareIndex: pickupIdx
    };
    this.eventBus?.emit?.('hustle:taxiStart', { pickup: this.taxiState.pickup });
    this.callbacks.onHustleToast?.(`VIP TAXI: Pick up client at ${this.taxiState.pickup.label}`);
    return { ok: true, activeType: this.activeType, taxiState: { ...this.taxiState } };
  }

  startVigilante() {
    this.activeType = SIDE_HUSTLE_TYPES.POLICE_VIGILANTE;
    this.taxiState = null;
    this.vigilanteState = {
      wave: 1,
      suspectHp: 100,
      suspectMaxHp: 100,
      suspectPos: { x: 0, z: 120, yaw: 0 },
      suspectSpeed: 14,
      ramCooldown: 0,
      takedowns: 0
    };
    this.callbacks.onAssignVigilanteCruiser?.('C12');
    this.callbacks.onHustleToast?.('POLICE VIGILANTE (C12): Ram the fleeing suspect off the road!');
    this.eventBus?.emit?.('hustle:vigilanteStart', { wave: 1, vehicleId: 'C12' });
    return { ok: true, activeType: this.activeType, vigilanteState: { ...this.vigilanteState } };
  }

  startVipTestDrive(nowMs = Date.now()) {
    const elapsedSince = (nowMs - this.vipTestDrive.lastTriggeredAtMs) / 1000;
    if (this.vipTestDrive.active) return { ok: false, reason: 'already-active' };
    if (elapsedSince < VIP_TEST_DRIVE_CONFIG.cooldownSec && this.vipTestDrive.lastTriggeredAtMs > 0) {
      return { ok: false, reason: 'cooldown', cooldownLeftSec: Math.ceil(VIP_TEST_DRIVE_CONFIG.cooldownSec - elapsedSince) };
    }
    this.vipTestDrive = {
      active: true,
      remainingSec: VIP_TEST_DRIVE_CONFIG.durationSec,
      lastTriggeredAtMs: nowMs
    };
    this.callbacks.onVipTestDriveStart?.(VIP_TEST_DRIVE_CONFIG.vehicleId, VIP_TEST_DRIVE_CONFIG.durationSec);
    this.eventBus?.emit?.('hustle:vipTestDriveStart', { ...VIP_TEST_DRIVE_CONFIG });
    return { ok: true, vehicleId: VIP_TEST_DRIVE_CONFIG.vehicleId, durationSec: VIP_TEST_DRIVE_CONFIG.durationSec };
  }

  stopHustle() {
    this.activeType = SIDE_HUSTLE_TYPES.IDLE;
    this.taxiState = null;
    this.vigilanteState = null;
    this.ghostDuel = null;
    return { ok: true };
  }

  _unlockSecret(egg, extraVehicleId = null) {
    const discovered = new Set(this.getDiscoveredSecrets());
    const firstTime = !discovered.has(egg.id);
    if (extraVehicleId) this.saveManager?.unlockVehicle?.(extraVehicleId);
    this.saveManager?.recordSecretDiscovered?.(egg.id, egg.rewardCash);
    this.eventBus?.emit?.('hustle:secretDiscovered', {
      secretId: egg.id,
      name: egg.name,
      rewardCash: firstTime ? egg.rewardCash : 0,
      unlockedVehicleId: extraVehicleId
    });
    if (firstTime) {
      this.callbacks.onHustleToast?.(`SECRET FOUND: ${egg.name} (+Rs ${egg.rewardCash})!`);
    }
    return { secretId: egg.id, firstTime, rewardCash: firstTime ? egg.rewardCash : 0, unlockedVehicleId: extraVehicleId };
  }

  update(dt, ctx = {}) {
    const step = Math.max(0, Math.min(0.25, Number(dt) || 0));
    const p = ctx.player || { x: 0, z: 0 };
    const vel = Number(ctx.velocity || 0);
    const events = [];

    // VIP Test Drive Countdown
    if (this.vipTestDrive.active) {
      this.vipTestDrive.remainingSec = Math.max(0, this.vipTestDrive.remainingSec - step);
      if (this.vipTestDrive.remainingSec <= 0) {
        this.vipTestDrive.active = false;
        this.callbacks.onVipTestDriveEnd?.();
      }
    }

    // ── Hidden Easter Eggs (active cleanly in Free Roam) ───────────────────────
    const discovered = new Set(this.getDiscoveredSecrets());

    // Egg 1: Midnight Ghost Racer (night + horn near 165, 0 -> race to 165, 330 -> unlock B04)
    const ghostEgg = EASTER_EGGS[0];
    if (!this.ghostDuel?.active && !discovered.has(ghostEgg.id)) {
      if (ctx.isNight && ctx.honked && dist2D(p, ghostEgg.triggerCoord) <= ghostEgg.triggerCoord.radius) {
        this.ghostDuel = {
          active: true,
          ghostPos: { x: 165, z: 20, yaw: 0 },
          finished: false
        };
        this.callbacks.onHustleToast?.('MIDNIGHT GHOST RACER CHALLENGED! First to Skyline North (165, 330) wins B04!');
      }
    } else if (this.ghostDuel?.active) {
      this.ghostDuel.ghostPos.z += ghostEgg.ghostSpeed * step;
      if (dist2D(p, ghostEgg.finishCoord) <= ghostEgg.finishCoord.radius) {
        this.ghostDuel.active = false;
        events.push(this._unlockSecret(ghostEgg, ghostEgg.unlockVehicleId));
      } else if (this.ghostDuel.ghostPos.z >= ghostEgg.finishCoord.z) {
        this.ghostDuel.active = false;
        this.callbacks.onHustleToast?.('Ghost Racer vanished into the night! Honk at (165, 0) to rematch.');
      }
    }

    // Egg 2: Hidden Tunnel Vault
    const vaultEgg = EASTER_EGGS[1];
    if (!discovered.has(vaultEgg.id) && dist2D(p, vaultEgg.triggerCoord) <= vaultEgg.triggerCoord.radius && Math.abs(vel) >= vaultEgg.minRamSpeed) {
      events.push(this._unlockSecret(vaultEgg));
    }

    // Egg 3: Rooftop Stunt
    const roofEgg = EASTER_EGGS[2];
    if (!discovered.has(roofEgg.id) && dist2D(p, roofEgg.triggerCoord) <= roofEgg.triggerCoord.radius && Number(ctx.jumpY || 0) >= roofEgg.minJumpHeightM) {
      events.push(this._unlockSecret(roofEgg));
    }

    // ── VIP Taxi Side Hustle ─────────────────────────────────────────────────
    if (this.activeType === SIDE_HUSTLE_TYPES.VIP_TAXI && this.taxiState) {
      const tx = this.taxiState;
      if (ctx.collided && tx.phase === 'dropoff') {
        tx.crashed = true;
      }
      if (tx.phase === 'pickup' && dist2D(p, tx.pickup) <= tx.pickup.radius) {
        tx.phase = 'dropoff';
        this.callbacks.onHustleToast?.(`VIP Aboard! Deliver safely to ${tx.dropoff.label}`);
      } else if (tx.phase === 'dropoff' && dist2D(p, tx.dropoff) <= tx.dropoff.radius) {
        const pay = tx.baseFare + (tx.crashed ? 0 : tx.tipBonus);
        tx.faresCompleted += 1;
        this.saveManager?.recordHustleComplete?.(pay);
        this.dailyManager?.recordProgress?.('vip_taxi_fares', 1);
        this.eventBus?.emit?.('hustle:taxiComplete', { fare: pay, tipped: !tx.crashed, total: tx.faresCompleted });
        this.callbacks.onHustleToast?.(`VIP DROPOFF COMPLETE: +Rs ${pay}${tx.crashed ? '' : ' (Zero-Scratch Tip!)'}`);
        events.push({ type: 'vip_taxi_complete', fare: pay });

        // Queue next fare seamlessly
        tx.fareIndex = (tx.fareIndex + 1) % VIP_TAXI_STOPS.length;
        tx.phase = 'pickup';
        tx.crashed = false;
        tx.pickup = VIP_TAXI_STOPS[tx.fareIndex];
        tx.dropoff = VIP_TAXI_STOPS[(tx.fareIndex + 2) % VIP_TAXI_STOPS.length];
      }
    }

    // ── Police Vigilante Mode (C12) ──────────────────────────────────────────
    if (this.activeType === SIDE_HUSTLE_TYPES.POLICE_VIGILANTE && this.vigilanteState) {
      const vg = this.vigilanteState;
      vg.ramCooldown = Math.max(0, vg.ramCooldown - step);
      vg.suspectPos.z += vg.suspectSpeed * step;
      if (vg.suspectPos.z > 300) vg.suspectPos.z = -280;

      if (dist2D(p, vg.suspectPos) <= 8.5 && Math.abs(vel) >= 6 && vg.ramCooldown <= 0) {
        vg.ramCooldown = 0.6;
        vg.suspectHp = Math.max(0, vg.suspectHp - 50);
        if (vg.suspectHp <= 0) {
          const bounty = 800 * vg.wave;
          vg.takedowns += 1;
          vg.wave += 1;
          vg.suspectHp = vg.suspectMaxHp;
          vg.suspectPos = { x: (vg.wave % 2 === 0 ? 165 : -165), z: -120, yaw: 0 };
          this.saveManager?.recordHustleComplete?.(bounty);
          this.dailyManager?.recordProgress?.('vigilante_takedowns', 1);
          this.eventBus?.emit?.('hustle:vigilanteTakedown', { wave: vg.wave - 1, bounty, totalTakedowns: vg.takedowns });
          this.callbacks.onHustleToast?.(`SUSPECT NEUTRALIZED! +Rs ${bounty} · Wave ${vg.wave} Active!`);
          events.push({ type: 'vigilante_takedown', bounty, wave: vg.wave - 1 });
        }
      }
    }

    return {
      activeType: this.activeType,
      vipTestDriveActive: this.vipTestDrive.active,
      events
    };
  }

  getActiveTarget() {
    if (this.ghostDuel?.active) {
      return { ...EASTER_EGGS[0].finishCoord, label: 'Midnight Ghost Finish', color: '#00f0ff' };
    }
    if (this.activeType === SIDE_HUSTLE_TYPES.VIP_TAXI && this.taxiState) {
      const pt = this.taxiState.phase === 'pickup' ? this.taxiState.pickup : this.taxiState.dropoff;
      return { ...pt, color: this.taxiState.phase === 'pickup' ? '#ffd700' : '#38f288' };
    }
    if (this.activeType === SIDE_HUSTLE_TYPES.POLICE_VIGILANTE && this.vigilanteState) {
      return {
        id: 'vigilante_suspect',
        label: `Suspect Wave ${this.vigilanteState.wave}`,
        x: this.vigilanteState.suspectPos.x,
        z: this.vigilanteState.suspectPos.z,
        radius: 10,
        color: '#ff2a2a'
      };
    }
    return null;
  }
}
