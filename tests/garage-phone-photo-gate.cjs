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
  await page.waitForFunction(() => window.gameReady && window.NeonGarage && window.NeonPhone && window.NeonPhotoMode && running === true);

  // 1. Open Neon OS Smartphone via Tab, visit all 4 apps, customize C02 & persist across reload
  await page.keyboard.press('Tab');
  ck(await page.evaluate(() => window.NeonPhone.isOpen && !document.getElementById('neonSmartphone').hidden), 'Tab opens slide-up Neon OS Smartphone');

  await page.locator('.phone-tab[data-app="missions"]').click();
  ck(await page.evaluate(() => document.querySelectorAll('#phoneScreen .phone-card').length >= 10), 'Missions app lists campaign contracts');

  await page.locator('.phone-tab[data-app="radio"]').click();
  await page.locator('[data-radio-idx="1"]').click();
  ck(await page.evaluate(() => window.radioStation === 1 && !document.getElementById('neonToast').hidden), 'Music Radio app tunes station & displays radio toast');

  await page.locator('.phone-tab[data-app="garage"]').click();
  const rosterCounts = await page.evaluate(() => ({
    all: window.NeonGarage.getAllVehicles().length,
    cars: window.NeonGarage.getCars().length,
    bikes: window.NeonGarage.getBikes().length
  }));
  ck(rosterCounts.all === 16 && rosterCounts.cars === 12 && rosterCounts.bikes === 4, 'Garage defines 12 Cars + 4 Bikes (16 total)');

  // Select C02 and customize Paint (#ff007f), Neon (magenta), Turbo (Lv 2) via UI buttons
  await page.locator('[data-vehicle-action="C02"]').click();
  await page.keyboard.press('Tab');
  await page.locator('.phone-tab[data-app="garage"]').click();
  await page.locator('[data-paint-hex="#ff007f"]').click();
  await page.locator('[data-neon-id="magenta"]').click();
  await page.locator('[data-turbo-lv="2"]').click();
  ck(await page.evaluate(() => {
    const c = window.NeonGarage.getCustomization('C02');
    return c.paint === '#ff007f' && c.neon === 'magenta' && c.turboLv === 2;
  }), 'Live Garage customization updates Paint, Neon Underglow & Turbo Lv 2');

  // Persist across full browser reload via SaveManager (neon_bay_save_v1)
  await page.evaluate(() => persist());
  await page.reload();
  await page.waitForFunction(() => window.gameReady && window.NeonGarage && window.NeonPhone && window.NeonPhotoMode && running === true);
  const persisted = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('neon_bay_save_v1') || '{}');
    const c = window.NeonGarage.getCustomization('C02');
    return {
      selected: window.NeonGarage.getSelectedVehicle().id,
      c,
      inStorage: raw.customizations?.C02
    };
  });
  ck(persisted.selected === 'C02' &&
    persisted.c.paint === '#ff007f' && persisted.c.neon === 'magenta' && persisted.c.turboLv === 2 &&
    persisted.inStorage?.paint === '#ff007f' && persisted.inStorage?.neon === 'magenta' && persisted.inStorage?.turboLv === 2,
    'Garage customization persists across page reload in SaveManager');

  // 2. Dial ALL 4 Cheat Codes live (`9999`, `5555`, `7777`, `0000`)
  await page.evaluate(() => {
    inCar = false;
    settings.difficulty = 'normal';
    window.freeRoamWanted = true;
    Object.assign(player, { x: 0, z: -22, yaw: 0 });
    jumpY = 0;
    jumpVelocity = 0;
  });

  // Measure normal jump peak first
  await page.keyboard.press('Space');
  const normalPeak = await page.evaluate(() => {
    let maxY = 0;
    for (let i = 0; i < 40; i++) {
      update(0.03);
      if (jumpY > maxY) maxY = jumpY;
    }
    jumpY = 0; jumpVelocity = 0;
    return maxY;
  });

  // Open Cheats dialer and dial 9999 (Super Jump) & 5555 (Moon Gravity)
  await page.keyboard.press('Tab');
  await page.locator('.phone-tab[data-app="cheats"]').click();
  for (const digit of ['9', '9', '9', '9', 'CALL']) {
    await page.locator(`.phone-key[data-dial-key="${digit}"]`).click();
  }
  const jumpCheck = await page.evaluate(() => window._jumpMultiplier === 2.5);

  await page.keyboard.press('Tab'); // close phone cleanly before jumping
  await page.keyboard.press('Space');
  const superPeak = await page.evaluate(() => {
    let maxY = 0;
    for (let i = 0; i < 60; i++) {
      update(0.03);
      if (jumpY > maxY) maxY = jumpY;
    }
    jumpY = 0; jumpVelocity = 0;
    return maxY;
  });
  ck(jumpCheck && superPeak > normalPeak * 4, `Cheat 9999 Super Jump boosts peak height (${normalPeak.toFixed(2)}m -> ${superPeak.toFixed(2)}m)`);

  // Cheat 5555 Moon Gravity via phone quick-dial
  await page.keyboard.press('Tab');
  await page.locator('.phone-tab[data-app="cheats"]').click();
  await page.locator('[data-quick-cheat="5555"]').click();
  const gravVal = await page.evaluate(() => window._gravityScale);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Space');
  const lunarAirFrames = await page.evaluate(() => {
    let air = 0;
    for (let i = 0; i < 200; i++) {
      update(0.03);
      if (jumpY > 0.01) air++;
      else break;
    }
    return air;
  });
  await page.evaluate(() => { jumpY = 0; jumpVelocity = 0; });
  ck(gravVal === 0.35 && lunarAirFrames > 75, `Cheat 5555 Moon Gravity lowers gravity to 0.35x (${lunarAirFrames} air frames)`);

  // Toggle both cheats back OFF cleanly before driving tests
  await page.evaluate(() => {
    window.NeonPhone.dialCheat('9999');
    window.NeonPhone.dialCheat('5555');
  });

  // Cheat 7777 Spawn Golden Supercar (C11) & Cheat 0000 Clear 4-Star Wanted
  await page.evaluate(() => window.setWantedLevel(4));
  ck(await page.evaluate(() => window.wantedLevel === 4 && wanted), '4-Star Wanted Chase armed prior to cheat 0000');

  await page.keyboard.press('Tab');
  await page.locator('.phone-tab[data-app="cheats"]').click();
  await page.locator('[data-quick-cheat="7777"]').click();
  const goldRes = await page.evaluate(() => ({
    id: window.NeonGarage.getSelectedVehicle().id,
    inCar,
    ride,
    neon: window.NeonActiveVisuals?.neon,
    turbo: window.NeonActiveVisuals?.turboLv
  }));
  ck(goldRes.id === 'C11' && goldRes.inCar && goldRes.ride === 'supercar' && goldRes.neon === 'gold' && goldRes.turbo === 3,
    'Cheat 7777 unlocks & spawns Vortex Apex Gold (C11) with gold neon & Turbo Lv 3');

  await page.locator('[data-quick-cheat="0000"]').click();
  ck(await page.evaluate(() => window.wantedLevel === 0 && !wanted && window.NeonPolice.wantedLevel === 0),
    'Cheat 0000 clears all Police Wanted Stars immediately');
  await page.keyboard.press('Tab');

  // 3. 1-Tap Cinematic Photo Mode (`PHOTO_MODE`): Pauses Physics, Hides HUD, Orbits Camera, Exports PNG & Resumes Cleanly
  await page.evaluate(() => { velocity = 20; });
  await page.keyboard.press('KeyO');
  const photoSnap = await page.evaluate(() => {
    const z0 = player.z;
    update(0.1); // must NOT move while paused in Photo Mode
    const zAfterPausedTick = player.z;
    const camPosBefore = { x: view.position.x, y: view.position.y, z: view.position.z };
    window.NeonPhotoMode.setOrbit({ yaw: 2.1, pitch: 0.42, distance: 12, fov: 42 });
    const camPosAfter = { x: view.position.x, y: view.position.y, z: view.position.z };
    const capture = window.NeonPhotoMode.capturePNG();
    return {
      state: window.NeonGameState.getState(),
      active: window.NeonPhotoMode.active,
      running,
      hudHidden: getComputedStyle(document.getElementById('mission')).display === 'none' &&
        getComputedStyle(document.getElementById('mapWrap')).display === 'none' &&
        getComputedStyle(document.getElementById('telemetry')).display === 'none',
      barVisible: !document.getElementById('photoModeBar').hidden,
      physicsPaused: z0 === zAfterPausedTick,
      camMoved: Math.hypot(camPosAfter.x - camPosBefore.x, camPosAfter.z - camPosBefore.z) > 1,
      captureOk: capture.ok && capture.dataUrl.startsWith('data:image/png;base64,') && capture.dataUrl.length > 1500,
      watermark: capture.watermark
    };
  });

  ck(photoSnap.state === 'PHOTO_MODE' && photoSnap.active && !photoSnap.running, 'KeyO enters PHOTO_MODE state and pauses physics');
  ck(photoSnap.hudHidden && photoSnap.barVisible, 'Photo Mode hides gameplay HUD and reveals camera controls bar');
  ck(photoSnap.physicsPaused && photoSnap.camMoved, 'Photo Mode freezes simulation while unlocking free orbit camera');
  ck(photoSnap.captureOk && photoSnap.watermark === 'NEON BAY: OVERDRIVE', 'Photo Mode exports non-blank PNG snapshot with NEON BAY: OVERDRIVE watermark');

  await page.keyboard.press('Escape');
  await page.evaluate(() => { inCar = false; Object.assign(player, { x: 0, z: -20, yaw: 0 }); lookYaw = 0; velocity = 0; });
  const zBeforeWalk = await page.evaluate(() => player.z);
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(160);
  await page.keyboard.up('KeyW');
  const postExit = await page.evaluate(() => ({
    state: window.NeonGameState.getState(),
    active: window.NeonPhotoMode.active,
    running,
    hudRestored: getComputedStyle(document.getElementById('mission')).display !== 'none',
    moved: player.z
  }));
  ck(postExit.state === 'FREE_ROAM' && !postExit.active && postExit.running && postExit.hudRestored && postExit.moved > zBeforeWalk,
    'Exiting Photo Mode restores FREE_ROAM, shows HUD & resumes live physics cleanly');

  ck(errors.length === 0, `Zero console/page errors (${errors.join('; ')})`);
  await page.close();
  await browser.close();

  const report = { passed: checks.length, errors, normalPeak, superPeak, lunarAirFrames, checks };
  fs.writeFileSync('tests/garage-phone-photo-gate-results.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
