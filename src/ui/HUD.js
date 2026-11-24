/**
 * Miami Neon Glassmorphism HUD & Responsive Layout Engine.
 * Pure ES Module with zero static imports so it runs in Node ESM tests,
 * browsers, and classic script bundles identically.
 */

export const NEON_DISTRICTS = [
  { id: 'apex-core', name: 'Apex Core', subtitle: 'Downtown · Solaris Tower', x: 0, z: 0, accent: '#00F0FF' },
  { id: 'palm-strip', name: 'Palm Strip', subtitle: 'Beachfront · Pier 99', x: 0, z: -680, accent: '#FF007F' },
  { id: 'iron-docks', name: 'Iron Docks', subtitle: 'Industrial Port & Stunt Ramps', x: -650, z: 0, accent: '#FFD700' },
  { id: 'bayview-heights', name: 'Bayview Heights', subtitle: 'Highways, Garage & Airport', x: 0, z: 620, accent: '#00F0FF' }
];

export const PORTRAIT_FOV_MIN_BONUS = 10;
export const PORTRAIT_FOV_MAX_BONUS = 14;

const DISTRICT_BY_ID = new Map(NEON_DISTRICTS.map((d) => [d.id, d]));
const DISTRICT_BY_NAME = new Map(NEON_DISTRICTS.map((d) => [d.name.toLowerCase(), d]));

export function resolveNeonDistrict(x = 0, z = 0) {
  const nx = Number.isFinite(x) ? x : 0;
  const nz = Number.isFinite(z) ? z : 0;
  if (nz < -220) return DISTRICT_BY_ID.get('palm-strip');
  if (nz > 210 || (nx > 520 && Math.abs(nz) <= 360)) return DISTRICT_BY_ID.get('bayview-heights');
  if (nx < -180) return DISTRICT_BY_ID.get('iron-docks');
  return DISTRICT_BY_ID.get('apex-core');
}

export function resolveNeonStreet(x = 0, z = 0) {
  const nx = Number.isFinite(x) ? x : 0;
  const nz = Number.isFinite(z) ? z : 0;
  if (Math.abs(nx) <= 8 && nz <= -900) return 'Pier 99 Boardwalk';
  if (nx >= 680 && nx <= 820 && Math.abs(nz) <= 340) return 'Neon Bay Airport Runway';
  if (Math.abs(nx) <= 22) return 'Oceanic Boulevard';
  if (Math.abs(nz) <= 22) return 'Central Boulevard';
  if (Math.abs(nz + 600) <= 22) return 'Sunset Strip';
  if (Math.abs(nx) >= 878 || Math.abs(nz) >= 878) return 'Skyline Expressway';
  if (Math.abs(nx + 600) <= 22) return 'Iron Docks Avenue';
  if (Math.abs(nx - 600) <= 22 || Math.abs(nx - 300) <= 22) return 'Bay Avenue';
  return 'Crosstown Avenue';
}

export function computeResponsiveFov(baseFov, aspect) {
  if (!Number.isFinite(aspect) || aspect <= 0) return baseFov;
  if (aspect >= 1) return baseFov;
  const bonus = Math.round((PORTRAIT_FOV_MIN_BONUS + Math.min(4, (1 - aspect) * 8)) * 10) / 10;
  return baseFov + bonus;
}

export function formatCash(amount, currency = '$') {
  const numeric = Number.isFinite(Number(amount)) ? Math.round(Number(amount)) : 0;
  const sign = numeric < 0 ? '-' : '';
  const absFormatted = Math.abs(numeric).toLocaleString('en-US');
  return `${sign}${currency}${absFormatted}`;
}

export function formatWantedStars(level = 0, maxStars = 5) {
  const cap = Math.max(1, Math.floor(maxStars));
  const clamped = Math.max(0, Math.min(cap, Math.floor(Number(level) || 0)));
  const slots = [];
  for (let i = 0; i < cap; i++) {
    slots.push({ lit: i < clamped });
  }
  return {
    level: clamped,
    active: clamped > 0,
    starsText: '★'.repeat(clamped) + '☆'.repeat(Math.max(0, cap - clamped)),
    slots
  };
}

