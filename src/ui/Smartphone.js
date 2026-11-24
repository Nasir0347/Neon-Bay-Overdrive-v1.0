/**
 * Slide-up Neon OS Smartphone UI with 4 Functional Apps:
 * 1. Missions
 * 2. Mechanic / Garage Spawner (12 Cars + 4 Bikes + Paint / Neon / Turbo)
 * 3. Music Radio (99.5 Neon FM, 104.2 Drift Radio, 88.0 Bay Beats, OFF)
 * 4. Cheat Code Dialer (9999 Super Jump, 7777 Golden Supercar, 0000 Clear Wanted, 5555 Moon Gravity)
 * Pure ES Module with zero static imports.
 */

export const CHEAT_CODES = Object.freeze({
  '9999': { code: '9999', id: 'super_jump', name: 'SUPER JUMP', description: 'Toggle 2.5x Super Jump' },
  '7777': { code: '7777', id: 'golden_supercar', name: 'VORTEX APEX GOLD', description: 'Spawn Golden Supercar (C11)' },
  '0000': { code: '0000', id: 'clear_wanted', name: 'CLEAR WANTED', description: 'Clear all Police Wanted Stars' },
  '5555': { code: '5555', id: 'moon_gravity', name: 'MOON GRAVITY', description: 'Toggle Lunar Gravity (0.35x)' }
});

export const RADIO_STATIONS_SPEC = Object.freeze([
  { id: 0, name: 'OFF', genre: 'Ambient City', caption: 'Radio muted — ambient coastal skyline.' },
  { id: 1, name: '99.5 Neon FM', genre: 'Miami Synthwave', caption: 'Now playing: Neon Horizon (Synthwave)' },
  { id: 2, name: '104.2 Drift Radio', genre: 'Phonk / Bass', caption: 'Now playing: Iron Docks Drift (Phonk)' },
  { id: 3, name: '88.0 Bay Beats', genre: 'Hip-Hop / Trap', caption: 'Now playing: Sunset Strip Cruiser (Beats)' }
]);

export const PHONE_APPS = Object.freeze(['home', 'missions', 'garage', 'radio', 'cheats']);

const PAINT_SWATCHES = ['#00f0ff', '#ff007f', '#ffd700', '#f4f6fa', '#181c24', '#e63946', '#2ec4b6', '#7b2cbf'];
const NEON_OPTIONS = ['off', 'cyan', 'magenta', 'gold', 'red', 'green', 'purple'];

export class Smartphone {
  constructor({
    doc = globalThis.document,
    win = globalThis.window,
    eventBus = null,
    garageManager = null,
    handlers = {}
  } = {}) {
    this.doc = doc || null;
    this.win = win || null;
    this.eventBus = eventBus || null;
    this.garageManager = garageManager || null;
    this.handlers = handlers || {};

    this.isOpen = false;
    this.activeApp = 'home';
    this.garageFilter = 'car';
    this.missionFilter = 'all';
    this.dialBuffer = '';
    this.cheatFeedback = 'Enter 4-digit cheat code (9999 / 7777 / 0000 / 5555)';
    this.activeStationIndex = 0;

    this.cheatsState = {
      superJump: false,
      moonGravity: false,
      jumpMultiplier: 1.0,
      gravityScale: 1.0,
      goldenSupercarSpawns: 0,
      wantedClears: 0
    };

    this.rootEl = null;
    this.screenEl = null;
    this.navButtons = new Map();
    this._mounted = false;
    this._cleanups = [];
  }

  _el(tag, className, text = '') {
    const el = this.doc.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    return el;
  }

  _t(key, fallback) {
    if (typeof this.handlers?.t === 'function') {
      const val = this.handlers.t(key, fallback);
      if (val && val !== key) return val;
    }
    const gT = this.win?.NeonI18n?.t?.bind(this.win.NeonI18n);
    if (typeof gT === 'function') {
      const val = gT(key);
      if (val && val !== key) return val;
    }
    return fallback;
  }

