/**
 * Runtime Bridge connecting `PoliceManager`, `TrafficManager`, `DestructiblesManager`,
 * and `VehicleDamageController` into the live Three.js Neon Bay open world using fixed-size
 * pre-allocated pools (zero runtime heap/scene-node churn).
 * Pure zero-import ES Module.
 */

export function initRuntimeWorld({
  PoliceModule,
  TrafficModule,
  DestructiblesModule,
  DamageModule,
  win = globalThis.window,
  doc = globalThis.document
} = {}) {
  if (!win || !doc || !PoliceModule || !TrafficModule || !DestructiblesModule || !DamageModule) {
    return null;
  }

  const hasThree = typeof THREE !== 'undefined' && typeof scene !== 'undefined';
  const roadAxes = typeof CityLayout !== 'undefined' ? CityLayout.axes : [-900, -600, -300, 0, 300, 600, 900];
  const landBlockedFn = (x, z, r = 1.2) => {
    if (typeof win.landBlocked === 'function') return win.landBlocked(x, z, r);
    if (typeof blocked === 'function') return blocked(x, z, r);
    return false;
  };
  const propBlockedFn = (x, z, r = 0.4) => {
    if (landBlockedFn(x, z, r)) return true;
    if (typeof isIndoorPoint === 'function' && isIndoorPoint(x, z)) return true;
    return false;
  };

  const policeMgr = new PoliceModule.PoliceManager({
    eventBus: win.NeonEventBus || null,
    roadAxes,
    hasLineOfSight: typeof lineClear === 'function' ? lineClear : () => true,
    isBlocked: landBlockedFn,
    routeFn: typeof CityLayout !== 'undefined' ? CityLayout.route : null
  });

  const trafficMgr = new TrafficModule.TrafficManager({
    poolSize: 24,
    roadAxes,
    isBlocked: landBlockedFn,
    eventBus: win.NeonEventBus || null
  });

  const destructiblesMgr = new DestructiblesModule.DestructiblesManager({
    respawnDelay: 45,
    eventBus: win.NeonEventBus || null
  });
  destructiblesMgr.initDefaultCityProps(roadAxes, propBlockedFn);

  const damageCtrl = new DamageModule.VehicleDamageController({
    eventBus: win.NeonEventBus || null,
    ejectDuration: DamageModule.FIRE_EJECT_DURATION
  });

  win.NeonPolice = policeMgr;
  win.NeonTraffic = trafficMgr;
  win.NeonDestructibles = destructiblesMgr;
  win.NeonVehicleDamage = damageCtrl;

  // Pre-allocate ALL Three.js pooled meshes ONCE at startup (zero runtime scene.add calls)
  const cruiserMeshes = [];
  const swatMeshes = [];
  const roadblockMeshes = [];
  let heliRoot = null;
  let mainRotor = null;
  let tailRotor = null;
  let spotlightMesh = null;
  let spotMat = null;
  let trafficBodyInst = null;
  let trafficCabinInst = null;
  let trafficRoofInst = null;
  let trafficGrilleInst = null;
  let trafficWheelInst = null;
  let trafficHeadlightInst = null;
  let trafficTaillightInst = null;
  let trafficTrimInst = null;
  let lampPropMesh = null;
  let barricadePropMesh = null;
  let hydrantPropMesh = null;
  let worldFxMesh = null;

  const dummyObj = hasThree ? new THREE.Object3D() : null;
  const wheelDummy = hasThree ? new THREE.Object3D() : null;
  if (wheelDummy) wheelDummy.rotation.order = 'YXZ';
  const scratchColor = hasThree ? new THREE.Color() : null;
  const wheelColor = hasThree ? new THREE.Color('#191e26') : null;
  const hlWarmCol = hasThree ? new THREE.Color('#fff4d0') : null;
  const tlIdleCol = hasThree ? new THREE.Color('#aa1220') : null;
  const tlBrakeCol = hasThree ? new THREE.Color('#ff2233') : null;
  const whiteSmokeCol = hasThree ? new THREE.Color('#eef4f7') : null;
  const blackSmokeCol = hasThree ? new THREE.Color('#272b30') : null;
  const fireCol = hasThree ? new THREE.Color('#ff5d1a') : null;
  const geyserCol = hasThree ? new THREE.Color('#7ae8ff') : null;

  function makeSwatTruck() {
    const g = new THREE.Group();
    scene.add(g);
    const armorMat = win.makeCarPaintMat ? win.makeCarPaintMat('#16202e', { metalness: 0.62, roughness: 0.28, clearcoat: 0.65 }) : material('#192230', 0.45, 0.45);
    const stripeMat = new THREE.MeshStandardMaterial({ color: '#00F0FF', emissive: '#005666', emissiveIntensity: 0.5, roughness: 0.22, metalness: 0.45 });
    const glassMat = win.makeCarGlassMat ? win.makeCarGlassMat('#0d2230') : material('#1f3b4d', 0.14, 0.6);
    const darkMat = material('#12161c', 0.72, 0.25);
    const chromeMat = material('#bfc8ce', 0.2, 0.88);
    // Main armored hull + sloped tactical nose
    block(g, 0, 1.12, -0.22, 2.24, 1.66, 4.88, armorMat);
    block(g, 0, 0.88, 2.48, 2.12, 1.02, 0.92, armorMat);
    block(g, 0, 1.14, -0.08, 2.28, 0.14, 5.2, stripeMat);
    // Armored windshield visor + side gun-ports + heavy ramming bullbar
    block(g, 0, 1.5, 2.24, 1.9, 0.5, 0.08, glassMat);
    block(g, 0, 1.78, 2.28, 1.96, 0.08, 0.18, darkMat);
    for (const sx of [-1.14, 1.14]) {
      for (const sz of [-1.3, -0.3, 0.7]) block(g, sx, 1.44, sz, 0.06, 0.24, 0.48, glassMat);
      block(g, sx, 0.42, -0.1, 0.14, 0.1, 2.9, darkMat);
      block(g, sx * 0.62, 0.82, 2.98, 0.1, 0.64, 0.1, darkMat);
      block(g, sx * 0.72, 0.92, 2.94, 0.36, 0.14, 0.06, new THREE.MeshStandardMaterial({ color: '#f2fbff', emissive: '#cceeff', emissiveIntensity: 0.6 }));
      block(g, sx * 0.78, 0.92, -2.68, 0.34, 0.2, 0.06, new THREE.MeshStandardMaterial({ color: '#cc1c1c', emissive: '#660808', emissiveIntensity: 0.5 }));
      cylinder(g, sx * 0.65, 0.42, -2.7, 0.065, 0.2, chromeMat, 8).rotation.x = Math.PI / 2;
    }
    block(g, 0, 0.56, 2.98, 2.22, 0.34, 0.18, darkMat);
    block(g, 0, 1.04, 3.0, 1.56, 0.08, 0.08, darkMat);
    // Roof turret hatch & glowing red/blue LED lightbar
    block(g, 0, 2.02, -0.8, 0.92, 0.16, 0.92, darkMat);
    block(g, 0, 2.0, 1.32, 1.18, 0.1, 0.3, darkMat);
    block(g, -0.36, 2.1, 1.32, 0.44, 0.12, 0.26, new THREE.MeshStandardMaterial({ color: '#ff2a2a', emissive: '#aa0000', emissiveIntensity: 0.75 }));
    block(g, 0.36, 2.1, 1.32, 0.44, 0.12, 0.26, new THREE.MeshStandardMaterial({ color: '#00aaff', emissive: '#0044aa', emissiveIntensity: 0.75 }));
    for (const sx of [-1.08, 1.08]) {
      for (const sz of [-1.72, 1.65]) {
        const w = cylinder(g, sx, 0.48, sz, 0.48, 0.34, darkMat, 14);
        w.rotation.z = Math.PI / 2;
        const hub = cylinder(g, sx + Math.sign(sx) * 0.175, 0.48, sz, 0.26, 0.03, chromeMat, 12);
        hub.rotation.z = Math.PI / 2;
      }
    }
    const merged = mergeStaticModel(g);
    if (win.addCarContactShadow) win.addCarContactShadow(merged, 2.75, 6.0);
    merged.visible = false;
    merged.rotation.order = 'YXZ';
    return merged;
  }

  function makeBarricadeMesh() {
    const g = new THREE.Group();
    scene.add(g);
    const orangeMat = material('#ff661a', 0.5);
    const whiteMat = material('#f2ede2', 0.6);
    const darkMat = material('#262c30', 0.8);
    for (const bx of [-3.1, 3.1]) {
      block(g, bx, 0.65, 0, 3.2, 0.28, 0.28, orangeMat);
      block(g, bx, 1.0, 0, 3.2, 0.28, 0.3, whiteMat);
      for (const lx of [-1.2, 1.2]) block(g, bx + lx, 0.45, 0, 0.2, 0.9, 0.2, darkMat);
    }
    const merged = mergeStaticModel(g);
    merged.visible = false;
    return merged;
  }

  function makeHelicopterAndSpotlight() {
    const root = new THREE.Group();
    scene.add(root);
    const body = new THREE.Group();
    const hDark = new THREE.MeshStandardMaterial({ color: '#141c28', metalness: 0.45, roughness: 0.28 });
    const hCyan = new THREE.MeshStandardMaterial({ color: '#00f0ff', emissive: '#005b66', emissiveIntensity: 0.4, metalness: 0.4, roughness: 0.3 });
    const hGlass = new THREE.MeshStandardMaterial({ color: '#1f445c', metalness: 0.6, roughness: 0.14 });
    block(body, 0, 0.2, 0, 1.7, 1.4, 4.2, hDark);
    block(body, 0, 0.15, 0, 1.76, 0.24, 4.24, hCyan);
    block(body, 0, 0.35, 1.9, 1.4, 1.1, 1.4, hGlass);
    block(body, 0, 0.3, -3.6, 0.42, 0.45, 3.4, hDark);
    block(body, 0, 1.0, -5.1, 0.22, 1.1, 0.7, hCyan);
    for (const sx of [-0.95, 0.95]) {
      block(body, sx, -0.78, 0, 0.12, 0.1, 3.4, '#22282c');
      for (const sz of [-1, 0.9]) {
        const st = block(body, sx * 0.82, -0.55, sz, 0.1, 0.52, 0.1, '#22282c');
        st.rotation.z = sx < 0 ? -0.3 : 0.3;
      }
    }
    const bakedHeli = mergeStaticModel(body);
    root.add(bakedHeli);

    mainRotor = new THREE.Group();
    mainRotor.position.set(0, 1.15, 0);
    block(mainRotor, 0, 0, 0, 9.4, 0.06, 0.24, '#1c2226');
    block(mainRotor, 0, 0, 0, 0.24, 0.06, 9.4, '#1c2226');

    tailRotor = new THREE.Group();
    tailRotor.position.set(0.26, 0.95, -5.1);
    block(tailRotor, 0, 0, 0, 0.06, 1.6, 0.18, '#1c2226');

    root.add(mainRotor, tailRotor);
    root.visible = false;
    heliRoot = root;

    const spotTex = texture((c, w, h) => {
      c.clearRect(0, 0, w, h);
      const g = c.createRadialGradient(w / 2, h / 2, 6, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgba(220,248,255,0.88)');
      g.addColorStop(0.55, 'rgba(0,240,255,0.42)');
      g.addColorStop(1, 'rgba(0,240,255,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    }, 64, 64);
    const spotGeo = new THREE.PlaneGeometry(11.5, 11.5);
    spotGeo.rotateX(-Math.PI / 2);
    spotMat = new THREE.MeshBasicMaterial({
      map: spotTex,
      color: '#dff8ff',
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    spotlightMesh = new THREE.Mesh(spotGeo, spotMat);
    spotlightMesh.visible = false;
    scene.add(spotlightMesh);
  }

  if (hasThree) {
    // All 4 police pursuit cruisers pre-allocated
    if (typeof sedan === 'function') {
      const bakeFn = win.NeonVehicles?.bakeSubgroup || win.bakeSubgroup;
      for (let i = 0; i < 4; i++) {
        const cMesh = sedan('#f4f6fa', true, true);
        if (cMesh.userData?.doorPivot && typeof bakeFn === 'function') {
          bakeFn(cMesh.userData.doorPivot);
        }
        cMesh.userData?.wheels?.forEach((w) => bakeFn?.(w));
        cMesh.visible = false;
        cMesh.rotation.order = 'YXZ';
        cruiserMeshes.push(cMesh);
      }
    }

    // 2 SWAT trucks (4★ & 5★)
    for (let i = 0; i < 2; i++) {
      swatMeshes.push(makeSwatTruck());
    }

    // All 3 roadblock barricade meshes (3★, 4★ & 5★)
    for (let i = 0; i < 3; i++) {
      roadblockMeshes.push(makeBarricadeMesh());
    }

    // 4★-5★ Police Helicopter + Sweeping Searchlight
    makeHelicopterAndSpotlight();

    // Fixed-pool Multi-Part Traffic InstancedMeshes (Zero runtime scene allocations — AAA Clearcoat + Beveled Silhouettes)
    const bodyShape = new THREE.Shape();
    bodyShape.moveTo(-0.48, -0.44);
    bodyShape.lineTo(0.46, -0.44);
    bodyShape.quadraticCurveTo(0.50, -0.34, 0.50, -0.10);
    bodyShape.lineTo(0.48, 0.20);
    bodyShape.quadraticCurveTo(0.44, 0.34, 0.24, 0.48);
    bodyShape.lineTo(-0.36, 0.48);
    bodyShape.quadraticCurveTo(-0.48, 0.42, -0.49, 0.26);
    bodyShape.closePath();
    const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, {
      depth: 0.94,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.025,
      bevelSegments: 2,
      curveSegments: 8,
      steps: 1
    });
    bodyGeo.translate(0, 0, -0.47);
    bodyGeo.rotateY(-Math.PI / 2);

    const cabShape = new THREE.Shape();
    cabShape.moveTo(-0.48, -0.48);
    cabShape.lineTo(0.48, -0.48);
    cabShape.quadraticCurveTo(0.36, 0.14, 0.20, 0.48);
    cabShape.lineTo(-0.36, 0.48);
    cabShape.quadraticCurveTo(-0.44, 0.14, -0.48, -0.48);
    cabShape.closePath();
    const cabinGeo = new THREE.ExtrudeGeometry(cabShape, {
      depth: 0.94,
      bevelEnabled: true,
      bevelThickness: 0.025,
      bevelSize: 0.02,
      bevelSegments: 2,
      curveSegments: 8,
      steps: 1
    });
    cabinGeo.translate(0, 0, -0.47);
    cabinGeo.rotateY(-Math.PI / 2);

    const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.25, 16);
    wheelGeo.rotateZ(Math.PI / 2);

    const lightGeo = new THREE.BoxGeometry(0.38, 0.10, 0.08);
    const trimGeo = new THREE.BoxGeometry(1, 1, 1);

    const usePhysTraffic = !!THREE.MeshPhysicalMaterial && !(typeof mobileMode !== 'undefined' && mobileMode);
    const TrafficPaintMat = usePhysTraffic ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
    const trafficBodyMatCfg = { color: '#ffffff', roughness: 0.22, metalness: 0.65, envMapIntensity: 1.5 };
    const trafficCabinMatCfg = { color: '#0e2230', roughness: 0.06, metalness: 0.35, envMapIntensity: 2.0 };
    if (usePhysTraffic) {
      trafficBodyMatCfg.clearcoat = 0.92;
      trafficBodyMatCfg.clearcoatRoughness = 0.09;
      trafficCabinMatCfg.clearcoat = 1.0;
      trafficCabinMatCfg.clearcoatRoughness = 0.05;
    }

    trafficBodyInst = new THREE.InstancedMesh(
      bodyGeo,
      new TrafficPaintMat(trafficBodyMatCfg),
      trafficMgr.poolSize
    );
    trafficCabinInst = new THREE.InstancedMesh(
      cabinGeo,
      new TrafficPaintMat(trafficCabinMatCfg),
      trafficMgr.poolSize
    );
    trafficRoofInst = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new TrafficPaintMat(trafficBodyMatCfg),
      trafficMgr.poolSize
    );
    trafficGrilleInst = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: '#10161e', roughness: 0.35, metalness: 0.65 }),
      trafficMgr.poolSize * 2
    );
    trafficWheelInst = new THREE.InstancedMesh(
      wheelGeo,
      new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.56, metalness: 0.42 }),
      trafficMgr.poolSize * 4
    );
    trafficHeadlightInst = new THREE.InstancedMesh(
      lightGeo,
      new THREE.MeshBasicMaterial({ color: '#f2fbff' }),
      trafficMgr.poolSize * 2
    );
    trafficTaillightInst = new THREE.InstancedMesh(
      lightGeo,
      new THREE.MeshBasicMaterial({ color: '#ffffff' }),
      trafficMgr.poolSize * 2
    );
    trafficTrimInst = new THREE.InstancedMesh(
      trimGeo,
      new THREE.MeshStandardMaterial({ color: '#11161d', roughness: 0.45, metalness: 0.45 }),
      trafficMgr.poolSize
    );
    for (const im of [
      trafficBodyInst,
      trafficCabinInst,
      trafficRoofInst,
      trafficGrilleInst,
      trafficWheelInst,
      trafficHeadlightInst,
      trafficTaillightInst,
      trafficTrimInst
    ]) {
      im.frustumCulled = false;
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.count = 0;
      scene.add(im);
    }

    // Breakable street props InstancedMeshes (3 draw calls total)
    const lampCount = Math.max(1, destructiblesMgr.props.filter((p) => p.type === DestructiblesModule.PROP_TYPES.LAMPPOST).length);
    const barCount = Math.max(1, destructiblesMgr.props.filter((p) => p.type === DestructiblesModule.PROP_TYPES.BARRICADE).length);
    const hydCount = Math.max(1, destructiblesMgr.props.filter((p) => p.type === DestructiblesModule.PROP_TYPES.HYDRANT).length);

    lampPropMesh = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.11, 0.16, 4.6, 6),
      new THREE.MeshStandardMaterial({ color: '#3b4a54', roughness: 0.55, metalness: 0.45, emissive: '#002c36' }),
      lampCount
    );
    barricadePropMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(2.4, 0.95, 0.36),
      new THREE.MeshStandardMaterial({ color: '#ff6e24', roughness: 0.6 }),
      barCount
    );
    hydrantPropMesh = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.18, 0.22, 0.85, 8),
      new THREE.MeshStandardMaterial({ color: '#e62e2e', roughness: 0.4 }),
      hydCount
    );
    for (const pm of [lampPropMesh, barricadePropMesh, hydrantPropMesh]) {
      pm.frustumCulled = false;
      pm.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      pm.count = 0;
      scene.add(pm);
    }

    // Shared FX InstancedMesh for hydrant water geysers & progressive car damage puffs/fire
    worldFxMesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.45, 6, 4),
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.62, depthWrite: false }),
      48
    );
    worldFxMesh.frustumCulled = false;
    worldFxMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    worldFxMesh.count = 0;
    scene.add(worldFxMesh);
  }

  win.worldLivingState = {
    cruiserMeshes,
    extraCruisers: cruiserMeshes.slice(2),
    swatMeshes,
    roadblockMeshes,
    extraRoadblocks: roadblockMeshes.slice(1),
    heliRoot,
    spotlightMesh,
    trafficBodyInst,
    trafficCabinInst,
    trafficWheelInst,
    trafficHeadlightInst,
    trafficTaillightInst,
    trafficTrimInst,
    trafficHasWheels: Boolean(trafficWheelInst),
    lampPropMesh,
    barricadePropMesh,
    hydrantPropMesh,
    worldFxMesh
  };

  // Authoritative Wanted Level & Clear Wanted handlers
  let syncingWanted = false;
  win.setWantedLevel = (n, reason = '') => {
    const clamped = Math.max(0, Math.min(5, Math.floor(Number(n) || 0)));
    win.wantedLevel = clamped;
    if (typeof wanted !== 'undefined') wanted = clamped > 0;
    if (!syncingWanted) {
      syncingWanted = true;
      const p = typeof player !== 'undefined' ? player : null;
      policeMgr.setWantedLevel(clamped, p, reason);
      syncingWanted = false;
    }
    return clamped;
  };

  win.clearWanted = (reason = '') => {
    win.wantedLevel = 0;
    if (typeof wanted !== 'undefined') wanted = false;
    if (!syncingWanted) {
      syncingWanted = true;
      policeMgr.clearWanted(reason || 'Cleared');
      syncingWanted = false;
    }
    if (reason && typeof toast === 'function') toast(reason);
    return 0;
  };

  win.washVehicle = () => {
    if (typeof currentRide === 'function') damageCtrl.repair(currentRide());
    if (typeof car !== 'undefined') damageCtrl.repair(car);
    win.clearWanted('Vehicle repaired & resprayed — Police heat cleared!');
  };

  let fireWarnClock = 0;
  let lastPitToastTs = 0;

  function handleVehicleEjection(wreckedVeh) {
    if (typeof inCar === 'undefined' || !inCar) return;
    win.triggerCameraShake?.(0.5, 0.45);
    win.playCrash?.(1.0);
    const p = typeof player !== 'undefined' ? player : wreckedVeh;
    const vx = wreckedVeh?.x ?? p.x;
    const vz = wreckedVeh?.z ?? p.z;
    const vyaw = wreckedVeh?.yaw ?? p.yaw;

    inCar = false;
    if (typeof velocity !== 'undefined') velocity = 0;
    win.nosActive = false;
    win.stuntSlowMo = 0;
    win.vehiclePitch = 0;
    win.vehicleRoll = 0;

    let safePos = null;
    for (const d of [2.8, -2.8, 3.8, -3.8]) {
      const cx = vx + Math.cos(vyaw) * d;
      const cz = vz - Math.sin(vyaw) * d;
      if (!landBlockedFn(cx, cz, 0.5)) {
        safePos = { x: cx, z: cz };
        break;
      }
    }
    if (safePos && typeof player !== 'undefined') {
      player.x = safePos.x;
      player.z = safePos.z;
    }
    win.clearControls?.();

    if (wreckedVeh) {
      wreckedVeh.hp = 30;
      wreckedVeh.damageState = DamageModule.DAMAGE_STATES.BLACK_SMOKE;
      wreckedVeh.wrecked = false;
      wreckedVeh.fireCountdown = 0;
    }
    win.NeonHUD?.triggerDamageFlash?.();
    if (typeof toast === 'function') toast('VEHICLE EXPLODED! Ejected clear — open Phone Garage to respawn!');
    win.updateHUD?.();
  }

  function update(dt) {
    const p = typeof player !== 'undefined' ? player : null;
    if (!p) return;

    const curInCar = typeof inCar !== 'undefined' ? !!inCar : false;
    const curVel = typeof velocity !== 'undefined' ? velocity : 0;
    const pt = typeof playTime !== 'undefined' ? playTime : 0;
    const isWanted = (win.wantedLevel || 0) > 0 || (typeof wanted !== 'undefined' && !!wanted);
    const curRideKey = typeof ride === 'string' ? ride : 'car';
    const curRideObj = curInCar && typeof currentRide === 'function' ? currentRide() : null;
    const curSpec = curInCar ? win.vehicleSpecs?.[curRideKey] : null;
    const playerHalfW = curInCar ? (curSpec?.halfW || 0.90) : 0.40;
    const playerHalfL = curInCar ? (curSpec?.halfL || 2.22) : 0.40;
    const playerJumpY = curInCar ? (curRideObj?.jumpY || 0) : 0;

    // 1. Keep PoliceManager synchronized & handle PIT / Roadblock / LOS escape
    if (isWanted && (win.wantedLevel || 0) !== policeMgr.wantedLevel) {
      policeMgr.setWantedLevel(win.wantedLevel || 1, p);
    }
    if (!isWanted && policeMgr.wantedLevel > 0) {
      policeMgr.clearWanted('Synced clear');
    }

    if (policeMgr.wantedLevel > 0) {
      const pRes = policeMgr.update(dt, {
        player: p,
        playerVelocity: curVel,
        playerHalfW,
        playerHalfL,
        playerJumpY,
        inCar: curInCar,
        playTime: pt,
        aggressionMult: win._missionPoliceAggressionMult ?? 1.0
      });

      if (pRes.wantedLevel === 0 && !syncingWanted) {
        win.clearWanted('Escaped police pursuit!');
      } else if (curInCar) {
        const rv = curRideObj;
        for (const pit of pRes.pitEvents) {
          if (rv) rv.yaw += pit.yawImpulse;
          if (typeof velocity !== 'undefined') velocity *= pit.speedMultiplier;
          win.triggerCameraShake?.(pit.shakeAmp, 0.28);
          win.playCrash?.(0.55);
          if (pt - lastPitToastTs > 4 && typeof toast === 'function') {
            lastPitToastTs = pt;
            toast('POLICE PIT MANEUVER! Counter-steer!');
          }
        }
        for (const rbHit of pRes.roadblockHits) {
          if (typeof velocity !== 'undefined') velocity *= rbHit.speedFactor;
          win.triggerCameraShake?.(0.32, 0.25);
          win.playCrash?.(0.5);
          if (typeof toast === 'function') toast('Smashed through Police Roadblock!');
        }
      }
    }

    // 2. Pooled Traffic Simulation
    const cv = win.cityVehicles || {};
    const sirenOn = (curInCar && curRideKey === 'cruiser' && cv.cruiser?.siren) || policeMgr.wantedLevel >= 1;
    trafficMgr.update(dt, {
      player: p,
      playerHalfW,
      playerHalfL,
      playerJumpY,
      sirenActive: !!sirenOn,
      lockdownActive: policeMgr.lockdownActive,
      targetDensity: 12,
      maxSpawnsPerTick: 2
    });

    // 3. Breakable Street Props Collision & Simulation
    if (curInCar && typeof currentRide === 'function') {
      const rv = currentRide();
      const spec = win.vehicleSpecs?.[curRideKey];
      if (rv && !spec?.isBoat) {
        const hits = destructiblesMgr.checkVehicleCollision(rv, curVel, spec?.radius || 1.2);
        if (hits.length > 0) {
          const hit = hits[0];
          if (typeof velocity !== 'undefined') velocity *= hit.speedFactor;
          win.triggerCameraShake?.(hit.shakeAmp, 0.22);
          win.playCrash?.(0.4);
          if (hit.geyserStarted && typeof toast === 'function') {
            toast('Fire Hydrant ruptured!');
          }
        }
      }
    }
    destructiblesMgr.update(dt, p);

    // 4. Progressive Vehicle Damage States (clean -> white -> black -> fire -> 5s eject/fail)
    if (curInCar && typeof currentRide === 'function') {
      const rv = currentRide();
      const dmg = damageCtrl.update(rv, dt, {
        inCar: true,
        onEjectFail: handleVehicleEjection
      });
      if (dmg.state === DamageModule.DAMAGE_STATES.FIRE && dmg.warningText) {
        fireWarnClock -= dt;
        if (fireWarnClock <= 0 && typeof toast === 'function') {
          fireWarnClock = 1.05;
          toast(dmg.warningText);
        }
      } else {
        fireWarnClock = 0;
      }
    }
  }

  function render(time) {
    if (!hasThree || !dummyObj) return;
    const p = typeof player !== 'undefined' ? player : { x: 0, z: 0 };

    // 1. All 4 Police Cruisers
    for (let i = 0; i < cruiserMeshes.length; i++) {
      const mesh = cruiserMeshes[i];
      const unit = policeMgr.cruisers[i];
      const show = !!(unit?.active && policeMgr.wantedLevel > 0);
      mesh.visible = show;
      if (!show) continue;
      mesh.position.set(unit.x, 0, unit.z);
      mesh.rotation.y = unit.yaw;
      mesh.userData?.wheels?.forEach((w) => {
        w.rotation.x = unit.wheelSpin || 0;
      });
      if (mesh.userData?.red) mesh.userData.red.material.emissive.set(Math.sin(time * 20) > 0 ? '#ff2100' : '#000000');
      if (mesh.userData?.blue) mesh.userData.blue.material.emissive.set(Math.sin(time * 20) < 0 ? '#003cff' : '#000000');
    }

    // 2. Heavy SWAT Units (4★ & 5★)
    for (let i = 0; i < swatMeshes.length; i++) {
      const mesh = swatMeshes[i];
      const unit = policeMgr.swatUnits[i];
      const show = !!(unit?.active && policeMgr.wantedLevel >= 4);
      mesh.visible = show;
      if (!show) continue;
      mesh.position.set(unit.x, 0, unit.z);
      mesh.rotation.y = unit.yaw;
    }

    // 3. All 3 Roadblocks (3★, 4★ & 5★)
    for (let i = 0; i < roadblockMeshes.length; i++) {
      const mesh = roadblockMeshes[i];
      const rb = policeMgr.roadblocks[i];
      const show = !!(rb?.active && rb?.intact && policeMgr.wantedLevel >= 3);
      mesh.visible = show;
      if (!show) continue;
      mesh.position.set(rb.x, 0, rb.z);
      mesh.rotation.y = rb.yaw;
    }

    // 4. 4★-5★ Police Helicopter + Sweeping Searchlight
    if (heliRoot && spotlightMesh) {
      const h = policeMgr.helicopter;
      const showHeli = !!(h?.active && policeMgr.wantedLevel >= 4);
      heliRoot.visible = showHeli;
      spotlightMesh.visible = showHeli;
      win.policeHeliActive = showHeli;
      if (showHeli) {
        heliRoot.position.set(h.x, h.y + Math.sin(time * 2) * 0.4, h.z);
        heliRoot.rotation.y = h.yaw;
        heliRoot.rotation.x = 0.14;
        if (mainRotor) mainRotor.rotation.y = time * 26;
        if (tailRotor) tailRotor.rotation.x = time * 34;
        spotlightMesh.position.set(h.sx, 0.09, h.sz);
        if (spotMat) spotMat.opacity = (win.currentDusk || 0) > 0.4 ? 0.78 : 0.48;
      }
    }

    // 5. Pooled Multi-Part Traffic InstancedMeshes (Zero runtime scene allocations)
    if (trafficBodyInst && trafficCabinInst) {
      let tc = 0;
      let wc = 0;
      let lc = 0;
      const pool = trafficMgr.pool;
      for (let i = 0; i < pool.length; i++) {
        const slot = pool[i];
        if (!slot.active) continue;
        if (Math.hypot(slot.x - p.x, slot.z - p.z) > 225) continue;
        const vr = TrafficModule.TRAFFIC_VARIANTS[slot.variantIndex] || TrafficModule.TRAFFIC_VARIANTS[0];
        const sinY = Math.sin(slot.yaw);
        const cosY = Math.cos(slot.yaw);
        const bodyH = vr.h * 0.46;

        // Lower chassis
        dummyObj.position.set(slot.x, 0.36 + bodyH * 0.5, slot.z);
        dummyObj.rotation.set(0, slot.yaw, 0);
        dummyObj.scale.set(vr.w, bodyH, vr.d);
        dummyObj.updateMatrix();
        trafficBodyInst.setMatrixAt(tc, dummyObj.matrix);
        scratchColor.set(slot.color);
        trafficBodyInst.setColorAt(tc, scratchColor);

        // Sloped windshield cabin + painted clearcoat roof cap
        const cabH = vr.h * 0.36;
        const cabOffsetZ = vr.type === 'suv' || vr.type === 'van' ? -0.18 : -0.12;
        const cabLen = vr.d * (vr.type === 'van' ? 0.58 : 0.48);
        dummyObj.position.set(
          slot.x + sinY * cabOffsetZ,
          0.36 + bodyH + cabH * 0.46 - 0.03,
          slot.z + cosY * cabOffsetZ
        );
        dummyObj.rotation.set(0, slot.yaw, 0);
        dummyObj.scale.set(vr.w * 0.80, cabH, cabLen);
        dummyObj.updateMatrix();
        trafficCabinInst.setMatrixAt(tc, dummyObj.matrix);

        if (trafficRoofInst) {
          const roofOffsetZ = cabOffsetZ - cabLen * 0.08;
          dummyObj.position.set(
            slot.x + sinY * roofOffsetZ,
            0.36 + bodyH + cabH * 0.94,
            slot.z + cosY * roofOffsetZ
          );
          dummyObj.rotation.set(0, slot.yaw, 0);
          dummyObj.scale.set(vr.w * 0.72, 0.065, cabLen * 0.58);
          dummyObj.updateMatrix();
          trafficRoofInst.setMatrixAt(tc, dummyObj.matrix);
          trafficRoofInst.setColorAt(tc, scratchColor);
        }

        // Front grille & rear diffuser/plate recess
        if (trafficGrilleInst) {
          const fz = vr.d * 0.495;
          const rz = -vr.d * 0.495;
          dummyObj.position.set(slot.x + sinY * fz, 0.36 + bodyH * 0.34, slot.z + cosY * fz);
          dummyObj.rotation.set(0, slot.yaw, 0);
          dummyObj.scale.set(vr.w * 0.44, bodyH * 0.34, 0.08);
          dummyObj.updateMatrix();
          trafficGrilleInst.setMatrixAt(tc * 2, dummyObj.matrix);

          dummyObj.position.set(slot.x + sinY * rz, 0.34 + bodyH * 0.22, slot.z + cosY * rz);
          dummyObj.rotation.set(0, slot.yaw, 0);
          dummyObj.scale.set(vr.w * 0.62, bodyH * 0.26, 0.08);
          dummyObj.updateMatrix();
          trafficGrilleInst.setMatrixAt(tc * 2 + 1, dummyObj.matrix);
        }

        // Dark under-skirt / bumper trim
        if (trafficTrimInst) {
          dummyObj.position.set(slot.x, 0.24, slot.z);
          dummyObj.rotation.set(0, slot.yaw, 0);
          dummyObj.scale.set(vr.w * 0.96, 0.18, vr.d * 0.99);
          dummyObj.updateMatrix();
          trafficTrimInst.setMatrixAt(tc, dummyObj.matrix);
        }

        // 4 Rotating Wheels
        if (trafficWheelInst && wheelDummy) {
          const halfW = vr.w * 0.46;
          const halfD = vr.d * 0.32;
          const wheelR = vr.type === 'suv' || vr.type === 'van' ? 0.37 : 0.33;
          const wheelY = wheelR;
          const spin = slot.wheelSpin || 0;
          const offsets = [
            [-halfW, halfD],
            [halfW, halfD],
            [-halfW, -halfD],
            [halfW, -halfD]
          ];
          for (let k = 0; k < 4; k++) {
            const ox = offsets[k][0];
            const oz = offsets[k][1];
            wheelDummy.position.set(
              slot.x + cosY * ox + sinY * oz,
              wheelY,
              slot.z - sinY * ox + cosY * oz
            );
            wheelDummy.rotation.set(spin, slot.yaw, 0);
            wheelDummy.scale.set(1, wheelR / 0.34, wheelR / 0.34);
            wheelDummy.updateMatrix();
            trafficWheelInst.setMatrixAt(wc, wheelDummy.matrix);
            trafficWheelInst.setColorAt(wc, wheelColor);
            wc++;
          }
        }

        // Headlights (+Z front) & Taillights (-Z rear)
        if (trafficHeadlightInst && trafficTaillightInst) {
          const halfLW = vr.w * 0.34;
          const frontZ = vr.d * 0.49;
          const rearZ = -vr.d * 0.49;
          const lightY = 0.38 + bodyH * 0.42;
          const tlCol = slot.braking ? tlBrakeCol : tlIdleCol;
          for (const side of [-1, 1]) {
            const ox = side * halfLW;
            dummyObj.position.set(
              slot.x + cosY * ox + sinY * frontZ,
              lightY,
              slot.z - sinY * ox + cosY * frontZ
            );
            dummyObj.rotation.set(0, slot.yaw, 0);
            dummyObj.scale.set(1, 1, 1);
            dummyObj.updateMatrix();
            trafficHeadlightInst.setMatrixAt(lc, dummyObj.matrix);
            trafficHeadlightInst.setColorAt(lc, hlWarmCol);

            dummyObj.position.set(
              slot.x + cosY * ox + sinY * rearZ,
              lightY + 0.04,
              slot.z - sinY * ox + cosY * rearZ
            );
            dummyObj.rotation.set(0, slot.yaw, 0);
            dummyObj.scale.set(1, slot.braking ? 1.25 : 1, 1);
            dummyObj.updateMatrix();
            trafficTaillightInst.setMatrixAt(lc, dummyObj.matrix);
            trafficTaillightInst.setColorAt(lc, tlCol);
            lc++;
          }
        }
        tc++;
      }

      trafficBodyInst.count = tc;
      trafficCabinInst.count = tc;
      if (trafficRoofInst) trafficRoofInst.count = tc;
      if (trafficGrilleInst) trafficGrilleInst.count = tc * 2;
      if (trafficTrimInst) trafficTrimInst.count = tc;
      if (trafficWheelInst) trafficWheelInst.count = wc;
      if (trafficHeadlightInst) trafficHeadlightInst.count = lc;
      if (trafficTaillightInst) trafficTaillightInst.count = lc;

      if (tc > 0) {
        trafficBodyInst.instanceMatrix.needsUpdate = true;
        if (trafficBodyInst.instanceColor) trafficBodyInst.instanceColor.needsUpdate = true;
        trafficCabinInst.instanceMatrix.needsUpdate = true;
        if (trafficRoofInst) {
          trafficRoofInst.instanceMatrix.needsUpdate = true;
          if (trafficRoofInst.instanceColor) trafficRoofInst.instanceColor.needsUpdate = true;
        }
        if (trafficGrilleInst) trafficGrilleInst.instanceMatrix.needsUpdate = true;
        if (trafficTrimInst) trafficTrimInst.instanceMatrix.needsUpdate = true;
        if (trafficWheelInst) {
          trafficWheelInst.instanceMatrix.needsUpdate = true;
          if (trafficWheelInst.instanceColor) trafficWheelInst.instanceColor.needsUpdate = true;
        }
        if (trafficHeadlightInst) {
          trafficHeadlightInst.instanceMatrix.needsUpdate = true;
          if (trafficHeadlightInst.instanceColor) trafficHeadlightInst.instanceColor.needsUpdate = true;
        }
        if (trafficTaillightInst) {
          trafficTaillightInst.instanceMatrix.needsUpdate = true;
          if (trafficTaillightInst.instanceColor) trafficTaillightInst.instanceColor.needsUpdate = true;
        }
      }
    }

    // 6. Breakable Props + Geyser & Damage FX InstancedMeshes
    let lc = 0;
    let bc = 0;
    let hc = 0;
    let fc = 0;
    const props = destructiblesMgr.props;
    for (let i = 0; i < props.length; i++) {
      const pr = props[i];
      if (Math.hypot(pr.x - p.x, pr.z - p.z) > 170 && pr.geyserTimer <= 0) continue;

      if (pr.type === DestructiblesModule.PROP_TYPES.LAMPPOST && lampPropMesh && lc < lampPropMesh.instanceMatrix.count) {
        const tilt = pr.intact ? 0 : pr.tilt;
        const heightOffset = 2.3 * Math.cos(tilt);
        const shift = 2.3 * Math.sin(tilt);
        dummyObj.position.set(pr.x + (pr.tiltDirX || 0) * shift, Math.max(0.2, heightOffset), pr.z + (pr.tiltDirZ || 1) * shift);
        dummyObj.rotation.set(tilt * (pr.tiltDirZ || 1), 0, -tilt * (pr.tiltDirX || 0));
        dummyObj.scale.set(1, 1, 1);
        dummyObj.updateMatrix();
        lampPropMesh.setMatrixAt(lc++, dummyObj.matrix);
      } else if (pr.type === DestructiblesModule.PROP_TYPES.BARRICADE && barricadePropMesh && bc < barricadePropMesh.instanceMatrix.count) {
        dummyObj.position.set(pr.x, 0.48 + pr.y, pr.z);
        dummyObj.rotation.set(pr.intact ? 0 : 0.85, pr.yaw, pr.intact ? 0 : 0.35);
        dummyObj.scale.set(1, 1, 1);
        dummyObj.updateMatrix();
        barricadePropMesh.setMatrixAt(bc++, dummyObj.matrix);
      } else if (pr.type === DestructiblesModule.PROP_TYPES.HYDRANT && hydrantPropMesh && hc < hydrantPropMesh.instanceMatrix.count) {
        dummyObj.position.set(pr.x, 0.42 + pr.y, pr.z);
        dummyObj.rotation.set(pr.intact ? 0 : 1.15, pr.yaw, 0);
        dummyObj.scale.set(1, 1, 1);
        dummyObj.updateMatrix();
        hydrantPropMesh.setMatrixAt(hc++, dummyObj.matrix);

        if (pr.geyserTimer > 0 && worldFxMesh && fc + 3 < worldFxMesh.instanceMatrix.count) {
          for (let g = 0; g < 4; g++) {
            const phase = (time * 3.8 + g * 0.25) % 1;
            dummyObj.position.set(pr.homeX + Math.sin(time * 9 + g) * 0.14, 0.4 + phase * 4.2, pr.homeZ + Math.cos(time * 8 + g) * 0.14);
            dummyObj.rotation.set(0, 0, 0);
            dummyObj.scale.setScalar(0.35 + phase * 0.65);
            dummyObj.updateMatrix();
            worldFxMesh.setMatrixAt(fc, dummyObj.matrix);
            worldFxMesh.setColorAt(fc, geyserCol);
            fc++;
          }
        }
      }
    }
    if (lampPropMesh) {
      lampPropMesh.count = lc;
      if (lc > 0) lampPropMesh.instanceMatrix.needsUpdate = true;
    }
    if (barricadePropMesh) {
      barricadePropMesh.count = bc;
      if (bc > 0) barricadePropMesh.instanceMatrix.needsUpdate = true;
    }
    if (hydrantPropMesh) {
      hydrantPropMesh.count = hc;
      if (hc > 0) hydrantPropMesh.instanceMatrix.needsUpdate = true;
    }

    // 7. Progressive Vehicle Damage Hood Plumes (white -> black -> fire)
    if (worldFxMesh && typeof inCar !== 'undefined' && inCar && typeof currentRide === 'function') {
      const rv = currentRide();
      if (rv) {
        const dmgStage = rv.damageState || DamageModule.classifyDamageState(rv.hp ?? 100);
        if (dmgStage !== DamageModule.DAMAGE_STATES.CLEAN && fc + 4 < worldFxMesh.instanceMatrix.count) {
          const hoodX = rv.x + Math.sin(rv.yaw) * 1.45;
          const hoodZ = rv.z + Math.cos(rv.yaw) * 1.45;
          const col =
            dmgStage === DamageModule.DAMAGE_STATES.WHITE_SMOKE
              ? whiteSmokeCol
              : dmgStage === DamageModule.DAMAGE_STATES.BLACK_SMOKE
                ? blackSmokeCol
                : fireCol;
          for (let f = 0; f < 4; f++) {
            const phase = (time * 2.6 + f * 0.25) % 1;
            const spread = phase * 0.42;
            dummyObj.position.set(
              hoodX + Math.sin(time * 7 + f * 2) * spread,
              0.95 + phase * (dmgStage === DamageModule.DAMAGE_STATES.FIRE ? 1.85 : 2.3),
              hoodZ + Math.cos(time * 6 + f * 2) * spread
            );
            dummyObj.rotation.set(0, 0, 0);
            const s = dmgStage === DamageModule.DAMAGE_STATES.FIRE ? 0.45 + (1 - phase) * 0.45 : 0.4 + phase * 0.85;
            dummyObj.scale.setScalar(s);
            dummyObj.updateMatrix();
            worldFxMesh.setMatrixAt(fc, dummyObj.matrix);
            worldFxMesh.setColorAt(fc, col);
            fc++;
          }
        }
      }
    }

    if (worldFxMesh) {
      worldFxMesh.count = fc;
      if (fc > 0) {
        worldFxMesh.instanceMatrix.needsUpdate = true;
        if (worldFxMesh.instanceColor) worldFxMesh.instanceColor.needsUpdate = true;
      }
    }
  }

  return { policeMgr, trafficMgr, destructiblesMgr, damageCtrl, update, render };
}
