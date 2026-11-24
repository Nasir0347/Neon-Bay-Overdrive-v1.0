/**
 * Canonical decoupled event identifiers spanning physics, missions, police,
 * audio, UI, persistence, state transitions, and V2.0 multiplayer hooks.
 */
export const EVENTS = Object.freeze({
  PHYSICS_TICK: 'physics:tick',
  PHYSICS_COLLISION: 'physics:collision',
  PHYSICS_DRIFT: 'physics:drift',
  PHYSICS_STUNT: 'physics:stunt',
  PHYSICS_FLIP_CAR: 'physics:flipCar',
  VEHICLE_ENTER: 'vehicle:enter',
  VEHICLE_EXIT: 'vehicle:exit',
  VEHICLE_DAMAGE: 'vehicle:damage',
  VEHICLE_CUSTOMIZE: 'vehicle:customize',
  MISSION_START: 'mission:start',
  MISSION_CHECKPOINT: 'mission:checkpoint',
  MISSION_COMPLETE: 'mission:complete',
  MISSION_FAIL: 'mission:fail',
  MISSION_RETRY: 'mission:retry',
  POLICE_WANTED_CHANGE: 'police:wantedChange',
  POLICE_LOS_CHANGE: 'police:losChange',
  POLICE_BUSTED: 'police:busted',
  POLICE_EVADED: 'police:evaded',
  AUDIO_MUTE_CHANGE: 'audio:muteChange',
  AUDIO_SFX: 'audio:sfx',
  AUDIO_RADIO_CHANGE: 'audio:radioChange',
  UI_TOAST: 'ui:toast',
  UI_SUBTITLE: 'ui:subtitle',
  UI_PHONE_ACTION: 'ui:phoneAction',
  UI_CHEAT_CODE: 'ui:cheatCode',
  SAVE_LOADED: 'save:loaded',
  SAVE_WRITTEN: 'save:written',
  SAVE_RECOVERED: 'save:recovered',
  SAVE_FALLBACK: 'save:fallback',
  STATE_CHANGE: 'state:change',
  STATE_REJECTED: 'state:rejected',
  V2_STATE_SYNC: 'v2:stateSync'
});

/**
 * Lightweight synchronous publish/subscribe event bus with safe unsubscribe,
 * re-entrant `once`, mid-emit mutation safety, and isolated error handling.
 */
export class EventBus {
  /**
   * @param {{ onError?: (error: unknown, event: string) => void }} [options]
   */
  constructor(options = {}) {
    this._listeners = new Map();
    this._onError = typeof options.onError === 'function' ? options.onError : null;
  }

  /**
   * Subscribe to an event and return a zero-arg unsubscribe helper.
   * @param {string} event
   * @param {(payload?: any) => void} handler
   * @param {object|null} [context]
   * @returns {() => void}
   */
  on(event, handler, context = null) {
    if (typeof event !== 'string' || !event) {
      throw new TypeError('EventBus.on: event must be a non-empty string');
    }
    if (typeof handler !== 'function') {
      throw new TypeError('EventBus.on: handler must be a function');
    }
    let bucket = this._listeners.get(event);
    if (!bucket) {
      bucket = [];
      this._listeners.set(event, bucket);
    }
    const entry = { handler, context, once: false, original: handler };
    bucket.push(entry);
    return () => this._removeEntry(event, entry);
  }

  /**
   * Subscribe for a single emission; removes the listener prior to invoking it.
   * @param {string} event
   * @param {(payload?: any) => void} handler
   * @param {object|null} [context]
   * @returns {() => void}
   */
  once(event, handler, context = null) {
    if (typeof event !== 'string' || !event) {
      throw new TypeError('EventBus.once: event must be a non-empty string');
    }
    if (typeof handler !== 'function') {
      throw new TypeError('EventBus.once: handler must be a function');
    }
    let bucket = this._listeners.get(event);
    if (!bucket) {
      bucket = [];
      this._listeners.set(event, bucket);
    }
    const entry = { handler, context, once: true, original: handler };
    bucket.push(entry);
    return () => this._removeEntry(event, entry);
  }

  /**
   * Remove a specific listener or all listeners for an event when handler is omitted.
   * @param {string} event
   * @param {Function} [handler]
   * @param {object|null} [context]
   */
  off(event, handler, context = undefined) {
    const bucket = this._listeners.get(event);
    if (!bucket) return;
    if (typeof handler !== 'function') {
      this._listeners.delete(event);
      return;
    }
    const kept = bucket.filter((entry) => {
      const sameFn = entry.original === handler || entry.handler === handler;
      const sameCtx = context === undefined || entry.context === context;
      return !(sameFn && sameCtx);
    });
    if (kept.length === 0) this._listeners.delete(event);
    else this._listeners.set(event, kept);
  }

  /**
   * Emit an event synchronously to a snapshot of current subscribers.
   * @param {string} event
   * @param {any} [payload]
   * @returns {number} Number of handlers invoked
   */
  emit(event, payload) {
    const bucket = this._listeners.get(event);
    if (!bucket || bucket.length === 0) return 0;

    const snapshot = bucket.slice();
    let invoked = 0;

    for (let i = 0; i < snapshot.length; i++) {
      const entry = snapshot[i];
      if (!this._hasEntry(event, entry)) continue;
      if (entry.once) this._removeEntry(event, entry);
      invoked++;
      try {
        entry.handler.call(entry.context, payload);
      } catch (error) {
        if (this._onError) this._onError(error, event);
        else console.error(`[EventBus] listener error on "${event}":`, error);
      }
    }
    return invoked;
  }

  /**
   * Remove listeners for one event or clear the entire bus.
   * @param {string} [event]
   */
  clear(event) {
    if (event === undefined) this._listeners.clear();
    else this._listeners.delete(event);
  }

  /**
   * Return listener count for a single event or total active subscriptions.
   * @param {string} [event]
   * @returns {number}
   */
  listenerCount(event) {
    if (event !== undefined) return this._listeners.get(event)?.length || 0;
    let total = 0;
    for (const bucket of this._listeners.values()) total += bucket.length;
    return total;
  }

  /** @returns {string[]} */
  eventNames() {
    return [...this._listeners.keys()];
  }

  _hasEntry(event, entry) {
    const bucket = this._listeners.get(event);
    return !!bucket && bucket.includes(entry);
  }

  _removeEntry(event, entry) {
    const bucket = this._listeners.get(event);
    if (!bucket) return;
    const idx = bucket.indexOf(entry);
    if (idx === -1) return;
    bucket.splice(idx, 1);
    if (bucket.length === 0) this._listeners.delete(event);
  }
}

export const eventBus = new EventBus();
export default eventBus;
