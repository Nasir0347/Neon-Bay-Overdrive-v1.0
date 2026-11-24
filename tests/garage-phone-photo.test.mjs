import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EventBus } from '../src/core/EventBus.js';
import { SaveManager } from '../src/core/SaveManager.js';
import { GameState, STATES } from '../src/core/GameState.js';
import {
  VEHICLE_ROSTER,
  normalizeVehicleMeshScale,
  GarageManager
} from '../src/garage/GarageManager.js';
import {
  CHEAT_CODES,
  RADIO_STATIONS_SPEC,
  Smartphone
} from '../src/ui/Smartphone.js';
import {
  PHOTO_WATERMARK_TEXT,
  PhotoMode
} from '../src/ui/PhotoMode.js';

function makeMockStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k)
  };
}

function makeLightDom() {
  const elementsById = new Map();
  const winListeners = new Map();
  const docListeners = new Map();

  function mkClassList() {
    const set = new Set();
    return {
      add: (...c) => c.forEach((x) => x && set.add(x)),
      remove: (...c) => c.forEach((x) => set.delete(x)),
      contains: (c) => set.has(c),
      toggle: (c, f) => (f === undefined ? (set.has(c) ? (set.delete(c), false) : (set.add(c), true)) : (f ? (set.add(c), true) : (set.delete(c), false)))
    };
  }

  function el(tag, id = '') {
    const listeners = new Map();
    const node = {
      tagName: tag.toUpperCase(),
      id,
      className: '',
      hidden: false,
      disabled: false,
      value: '',
      textContent: '',
      dataset: {},
      style: {},
      children: [],
      attributes: {},
      classList: mkClassList(),
      appendChild(c) { this.children.push(c); if (c.id) elementsById.set(c.id, c); return c; },
      append(...n) { n.forEach((x) => this.appendChild(x)); },
      replaceChildren(...n) { this.children = []; n.forEach((x) => this.appendChild(x)); },
      setAttribute(k, v) { this.attributes[k] = String(v); },
      closest: () => null,
      click() { this.dispatchEvent({ type: 'click', preventDefault() {}, stopPropagation() {} }); },
      addEventListener(t, fn) { if (!listeners.has(t)) listeners.set(t, []); listeners.get(t).push(fn); },
      removeEventListener(t, fn) { if (listeners.has(t)) listeners.set(t, listeners.get(t).filter((f) => f !== fn)); },
      dispatchEvent(e) { for (const fn of listeners.get(e.type) || []) fn(e); },
      querySelector(sel) { return this.querySelectorAll(sel)[0] || null; },
      querySelectorAll(sel) {
        const out = [];
        const walk = (n) => {
          for (const c of n.children || []) {
            const match = sel.startsWith('#') ? c.id === sel.slice(1) : sel.startsWith('.') ? String(c.className).split(/\s+/).includes(sel.slice(1)) : c.tagName === sel.toUpperCase();
            if (match) out.push(c);
            walk(c);
          }
        };
        walk(this);
        return out;
      }
    };
    if (id) elementsById.set(id, node);
    return node;
  }

  const body = el('body');
  const doc = {
    body,
    createElement: (t) => el(t),
    getElementById: (id) => elementsById.get(id) || null,
    addEventListener(t, fn) { if (!docListeners.has(t)) docListeners.set(t, []); docListeners.get(t).push(fn); },
    removeEventListener(t, fn) { if (docListeners.has(t)) docListeners.set(t, docListeners.get(t).filter((f) => f !== fn)); }
  };
  const win = {
    addEventListener(t, fn, cap = false) {
      const k = `${t}:${cap ? 1 : 0}`;
      if (!winListeners.has(k)) winListeners.set(k, []);
      winListeners.get(k).push(fn);
    },
    removeEventListener(t, fn, cap = false) {
      const k = `${t}:${cap ? 1 : 0}`;
      if (winListeners.has(k)) winListeners.set(k, winListeners.get(k).filter((f) => f !== fn));
    },
    dispatchKey(code) {
      let stopped = false;
      const e = { type: 'keydown', code, repeat: false, target: body, preventDefault() {}, stopImmediatePropagation() { stopped = true; } };
      for (const fn of winListeners.get('keydown:1') || []) { if (!stopped) fn(e); }
      if (!stopped) for (const fn of winListeners.get('keydown:0') || []) fn(e);
    }
  };
  return { doc, win };
}

