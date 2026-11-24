/**
 * Viral Score Card Generator (1200x630 PNG / SVG fallback) for Neon Bay: Overdrive.
 * Produces shareable rank badges from player SaveManager career telemetry.
 * Pure zero-import ES Module.
 */

export const SHARE_CARD_WIDTH = 1200;
export const SHARE_CARD_HEIGHT = 630;

export function computePlayerRankBadge({ completedCount = 0, totalStars = 0, cash = 0 } = {}) {
  if (completedCount >= 20) return { key: 'rankLegend', tier: 'S+', accent: '#ffd700' };
  if (completedCount >= 10 || totalStars >= 25) return { key: 'rankEnforcer', tier: 'A', accent: '#ff007f' };
  if (completedCount >= 3 || cash >= 5000) return { key: 'rankDrifter', tier: 'B', accent: '#00f0ff' };
  return { key: 'rankRookie', tier: 'C', accent: '#38f288' };
}

export class ShareCardGenerator {
  constructor({
    i18n = null,
    saveManager = null,
    doc = globalThis.document || null,
    win = globalThis.window || null
  } = {}) {
    this.i18n = i18n || null;
    this.saveManager = saveManager || null;
    this.doc = doc || null;
    this.win = win || null;
    this.lastCard = null;
  }

  collectStats(overrides = {}) {
    const data = this.saveManager?.getData?.() || {};
    const completed = Array.isArray(data.completedMissions) ? data.completedMissions : [];
    const starMap = data.starRatings || {};
    const totalStars = Object.values(starMap).reduce((sum, n) => sum + (Number(n) || 0), 0);
    const unlockedCars = data.unlockedVehicles?.cars?.length || 2;
    const unlockedBikes = data.unlockedVehicles?.bikes?.length || 1;
    const stats = {
      cash: Number.isFinite(overrides.cash) ? overrides.cash : (Number(data.cash) || 500),
      completedCount: Number.isFinite(overrides.completedCount) ? overrides.completedCount : completed.length,
      totalStars: Number.isFinite(overrides.totalStars) ? overrides.totalStars : totalStars,
      vehiclesUnlocked: unlockedCars + unlockedBikes,
      streak: Number(data.dailyStreak?.count || 0),
      city2Unlocked: !!data.city2Unlocked
    };
    const rank = computePlayerRankBadge(stats);
    return { ...stats, rank };
  }

  generateScoreCardPNG(overrides = {}) {
    const stats = this.collectStats(overrides);
    const rankLabel = this.i18n?.t?.(stats.rank.key) || stats.rank.key;
    const title = this.i18n?.t?.('gameTitle') || 'NEON BAY: OVERDRIVE';
    const summaryLine = this.i18n?.t?.('scoreCardSubtitle', {
      missions: stats.completedCount,
      stars: stats.totalStars,
      cash: Math.round(stats.cash).toLocaleString('en-US')
    }) || `${stats.completedCount}/20 MISSIONS · ${stats.totalStars} STARS · RS ${Math.round(stats.cash)}`;

    let dataUrl = '';
    if (this.doc?.createElement) {
      const canvas = this.doc.createElement('canvas');
      canvas.width = SHARE_CARD_WIDTH;
      canvas.height = SHARE_CARD_HEIGHT;
      const ctx = canvas.getContext?.('2d');
      if (ctx) {
        const bg = ctx.createLinearGradient(0, 0, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT);
        bg.addColorStop(0, '#070b16');
        bg.addColorStop(0.55, '#121a32');
        bg.addColorStop(1, '#1f0c2e');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT);

        // Neon border & header glow
        ctx.strokeStyle = stats.rank.accent;
        ctx.lineWidth = 6;
        ctx.strokeRect(24, 24, SHARE_CARD_WIDTH - 48, SHARE_CARD_HEIGHT - 48);

        ctx.fillStyle = '#00f0ff';
        ctx.font = 'bold 28px Segoe UI, sans-serif';
        ctx.fillText(title, 64, 96);

        ctx.fillStyle = stats.rank.accent;
        ctx.font = '900 72px Segoe UI, sans-serif';
        ctx.fillText(rankLabel, 64, 200);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 38px Segoe UI, sans-serif';
        ctx.fillText(summaryLine, 64, 290);

        ctx.fillStyle = '#cfe4f5';
        ctx.font = '600 26px Segoe UI, sans-serif';
        ctx.fillText(
          `GARAGE: ${stats.vehiclesUnlocked}/16 · STREAK: ${stats.streak}D · CITY 2: ${stats.city2Unlocked ? 'MIRAGE VALLEY OPEN' : 'LOCKED'}`,
          64,
          365
        );

        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 34px Segoe UI, sans-serif';
        ctx.fillText(`RANK TIER [${stats.rank.tier}]`, 64, 540);
        dataUrl = canvas.toDataURL('image/png');
      }
    }

    if (!dataUrl) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#0a0e18"/><text x="64" y="180" fill="#00f0ff" font-size="56">${title} — ${rankLabel}</text><text x="64" y="280" fill="#ffffff" font-size="36">${summaryLine}</text></svg>`;
      dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    }

    const result = {
      ok: true,
      width: SHARE_CARD_WIDTH,
      height: SHARE_CARD_HEIGHT,
      dataUrl,
      text: `${title} — ${rankLabel} (${summaryLine})`,
      stats
    };
    this.lastCard = result;
    return result;
  }

  async shareOrDownload(overrides = {}) {
    const card = this.generateScoreCardPNG(overrides);
    let shared = false;
    try {
      if (typeof this.win?.navigator?.share === 'function') {
        await this.win.navigator.share({ title: 'Neon Bay: Overdrive', text: card.text });
        shared = true;
      }
    } catch {}

    if (!shared && this.doc?.createElement && card.dataUrl.startsWith('data:image/png')) {
      const a = this.doc.createElement('a');
      a.href = card.dataUrl;
      a.download = `neon-bay-score-${Date.now()}.png`;
      a.style.display = 'none';
      this.doc.body?.appendChild?.(a);
      a.click?.();
      a.remove?.();
    }
    return { ...card, shared };
  }
}
