/**
 * Daily Missions Generator (24h Reset) & 7-Day Streak Skin Unlocker.
 * Generates 3 deterministic procedural daily tasks per ISO calendar date,
 * tracks live gameplay progress, awards cash, and unlocks the 7-day exclusive skin.
 * Pure zero-import ES Module.
 */

export const STREAK_REWARD_DAYS = 7;

export const STREAK_REWARD_SKIN = Object.freeze({
  id: 'STREAK_GOLD_CHROME',
  name: '7-Day Gold Chrome',
  paint: '#ffd700',
  neon: 'gold',
  description: 'Exclusive 7-Day Daily Streak Chrome Gold Finish + Neon Underglow'
});

export const DAILY_TASK_POOL = Object.freeze([
  Object.freeze({
    id: 'DT_DRIFT_500',
    title: 'Continuous Drift Master',
    description: 'Drift 500m continuously without losing slide momentum.',
    metric: 'continuous_drift_m',
    target: 500,
    rewardCash: 900,
    mode: 'peak'
  }),
  Object.freeze({
    id: 'DT_ESCAPE_3STAR',
    title: 'Heat Ghost (< 45s Escape)',
    description: 'Escape a 3-Star (or higher) police chase in under 45 seconds.',
    metric: 'escape_3star_under_sec',
    target: 1,
    maxSec: 45,
    rewardCash: 1200,
    mode: 'count'
  }),
  Object.freeze({
    id: 'DT_BIKE_RAMPS_3',
    title: 'Two-Wheel Air',
    description: 'Launch off 3 stunt ramps while riding a motorcycle.',
    metric: 'bike_ramps',
    target: 3,
    rewardCash: 850,
    mode: 'count'
  }),
  Object.freeze({
    id: 'DT_NOS_BURST_4',
    title: 'Neon Nitro Junkie',
    description: 'Ignite Nitro boost 4 times on Neon Bay boulevards.',
    metric: 'nos_activations',
    target: 4,
    rewardCash: 700,
    mode: 'count'
  }),
  Object.freeze({
    id: 'DT_PROPS_SMASH_10',
    title: 'City Wrecker',
    description: 'Knock down 10 breakable street props (lampposts, hydrants, cones).',
    metric: 'props_smashed',
    target: 10,
    rewardCash: 750,
    mode: 'count'
  }),
  Object.freeze({
    id: 'DT_TOP_SPEED_220',
    title: 'Redline Courier',
    description: 'Hit 220 km/h anywhere in Neon Bay.',
    metric: 'top_speed_kmh',
    target: 220,
    rewardCash: 1000,
    mode: 'peak'
  }),
  Object.freeze({
    id: 'DT_TAXI_FARES_2',
    title: 'After-Hours Chauffeur',
    description: 'Complete 2 VIP Taxi dropoffs in Free Roam.',
    metric: 'vip_taxi_fares',
    target: 2,
    rewardCash: 950,
    mode: 'count'
  }),
  Object.freeze({
    id: 'DT_VIGILANTE_2',
    title: 'Interceptor Justice',
    description: 'Stop 2 fleeing suspects in Police Vigilante Mode (C12).',
    metric: 'vigilante_takedowns',
    target: 2,
    rewardCash: 1100,
    mode: 'count'
  }),
  Object.freeze({
    id: 'DT_CLEAN_MILE',
    title: 'Zero-Scratch Cruiser',
    description: 'Drive 1000m at speed without vehicle damage.',
    metric: 'clean_drive_m',
    target: 1000,
    rewardCash: 800,
    mode: 'peak'
  })
]);

export function todayISODate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '2026-01-01';
  return d.toISOString().slice(0, 10);
}

function hashDateStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function generateDailyMissions(isoDate = todayISODate()) {
  const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(String(isoDate)) ? String(isoDate) : todayISODate();
  let seed = hashDateStr(safeDate);
  const pool = [...DAILY_TASK_POOL];
  const chosen = [];

  for (let i = 0; i < 3 && pool.length > 0; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const idx = seed % pool.length;
    const picked = pool.splice(idx, 1)[0];
    chosen.push(Object.freeze({ ...picked, isoDate: safeDate, progress: 0, completed: false }));
  }
  return chosen;
}

export function validateDailyTasks(tasks) {
  const errors = [];
  if (!Array.isArray(tasks) || tasks.length !== 3) {
    return { valid: false, errors: ['Daily missions generator must return exactly 3 tasks'] };
  }
  const seen = new Set();
  for (const t of tasks) {
    if (!t || typeof t.id !== 'string' || !t.id.trim()) errors.push('Missing daily task id');
    else if (seen.has(t.id)) errors.push(`Duplicate daily task id: ${t.id}`);
    else seen.add(t.id);
    if (!Number.isFinite(t?.target) || t.target <= 0) errors.push(`Invalid target for ${t?.id}`);
    if (!Number.isFinite(t?.rewardCash) || t.rewardCash <= 0) errors.push(`Invalid rewardCash for ${t?.id}`);
    if (typeof t?.metric !== 'string' || !t.metric) errors.push(`Missing metric for ${t?.id}`);
  }
  return { valid: errors.length === 0, errors };
}

