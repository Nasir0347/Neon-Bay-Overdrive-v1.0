/**
 * Unified Portal SDK & Monetization Manager for Neon Bay: Overdrive.
 * Supports CrazyGames SDK v2/v3 (gameplayStart/Stop, happytime, midgame & rewarded ads),
 * Poki SDK (gameplayStart/Stop, commercialBreak, rewardedBreak), Capacitor AdMob hooks,
 * strict mandatory ad-mute/pause/resume lifecycle, every-2-missions interstitial cadence,
 * and iframe external-link compliance.
 * Pure zero-import ES Module.
 */

export const PORTAL_PLATFORMS = Object.freeze({
  CRAZYGAMES: 'crazygames',
  POKI: 'poki',
  CAPACITOR: 'capacitor',
  STANDALONE: 'standalone'
});

export const REWARDED_PLACEMENTS = Object.freeze({
  DOUBLE_CASH: 'double_cash',
  REVIVE_20S: 'retry_bonus_time',
  VIP_TEST_DRIVE: 'vip_test_drive',
  UNLOCK_NEON: 'unlock_neon'
});

export const INTERSTITIAL_MISSION_INTERVAL = 2;

export function detectPortalPlatform(win = globalThis.window) {
  if (!win) return PORTAL_PLATFORMS.STANDALONE;
  if (win.CrazyGames?.SDK?.ad) return PORTAL_PLATFORMS.CRAZYGAMES;
  if (win.PokiSDK) return PORTAL_PLATFORMS.POKI;
  if (win.Capacitor?.isNativePlatform?.() || win.Capacitor?.Plugins?.AdMob) {
    return PORTAL_PLATFORMS.CAPACITOR;
  }
  return PORTAL_PLATFORMS.STANDALONE;
}

export function isInsideIframe(win = globalThis.window) {
  if (!win) return false;
  try {
    return win.self !== win.top;
  } catch {
    return true;
  }
}

export class AdManager {
  constructor({
    win = globalThis.window || null,
    doc = globalThis.document || null,
    eventBus = null,
    saveManager = null,
    audioManager = null,
    gameState = null,
    onPauseGame = null,
    onResumeGame = null,
    onGrantReward = null,
    nativeConfig = win?.NeonPlatformConfig?.admob || null,
    verifyPurchase = null
  } = {}) {
    this.win = win || null;
    this.doc = doc || null;
    this.eventBus = eventBus || null;
    this.saveManager = saveManager || null;
    this.audioManager = audioManager || null;
    this.gameState = gameState || null;
    this.onPauseGame = typeof onPauseGame === 'function' ? onPauseGame : null;
    this.onResumeGame = typeof onResumeGame === 'function' ? onResumeGame : null;
    this.onGrantReward = typeof onGrantReward === 'function' ? onGrantReward : null;
    this.nativeConfig = nativeConfig;
    this.verifyPurchase = verifyPurchase;

    this.platform = detectPortalPlatform(this.win);
    this.inIframe = isInsideIframe(this.win);
    this.adInProgress = false;
    this.gameplayActive = false;
    this.wasMutedBeforeAd = false;
    this.analyticsLog = [];
    this.sdkEvents = [];
  }

  trackEvent(name, props = {}) {
    const entry = { name: String(name), ts: Date.now(), props: { ...props } };
    this.analyticsLog.push(entry);
    if (this.analyticsLog.length > 200) this.analyticsLog.shift();
    this.eventBus?.emit?.('analytics:event', entry);
    return entry;
  }

  getAnalyticsLog() {
    return this.analyticsLog.map((e) => ({ ...e }));
  }

  gameplayStart() {
    if (this.gameplayActive) return false;
    this.gameplayActive = true;
    try {
      if (this.win?.CrazyGames?.SDK?.game?.gameplayStart) {
        this.win.CrazyGames.SDK.game.gameplayStart();
        this.sdkEvents.push('cg:gameplayStart');
      }
      if (this.win?.PokiSDK?.gameplayStart) {
        this.win.PokiSDK.gameplayStart();
        this.sdkEvents.push('poki:gameplayStart');
      }
    } catch {}
    this.eventBus?.emit?.('portal:gameplayStart', { platform: this.platform });
    return true;
  }

  gameplayStop() {
    if (!this.gameplayActive) return false;
    this.gameplayActive = false;
    try {
      if (this.win?.CrazyGames?.SDK?.game?.gameplayStop) {
        this.win.CrazyGames.SDK.game.gameplayStop();
        this.sdkEvents.push('cg:gameplayStop');
      }
      if (this.win?.PokiSDK?.gameplayStop) {
        this.win.PokiSDK.gameplayStop();
        this.sdkEvents.push('poki:gameplayStop');
      }
    } catch {}
    this.eventBus?.emit?.('portal:gameplayStop', { platform: this.platform });
    return true;
  }

  happytime() {
    try {
      if (this.win?.CrazyGames?.SDK?.game?.happytime) {
        this.win.CrazyGames.SDK.game.happytime();
        this.sdkEvents.push('cg:happytime');
      }
    } catch {}
    this.eventBus?.emit?.('portal:happytime', { platform: this.platform });
    return true;
  }

