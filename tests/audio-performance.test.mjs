import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { EventBus } from '../src/core/EventBus.js';
import { SaveManager } from '../src/core/SaveManager.js';
import {
  NEON_RADIO_STATIONS,
  computeEngineRpmPitch,
  AudioManager
} from '../src/audio/AudioManager.js';
import {
  VRAM_BUDGET_MB,
  BUNDLE_BUDGET_MB,
  QUALITY_PRESETS,
  disposeObject3D,
  HalfResBloomPass,
  VehicleResourceManager,
  InstancedPropBatcher,
  estimateGpuVramMB,
  PerformanceManager
} from '../src/core/PerformanceManager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function makeMockStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k)
  };
}

function makeMockAudioContextClass() {
  const createdInstances = [];
  class MockParam {
    constructor(val = 0) {
      this.value = val;
      this.calls = [];
    }
    setTargetAtTime(v, t, tc) {
      this.value = v;
      this.calls.push(['setTargetAtTime', v, t, tc]);
    }
    setValueAtTime(v) { this.value = v; }
    linearRampToValueAtTime(v) { this.value = v; }
    exponentialRampToValueAtTime(v) { this.value = v; }
  }
  class MockNode {
    constructor(kind) {
      this.kind = kind;
      this.gain = new MockParam(1);
      this.frequency = new MockParam(440);
      this.Q = new MockParam(1);
      this.type = 'sine';
      this.started = false;
      this.stopped = false;
      this.buffer = null;
      this.loop = false;
    }
    connect(target) { return target; }
    start() { this.started = true; }
    stop() { this.stopped = true; }
  }
  class MockAudioContext {
    constructor() {
      this.state = 'running';
      this.sampleRate = 44100;
      this.currentTime = 1.0;
      this.destination = { kind: 'destination' };
      this.oscillators = [];
      this.suspendCalls = 0;
      this.resumeCalls = 0;
      createdInstances.push(this);
    }
    createGain() { return new MockNode('gain'); }
    createBiquadFilter() { return new MockNode('filter'); }
    createOscillator() {
      const n = new MockNode('osc');
      this.oscillators.push(n);
      return n;
    }
    createBufferSource() { return new MockNode('bufferSource'); }
    createBuffer(c, len) {
      const data = new Float32Array(len);
      return { getChannelData: () => data };
    }
    suspend() {
      this.state = 'suspended';
      this.suspendCalls += 1;
      return Promise.resolve();
    }
    resume() {
      this.state = 'running';
      this.resumeCalls += 1;
      return Promise.resolve();
    }
    close() {
      this.state = 'closed';
      return Promise.resolve();
    }
  }
  return { MockAudioContext, createdInstances };
}

