/**
 * Miami Neon Multi-Touch Driving Controls for Mobile & Tablet Viewports.
 * Unifies virtual analog driving/walking joystick, toggleable steer buttons,
 * 4-pedal multi-touch action cluster (Drift/Gas/Brake/NOS & Jump/Run/Enter on foot),
 * swipe camera orbit, and 12-shortcut PC parity Tools command grid directly with `InputManager`.
 * Pure zero-import ES Module.
 */

export class TouchControls {
  constructor({
    doc = globalThis.document || null,
    win = globalThis.window || null,
    inputManager = null,
    isMobile = false,
    steerMode = 'joystick',
    handlers = {}
  } = {}) {
    this.doc = doc;
    this.win = win;
    this.inputManager = inputManager;
    this.isMobile = !!isMobile;
    this._steerMode = steerMode === 'buttons' ? 'buttons' : 'joystick';
    this.handlers = handlers;

    this.rootEl = null;
    this.stickEl = null;
    this.knobEl = null;
    this.lookEl = null;
    this.qualityBtn = null;
    this.nosBtn = null;
    this.nosRingEl = null;
    this.driftBtn = null;
    this.lightsBtn = null;
    this.muteBtn = null;
    this.steerModeBtn = null;

    this._stickPointer = null;
    this._lookPointer = null;
    this._prevLookX = 0;
    this._inCar = true;
    this._nearbyVehicleName = '';
    this._drawerOpen = false;
    this._lastUpdateArgs = {};
    this._cleanups = [];
    this._mounted = false;
  }

  setSteerMode(mode, notify = true) {
    const next = mode === 'buttons' ? 'buttons' : 'joystick';
    this._steerMode = next;
    this._stickPointer = null;
    if (this.knobEl) this.knobEl.style.transform = 'translate(-50%, -50%)';
    this.inputManager?.setTouchAnalog?.(0, 0);
    if (this.rootEl) {
      this.rootEl.classList.toggle('steer-joystick', next === 'joystick');
      this.rootEl.classList.toggle('steer-buttons', next === 'buttons');
    }
    if (notify) this.handlers.onSteerModeChange?.(next);
    this.update(this._lastUpdateArgs);
    return next;
  }

  toggleSteerMode() {
    return this.setSteerMode(this._steerMode === 'joystick' ? 'buttons' : 'joystick', true);
  }

