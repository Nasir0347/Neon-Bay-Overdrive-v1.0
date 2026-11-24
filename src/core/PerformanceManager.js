/**
 * 60 FPS Performance, Half-Resolution Selective Bloom (width/2, height/2),
 * InstancedMesh Batching, Explicit .dispose() Vehicle Swap Cleanup, GPU VRAM Budget,
 * and Lazy Chunk Loading for Neon Bay: Overdrive.
 * Pure zero-import ES Module.
 */

export const VRAM_BUDGET_MB = 150;
export const BUNDLE_BUDGET_MB = 15;

export const QUALITY_PRESETS = Object.freeze({
  low: Object.freeze({
    id: 'low',
    label: 'LOW',
    bloomEnabled: false,
    bloomStrength: 0,
    bloomThreshold: 0.9,
    shadowMapMobile: 512,
    shadowMapDesktop: 1024,
    maxDprMobile: 1.0,
    maxDprDesktop: 1.0,
    glassBlur: false
  }),
  medium: Object.freeze({
    id: 'medium',
    label: 'MEDIUM',
    bloomEnabled: true,
    bloomStrength: 0.42,
    bloomThreshold: 0.72,
    shadowMapMobile: 768,
    shadowMapDesktop: 1024,
    maxDprMobile: 1.15,
    maxDprDesktop: 1.25,
    glassBlur: true
  }),
  high: Object.freeze({
    id: 'high',
    label: 'HIGH',
    bloomEnabled: true,
    bloomStrength: 0.62,
    bloomThreshold: 0.66,
    shadowMapMobile: 1024,
    shadowMapDesktop: 2048,
    maxDprMobile: 1.5,
    maxDprDesktop: 2.0,
    glassBlur: true
  })
});

const TEXTURE_SLOTS = [
  'map', 'normalMap', 'roughnessMap', 'metalnessMap',
  'emissiveMap', 'bumpMap', 'aoMap', 'alphaMap', 'lightMap', 'specularMap'
];

export function normalizeQualityId(raw) {
  if (typeof raw !== 'string') return 'low';
  const low = raw.toLowerCase();
  if (low === 'high' || low === 'ultra') return 'high';
  if (low === 'medium' || low === 'med') return 'medium';
  return 'low';
}

export function disposeObject3D(root, { preserveTextures = [] } = {}) {
  const stats = { geometries: 0, materials: 0, textures: 0 };
  if (!root) return stats;

  const preserveSet = new Set(Array.isArray(preserveTextures) ? preserveTextures.filter(Boolean) : []);
  const disposedGeos = new Set();
  const disposedMats = new Set();
  const disposedTexs = new Set();

  const disposeMaterial = (mat) => {
    if (!mat || mat.userData?.shared || disposedMats.has(mat)) return;
    disposedMats.add(mat);
    for (const slot of TEXTURE_SLOTS) {
      const tex = mat[slot];
      if (tex && !preserveSet.has(tex) && !tex.userData?.shared && !disposedTexs.has(tex)) {
        disposedTexs.add(tex);
        if (typeof tex.dispose === 'function') {
          tex.dispose();
          stats.textures += 1;
        }
      }
    }
    if (typeof mat.dispose === 'function') {
      mat.dispose();
      stats.materials += 1;
    }
  };

  const visit = (node) => {
    if (!node) return;
    if (node.geometry && !node.geometry.userData?.shared && !disposedGeos.has(node.geometry)) {
      disposedGeos.add(node.geometry);
      if (typeof node.geometry.dispose === 'function') {
        node.geometry.dispose();
        stats.geometries += 1;
      }
    }
    if (Array.isArray(node.material)) {
      for (const m of node.material) disposeMaterial(m);
    } else if (node.material) {
      disposeMaterial(node.material);
    }
    if (Array.isArray(node.children)) {
      for (const ch of node.children) visit(ch);
    }
  };

  visit(root);
  return stats;
}

const BLOOM_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const BLOOM_H_FRAG = `
uniform sampler2D tDiffuse;
uniform vec2 uTexelSize;
uniform float uThreshold;
varying vec2 vUv;
vec3 sampleBright(vec2 uv) {
  vec3 c = texture2D(tDiffuse, uv).rgb;
  float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float w = smoothstep(uThreshold, uThreshold + 0.35, lum);
  return c * w;
}
void main() {
  vec3 sum = sampleBright(vUv) * 0.227027;
  sum += sampleBright(vUv + vec2(uTexelSize.x * 1.3846, 0.0)) * 0.316216;
  sum += sampleBright(vUv - vec2(uTexelSize.x * 1.3846, 0.0)) * 0.316216;
  sum += sampleBright(vUv + vec2(uTexelSize.x * 3.2308, 0.0)) * 0.070270;
  sum += sampleBright(vUv - vec2(uTexelSize.x * 3.2308, 0.0)) * 0.070270;
  gl_FragColor = vec4(sum, 1.0);
}
`;

