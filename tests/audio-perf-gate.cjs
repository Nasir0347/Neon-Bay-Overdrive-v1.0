const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  // 1. Audit production bundle sizes in www/bundle-audit.json (< 15 MB budget)
  const auditPath = path.resolve(__dirname, '../www/bundle-audit.json');
  const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
  assert.ok(audit.withinBudget && audit.totalMB < 15 && audit.initialBootMB < 15, `Bundle exceeds 15 MB budget: ${audit.totalMB} MB`);

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [];
  const checks = [];
  const ck = (cond, msg) => {
    assert.ok(cond, msg);
    checks.push(msg);
  };
  ck(audit.withinBudget, `Production bundle audit passes (${audit.initialBootMB} MB initial / ${audit.totalMB} MB total < 15 MB)`);

  const url = 'file:///' + path.resolve(__dirname, '../www/index.html').replace(/\\/g, '/');
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => errors.push('pageerror:' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console:' + m.text());
  });

  await page.goto(url);
  await page.waitForFunction(() => window.gameReady && window.NeonAudio && window.NeonPerf && running === true);

  // 2. Test AudioManager unlock, 3 Radio Stations, RPM modulation, and visibilitychange mute/unmute
  const audioCheck = await page.evaluate(async () => {
    await window.NeonAudio.unlock();
    const stations = [];
    for (const idx of [1, 2, 3, 0]) {
      const s = window.NeonAudio.setStation(idx);
      window.NeonAudio.update(0.4, { running: true, inCar: true, speedKmh: 145, vehicleType: 'supercar', nitro: true, driftAmount: 0.65, sirenActive: true, wantedLevel: 3 });
      stations.push(s.name);
    }
    const rpmHigh = window.NeonAudio.lastEngineMetrics.baseFreqHz;
    window.NeonAudio.handleVisibilityChange(true);
    await window.NeonAudio._pendingStatePromise;
    await new Promise((r) => setTimeout(r, 40));
    const mutedState = {
      hiddenMuted: window.NeonAudio.visibilityMuted,
      suspended: window.NeonAudio.isSuspended,
      ctxState: window.NeonAudio.ctx?.state,
      masterGain: window.NeonAudio.masterGain?.gain?.value,
      crashBlocked: window.NeonAudio.playCrash(0.8).played
    };
    window.NeonAudio.handleVisibilityChange(false);
    await window.NeonAudio._pendingStatePromise;
    await new Promise((r) => setTimeout(r, 40));
    const resumedState = {
      hiddenMuted: window.NeonAudio.visibilityMuted,
      suspended: window.NeonAudio.isSuspended,
      ctxState: window.NeonAudio.ctx?.state,
      masterGain: window.NeonAudio.masterGain?.gain?.value
    };
    return { stations, rpmHigh, mutedState, resumedState };
  });
  ck(
    audioCheck.stations.includes('99.5 Neon FM') &&
      audioCheck.stations.includes('104.2 Drift Radio') &&
      audioCheck.stations.includes('88.0 Bay Beats') &&
      audioCheck.rpmHigh > 100 &&
      audioCheck.mutedState.hiddenMuted &&
      audioCheck.mutedState.suspended &&
      audioCheck.mutedState.ctxState === 'suspended' &&
      audioCheck.mutedState.crashBlocked === false &&
      !audioCheck.resumedState.hiddenMuted &&
      audioCheck.resumedState.ctxState === 'running',
    `AudioManager streams 3 Radio Stations, scales RPM pitch & suspends/resumes cleanly on visibilitychange (${JSON.stringify(audioCheck)})`
  );

  // 3. Test live Low <-> Medium <-> High Graphics Quality switches + Half-Res Bloom + 0 WebGL errors
  const qualityTransitions = await page.evaluate(() => {
    const rawGl = gl.getContext();
    while (rawGl.getError() !== 0) {} // drain prior state if any
    const snap = [];
    for (const q of ['low', 'medium', 'high', 'low', 'high']) {
      window.NeonPerf.setQuality(q);
      render(performance.now());
      render(performance.now() + 16);
      const err = rawGl.getError();
      const bm = window.NeonPerf.bloom.getMetrics();
      snap.push({
        q,
        actualQ: window.NeonPerf.quality,
        canvasW: canvas.width,
        canvasH: canvas.height,
        bloomEnabled: bm.enabled,
        halfW: bm.halfWidth,
        halfH: bm.halfHeight,
        targetsAllocated: bm.targetsAllocated,
        glErr: err
      });
    }
    return snap;
  });

  const medSnap = qualityTransitions.find((s) => s.q === 'medium');
  const lowSnap = qualityTransitions[3];
  const highSnap = qualityTransitions[4];
  ck(
    qualityTransitions.every((s) => s.glErr === 0) &&
      medSnap.bloomEnabled &&
      medSnap.halfW === Math.floor(medSnap.canvasW / 2) &&
      medSnap.halfH === Math.floor(medSnap.canvasH / 2) &&
      !lowSnap.bloomEnabled &&
      !lowSnap.targetsAllocated &&
      highSnap.bloomEnabled &&
      highSnap.halfW === Math.floor(highSnap.canvasW / 2) &&
      highSnap.halfH === Math.floor(highSnap.canvasH / 2),
    `Low <-> Medium <-> High Half-Res Bloom switches cleanly with 0 WebGL errors (${highSnap.halfW}x${highSnap.halfH})`
  );

  // Verify SaveManager persistence of High quality across full reload
  await page.reload();
  await page.waitForFunction(() => window.gameReady && window.NeonPerf && running === true);
  const persistedQ = await page.evaluate(() => ({
    quality: window.NeonPerf.quality,
    saved: window.NeonSave.getData().settings.graphicsQuality,
    bloomEnabled: window.NeonPerf.bloom.enabled
  }));
  ck(persistedQ.quality === 'high' && persistedQ.saved === 'high' && persistedQ.bloomEnabled,
    'High Graphics Quality & Half-Res Bloom persist cleanly across page reload');

  // Restore 'low' cleanly for steady baseline check
  await page.evaluate(() => window.NeonPerf.setQuality('low'));

  // 4. Test explicit .dispose() cleanup across 10 live Three.js vehicle mesh swaps + GPU VRAM < 150 MB
  const disposeCheck = await page.evaluate(() => {
    render(performance.now());
    const baseMem = { geos: gl.info.memory.geometries, texs: gl.info.memory.textures };
    const createdTextures = [];
    for (let i = 0; i < 10; i++) {
      const grp = new THREE.Group();
      const c = document.createElement('canvas');
      c.width = 64; c.height = 64;
      const ctx2 = c.getContext('2d');
      ctx2.fillStyle = `#${((i + 1) * 19).toString(16).padStart(2, '0')}f0ff`;
      ctx2.fillRect(0, 0, 64, 64);
      const tex = new THREE.CanvasTexture(c);
      createdTextures.push(tex);
      const bodyGeo = new THREE.BoxGeometry(2, 1, 4.5);
      const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.25, 10);
      const mat = new THREE.MeshStandardMaterial({ map: tex });
      grp.add(new THREE.Mesh(bodyGeo, mat), new THREE.Mesh(wheelGeo, mat));
      window.NeonPerf.vehicles.swapVehicleMesh('swapTest', scene, grp);
      render(performance.now() + (i + 1) * 16);
    }
    const statsMid = { ...window.NeonPerf.vehicles.stats };
    window.NeonPerf.vehicles.clearAll(scene);
    render(performance.now() + 300);
    const afterMem = { geos: gl.info.memory.geometries, texs: gl.info.memory.textures };
    const report = window.NeonPerf.getReport(gl, scene, 1024);
    return { baseMem, afterMem, statsMid, report };
  });

  ck(
    disposeCheck.afterMem.geos === disposeCheck.baseMem.geos &&
      disposeCheck.afterMem.texs === disposeCheck.baseMem.texs &&
      disposeCheck.statsMid.swaps === 9 &&
      disposeCheck.statsMid.disposedGeometries >= 18 &&
      disposeCheck.statsMid.disposedTextures >= 9 &&
      disposeCheck.report.withinVramBudget &&
      disposeCheck.report.estimatedVramMB < 150,
    `Vehicle swap .dispose() cleans all GPU geos/textures cleanly (${disposeCheck.baseMem.geos}/${disposeCheck.baseMem.texs} -> ${disposeCheck.afterMem.geos}/${disposeCheck.afterMem.texs}, VRAM ${disposeCheck.report.estimatedVramMB} MB < 150 MB)`
  );

  // 5. Verify InstancedMesh batching + LazyChunkLoader
  const batchLazyRes = await page.evaluate(async () => {
    const instStats = window.NeonPerf.getInstancedStats();
    const report = window.NeonPerf.getReport(gl, scene, 1024);
    const chunkRes = await window.NeonPerf.loader.loadChunk('neon-lazy-pack');
    return {
      instStats,
      sceneInstancedMeshes: report.sceneInstancedMeshes,
      chunkLoaded: chunkRes.payload?.city2Preview?.name === 'Mirage Valley' && window.NeonPerf.loader.isLoaded('neon-lazy-pack')
    };
  });
  ck(
    batchLazyRes.instStats.instancedMeshCount >= 2 &&
      batchLazyRes.instStats.totalBatchedInstances >= 96 &&
      batchLazyRes.sceneInstancedMeshes >= 2 &&
      batchLazyRes.chunkLoaded,
    `InstancedMesh batching active (${batchLazyRes.instStats.instancedMeshCount} Neon batches / ${batchLazyRes.instStats.totalBatchedInstances} instances, ${batchLazyRes.sceneInstancedMeshes} total scene InstancedMeshes) & LazyChunkLoader verified`
  );

  ck(errors.length === 0, `Zero console/WebGL/page errors (${errors.join('; ')})`);

  await page.close();
  await browser.close();

  const out = { passed: checks.length, errors, checks, bundleAudit: audit };
  fs.writeFileSync('tests/audio-perf-gate-results.json', JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
