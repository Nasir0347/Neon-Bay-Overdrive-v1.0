import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { EventBus } from '../src/core/EventBus.js';
import { SaveManager } from '../src/core/SaveManager.js';
import {
  PORTAL_PLATFORMS,
  REWARDED_PLACEMENTS,
  INTERSTITIAL_MISSION_INTERVAL,
  detectPortalPlatform,
  AdManager
} from '../src/monetization/AdManager.js';
import {
  SUPPORTED_LOCALES,
  TRANSLATIONS,
  validateI18nCatalog,
  I18nManager
} from '../src/i18n/i18n.js';
import {
  SHARE_CARD_WIDTH,
  SHARE_CARD_HEIGHT,
  ShareCardGenerator
} from '../src/ui/ShareCard.js';

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

describe('AdManager Portal SDKs, Mandatory Mute/Pause/Resume & Every-2-Missions Interstitials', () => {
  it('enforces pause -> mute -> reward -> resume on CrazyGames/Poki/Capacitor and rejects reward on adError', async () => {
    const timeline = [];
    const fakeAudio = {
      muted: false,
      setMuted(v) {
        this.muted = !!v;
        timeline.push(`audio:${v ? 'muted' : 'unmuted'}`);
      }
    };

    const cgWin = {
      self: null,
      top: null,
      CrazyGames: {
        SDK: {
          game: {
            gameplayStart: () => timeline.push('cg:gameplayStart'),
            gameplayStop: () => timeline.push('cg:gameplayStop'),
            happytime: () => timeline.push('cg:happytime')
          },
          ad: {
            requestAd: (type, cbs) => {
              timeline.push(`cg:request:${type}`);
              cbs.adStarted?.();
              cbs.adFinished?.();
            }
          }
        }
      }
    };
    cgWin.self = cgWin;
    cgWin.top = cgWin;

    assert.equal(detectPortalPlatform(cgWin), PORTAL_PLATFORMS.CRAZYGAMES);
    const bus = new EventBus();
    const saveManager = new SaveManager({ storage: makeMockStorage(), eventBus: bus });
    const startCash = saveManager.getData().cash;

    const ads = new AdManager({
      win: cgWin,
      eventBus: bus,
      saveManager,
      audioManager: fakeAudio,
      onPauseGame: () => timeline.push('game:paused'),
      onResumeGame: () => timeline.push('game:resumed'),
      onGrantReward: (p) => timeline.push(`reward:${p}`)
    });

    ads.gameplayStart();
    const res = await ads.showRewardedAd(REWARDED_PLACEMENTS.DOUBLE_CASH, { baseCash: 800 });
    assert.equal(res.ok, true);
    assert.equal(res.rewarded, true);
    assert.equal(saveManager.getData().cash, startCash + 800);
    assert.equal(fakeAudio.muted, false);

    // Order must mute audio + pause + stop gameplay BEFORE ad, grant reward, then unmute + resume
    assert.ok(timeline.indexOf('audio:muted') < timeline.indexOf('cg:request:rewarded'));
    assert.ok(timeline.indexOf('game:paused') < timeline.indexOf('cg:request:rewarded'));
    assert.ok(timeline.indexOf('cg:request:rewarded') < timeline.indexOf('reward:double_cash'));
    assert.ok(timeline.indexOf('reward:double_cash') < timeline.indexOf('audio:unmuted'));
    assert.ok(timeline.indexOf('audio:unmuted') < timeline.indexOf('game:resumed'));

    // Simulated adError must restore audio/game state cleanly WITHOUT granting reward
    const cashBeforeErr = saveManager.getData().cash;
    const errRes = await ads.showRewardedAd(REWARDED_PLACEMENTS.DOUBLE_CASH, { baseCash: 800, simulateError: true });
    assert.equal(errRes.ok, false);
    assert.equal(errRes.rewarded, false);
    assert.equal(saveManager.getData().cash, cashBeforeErr);
    assert.equal(fakeAudio.muted, false);

    // Interstitial fires strictly every 2 completed missions, and respects remove_ads IAP
    assert.equal(INTERSTITIAL_MISSION_INTERVAL, 2);
    const m1 = await ads.onMissionCompleted('M1');
    assert.equal(m1.interstitialShown, false);
    assert.equal(m1.count, 1);

    const m2 = await ads.onMissionCompleted('M2');
    assert.equal(m2.interstitialShown, true);
    assert.equal(m2.count, 0);
    assert.ok(timeline.includes('cg:request:midgame'));

    ads.verifyPurchase = async () => true;
    await ads.purchaseProduct('remove_ads', 'verified-test-receipt');
    const m3 = await ads.onMissionCompleted('M3');
    const m4 = await ads.onMissionCompleted('M4');
    assert.equal(m3.interstitialShown, false);
    assert.equal(m4.interstitialShown, false);
  });

  it('detects PokiSDK and Capacitor AdMob platforms cleanly and hides external links in iframe', async () => {
    const pokiWin = { PokiSDK: { rewardedBreak: async () => true, commercialBreak: async () => {} } };
    let dismiss;
    const capWin = { Capacitor: { isNativePlatform: () => true, Plugins: { AdMob: { addListener: async (_name, callback) => {dismiss=callback;return {remove: async()=>{}};}, prepareRewardVideoAd: async () => {}, showRewardVideoAd: async () => {dismiss();return {amount:1,type:'coin'};} } } } };
    assert.equal(detectPortalPlatform(pokiWin), PORTAL_PLATFORMS.POKI);
    assert.equal(detectPortalPlatform(capWin), PORTAL_PLATFORMS.CAPACITOR);

    const pokiAds = new AdManager({ win: pokiWin, saveManager: new SaveManager({ storage: makeMockStorage() }) });
    const pr = await pokiAds.showRewardedAd(REWARDED_PLACEMENTS.UNLOCK_NEON, { neonColor: 'magenta' });
    assert.equal(pr.provider, PORTAL_PLATFORMS.POKI);
    assert.equal(pr.savedReward.neon, 'magenta');

    const capAds = new AdManager({ win: capWin, nativeConfig:{adIds:{rewarded:'test-unit'},dismissEvents:{rewarded:'test-dismissed'}}, saveManager: new SaveManager({ storage: makeMockStorage() }) });
    const cr = await capAds.showRewardedAd(REWARDED_PLACEMENTS.REVIVE_20S);
    assert.equal(cr.provider, PORTAL_PLATFORMS.CAPACITOR);
    assert.equal(cr.rewarded, true);

    // Iframe hides external links cleanly
    const extEl = { hidden: false, style: { display: '' } };
    const iframeAds = new AdManager({
      win: { self: { id: 1 }, top: { id: 2 } },
      doc: { querySelectorAll: () => [extEl] }
    });
    assert.equal(iframeAds.inIframe, true);
    assert.equal(iframeAds.hideExternalLinksInIframe(), 1);
    assert.equal(extEl.hidden, true);
  });
});