export class DailyMissionManager {
  constructor({
    saveManager = null,
    eventBus = null,
    isoDate = todayISODate(),
    onRewardToast = null
  } = {}) {
    this.saveManager = saveManager || null;
    this.eventBus = eventBus || null;
    this.onRewardToast = typeof onRewardToast === 'function' ? onRewardToast : null;
    this.isoDate = todayISODate(isoDate);
    this.tasks = [];
    this.streakClaimedToday = false;
    this.syncDate(this.isoDate);
  }

  syncDate(isoDate = todayISODate()) {
    this.isoDate = todayISODate(isoDate);
    const savedRet = this.saveManager?.getData?.()?.retention || {};
    const savedCompleted = savedRet.dailyDate === this.isoDate && Array.isArray(savedRet.dailyCompletedIds)
      ? new Set(savedRet.dailyCompletedIds)
      : new Set();

    const baseTasks = generateDailyMissions(this.isoDate);
    this.tasks = baseTasks.map((t) => ({
      ...t,
      progress: savedCompleted.has(t.id) ? t.target : 0,
      completed: savedCompleted.has(t.id)
    }));

    const streakData = this.saveManager?.getData?.()?.dailyStreak || {};
    this.streakClaimedToday = streakData.lastClaimDate === this.isoDate;

    if (this.saveManager && savedRet.dailyDate !== this.isoDate) {
      this.saveManager.save({
        retention: {
          ...savedRet,
          dailyDate: this.isoDate,
          dailyCompletedIds: []
        }
      });
    }
    return this.getTasks();
  }

  getTasks() {
    return this.tasks.map((t) => ({ ...t }));
  }

  getStreakStatus() {
    const data = this.saveManager?.getData?.() || {};
    return {
      count: Number(data.dailyStreak?.count || 0),
      bestStreak: Number(data.dailyStreak?.bestStreak || 0),
      lastClaimDate: data.dailyStreak?.lastClaimDate || null,
      skinUnlocked: !!data.retention?.streakSkinUnlocked,
      skin: STREAK_REWARD_SKIN,
      allThreeDoneToday: this.tasks.every((t) => t.completed)
    };
  }

  recordProgress(metric, value = 1, meta = {}) {
    if (!metric) return { updated: [], streak: this.getStreakStatus() };
    const updated = [];
    let newlyCompletedAny = false;

    for (const task of this.tasks) {
      if (task.metric !== metric || task.completed) continue;
      if (metric === 'escape_3star_under_sec') {
        const stars = Number(meta.stars ?? 3);
        const sec = Number(meta.elapsedSec ?? 0);
        if (stars < 3 || sec > (task.maxSec || 45)) continue;
      }

      const prev = task.progress;
      if (task.mode === 'peak') {
        task.progress = Math.max(task.progress, Number(value) || 0);
      } else {
        task.progress += Number(value) || 0;
      }
      if (task.progress !== prev) updated.push(task.id);

      if (task.progress >= task.target) {
        task.progress = task.target;
        task.completed = true;
        newlyCompletedAny = true;
        this.saveManager?.addCash?.(task.rewardCash);
        this.onRewardToast?.(`DAILY COMPLETE: ${task.title} (+Rs ${task.rewardCash})`);
        this.eventBus?.emit?.('daily:taskComplete', {
          taskId: task.id,
          title: task.title,
          rewardCash: task.rewardCash,
          isoDate: this.isoDate
        });
      }
    }

    if (newlyCompletedAny && this.saveManager?.getData) {
      const data = this.saveManager.getData();
      const doneIds = this.tasks.filter((t) => t.completed).map((t) => t.id);
      this.saveManager.save({
        retention: {
          ...(data.retention || {}),
          dailyDate: this.isoDate,
          dailyCompletedIds: doneIds
        }
      });

      if (doneIds.length === this.tasks.length && !this.streakClaimedToday) {
        this.streakClaimedToday = true;
        const streak = this.saveManager.claimDailyStreak?.(this.isoDate);
        if (streak && streak.count >= STREAK_REWARD_DAYS) {
          this.saveManager.setCustomization?.(this.saveManager.getData().selectedVehicle || 'C01', {
            paint: STREAK_REWARD_SKIN.paint,
            neon: STREAK_REWARD_SKIN.neon
          });
          this.onRewardToast?.(`7-DAY STREAK REWARD UNLOCKED: ${STREAK_REWARD_SKIN.name}!`);
          this.eventBus?.emit?.('daily:streakRewardUnlocked', {
            streakCount: streak.count,
            skin: STREAK_REWARD_SKIN
          });
        }
      }
    }

    return { updated, streak: this.getStreakStatus() };
  }
}
