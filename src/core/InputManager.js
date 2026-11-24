import { eventBus as defaultEventBus, EVENTS } from './EventBus.js';

export const DEFAULT_DEADZONE = 0.15;

export const INPUT_SOURCES = Object.freeze({
  KEYBOARD: 'keyboard',
  TOUCH: 'touch',
  GAMEPAD: 'gamepad'
});

const clamp01 = (v) => Math.max(0, Math.min(1, Number(v) || 0));
const clampSigned = (v) => Math.max(-1, Math.min(1, Number(v) || 0));

/** Rescale an analog axis outside `deadzone` smoothly onto [-1..1]. */
export function applyDeadzone(raw, deadzone = DEFAULT_DEADZONE) {
  const n = Number(raw) || 0;
  const abs = Math.abs(n);
  if (abs <= deadzone) return 0;
  return clampSigned(Math.sign(n) * ((abs - deadzone) / (1 - deadzone)));
}

/**
 * Unified Keyboard, Mobile Multi-Touch (with iOS Safari pinch-zoom lock),
 * Gamepad API input manager, plus 1-tap iOS AudioContext resume helper.
 */
export class InputManager {
  /**
   * @param {{ deadzone?: number, eventBus?: import('./EventBus.js').EventBus }} [options]
   */
  constructor(options = {}) {
    this.deadzone = clamp01(options.deadzone ?? DEFAULT_DEADZONE);
    this.bus = options.eventBus || defaultEventBus;

    this._keys = new Set();
    this._touchPointers = new Map();
    this._touchAnalog = { steering: 0, throttle: 0 };
    this._gamepadState = {
      steering: 0,
      throttle: 0,
      reverse: 0,
      brake: 0,
      handbrake: false,
      nitro: false,
      flipHeld: false,
      cameraHeld: false,
      horn: false,
      lightsHeld: false,
      pauseHeld: false,
      connected: false
    };

    this._flipQueued = false;
    this._activeSource = INPUT_SOURCES.KEYBOARD;
    this._cleanups = [];
  }

  /** Attach keyboard listeners to `target` (typically `window`). */
  attachKeyboard(target = globalThis.window) {
    if (!target || typeof target.addEventListener !== 'function') return () => {};

    const onKeyDown = (e) => {
      if (e.target?.matches?.('input,select,textarea')) return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault?.();
      }
      const wasDown = this._keys.has(e.code);
      this._keys.add(e.code);
      this._activeSource = INPUT_SOURCES.KEYBOARD;
      if (!wasDown && !e.repeat && e.code === 'KeyR') {
        this._queueFlip(INPUT_SOURCES.KEYBOARD);
      }
    };

    const onKeyUp = (e) => {
      this._keys.delete(e.code);
    };

    const onBlur = () => {
      this._keys.clear();
    };

    target.addEventListener('keydown', onKeyDown);
    target.addEventListener('keyup', onKeyUp);
    target.addEventListener('blur', onBlur);

