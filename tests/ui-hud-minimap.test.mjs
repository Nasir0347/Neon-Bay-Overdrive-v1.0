import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  NEON_DISTRICTS,
  PORTRAIT_FOV_MIN_BONUS,
  PORTRAIT_FOV_MAX_BONUS,
  resolveNeonDistrict,
  computeResponsiveFov,
  formatCash,
  formatWantedStars,
  computeLayoutMode,
  HUD
} from '../src/ui/HUD.js';
import {
  MINIMAP_DISTRICTS,
  computeMinimapTransform,
  Minimap
} from '../src/ui/Minimap.js';

function makeMockClassList(el) {
  const set = new Set();
  return {
    add: (...cls) => cls.forEach((c) => c && set.add(c)),
    remove: (...cls) => cls.forEach((c) => set.delete(c)),
    contains: (c) => set.has(c),
    toggle: (c, force) => {
      if (force === undefined) {
        if (set.has(c)) { set.delete(c); return false; }
        set.add(c); return true;
      }
      if (force) { set.add(c); return true; }
      set.delete(c); return false;
    }
  };
}

function makeMockContext() {
  const ops = [];
  let fillStyleVal = '#000';
  let strokeStyleVal = '#000';
  const ctx = {
    ops,
    get fillStyle() { return fillStyleVal; },
    set fillStyle(v) { fillStyleVal = v; },
    get strokeStyle() { return strokeStyleVal; },
    set strokeStyle(v) { strokeStyleVal = v; },
    lineWidth: 1,
    lineJoin: 'miter',
    lineCap: 'butt',
    font: '10px sans-serif',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    clearRect: (...a) => ops.push(['clearRect', a]),
    fillRect: (...a) => ops.push(['fillRect', a, fillStyleVal]),
    beginPath: () => ops.push(['beginPath']),
    closePath: () => ops.push(['closePath']),
    moveTo: (x, y) => ops.push(['moveTo', [x, y]]),
    lineTo: (x, y) => ops.push(['lineTo', [x, y]]),
    arc: (x, y, r) => ops.push(['arc', [x, y, r], fillStyleVal, strokeStyleVal]),
    stroke: () => ops.push(['stroke', strokeStyleVal]),
    fill: () => ops.push(['fill', fillStyleVal]),
    save: () => ops.push(['save']),
    restore: () => ops.push(['restore']),
    translate: (x, y) => ops.push(['translate', [x, y]]),
    rotate: (a) => ops.push(['rotate', [a]]),
    measureText: (txt) => ({ width: String(txt).length * 5 }),
    fillText: (txt, x, y) => ops.push(['fillText', [txt, x, y], fillStyleVal])
  };
  return ctx;
}

function makeMockEnv(width = 1280, height = 720) {
  const winListeners = new Map();
  const docListeners = new Map();
  const elementsById = new Map();

  function createEl(tag, id = '') {
    const elListeners = new Map();
    const ctx = tag === 'canvas' ? makeMockContext() : null;
    const el = {
      tagName: tag.toUpperCase(),
      id,
      className: '',
      hidden: false,
      width: tag === 'canvas' ? 180 : 0,
      height: tag === 'canvas' ? 180 : 0,
      textContent: '',
      children: [],
      dataset: {},
      attributes: {},
      style: {
        _props: {},
        setProperty(k, v) { this._props[k] = v; },
        getPropertyValue(k) { return this._props[k] || ''; }
      },
      classList: null,
      appendChild(child) {
        this.children.push(child);
        if (child.id) elementsById.set(child.id, child);
        return child;
      },
      append(...nodes) {
        nodes.forEach((n) => this.appendChild(n));
      },
      setAttribute(k, v) { this.attributes[k] = String(v); },
      getAttribute(k) { return this.attributes[k] ?? null; },
      querySelector(sel) {
        const all = this.querySelectorAll(sel);
        return all[0] || null;
      },
      querySelectorAll(sel) {
        const out = [];
        const match = (node) => {
          if (sel.startsWith('#')) return node.id === sel.slice(1);
          if (sel.startsWith('.')) return String(node.className || '').split(/\s+/).includes(sel.slice(1));
          return node.tagName === sel.toUpperCase();
        };
        const walk = (n) => {
          for (const c of n.children || []) {
            if (match(c)) out.push(c);
            walk(c);
          }
        };
        walk(this);
        return out;
      },
      get firstElementChild() { return this.children[0] || null; },
      addEventListener(ev, fn) {
        if (!elListeners.has(ev)) elListeners.set(ev, []);
        elListeners.get(ev).push(fn);
      },
      removeEventListener(ev, fn) {
        const list = elListeners.get(ev);
        if (list) elListeners.set(ev, list.filter((f) => f !== fn));
      },
      dispatchEvent(e) {
        const evObj = { preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() {}, target: el, ...e };
        for (const fn of elListeners.get(evObj.type) || []) fn(evObj);
      },
      getContext: (kind) => (kind === '2d' ? ctx : null)
    };
    el.classList = makeMockClassList(el);
    if (id) elementsById.set(id, el);
    return el;
  }

  const body = createEl('body');
  const documentElement = createEl('html');
  const mapWrap = createEl('aside', 'mapWrap');
  const mapCanvas = createEl('canvas', 'map');
  const telemetry = createEl('div', 'telemetry');
  const panel = createEl('div', 'panel');
  panel.hidden = true;
  mapWrap.appendChild(mapCanvas);
  body.append(mapWrap, telemetry, panel);

  const doc = {
    body,
    documentElement,
    createElement: (tag) => createEl(tag),
    createTextNode: (text) => ({ nodeType: 3, textContent: text }),
    getElementById: (id) => elementsById.get(id) || null,
    addEventListener(ev, fn) {
      if (!docListeners.has(ev)) docListeners.set(ev, []);
      docListeners.get(ev).push(fn);
    },
    removeEventListener(ev, fn) {
      const list = docListeners.get(ev);
      if (list) docListeners.set(ev, list.filter((f) => f !== fn));
    },
    dispatchEvent(e) {
      for (const fn of docListeners.get(e.type) || []) fn(e);
    }
  };

  const win = {
    innerWidth: width,
    innerHeight: height,
    addEventListener(ev, fn, capture = false) {
      const key = `${ev}:${capture ? 1 : 0}`;
      if (!winListeners.has(key)) winListeners.set(key, []);
      winListeners.get(key).push(fn);
    },
    removeEventListener(ev, fn, capture = false) {
      const key = `${ev}:${capture ? 1 : 0}`;
      const list = winListeners.get(key);
      if (list) winListeners.set(key, list.filter((f) => f !== fn));
    },
    dispatchKey(code, extra = {}) {
      let stopped = false;
      const e = {
        type: 'keydown',
        code,
        repeat: false,
        isTrusted: true,
        target: body,
        preventDefault() {},
        stopPropagation() { stopped = true; },
        stopImmediatePropagation() { stopped = true; },
        ...extra
      };
      for (const fn of winListeners.get('keydown:1') || []) {
        if (stopped) break;
        fn(e);
      }
      if (!stopped) {
        for (const fn of winListeners.get('keydown:0') || []) fn(e);
      }
    }
  };

  return { doc, win, mapWrap, mapCanvas, telemetry, panel };
}

