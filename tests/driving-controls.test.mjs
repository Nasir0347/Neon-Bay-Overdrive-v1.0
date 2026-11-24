import test from 'node:test';
import assert from 'node:assert/strict';

import { EventBus, EVENTS } from '../src/core/EventBus.js';
import { InputManager, INPUT_SOURCES, applyDeadzone } from '../src/core/InputManager.js';
import {
  BASE_FOV,
  NITRO_FOV,
  MEGA_RAMP_SLOWMO_SCALE,
  MEGA_RAMP_SLOWMO_DURATION,
  computeDynamicFov,
  CameraShake,
  SlowMotionController,
  ParticlePool,
  flipCar
} from '../src/garage/DrivingJuice.js';

function makeMockTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, fn, opts) {
      let arr = listeners.get(type);
      if (!arr) listeners.set(type, (arr = []));
      arr.push({ fn, capture: !!(opts === true || opts?.capture), opts });
    },
    removeEventListener(type, fn, opts) {
      const arr = listeners.get(type);
      if (!arr) return;
      const cap = !!(opts === true || opts?.capture);
      listeners.set(
        type,
        arr.filter((e) => !(e.fn === fn && e.capture === cap))
      );
    },
    dispatch(type, eventObj = {}) {
      const arr = (listeners.get(type) || []).slice();
      for (const e of arr) e.fn(eventObj);
    },
    count(type) {
      return (listeners.get(type) || []).length;
    }
  };
}

// ============================================================================
// 1. InputManager Normalization Parity: Keyboard === Touch === Gamepad
// ============================================================================
test('InputManager: normalizes Keyboard, simulated Touch, and Gamepad into identical steering/throttle/brake values', () => {
  const win = makeMockTarget();

  // --- A) Keyboard: W + D + ShiftRight + Space + KeyR ---
  const busKb = new EventBus();
  const kbMgr = new InputManager({ eventBus: busKb });
  kbMgr.attachKeyboard(win);

  win.dispatch('keydown', { code: 'KeyW', repeat: false, preventDefault() {} });
  win.dispatch('keydown', { code: 'KeyD', repeat: false, preventDefault() {} });
  win.dispatch('keydown', { code: 'Space', repeat: false, preventDefault() {} });
  win.dispatch('keydown', { code: 'ShiftLeft', repeat: false, preventDefault() {} });
  win.dispatch('keydown', { code: 'KeyR', repeat: false, preventDefault() {} });
  const kbState = kbMgr.getState();

  // Left + Right cancels cleanly to 0; W -> throttle 1, S -> reverse 1
  win.dispatch('keydown', { code: 'KeyA', repeat: false, preventDefault() {} });
  assert.equal(kbMgr.getState().steering, 0);
  win.dispatch('keyup', { code: 'KeyD' });
  assert.equal(kbMgr.getState().steering, -1);

  // --- B) Mobile Multi-Touch: steerRight (pointer 1) + throttle (pointer 2) + brake (pointer 3) + nitro (pointer 4) + flip (pointer 5) ---
  const busTouch = new EventBus();
  const touchMgr = new InputManager({ eventBus: busTouch });
  touchMgr.setTouchPointer(1, 'steerRight', true);
  touchMgr.setTouchPointer(2, 'throttle', true);
  touchMgr.setTouchPointer(3, 'brake', true);
  touchMgr.setTouchPointer(4, 'nitro', true);
  touchMgr.setTouchPointer(5, 'flip', true);
  const touchState = touchMgr.getState();

  // Also check pinch-zoom lock prevents multi-finger touchmove & gesturestart
  const docTarget = makeMockTarget();
  touchMgr.attachPinchZoomLock(docTarget);
  let prevented = 0;
  docTarget.dispatch('gesturestart', { preventDefault() { prevented++; } });
  docTarget.dispatch('touchmove', { touches: [{}, {}], preventDefault() { prevented++; } });
  assert.equal(prevented, 2);

  // Also test touch-action: none enforcement on attachTouch container
  const mockBtn = {
    dataset: { action: 'throttle' },
    style: {},
    ...makeMockTarget()
  };
  const mockContainer = {
    style: {},
    querySelectorAll: () => [mockBtn],
    addEventListener() {}
  };
  touchMgr.attachTouch(mockContainer);
  assert.equal(mockContainer.style.touchAction, 'none');
  assert.equal(mockBtn.style.touchAction, 'none');

  // --- C) Gamepad API: axes[0] = 1.0 (full right), RT buttons[7] = 1.0, B buttons[1] = 1, RB buttons[5] = 1, Y buttons[3] = 1 ---
  const busGp = new EventBus();
  const gpMgr = new InputManager({ eventBus: busGp });
  const fakeGamepad = {
    connected: true,
    axes: [1.0, 0],
    buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }))
  };
  fakeGamepad.buttons[7] = { pressed: true, value: 1 }; // RT throttle
  fakeGamepad.buttons[1] = { pressed: true, value: 1 }; // B brake
  fakeGamepad.buttons[5] = { pressed: true, value: 1 }; // RB nitro
  fakeGamepad.buttons[3] = { pressed: true, value: 1 }; // Y flip
  const gpState = gpMgr.getState([fakeGamepad]);

  const pickCore = (s) => ({
    steering: s.steering,
    throttle: s.throttle,
    reverse: s.reverse,
    brake: s.brake,
    handbrake: s.handbrake,
    nitro: s.nitro,
    flip: s.flip
  });

  assert.deepEqual(pickCore(kbState), {
    steering: 1,
    throttle: 1,
    reverse: 0,
    brake: 1,
    handbrake: true,
    nitro: true,
    flip: true
  });
  assert.deepEqual(pickCore(touchState), pickCore(kbState));
  assert.deepEqual(pickCore(gpState), pickCore(kbState));
  assert.equal(kbState.activeSource, INPUT_SOURCES.KEYBOARD);
  assert.equal(touchState.activeSource, INPUT_SOURCES.TOUCH);
  assert.equal(gpState.activeSource, INPUT_SOURCES.GAMEPAD);

  // Deadzone swallows stick drift inside +-0.15 and rescales half-deflection smoothly
  assert.equal(applyDeadzone(0.12, 0.15), 0);
  assert.equal(applyDeadzone(-0.14, 0.15), 0);
  const halfGp = gpMgr.getState([{ connected: true, axes: [-0.575, 0], buttons: [] }]);
  assert.ok(Math.abs(halfGp.steering - -0.5) < 1e-6);

  assert.equal(gpMgr.consumeFlip(), true);
  assert.equal(gpMgr.consumeFlip(), false);

  kbMgr.destroy();
  touchMgr.destroy();
  gpMgr.destroy();
});

