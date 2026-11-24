import { eventBus as defaultEventBus, EVENTS } from './EventBus.js';

export const STATES = Object.freeze({
  LOADING: 'LOADING',
  FREE_ROAM: 'FREE_ROAM',
  MISSION_ACTIVE: 'MISSION_ACTIVE',
  PAUSED: 'PAUSED',
  GARAGE: 'GARAGE',
  PHOTO_MODE: 'PHOTO_MODE'
});

const VALID_STATE_SET = new Set(Object.values(STATES));

/**
 * Allowed coarse transitions between top-level game states.
 * Contextual return guards are additionally enforced for PAUSED and PHOTO_MODE.
 */
export const VALID_TRANSITIONS = Object.freeze({
  [STATES.LOADING]: Object.freeze([STATES.FREE_ROAM]),
  [STATES.FREE_ROAM]: Object.freeze([
    STATES.MISSION_ACTIVE,
    STATES.PAUSED,
    STATES.GARAGE,
    STATES.PHOTO_MODE
  ]),
  [STATES.MISSION_ACTIVE]: Object.freeze([
    STATES.FREE_ROAM,
    STATES.PAUSED,
    STATES.PHOTO_MODE
  ]),
  [STATES.PAUSED]: Object.freeze([
    STATES.FREE_ROAM,
    STATES.MISSION_ACTIVE,
    STATES.GARAGE
  ]),
  [STATES.GARAGE]: Object.freeze([
    STATES.FREE_ROAM,
    STATES.PAUSED,
    STATES.PHOTO_MODE
  ]),
  [STATES.PHOTO_MODE]: Object.freeze([
    STATES.FREE_ROAM,
    STATES.MISSION_ACTIVE,
    STATES.GARAGE
  ])
});

/**
 * Finite state machine enforcing legal lifecycle transitions across
 * LOADING, FREE_ROAM, MISSION_ACTIVE, PAUSED, GARAGE, and PHOTO_MODE.
 */
export class GameState {
  /**
   * @param {{ initialState?: string, eventBus?: import('./EventBus.js').EventBus, strict?: boolean }} [options]
   */
  constructor(options = {}) {
    const initial = options.initialState || STATES.LOADING;
    if (!VALID_STATE_SET.has(initial)) {
      throw new RangeError(`GameState: invalid initial state "${initial}"`);
    }
    this.bus = options.eventBus || defaultEventBus;
    this.strict = !!options.strict;
    this._state = initial;
    this._previousState = null;
    this._returnState = null;
    this._history = [initial];
  }

  getState() {
    return this._state;
  }

  getPreviousState() {
    return this._previousState;
  }

  getReturnState() {
    return this._returnState;
  }

  getHistory() {
    return this._history.slice();
  }

  is(state) {
    return this._state === state;
  }

  /** True when active world simulation/driving is unpaused. */
  isGameplayRunning() {
    return (
      this._state === STATES.FREE_ROAM ||
      this._state === STATES.MISSION_ACTIVE
    );
  }

  /**
   * Check whether moving to `nextState` is valid right now.
   * @param {string} nextState
   * @returns {{ ok: boolean, reason: string|null }}
   */
  validateTransition(nextState) {
    if (!VALID_STATE_SET.has(nextState)) {
      return { ok: false, reason: 'unknown-state' };
    }
    if (nextState === this._state) {
      return { ok: false, reason: 'same-state' };
    }
    const allowed = VALID_TRANSITIONS[this._state];
    if (!allowed || !allowed.includes(nextState)) {
      return { ok: false, reason: 'disallowed-transition' };
    }

    // Contextual resume guard: resuming from PAUSED cannot invent GARAGE or MISSION_ACTIVE.
    if (this._state === STATES.PAUSED) {
      if (nextState === STATES.MISSION_ACTIVE && this._returnState !== STATES.MISSION_ACTIVE) {
        return { ok: false, reason: 'no-active-mission-to-resume' };
      }
      if (nextState === STATES.GARAGE && this._returnState !== STATES.GARAGE) {
        return { ok: false, reason: 'cannot-resume-into-garage' };
      }
    }

    // Contextual photo-exit guard: PHOTO_MODE must return strictly to where it opened from.
    if (this._state === STATES.PHOTO_MODE && this._returnState && nextState !== this._returnState) {
      return { ok: false, reason: `must-return-to-${this._returnState}` };
    }

    return { ok: true, reason: null };
  }

  canTransition(nextState) {
    return this.validateTransition(nextState).ok;
  }

  /**
   * Attempt a state transition; emits `state:change` on success or
   * `state:rejected` (or throws when `strict: true`) without mutating on failure.
   * @param {string} nextState
   * @param {Record<string, any>} [meta]
   * @returns {boolean}
   */
  transition(nextState, meta = {}) {
    const check = this.validateTransition(nextState);
    if (!check.ok) {
      this.bus.emit(EVENTS.STATE_REJECTED, {
        from: this._state,
        to: nextState,
        reason: check.reason,
        meta
      });
      if (this.strict || meta.strict) {
        throw new Error(`Invalid GameState transition ${this._state} -> ${nextState} (${check.reason})`);
      }
      return false;
    }

    const from = this._state;
    if (nextState === STATES.PAUSED || nextState === STATES.PHOTO_MODE) {
      this._returnState = from;
    } else if (from === STATES.PAUSED || from === STATES.PHOTO_MODE) {
      this._returnState = null;
    }

    this._previousState = from;
    this._state = nextState;
    this._history.push(nextState);
    this.bus.emit(EVENTS.STATE_CHANGE, { from, to: nextState, meta });
    return true;
  }

  pause(meta = {}) {
    return this.transition(STATES.PAUSED, meta);
  }

  resume(meta = {}) {
    if (this._state !== STATES.PAUSED) return false;
    const target = this._returnState || STATES.FREE_ROAM;
    return this.transition(target, meta);
  }

  enterPhotoMode(meta = {}) {
    return this.transition(STATES.PHOTO_MODE, meta);
  }

  exitPhotoMode(meta = {}) {
    if (this._state !== STATES.PHOTO_MODE) return false;
    const target = this._returnState || STATES.FREE_ROAM;
    return this.transition(target, meta);
  }

  reset(initialState = STATES.LOADING) {
    if (!VALID_STATE_SET.has(initialState)) {
      throw new RangeError(`GameState.reset: invalid state "${initialState}"`);
    }
    this._state = initialState;
    this._previousState = null;
    this._returnState = null;
    this._history = [initialState];
  }
}

export const gameState = new GameState();
export default gameState;
