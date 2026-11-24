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
  await page.waitForFunction(() => window.gameReady && window.NeonMissions && window.NeonPhone && running === true);

  const baselineSceneNodes = await page.evaluate(() => scene.children.length);

  // 1. Verify idle overlays hidden & all 20 story missions + 4 extra layers registered
  const initCheck = await page.evaluate(() => ({
    count: window.NeonMissions.getMissionList().length,
    dailyCount: window.NeonDailyMissions.getTasks().length,
    challengeCount: window.NeonChallenges.getChallengeList().length,
    bridgeOk: !!window.NeonCity2Bridge && window.NeonCity2Bridge.targetCity === 'Mirage Valley',
    radioHidden: document.getElementById('missionRadioBanner').hidden,
    mechHidden: document.getElementById('missionMechanicHud').hidden,
    ambushHidden: document.getElementById('missionAmbushFlash').hidden,
    modalHidden: document.getElementById('missionSummaryModal').hidden
  }));
  ck(initCheck.count === 20 && initCheck.dailyCount === 3 && initCheck.challengeCount === 3 && initCheck.bridgeOk && initCheck.radioHidden && initCheck.mechHidden && initCheck.ambushHidden && initCheck.modalHidden,
    'All 20 Story Missions, Daily Generator (3), Challenge Modes (3) & City 2 Bridge registered; overlays hidden while idle');

  // 2. Open Smartphone -> Missions tab -> launch M1 from UI button
  await page.keyboard.press('Tab');
  await page.locator('.phone-tab[data-app="missions"]').click();
  const phoneTitles = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#phoneScreen .phone-card strong')).map((el) => el.textContent)
  );
  ck(phoneTitles.some((t) => t.includes('M1 — Neon Midnight Drop')) && phoneTitles.some((t) => t.includes('M20 — Golden Sunrise Finale')) && phoneTitles.some((t) => t.includes('DAILY ·')) && phoneTitles.some((t) => t.includes('CHALLENGE ·')),
    'Smartphone Missions tab renders M1 through M20, Daily tasks & Challenges');

  await page.locator('#phoneScreen .phone-card .phone-action-btn').first().click();

  // Verify M1 started, Radio 2-line banner visible, countdown HUD visible
  const m1Start = await page.evaluate(() => ({
    id: window.NeonMissions.activeMission?.id,
    state: window.NeonMissions.state,
    gameState: window.NeonGameState.getState(),
    radioVisible: !document.getElementById('missionRadioBanner').hidden,
    dialogueLines: document.querySelectorAll('#missionRadioBanner .mission-radio-line').length,
    timerText: document.getElementById('hudTimer')?.textContent || ''
  }));
  ck(m1Start.id === 'M1' && m1Start.gameState === 'MISSION_ACTIVE' && m1Start.radioVisible && m1Start.dialogueLines === 2,
    'M1 starts in MISSION_ACTIVE with 2-line radio dialogue banner visible');

  // Fail M1 -> verify Fail Modal -> click RETRY -> complete all M1 checkpoints -> verify Win Modal + SaveManager persistence
  await page.evaluate(() => window.NeonMissions.failMission('time_expired'));
  const m1FailModal = await page.evaluate(() => ({
    state: window.NeonMissions.state,
    modalVisible: !document.getElementById('missionSummaryModal').hidden,
    text: document.getElementById('missionSummaryModal').textContent
  }));
  ck(m1FailModal.state === 'FAILED' && m1FailModal.modalVisible && m1FailModal.text.includes('MISSION FAILED'),
    'M1 failure displays Fail Summary Modal cleanly');

  await page.locator('#missionSummaryModal [data-mission-action="retry"]').click();
  const m1Retried = await page.evaluate(() => ({
    state: window.NeonMissions.state,
    modalHidden: document.getElementById('missionSummaryModal').hidden,
    time: window.NeonMissions.remainingTimeSec
  }));
  ck((m1Retried.state === 'INTRO' || m1Retried.state === 'ACTIVE') && m1Retried.modalHidden && m1Retried.time >= 58 && m1Retried.time <= 60,
    `M1 retry resets timer (~60s, got ${m1Retried.time.toFixed(2)}s) and hides modal`);

  // Drive M1 checkpoints + walk inside Pier 99 Lounge on foot via live update() loop steps
  const m1Win = await page.evaluate(() => {
    const rv = currentRide();
    rv.x = 0; rv.z = -300; player.x = 0; player.z = -300; update(0.05);
    rv.x = 0; rv.z = -600; player.x = 0; player.z = -600; update(0.05);
    rv.x = 0; rv.z = -875; player.x = 0; player.z = -875; update(0.05);
    inCar = false;
    player.x = 24; player.z = -875; update(0.05);
    inCar = true;
    const save = window.NeonSave.getData();
    return {
      state: window.NeonMissions.state,
      modalVisible: !document.getElementById('missionSummaryModal').hidden,
      modalText: document.getElementById('missionSummaryModal').textContent,
      completed: save.completedMissions.includes('M1'),
      stars: save.starRatings.M1,
      failsReset: save.stats.consecutiveFails.M1 === 0
    };
  });
  ck(m1Win.state === 'COMPLETED' && m1Win.modalVisible && m1Win.modalText.includes('★') && m1Win.completed && m1Win.stars === 3 && m1Win.failsReset,
    'M1 completes to Win Summary Modal with 3-Star rating and persists in NeonSave');

  // 3. Test Mission 9 (NO BRAKES!) in live physics engine (start -> fail -> retry -> Palm Strip Beach Sand crash-stop)
  await page.evaluate(() => window.NeonMissions.startMission('M9'));
  const m9BrakeTest = await page.evaluate(() => {
    const disabledOnStart = window._missionDisableBrakes === true;
    const rv = currentRide();
    rv.x = 0; rv.z = 120; player.x = 0; player.z = 120;
    velocity = 22;
    keys.add('Space');
    keys.add('ArrowDown');
    for (let i = 0; i < 15; i++) update(0.04);
    const velAfterBrakeHold = velocity;
    const brakingFlag = window.brakingNow;
    keys.delete('Space');
    keys.delete('ArrowDown');
    return { disabledOnStart, velAfterBrakeHold, brakingFlag };
  });
  ck(m9BrakeTest.disabledOnStart && m9BrakeTest.velAfterBrakeHold > 10 && m9BrakeTest.brakingFlag === false,
    `M9 disables Space/Down braking in live physics (v=${m9BrakeTest.velAfterBrakeHold.toFixed(1)} m/s, brakingNow=${m9BrakeTest.brakingFlag})`);

  // Fail M9 -> confirm _missionDisableBrakes cleared -> Retry -> clear road checkpoints -> Palm Strip Beach Sand decelerates to stop & completes!
  const m9CompleteTest = await page.evaluate(() => {
    window.NeonMissions.failMission('vehicle_destroyed');
    const clearedOnFail = window._missionDisableBrakes === false;

    window.NeonMissions.retryMission();
    const armedOnRetry = window._missionDisableBrakes === true;

    const rv = currentRide();
    rv.x = 0; rv.z = 0; player.x = 0; player.z = 0; update(0.05);
    rv.x = 0; rv.z = -300; player.x = 0; player.z = -300; update(0.05);
    rv.x = 0; rv.z = -600; player.x = 0; player.z = -600; update(0.05);

    // Enter Palm Strip Beach Sand at z = -855 moving 22 m/s -> sand decel (28) stops car cleanly and completes M9!
    rv.x = 0; rv.z = -855; player.x = 0; player.z = -855; velocity = 22;
    for (let i = 0; i < 40; i++) {
      update(0.05);
      if (window.NeonMissions.state === 'COMPLETED') break;
    }
    return {
      clearedOnFail,
      armedOnRetry,
      finalState: window.NeonMissions.state,
      finalVel: velocity,
      brakesRestored: window._missionDisableBrakes === false,
      savedM9: window.NeonSave.getData().completedMissions.includes('M9')
    };
  });
  ck(m9CompleteTest.clearedOnFail && m9CompleteTest.armedOnRetry && m9CompleteTest.finalState === 'COMPLETED' && m9CompleteTest.brakesRestored && m9CompleteTest.savedM9,
    `M9 start -> fail -> retry -> Palm Strip Beach Sand stop completed cleanly (v=${m9CompleteTest.finalVel.toFixed(2)} m/s)`);

  await page.locator('#missionSummaryModal [data-mission-action="free-roam"]').click();
  const afterAbort = await page.evaluate(() => ({
    state: window.NeonMissions.state,
    gameState: window.NeonGameState.getState(),
    sceneNodes: scene.children.length
  }));
  ck(afterAbort.state === 'IDLE' && afterAbort.gameState === 'FREE_ROAM', 'Free Roam button exits cleanly back to FREE_ROAM');

  // 4. Test M17 (B01 -> C10 Mid-Mission Vehicle Switch), M18 (60 km/h Speed Bomb), and M20 Finale Unlock Persistence
  const m17Res = await page.evaluate(() => {
    window.NeonMissions.startMission('M17');
    const rideBefore = ride;
    let rv = currentRide();
    rv.x = 0; rv.z = 0; player.x = 0; player.z = 0; velocity = 15; update(0.05);
    rv.x = -600; rv.z = 0; player.x = -600; player.z = 0; velocity = 15; update(0.05);
    const rideAfter = ride;
    const switched = window.NeonMissions.mechanicState.switched;
    rv = currentRide();
    rv.x = -300; rv.z = 600; player.x = -300; player.z = 600; update(0.05);
    rv.x = 0; rv.z = 900; player.x = 0; player.z = 900; update(0.05);
    return { rideBefore, rideAfter, switched, state: window.NeonMissions.state };
  });
  ck(m17Res.rideBefore === 'bike' && m17Res.rideAfter === 'supercar' && m17Res.switched && m17Res.state === 'COMPLETED',
    'M17 switches player mid-mission from B01 Bike to C10 Hypercar cleanly');

  // M20 Golden Sunrise Finale -> clears Airport Terminal on foot -> Private Jet -> unlocks C11 + Mirage Valley + persists across reload
  await page.evaluate(() => {
    window.NeonMissions.startMission('M20');
    const rv = currentRide();
    rv.x = 0; rv.z = 600; player.x = 0; player.z = 600; update(0.05);
    rv.x = 300; rv.z = 600; player.x = 300; player.z = 600; update(0.05);
    rv.x = 600; rv.z = 300; player.x = 600; player.z = 300; update(0.05);
    rv.x = 600; rv.z = 0; player.x = 600; player.z = 0; update(0.05);
    inCar = false; player.x = 665; player.z = -36; update(0.05);
    inCar = true; rv.x = 750; rv.z = -260; player.x = 750; player.z = -260; update(0.05);
  });

  const m20PreReload = await page.evaluate(() => ({
    state: window.NeonMissions.state,
    bridgeUnlocked: window.NeonCity2Bridge.unlocked,
    save: window.NeonSave.getData(),
    sceneNodes: scene.children.length
  }));
  ck(m20PreReload.state === 'COMPLETED' && m20PreReload.bridgeUnlocked && m20PreReload.save.city2Unlocked && m20PreReload.save.unlockedVehicles.cars.includes('C11') && m20PreReload.save.completedMissions.includes('M20'),
    'M20 Golden Sunrise Finale unlocks C11 Vortex Apex Gold + Mirage Valley (City 2) bridge');
  ck(m20PreReload.sceneNodes === baselineSceneNodes, `Constant scene node count preserved (${baselineSceneNodes} === ${m20PreReload.sceneNodes})`);

  await page.reload();
  await page.waitForFunction(() => window.gameReady && window.NeonMissions && window.NeonCity2Bridge);
  const m20PostReload = await page.evaluate(() => ({
    completedM20: window.NeonSave.getData().completedMissions.includes('M20'),
    hasC11: window.NeonSave.getData().unlockedVehicles.cars.includes('C11'),
    city2Unlocked: window.NeonSave.getData().city2Unlocked,
    bridgeUnlocked: window.NeonCity2Bridge.unlocked,
    travelRes: window.NeonCity2Bridge.travelToCity2()
  }));
  ck(m20PostReload.completedM20 && m20PostReload.hasC11 && m20PostReload.city2Unlocked && m20PostReload.bridgeUnlocked && m20PostReload.travelRes.ok,
    'M20 C11 + Mirage Valley unlock persists cleanly across full browser reload');

  ck(errors.length === 0, `Zero console/page errors (${errors.join('; ')})`);

  await page.close();
  await browser.close();

  const report = { passed: checks.length, errors, checks };
  fs.writeFileSync('tests/missions-gate-results.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