function makeFakeThreeEnv() {
  const mem = { geometries: 0, textures: 0 };
  class FakeVector2 {
    constructor(x = 0, y = 0) { this.x = x; this.y = y; }
    set(x, y) { this.x = x; this.y = y; }
  }
  class FakeRenderTarget {
    constructor(w, h, opts = {}) {
      this.width = w; this.height = h; this.opts = opts;
      this.texture = { isTexture: true, dispose() {} };
      this.disposed = false;
      mem.textures += 1;
    }
    setSize(w, h) { this.width = w; this.height = h; }
    dispose() {
      if (!this.disposed) {
        this.disposed = true;
        mem.textures = Math.max(0, mem.textures - 1);
      }
    }
  }
  class FakeScene {
    constructor() { this.children = []; }
    add(o) { if (o) { o.parent = this; this.children.push(o); } }
    remove(o) { this.children = this.children.filter((c) => c !== o); if (o) o.parent = null; }
  }
  class FakeCamera {}
  class FakeGeometry {
    constructor() { this.userData = {}; this.disposed = false; mem.geometries += 1; }
    dispose() { if (!this.disposed) { this.disposed = true; mem.geometries = Math.max(0, mem.geometries - 1); } }
  }
  class FakeShaderMaterial {
    constructor(cfg) { this.uniforms = cfg.uniforms; this.disposed = false; }
    dispose() { this.disposed = true; }
  }
  class FakeMesh {
    constructor(geo, mat) { this.geometry = geo; this.material = mat; this.frustumCulled = true; }
  }
  class FakeObject3D {
    constructor() {
      this.position = { set() {} };
      this.rotation = { set() {} };
      this.scale = { set() {} };
      this.matrix = {};
    }
    updateMatrix() {}
  }
  class FakeInstancedMesh {
    constructor(geo, mat, count) {
      this.geometry = geo; this.material = mat; this.count = count;
      this.isInstancedMesh = true;
      this.instanceMatrix = { needsUpdate: false };
      this.instanceColor = { needsUpdate: false };
      this.matrices = [];
    }
    setMatrixAt(i, m) { this.matrices[i] = m; }
    setColorAt() {}
    dispose() {}
  }
  class FakeColor { set() {} }
  const gl = {
    info: { memory: mem },
    _target: null,
    getRenderTarget() { return this._target; },
    setRenderTarget(rt) { this._target = rt; },
    clear() {},
    render() {}
  };
  const THREE = {
    LinearFilter: 1006,
    Vector2: FakeVector2,
    WebGLRenderTarget: FakeRenderTarget,
    Scene: FakeScene,
    OrthographicCamera: FakeCamera,
    PlaneGeometry: FakeGeometry,
    ShaderMaterial: FakeShaderMaterial,
    Mesh: FakeMesh,
    Object3D: FakeObject3D,
    InstancedMesh: FakeInstancedMesh,
    Color: FakeColor
  };
  return { THREE, gl, mem };
}

describe('AudioManager Engine RPM, Radio Stations & Visibility Auto-Mute', () => {
  it('computes continuous finite engine RPM pitch scaling across gears and nitro', () => {
    const idle = computeEngineRpmPitch({ speedKmh: 0, vehicleType: 'supercar', nitro: false });
    const mid = computeEngineRpmPitch({ speedKmh: 95, vehicleType: 'supercar', nitro: false });
    const high = computeEngineRpmPitch({ speedKmh: 250, vehicleType: 'supercar', nitro: false });
    const boost = computeEngineRpmPitch({ speedKmh: 250, vehicleType: 'supercar', nitro: true });

    assert.equal(idle.gear, 1);
    assert.ok(high.gear >= 4);
    assert.ok(mid.baseFreqHz > idle.baseFreqHz);
    assert.ok(high.baseFreqHz > idle.baseFreqHz);
    assert.ok(boost.baseFreqHz > high.baseFreqHz);
    assert.ok(Number.isFinite(boost.filterCutoffHz));
  });

  it('switches 3 radio stations, creates 0 oscillators when muted, and suspends/resumes cleanly on visibilitychange', async () => {
    assert.equal(NEON_RADIO_STATIONS.length, 4);
    assert.deepEqual(
      NEON_RADIO_STATIONS.slice(1).map((s) => s.name),
      ['99.5 Neon FM', '104.2 Drift Radio', '88.0 Bay Beats']
    );

    const bus = new EventBus();
    const saveManager = new SaveManager({ storage: makeMockStorage(), eventBus: bus });
    const { MockAudioContext, createdInstances } = makeMockAudioContextClass();

    // Muted AudioManager must NEVER allocate AudioContext or oscillators
    const mutedMgr = new AudioManager({ eventBus: bus, saveManager, AudioContextCtor: MockAudioContext });
    mutedMgr.setMuted(true);
    await mutedMgr.unlock();
    assert.equal(createdInstances.length, 0);
    assert.equal(mutedMgr.playCrash(1.0).played, false);
    assert.equal(mutedMgr.playUiClick().played, false);

    // Unmuted AudioManager unlocks, plays radio/RPM/drift/crash, and handles visibilitychange cleanly
    const mgr = new AudioManager({ eventBus: bus, saveManager, AudioContextCtor: MockAudioContext });
    mgr.setMuted(false);
    const unlockRes = await mgr.unlock();
    assert.equal(unlockRes.unlocked, true);
    const ctx = mgr.ctx;
    assert.ok(ctx.oscillators.length > 0);

    mgr.setStation(1);
    mgr.update(0.4, { running: true, inCar: true, speedKmh: 165, vehicleType: 'sports', nitro: true, driftAmount: 0.7, sirenActive: true, wantedLevel: 3, sirenDistanceM: 10 });
    assert.ok(mgr.driftGain.gain.value > 0);
    assert.ok(mgr.sirenGain.gain.value > 0);
    assert.ok(mgr.radioGain.gain.value > 0);

    // Tab hidden -> immediate mute + suspend()
    mgr.handleVisibilityChange(true);
    assert.equal(mgr.visibilityMuted, true);
    assert.equal(mgr.masterGain.gain.value, 0);
    assert.equal(ctx.state, 'suspended');
    assert.equal(mgr.playCrash(0.8).played, false);

    // Tab visible -> resume() + restore masterGain
    mgr.handleVisibilityChange(false);
    assert.equal(mgr.visibilityMuted, false);
    assert.equal(ctx.state, 'running');
    assert.equal(mgr.masterGain.gain.value, 1.0);
    assert.equal(mgr.playCrash(0.8).played, true);
  });
});

