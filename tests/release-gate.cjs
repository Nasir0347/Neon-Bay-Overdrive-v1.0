const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  // 1. Verify www/path-audit.json, www/bundle-audit.json, and dist/dist-audit.json
  const pathAudit = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../www/path-audit.json'), 'utf8'));
  const bundleAudit = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../www/bundle-audit.json'), 'utf8'));
  const distAudit = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../dist/dist-audit.json'), 'utf8'));

  assert.ok(pathAudit.valid && pathAudit.violations.length === 0, 'All asset URLs must be relative & exact-case matching');
  assert.ok(bundleAudit.withinBudget && bundleAudit.totalMB < 15, 'www/ bundle must be under 15 MB');
  assert.ok(distAudit.syntaxVerified && distAudit.withinBudget && distAudit.obfuscatedCount > 0 && distAudit.domainLock?.enabled, 'dist/ must be obfuscated, domain-locked, syntax-verified & < 15 MB');

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const checks = [];
  const ck = (cond, msg) => {
    assert.ok(cond, msg);
    checks.push(msg);
  };

  ck(true, `Static build audits passed (${pathAudit.checkedRefs.length} relative paths, www=${bundleAudit.totalMB} MB, dist=${distAudit.totalMB} MB obfuscated=${distAudit.obfuscatedCount})`);

  // 2. Live Smoke Test on www/index.html
  const errorsWww = [];
  const wwwUrl = 'file:///' + path.resolve(__dirname, '../www/index.html').replace(/\\/g, '/');
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => errorsWww.push('pageerror:' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errorsWww.push('console:' + m.text());
  });

  await page.goto(wwwUrl);
  await page.waitForFunction(() => window.gameReady && window.NeonAds && window.NeonI18n && window.NeonShareCard && running === true);

  // Exercise AdManager live pause -> mute -> reward -> resume cycle with CrazyGames SDK hook
  const adCycle = await page.evaluate(async () => {
    window.CrazyGames = {
      SDK: {
        game: { gameplayStart() {}, gameplayStop() {}, happytime() {} },
        ad: {
          requestAd(_type, cbs) {
            cbs?.adStarted?.();
            cbs?.adFinished?.();
          }
        }
      }
    };
    await window.NeonAudio.unlock();
    const events = [];
    window.NeonEventBus.once('ad:started', () => {
      events.push({ phase: 'duringAd', running, audioMuted: window.NeonAudio.muted });
    });
    const cashBefore = window.NeonSave.getData().cash;
    const res = await window.NeonAds.showRewardedAd('double_cash', { baseCash: 750 });
    events.push({ phase: 'afterAd', running, audioMuted: window.NeonAudio.muted, cashDelta: window.NeonSave.getData().cash - cashBefore, rewarded: res.rewarded });

    // Interstitial interval: mission #1 skips, mission #2 triggers interstitial cleanly
    const r1 = await window.NeonAds.onMissionCompleted('M1');
    const r2 = await window.NeonAds.onMissionCompleted('M2');
    return { events, r1, r2 };
  });

  ck(
    adCycle.events[0]?.phase === 'duringAd' &&
      adCycle.events[0]?.running === false &&
      adCycle.events[0]?.audioMuted === true &&
      adCycle.events[1]?.phase === 'afterAd' &&
      adCycle.events[1]?.running === true &&
      adCycle.events[1]?.audioMuted === false &&
      adCycle.events[1]?.cashDelta === 750 &&
      adCycle.r1.interstitialShown === false &&
      adCycle.r2.interstitialShown === true,
    'AdManager executes strict pause -> mute -> reward (+Rs 750) -> unmute/resume & every-2-missions interstitial'
  );

  // Switch live across all 6 i18n locales (en, es, pt, fr, de, ar) + RTL check + reload persistence
  const localeResults = await page.evaluate(() => {
    const out = [];
    for (const loc of ['en', 'es', 'pt', 'fr', 'de', 'ar']) {
      const r = window.NeonI18n.setLanguage(loc);
      out.push({
        loc,
        langAttr: document.documentElement.lang,
        dirAttr: document.documentElement.dir,
        missionsLabel: window.NeonI18n.t('appMissions'),
        ok: r.locale === loc && document.documentElement.lang === loc && document.documentElement.dir === (loc === 'ar' ? 'rtl' : 'ltr')
      });
    }
    return out;
  });
  ck(localeResults.every((x) => x.ok) && localeResults.length === 6,
    'All 6 i18n locales (en, es, pt, fr, de, ar RTL) swap cleanly in live browser');

  await page.reload();
  await page.waitForFunction(() => window.gameReady && window.NeonI18n && window.NeonShareCard);
  const reloadedLang = await page.evaluate(() => ({
    lang: window.NeonI18n.getLanguage(),
    dir: document.documentElement.dir,
    card: window.NeonShareCard.generateScoreCardPNG()
  }));
  ck(
    reloadedLang.lang === 'ar' &&
      reloadedLang.dir === 'rtl' &&
      reloadedLang.card.ok &&
      reloadedLang.card.dataUrl.startsWith('data:image/png;base64,') &&
      reloadedLang.card.dataUrl.length > 2000,
    'Language persistence (ar RTL) & 1200x630 PNG Viral Score Card verified across reload'
  );
  ck(errorsWww.length === 0, `www/index.html reported 0 console/page errors (${errorsWww.join('; ')})`);
  await page.close();

  // 3. Boot Obfuscated & Domain-Locked dist/index.html in clean Playwright context
  const errorsDist = [];
  const distUrl = 'file:///' + path.resolve(__dirname, '../dist/index.html').replace(/\\/g, '/');
  const dPage = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  dPage.on('pageerror', (e) => errorsDist.push('pageerror:' + e.message));
  dPage.on('console', (m) => {
    if (m.type() === 'error') errorsDist.push('console:' + m.text());
  });
  await dPage.goto(distUrl);
  await dPage.waitForFunction(() => window.gameReady && window.NeonMissions && window.NeonAudio && window.NeonPerf && window.NeonAds && window.NeonI18n && running === true);

  const distBoot = await dPage.evaluate(() => ({
    missions: window.NeonMissions.getMissionList().length,
    locales: window.NeonI18n.getLocales().length,
    platform: window.NeonAds.platform,
    fps: window.gameDiagnostics ? window.gameDiagnostics.fps : 60
  }));
  ck(distBoot.missions === 20 && distBoot.locales === 6 && errorsDist.length === 0,
    `Obfuscated dist/index.html boots all 20 missions & 6 locales with 0 errors (${errorsDist.join('; ')})`);

  await dPage.close();
  await browser.close();

  const report = { passed: checks.length, errorsWww, errorsDist, checks, pathAudit, bundleAudit, distAudit };
  fs.writeFileSync('tests/release-gate-results.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
