/**
 * 1-Tap Cinematic Photo Mode Controller (`PHOTO_MODE` State).
 * Transitions `GameState`, pauses physics simulation, hides gameplay HUD,
 * unlocks free orbital camera movement, and exports watermarked PNG snapshots.
 * Pure ES Module with zero static imports.
 */

export const PHOTO_WATERMARK_TEXT = 'NEON BAY: OVERDRIVE';

export class PhotoMode {
  constructor({
    doc = globalThis.document,
    win = globalThis.window,
    gameState = null,
    eventBus = null,
    getTargetPos = () => ({ x: 0, y: 1.3, z: 0, yaw: 0 }),
    getCamera = () => null,
    renderFrame = null,
    getCanvas = () => null,
    canEnter = null,
    onPausePhysics = null,
    onResumePhysics = null,
    onToast = null
  } = {}) {
    this.doc = doc || null;
    this.win = win || null;
    this.gameState = gameState || null;
    this.eventBus = eventBus || null;
    this.getTargetPos = typeof getTargetPos === 'function' ? getTargetPos : () => ({ x: 0, y: 1.3, z: 0, yaw: 0 });
    this.getCamera = typeof getCamera === 'function' ? getCamera : () => null;
    this.renderFrame = typeof renderFrame === 'function' ? renderFrame : null;
    this.getCanvas = typeof getCanvas === 'function' ? getCanvas : () => null;
    this.canEnter = typeof canEnter === 'function' ? canEnter : null;
    this.onPausePhysics = typeof onPausePhysics === 'function' ? onPausePhysics : null;
    this.onResumePhysics = typeof onResumePhysics === 'function' ? onResumePhysics : null;
    this.onToast = typeof onToast === 'function' ? onToast : null;

    this.active = false;
    this.orbitYaw = 0.65;
    this.orbitPitch = 0.28;
    this.orbitDist = 7.2;
    this.fov = 52;
    this.savedFov = 60;
    this.lastSnapshotDataUrl = null;
    this.snapshotCount = 0;

    this.barEl = null;
    this.zoomSlider = null;
    this.fovSlider = null;
    this._dragging = false;
    this._dragX = 0;
    this._dragY = 0;
    this._mounted = false;
    this._cleanups = [];
  }

  _el(tag, className, text = '') {
    const el = this.doc.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    return el;
  }