  hideExternalLinksInIframe(rootDoc = this.doc) {
    if (!this.inIframe || !rootDoc?.querySelectorAll) return 0;
    const links = rootDoc.querySelectorAll('a[href^="http"], [data-external-link]');
    let hiddenCount = 0;
    for (const el of links) {
      el.hidden = true;
      if (el.style) el.style.display = 'none';
      hiddenCount += 1;
    }
    return hiddenCount;
  }

  _beginAdFreeze(adType, placement) {
    this.adInProgress = true;
    this.wasMutedBeforeAd = !!this.audioManager?.muted;
    this.audioManager?.setMuted?.(true);
    this.onPauseGame?.({ adType, placement });
    this.gameplayStop();
    this.eventBus?.emit?.('ad:started', { adType, placement, platform: this.platform });
  }

  _endAdFreeze(adType, placement, status) {
    this.adInProgress = false;
    this.audioManager?.setMuted?.(this.wasMutedBeforeAd);
    this.onResumeGame?.({ adType, placement, status });
    this.eventBus?.emit?.('ad:ended', { adType, placement, status, platform: this.platform });
  }

  async _dispatchProviderAd(adType, simulateError = false) {
    if (simulateError) {
      return { ok: false, rewarded: false, reason: 'simulated-ad-error' };
    }

    // 1. CrazyGames SDK
    if (this.win?.CrazyGames?.SDK?.ad?.requestAd) {
      return await new Promise((resolve) => {
        try {
          const cgType = adType === 'rewarded' ? 'rewarded' : 'midgame';
          this.win.CrazyGames.SDK.ad.requestAd(cgType, {
            adStarted: () => { this.sdkEvents.push(`cg:adStarted:${cgType}`); },
            adFinished: () => {
              this.sdkEvents.push(`cg:adFinished:${cgType}`);
              resolve({ ok: true, rewarded: true, provider: PORTAL_PLATFORMS.CRAZYGAMES });
            },
            adError: (err) => {
              this.sdkEvents.push(`cg:adError:${cgType}`);
              resolve({ ok: false, rewarded: false, provider: PORTAL_PLATFORMS.CRAZYGAMES, error: String(err || 'adError') });
            }
          });
        } catch (err) {
          resolve({ ok: false, rewarded: false, provider: PORTAL_PLATFORMS.CRAZYGAMES, error: err?.message });
        }
      });
    }

    // 2. Poki SDK
    if (this.win?.PokiSDK) {
      try {
        if (adType === 'rewarded' && typeof this.win.PokiSDK.rewardedBreak === 'function') {
          const success = await this.win.PokiSDK.rewardedBreak();
          this.sdkEvents.push(`poki:rewardedBreak:${!!success}`);
          return { ok: !!success, rewarded: !!success, provider: PORTAL_PLATFORMS.POKI };
        }
        if (typeof this.win.PokiSDK.commercialBreak === 'function') {
          await this.win.PokiSDK.commercialBreak();
          this.sdkEvents.push('poki:commercialBreak');
          return { ok: true, rewarded: false, provider: PORTAL_PLATFORMS.POKI };
        }
      } catch (err) {
        return { ok: false, rewarded: false, provider: PORTAL_PLATFORMS.POKI, error: err?.message };
      }
    }

    // 3. Capacitor AdMob Plugin
    const admob = this.win?.Capacitor?.Plugins?.AdMob;
    if (admob) {
      const adId = this.nativeConfig?.adIds?.[adType];
      const dismissEvent = this.nativeConfig?.dismissEvents?.[adType];
      if (!adId || !dismissEvent || typeof admob.addListener !== 'function') {
        return {ok:false, rewarded:false, provider:PORTAL_PLATFORMS.CAPACITOR, reason:'native-ads-not-configured'};
      }
      let handle;
      try {
        let onDismissed;
        const closed = new Promise(resolve => { onDismissed = resolve; });
        handle = await admob.addListener(dismissEvent, onDismissed);
        if (adType === 'rewarded') {
          await admob.prepareRewardVideoAd({ adId });
          const res = await admob.showRewardVideoAd();
          await closed;
          this.sdkEvents.push('admob:rewarded');
          return { ok: true, rewarded: Number(res?.amount) > 0, provider: PORTAL_PLATFORMS.CAPACITOR };
        }
        await admob.prepareInterstitial({ adId });
        await admob.showInterstitial();
        await closed;
        this.sdkEvents.push('admob:interstitial');
        return { ok: true, rewarded: false, provider: PORTAL_PLATFORMS.CAPACITOR };
      } catch (err) {
        return { ok: false, rewarded: false, provider: PORTAL_PLATFORMS.CAPACITOR, error: err?.message };
      } finally {
        await handle?.remove?.();
      }
    }

    // An absent provider cannot confirm a view or earn a rewarded entitlement.
    this.sdkEvents.push(`standalone:${adType}`);
    return { ok: false, rewarded: false, provider: PORTAL_PLATFORMS.STANDALONE, reason: 'ad-provider-unavailable' };
  }