const BLOOM_V_FRAG = `
uniform sampler2D tDiffuse;
uniform vec2 uTexelSize;
varying vec2 vUv;
void main() {
  vec3 sum = texture2D(tDiffuse, vUv).rgb * 0.227027;
  sum += texture2D(tDiffuse, vUv + vec2(0.0, uTexelSize.y * 1.3846)).rgb * 0.316216;
  sum += texture2D(tDiffuse, vUv - vec2(0.0, uTexelSize.y * 1.3846)).rgb * 0.316216;
  sum += texture2D(tDiffuse, vUv + vec2(0.0, uTexelSize.y * 3.2308)).rgb * 0.070270;
  sum += texture2D(tDiffuse, vUv - vec2(0.0, uTexelSize.y * 3.2308)).rgb * 0.070270;
  gl_FragColor = vec4(sum, 1.0);
}
`;

const BLOOM_COMP_FRAG = `
uniform sampler2D tBase;
uniform sampler2D tBloom;
uniform float uStrength;
varying vec2 vUv;
void main() {
  vec4 base = texture2D(tBase, vUv);
  vec3 bloom = texture2D(tBloom, vUv).rgb;
  gl_FragColor = vec4(base.rgb + bloom * uStrength, base.a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export class HalfResBloomPass {
  constructor({ THREE_ref = globalThis.THREE || null, strength = 0.55, threshold = 0.68 } = {}) {
    this.THREE = THREE_ref || null;
    this.enabled = false;
    this.strength = strength;
    this.threshold = threshold;
    this.fullWidth = 0;
    this.fullHeight = 0;
    this.halfWidth = 0;
    this.halfHeight = 0;

    this.sceneRT = null;
    this.bloomRT1 = null;
    this.bloomRT2 = null;
    this._quadScene = null;
    this._quadCam = null;
    this._quadMesh = null;
    this._hMat = null;
    this._vMat = null;
    this._compMat = null;
  }

  _ensureQuad() {
    const T = this.THREE;
    if (this._quadScene || !T || !T.ShaderMaterial || !T.Scene || !T.PlaneGeometry) return false;
    this._quadScene = new T.Scene();
    this._quadCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geo = new T.PlaneGeometry(2, 2);

    this._hMat = new T.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        uTexelSize: { value: new T.Vector2(1 / Math.max(1, this.halfWidth), 1 / Math.max(1, this.halfHeight)) },
        uThreshold: { value: this.threshold }
      },
      vertexShader: BLOOM_VERT,
      fragmentShader: BLOOM_H_FRAG,
      depthTest: false,
      depthWrite: false
    });

    this._vMat = new T.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        uTexelSize: { value: new T.Vector2(1 / Math.max(1, this.halfWidth), 1 / Math.max(1, this.halfHeight)) }
      },
      vertexShader: BLOOM_VERT,
      fragmentShader: BLOOM_V_FRAG,
      depthTest: false,
      depthWrite: false
    });

    this._compMat = new T.ShaderMaterial({
      uniforms: {
        tBase: { value: null },
        tBloom: { value: null },
        uStrength: { value: this.strength }
      },
      vertexShader: BLOOM_VERT,
      fragmentShader: BLOOM_COMP_FRAG,
      depthTest: false,
      depthWrite: false
    });

    this._quadMesh = new T.Mesh(geo, this._compMat);
    this._quadMesh.frustumCulled = false;
    this._quadScene.add(this._quadMesh);
    return true;
  }

  _allocTargets(width, height) {
    const w = Math.max(2, Math.floor(Number(width) || 960));
    const h = Math.max(2, Math.floor(Number(height) || 540));
    const hw = Math.max(1, Math.floor(w / 2));
    const hh = Math.max(1, Math.floor(h / 2));

    this.fullWidth = w;
    this.fullHeight = h;
    this.halfWidth = hw;
    this.halfHeight = hh;

    const T = this.THREE;
    if (!T?.WebGLRenderTarget) return;

    if (!this.sceneRT) {
      this.sceneRT = new T.WebGLRenderTarget(w, h, {
        minFilter: T.LinearFilter,
        magFilter: T.LinearFilter,
        depthBuffer: true,
        stencilBuffer: false
      });
    } else if (this.sceneRT.width !== w || this.sceneRT.height !== h) {
      this.sceneRT.setSize(w, h);
    }

    const halfOpts = {
      minFilter: T.LinearFilter,
      magFilter: T.LinearFilter,
      depthBuffer: false,
      stencilBuffer: false
    };
    if (!this.bloomRT1) this.bloomRT1 = new T.WebGLRenderTarget(hw, hh, halfOpts);
    else if (this.bloomRT1.width !== hw || this.bloomRT1.height !== hh) this.bloomRT1.setSize(hw, hh);

    if (!this.bloomRT2) this.bloomRT2 = new T.WebGLRenderTarget(hw, hh, halfOpts);
    else if (this.bloomRT2.width !== hw || this.bloomRT2.height !== hh) this.bloomRT2.setSize(hw, hh);

    if (this._hMat) this._hMat.uniforms.uTexelSize.value.set(1 / hw, 1 / hh);
    if (this._vMat) this._vMat.uniforms.uTexelSize.value.set(1 / hw, 1 / hh);
  }

  setEnabled(enabled, width = 960, height = 540, { strength, threshold } = {}) {
    if (Number.isFinite(strength)) {
      this.strength = strength;
      if (this._compMat) this._compMat.uniforms.uStrength.value = strength;
    }
    if (Number.isFinite(threshold)) {
      this.threshold = threshold;
      if (this._hMat) this._hMat.uniforms.uThreshold.value = threshold;
    }

    if (!enabled) {
      this.enabled = false;
      this.disposeTargets();
      return this.getMetrics();
    }

    this.enabled = true;
    this._ensureQuad();
    this._allocTargets(width, height);
    return this.getMetrics();
  }

  resize(width, height) {
    if (!this.enabled) {
      this.fullWidth = Math.max(0, Math.floor(Number(width) || 0));
      this.fullHeight = Math.max(0, Math.floor(Number(height) || 0));
      this.halfWidth = Math.floor(this.fullWidth / 2);
      this.halfHeight = Math.floor(this.fullHeight / 2);
      return this.getMetrics();
    }
    this._allocTargets(width, height);
    return this.getMetrics();
  }

  render(gl, scene, camera) {
    if (!this.enabled || !gl || !scene || !camera || !this.sceneRT || !this._quadScene) {
      gl?.render?.(scene, camera);
      return;
    }

    const prevTarget = gl.getRenderTarget?.() ?? null;
    gl.setRenderTarget(this.sceneRT);
    gl.clear?.();
    gl.render(scene, camera);

    this._quadMesh.material = this._hMat;
    this._hMat.uniforms.tDiffuse.value = this.sceneRT.texture;
    gl.setRenderTarget(this.bloomRT1);
    gl.clear?.();
    gl.render(this._quadScene, this._quadCam);

    this._quadMesh.material = this._vMat;
    this._vMat.uniforms.tDiffuse.value = this.bloomRT1.texture;
    gl.setRenderTarget(this.bloomRT2);
    gl.clear?.();
    gl.render(this._quadScene, this._quadCam);

    this._quadMesh.material = this._compMat;
    this._compMat.uniforms.tBase.value = this.sceneRT.texture;
    this._compMat.uniforms.tBloom.value = this.bloomRT2.texture;
    gl.setRenderTarget(prevTarget);
    gl.render(this._quadScene, this._quadCam);
  }

  getMetrics() {
    return {
      enabled: this.enabled,
      fullWidth: this.fullWidth,
      fullHeight: this.fullHeight,
      halfWidth: this.halfWidth,
      halfHeight: this.halfHeight,
      strength: this.strength,
      targetsAllocated: !!(this.sceneRT && this.bloomRT1 && this.bloomRT2)
    };
  }

  disposeTargets() {
    this.sceneRT?.dispose?.();
    this.bloomRT1?.dispose?.();
    this.bloomRT2?.dispose?.();
    this.sceneRT = null;
    this.bloomRT1 = null;
    this.bloomRT2 = null;
  }

  dispose() {
    this.disposeTargets();
    this._quadMesh?.geometry?.dispose?.();
    this._hMat?.dispose?.();
    this._vMat?.dispose?.();
    this._compMat?.dispose?.();
    this._quadScene = null;
    this._quadMesh = null;
    this._hMat = null;
    this._vMat = null;
    this._compMat = null;
  }
}

export class VehicleResourceManager {
  constructor({ preserveTextures = [] } = {}) {
    this.slots = new Map();
    this.preserveTextures = preserveTextures;
    this.stats = {
      swaps: 0,
      disposedGeometries: 0,
      disposedMaterials: 0,
      disposedTextures: 0
    };
  }

  swapVehicleMesh(slotKey, parent, nextMesh, { preserveTextures = this.preserveTextures } = {}) {
    const prevMesh = this.slots.get(slotKey) || null;
    let freed = { geometries: 0, materials: 0, textures: 0 };

    if (prevMesh && prevMesh !== nextMesh) {
      if (parent && typeof parent.remove === 'function') {
        parent.remove(prevMesh);
      }
      freed = disposeObject3D(prevMesh, { preserveTextures });
      this.stats.swaps += 1;
      this.stats.disposedGeometries += freed.geometries;
      this.stats.disposedMaterials += freed.materials;
      this.stats.disposedTextures += freed.textures;
    }

    if (nextMesh) {
      this.slots.set(slotKey, nextMesh);
      if (parent && typeof parent.add === 'function' && nextMesh.parent !== parent) {
        parent.add(nextMesh);
      }
    } else {
      this.slots.delete(slotKey);
    }

    return { slotKey, freed, cumulative: { ...this.stats } };
  }

  clearAll(parent = null) {
    for (const slotKey of [...this.slots.keys()]) {
      this.swapVehicleMesh(slotKey, parent, null);
    }
    return { ...this.stats };
  }
}

export class InstancedPropBatcher {
  constructor({
    THREE_ref = globalThis.THREE || null,
    geometry = null,
    material = null,
    transforms = [],
    name = 'InstancedProps'
  } = {}) {
    this.THREE = THREE_ref;
    this.name = name;
    this.instanceCount = Array.isArray(transforms) ? transforms.length : 0;
    this.mesh = null;

    const T = this.THREE;
    if (T?.InstancedMesh && geometry && material && this.instanceCount > 0) {
      const im = new T.InstancedMesh(geometry, material, this.instanceCount);
      im.name = name;
      im.frustumCulled = false;
      const dummy = new T.Object3D();
      const scratchCol = T.Color ? new T.Color() : null;

      for (let i = 0; i < transforms.length; i++) {
        const tf = transforms[i];
        dummy.position.set(tf.x || 0, tf.y || 0, tf.z || 0);
        dummy.rotation.set(tf.rotX || 0, tf.rotY || 0, tf.rotZ || 0);
        dummy.scale.set(tf.scaleX ?? 1, tf.scaleY ?? 1, tf.scaleZ ?? 1);
        dummy.updateMatrix();
        im.setMatrixAt(i, dummy.matrix);
        if (tf.color && scratchCol && typeof im.setColorAt === 'function') {
          scratchCol.set(tf.color);
          im.setColorAt(i, scratchCol);
        }
      }
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      this.mesh = im;
    }
  }

  getStats() {
    return {
      name: this.name,
      drawCalls: this.instanceCount > 0 ? 1 : 0,
      instanceCount: this.instanceCount,
      hasMesh: !!this.mesh
    };
  }

  dispose() {
    if (this.mesh) {
      if (typeof this.mesh.dispose === 'function') this.mesh.dispose();
      this.mesh.geometry?.dispose?.();
      this.mesh.material?.dispose?.();
      this.mesh = null;
    }
  }
}

export class LazyChunkLoader {
  constructor({ doc = globalThis.document || null, basePath = 'chunks/' } = {}) {
    this.doc = doc || null;
    this.basePath = basePath;
    this.loaded = new Map();
    this.inFlight = new Map();
  }

  isLoaded(chunkId) {
    return this.loaded.has(chunkId);
  }

  loadChunk(chunkId, customSrc = null) {
    if (this.loaded.has(chunkId)) {
      return Promise.resolve({ chunkId, cached: true, payload: this.loaded.get(chunkId) });
    }
    if (this.inFlight.has(chunkId)) {
      return this.inFlight.get(chunkId);
    }

    const src = customSrc || `${this.basePath}${chunkId}.js`;
    const promise = new Promise((resolve, reject) => {
      if (!this.doc?.createElement || !this.doc?.head) {
        this.loaded.set(chunkId, { src, lazy: true });
        resolve({ chunkId, cached: false, payload: this.loaded.get(chunkId) });
        return;
      }
      const script = this.doc.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => {
        const data = globalThis.__NEON_LAZY_CHUNKS__?.[chunkId] || { src, loaded: true };
        this.loaded.set(chunkId, data);
        this.inFlight.delete(chunkId);
        resolve({ chunkId, cached: false, payload: data });
      };
      script.onerror = () => {
        this.inFlight.delete(chunkId);
        reject(new Error(`Failed to load lazy chunk: ${src}`));
      };
      this.doc.head.appendChild(script);
    });

    this.inFlight.set(chunkId, promise);
    return promise;
  }
}

export function estimateGpuVramMB(gl, bloomMetrics = null, shadowSize = 1024) {
  const mem = gl?.info?.memory || { geometries: 0, textures: 0 };
  const geoMB = (Number(mem.geometries) || 0) * 0.018;
  const texMB = (Number(mem.textures) || 0) * 0.28;
  const shadowMB = ((Number(shadowSize) || 1024) ** 2 * 4) / (1024 * 1024);
  let bloomMB = 0;
  if (bloomMetrics?.enabled && bloomMetrics.fullWidth > 0 && bloomMetrics.fullHeight > 0) {
    const fullBytes = bloomMetrics.fullWidth * bloomMetrics.fullHeight * 4;
    const halfBytes = bloomMetrics.halfWidth * bloomMetrics.halfHeight * 4 * 2;
    bloomMB = (fullBytes + halfBytes) / (1024 * 1024);
  }
  const total = geoMB + texMB + shadowMB + bloomMB;
  return Math.round(total * 100) / 100;
}

export class PerformanceManager {
  constructor({
    THREE_ref = globalThis.THREE || null,
    gl = null,
    saveManager = null,
    eventBus = null,
    doc = globalThis.document || null,
    win = globalThis.window || null,
    preserveTextures = []
  } = {}) {
    this.THREE = THREE_ref;
    this.gl = gl;
    this.saveManager = saveManager || null;
    this.eventBus = eventBus || null;
    this.doc = doc || null;
    this.win = win || null;

    const savedQ = this.saveManager?.getData?.()?.settings?.graphicsQuality || 'low';
    this.quality = normalizeQualityId(savedQ);
    this.bloom = new HalfResBloomPass({ THREE_ref: this.THREE });
    this.vehicles = new VehicleResourceManager({ preserveTextures });
    this.loader = new LazyChunkLoader({ doc: this.doc });
    this.batchers = [];
  }

  registerBatcher(batcher) {
    if (batcher) this.batchers.push(batcher);
    return batcher;
  }

  getInstancedStats() {
    let batchCount = 0;
    let totalInstances = 0;
    for (const b of this.batchers) {
      const s = b.getStats();
      if (s.instanceCount > 0) {
        batchCount += 1;
        totalInstances += s.instanceCount;
      }
    }
    return {
      instancedMeshCount: batchCount,
      totalBatchedInstances: totalInstances,
      drawCallsSaved: Math.max(0, totalInstances - batchCount)
    };
  }

  setQuality(rawQuality, width = 960, height = 540) {
    const q = normalizeQualityId(rawQuality);
    this.quality = q;
    const preset = QUALITY_PRESETS[q];

    if (this.doc?.body?.classList) {
      this.doc.body.classList.toggle('gfx-low', !preset.glassBlur);
    }

    this.bloom.setEnabled(preset.bloomEnabled, width, height, {
      strength: preset.bloomStrength,
      threshold: preset.bloomThreshold
    });

    this.saveManager?.setGraphicsQuality?.(q);
    this.eventBus?.emit?.('perf:qualityChange', {
      quality: q,
      preset,
      bloom: this.bloom.getMetrics()
    });
    return { quality: q, preset, bloom: this.bloom.getMetrics() };
  }

  onResize(width, height) {
    return this.bloom.resize(width, height);
  }

  getReport(glRef = this.gl, sceneRef = null, shadowSize = 1024) {
    const bloomMetrics = this.bloom.getMetrics();
    const estimatedVramMB = estimateGpuVramMB(glRef, bloomMetrics, shadowSize);
    let instancedMeshCount = 0;
    if (sceneRef?.traverse) {
      sceneRef.traverse((o) => {
        if (o?.isInstancedMesh) instancedMeshCount += 1;
      });
    }
    return {
      quality: this.quality,
      bloom: bloomMetrics,
      vehicleResources: { ...this.vehicles.stats },
      batchedProps: this.getInstancedStats(),
      sceneInstancedMeshes: instancedMeshCount,
      estimatedVramMB,
      withinVramBudget: estimatedVramMB < VRAM_BUDGET_MB
    };
  }

  dispose() {
    this.bloom.dispose();
    this.vehicles.clearAll();
    for (const b of this.batchers.splice(0)) b.dispose();
  }
}