  mount() {
    if (!this.doc?.body || this._mounted) return this;

    let bar = this.doc.getElementById('photoModeBar');
    if (!bar) {
      bar = this._el('div', 'photo-mode-bar');
      bar.id = 'photoModeBar';
      bar.setAttribute('role', 'region');
      bar.setAttribute('aria-label', 'Cinematic Photo Mode Controls');
      bar.hidden = true;

      const badge = this._el('span', 'photo-watermark-tag', `${PHOTO_WATERMARK_TEXT} · PHOTO MODE`);
      const controls = this._el('div', 'photo-controls-row');

      const leftBtn = this._el('button', 'photo-btn', 'ORBIT ◀');
      leftBtn.id = 'photoOrbitLeftBtn';
      const rightBtn = this._el('button', 'photo-btn', 'ORBIT ▶');
      rightBtn.id = 'photoOrbitRightBtn';

      const zoomLbl = this._el('label', 'photo-slider-lbl', 'DIST ');
      const zoomSlider = this._el('input', 'photo-slider');
      zoomSlider.type = 'range';
      zoomSlider.min = '3.5';
      zoomSlider.max = '22';
      zoomSlider.step = '0.5';
      zoomSlider.value = String(this.orbitDist);
      zoomLbl.appendChild(zoomSlider);

      const fovLbl = this._el('label', 'photo-slider-lbl', 'FOV ');
      const fovSlider = this._el('input', 'photo-slider');
      fovSlider.type = 'range';
      fovSlider.min = '30';
      fovSlider.max = '85';
      fovSlider.step = '1';
      fovSlider.value = String(this.fov);
      fovLbl.appendChild(fovSlider);

      const snapBtn = this._el('button', 'photo-btn primary', 'SNAP PNG');
      snapBtn.id = 'photoSnapBtn';
      const exitBtn = this._el('button', 'photo-btn danger', 'EXIT (O)');
      exitBtn.id = 'photoExitBtn';

      controls.append(leftBtn, rightBtn, zoomLbl, fovLbl, snapBtn, exitBtn);
      bar.append(badge, controls);
      this.doc.body.appendChild(bar);
    }

    this.barEl = bar;
    const sliders = bar.querySelectorAll('.photo-slider');
    this.zoomSlider = sliders[0] || null;
    this.fovSlider = sliders[1] || null;

    const bindBtn = (sel, fn) => {
      const btn = bar.querySelector(sel);
      if (!btn) return;
      const handler = (e) => {
        e?.preventDefault?.();
        e?.stopPropagation?.();
        fn();
      };
      btn.addEventListener('click', handler);
      this._cleanups.push(() => btn.removeEventListener('click', handler));
    };

    bindBtn('#photoOrbitLeftBtn', () => this.setOrbit({ yaw: this.orbitYaw - 0.35 }));
    bindBtn('#photoOrbitRightBtn', () => this.setOrbit({ yaw: this.orbitYaw + 0.35 }));
    bindBtn('#photoSnapBtn', () => this.capturePNG({ download: true }));
    bindBtn('#photoExitBtn', () => this.exit());

    if (this.zoomSlider) {
      const onZoom = () => this.setOrbit({ distance: Number(this.zoomSlider.value) });
      this.zoomSlider.addEventListener('input', onZoom);
      this._cleanups.push(() => this.zoomSlider.removeEventListener('input', onZoom));
    }

    if (this.fovSlider) {
      const onFov = () => this.setOrbit({ fov: Number(this.fovSlider.value) });
      this.fovSlider.addEventListener('input', onFov);
      this._cleanups.push(() => this.fovSlider.removeEventListener('input', onFov));
    }

    const onPtrDown = (e) => {
      if (!this.active) return;
      if (e.target?.closest?.('#photoModeBar')) return;
      this._dragging = true;
      this._dragX = e.clientX || 0;
      this._dragY = e.clientY || 0;
    };
    const onPtrMove = (e) => {
      if (!this.active || !this._dragging) return;
      const dx = (e.clientX || 0) - this._dragX;
      const dy = (e.clientY || 0) - this._dragY;
      this._dragX = e.clientX || 0;
      this._dragY = e.clientY || 0;
      this.setOrbit({
        yaw: this.orbitYaw - dx * 0.008,
        pitch: this.orbitPitch + dy * 0.006
      });
    };
    const onPtrUp = () => { this._dragging = false; };
    const onWheel = (e) => {
      if (!this.active) return;
      this.setOrbit({ distance: this.orbitDist + (e.deltaY > 0 ? 1.0 : -1.0) });
    };

    this.doc.addEventListener('pointerdown', onPtrDown);
    this.win?.addEventListener?.('pointermove', onPtrMove);
    this.win?.addEventListener?.('pointerup', onPtrUp);
    this.doc.addEventListener('wheel', onWheel, { passive: true });

    const onKeyDown = (e) => {
      if (e.repeat) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.code === 'KeyO') {
        e.preventDefault();
        e.stopImmediatePropagation?.();
        if (this.active) this.exit();
        else this.enter();
      } else if (e.code === 'Escape' && this.active) {
        e.preventDefault();
        e.stopImmediatePropagation?.();
        this.exit();
      }
    };
    this.win?.addEventListener?.('keydown', onKeyDown, true);

    this._cleanups.push(() => {
      this.doc.removeEventListener('pointerdown', onPtrDown);
      this.win?.removeEventListener?.('pointermove', onPtrMove);
      this.win?.removeEventListener?.('pointerup', onPtrUp);
      this.doc.removeEventListener('wheel', onWheel);
      this.win?.removeEventListener?.('keydown', onKeyDown, true);
    });