  mount() {
    if (!this.doc?.body || this._mounted) return this;

    // Always lock iOS Safari pinch-zoom gestures across touch viewports
    this.inputManager?.attachPinchZoomLock?.(this.doc);

    if (!this.isMobile) {
      this._mounted = true;
      return this;
    }

    this.doc.body.classList.add('mobile', 'input-touch');
    this.doc.body.classList.remove('input-kb');

    let ui = this.doc.getElementById('touchControls');
    if (!ui) {
      ui = this.doc.createElement('div');
      ui.id = 'touchControls';
      ui.className = this._steerMode === 'buttons' ? 'steer-buttons' : 'steer-joystick';
      ui.innerHTML =
        '<div id="touchTop">' +
          '<button id="touchPhone" type="button" aria-label="Open Smartphone (P)" title="Phone (P)">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="18" r="1" fill="currentColor"/></svg>' +
            '<span>PHONE</span>' +
          '</button>' +
          '<button id="touchToolsToggle" type="button" aria-label="Tools Menu" aria-expanded="false" title="Tools">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><line x1="4" y1="7" x2="20" y2="7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="9" cy="7" r="2" fill="currentColor"/><line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="15" cy="12" r="2" fill="currentColor"/><line x1="4" y1="17" x2="20" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="10" cy="17" r="2" fill="currentColor"/></svg>' +
            '<span>TOOLS</span>' +
          '</button>' +
          '<button id="touchPause" type="button" aria-label="Pause Game (Esc)" title="Pause (Esc)">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>' +
            '<span>PAUSE</span>' +
          '</button>' +
        '</div>' +
        '<div id="touchToolsDrawer" hidden>' +
          '<button id="touchFlip" type="button" data-action="flip" aria-label="Flip Car (R)" title="Flip Car (R)">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 0 1 14-5.3L21 9M20 4v5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 12a8 8 0 0 1-14 5.3L3 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
            '<span>FLIP</span>' +
          '</button>' +
          '<button id="touchCamera" type="button" data-action="camera" aria-label="Switch Camera (C)" title="Camera (C)">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8a2 2 0 0 1 2-2h3l2-2h4l2 2h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="13" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/></svg>' +
            '<span>CAM</span>' +
          '</button>' +
          '<button id="touchHorn" type="button" data-action="horn" aria-label="Horn (H)" title="Horn (H)">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h4l6 4V6l-6 4H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M17.5 9a4.5 4.5 0 0 1 0 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
            '<span>HORN</span>' +
          '</button>' +
          '<button id="touchLights" type="button" data-action="lights" aria-label="Headlights or Siren (N)" title="Lights (N)">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.6.6 1 1.5 1 2.5h6c0-1 .4-1.9 1-2.5A6 6 0 0 0 12 3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            '<span>LIGHTS</span>' +
          '</button>' +
          '<button id="touchRadio" type="button" aria-label="Next Radio Station (T)" title="Radio (T)">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V6l10-2v12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6.5" cy="18" r="2.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="16.5" cy="16" r="2.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>' +
            '<span>RADIO</span>' +
          '</button>' +
          '<button id="touchMap" type="button" aria-label="Full GPS Map (M)" title="Map (M)">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><line x1="9" y1="4" x2="9" y2="18" stroke="currentColor" stroke-width="2"/><line x1="15" y1="6" x2="15" y2="20" stroke="currentColor" stroke-width="2"/></svg>' +
            '<span>MAP</span>' +
          '</button>' +
          '<button id="touchPhoto" type="button" aria-label="Photo Mode (O)" title="Photo (O)">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="16.5" cy="7.5" r="1" fill="currentColor"/></svg>' +
            '<span>PHOTO</span>' +
          '</button>' +
          '<button id="touchQuality" type="button" aria-label="Graphics Quality (Q)" title="Graphics (Q)">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>' +
            '<span>GFX: LOW</span>' +
          '</button>' +
          '<button id="touchGarage" type="button" aria-label="Open Garage" title="Garage">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.7-3.7a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>' +
            '<span>GARAGE</span>' +
          '</button>' +
          '<button id="touchMissions" type="button" aria-label="Open Missions Hub" title="Missions">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" fill="none" stroke="currentColor" stroke-width="2"/><rect x="9" y="3" width="6" height="4" rx="1" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 12h6M9 16h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
            '<span>MISSIONS</span>' +
          '</button>' +
          '<button id="touchMute" type="button" aria-label="Toggle Sound" title="Sound">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4V5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
            '<span>SOUND</span>' +
          '</button>' +
          '<button id="touchSteerMode" type="button" aria-label="Toggle Joystick or Steer Buttons" title="Steering Mode">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="currentColor"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
            '<span>STICK</span>' +
          '</button>' +
        '</div>' +
        '<button id="touchExitCar" type="button" aria-label="Exit or Enter Vehicle (E)">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13l1.5-4.5A2 2 0 0 1 8.4 7h7.2a2 2 0 0 1 1.9 1.5L19 13M4 13h16v4H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="7.5" cy="17.5" r="1.5" fill="currentColor"/><circle cx="16.5" cy="17.5" r="1.5" fill="currentColor"/></svg>' +
          '<span class="exit-lbl">EXIT CAR</span>' +
        '</button>' +
        '<div id="lookZone" aria-label="Swipe to orbit camera"></div>' +
        '<div id="joystick" aria-label="Steering and Movement">' +
          '<div class="driving-steer">' +
            '<button type="button" data-action="steerLeft" class="steerBtn" aria-label="Steer Left">' +
              '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
              '<span>LEFT</span>' +
            '</button>' +
            '<button type="button" data-action="steerRight" class="steerBtn" aria-label="Steer Right">' +
              '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
              '<span>RIGHT</span>' +
            '</button>' +
          '</div>' +
          '<div id="walkStick" aria-label="Virtual Joystick">' +
            '<div id="walkRing">' +
              '<span class="stick-dir n">▲</span>' +
              '<span class="stick-dir s">▼</span>' +
              '<span class="stick-dir w">◀</span>' +
              '<span class="stick-dir e">▶</span>' +
            '</div>' +
            '<div id="walkKnob"><span class="stick-cap"></span></div>' +
          '</div>' +
        '</div>' +
        '<div id="touchActions">' +
          '<button type="button" data-action="handbrake" class="driftBtn" aria-label="Handbrake Drift or Jump">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17c2-4 5-6 10-6M14 7l3 4-3 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="7" cy="17" r="2" fill="currentColor"/></svg>' +
            '<span class="btn-lbl">DRIFT</span>' +
          '</button>' +
          '<button type="button" data-action="nitro" class="nosBtn" aria-label="Nitro Boost">' +
            '<svg class="nos-ring-svg" viewBox="0 0 60 60" aria-hidden="true"><circle class="nos-ring-track" cx="30" cy="30" r="27"/><circle class="nos-ring-fill" cx="30" cy="30" r="27"/></svg>' +
            '<svg class="btn-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" fill="currentColor"/></svg>' +
            '<span class="btn-lbl">NOS</span>' +
          '</button>' +
          '<button type="button" data-action="brake" class="brakeBtn" aria-label="Brake or Reverse">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2.5" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>' +
            '<span class="btn-lbl">BRAKE</span>' +
          '</button>' +
          '<button type="button" data-action="throttle" class="gasBtn primary" aria-label="Gas">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            '<span class="btn-lbl">GAS</span>' +
          '</button>' +
        '</div>';
      this.doc.body.appendChild(ui);
    }

    this.rootEl = ui;
    this.stickEl = ui.querySelector('#walkStick');
    this.knobEl = ui.querySelector('#walkKnob');
    this.lookEl = ui.querySelector('#lookZone');
    this.qualityBtn = ui.querySelector('#touchQuality');
    this.nosBtn = ui.querySelector('[data-action="nitro"]');
    this.nosRingEl = ui.querySelector('.nos-ring-fill');
    this.driftBtn = ui.querySelector('[data-action="handbrake"]');
    this.lightsBtn = ui.querySelector('#touchLights');
    this.muteBtn = ui.querySelector('#touchMute');
    this.steerModeBtn = ui.querySelector('#touchSteerMode');
    this.toolsDrawerEl = ui.querySelector('#touchToolsDrawer');
    this.toolsToggleEl = ui.querySelector('#touchToolsToggle');
    this.exitCarBtn = ui.querySelector('#touchExitCar');

    const closeDrawer = () => {
      this._drawerOpen = false;
      if (this.toolsDrawerEl) this.toolsDrawerEl.hidden = true;
      if (this.rootEl) this.rootEl.classList.remove('drawer-open');
      if (this.toolsToggleEl) {
        this.toolsToggleEl.classList.remove('active');
        this.toolsToggleEl.setAttribute('aria-expanded', 'false');
      }
    };
    this._closeDrawer = closeDrawer;

    // Bind multi-touch driving pedals (`steerLeft`, `steerRight`, `throttle`, `brake`, `handbrake`, `nitro`, etc.)
    if (this.inputManager) {
      this._cleanups.push(this.inputManager.attachTouch(ui, '[data-action]'));
    }

    // Visual `.held` feedback + one-shot utility actions (`flip`, `camera`, `horn`, `lights`, on-foot `jump` / `interact`) + iOS audio unlock
    const unlockAll = () => {
      this.win?.NeonAudio?.unlock?.();
      this.win?.dismissBootOverlay?.();
    };
    ui.addEventListener('pointerdown', unlockAll, { passive: true });
    this._cleanups.push(() => ui.removeEventListener('pointerdown', unlockAll));

    for (const btn of ui.querySelectorAll('[data-action]')) {
      const action = btn.dataset.action;
      const onDown = (e) => {
        e.preventDefault?.();
        try { btn.setPointerCapture?.(e.pointerId); } catch {}
        btn.classList.add('held');
        unlockAll();
        if (!this._inCar) {
          if (action === 'handbrake' || action === 'brake') {
            this.inputManager?.setTouchPointer?.(e.pointerId ?? 1, action, false);
            this.handlers.onJump?.();
          } else if (action === 'throttle') {
            this.inputManager?.setTouchPointer?.(e.pointerId ?? 1, 'throttle', false);
            if (this._nearbyVehicleName) this.handlers.onInteractVehicle?.();
            else this.handlers.onCallVehicle?.();
          }
        }
        if (action === 'flip') { this.handlers.onFlip?.(); closeDrawer(); }
        if (action === 'camera') { this.handlers.onCenterCamera?.(); closeDrawer(); }
        if (action === 'lights') { this.handlers.onToggleLights?.(); closeDrawer(); }
        if (action === 'horn') { this.handlers.onHorn?.(); closeDrawer(); }
      };
      const onUp = () => {
        btn.classList.remove('held');
      };
      btn.addEventListener('pointerdown', onDown);
      for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        btn.addEventListener(ev, onUp);
      }
      this._cleanups.push(() => {
        btn.removeEventListener('pointerdown', onDown);
        for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) {
          btn.removeEventListener(ev, onUp);
        }
      });
    }

    // Unified 360-degree Analog Virtual Joystick (drives smoothly when steerMode==='joystick', walks when !inCar)
    if (this.stickEl && this.knobEl) {
      const updateStick = (e) => {
        const rect = this.stickEl.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const maxR = Math.max(26, rect.width * 0.36);
        let dx = e.clientX - cx;
        let dy = e.clientY - cy;
        const dist = Math.hypot(dx, dy);
        if (dist > maxR) {
          dx = (dx / dist) * maxR;
          dy = (dy / dist) * maxR;
        }
        const sx = Math.max(-1, Math.min(1, dx / maxR));
        const sy = Math.max(-1, Math.min(1, dy / maxR));
        this.knobEl.style.transform = `translate(calc(-50% + ${dx.toFixed(1)}px), calc(-50% + ${dy.toFixed(1)}px))`;
        if (this._inCar) {
          // Slight vertical deadzone while driving so clean horizontal steering never brakes/reverses accidentally
          const throttleAxis = Math.abs(sy) < 0.28 ? 0 : Math.sign(-sy) * ((Math.abs(sy) - 0.28) / 0.72);
          this.inputManager?.setTouchAnalog?.(sx, throttleAxis);
        } else {
          this.inputManager?.setTouchAnalog?.(sx, -sy);
        }
      };
      const resetStick = () => {
        this._stickPointer = null;
        this.knobEl.style.transform = 'translate(-50%, -50%)';
        this.inputManager?.setTouchAnalog?.(0, 0);
      };
      const onStickDown = (e) => {
        if (this._stickPointer !== null) return;
        e.preventDefault?.();
        unlockAll();
        this._stickPointer = e.pointerId;
        try { this.stickEl.setPointerCapture?.(e.pointerId); } catch {}
        updateStick(e);
      };
      const onStickMove = (e) => {
        if (e.pointerId === this._stickPointer) updateStick(e);
      };
      const onStickUp = (e) => {
        if (e.pointerId === this._stickPointer) resetStick();
      };
      this.stickEl.addEventListener('pointerdown', onStickDown);
      this.stickEl.addEventListener('pointermove', onStickMove);
      for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        this.stickEl.addEventListener(ev, onStickUp);
      }
      this._cleanups.push(() => {
        this.stickEl.removeEventListener('pointerdown', onStickDown);
        this.stickEl.removeEventListener('pointermove', onStickMove);
        for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) {
          this.stickEl.removeEventListener(ev, onStickUp);
        }
      });
    }

    // Swipe Camera Orbit Zone
    if (this.lookEl) {
      const onLookDown = (e) => {
        if (this._lookPointer !== null) return;
        this._lookPointer = e.pointerId;
        this._prevLookX = e.clientX;
        if (this.win) this.win.camOrbitHold = true;
        try { this.lookEl.setPointerCapture?.(e.pointerId); } catch {}
      };
      const onLookMove = (e) => {
        if (e.pointerId !== this._lookPointer) return;
        const dx = (e.clientX - this._prevLookX) * 0.006;
        this._prevLookX = e.clientX;
        if (this._inCar) {
          if (this.win) {
            this.win.camOrbitOffset = Math.max(-1.6, Math.min(1.6, (this.win.camOrbitOffset || 0) - dx));
          }
        } else {
          this.handlers.onLookDelta?.(dx * 1.4);
        }
      };
      const onLookUp = (e) => {
        if (e.pointerId === this._lookPointer) {
          this._lookPointer = null;
          if (this.win) this.win.camOrbitHold = false;
        }
      };
      this.lookEl.addEventListener('pointerdown', onLookDown);
      this.lookEl.addEventListener('pointermove', onLookMove);
      for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        this.lookEl.addEventListener(ev, onLookUp);
      }
    }

    // Top Quick-Action & 12-Shortcut Drawer Bindings
    const bindTop = (sel, fn) => {
      const b = ui.querySelector(sel);
      if (!b) return;
      b.onclick = (e) => {
        e?.preventDefault?.();
        unlockAll();
        fn();
      };
    };
    bindTop('#touchPhone', () => { closeDrawer(); this.handlers.onOpenPhone?.(); });
    bindTop('#touchPause', () => { closeDrawer(); this.handlers.onTogglePause?.(); });
    bindTop('#touchToolsToggle', () => {
      this._drawerOpen = !this._drawerOpen;
      if (this.toolsDrawerEl) this.toolsDrawerEl.hidden = !this._drawerOpen;
      if (this.rootEl) this.rootEl.classList.toggle('drawer-open', this._drawerOpen);
      if (this.toolsToggleEl) {
        this.toolsToggleEl.classList.toggle('active', this._drawerOpen);
        this.toolsToggleEl.setAttribute('aria-expanded', String(this._drawerOpen));
      }
    });
    bindTop('#touchRadio', () => { closeDrawer(); this.handlers.onCycleRadio?.(); });
    bindTop('#touchMap', () => { closeDrawer(); this.handlers.onOpenMap?.(); });
    bindTop('#touchPhoto', () => { closeDrawer(); this.handlers.onTogglePhoto?.(); });
    bindTop('#touchQuality', () => { this.handlers.onCycleQuality?.(); });
    bindTop('#touchGarage', () => { closeDrawer(); this.handlers.onOpenGarage?.(); });
    bindTop('#touchMissions', () => { closeDrawer(); this.handlers.onOpenMissions?.(); });
    bindTop('#touchMute', () => { this.handlers.onToggleMute?.(); });
    bindTop('#touchSteerMode', () => { this.toggleSteerMode(); });
    bindTop('#touchExitCar', () => {
      if (this._inCar || this._nearbyVehicleName) {
        this.handlers.onInteractVehicle?.();
      } else {
        this.handlers.onCallVehicle?.();
      }
    });

    const onResize = () => {
      this.reset();
      this.win?.NeonHUD?.applyResponsiveLayout?.();
    };
    this.win?.addEventListener?.('resize', onResize);
    this.win?.addEventListener?.('blur', () => this.reset());

    this._mounted = true;
    this.update();
    return this;
  }

  reset() {
    this.inputManager?.reset?.();
    this._stickPointer = null;
    this._lookPointer = null;
    if (this.win) {
      this.win.camOrbitHold = false;
      if (this.win.touchInput) {
        this.win.touchInput.forward = 0;
        this.win.touchInput.turn = 0;
        this.win.touchInput.gas = 0;
        this.win.touchInput.nos = false;
      }
    }
    this.inputManager?.setTouchAnalog?.(0, 0);
    if (this.knobEl) this.knobEl.style.transform = 'translate(-50%, -50%)';
    if (this.rootEl) {
      for (const b of this.rootEl.querySelectorAll('button.held')) {
        b.classList.remove('held');
      }
    }
  }

  update(args = {}) {
    if (!this.rootEl) return;
    this._lastUpdateArgs = { ...this._lastUpdateArgs, ...args };
    const {
      running = true,
      inCar = true,
      nearbyVehicleName = '',
      quality = 'low',
      nosActive = false,
      nosCharge = 100,
      isEmergency = false,
      muted = false,
      headlightsOn = false
    } = this._lastUpdateArgs;

    this.rootEl.hidden = !running;
    if (!running) {
      this._closeDrawer?.();
      return;
    }
    this._inCar = !!inCar;
    this._nearbyVehicleName = String(nearbyVehicleName || '');
    this.rootEl.classList.toggle('on-foot', !this._inCar);
    this.rootEl.classList.toggle('steer-joystick', this._steerMode === 'joystick');
    this.rootEl.classList.toggle('steer-buttons', this._steerMode === 'buttons');

    const tr = (key, fb) => {
      const val = this.win?.NeonI18n?.t?.(key);
      return val && val !== key ? val : fb;
    };
    const setLbl = (el, txt) => {
      if (!el) return;
      const sp = el.querySelector('.btn-lbl, .exit-lbl, span');
      if (sp) sp.textContent = txt;
      else el.textContent = txt;
    };

    const throttleBtn = this.rootEl.querySelector('[data-action="throttle"]');
    const brakeBtn = this.rootEl.querySelector('[data-action="brake"]');
    const phoneBtn = this.rootEl.querySelector('#touchPhone');
    const toolsBtn = this.rootEl.querySelector('#touchToolsToggle');
    const pauseBtn = this.rootEl.querySelector('#touchPause');
    const flipBtn = this.rootEl.querySelector('#touchFlip');
    const radioBtn = this.rootEl.querySelector('#touchRadio');
    const mapBtn = this.rootEl.querySelector('#touchMap');
    const photoBtn = this.rootEl.querySelector('#touchPhoto');
    const camBtn = this.rootEl.querySelector('#touchCamera');
    const hornBtn = this.rootEl.querySelector('#touchHorn');
    const garageBtn = this.rootEl.querySelector('#touchGarage');
    const missionsBtn = this.rootEl.querySelector('#touchMissions');

    const shortOrbWord = (txt, fb) => {
      const clean = String(txt || fb || '').trim();
      const first = clean.split(/\s+/)[0] || fb;
      return first.length > 7 ? first.slice(0, 7) : first;
    };
    const chargeClamped = Math.max(0, Math.min(100, Number(nosCharge) || 0));
    if (this.nosRingEl) {
      this.nosRingEl.style.strokeDashoffset = (169.65 * (1 - chargeClamped / 100)).toFixed(1);
    }
    this.nosBtn?.classList?.toggle?.('nos-active', !!nosActive && this._inCar);

    if (this._inCar) {
      setLbl(throttleBtn, tr('hud.gas', 'GAS'));
      setLbl(brakeBtn, tr('hud.brake', 'BRAKE'));
      setLbl(this.driftBtn, tr('hud.drift', 'DRIFT'));
      setLbl(this.nosBtn, nosActive ? 'BOOST' : chargeClamped < 15 ? 'WAIT' : tr('hud.nos', 'NOS'));
      setLbl(this.exitCarBtn, shortOrbWord(tr('hud.exitCar', 'EXIT'), 'EXIT'));
      this.exitCarBtn?.setAttribute?.('title', tr('hud.exitCar', 'EXIT CAR'));
      this.exitCarBtn?.classList.remove('enter-mode', 'call-mode');
    } else {
      setLbl(throttleBtn, shortOrbWord(this._nearbyVehicleName ? tr('hud.enterCar', 'ENTER') : tr('hud.callCar', 'CALL'), this._nearbyVehicleName ? 'ENTER' : 'CALL'));
      setLbl(brakeBtn, tr('hud.jump', 'JUMP'));
      setLbl(this.driftBtn, tr('hud.jump', 'JUMP'));
      setLbl(this.nosBtn, tr('hud.sprint', 'RUN'));
      setLbl(this.exitCarBtn, shortOrbWord(this._nearbyVehicleName ? tr('hud.enterCar', 'ENTER') : tr('hud.callCar', 'CALL'), this._nearbyVehicleName ? 'ENTER' : 'CALL'));
      this.exitCarBtn?.setAttribute?.('title', this._nearbyVehicleName ? tr('hud.enterCar', 'ENTER CAR') : tr('hud.callCar', 'CALL CAR'));
      this.exitCarBtn?.classList.toggle('enter-mode', !!this._nearbyVehicleName);
      this.exitCarBtn?.classList.toggle('call-mode', !this._nearbyVehicleName);
    }

    setLbl(phoneBtn, tr('hud.phoneBtn', 'PHONE').replace(/\s*\([^)]*\)/g, '').trim() || 'PHONE');
    setLbl(toolsBtn, tr('hud.tools', 'TOOLS'));
    setLbl(pauseBtn, tr('hud.pause', 'PAUSE'));
    setLbl(flipBtn, tr('hud.flipCar', 'FLIP').replace(/\s*\([^)]*\)/g, '').trim() || 'FLIP');
    setLbl(radioBtn, tr('hud.radioNext', 'RADIO'));
    setLbl(mapBtn, tr('hud.map', 'MAP'));
    setLbl(photoBtn, tr('hud.photo', 'PHOTO'));
    setLbl(camBtn, tr('hud.camera', 'CAM'));
    setLbl(hornBtn, tr('hud.horn', 'HORN'));
    setLbl(garageBtn, tr('hud.garage', 'GARAGE'));
    setLbl(missionsBtn, tr('hud.missions', 'MISSIONS'));

    if (this.qualityBtn) {
      setLbl(this.qualityBtn, `${tr('hud.gfx', 'GFX')}: ${String(quality || 'low').toUpperCase()}`);
    }
    if (this.lightsBtn) {
      setLbl(this.lightsBtn, isEmergency ? tr('hud.siren', 'SIREN') : tr('hud.lights', 'LIGHTS'));
      this.lightsBtn.classList.toggle('active', !!headlightsOn);
    }
    if (this.muteBtn) {
      setLbl(this.muteBtn, muted ? tr('hud.muted', 'MUTED') : tr('hud.sound', 'SOUND'));
      this.muteBtn.classList.toggle('active', !!muted);
    }
    if (this.steerModeBtn) {
      setLbl(this.steerModeBtn, this._steerMode === 'joystick' ? tr('hud.stickMode', 'STICK') : tr('hud.btnMode', 'BTNS'));
      this.steerModeBtn.classList.toggle('active', this._steerMode === 'joystick');
    }
  }

  destroy() {
    for (const fn of this._cleanups.splice(0)) fn();
    this.reset();
    this._mounted = false;
  }
}