    const detach = () => {
      target.removeEventListener('keydown', onKeyDown);
      target.removeEventListener('keyup', onKeyUp);
      target.removeEventListener('blur', onBlur);
    };
    this._cleanups.push(detach);
    return detach;
  }

  /**
   * Enforce `touch-action: none` + bind multi-touch buttons (`data-action` -> action).
   * Supported actions: steerLeft, steerRight, throttle, reverse, brake, nitro, flip, horn, lights, camera.
   */
  attachTouch(container, actionSelector = '[data-action]') {
    if (!container || typeof container.addEventListener !== 'function') return () => {};

    if (container.style) {
      container.style.touchAction = 'none';
      container.style.userSelect = 'none';
      container.style.webkitUserSelect = 'none';
    }

    const unbinds = [];
    const buttons = container.querySelectorAll ? [...container.querySelectorAll(actionSelector)] : [];
    for (const btn of buttons) {
      if (btn.style) {
        btn.style.touchAction = 'none';
        btn.style.userSelect = 'none';
        btn.style.webkitUserSelect = 'none';
      }
      const action = btn.dataset?.action;
      if (!action) continue;

      const onDown = (e) => {
        e.preventDefault?.();
        this.setTouchPointer(e.pointerId ?? 1, action, true);
      };
      const onUp = (e) => {
        e.preventDefault?.();
        this.setTouchPointer(e.pointerId ?? 1, action, false);
      };
      btn.addEventListener('pointerdown', onDown);
      btn.addEventListener('pointerup', onUp);
      btn.addEventListener('pointercancel', onUp);
      btn.addEventListener('lostpointercapture', onUp);
      unbinds.push(() => {
        btn.removeEventListener('pointerdown', onDown);
        btn.removeEventListener('pointerup', onUp);
        btn.removeEventListener('pointercancel', onUp);
        btn.removeEventListener('lostpointercapture', onUp);
      });
    }

    const detach = () => unbinds.forEach((fn) => fn());
    this._cleanups.push(detach);
    return detach;
  }

  /** Record a simulated or live multi-touch pointer action cleanly. */
  setTouchPointer(pointerId, action, pressed) {
    if (pressed) {
      const hadAction = this._touchHasAction(action);
      this._touchPointers.set(pointerId, action);
      this._activeSource = INPUT_SOURCES.TOUCH;
      if (action === 'flip' && !hadAction) {
        this._queueFlip(INPUT_SOURCES.TOUCH);
      }
      return;
    }
    if (this._touchPointers.has(pointerId)) {
      this._touchPointers.delete(pointerId);
    }
  }

  /** Set analog virtual joystick axes for touch mode (`steering` in [-1..1], `throttle` in [-1..1]). */
  setTouchAnalog(steering = 0, throttle = 0) {
    this._touchAnalog.steering = clampSigned(steering);
    this._touchAnalog.throttle = clampSigned(throttle);
    if (Math.abs(steering) > 0.01 || Math.abs(throttle) > 0.01) {
      this._activeSource = INPUT_SOURCES.TOUCH;
    }
  }

  /** Lock iOS Safari pinch-zoom gestures (`gesture*` and multi-finger `touchmove`). */
  attachPinchZoomLock(target = globalThis.document) {
    if (!target || typeof target.addEventListener !== 'function') return () => {};

    const prevent = (e) => {
      e.preventDefault?.();
    };
    const onTouchMove = (e) => {
      if ((e.touches?.length || 0) > 1 || (typeof e.scale === 'number' && e.scale !== 1)) {
        e.preventDefault?.();
      }
    };

    target.addEventListener('gesturestart', prevent, { passive: false });
    target.addEventListener('gesturechange', prevent, { passive: false });
    target.addEventListener('gestureend', prevent, { passive: false });
    target.addEventListener('touchmove', onTouchMove, { passive: false });

    const detach = () => {
      target.removeEventListener('gesturestart', prevent);
      target.removeEventListener('gesturechange', prevent);
      target.removeEventListener('gestureend', prevent);
      target.removeEventListener('touchmove', onTouchMove);
    };
    this._cleanups.push(detach);
    return detach;
  }

  /**
   * Poll standard Xbox/PlayStation Gamepad axes & triggers (`axes[0]`, RT `buttons[7]`,
   * LT `buttons[6]`, B/X brake `buttons[1]/[2]`, LB/RB nitro `buttons[4]/[5]`, Y flip `buttons[3]`).
   */
  pollGamepad(pads = null) {
    const list =
      pads ||
      (typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function'
        ? navigator.getGamepads()
        : null);

    let pad = null;
    if (list) {
      for (let i = 0; i < list.length; i++) {
        if (list[i] && list[i].connected !== false) {
          pad = list[i];
          break;
        }
      }
    }

    const gp = this._gamepadState;
    if (!pad) {
      gp.connected = false;
      gp.steering = 0;
      gp.throttle = 0;
      gp.reverse = 0;
      gp.brake = 0;
      gp.handbrake = false;
      gp.nitro = false;
      gp.horn = false;
      gp.flipHeld = false;
      gp.cameraHeld = gp.pauseHeld = gp.lightsHeld = false;
      return gp;
    }

    const btnVal = (idx) => {
      const b = pad.buttons?.[idx];
      if (!b) return 0;
      return typeof b === 'number' ? clamp01(b) : clamp01(b.value ?? (b.pressed ? 1 : 0));
    };
    const btnPressed = (idx) => {
      const b = pad.buttons?.[idx];
      return !!(b && (b.pressed || (b.value ?? 0) > 0.5));
    };

    const stickX = applyDeadzone(pad.axes?.[0] ?? 0, this.deadzone);
    const dpadX = (btnPressed(15) ? 1 : 0) - (btnPressed(14) ? 1 : 0);
    gp.steering = stickX !== 0 ? stickX : dpadX;
    gp.throttle = Math.max(btnVal(7), btnPressed(0) ? 1 : 0);
    gp.reverse = btnVal(6);
    const brk = Math.max(btnPressed(1) ? 1 : 0, btnPressed(2) ? 1 : 0);
    gp.brake = brk;
    gp.handbrake = brk > 0.5;
    gp.nitro = btnPressed(4) || btnPressed(5);
    gp.cameraHeld = btnPressed(9);
    gp.pauseHeld = btnPressed(8);
    gp.lightsHeld = btnPressed(11);
    gp.horn = btnPressed(10); // L3 horn

    const flipNow = btnPressed(3); // Y / Triangle
    if (flipNow && !gp.flipHeld) this._queueFlip(INPUT_SOURCES.GAMEPAD);
    gp.flipHeld = flipNow;

    gp.connected = true;
    const anyActive =
      Math.abs(gp.steering) > 0 ||
      gp.throttle > 0.02 ||
      gp.reverse > 0.02 ||
      gp.brake > 0 ||
      gp.nitro ||
      flipNow;
    if (anyActive) this._activeSource = INPUT_SOURCES.GAMEPAD;
    return gp;
  }

  /**
   * 1-tap `AudioContext.resume()` unlock listener for iOS Safari & Chrome autoplay gates.
   * Automatically removes listeners once `audioContext.state === 'running'`.
   */
  bindAudioUnlock(getAudioContext, onUnlock = null, target = globalThis.window) {
    if (!target || typeof target.addEventListener !== 'function') return () => {};

    let disposed = false;
    const events = ['pointerdown', 'touchstart', 'keydown'];

    const removeListeners = () => {
      if (disposed) return;
      disposed = true;
      for (const ev of events) {
        target.removeEventListener(ev, unlockHandler, true);
      }
    };

    const unlockHandler = () => {
      const ctx = typeof getAudioContext === 'function' ? getAudioContext() : null;
      if (!ctx) return;

      const finishIfRunning = () => {
        if (ctx.state === 'running') {
          removeListeners();
          onUnlock?.(ctx);
        }
      };

      if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
        Promise.resolve(ctx.resume()).then(finishIfRunning).catch(() => {});
      } else {
        finishIfRunning();
      }
    };

    for (const ev of events) {
      target.addEventListener(ev, unlockHandler, { capture: true, passive: true });
    }
    this._cleanups.push(removeListeners);
    return removeListeners;
  }

  /** Poll optional gamepad list and return unified normalized control state. */
  getState(pads = null) {
    const gp = this.pollGamepad(pads);

    // Keyboard normalized axes
    const kLeft = this._keys.has('KeyA') || this._keys.has('ArrowLeft') ? 1 : 0;
    const kRight = this._keys.has('KeyD') || this._keys.has('ArrowRight') ? 1 : 0;
    const kbSteer = kRight - kLeft;
    const kbThrottle = this._keys.has('KeyW') || this._keys.has('ArrowUp') ? 1 : 0;
    const kbReverse = this._keys.has('KeyS') || this._keys.has('ArrowDown') ? 1 : 0;
    const kbBrake = this._keys.has('Space') ? 1 : 0;
    const kbNitro =
      this._keys.has('ShiftLeft') || this._keys.has('ShiftRight') || this._keys.has('KeyX');

    // Touch normalized axes (buttons + optional analog stick)
    const tSteerBtn =
      (this._touchHasAction('steerRight') ? 1 : 0) -
      (this._touchHasAction('steerLeft') ? 1 : 0);
    const tSteer = tSteerBtn !== 0 ? tSteerBtn : this._touchAnalog.steering;
    const tThrottle = this._touchHasAction('throttle')
      ? 1
      : Math.max(0, this._touchAnalog.throttle);
    const tReverse = this._touchHasAction('reverse')
      ? 1
      : Math.max(0, -this._touchAnalog.throttle);
    const tBrake = this._touchHasAction('brake') ? 1 : 0;
    const tHandbrake = this._touchHasAction('handbrake');
    const tNitro = this._touchHasAction('nitro');

    const steering =
      tSteer !== 0 ? tSteer : Math.abs(gp.steering) > 0 ? gp.steering : kbSteer;
    const throttle = clamp01(Math.max(kbThrottle, tThrottle, gp.throttle));
    const reverse = clamp01(Math.max(kbReverse, tReverse, gp.reverse));
    const brake = clamp01(Math.max(kbBrake, tBrake, gp.brake));

    return {
      steering: clampSigned(steering),
      throttle,
      reverse,
      brake,
      handbrake: !!(brake > 0.5 || tHandbrake || gp.handbrake),
      nitro: !!(kbNitro || tNitro || gp.nitro),
      flip: this._flipQueued,
      camera: this._keys.has('KeyC') || this._touchHasAction('camera') || gp.cameraHeld,
      horn: this._keys.has('KeyH') || this._keys.has('KeyV') || this._touchHasAction('horn') || gp.horn,
      lights: this._keys.has('KeyN') || this._touchHasAction('lights') || gp.lightsHeld,
      pause: this._keys.has('Escape') || gp.pauseHeld,
      activeSource: this._activeSource
    };
  }

  /** Read and clear any queued edge-triggered Flip Car request. */
  consumeFlip() {
    const val = this._flipQueued;
    this._flipQueued = false;
    return val;
  }

  reset() {
    this._keys.clear();
    this._touchPointers.clear();
    this._touchAnalog.steering = 0;
    this._touchAnalog.throttle = 0;
    this._flipQueued = false;
    this.pollGamepad([]);
  }

  destroy() {
    while (this._cleanups.length) {
      const fn = this._cleanups.pop();
      try {
        fn();
      } catch {}
    }
    this.reset();
  }

  _touchHasAction(action) {
    for (const v of this._touchPointers.values()) {
      if (v === action) return true;
    }
    return false;
  }

  _queueFlip(source) {
    this._flipQueued = true;
    this.bus.emit(EVENTS.PHYSICS_FLIP_CAR, { source });
  }
}

export const inputManager = new InputManager();
export default inputManager;