  _applyDefaultReward(placement, context) {
    if (!this.saveManager) return null;
    if (placement === REWARDED_PLACEMENTS.DOUBLE_CASH) {
      const bonus = Math.max(0, Math.floor(Number(context.baseCash || 500)));
      if (bonus > 0) this.saveManager.addCash(bonus);
      return { type: placement, cashAdded: bonus };
    }
    if (placement === REWARDED_PLACEMENTS.UNLOCK_NEON) {
      const sel = this.saveManager.getData().selectedVehicle || 'C01';
      const color = context.neonColor || 'cyan';
      this.saveManager.setCustomization(sel, { neon: color });
      return { type: placement, vehicleId: sel, neon: color };
    }
    return { type: placement };
  }

  async showRewardedAd(placement = REWARDED_PLACEMENTS.DOUBLE_CASH, context = {}) {
    if (this.adInProgress) return { ok: false, rewarded: false, reason: 'ad-in-progress' };
    this._beginAdFreeze('rewarded', placement);

    let outcome = { ok: false, rewarded: false };
    try {
      outcome = await this._dispatchProviderAd('rewarded', !!context.simulateError);
    } catch (err) {
      outcome = { ok: false, rewarded: false, error: err?.message };
    }

    if (outcome.ok && outcome.rewarded) {
      const savedReward = this._applyDefaultReward(placement, context);
      this.onGrantReward?.(placement, { ...context, savedReward });
      this.trackEvent('ad_rewarded_watched', { placement, provider: outcome.provider });
      this.eventBus?.emit?.('ad:rewardGranted', { placement, context, savedReward });
      this._endAdFreeze('rewarded', placement, 'adFinished');
      return { ok: true, rewarded: true, placement, provider: outcome.provider, savedReward };
    }

    this.trackEvent('ad_rewarded_failed', { placement, reason: outcome.error || outcome.reason || 'dismissed' });
    this._endAdFreeze('rewarded', placement, 'adError');
    return { ok: false, rewarded: false, placement, provider: outcome.provider, reason: outcome.error || outcome.reason || 'not-rewarded' };
  }

  async showInterstitial(reason = 'mission_interval', context = {}) {
    if (this.adInProgress) return { ok: false, skipped: true, reason: 'ad-in-progress' };
    if (this.saveManager?.getData?.()?.monetization?.removeAds) {
      return { ok: false, skipped: true, reason: 'remove-ads-iap' };
    }

    this._beginAdFreeze('interstitial', reason);
    let outcome = { ok: false };
    try {
      outcome = await this._dispatchProviderAd('interstitial', !!context.simulateError);
    } catch (err) {
      outcome = { ok: false, error: err?.message };
    }

    this.trackEvent(outcome.ok ? 'ad_interstitial_shown' : 'ad_interstitial_error', { reason, provider: outcome.provider });
    this._endAdFreeze('interstitial', reason, outcome.ok ? 'adFinished' : 'adError');
    return { ok: !!outcome.ok, skipped: false, reason, provider: outcome.provider };
  }

  async onMissionCompleted(missionId = '') {
    const mon = this.saveManager?.getData?.()?.monetization || { removeAds: false, missionsSinceInterstitial: 0 };
    if (mon.removeAds) {
      return { interstitialShown: false, count: 0, skipped: 'remove-ads-iap' };
    }

    const nextCount = Number(mon.missionsSinceInterstitial || 0) + 1;
    if (nextCount >= INTERSTITIAL_MISSION_INTERVAL) {
      this.saveManager?.save?.({ monetization: { ...mon, missionsSinceInterstitial: 0 } });
      const res = await this.showInterstitial('every_2_missions', { missionId });
      return { interstitialShown: res.ok, count: 0, adResult: res };
    }

    this.saveManager?.save?.({ monetization: { ...mon, missionsSinceInterstitial: nextCount } });
    return { interstitialShown: false, count: nextCount };
  }

  async purchaseProduct(sku, receipt = null) {
    if (sku !== 'remove_ads' && sku !== 'unlock_all_vehicles') {
      return { ok: false, reason: 'unknown-sku' };
    }
    if (!this.verifyPurchase) return {ok:false, reason:'purchase-provider-unavailable'};
    let verified;
    try { verified = await this.verifyPurchase(sku, receipt); } catch { return {ok:false, reason:'purchase-verification-failed'}; }
    if (verified !== true) return {ok:false, reason:'purchase-not-verified'};
    if (this.saveManager?.getData) {
      const mon = { ...(this.saveManager.getData().monetization || {}) };
      if (sku === 'remove_ads') {
        mon.removeAds = true;
        mon.missionsSinceInterstitial = 0;
      }
      if (sku === 'unlock_all_vehicles') {
        mon.unlockAllVehicles = true;
      }
      this.saveManager.save({ monetization: mon });
    }
    this.trackEvent('iap_purchased', { sku });
    this.eventBus?.emit?.('iap:purchased', { sku });
    return { ok: true, sku };
  }
}
