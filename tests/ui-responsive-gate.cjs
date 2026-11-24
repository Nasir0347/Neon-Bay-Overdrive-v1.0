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

  async function auditViewport(name, vp, { isMobile = false, hasTouch = false } = {}) {
    const page = await browser.newPage({ viewport: vp, isMobile, hasTouch, deviceScaleFactor: isMobile ? 2 : 1 });
    const vpErrors = [];
    page.on('pageerror', (e) => vpErrors.push('pageerror:' + e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') vpErrors.push('console:' + m.text());
    });

    await page.goto(url);
    await page.waitForFunction(() => window.gameReady && window.NeonHUD && window.NeonMinimap && running === true);

    // Exercise active driving + NOS + 4-Star Wanted + Timer + District Toast + Hint + Flip Car
    const metrics = await page.evaluate(() => {
      window.nosCharge = 85;
      window.nosActive = true;
      window.freeRoamWanted = true;
      settings.difficulty = 'normal';
      window.setWantedLevel(4);
      inCar = true;
      ride = 'supercar';
      Object.assign(cityVehicles.supercar, { x: 0, z: -260, yaw: 0.4 });
      Object.assign(player, cityVehicles.supercar);
      velocity = 26;
      firstFrame = true;
      window.NeonHUD.showDistrictToast('Palm Strip');
      toast('PALM STRIP · VORTEX VENENO-X');
      updateHUD();
      window.updateTouchUI?.();
      render(performance.now());

      const vw = innerWidth;
      const vh = innerHeight;
      const canvasRect = canvas.getBoundingClientRect();
      const meta = document.querySelector('meta[name="viewport"]')?.content || '';
      const isPortrait = vh > vw;
      const selectors = [
        'header',
        '#mission',
        '#mapWrap',
        '#telemetry',
        '#hudTopRight',
        '#status',
        '#toast',
        '#neonToast',
        '#hint',
        '#flipCarBtn',
        ...(document.body.classList.contains('mobile')
          ? ['#joystick', '#touchTop button', '#touchExitCar', '#touchActions button:not([hidden])']
          : ['footer'])
      ];

      const items = [];
      const seen = new Set();
      for (const sel of selectors) {
        for (const el of document.querySelectorAll(sel)) {
          if (seen.has(el)) continue;
          seen.add(el);
          if (el.hidden || el.offsetParent === null) continue;
          const st = getComputedStyle(el);
          if (st.display === 'none' || st.visibility === 'hidden') continue;
          const r = el.getBoundingClientRect();
          if (r.width < 1 || r.height < 1) continue;
          items.push({
            id: el.id || el.dataset.action || el.tagName.toLowerCase(),
            isActionBtn: !!el.closest('#touchActions'),
            l: r.left,
            t: r.top,
            r: r.right,
            b: r.bottom,
            w: r.width,
            h: r.height
          });
        }
      }

      const overlaps = [];
      const outOfBounds = [];
      const smallButtons = [];
      for (let i = 0; i < items.length; i++) {
        const A = items[i];
        if (A.l < -1 || A.t < -1 || A.r > vw + 1 || A.b > vh + 1) {
          outOfBounds.push(`${A.id}(${Math.round(A.l)},${Math.round(A.t)},${Math.round(A.r)},${Math.round(A.b)})`);
        }
        if (A.isActionBtn && (A.w < 48 || A.h < 48)) {
          smallButtons.push(`${A.id}:${Math.round(A.w)}x${Math.round(A.h)}`);
        }
        for (let j = i + 1; j < items.length; j++) {
          const B = items[j];
          const ox = Math.min(A.r, B.r) - Math.max(A.l, B.l);
          const oy = Math.min(A.b, B.b) - Math.max(A.t, B.t);
          if (ox > 2 && oy > 2) {
            overlaps.push(`${A.id}<->${B.id}(${Math.round(ox)}x${Math.round(oy)})`);
          }
        }
      }

      const mapRect = document.querySelector('#mapWrap').getBoundingClientRect();
      const joyRect = document.querySelector('#joystick')?.getBoundingClientRect() || null;
      const speedStyle = getComputedStyle(document.querySelector('#speed'));
      const cashStyle = getComputedStyle(document.querySelector('#hudCash'));
      const rotateEl = document.querySelector('#rotateNotice');
      const rotateDisp = rotateEl ? getComputedStyle(rotateEl).display : 'none';

      return {
        vw,
        vh,
        isPortrait,
        running,
        rotateDisp,
        fov: view.fov,
        aspect: view.aspect,
        meta,
        canvasCoversViewport: Math.abs(canvasRect.width - vw) <= 1 && Math.abs(canvasRect.height - vh) <= 1,
        tabularNums: speedStyle.fontVariantNumeric.includes('tabular-nums') && cashStyle.fontVariantNumeric.includes('tabular-nums'),
        mapRect: { left: mapRect.left, top: mapRect.top },
        joyBottom: joyRect ? joyRect.bottom : 0,
        overlaps,
        outOfBounds,
        smallButtons
      };
    });

    ck(metrics.meta.includes('viewport-fit=cover') && metrics.meta.includes('user-scalable=no'), `${name}: viewport-fit=cover & user-scalable=no present`);
    ck(metrics.canvasCoversViewport, `${name}: canvas fills 100dvw x 100dvh (${metrics.vw}x${metrics.vh})`);
    ck(metrics.tabularNums, `${name}: speedometer & cash enforce tabular-nums`);
    ck(metrics.running && metrics.rotateDisp === 'none', `${name}: stays live without rotateNotice blocker`);
    ck(metrics.overlaps.length === 0, `${name}: zero HUD overlaps (${metrics.overlaps.join(', ')})`);
    ck(metrics.outOfBounds.length === 0, `${name}: zero off-screen buttons/elements (${metrics.outOfBounds.join(', ')})`);
    ck(metrics.smallButtons.length === 0, `${name}: mobile action buttons >= 48x48px (${metrics.smallButtons.join(', ')})`);

    if (metrics.isPortrait) {
      ck(metrics.mapRect.left < metrics.vw * 0.4 && metrics.mapRect.top < metrics.vh * 0.35, `${name}: portrait mode anchors Minimap Top-Left`);
      ck(metrics.fov >= 70 && metrics.fov <= 94, `${name}: portrait mode widens camera FOV (${metrics.fov.toFixed(1)} deg)`);
      if (hasTouch) ck(metrics.joyBottom > metrics.vh * 0.7, `${name}: portrait pedals anchored in lower thumb zone`);
    }

    // Verify rotating 2D radar + Full Map toggle via tap & KeyM
    if (hasTouch) {
      await page.locator('#mapWrap').tap();
    } else {
      await page.locator('#mapWrap').click();
    }
    const afterMapTap = await page.evaluate(() => {
      const ov = document.getElementById('fullMapOverlay');
      const card = ov.querySelector('.fullmap-card').getBoundingClientRect();
      const closeBtn = document.getElementById('fullMapClose').getBoundingClientRect();
      return {
        open: window.NeonMinimap.fullMapOpen && !ov.hidden,
        fits: card.left >= 0 && card.top >= 0 && card.right <= innerWidth + 1 && card.bottom <= innerHeight + 1,
        closeHeight: closeBtn.height
      };
    });
    ck(afterMapTap.open && afterMapTap.fits && afterMapTap.closeHeight >= 48, `${name}: minimap tap opens responsive full-screen map`);

    if (hasTouch) {
      await page.locator('#fullMapClose').tap();
    } else {
      await page.locator('#fullMapClose').click();
    }
    ck(await page.evaluate(() => !window.NeonMinimap.fullMapOpen && document.getElementById('fullMapOverlay').hidden), `${name}: full-screen map closes cleanly`);

    await page.keyboard.press('KeyM');
    ck(await page.evaluate(() => window.NeonMinimap.fullMapOpen), `${name}: KeyM opens full-screen map`);
    await page.keyboard.press('KeyM');
    ck(await page.evaluate(() => !window.NeonMinimap.fullMapOpen), `${name}: KeyM closes full-screen map`);

    ck(vpErrors.length === 0, `${name}: 0 runtime/console errors (${vpErrors.join('; ')})`);
    errors.push(...vpErrors);
    await page.close();
  }

  // 1. All 4 Required Viewports
  await auditViewport('Mobile Portrait 360x640', { width: 360, height: 640 }, { isMobile: true, hasTouch: true });
  await auditViewport('iPhone Landscape 844x390', { width: 844, height: 390 }, { isMobile: true, hasTouch: true });
  await auditViewport('Tablet/Iframe Touch 1024x768', { width: 1024, height: 768 }, { isMobile: true, hasTouch: true });
  await auditViewport('Tablet/Iframe Desktop 1024x768', { width: 1024, height: 768 }, { isMobile: false, hasTouch: false });
  await auditViewport('Desktop 1920x1080', { width: 1920, height: 1080 }, { isMobile: false, hasTouch: false });

  // 2. Dynamic Resize Reflow, Portrait FOV Transition, Rotating Radar Pixels, Blur Toggle & District/Radio Toasts
  const dp = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  dp.on('pageerror', (e) => errors.push(e.message));
  await dp.goto(url);
  await dp.waitForFunction(() => window.gameReady && window.NeonHUD && window.NeonMinimap && running === true);

  await dp.setViewportSize({ width: 360, height: 640 });
  await dp.waitForTimeout(100);
  const portraitSnap = await dp.evaluate(() => {
    inCar = false;
    render(performance.now());
    return {
      isPortrait: document.body.classList.contains('portrait'),
      fov: view.fov,
      aspect: view.aspect
    };
  });
  await dp.setViewportSize({ width: 844, height: 390 });
  await dp.waitForTimeout(100);
  const landscapeSnap = await dp.evaluate(() => {
    inCar = false;
    render(performance.now());
    return {
      isLandscape: document.body.classList.contains('landscape'),
      fov: view.fov,
      aspect: view.aspect
    };
  });
  ck(portraitSnap.isPortrait && portraitSnap.fov >= 70 && portraitSnap.fov <= 74 && landscapeSnap.isLandscape && Math.abs(landscapeSnap.fov - 60) < 0.5,
    `Live reflow updates Portrait FOV (${portraitSnap.fov.toFixed(1)} deg) <-> Landscape FOV (${landscapeSnap.fov.toFixed(1)} deg)`);

  // Blur on High vs disabled blur on Low + rotating minimap pixel check + all 4 districts + radio toast
  const featureCheck = await dp.evaluate(() => {
    setQuality('high', false);
    const highBlur = getComputedStyle(document.querySelector('#mission')).backdropFilter || getComputedStyle(document.querySelector('#mission')).webkitBackdropFilter;
    setQuality('low', false);
    const lowBlur = getComputedStyle(document.querySelector('#mission')).backdropFilter || getComputedStyle(document.querySelector('#mission')).webkitBackdropFilter;

    // Rotating minimap pixel change on yaw turn
    player.x = 0; player.z = 0; player.yaw = 0; inCar = true;
    drawCityMap();
    const mapBefore = document.querySelector('#map').toDataURL();
    player.yaw = 1.35;
    drawCityMap();
    const mapAfter = document.querySelector('#map').toDataURL();

    const districtsSeen = [];
    for (const [x, z] of [[0, 0], [0, -300], [-240, 0], [0, 250], [0, 0]]) {
      window.NeonHUD.update({ cash: 500, x, z, speedKmh: 60 }, 0.016);
      districtsSeen.push(window.NeonHUD.currentDistrict.name + '->' + document.getElementById('neonToastTitle').textContent);
    }

    window.cycleRadio();
    const radioOk = !document.getElementById('neonToast').hidden && document.getElementById('neonToast').dataset.kind === 'radio';

    return {
      highBlur,
      lowBlur,
      minimapRotates: mapBefore.length > 500 && mapBefore !== mapAfter,
      districtsSeen,
      radioOk
    };
  });
  ck(featureCheck.highBlur.includes('blur') && featureCheck.lowBlur === 'none', `Glass blur enabled on HIGH (${featureCheck.highBlur}) and disabled on LOW (${featureCheck.lowBlur})`);
  ck(featureCheck.minimapRotates, 'Rotating 2D minimap updates radar pixels cleanly across heading change');
  ck(featureCheck.districtsSeen.length === 5 && featureCheck.districtsSeen[1].includes('PALM STRIP') && featureCheck.districtsSeen[2].includes('IRON DOCKS') && featureCheck.districtsSeen[3].includes('BAYVIEW HEIGHTS') && featureCheck.districtsSeen[4].includes('APEX CORE'),
    `All 4 districts trigger Neon toasts (${featureCheck.districtsSeen.join(', ')})`);
  ck(featureCheck.radioOk, 'Radio station cycling displays Miami Neon radio toast');

  await dp.close();
  await browser.close();

  assert.equal(errors.length, 0, 'Unexpected errors: ' + errors.join('; '));
  const report = {
    passed: checks.length,
    errors,
    viewports: ['360x640', '844x390', '1024x768', '1920x1080'],
    checks
  };
  fs.writeFileSync('tests/ui-responsive-gate-results.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