describe('Section 6 HUD, Responsiveness & Minimap Suite', () => {
  it('resolves all 4 Neon Bay districts and widens FOV cleanly in portrait mode', () => {
    const names = NEON_DISTRICTS.map((d) => d.name);
    assert.deepEqual(names, ['Apex Core', 'Palm Strip', 'Iron Docks', 'Bayview Heights']);
    assert.equal(resolveNeonDistrict(0, 0).name, 'Apex Core');
    assert.equal(resolveNeonDistrict(0, -320).name, 'Palm Strip');
    assert.equal(resolveNeonDistrict(-240, 0).name, 'Iron Docks');
    assert.equal(resolveNeonDistrict(0, 260).name, 'Bayview Heights');

    assert.equal(computeResponsiveFov(60, 1920 / 1080), 60);
    assert.equal(computeResponsiveFov(60, 844 / 390), 60);
    const fov360x640 = computeResponsiveFov(60, 360 / 640);
    const fov768x1024 = computeResponsiveFov(60, 768 / 1024);
    assert.ok(fov360x640 >= 60 + PORTRAIT_FOV_MIN_BONUS && fov360x640 <= 60 + PORTRAIT_FOV_MAX_BONUS);
    assert.ok(fov768x1024 >= 60 + PORTRAIT_FOV_MIN_BONUS && fov768x1024 <= 60 + PORTRAIT_FOV_MAX_BONUS);

    assert.equal(formatCash(12500), '$12,500');
    assert.equal(formatCash(2400, 'Rs '), 'Rs 2,400');
    assert.deepEqual(formatWantedStars(3).level, 3);
    assert.equal(formatWantedStars(8).level, 5);
    assert.equal(formatWantedStars(0).active, false);

    assert.equal(computeLayoutMode(360, 640, true).orientation, 'portrait');
    assert.equal(computeLayoutMode(844, 390, true).orientation, 'landscape');
    assert.equal(computeLayoutMode(1024, 768, false).tier, 'tablet');
    assert.equal(computeLayoutMode(1920, 1080, false).tier, 'desktop');
  });

  it('HUD mounts glass elements, pulses cash/wanted/speed-lines, and fires District/Radio toasts with blur toggle', () => {
    const { doc, win } = makeMockEnv(360, 640);
    const hud = new HUD({ doc, win }).mount();

    assert.equal(doc.body.classList.contains('portrait'), true);
    assert.ok(doc.getElementById('hudCash'));
    assert.ok(doc.getElementById('wantedStars'));
    assert.ok(doc.getElementById('neonToast'));

    hud.setQualityPreset('low');
    assert.equal(doc.body.classList.contains('gfx-low'), true);
    hud.setQualityPreset('high');
    assert.equal(doc.body.classList.contains('gfx-low'), false);

    // Spawn at Apex Core then cross into Palm Strip, Iron Docks, Bayview Heights
    hud.update({ cash: 500, wanted: false, wantedLevel: 0, speedKmh: 40, x: 0, z: 0 }, 0.016);
    assert.equal(doc.getElementById('neonToast').hidden, true);

    hud.update({ cash: 1500, wanted: true, wantedLevel: 4, speedKmh: 250, x: 0, z: -260 }, 0.016);
    assert.equal(doc.getElementById('hudCash').textContent, 'Rs 1,500');
    assert.equal(doc.getElementById('wantedStars').dataset.level, '4');
    assert.equal(doc.getElementById('neonToast').hidden, false);
    assert.equal(doc.getElementById('neonToastTitle').textContent, 'PALM STRIP');
    assert.ok(Number(doc.getElementById('speedLines').style.opacity) > 0);

    hud.update({ cash: 1500, wanted: true, wantedLevel: 4, speedKmh: 90, x: -240, z: 0 }, 0.016);
    assert.equal(doc.getElementById('neonToastTitle').textContent, 'IRON DOCKS');

    hud.update({ cash: 1500, wanted: true, wantedLevel: 4, speedKmh: 90, x: 0, z: 240 }, 0.016);
    assert.equal(doc.getElementById('neonToastTitle').textContent, 'BAYVIEW HEIGHTS');

    hud.showRadioToast('99.5 Neon FM', 'Miami Synthwave');
    assert.equal(doc.getElementById('neonToast').dataset.kind, 'radio');
    assert.equal(doc.getElementById('neonToastTitle').textContent, '99.5 NEON FM');

    // Auto-fade toast after 3.6s
    hud.update({ cash: 1500, wanted: false, wantedLevel: 0, speedKmh: 0, x: 0, z: 240 }, 3.6);
    assert.equal(doc.getElementById('neonToast').hidden, true);
    hud.destroy();
  });

  it('Minimap rotates world coordinates by heading, renders districts/route/police, and toggles Full Map via KeyM and tap', () => {
    // Heading-up transform parity checks (+Z ahead at yaw=0, +X ahead at yaw=+PI/2)
    const up0 = computeMinimapTransform(0, 50, 0, 0, 0, 90, 90, 1);
    assert.ok(Math.abs(up0.x - 90) < 1e-6 && Math.abs(up0.y - 40) < 1e-6);
    const rotated = computeMinimapTransform(50, 0, 0, 0, Math.PI / 2, 90, 90, 1);
    assert.ok(Math.abs(rotated.x - 90) < 1e-6 && Math.abs(rotated.y - 40) < 1e-6);

    const { doc, win, mapWrap, mapCanvas } = makeMockEnv(1280, 720);
    const minimap = new Minimap({ radarCanvas: mapCanvas, mapWrap, doc, win }).mount();

    const state = {
      player: { x: 0, z: 0 },
      heading: 0.4,
      playTime: 0.0,
      wanted: true,
      wantedLevel: 3,
      roadAxes: [-165, 0, 165],
      buildings: [{ x: 22, z: 22, w: 17, d: 17 }],
      policeUnits: [{ x: 10, z: 20 }],
      targets: [{ x: 0, z: 120 }],
      routePoints: [{ x: 0, z: 0 }, { x: 0, z: 120 }]
    };

    minimap.render(state);
    const ops = mapCanvas.getContext('2d').ops;
    const labelsDrawn = ops.filter((o) => o[0] === 'fillText').map((o) => o[1][0]);
    for (const d of MINIMAP_DISTRICTS) {
      assert.ok(labelsDrawn.includes(d.label), `expected district label ${d.label}`);
    }
    assert.ok(ops.some((o) => o[0] === 'stroke' && o[1] === '#00F0FF'), 'GPS waypoint route drawn in neon cyan');
    assert.ok(ops.some((o) => o[0] === 'arc' && o[2] === '#FF2A2A'), 'wanted police dot blinks hazard red');

    // Second half of blink cycle turns police dot police cyan
    minimap.render({ ...state, playTime: 0.2 });
    assert.ok(ops.some((o) => o[0] === 'arc' && o[2] === '#00B4FF'), 'wanted police dot alternates cyan');

    // KeyM opens Full Map, Escape closes Full Map, minimap click toggles
    win.dispatchKey('KeyM');
    assert.equal(minimap.fullMapOpen, true);
    assert.equal(doc.getElementById('fullMapOverlay').hidden, false);
    assert.ok(doc.getElementById('fullMapCanvas').getContext('2d').ops.length > 0);

    win.dispatchKey('Escape');
    assert.equal(minimap.fullMapOpen, false);
    assert.equal(doc.getElementById('fullMapOverlay').hidden, true);

    mapWrap.dispatchEvent({ type: 'click' });
    assert.equal(minimap.fullMapOpen, true);
    doc.getElementById('fullMapClose').dispatchEvent({ type: 'click' });
    assert.equal(minimap.fullMapOpen, false);

    minimap.destroy();
  });
});