test('InputManager: 1-tap AudioContext.resume() unlock fires on first gesture and detaches cleanly', async () => {
  const target = makeMockTarget();
  const mgr = new InputManager();
  let resumes = 0, unlockedCount = 0;
  const fakeCtx = {
    state: 'suspended',
    async resume() {
      resumes++;
      this.state = 'running';
    }
  };

  mgr.bindAudioUnlock(() => fakeCtx, () => { unlockedCount++; }, target);
  assert.equal(target.count('pointerdown'), 1);
  assert.equal(target.count('touchstart'), 1);
  assert.equal(target.count('keydown'), 1);

  target.dispatch('touchstart', {});
  await new Promise((r) => setTimeout(r, 0));

  assert.equal(resumes, 1);
  assert.equal(unlockedCount, 1);
  assert.equal(fakeCtx.state, 'running');
  assert.equal(target.count('pointerdown'), 0);
  assert.equal(target.count('touchstart'), 0);
  assert.equal(target.count('keydown'), 0);

  mgr.destroy();
});

// ============================================================================
// 2. DrivingJuice & Flip Car Tests
// ============================================================================
test('DrivingJuice: FOV 60->80 boost, micro impact shake, 0.3x 1.5s slow-mo, ParticlePool & Flip Car reset', () => {
  const bus = new EventBus();
  const flips = [];
  bus.on(EVENTS.PHYSICS_FLIP_CAR, (e) => flips.push(e));

  // FOV ramps smoothly from 60 to 80 on Nitro
  let fov = BASE_FOV;
  for (let i = 0; i < 60; i++) {
    fov = computeDynamicFov(fov, { inCar: true, speed: 38, nitroActive: true, dt: 0.033 });
  }
  assert.equal(fov, NITRO_FOV);
  fov = computeDynamicFov(fov, { inCar: false, speed: 0, nitroActive: false, dt: 1.0 });
  assert.equal(fov, BASE_FOV);

  // Impact camera shake decays smoothly to 0
  const shake = new CameraShake();
  shake.trigger(0.4, 0.28);
  const s1 = shake.update(0.05, false);
  assert.ok(Math.hypot(s1.x, s1.y) > 0);
  const sEnd = shake.update(0.5, false);
  assert.deepEqual(sEnd, { x: 0, y: 0 });

  // Slow motion runs at 0.3x for 1.5s then returns to 1.0x
  const slow = new SlowMotionController();
  slow.trigger(MEGA_RAMP_SLOWMO_DURATION, MEGA_RAMP_SLOWMO_SCALE);
  assert.equal(slow.isActive(), true);
  assert.equal(slow.update(0.75), 0.3);
  assert.equal(slow.isActive(), true);
  assert.equal(slow.update(0.8), 1);
  assert.equal(slow.isActive(), false);

  // ParticlePool bounded capacity with zero heap leaks
  const pool = new ParticlePool(4);
  for (let i = 0; i < 6; i++) pool.spawn(i, 0, 0, 0, 1, 0, 0.5, 0.4, i % 2 === 0);
  assert.equal(pool.activeCount, 4);
  pool.update(0.6);
  assert.equal(pool.activeCount, 0);

  // Flip Car resets roll/pitch/airborne safely & relocates stuck vehicle
  const overturned = {
    x: 22,
    z: -22,
    yaw: 1.1,
    roll: 3.14,
    pitch: -0.95,
    jumpPitch: -0.35,
    jumpY: 2.2,
    jumpVy: -6,
    airborne: true,
    onRamp: 'north_ave',
    driftVisualYaw: 0.22,
    velocity: 18
  };
  const res = flipCar(overturned, {
    isBlocked: (x, z) => x === 22 && z === -22,
    findSafeSpot: () => ({ x: 0, z: -22 }),
    eventBus: bus,
    source: 'keyboard'
  });

  assert.equal(res.flipped, true);
  assert.equal(res.relocated, true);
  assert.equal(overturned.roll, 0);
  assert.equal(overturned.pitch, 0);
  assert.equal(overturned.jumpPitch, 0);
  assert.equal(overturned.jumpY, 0);
  assert.equal(overturned.jumpVy, 0);
  assert.equal(overturned.airborne, false);
  assert.equal(overturned.onRamp, null);
  assert.equal(overturned.driftVisualYaw, 0);
  assert.equal(overturned.velocity, 0);
  assert.deepEqual({ x: overturned.x, z: overturned.z }, { x: 0, z: -22 });
  assert.equal(flips.length, 1);
});
