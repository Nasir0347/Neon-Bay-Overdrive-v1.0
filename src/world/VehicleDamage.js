/**
 * Progressive Vehicle Damage Controller:
 * clean (HP > 65) -> white_smoke (36..65) -> black_smoke (16..35)
 * -> fire (1..15 with 5s eject/fail countdown) -> destroyed (<= 0 or countdown elapsed).
 * Pure ES Module with zero static imports.
 */

export const DAMAGE_STATES = {
  CLEAN: 'clean',
  WHITE_SMOKE: 'white_smoke',
  BLACK_SMOKE: 'black_smoke',
  FIRE: 'fire',
  DESTROYED: 'destroyed'
};

export const FIRE_EJECT_DURATION = 5.0;

export function classifyDamageState(hp) {
  const val = Number.isFinite(Number(hp)) ? Number(hp) : 100;
  if (val > 65) return DAMAGE_STATES.CLEAN;
  if (val > 35) return DAMAGE_STATES.WHITE_SMOKE;
  if (val > 15) return DAMAGE_STATES.BLACK_SMOKE;
  if (val > 0) return DAMAGE_STATES.FIRE;
  return DAMAGE_STATES.DESTROYED;
}

export class VehicleDamageController {
  constructor({ eventBus = null, ejectDuration = FIRE_EJECT_DURATION } = {}) {
    this.eventBus = eventBus || null;
    this.ejectDuration = Number.isFinite(ejectDuration) && ejectDuration > 0 ? ejectDuration : FIRE_EJECT_DURATION;
  }

  applyDamage(vehicle, amount) {
    if (!vehicle) return DAMAGE_STATES.CLEAN;
    const prevHp = Number.isFinite(vehicle.hp) ? vehicle.hp : 100;
    const prevState = vehicle.damageState || classifyDamageState(prevHp);
    const dmg = Math.max(0, Number(amount) || 0);
    const nextHp = Math.max(0, prevHp - dmg);
    vehicle.hp = nextHp;

    const nextState = classifyDamageState(nextHp);
    vehicle.damageState = nextState;

    if (nextState === DAMAGE_STATES.FIRE && prevState !== DAMAGE_STATES.FIRE && !vehicle.wrecked) {
      vehicle.fireCountdown = this.ejectDuration;
    } else if (nextState === DAMAGE_STATES.DESTROYED) {
      vehicle.fireCountdown = 0;
      vehicle.wrecked = true;
    }

    if (prevState !== nextState) {
      this.eventBus?.emit?.('vehicle:damageStage', {
        prevState,
        state: nextState,
        hp: nextHp
      });
    }
    return nextState;
  }

  update(vehicle, dt = 0.016, { inCar = false, onEjectFail = null } = {}) {
    if (!vehicle) {
      return {
        state: DAMAGE_STATES.CLEAN,
        countdown: 0,
        exploded: false,
        smokeKind: null,
        warningText: ''
      };
    }

    const hp = Number.isFinite(vehicle.hp) ? vehicle.hp : 100;
    const prevState = vehicle.damageState || classifyDamageState(hp);
    const state = classifyDamageState(hp);

    if (hp > 65) {
      vehicle.fireCountdown = 0;
      vehicle.wrecked = false;
    } else if (state === DAMAGE_STATES.FIRE && (!Number.isFinite(vehicle.fireCountdown) || (prevState !== DAMAGE_STATES.FIRE && vehicle.fireCountdown <= 0))) {
      vehicle.fireCountdown = this.ejectDuration;
    }

    vehicle.damageState = state;
    if (state !== prevState) {
      this.eventBus?.emit?.('vehicle:damageStage', { prevState, state, hp });
    }

    let exploded = false;
    let countdown = Number(vehicle.fireCountdown) || 0;
    const stepDt = Math.max(0, Math.min(0.25, Number(dt) || 0));

    if (state === DAMAGE_STATES.FIRE && !vehicle.wrecked) {
      countdown = Math.max(0, countdown - stepDt);
      vehicle.fireCountdown = countdown;
      if (countdown <= 0) {
        vehicle.hp = 0;
        vehicle.damageState = DAMAGE_STATES.DESTROYED;
        vehicle.wrecked = true;
        exploded = true;
        this.eventBus?.emit?.('vehicle:destroyed', { vehicle, inCar });
        onEjectFail?.(vehicle);
      }
    } else if (state === DAMAGE_STATES.DESTROYED && !vehicle.wrecked) {
      vehicle.wrecked = true;
      vehicle.fireCountdown = 0;
      exploded = true;
      this.eventBus?.emit?.('vehicle:destroyed', { vehicle, inCar });
      onEjectFail?.(vehicle);
    }

    const finalState = vehicle.damageState;
    const smokeKind = finalState === DAMAGE_STATES.WHITE_SMOKE
      ? 'white'
      : finalState === DAMAGE_STATES.BLACK_SMOKE
        ? 'black'
        : (finalState === DAMAGE_STATES.FIRE || finalState === DAMAGE_STATES.DESTROYED)
          ? 'fire'
          : null;

    const warningText = finalState === DAMAGE_STATES.FIRE
      ? `ENGINE ON FIRE! EJECT IN ${Math.max(1, Math.ceil(countdown))}s`
      : '';

    return {
      state: finalState,
      countdown: finalState === DAMAGE_STATES.FIRE ? countdown : 0,
      exploded,
      smokeKind,
      warningText
    };
  }

  repair(vehicle) {
    if (!vehicle) return;
    vehicle.hp = 100;
    vehicle.damageState = DAMAGE_STATES.CLEAN;
    vehicle.fireCountdown = 0;
    vehicle.wrecked = false;
  }
}