export function computeLayoutMode(width, height, isTouch = false) {
  const w = Math.max(1, Math.round(Number(width) || 1));
  const h = Math.max(1, Math.round(Number(height) || 1));
  const aspect = w / h;
  const isPortrait = aspect < 1;
  const tier = w < 640 ? 'mobile' : w <= 1080 ? 'tablet' : 'desktop';
  const isCompact = h <= 420 || w <= 420;
  const portraitFovBonus = computeResponsiveFov(0, aspect);
  return {
    width: w,
    height: h,
    aspect,
    orientation: isPortrait ? 'portrait' : 'landscape',
    isPortrait,
    isTouch: !!isTouch,
    tier,
    isCompact,
    portraitFovBonus
  };
}

export class HUD {
  constructor({ doc = globalThis.document, win = globalThis.window, eventBus = null, onLayoutChange = null } = {}) {
    this.doc = doc || null;
    this.win = win || null;
    this.eventBus = eventBus || null;
    this.onLayoutChange = typeof onLayoutChange === 'function' ? onLayoutChange : null;

    this.mounted = false;
    this.layout = null;
    this.currentDistrict = null;
    this.toastTimer = 0;
    this.pulseTimer = 0;
    this.damageTimer = 0;
    this.lastCash = null;
    this.lastQuality = null;
    this.lastWantedKey = null;
    this.lastTimerText = null;
    this.currencyPrefix = 'Rs ';

    this.els = {};
    this._cleanups = [];
    this._resizeObserver = null;
  }

  _el(tag, id, className) {
    const el = this.doc.createElement(tag);
    if (id) el.id = id;
    if (className) el.className = className;
    return el;
  }

  _ensureTopRightCluster() {
    const body = this.doc.body;
    let wrap = this.doc.getElementById('hudTopRight');
    if (!wrap) {
      wrap = this._el('div', 'hudTopRight');
      body.appendChild(wrap);
    }

    let cashEl = this.doc.getElementById('hudCash');
    if (!cashEl) {
      cashEl = this._el('div', 'hudCash', 'hud-glass-pill tabular-nums');
      cashEl.setAttribute('aria-label', 'Cash balance');
      cashEl.textContent = formatCash(500, this.currencyPrefix);
      wrap.appendChild(cashEl);
    }

    let starsEl = this.doc.getElementById('wantedStars');
    if (!starsEl) {
      starsEl = this._el('div', 'wantedStars', 'hud-glass-pill');
      starsEl.setAttribute('aria-label', 'Wanted level');
      starsEl.dataset.level = '0';
      for (let i = 0; i < 5; i++) {
        const slot = this._el('span', '', 'star-slot');
        slot.textContent = '★';
        starsEl.appendChild(slot);
      }
      wrap.appendChild(starsEl);
    }

    let timerEl = this.doc.getElementById('missionTimer');
    if (!timerEl) {
      timerEl = this._el('div', 'missionTimer', 'hud-glass-pill tabular-nums');
      timerEl.setAttribute('aria-label', 'Mission timer');
      timerEl.hidden = true;
      wrap.appendChild(timerEl);
    }

    let missionStar = this.doc.getElementById('missionStarBadge');
    if (!missionStar) { missionStar = this._el('div', 'missionStarBadge', 'mission-star badge'); wrap.appendChild(missionStar); }
    missionStar.textContent = '⭐ 0';
    missionStar.setAttribute('aria-label', 'Mission stars earned: 0');
    this.els.missionStar = missionStar;
    this.els.topRight = wrap;
    this.els.cash = cashEl;
    this.els.wantedStars = starsEl;
    this.els.starSlots = [...starsEl.querySelectorAll('.star-slot')];
    this.els.missionTimer = timerEl;
  }