describe('Multi-Language I18n (6 Locales + RTL), Viral ShareCard, Config & Audit', () => {
  it('validates all 6 locales cleanly with zero missing keys and switches LTR/RTL + SaveManager persistence', () => {
    assert.deepEqual(SUPPORTED_LOCALES, ['en', 'es', 'pt', 'fr', 'de', 'ar']);
    const v = validateI18nCatalog();
    assert.equal(v.valid, true, v.errors.join(', '));
    assert.equal(v.localeCount, 6);
    assert.ok(v.keyCount >= 18);

    const htmlEl = { lang: 'en', dir: 'ltr' };
    const doc = { documentElement: htmlEl, querySelectorAll: () => [] };
    const storage = makeMockStorage();
    const bus = new EventBus();
    const saveManager = new SaveManager({ storage, eventBus: bus });
    const i18n = new I18nManager({ saveManager, eventBus: bus, doc });

    for (const loc of SUPPORTED_LOCALES) {
      i18n.setLanguage(loc);
      assert.equal(i18n.getLanguage(), loc);
      assert.equal(htmlEl.lang, loc);
      assert.equal(htmlEl.dir, loc === 'ar' ? 'rtl' : 'ltr');
      assert.equal(i18n.t('appMissions'), TRANSLATIONS[loc].appMissions);
    }

    // Reload preserves selected language
    i18n.setLanguage('fr');
    const reloaded = new I18nManager({ saveManager: new SaveManager({ storage, eventBus: new EventBus() }) });
    assert.equal(reloaded.getLanguage(), 'fr');
  });

  it('generates 1200x630 Viral Score Card & satisfies ship security/brand/TODO audits', () => {
    const saveManager = new SaveManager({ storage: makeMockStorage() });
    saveManager.recordMissionResult('M20', 3, 15000);
    const i18n = new I18nManager({ saveManager });
    const gen = new ShareCardGenerator({ i18n, saveManager, doc: null });
    const card = gen.generateScoreCardPNG();
    assert.equal(card.ok, true);
    assert.equal(card.width, SHARE_CARD_WIDTH);
    assert.equal(card.height, SHARE_CARD_HEIGHT);
    assert.ok(card.dataUrl.startsWith('data:image/'));
    assert.ok(card.text.includes('NEON BAY: OVERDRIVE'));

    // Capacitor Android/iOS config verification
    const capCfg = JSON.parse(fs.readFileSync(path.join(rootDir, 'capacitor.config.json'), 'utf8'));
    assert.equal(capCfg.webDir, 'www');
    assert.equal(capCfg.server.androidScheme, 'https');
    assert.equal(capCfg.server.iosScheme, 'https');
    assert.ok(capCfg.android && capCfg.ios);

    // Zero TODOs & zero banned copyright brand names in all release modules
    const banned = /\b(grand theft auto|vice city|rockstar|lamborghini|ferrari|bmw|lucia|jason)\b|\bgta\b/i;
    const todoRe = /\/\/\s*TODO|\/\*\s*TODO/i;
    for (const rel of [
      'src/monetization/AdManager.js',
      'src/monetization/release-runtime-wiring.js',
      'src/i18n/i18n.js',
      'src/ui/ShareCard.js'
    ]) {
      const content = fs.readFileSync(path.join(rootDir, rel), 'utf8');
      assert.equal(todoRe.test(content), false, `${rel} zero TODO`);
      assert.equal(banned.test(content), false, `${rel} zero banned names`);
    }
  });
});