  updateChromeLabels() {
    if (!this.rootEl) return;
    const brand = this.rootEl.querySelector('.phone-brand');
    if (brand) brand.textContent = this._t('phoneTitle', 'SMARTPHONE');
    const osEl = this.rootEl.querySelector('.phone-os');
    if (osEl) osEl.textContent = this._t('phone.title', 'NEON PHONE v1.0');
    const photoBtn = this.rootEl.querySelector('#phonePhotoBtn');
    if (photoBtn) photoBtn.textContent = this._t('hud.photo', 'PHOTO');
    const closeBtn = this.rootEl.querySelector('#phoneCloseBtn');
    if (closeBtn) closeBtn.textContent = this._t('phone.close', 'CLOSE');
    const tabMap = {
      home: this._t('phone.home', 'HOME'),
      missions: this._t('phone.missions', 'MISSIONS'),
      garage: this._t('phone.garage', 'GARAGE'),
      radio: this._t('phone.radio', 'RADIO'),
      cheats: this._t('phone.cheats', 'CHEATS')
    };
    for (const [id, btn] of this.navButtons.entries()) {
      if (tabMap[id]) btn.textContent = tabMap[id];
    }

    const clockEl = this.rootEl.querySelector('#phoneSysClock');
    if (clockEl) {
      const tod = this.win?.worldClock?.getTimeText?.() || this.win?.NeonEnvFX?.worldClock?.getTimeText?.();
      clockEl.textContent = tod || '21:30';
    }
    const distEl = this.rootEl.querySelector('#phoneSysDistrict');
    if (distEl) {
      const spanTxt = this.doc?.querySelector?.('.district span')?.textContent || 'APEX CORE';
      distEl.textContent = `${spanTxt.split('·')[0].trim()} · 5G`;
    }
    const cashEl = this.rootEl.querySelector('#phoneSysCash');
    if (cashEl) {
      const cashVal = this.handlers.getCash?.() ?? this.garageManager?.saveManager?.getData?.()?.cash ?? 500;
      cashEl.textContent = `RS ${Math.round(cashVal).toLocaleString('en-US')}`;
    }
  }

  mount() {
    if (!this.doc?.body || this._mounted) return this;

    let root = this.doc.getElementById('neonSmartphone');
    if (!root) {
      root = this._el('aside', 'neon-phone');
      root.id = 'neonSmartphone';
      root.setAttribute('role', 'dialog');
      root.setAttribute('aria-label', 'Neon Bay Smartphone');
      root.hidden = true;

      const shell = this._el('div', 'phone-shell');
      const sysBar = this._el('div', 'phone-sysbar');
      const sysLeft = this._el('div', 'phone-sys-left');
      const sysClock = this._el('span', 'phone-sys-clock', '21:30');
      sysClock.id = 'phoneSysClock';
      const sysDist = this._el('span', 'phone-sys-dist', 'APEX CORE · 5G');
      sysDist.id = 'phoneSysDistrict';
      sysLeft.append(sysClock, sysDist);

      const sysRight = this._el('div', 'phone-sys-right');
      const sysCash = this._el('span', 'phone-sys-cash', 'RS 500');
      sysCash.id = 'phoneSysCash';
      const sysBatt = this._el('span', 'phone-sys-batt', '98%');
      sysRight.append(sysCash, sysBatt);
      sysBar.append(sysLeft, sysRight);

      const statusBar = this._el('div', 'phone-topbar');
      const titleGroup = this._el('div', 'phone-title-group');
      const osTag = this._el('span', 'phone-os', 'NEON OS v2.0');
      const title = this._el('strong', 'phone-brand', 'SMARTPHONE');
      titleGroup.append(osTag, title);

      const topActions = this._el('div', 'phone-top-actions');
      const photoBtn = this._el('button', 'phone-mini-btn', 'PHOTO');
      photoBtn.id = 'phonePhotoBtn';
      photoBtn.setAttribute('aria-label', 'Open Photo Mode');
      const closeBtn = this._el('button', 'phone-mini-btn danger', 'CLOSE');
      closeBtn.id = 'phoneCloseBtn';
      closeBtn.setAttribute('aria-label', 'Close Smartphone');
      topActions.append(photoBtn, closeBtn);
      statusBar.append(titleGroup, topActions);

      const nav = this._el('nav', 'phone-tabs');
      for (const [id, label] of [
        ['home', 'HOME'],
        ['missions', 'MISSIONS'],
        ['garage', 'GARAGE'],
        ['radio', 'RADIO'],
        ['cheats', 'CHEATS']
      ]) {
        const b = this._el('button', 'phone-tab', label);
        b.dataset.app = id;
        b.setAttribute('aria-label', `${label} app`);
        nav.appendChild(b);
      }

      const screen = this._el('div', 'phone-screen');
      screen.id = 'phoneScreen';
      shell.append(sysBar, statusBar, nav, screen);
      root.appendChild(shell);
      this.doc.body.appendChild(root);
    }

    this.rootEl = root;
    this.screenEl = root.querySelector('#phoneScreen');
    this.navButtons.clear();
    for (const btn of root.querySelectorAll('.phone-tab')) {
      const appId = btn.dataset.app;
      this.navButtons.set(appId, btn);
      const onClick = (e) => {
        e?.preventDefault?.();
        this.setApp(appId);
      };
      btn.addEventListener('click', onClick);
      this._cleanups.push(() => btn.removeEventListener('click', onClick));
    }

    const closeBtn = root.querySelector('#phoneCloseBtn');
    if (closeBtn) {
      const onClose = (e) => {
        e?.preventDefault?.();
        this.close();
      };
      closeBtn.addEventListener('click', onClose);
      this._cleanups.push(() => closeBtn.removeEventListener('click', onClose));
    }

    const photoBtn = root.querySelector('#phonePhotoBtn');
    if (photoBtn) {
      const onPhoto = (e) => {
        e?.preventDefault?.();
        this.close();
        this.handlers.onOpenPhotoMode?.();
      };
      photoBtn.addEventListener('click', onPhoto);
      this._cleanups.push(() => photoBtn.removeEventListener('click', onPhoto));
    }

    const onKeyDown = (e) => {
      if (e.repeat) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.code === 'Tab' || e.code === 'KeyI' || e.code === 'KeyP') {
        if (this.isOpen) {
          e.preventDefault();
          e.stopImmediatePropagation?.();
          this.close();
        } else if (!this.handlers.canOpen || this.handlers.canOpen()) {
          e.preventDefault();
          e.stopImmediatePropagation?.();
          this.open('home');
        }
      } else if (e.code === 'Escape' && this.isOpen) {
        e.preventDefault();
        e.stopImmediatePropagation?.();
        this.close();
      }
    };
    this.win?.addEventListener?.('keydown', onKeyDown, true);
    this._cleanups.push(() => this.win?.removeEventListener?.('keydown', onKeyDown, true));