  _ensureToastAndEffects() {
    const body = this.doc.body;

    let neonToast = this.doc.getElementById('neonToast');
    if (!neonToast) {
      neonToast = this._el('div', 'neonToast', 'neon-toast');
      neonToast.setAttribute('role', 'status');
      neonToast.setAttribute('aria-live', 'polite');
      neonToast.hidden = true;

      const eyebrow = this._el('div', 'neonToastEyebrow', 'neon-toast-eyebrow');
      const title = this._el('div', 'neonToastTitle', 'neon-toast-title');
      const sub = this._el('div', 'neonToastSub', 'neon-toast-sub');
      neonToast.append(eyebrow, title, sub);
      body.appendChild(neonToast);
    }

    let speedLines = this.doc.getElementById('speedLines');
    if (!speedLines) {
      speedLines = this._el('div', 'speedLines');
      speedLines.setAttribute('aria-hidden', 'true');
      body.appendChild(speedLines);
    }

    let damageVignette = this.doc.getElementById('damageVignette');
    if (!damageVignette) {
      damageVignette = this._el('div', 'damageVignette');
      damageVignette.setAttribute('aria-hidden', 'true');
      body.appendChild(damageVignette);
    }

    this.els.neonToast = neonToast;
    this.els.toastEyebrow = neonToast.querySelector('.neon-toast-eyebrow') || neonToast.firstElementChild;
    this.els.toastTitle = neonToast.querySelector('.neon-toast-title') || neonToast.children[1];
    this.els.toastSub = neonToast.querySelector('.neon-toast-sub') || neonToast.children[2];
    this.els.speedLines = speedLines;
    this.els.damageVignette = damageVignette;
    this.els.telemetry = this.doc.getElementById('telemetry');
  }

  mount() {
    if (!this.doc || !this.doc.body) return this;
    if (this.mounted) return this;

    this._ensureTopRightCluster();
    this._ensureToastAndEffects();

    const body = this.doc.body;
    if (body.classList.contains('mobile')) {
      body.classList.add('input-touch');
      body.classList.remove('input-kb');
    }

    const onResize = () => this.applyResponsiveLayout();
    if (typeof this.win?.ResizeObserver === 'function' && this.doc.documentElement) {
      this._resizeObserver = new this.win.ResizeObserver(onResize);
      this._resizeObserver.observe(this.doc.documentElement);
    }
    this.win?.addEventListener?.('resize', onResize);
    this.win?.visualViewport?.addEventListener?.('resize', onResize);
    this._cleanups.push(() => {
      this._resizeObserver?.disconnect?.();
      this._resizeObserver = null;
      this.win?.removeEventListener?.('resize', onResize);
      this.win?.visualViewport?.removeEventListener?.('resize', onResize);
    });

    const onKeyDown = (e) => {
      if (e && e.isTrusted === false) return;
      this.setInputSource('keyboard');
    };
    const onTouchStart = () => this.setInputSource('touch');
    const onPointerDown = (e) => {
      if (e?.pointerType === 'touch') this.setInputSource('touch');
    };

    this.win?.addEventListener?.('keydown', onKeyDown, { passive: true });
    this.doc.addEventListener('touchstart', onTouchStart, { passive: true });
    this.doc.addEventListener('pointerdown', onPointerDown, { passive: true });
    this._cleanups.push(() => {
      this.win?.removeEventListener?.('keydown', onKeyDown);
      this.doc.removeEventListener('touchstart', onTouchStart);
      this.doc.removeEventListener('pointerdown', onPointerDown);
    });

    this.mounted = true;
    this.applyResponsiveLayout();
    return this;
  }

  setInputSource(source) {
    const body = this.doc?.body;
    if (!body) return;
    if (source === 'touch') {
      body.classList.remove('input-kb');
      body.classList.add('input-touch');
    } else if (source === 'keyboard' || source === 'gamepad') {
      body.classList.add('input-kb');
      body.classList.remove('input-touch');
    }
  }