    this._mounted = true;
    return this;
  }

  enter() {
    if (!this._mounted) this.mount();
    if (this.active) return false;
    if (this.canEnter && !this.canEnter()) return false;

    if (this.gameState && !this.gameState.enterPhotoMode({ source: 'PhotoMode' })) {
      return false;
    }

    const cam = this.getCamera();
    if (cam && Number.isFinite(cam.fov)) {
      this.savedFov = cam.fov;
    }
    const target = this.getTargetPos();
    this.orbitYaw = (Number(target?.yaw) || 0) + 0.65;
    this.orbitPitch = 0.28;
    this.orbitDist = 7.2;
    this.fov = 52;
    this.active = true;

    this.onPausePhysics?.();
    this.doc?.body?.classList?.add('photo-mode-active');
    if (this.barEl) this.barEl.hidden = false;
    if (this.zoomSlider) this.zoomSlider.value = String(this.orbitDist);
    if (this.fovSlider) this.fovSlider.value = String(this.fov);

    this.applyCameraTo(cam);
    this.renderFrame?.();
    this.eventBus?.emit?.('photo:enter', { fov: this.fov, orbitDist: this.orbitDist });
    return true;
  }

  setOrbit({ yaw, pitch, distance, fov } = {}) {
    if (Number.isFinite(yaw)) this.orbitYaw = yaw;
    if (Number.isFinite(pitch)) this.orbitPitch = Math.max(0.05, Math.min(1.35, pitch));
    if (Number.isFinite(distance)) this.orbitDist = Math.max(3.2, Math.min(24, distance));
    if (Number.isFinite(fov)) this.fov = Math.max(28, Math.min(90, fov));

    if (this.zoomSlider) this.zoomSlider.value = String(this.orbitDist);
    if (this.fovSlider) this.fovSlider.value = String(this.fov);

    this.applyCameraTo(this.getCamera());
    this.renderFrame?.();
    return {
      yaw: this.orbitYaw,
      pitch: this.orbitPitch,
      distance: this.orbitDist,
      fov: this.fov
    };
  }

  applyCameraTo(camera) {
    if (!this.active || !camera) return false;
    const t = this.getTargetPos();
    const tx = Number(t?.x) || 0;
    const ty = Number(t?.y) || 1.3;
    const tz = Number(t?.z) || 0;
    const cosP = Math.cos(this.orbitPitch);
    const camX = tx + Math.sin(this.orbitYaw) * cosP * this.orbitDist;
    const camY = Math.max(0.65, ty + Math.sin(this.orbitPitch) * this.orbitDist);
    const camZ = tz + Math.cos(this.orbitYaw) * cosP * this.orbitDist;

    camera.position?.set?.(camX, camY, camZ);
    camera.fov = this.fov;
    camera.updateProjectionMatrix?.();
    camera.lookAt?.(tx, ty, tz);
    return true;
  }

  capturePNG({ download = false, subtitle = '' } = {}) {
    const cam = this.getCamera();
    this.applyCameraTo(cam);
    this.renderFrame?.();

    const srcCanvas = this.getCanvas();
    const width = srcCanvas?.width || 1280;
    const height = srcCanvas?.height || 720;

    let dataUrl = '';
    if (this.doc && typeof this.doc.createElement === 'function') {
      const outCanvas = this.doc.createElement('canvas');
      outCanvas.width = width;
      outCanvas.height = height;
      const ctx = outCanvas.getContext?.('2d');
      if (ctx) {
        if (srcCanvas) {
          try {
            ctx.drawImage(srcCanvas, 0, 0, width, height);
          } catch {
            ctx.fillStyle = '#0a0e18';
            ctx.fillRect(0, 0, width, height);
          }
        } else {
          ctx.fillStyle = '#0a0e18';
          ctx.fillRect(0, 0, width, height);
        }

        // Neon Bay Watermark Overlay
        const boxW = Math.min(width - 32, 340);
        const boxH = subtitle ? 52 : 36;
        const x = 18;
        const y = height - boxH - 18;
        ctx.fillStyle = 'rgba(10, 14, 24, 0.78)';
        ctx.fillRect(x, y, boxW, boxH);
        ctx.fillStyle = '#00F0FF';
        ctx.fillRect(x, y, 4, boxH);
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 15px Segoe UI, sans-serif';
        ctx.fillText(PHOTO_WATERMARK_TEXT, x + 14, y + 23);
        if (subtitle) {
          ctx.fillStyle = '#FF007F';
          ctx.font = '700 11px Segoe UI, sans-serif';
          ctx.fillText(subtitle, x + 14, y + 41);
        }
        dataUrl = outCanvas.toDataURL('image/png');
      }
    }

    if (!dataUrl && srcCanvas?.toDataURL) {
      dataUrl = srcCanvas.toDataURL('image/png');
    }
    if (!dataUrl) {
      dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    }

    this.lastSnapshotDataUrl = dataUrl;
    this.snapshotCount += 1;

    if (download && this.doc?.createElement) {
      const a = this.doc.createElement('a');
      a.href = dataUrl;
      a.download = `neon-bay-overdrive-${this.snapshotCount}.png`;
      a.click?.();
    }

    this.onToast?.('Photo snapshot saved (NEON BAY: OVERDRIVE)');
    this.eventBus?.emit?.('photo:captured', { snapshotCount: this.snapshotCount, watermark: PHOTO_WATERMARK_TEXT });
    return {
      ok: true,
      dataUrl,
      width,
      height,
      watermark: PHOTO_WATERMARK_TEXT
    };
  }

  exit() {
    if (!this.active) return false;
    this.active = false;
    this._dragging = false;

    this.doc?.body?.classList?.remove('photo-mode-active');
    if (this.barEl) this.barEl.hidden = true;

    const cam = this.getCamera();
    if (cam) {
      cam.fov = this.savedFov || 60;
      cam.updateProjectionMatrix?.();
    }

    if (this.gameState) {
      this.gameState.exitPhotoMode({ source: 'PhotoMode' });
    }

    this.onResumePhysics?.();
    this.eventBus?.emit?.('photo:exit', { snapshotCount: this.snapshotCount });
    return true;
  }

  destroy() {
    for (const fn of this._cleanups) fn();
    this._cleanups = [];
    this._mounted = false;
  }
}
