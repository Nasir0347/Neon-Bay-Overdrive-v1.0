/**
 * Runtime Bridge connecting `AdManager`, `I18nManager` (6 locales), and `ShareCardGenerator`
 * into the live Neon Bay: Overdrive runtime.
 * Pure zero-import ES Module.
 */

export function initRuntimeRelease({
  AdModule,
  I18nModule,
  ShareModule,
  win = globalThis.window,
  doc = globalThis.document
} = {}) {
  if (!win || !doc || !AdModule || !I18nModule || !ShareModule) return null;

  const bus = win.NeonEventBus || null;
  const saveMgr = win.NeonSave || null;
  const gameState = win.NeonGameState || null;

  const i18n = new I18nModule.I18nManager({
    saveManager: saveMgr,
    eventBus: bus,
    doc
  });
  win.NeonI18n = i18n;
  if (win.NeonMissions) win.NeonMissions.i18n = i18n;
  i18n.applyToDom();
  win.NeonPhone?.updateChromeLabels?.();
  win.updateHUD?.();
  win.updateTouchUI?.();

  const shareCard = new ShareModule.ShareCardGenerator({
    i18n,
    saveManager: saveMgr,
    doc,
    win
  });
  win.NeonShareCard = shareCard;

  let wasRunningBeforeAd = true;
  const ads = new AdModule.AdManager({
    win,
    doc,
    eventBus: bus,
    saveManager: saveMgr,
    audioManager: win.NeonAudio || null,
    gameState,
    onPauseGame: () => {
      wasRunningBeforeAd = typeof running !== 'undefined' ? !!running : true;
      if (typeof running !== 'undefined') running = false;
      win.clearControls?.();
      win.audioUpdate?.(0);
      win.updateTouchUI?.();
    },
    onResumeGame: () => {
      if (typeof running !== 'undefined') running = wasRunningBeforeAd;
      if (typeof firstFrame !== 'undefined') firstFrame = true;
      if (typeof last !== 'undefined' && win.performance) last = win.performance.now();
      win.sceneDirty = true;
      win.updateHUD?.();
      win.updateTouchUI?.();
    },
    onGrantReward: (placement, ctx) => {
      if (placement === AdModule.REWARDED_PLACEMENTS.DOUBLE_CASH) {
        if (typeof cash === 'number' && saveMgr?.getData) {
          cash = saveMgr.getData().cash;
        }
        if (typeof toast === 'function') {
          toast(`2X CASH REWARD! +Rs ${ctx?.savedReward?.cashAdded || 500}`);
        }
      } else if (placement === AdModule.REWARDED_PLACEMENTS.REVIVE_20S) {
        if (win.NeonMissions) {
          const id = ctx?.missionId || win.NeonMissions.lastResult?.missionId || win.NeonMissions.activeMission?.id;
          if (id) {
            win.NeonMissions.retryMission();
            win.NeonMissions.remainingTimeSec += 20;
            win.NeonMissions.totalTimeLimitSec += 20;
          }
        }
        const rv = typeof inCar !== 'undefined' && inCar && typeof currentRide === 'function' ? currentRide() : null;
        if (rv) rv.hp = 100;
        if (typeof toast === 'function') toast('REVIVED! +20s Bonus Timer & Full Repair!');
      } else if (placement === AdModule.REWARDED_PLACEMENTS.VIP_TEST_DRIVE) {
        win.NeonSideHustles?.startVipTestDrive?.();
      } else if (placement === AdModule.REWARDED_PLACEMENTS.UNLOCK_NEON) {
        const vehId = ctx?.savedReward?.vehicleId || 'C01';
        const spec = win.NeonGarage?.getVehicle?.(vehId);
        if (spec) {
          win.NeonGarage.onApplyVisuals?.(spec, win.NeonGarage.getCustomization(vehId), win.NeonGarage.getEffectiveStats(vehId));
        }
        if (typeof toast === 'function') toast(`FREE NEON UNDERGLOW UNLOCKED FOR ${vehId}!`);
      }
      win.audioCue?.('success');
      win.updateHUD?.();
    }
  });
  win.NeonAds = ads;

  ads.hideExternalLinksInIframe();
  ads.trackEvent('game_loaded', { platform: ads.platform, locale: i18n.getLanguage() });

  // Connect mission lifecycle & rewarded CTA requests to AdManager
  bus?.on?.('mission:start', () => {
    ads.gameplayStart();
  });

  bus?.on?.('mission:complete', ({ missionId, rewardCash }) => {
    ads.happytime();
    ads.gameplayStop();
    ads.onMissionCompleted(missionId);
    ads.trackEvent('mission_complete', { missionId, rewardCash });
  });

  bus?.on?.('mission:fail', ({ missionId, reason }) => {
    ads.gameplayStop();
    ads.trackEvent('mission_fail', { missionId, reason });
  });

  bus?.on?.('monetization:rewardedAdRequest', ({ missionId, kind }) => {
    const m = win.NeonMissions?.getMission?.(missionId);
    ads.showRewardedAd(kind || AdModule.REWARDED_PLACEMENTS.DOUBLE_CASH, {
      missionId,
      baseCash: m?.rewardCash || 600
    });
  });

  bus?.on?.('i18n:languageChange', () => {
    i18n.applyToDom();
    win.NeonPhone?.updateChromeLabels?.();
    if (win.NeonPhone?.isOpen) win.NeonPhone.render();
    win.NeonMissions?.refreshI18n?.();
    win.updateHUD?.();
    win.updateTouchUI?.();
  });

  return { ads, i18n, shareCard };
}