  applyResponsiveLayout(width, height, isTouch) {
    const vp = this.win?.visualViewport;
    const w = Number.isFinite(width) ? width : (vp?.width || this.win?.innerWidth || this.doc?.documentElement?.clientWidth || 1280);
    const h = Number.isFinite(height) ? height : (vp?.height || this.win?.innerHeight || this.doc?.documentElement?.clientHeight || 720);
    const body = this.doc?.body;
    const touchFlag = typeof isTouch === 'boolean'
      ? isTouch
      : !!(body?.classList?.contains('mobile') && !body?.classList?.contains('input-kb'));

    const layout = computeLayoutMode(w, h, touchFlag);
    this.layout = layout;

    if (body) {
      body.classList.toggle('portrait', layout.isPortrait);
      body.classList.toggle('landscape', !layout.isPortrait);
      body.classList.toggle('hud-compact', layout.isCompact);
      body.classList.toggle('hud-tablet', layout.tier === 'tablet');
      body.classList.toggle('hud-tablet-touch', touchFlag && Math.min(w, h) >= 560);
    }

    this.onLayoutChange?.(layout);
    this.eventBus?.emit?.('ui:layout', layout);
    return layout;
  }

  setQualityPreset(quality) {
    const q = String(quality || 'low').toLowerCase();
    this.lastQuality = q;
    this.doc?.body?.classList?.toggle('gfx-low', q === 'low');
  }

  _showToast(kind, eyebrow, title, subtitle = '', accent = '#00F0FF', duration = 3.5) {
    const toast = this.els.neonToast;
    if (!toast) return;
    toast.dataset.kind = kind;
    toast.style.setProperty('--toast-accent', accent);
    if (this.els.toastEyebrow) this.els.toastEyebrow.textContent = eyebrow;
    if (this.els.toastTitle) this.els.toastTitle.textContent = title;
    if (this.els.toastSub) {
      this.els.toastSub.textContent = subtitle || '';
      this.els.toastSub.hidden = !subtitle;
    }
    toast.hidden = false;
    this.toastTimer = duration;
  }

  showDistrictToast(districtOrName, subtitle = '') {
    let info = null;
    if (districtOrName && typeof districtOrName === 'object') {
      info = districtOrName;
    } else if (typeof districtOrName === 'string') {
      info = DISTRICT_BY_NAME.get(districtOrName.toLowerCase()) ||
        DISTRICT_BY_ID.get(districtOrName.toLowerCase()) ||
        { name: districtOrName, subtitle, accent: '#00F0FF' };
    } else {
      info = NEON_DISTRICTS[0];
    }
    const finalSub = subtitle || info.subtitle || 'Neon Bay District';
    this._showToast('district', 'ENTERING DISTRICT', info.name.toUpperCase(), finalSub, info.accent || '#00F0FF', 3.5);
    this.eventBus?.emit?.('ui:districtToast', { district: info.name, subtitle: finalSub });
  }

  showRadioToast(stationName, caption = '') {
    const name = String(stationName || '99.5 Neon FM');
    this._showToast('radio', 'RADIO · ON AIR', name.toUpperCase(), caption, '#FF007F', 3.5);
    this.eventBus?.emit?.('ui:radioToast', { station: name, caption });
  }

  triggerDamageFlash() {
    this.damageTimer = 0.38;
    if (this.els.damageVignette && !this.doc?.body?.classList?.contains('reduced-effects')) {
      this.els.damageVignette.style.opacity = '0.85';
    }
  }

