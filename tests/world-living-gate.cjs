const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [];
  const checks = [];
  const ck = (cond, msg) => {
    assert.ok(cond, msg);
    checks.push(msg);
  };

  const url = 'file:///' + path.resolve(__dirname, '../www/index.html').replace(/\\/g, '/');
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => errors.push('pageerror:' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console:' + m.text());
  });

  await page.goto(url);
  await page.waitForFunction(() => window.gameReady && window.NeonPolice && window.NeonTraffic && window.NeonDestructibles && window.NeonVehicleDamage && running === true);

  // Baseline scene & GPU memory snapshot (must stay bounded with 0 delta!)
  const baseline = await page.evaluate(() => {
    render(performance.now());
    let totalSceneNodes = 0;
    scene.traverse(() => { totalSceneNodes++; });
    return {
      sceneChildren: scene.children.length,
      totalSceneNodes,
      geometries: gl.info.memory.geometries,
      textures: gl.info.memory.textures,
      trafficPoolSize: window.NeonTraffic.pool.length,
      totalProps: window.NeonDestructibles.props.length,
      cruiserPoolSize: window.NeonPolice.cruisers.length,
      swatPoolSize: window.NeonPolice.swatUnits.length,
      rbPoolSize: window.NeonPolice.roadblocks.length
    };
  });

  // 1. Wanted Escalation 0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 0 (Escape via broken LOS) x 2 cycles
  const policeAudit = await page.evaluate(() => {
    settings.difficulty = 'normal';
    window.freeRoamWanted = true;
    inCar = true;
    ride = 'supercar';
    Object.assign(cityVehicles.supercar, { x: 0, z: -20, yaw: 0, hp: 100 });
    Object.assign(player, cityVehicles.supercar);

    const tiersSeen = [];
    for (let s = 1; s <= 5; s++) {
      window.setWantedLevel(s);
      update(0.05);
      render(performance.now());
      const st = window.NeonPolice.getSnapshot();
      const ws = window.worldLivingState;
      tiersSeen.push({
        star: s,
        cruisers: st.activeCruisers,
        swat: st.activeSwat,
        rb: st.activeRoadblocks,
        heli: st.helicopterActive,
        lockdown: st.lockdownActive,
        swatVisCount: ws.swatMeshes.filter((m) => m.visible).length,
        extraCruisersVis: ws.extraCruisers.filter((m) => m.visible).length
      });
    }

    // Break LOS far behind buildings (Depot alley around (-200, 185)) & step clock until wanted clears cleanly
    const origHasLos = window.NeonPolice.hasLineOfSight;
    window.NeonPolice.hasLineOfSight = () => false;
    Object.assign(cityVehicles.supercar, { x: -240, z: 240, yaw: 0 });
    Object.assign(player, cityVehicles.supercar);
    velocity = 22;

    let flashingSeen = false;
    for (let i = 0; i < 110 && window.NeonPolice.wantedLevel > 0; i++) {
      playTime += 0.2;
      update(0.2);
      render(performance.now());
      if (window.NeonPolice.starsFlashing) flashingSeen = true;
    }
    window.NeonPolice.hasLineOfSight = origHasLos;
    const afterEscape = {
      wantedLevel: window.wantedLevel,
      pmLevel: window.NeonPolice.wantedLevel,
      state: window.NeonPolice.state,
      escapes: window.NeonPolice.totalEscapes,
      extraCruisersVis: window.worldLivingState.extraCruisers.filter((m) => m.visible).length,
      swatVis: window.worldLivingState.swatMeshes.filter((m) => m.visible).length,
      extraRbVis: window.worldLivingState.extraRoadblocks.filter((m) => m.visible).length,
      heliVis: window.worldLivingState.heliRoot.visible
    };

    // Second quick 0 -> 5 -> 0 cycle to confirm pool re-use
    window.setWantedLevel(5);
    render(performance.now());
    const reEscalated = window.NeonPolice.getSnapshot();
    window.clearWanted();
    render(performance.now());

    return { tiersSeen, flashingSeen, afterEscape, reEscalated };
  });

  ck(policeAudit.tiersSeen.length === 5 &&
    policeAudit.tiersSeen[2].rb === 1 &&
    policeAudit.tiersSeen[3].swat === 1 && policeAudit.tiersSeen[3].swatVisCount === 1 && policeAudit.tiersSeen[3].heli === true &&
    policeAudit.tiersSeen[4].cruisers === 4 && policeAudit.tiersSeen[4].swat === 2 && policeAudit.tiersSeen[4].lockdown === true,
    'PoliceManager escalates cleanly across 1-5★ (Roadblocks at 3★, SWAT + Aerial Searchlight at 4★, City Lockdown at 5★)');
  ck(policeAudit.flashingSeen && policeAudit.afterEscape.wantedLevel === 0 && policeAudit.afterEscape.pmLevel === 0 && policeAudit.afterEscape.escapes >= 1 &&
    policeAudit.afterEscape.extraCruisersVis === 0 && policeAudit.afterEscape.swatVis === 0 && policeAudit.afterEscape.extraRbVis === 0 && !policeAudit.afterEscape.heliVis,
    'LOS broken cooldown clears 5★ -> 0★ and deactivates all pursuit cruisers/SWAT/roadblocks/helicopter cleanly');
  ck(policeAudit.reEscalated.wantedLevel === 5 && policeAudit.reEscalated.activeSwat === 2,
    '2nd 0 -> 5★ escalation reuses fixed police pool cleanly');

  // 2. Pooled Traffic Spawn/Despawn across all 4 Districts
  const trafficAudit = await page.evaluate(() => {
    const waypoints = [[0, 0], [0, -600], [-600, 0], [0, 600], [0, 0]];
    for (const [wx, wz] of waypoints) {
      Object.assign(cityVehicles.supercar, { x: wx, z: wz, yaw: 0 });
      Object.assign(player, cityVehicles.supercar);
      for (let i = 0; i < 12; i++) {
        playTime += 0.1;
        update(0.1);
        render(performance.now());
      }
    }
    const stats = window.NeonTraffic.getStats();
    const instCount = window.worldLivingState.trafficBodyInst.count;
    return { stats, instCount, poolLen: window.NeonTraffic.pool.length };
  });
  ck(trafficAudit.poolLen === baseline.trafficPoolSize &&
    trafficAudit.stats.totalSpawns >= trafficAudit.poolLen &&
    trafficAudit.stats.totalDespawns > 0 &&
    trafficAudit.instCount > 0 &&
    trafficAudit.instCount <= baseline.trafficPoolSize,
    `Traffic pool spawned ${trafficAudit.stats.totalSpawns} & despawned ${trafficAudit.stats.totalDespawns} cars within fixed ${trafficAudit.poolLen}-slot pool (${trafficAudit.instCount} instanced visible)`);

  // 3. Breakable Street Props (Lamppost, Barricade, Fire Hydrant) & Progressive Vehicle Damage
  const propsAndDamage = await page.evaluate(() => {
    const dm = window.NeonDestructibles;
    const lp = dm.props.find((p) => p.type === 'lamppost');
    const br = dm.props.find((p) => p.type === 'barricade');
    const hy = dm.props.find((p) => p.type === 'hydrant');

    inCar = true;
    ride = 'supercar';
    const rv = currentRide();
    rv.hp = 100;
    window.NeonVehicleDamage.repair(rv);

    for (const target of [lp, br, hy]) {
      Object.assign(rv, { x: target.x, z: target.z, yaw: 0 });
      Object.assign(player, rv);
      velocity = 16;
      update(0.05);
      render(performance.now());
    }

    const brokenResult = {
      lampBroken: !lp.intact,
      barricadeBroken: !br.intact,
      hydrantBroken: !hy.intact,
      geyserActive: hy.geyserTimer > 0,
      fxCountDuringGeyser: window.worldLivingState.worldFxMesh.count
    };

    // Progressive Vehicle Damage: clean -> white -> black -> fire (5s countdown) -> eject/fail
    rv.hp = 100;
    window.NeonVehicleDamage.repair(rv);
    const stages = [];
    for (const nextHp of [100, 55, 28, 12]) {
      rv.hp = nextHp;
      update(0.05);
      render(performance.now());
      stages.push({ hp: nextHp, state: rv.damageState, fxCount: window.worldLivingState.worldFxMesh.count });
    }

    // Drive down the 5s fire countdown until automatic explosion & safe player ejection
    Object.assign(rv, { x: 0, z: -20, yaw: 0 });
    Object.assign(player, rv);
    for (let i = 0; i < 30 && inCar; i++) {
      playTime += 0.2;
      update(0.2);
      render(performance.now());
    }
    const postEject = {
      ejected: !inCar,
      safeLand: !window.landBlocked(player.x, player.z, 0.45),
      carRepairedSafe: !rv.wrecked
    };

    return { brokenResult, stages, postEject };
  });

  ck(propsAndDamage.brokenResult.lampBroken &&
    propsAndDamage.brokenResult.barricadeBroken &&
    propsAndDamage.brokenResult.hydrantBroken &&
    propsAndDamage.brokenResult.geyserActive &&
    propsAndDamage.brokenResult.fxCountDuringGeyser > 0,
    'Breakable lamppost, barricade & fire hydrant break on impact and trigger hydrant water geyser FX');

  ck(propsAndDamage.stages[0].state === 'clean' &&
    propsAndDamage.stages[1].state === 'white_smoke' &&
    propsAndDamage.stages[2].state === 'black_smoke' &&
    propsAndDamage.stages[3].state === 'fire' &&
    propsAndDamage.stages[3].fxCount > 0,
    'Progressive vehicle damage transitions clean -> white_smoke -> black_smoke -> fire cleanly');

  ck(propsAndDamage.postEject.ejected && propsAndDamage.postEject.safeLand && propsAndDamage.postEject.carRepairedSafe,
    '5s Fire countdown ejects player safely onto dry land without softlocking');

  // 4. Multi-Cycle Invariance Check (Scene Nodes Constant from Baseline + Zero GPU Geometry/Texture Growth Across Steady-State Cycles)
  const runCycle = () => page.evaluate(() => {
    inCar = true;
    ride = 'supercar';
    if (window.streetEvent) window.streetEvent.autoTimer = 999;
    const origHasLos = window.NeonPolice.hasLineOfSight;
    window.NeonPolice.hasLineOfSight = () => false;

    for (let s = 1; s <= 5; s++) {
      window.setWantedLevel(s);
      update(0.05);
      firstFrame = true;
      render(performance.now());
    }
    for (const [wx, wz] of [[0, 0], [0, -600], [-600, 0], [0, 600], [0, 0]]) {
      Object.assign(cityVehicles.supercar, { x: wx, z: wz, yaw: 0 });
      Object.assign(player, cityVehicles.supercar);
      firstFrame = true;
      for (let i = 0; i < 6; i++) {
        playTime += 0.1;
        update(0.1);
        render(performance.now());
      }
    }
    window.clearWanted();
    window.NeonPolice.hasLineOfSight = origHasLos;
    render(performance.now());

    let totalSceneNodes = 0;
    scene.traverse(() => { totalSceneNodes++; });
    return {
      sceneChildren: scene.children.length,
      totalSceneNodes,
      geometries: gl.info.memory.geometries,
      textures: gl.info.memory.textures,
      trafficPoolSize: window.NeonTraffic.pool.length,
      totalProps: window.NeonDestructibles.props.length,
      cruiserPoolSize: window.NeonPolice.cruisers.length,
      swatPoolSize: window.NeonPolice.swatUnits.length,
      rbPoolSize: window.NeonPolice.roadblocks.length
    };
  });

  const cycle1 = await runCycle();
  const cycle2 = await runCycle();
  const cycle3 = await runCycle();

  ck(cycle1.sceneChildren === baseline.sceneChildren &&
    cycle2.sceneChildren === baseline.sceneChildren &&
    cycle3.sceneChildren === baseline.sceneChildren &&
    cycle1.totalSceneNodes === baseline.totalSceneNodes &&
    cycle2.totalSceneNodes === baseline.totalSceneNodes &&
    cycle3.totalSceneNodes === baseline.totalSceneNodes,
    `Scene graph node count remained strictly constant (${baseline.sceneChildren}/${baseline.totalSceneNodes} -> ${cycle1.sceneChildren}/${cycle1.totalSceneNodes} -> ${cycle2.sceneChildren}/${cycle2.totalSceneNodes} -> ${cycle3.sceneChildren}/${cycle3.totalSceneNodes})`);
  ck(cycle3.geometries === cycle2.geometries && cycle3.textures === cycle2.textures,
    `GPU geometries/textures remained strictly constant across steady-state cycles (${cycle2.geometries}/${cycle2.textures} -> ${cycle3.geometries}/${cycle3.textures})`);
  ck(cycle3.trafficPoolSize === baseline.trafficPoolSize &&
    cycle3.totalProps === baseline.totalProps &&
    cycle3.cruiserPoolSize === baseline.cruiserPoolSize &&
    cycle3.swatPoolSize === baseline.swatPoolSize &&
    cycle3.rbPoolSize === baseline.rbPoolSize,
    'All pooled arrays maintained exact fixed capacities');
  ck(errors.length === 0, `Zero runtime/console errors (${errors.join('; ')})`);

  await page.close();
  await browser.close();

  const report = { passed: checks.length, errors, baseline, cycle1, cycle2, cycle3, checks };
  fs.writeFileSync('tests/world-living-gate-results.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