describe('Garage (12 Cars + 4 Bikes), Smartphone (4 Apps + 4 Cheats) & Photo Mode Suite', () => {
  it('defines all 16 vehicles at exact copyright-safe spec scales/stats and persists customization in SaveManager', () => {
    const storage = makeMockStorage();
    const saveMgr = new SaveManager({ storage });
    const garage = new GarageManager({ saveManager: saveMgr });

    assert.equal(garage.getAllVehicles().length, 16);
    assert.equal(garage.getCars().length, 12);
    assert.equal(garage.getBikes().length, 4);

    // Exact spec table verification (12 Cars + 4 Bikes)
    const expected = {
      C01: ['Kuro Civic-X', 4.50, 1.85, 1.42, 175, 1350, true],
      C02: ['Kuro Drift-R', 4.55, 1.90, 1.35, 210, 1420, true],
      C03: ['Stallion V8 GT', 4.85, 1.95, 1.40, 225, 1750, false],
      C04: ['Kuro Turbo-RS', 4.30, 1.85, 1.45, 215, 1300, false],
      C05: ['Vortex Spyder', 4.60, 1.98, 1.22, 265, 1450, false],
      C06: ['Solaris Drop-Top', 4.75, 1.92, 1.32, 235, 1600, false],
      C07: ['Titan Executive', 4.95, 2.05, 1.95, 195, 2600, false],
      C08: ['Titan 4x4 Crusher', 5.40, 2.15, 2.05, 185, 3100, false],
      C09: ['Vortex Shadow', 4.65, 1.98, 1.24, 275, 1480, false],
      C10: ['Vortex Veneno-X', 4.78, 2.06, 1.16, 320, 1520, false],
      C11: ['Vortex Apex Gold', 4.80, 2.08, 1.15, 340, 1490, false],
      C12: ['NBPD Interceptor', 4.90, 1.96, 1.48, 250, 1850, false],
      B01: ['Phantom Street 600', 2.05, 0.78, 1.12, 220, 195, true],
      B02: ['Phantom Dirt-X', 2.15, 0.82, 1.25, 185, 125, false],
      B03: ['Phantom R1000', 2.10, 0.80, 1.15, 295, 210, false],
      B04: ['Phantom Neon-Z', 2.20, 0.85, 1.10, 315, 180, false]
    };

    const banned = /gta|grand theft|vice city|rockstar|lamborghini|ferrari|bmw/i;
    for (const [id, [name, l, w, h, spd, mass, starter]] of Object.entries(expected)) {
      const v = garage.getVehicle(id);
      assert.ok(v, `missing ${id}`);
      assert.equal(v.name, name);
      assert.equal(banned.test(v.name) || banned.test(v.archetype), false, `copyright violation on ${id}`);
      assert.equal(v.scale.l, l);
      assert.equal(v.scale.w, w);
      assert.equal(v.scale.h, h);
      assert.equal(v.topSpeedKmh, spd);
      assert.equal(v.massKg, mass);
      assert.equal(garage.isUnlocked(id), starter);
    }

    // Mesh normalization lifts wheels cleanly to y = 0 and hides beam FX during measurement
    const fakeMesh = {
      position: { x: 0, y: 0, z: 0 },
      scale: { set(x, y, z) { this.x = x; this.y = y; this.z = z; } },
      userData: {
        rawDims: { x: 2.30, y: 1.32, z: 4.94, minY: -0.02 },
        beams: [{ visible: true }]
      }
    };
    const norm = normalizeVehicleMeshScale(fakeMesh, garage.getVehicle('C10'), {});
    assert.equal(norm.ok, true);
    assert.equal(fakeMesh.userData.beams[0].visible, true);
    assert.ok(fakeMesh.position.y > 0, 'lifts below-floor wheel clipping cleanly to y = 0');

    // Unlock C10, customize Paint + Neon + Turbo Level, reload SaveManager and verify persistence
    saveMgr.addCash(30000);
    assert.equal(garage.unlockVehicle('C10').ok, true);
    assert.equal(garage.setPaintColor('C10', '#ff007f').ok, true);
    assert.equal(garage.setNeonUnderglow('C10', 'magenta').ok, true);
    assert.equal(garage.upgradeTurbo('C10', 2).ok, true);
    assert.equal(garage.selectVehicle('C10', { spawn: false }).ok, true);

    const reloadedSave = new SaveManager({ storage });
    const reloadedGarage = new GarageManager({ saveManager: reloadedSave });
    assert.equal(reloadedGarage.isUnlocked('C10'), true);
    assert.equal(reloadedGarage.getSelectedVehicle().id, 'C10');
    const cfg = reloadedGarage.getCustomization('C10');
    assert.deepEqual({ paint: cfg.paint, neon: cfg.neon, turboLv: cfg.turboLv }, { paint: '#ff007f', neon: 'magenta', turboLv: 2 });
    assert.equal(reloadedGarage.getEffectiveStats('C10').topSpeedKmh, Math.round(320 * 1.16));
  });

  it('Smartphone mounts 4 working apps and executes all 4 cheat codes accurately', () => {
    const { doc, win } = makeLightDom();
    const bus = new EventBus();
    const saveMgr = new SaveManager({ storage: makeMockStorage(), eventBus: bus });
    const garage = new GarageManager({ saveManager: saveMgr, eventBus: bus });

    let jumpMult = 1;
    let gravScale = 1;
    let clearedCount = 0;
    let tunedStation = 0;
    let startedMission = null;

    const phone = new Smartphone({
      doc,
      win,
      eventBus: bus,
      garageManager: garage,
      handlers: {
        onSuperJump: (_on, m) => { jumpMult = m; },
        onClearWanted: () => { clearedCount += 1; },
        onMoonGravity: (_on, s) => { gravScale = s; },
        onTuneRadio: (idx) => { tunedStation = idx; },
        onStartMission: (idx) => { startedMission = idx; }
      }
    }).mount();

    assert.deepEqual(Object.keys(CHEAT_CODES).sort(), ['0000', '5555', '7777', '9999']);
    assert.ok(RADIO_STATIONS_SPEC.length >= 4);

    assert.equal(phone.open('home'), true);
    assert.equal(phone.setApp('missions'), true);
    doc.getElementById('phoneScreen').querySelector('.phone-action-btn').click();
    assert.equal(startedMission, 0);

    assert.equal(phone.open('radio'), true);
    doc.getElementById('phoneScreen').querySelectorAll('.phone-action-btn')[1].click();
    assert.equal(tunedStation, 1);

    assert.equal(phone.setApp('garage'), true);
    assert.ok(doc.getElementById('phoneScreen').querySelectorAll('.phone-card').length >= 12);

    assert.equal(phone.setApp('cheats'), true);
    // 9999 Super Jump (toggle on & off)
    const r9999 = phone.dialCheat('9999');
    assert.equal(r9999.ok, true);
    assert.equal(jumpMult, 2.5);
    assert.equal(phone.cheatsState.superJump, true);

    // 7777 Spawn Golden Supercar (C11)
    const r7777 = phone.dialCheat('7777');
    assert.equal(r7777.ok, true);
    assert.equal(garage.isUnlocked('C11'), true);
    assert.equal(garage.getSelectedVehicle().id, 'C11');
    assert.equal(garage.getCustomization('C11').paint, '#ffd700');
    assert.equal(garage.getCustomization('C11').neon, 'gold');
    assert.equal(garage.getCustomization('C11').turboLv, 3);

    // 0000 Clear Wanted Stars
    const r0000 = phone.dialCheat('0000');
    assert.equal(r0000.ok, true);
    assert.equal(clearedCount, 1);

    // 5555 Moon Gravity
    const r5555 = phone.dialCheat('5555');
    assert.equal(r5555.ok, true);
    assert.equal(gravScale, 0.35);
    assert.equal(phone.cheatsState.moonGravity, true);

    // Invalid cheat rejected safely
    assert.equal(phone.dialCheat('1234').ok, false);
    phone.destroy();
  });

  it('PhotoMode enters PHOTO_MODE, pauses physics, hides HUD, orbits camera, exports PNG watermark & exits cleanly', () => {
    const { doc, win } = makeLightDom();
    const gs = new GameState({ initialState: STATES.LOADING });
    gs.transition(STATES.FREE_ROAM);

    let paused = false;
    let renderCalls = 0;
    const cam = {
      fov: 60,
      pos: { x: 0, y: 0, z: 0 },
      lookedAt: null,
      position: { set(x, y, z) { cam.pos = { x, y, z }; } },
      lookAt(x, y, z) { cam.lookedAt = { x, y, z }; },
      updateProjectionMatrix() {}
    };

    const photo = new PhotoMode({
      doc,
      win,
      gameState: gs,
      getTargetPos: () => ({ x: 10, y: 1.5, z: -20, yaw: 0 }),
      getCamera: () => cam,
      renderFrame: () => { renderCalls += 1; },
      onPausePhysics: () => { paused = true; },
      onResumePhysics: () => { paused = false; }
    }).mount();

    assert.equal(photo.enter(), true);
    assert.equal(gs.getState(), STATES.PHOTO_MODE);
    assert.equal(paused, true);
    assert.equal(doc.body.classList.contains('photo-mode-active'), true);
    assert.equal(doc.getElementById('photoModeBar').hidden, false);

    const posBefore = { ...cam.pos };
    photo.setOrbit({ yaw: 1.8, pitch: 0.45, distance: 11, fov: 44 });
    assert.notDeepEqual(cam.pos, posBefore);
    assert.equal(cam.fov, 44);
    assert.ok(renderCalls >= 2);

    const snap = photo.capturePNG();
    assert.equal(snap.ok, true);
    assert.equal(snap.watermark, PHOTO_WATERMARK_TEXT);
    assert.ok(snap.dataUrl.startsWith('data:image/png;base64,'));

    // Escape exits cleanly and resumes physics
    win.dispatchKey('Escape');
    assert.equal(photo.active, false);
    assert.equal(gs.getState(), STATES.FREE_ROAM);
    assert.equal(paused, false);
    assert.equal(cam.fov, 60);
    assert.equal(doc.body.classList.contains('photo-mode-active'), false);
    photo.destroy();
  });
});