  update(state = {}, dt = 0.016) {
    const step = Number.isFinite(dt) && dt >= 0 ? dt : 0.016;
    if (!this.mounted) this.mount();

    if (state.quality && state.quality !== this.lastQuality) {
      this.setQualityPreset(state.quality);
    }

    if (state.currency) {
      this.currencyPrefix = state.currency;
    }

    // 1. Tabular-nums Cash Counter
    if (Number.isFinite(state.cash) && this.els.cash) {
      const roundedCash = Math.round(state.cash);
      if (roundedCash !== this.lastCash) {
        const gained = this.lastCash !== null;
        this.lastCash = roundedCash;
        this.els.cash.textContent = formatCash(roundedCash, this.currencyPrefix);
        if (gained) {
          this.pulseTimer = 0.75;
          this.els.cash.classList.add('pulse');
        }
      }
    }
    if (this.pulseTimer > 0) {
      this.pulseTimer = Math.max(0, this.pulseTimer - step);
      if (this.pulseTimer === 0) this.els.cash?.classList.remove('pulse');
    }

    // 2. 5-Star Wanted Indicator
    const rawLevel = state.wanted ? (state.wantedLevel || 1) : 0;
    const stars = formatWantedStars(rawLevel, 5);
    const wantedKey = `${stars.active ? 1 : 0}:${stars.level}`;
    if (wantedKey !== this.lastWantedKey && this.els.wantedStars) {
      this.lastWantedKey = wantedKey;
      this.els.wantedStars.dataset.level = String(stars.level);
      this.els.wantedStars.classList.toggle('wanted-active', stars.active);
      this.els.wantedStars.setAttribute('aria-label', stars.active ? `Wanted level ${stars.level} of 5` : 'Wanted level 0 of 5');
      this.els.starSlots.forEach((slot, idx) => {
        const lit = stars.slots[idx]?.lit;
        slot.classList.toggle('lit', !!lit);
        slot.classList.toggle('flashing', !!lit && stars.active);
      });
    }

    // 3. Mission Timer Badge
    if (this.els.missionTimer) {
      if (state.timerSeconds != null && Number.isFinite(state.timerSeconds)) {
        const secs = Math.max(0, Math.ceil(state.timerSeconds));
        const mins = Math.floor(secs / 60);
        const rem = secs % 60;
        const txt = `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
        if (txt !== this.lastTimerText) {
          this.lastTimerText = txt;
          this.els.missionTimer.textContent = txt;
        }
        this.els.missionTimer.classList.toggle('urgent', secs <= 15);
        this.els.missionTimer.hidden = false;
      } else {
        this.els.missionTimer.hidden = true;
        this.lastTimerText = null;
      }
    }

    // 4. Telemetry Nitro / Drift / High-Speed Lines (> 220 km/h)
    const speedKmh = Number(state.speedKmh) || 0;
    if (this.els.telemetry) {
      this.els.telemetry.classList.toggle('nos-active', !!state.nosActive);
      this.els.telemetry.classList.toggle('drifting', !!state.drifting);
    }
    if (this.els.speedLines) {
      const reduced = !!state.reducedEffects;
      const ratio = !reduced && speedKmh > 220 ? Math.min(1, (speedKmh - 220) / 100) : 0;
      this.els.speedLines.style.opacity = ratio > 0 ? String(Math.round(ratio * 70) / 100) : '0';
    }

    // 5. Damage Vignette Fade
    if (this.damageTimer > 0 && this.els.damageVignette) {
      this.damageTimer = Math.max(0, this.damageTimer - step);
      const op = state.reducedEffects ? 0 : (this.damageTimer / 0.38) * 0.75;
      this.els.damageVignette.style.opacity = this.damageTimer > 0 ? op.toFixed(2) : '0';
    }

    // 6. District Crossings + Toast Auto-Fade
    if (Number.isFinite(state.x) && Number.isFinite(state.z)) {
      const nextDistrict = resolveNeonDistrict(state.x, state.z);
      if (!this.currentDistrict) {
        this.currentDistrict = nextDistrict;
        if (state.forceDistrictToast) this.showDistrictToast(nextDistrict);
      } else if (this.currentDistrict.id !== nextDistrict.id || state.forceDistrictToast) {
        this.currentDistrict = nextDistrict;
        this.showDistrictToast(nextDistrict);
      }
    }

    if (this.toastTimer > 0) {
      this.toastTimer = Math.max(0, this.toastTimer - step);
      if (this.toastTimer === 0 && this.els.neonToast) {
        this.els.neonToast.hidden = true;
      }
    }
  }

  destroy() {
    for (const fn of this._cleanups) fn();
    this._cleanups = [];
    this.mounted = false;
  }
}