    this._mounted = true;
    this.render();
    return this;
  }

  open(app = 'home') {
    if (!this._mounted) this.mount();
    if (this.handlers.canOpen && !this.handlers.canOpen()) return false;
    this.isOpen = true;
    if (PHONE_APPS.includes(app)) this.activeApp = app;
    if (this.rootEl) this.rootEl.hidden = false;
    this.doc?.body?.classList?.add('smartphone-open');
    this.render();
    this.eventBus?.emit?.('ui:phoneAction', { action: 'open', app: this.activeApp });
    if (this._mounted) {
      this.doc?.activeElement?.blur?.();
    }
    return true;
  }

  close() {
    this.win?.NeonMissions?.saveProgress?.();
    this.isOpen = false;
    if (this.rootEl) this.rootEl.hidden = true;
    this.doc?.body?.classList?.remove('smartphone-open');
    this.eventBus?.emit?.('ui:phoneAction', { action: 'close', app: this.activeApp });
    if (this._mounted) {
      this.doc?.activeElement?.blur?.();
    }
    return true;
  }

  toggle(app = 'home') {
    return this.isOpen ? !this.close() : this.open(app);
  }

  setApp(app) {
    if (!PHONE_APPS.includes(app)) return false;
    this.activeApp = app;
    this.render();
    this.eventBus?.emit?.('ui:phoneAction', { action: 'navigate', app });
    if (this._mounted) {
      this.doc?.activeElement?.blur?.();
    }
    return true;
  }

  dialCheat(rawCode) {
    const clean = String(rawCode ?? this.dialBuffer).replace(/\D/g, '').slice(0, 4);
    const cheat = CHEAT_CODES[clean];
    if (!cheat) {
      this.cheatFeedback = `INVALID CODE (${clean || 'EMPTY'}) — TRY 9999, 7777, 0000 OR 5555`;
      if (this._mounted) this.render();
      return { ok: false, code: clean, reason: 'invalid-code', state: { ...this.cheatsState } };
    }

    if (clean === '9999') {
      this.cheatsState.superJump = !this.cheatsState.superJump;
      this.cheatsState.jumpMultiplier = this.cheatsState.superJump ? 2.5 : 1.0;
      this.handlers.onSuperJump?.(this.cheatsState.superJump, this.cheatsState.jumpMultiplier);
      this.cheatFeedback = `CHEAT 9999: SUPER JUMP ${this.cheatsState.superJump ? 'ON (2.5x)' : 'OFF'}`;
    } else if (clean === '7777') {
      this.cheatsState.goldenSupercarSpawns += 1;
      const spawned = this.handlers.onSpawnGolden?.() || this.garageManager?.spawnGoldenSupercar?.();
      this.cheatFeedback = 'CHEAT 7777: VORTEX APEX GOLD (C11) SPAWNED!';
      if (spawned && spawned.ok === false) {
        this.cheatFeedback = 'CHEAT 7777: GOLDEN SUPERCAR UNLOCKED!';
      }
    } else if (clean === '0000') {
      this.cheatsState.wantedClears += 1;
      this.handlers.onClearWanted?.();
      this.cheatFeedback = 'CHEAT 0000: POLICE WANTED STARS CLEARED!';
    } else if (clean === '5555') {
      this.cheatsState.moonGravity = !this.cheatsState.moonGravity;
      this.cheatsState.gravityScale = this.cheatsState.moonGravity ? 0.35 : 1.0;
      this.handlers.onMoonGravity?.(this.cheatsState.moonGravity, this.cheatsState.gravityScale);
      this.cheatFeedback = `CHEAT 5555: MOON GRAVITY ${this.cheatsState.moonGravity ? 'ON (0.35x)' : 'OFF'}`;
    }

    this.dialBuffer = '';
    this.eventBus?.emit?.('ui:cheatCode', {
      code: clean,
      id: cheat.id,
      name: cheat.name,
      state: { ...this.cheatsState }
    });
    if (this._mounted) this.render();
    return { ok: true, code: clean, cheat, state: { ...this.cheatsState } };
  }

  _syncTabClasses() {
    for (const [id, btn] of this.navButtons.entries()) {
      btn.classList?.toggle?.('active', id === this.activeApp);
    }
  }

  render() {
    this.updateChromeLabels();
    this._syncTabClasses();
    if (!this.screenEl || !this.doc) return;
    this.screenEl.replaceChildren();

    if (this.activeApp === 'home') this._renderHome();
    else if (this.activeApp === 'missions') this._renderMissions();
    else if (this.activeApp === 'garage') this._renderGarage();
    else if (this.activeApp === 'radio') this._renderRadio();
    else if (this.activeApp === 'cheats') this._renderCheats();
  }

  _renderHome() {
    const badge = this._el('div', 'mission-star badge');
    const { earned, total } = this.win?.NeonMissions?.getStarProgress?.() || { earned: 0, total: 0 };
    badge.textContent = `⭐ ${earned}/${total}`;
    badge.setAttribute('aria-label', `Mission stars: ${earned} of ${total}`);
    this.screenEl.appendChild(badge);
    const infoBar = this._el('div', 'phone-card phone-summary');
    const selected = this.garageManager?.getSelectedVehicle?.();
    const cashVal = this.handlers.getCash?.() ?? this.garageManager?.saveManager?.getData?.()?.cash ?? 500;
    infoBar.textContent = `CASH: Rs ${Math.round(cashVal).toLocaleString('en-US')} · ACTIVE: ${selected ? `${selected.id} ${selected.name}` : 'C01'}`;
    this.screenEl.appendChild(infoBar);

    const grid = this._el('div', 'phone-app-grid');
    const appSpecs = [
      ['missions', this._t('appMissions', 'MISSIONS'), 'Story Contracts & Waypoints', 'mag', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 12h6M9 16h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'],
      ['garage', this._t('appGarage', 'MECHANIC'), '12 Cars · 4 Bikes · Tuning', 'cyan', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'],
      ['radio', this._t('appRadio', 'MUSIC RADIO'), 'Neon FM · Drift · Bay Beats', 'purple', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l12-2v13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6" cy="18" r="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="18" cy="16" r="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>'],
      ['cheats', this._t('appCheats', 'CHEATS DIALER'), '9999 · 7777 · 0000 · 5555', 'gold', '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="4" width="12" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 8h4M10 12h4M10 16h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>']
    ];
    for (const [appId, title, desc, tone, iconSvg] of appSpecs) {
      const card = this._el('button', 'phone-app-tile');
      card.dataset.openApp = appId;
      const orb = this._el('span', `phone-app-orb ${tone}`);
      orb.innerHTML = iconSvg;
      card.append(
        orb,
        this._el('strong', '', title),
        this._el('span', 'phone-app-desc', desc)
      );
      card.addEventListener('click', () => this.setApp(appId));
      grid.appendChild(card);
    }
    this.screenEl.appendChild(grid);

    const utilDock = this._el('div', 'phone-utility-orbs');
    const utilItems = [
      ['open-map', this._t('hud.map', 'MAP'), '<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>', () => { this.close(); this.handlers.onOpenMap?.(); }],
      ['open-photo', this._t('hud.photo', 'PHOTO'), '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h4l2-3h4l2 3h4v11H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>', () => { this.close(); this.handlers.onOpenPhotoMode?.(); }],
      ['open-help', this._t('phone.help', 'HELP GUIDE'), '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.5 9a2.5 2.5 0 0 1 5 .8c0 1.7-2.5 2.1-2.5 3.7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17.2" r="1.1" fill="currentColor"/></svg>', () => { this.close(); this.win?.toggleMissionHelp?.(true); }]
    ];
    for (const [act, lbl, svg, fn] of utilItems) {
      const ub = this._el('button', 'phone-util-btn');
      ub.dataset.phoneAction = act;
      const orb = this._el('span', 'phone-util-orb');
      orb.innerHTML = svg;
      ub.append(orb, this._el('span', 'phone-util-lbl', lbl));
      ub.addEventListener('click', fn);
      utilDock.appendChild(ub);
    }
    this.screenEl.appendChild(utilDock);

    const curQ = this.handlers.getQuality?.() || this.garageManager?.saveManager?.getData?.()?.settings?.graphicsQuality || 'low';
    const gfxCard = this._el('div', 'phone-card');
    const gfxHead = this._el('div', 'phone-row');
    gfxHead.append(
      this._el('strong', '', this._t('graphicsLabel', 'GRAPHICS QUALITY')),
      this._el('span', 'phone-badge', String(curQ).toUpperCase())
    );
    const gfxBar = this._el('div', 'phone-row phone-filter-bar');
    for (const [qid, label] of [['low', 'LOW'], ['medium', 'MEDIUM'], ['high', 'HIGH']]) {
      const qb = this._el('button', `phone-filter-btn${curQ === qid ? ' active' : ''}`, label);
      qb.dataset.qualityPreset = qid;
      qb.addEventListener('click', () => {
        this.handlers.onSetQuality?.(qid);
        this.render();
      });
      gfxBar.appendChild(qb);
    }
    gfxCard.append(gfxHead, gfxBar);
    this.screenEl.appendChild(gfxCard);

    const curOpacity = this.handlers.getHudOpacity?.() || this.garageManager?.saveManager?.getData?.()?.settings?.hudOpacity || 'glass';
    const opCard = this._el('div', 'phone-card');
    const opHead = this._el('div', 'phone-row');
    const opLabelMap = {
      clear: this._t('hud.opClear', 'CLEAR'),
      glass: this._t('hud.opGlass', 'GLASS'),
      solid: this._t('hud.opSolid', 'SOLID')
    };
    opHead.append(
      this._el('strong', '', this._t('hud.opacity', 'HUD OPACITY')),
      this._el('span', 'phone-badge', opLabelMap[curOpacity] || 'GLASS')
    );
    const opBar = this._el('div', 'phone-row phone-filter-bar');
    for (const oid of ['clear', 'glass', 'solid']) {
      const ob = this._el('button', `phone-filter-btn${curOpacity === oid ? ' active' : ''}`, opLabelMap[oid]);
      ob.dataset.hudOpacity = oid;
      ob.addEventListener('click', () => {
        this.handlers.onSetHudOpacity?.(oid);
        this.render();
      });
      opBar.appendChild(ob);
    }
    opCard.append(opHead, opBar);
    this.screenEl.appendChild(opCard);

    // Touch Steering Mode (Virtual Joystick vs Arrow Buttons) + Audio Mute + Quick Map
    const curSteer = this.handlers.getSteerMode?.() || this.garageManager?.saveManager?.getData?.()?.settings?.steerMode || 'joystick';
    const curMuted = !!this.handlers.getMuted?.();
    const ctrlCard = this._el('div', 'phone-card');
    const ctrlHead = this._el('div', 'phone-row');
    ctrlHead.append(
      this._el('strong', '', this._t('hud.controls', 'CONTROLS & AUDIO')),
      this._el('span', 'phone-badge', curSteer === 'buttons' ? this._t('hud.btnMode', 'BUTTONS') : this._t('hud.stickMode', 'JOYSTICK'))
    );
    const ctrlBar = this._el('div', 'phone-row phone-filter-bar');
    for (const [sid, lbl] of [['joystick', this._t('hud.stickMode', 'STICK')], ['buttons', this._t('hud.btnMode', 'BTNS')]]) {
      const sb = this._el('button', `phone-filter-btn${curSteer === sid ? ' active' : ''}`, lbl);
      sb.dataset.steerMode = sid;
      sb.addEventListener('click', () => {
        this.handlers.onSetSteerMode?.(sid);
        this.render();
      });
      ctrlBar.appendChild(sb);
    }
    const muteBtn = this._el('button', `phone-filter-btn${curMuted ? '' : ' active'}`, curMuted ? this._t('hud.muted', 'MUTED') : this._t('hud.sound', 'SOUND'));
    muteBtn.dataset.phoneAction = 'toggle-mute';
    muteBtn.addEventListener('click', () => {
      this.handlers.onToggleMute?.();
      this.render();
    });
    const mapQuickBtn = this._el('button', 'phone-filter-btn', this._t('hud.map', 'MAP'));
    mapQuickBtn.dataset.phoneAction = 'open-map';
    mapQuickBtn.addEventListener('click', () => {
      this.close();
      this.handlers.onOpenMap?.();
    });
    ctrlBar.append(muteBtn, mapQuickBtn);
    ctrlCard.append(ctrlHead, ctrlBar);
    this.screenEl.appendChild(ctrlCard);

    // Multi-Language Selector (6 Locales: EN/ES/PT/FR/DE/AR) + Share Score Card
    const curLang = this.handlers.getLanguage?.() || this.garageManager?.saveManager?.getData?.()?.settings?.language || 'en';
    const langCard = this._el('div', 'phone-card');
    const langHead = this._el('div', 'phone-row');
    langHead.append(
      this._el('strong', '', this._t('languageLabel', 'LANGUAGE')),
      this._el('span', 'phone-badge', String(curLang).toUpperCase())
    );
    const langBar = this._el('div', 'phone-row phone-filter-bar');
    for (const [lid, label] of [['en', 'EN'], ['es', 'ES'], ['pt', 'PT'], ['fr', 'FR'], ['de', 'DE'], ['ar', 'AR']]) {
      const lb = this._el('button', `phone-filter-btn${curLang === lid ? ' active' : ''}`, label);
      lb.dataset.localeCode = lid;
      lb.addEventListener('click', () => {
        this.handlers.onSetLanguage?.(lid);
        this.render();
      });
      langBar.appendChild(lb);
    }
    const shareBtn = this._el('button', 'phone-action-btn', this._t('shareScoreCard', 'SHARE SCORE CARD'));
    shareBtn.dataset.phoneAction = 'share-score-card';
    shareBtn.addEventListener('click', () => this.handlers.onShareCard?.());
    langCard.append(langHead, langBar, shareBtn);
    this.screenEl.appendChild(langCard);
  }

  _renderMissions() {
    const missions = this.handlers.getMissions?.() || [
      { id: 0, category: 'story', act: 1, title: 'M1 — Neon Midnight Drop', subtitle: 'Deliver parcel to Pier 99 (60s)', unlocked: true, completed: false },
      { id: 1, category: 'story', act: 1, title: 'M2 — Rain & Drift', subtitle: 'Score Neon Drift points on Sunset Strip', unlocked: true, completed: false },
      { id: 2, category: 'story', act: 1, title: 'M3 — Alleyway Phantom', subtitle: 'Navigate Shadow Alley on Bike', unlocked: false, completed: false }
    ];

    const storyList = missions.filter((m) => (m.category || 'story') === 'story');
    const completedStory = storyList.filter((m) => m.completed).length;
    const totalStars = storyList.reduce((acc, m) => acc + (Number(m.stars) || 0), 0);
    const maxStory = Math.max(20, storyList.length);
    const pct = Math.round((completedStory / maxStory) * 100);

    const progBanner = this._el('div', 'phone-progress-banner');
    const progRow = this._el('div', 'phone-row');
    progRow.append(
      this._el('strong', '', `CAMPAIGN ${completedStory}/${maxStory}`),
      this._el('span', 'phone-badge', `★ ${totalStars}/60`)
    );
    const progTrack = this._el('div', 'phone-prog-track');
    const progFill = this._el('div', 'phone-prog-fill');
    progFill.style.width = `${pct}%`;
    progTrack.appendChild(progFill);
    progBanner.append(progRow, progTrack);
    this.screenEl.appendChild(progBanner);

    const filterBar = this._el('div', 'phone-row phone-filter-bar');
    for (const [fId, fLbl] of [
      ['all', 'ALL'],
      ['story', 'STORY'],
      ['daily', 'DAILY'],
      ['challenge', 'MODES'],
      ['hustle', 'HUSTLE']
    ]) {
      const fb = this._el('button', `phone-filter-btn${this.missionFilter === fId ? ' active' : ''}`, fLbl);
      fb.dataset.missionFilter = fId;
      fb.addEventListener('click', () => {
        this.missionFilter = fId;
        this.render();
      });
      filterBar.appendChild(fb);
    }
    this.screenEl.appendChild(filterBar);

    const actNames = {
      1: 'ACT 1 · STREETS OF NEON BAY',
      2: 'ACT 2 · SYNDICATE ESCALATION',
      3: 'ACT 3 · HEAVY METAL & STEALTH',
      4: 'ACT 4 · GRAND FINALE'
    };
    let lastAct = null;
    let lastCat = null;

    const visible = missions.filter((m) => {
      if (this.missionFilter === 'all') return true;
      return (m.category || 'story') === this.missionFilter;
    });

    for (const m of visible) {
      const cat = m.category || 'story';
      if (cat === 'story' && m.act && m.act !== lastAct) {
        lastAct = m.act;
        this.screenEl.appendChild(this._el('div', 'phone-section-head', actNames[m.act] || `ACT ${m.act}`));
      } else if (cat !== 'story' && cat !== lastCat) {
        lastCat = cat;
        const secLbl = cat === 'daily' ? 'DAILY CONTRACTS' : cat === 'challenge' ? 'VIRAL CHALLENGES' : 'SIDE HUSTLES';
        this.screenEl.appendChild(this._el('div', 'phone-section-head', secLbl));
      }

      const card = this._el('div', `phone-card${m.completed ? ' selected' : ''}`);
      const head = this._el('div', 'phone-row');
      head.append(
        this._el('strong', '', m.title),
        this._el('span', 'phone-badge', m.completed ? `COMPLETE${m.stars ? ' ★' + m.stars : ''}` : m.unlocked ? 'READY' : 'LOCKED')
      );
      card.appendChild(head);

      if (m.chapterTag || m.hasOnFootStage) {
        const metaRow = this._el('div', 'phone-meta-tags');
        if (m.chapterTag) metaRow.appendChild(this._el('span', 'phone-tag', m.chapterTag));
        if (m.hasOnFootStage) metaRow.appendChild(this._el('span', 'phone-tag onfoot', 'WALK-IN BUILDING'));
        card.appendChild(metaRow);
      }

      const hookText = m.storyHook || m.subtitle || '';
      if (hookText) {
        card.appendChild(this._el('p', 'phone-sub', hookText));
      }

      if (Array.isArray(m.steps) && m.steps.length) {
        const stepList = this._el('ul', 'phone-steps');
        m.steps.forEach((st, idx) => {
          stepList.appendChild(this._el('li', '', `${idx + 1}. ${st}`));
        });
        card.appendChild(stepList);
      }

      const btn = this._el(
        'button',
        'phone-action-btn',
        m.completed ? this._t('mission.retryBtn', 'REPLAY') : m.unlocked ? this._t('hud.startMission', 'START MISSION') : 'LOCKED'
      );
      btn.disabled = !m.unlocked;
      btn.addEventListener('click', () => {
        this.handlers.onStartMission?.(m.id);
        this.close();
      });
      card.appendChild(btn);
      this.screenEl.appendChild(card);
    }
  }

  _renderGarage() {
    if (!this.garageManager) {
      this.screenEl.appendChild(this._el('div', 'phone-card', 'Garage unavailable.'));
      return;
    }

    const filterBar = this._el('div', 'phone-row phone-filter-bar');
    for (const [kind, label] of [
      ['car', `${this._t('garage.cars', 'CARS')} (12)`],
      ['bike', `${this._t('garage.bikes', 'BIKES')} (4)`]
    ]) {
      const fb = this._el('button', `phone-filter-btn${this.garageFilter === kind ? ' active' : ''}`, label);
      fb.dataset.filter = kind;
      fb.addEventListener('click', () => {
        this.garageFilter = kind;
        this.render();
      });
      filterBar.appendChild(fb);
    }
    this.screenEl.appendChild(filterBar);

    const sel = this.garageManager.getSelectedVehicle();
    const cfg = this.garageManager.getCustomization(sel.id);
    const stats = this.garageManager.getEffectiveStats(sel.id);

    // Live Customizer for Selected Vehicle
    const cust = this._el('div', 'phone-card phone-customizer');
    cust.appendChild(this._el('strong', '', `${sel.id} ${sel.name} · ${stats.topSpeedKmh} KM/H · ${this._t('garage.turbo', 'TURBO')} LV ${cfg.turboLv}/3`));

    const statBars = this._el('div', 'phone-stat-bars');
    for (const [lbl, pct, tone] of [
      ['SPEED', Math.min(100, Math.round((stats.topSpeedKmh / 340) * 100)), 'cyan'],
      ['ACCEL', Math.min(100, Math.round((stats.accel / 26) * 100)), 'mag'],
      ['HANDLING', Math.min(100, Math.round((stats.handling / 2.2) * 100)), 'gold']
    ]) {
      const row = this._el('div', 'phone-stat-row');
      row.appendChild(this._el('span', 'phone-stat-lbl', lbl));
      const track = this._el('div', 'phone-stat-track');
      const fill = this._el('div', `phone-stat-fill ${tone}`);
      fill.style.width = `${pct}%`;
      track.appendChild(fill);
      row.append(track, this._el('span', 'phone-stat-val', `${pct}%`));
      statBars.appendChild(row);
    }
    cust.appendChild(statBars);

    const paintRow = this._el('div', 'phone-swatch-row');
    paintRow.appendChild(this._el('span', 'phone-lbl', `${this._t('garage.paint', 'PAINT')}:`));
    for (const hex of PAINT_SWATCHES) {
      const sw = this._el('button', `phone-swatch${cfg.paint === hex ? ' active' : ''}`, '');
      sw.style.background = hex;
      sw.dataset.paintHex = hex;
      sw.setAttribute('aria-label', `Paint ${hex}`);
      sw.addEventListener('click', () => {
        this.garageManager.setPaintColor(sel.id, hex);
        this.render();
      });
      paintRow.appendChild(sw);
    }
    cust.appendChild(paintRow);

    const neonRow = this._el('div', 'phone-swatch-row');
    neonRow.appendChild(this._el('span', 'phone-lbl', `${this._t('garage.neon', 'NEON')}:`));
    for (const nId of NEON_OPTIONS) {
      const nb = this._el('button', `phone-pill-btn phone-neon-pill neon-${nId}${cfg.neon === nId ? ' active' : ''}`, nId.toUpperCase());
      nb.dataset.neonId = nId;
      nb.addEventListener('click', () => {
        this.garageManager.setNeonUnderglow(sel.id, nId);
        this.render();
      });
      neonRow.appendChild(nb);
    }
    cust.appendChild(neonRow);

    const turboRow = this._el('div', 'phone-swatch-row');
    turboRow.appendChild(this._el('span', 'phone-lbl', `${this._t('garage.turbo', 'TURBO')}:`));
    for (let lv = 0; lv <= 3; lv++) {
      const tb = this._el('button', `phone-pill-btn${cfg.turboLv === lv ? ' active' : ''}`, `LV ${lv}`);
      tb.dataset.turboLv = String(lv);
      tb.addEventListener('click', () => {
        this.garageManager.upgradeTurbo(sel.id, lv, { free: true });
        this.render();
      });
      turboRow.appendChild(tb);
    }
    cust.appendChild(turboRow);
    this.screenEl.appendChild(cust);

    // Vehicle Fleet Spawner List
    const list = this.garageFilter === 'bike' ? this.garageManager.getBikes() : this.garageManager.getCars();
    for (const v of list) {
      const unlocked = this.garageManager.isUnlocked(v.id);
      const isSelected = sel.id === v.id;
      const card = this._el('div', `phone-card${isSelected ? ' selected' : ''}`);
      const row = this._el('div', 'phone-row');
      row.append(
        this._el('strong', '', `${v.id} · ${v.name}`),
        this._el('span', 'phone-badge', `${v.topSpeedKmh} KM/H`)
      );
      const meta = this._el('p', 'phone-sub', `${v.archetype} · ${v.scale.l.toFixed(2)}×${v.scale.w.toFixed(2)}×${v.scale.h.toFixed(2)}m · ${v.massKg}kg`);
      const actionBtn = this._el(
        'button',
        'phone-action-btn',
        unlocked ? this._t('garage.spawn', isSelected ? 'SPAWN / DELIVER NOW' : 'SELECT & SPAWN') : `${this._t('garage.unlock', 'UNLOCK')} (Rs ${v.price})`
      );
      actionBtn.dataset.vehicleAction = v.id;
      actionBtn.addEventListener('click', () => {
        if (!unlocked) {
          const res = this.garageManager.unlockVehicle(v.id);
          if (!res.ok) {
            this.cheatFeedback = `Need Rs ${v.price} to unlock ${v.name}`;
            this.render();
            return;
          }
        }
        this.garageManager.selectVehicle(v.id, { spawn: true });
        this.close();
      });
      card.append(row, meta, actionBtn);
      this.screenEl.appendChild(card);
    }
  }

  _renderRadio() {
    const stations = this.handlers.getRadioStations?.() || RADIO_STATIONS_SPEC;
    const currentIdx = this.handlers.getActiveStation?.() ?? this.activeStationIndex;

    for (let i = 0; i < stations.length; i++) {
      const st = stations[i];
      const active = i === currentIdx;
      const card = this._el('div', `phone-card${active ? ' selected' : ''}`);
      card.append(
        this._el('strong', '', st.name),
        this._el('p', 'phone-sub', st.caption || st.genre || '')
      );
      const btn = this._el(
        'button',
        'phone-action-btn',
        active ? `${this._t('radio.onAir', 'ON AIR')} ✓` : this._t('radio.tuneIn', 'TUNE IN')
      );
      btn.dataset.radioIdx = String(i);
      btn.disabled = active;
      btn.addEventListener('click', () => {
        this.activeStationIndex = i;
        this.handlers.onTuneRadio?.(i, st);
        this.render();
      });
      card.appendChild(btn);
      this.screenEl.appendChild(card);
    }
  }

  _renderCheats() {
    const display = this._el('div', 'phone-cheat-display tabular-nums', this.dialBuffer || '----');
    display.id = 'phoneCheatDisplay';
    const status = this._el('div', 'phone-cheat-status', this.cheatFeedback);
    status.id = 'phoneCheatStatus';
    this.screenEl.append(display, status);

    const quickRow = this._el('div', 'phone-quick-cheats');
    for (const c of Object.values(CHEAT_CODES)) {
      const qb = this._el('button', 'phone-pill-btn', `${c.code} · ${c.name}`);
      qb.dataset.quickCheat = c.code;
      qb.addEventListener('click', () => this.dialCheat(c.code));
      quickRow.appendChild(qb);
    }
    this.screenEl.appendChild(quickRow);

    const pad = this._el('div', 'phone-keypad');
    for (const key of ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', 'CALL']) {
      const lbl = key === 'CALL'
        ? this._t('cheats.call', 'CALL')
        : key === 'CLR'
        ? this._t('cheats.clear', 'CLR')
        : key;
      const kb = this._el('button', `phone-key${key === 'CALL' ? ' primary' : ''}`, lbl);
      kb.dataset.dialKey = key;
      kb.addEventListener('click', () => {
        if (key === 'CLR') {
          this.dialBuffer = '';
          display.textContent = '----';
        } else if (key === 'CALL') {
          this.dialCheat(this.dialBuffer);
        } else if (this.dialBuffer.length < 4) {
          this.dialBuffer += key;
          display.textContent = this.dialBuffer;
        }
      });
      pad.appendChild(kb);
    }
    this.screenEl.appendChild(pad);
  }

  destroy() {
    for (const fn of this._cleanups) fn();
    this._cleanups = [];
    this._mounted = false;
  }
}