describe('PerformanceManager (Quality Toggle, Half-Res Bloom, .dispose(), Instancing & Bundle Guard)', () => {
  it('switches Low <-> Medium <-> High with exact w/2 x h/2 bloom targets & SaveManager persistence', () => {
    const { THREE, gl, mem } = makeFakeThreeEnv();
    const bus = new EventBus();
    const storage = makeMockStorage();
    const saveManager = new SaveManager({ storage, eventBus: bus });
    const perf = new PerformanceManager({ THREE_ref: THREE, gl, saveManager, eventBus: bus });

    assert.equal(perf.quality, 'low');
    assert.equal(perf.bloom.enabled, false);
    assert.equal(perf.bloom.targetsAllocated, undefined); // metrics returns targetsAllocated on getMetrics

    perf.setQuality('medium', 1280, 720);
    let m = perf.bloom.getMetrics();
    assert.equal(m.enabled, true);
    assert.equal(m.halfWidth, 640);
    assert.equal(m.halfHeight, 360);
    assert.equal(m.targetsAllocated, true);
    assert.equal(mem.textures, 3); // sceneRT + 2 half-res bloom RTs

    perf.setQuality('high', 1920, 1080);
    m = perf.bloom.getMetrics();
    assert.equal(m.halfWidth, 960);
    assert.equal(m.halfHeight, 540);
    assert.equal(saveManager.getData().settings.graphicsQuality, 'high');

    // Dropping back to Low must dispose bloom targets (0 bloom textures)
    perf.setQuality('low', 1920, 1080);
    m = perf.bloom.getMetrics();
    assert.equal(m.enabled, false);
    assert.equal(m.targetsAllocated, false);
    assert.equal(mem.textures, 0);

    // Reloading SaveManager preserves 'medium'/'high' cleanly
    perf.setQuality('medium', 1000, 600);
    const perfReloaded = new PerformanceManager({
      THREE_ref: THREE,
      gl,
      saveManager: new SaveManager({ storage, eventBus: new EventBus() })
    });
    assert.equal(perfReloaded.quality, 'medium');
    assert.equal(QUALITY_PRESETS.low.glassBlur, false);
    assert.equal(QUALITY_PRESETS.high.bloomEnabled, true);
  });

  it('explicitly disposes swapped vehicle geometry/material/textures without touching shared assets & estimates VRAM < 150 MB', () => {
    const { THREE, gl, mem } = makeFakeThreeEnv();
    const scene = new THREE.Scene();
    const sharedTex = { isTexture: true, disposed: false, dispose() { this.disposed = true; } };
    const sharedGeo = new THREE.PlaneGeometry();
    sharedGeo.userData.shared = true;
    mem.geometries -= 1; // don't count external shared test object in swapped delta

    const makeVehicleGroup = () => {
      const g = {
        children: [],
        parent: null,
        add(c) { this.children.push(c); },
        remove(c) { this.children = this.children.filter((x) => x !== c); }
      };
      const ownedTex = { isTexture: true, disposed: false, dispose() { this.disposed = true; mem.textures = Math.max(0, mem.textures - 1); } };
      mem.textures += 1;
      const ownedMat = { map: ownedTex, normalMap: sharedTex, disposed: false, dispose() { this.disposed = true; } };
      const ownedGeo = new THREE.PlaneGeometry();
      g.children.push({ geometry: ownedGeo, material: ownedMat });
      g.children.push({ geometry: sharedGeo, material: ownedMat });
      return { g, ownedGeo, ownedMat, ownedTex };
    };

    const mgr = new VehicleResourceManager({ preserveTextures: [sharedTex] });
    const v1 = makeVehicleGroup();
    const v2 = makeVehicleGroup();
    mgr.swapVehicleMesh('hero', scene, v1.g);
    const swapRes = mgr.swapVehicleMesh('hero', scene, v2.g);

    assert.equal(v1.ownedGeo.disposed, true);
    assert.equal(v1.ownedMat.disposed, true);
    assert.equal(v1.ownedTex.disposed, true);
    assert.equal(sharedTex.disposed, false);
    assert.equal(sharedGeo.disposed, false);
    assert.equal(swapRes.freed.geometries, 1);
    assert.equal(swapRes.freed.textures, 1);

    mgr.clearAll(scene);
    assert.equal(mem.geometries, 0);
    assert.equal(mem.textures, 0);

    const vram = estimateGpuVramMB(gl, { enabled: true, fullWidth: 1920, fullHeight: 1080, halfWidth: 960, halfHeight: 540 }, 1024);
    assert.ok(vram < VRAM_BUDGET_MB);
  });

  it('batches repeated props into 1 InstancedMesh draw call & contains 0 TODO/banned terms & stays < 15 MB', () => {
    const { THREE } = makeFakeThreeEnv();
    const batcher = new InstancedPropBatcher({
      THREE_ref: THREE,
      geometry: new THREE.PlaneGeometry(),
      material: { dispose() {} },
      transforms: Array.from({ length: 40 }, (_, i) => ({ x: i * 10, y: 0, z: 0, color: '#00f0ff' })),
      name: 'TestBollards'
    });
    const stats = batcher.getStats();
    assert.equal(stats.drawCalls, 1);
    assert.equal(stats.instanceCount, 40);
    assert.equal(stats.hasMesh, true);
    batcher.dispose();

    const banned = /\b(grand theft auto|vice city|rockstar|lamborghini|ferrari|bmw|lucia|jason)\b|\bgta\b/i;
    const todoRe = /\/\/\s*TODO|\/\*\s*TODO/i;
    for (const rel of ['src/audio/AudioManager.js', 'src/core/PerformanceManager.js', 'src/core/audio-perf-runtime-wiring.js']) {
      const src = fs.readFileSync(path.join(rootDir, rel), 'utf8');
      assert.equal(todoRe.test(src), false, `${rel} zero TODO`);
      assert.equal(banned.test(src), false, `${rel} zero banned names`);
    }

    const auditPath = path.join(rootDir, 'www', 'bundle-audit.json');
    if (fs.existsSync(auditPath)) {
      const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
      assert.equal(audit.withinBudget, true);
      assert.ok(audit.totalMB < BUNDLE_BUDGET_MB);
    }
  });
});
