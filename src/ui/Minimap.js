/**
 * Rotating 2D GPS Radar Minimap & Full-Screen Tactical Map Overlay (`M` / Tap).
 * Pure ES Module with zero static imports for Node ESM & classic bundle compatibility.
 */

export const MINIMAP_DISTRICTS = [
  { id: 'apex-core', label: 'APEX CORE', x: 0, z: 0, color: '#00F0FF' },
  { id: 'palm-strip', label: 'PALM STRIP', x: 0, z: -680, color: '#FF007F' },
  { id: 'iron-docks', label: 'IRON DOCKS', x: -650, z: 0, color: '#FFD700' },
  { id: 'bayview-heights', label: 'BAYVIEW HEIGHTS', x: 0, z: 620, color: '#00F0FF' },
  { id: 'airport', label: 'AIRPORT', x: 750, z: 0, color: '#67E8F9' }
];

export function computeMinimapTransform(wx, wz, px, pz, heading, cx, cy, scale, northUp = false) {
  const dx = (Number(wx) || 0) - (Number(px) || 0);
  const dz = (Number(wz) || 0) - (Number(pz) || 0);
  if (northUp) {
    return {
      x: cx - dx * scale,
      y: cy - dz * scale
    };
  }
  const cos = Math.cos(heading || 0);
  const sin = Math.sin(heading || 0);
  const rightDist = -dx * cos + dz * sin;
  const fwdDist = dx * sin + dz * cos;
  return {
    x: cx + rightDist * scale,
    y: cy - fwdDist * scale
  };
}

export class Minimap {
  constructor({
    radarCanvas = null,
    mapWrap = null,
    doc = globalThis.document,
    win = globalThis.window,
    eventBus = null,
    canToggle = () => true,
    onToggle = null
  } = {}) {
    this.radarCanvas = radarCanvas || null;
    this.mapWrap = mapWrap || null;
    this.doc = doc || null;
    this.win = win || null;
    this.eventBus = eventBus || null;
    this.canToggle = typeof canToggle === 'function' ? canToggle : () => true;
    this.onToggle = typeof onToggle === 'function' ? onToggle : null;

    this.radarCtx = this.radarCanvas?.getContext?.('2d') || null;
    this.overlayEl = null;
    this.fullCanvas = null;
    this.fullCtx = null;
    this.closeBtn = null;
    this.fullMapOpen = false;
    this.radarScale = 0.28;
    this.lastState = null;

    this._mounted = false;
    this._cleanups = [];
  }

  mount() {
    if (!this.doc || !this.doc.body || this._mounted) return this;

    let overlay = this.doc.getElementById('fullMapOverlay');
    if (!overlay) {
      overlay = this.doc.createElement('div');
      overlay.id = 'fullMapOverlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', 'Neon Bay Tactical GPS Map');
      overlay.hidden = true;

      const card = this.doc.createElement('div');
      card.className = 'fullmap-card';

      const head = this.doc.createElement('div');
      head.className = 'fullmap-head';

      const titleWrap = this.doc.createElement('div');
      const eyebrow = this.doc.createElement('div');
      eyebrow.className = 'fullmap-eyebrow';
      eyebrow.textContent = 'GPS TACTICAL RADAR · PRESS M OR TAP MAP';
      const title = this.doc.createElement('h2');
      title.className = 'fullmap-title';
      title.textContent = 'NEON BAY CITY MAP';
      titleWrap.append(eyebrow, title);

      const closeBtn = this.doc.createElement('button');
      closeBtn.id = 'fullMapClose';
      closeBtn.type = 'button';
      closeBtn.setAttribute('aria-label', 'Close Full Map');
      closeBtn.textContent = 'CLOSE (M)';

      head.append(titleWrap, closeBtn);

      const canvasWrap = this.doc.createElement('div');
      canvasWrap.className = 'fullmap-canvas-wrap';
      const fullCanvas = this.doc.createElement('canvas');
      fullCanvas.id = 'fullMapCanvas';
      fullCanvas.width = 560;
      fullCanvas.height = 560;
      canvasWrap.appendChild(fullCanvas);

      const legend = this.doc.createElement('div');
      legend.className = 'fullmap-legend';
      for (const [color, label] of [
        ['#00F0FF', 'YOU / GPS ROUTE'],
        ['#FFD700', 'ACTIVE WAYPOINT'],
        ['#FF2A2A', 'POLICE'],
        ['#FF007F', 'PALM STRIP / MARINA']
      ]) {
        const item = this.doc.createElement('span');
        const dot = this.doc.createElement('i');
        dot.style.background = color;
        item.append(dot, this.doc.createTextNode(label));
        legend.appendChild(item);
      }

      card.append(head, canvasWrap, legend);
      overlay.appendChild(card);
      this.doc.body.appendChild(overlay);
    }

    this.overlayEl = overlay;
    this.fullCanvas = overlay.querySelector('#fullMapCanvas');
    this.fullCtx = this.fullCanvas?.getContext?.('2d') || null;
    this.closeBtn = overlay.querySelector('#fullMapClose');

    const mapTarget = this.mapWrap || this.radarCanvas;
    if (mapTarget) {
      mapTarget.setAttribute('role', 'button');
      mapTarget.setAttribute('tabindex', '0');
      mapTarget.setAttribute('aria-label', 'Toggle full-screen map (M)');
      const onMapClick = (e) => {
        if (!this.canToggle()) return;
        e?.preventDefault?.();
        e?.stopPropagation?.();
        this.toggleFullMap();
      };
      mapTarget.addEventListener('click', onMapClick);
      this._cleanups.push(() => mapTarget.removeEventListener('click', onMapClick));
    }

    if (this.closeBtn) {
      const onCloseClick = (e) => {
        e?.preventDefault?.();
        e?.stopPropagation?.();
        this.toggleFullMap(false);
      };
      this.closeBtn.addEventListener('click', onCloseClick);
      this._cleanups.push(() => this.closeBtn.removeEventListener('click', onCloseClick));
    }

    const onBackdropClick = (e) => {
      if (e.target === this.overlayEl) this.toggleFullMap(false);
    };
    this.overlayEl.addEventListener('click', onBackdropClick);
    this._cleanups.push(() => this.overlayEl.removeEventListener('click', onBackdropClick));

    const onKeyDown = (e) => {
      if (e.repeat) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.code === 'KeyM') {
        if (this.fullMapOpen) {
          e.preventDefault();
          e.stopImmediatePropagation?.();
          this.toggleFullMap(false);
        } else if (this.canToggle()) {
          e.preventDefault();
          this.toggleFullMap(true);
        }
      } else if (e.code === 'Escape' && this.fullMapOpen) {
        e.preventDefault();
        e.stopImmediatePropagation?.();
        this.toggleFullMap(false);
      }
    };
    this.win?.addEventListener?.('keydown', onKeyDown, true);
    this._cleanups.push(() => this.win?.removeEventListener?.('keydown', onKeyDown, true));

    this._mounted = true;
    return this;
  }

  _resizeFullCanvas() {
    if (!this.fullCanvas || !this.win) return;
    const vw = Math.max(280, this.win.innerWidth || 640);
    const vh = Math.max(260, this.win.innerHeight || 480);
    const maxW = Math.min(680, vw - 56);
    const maxH = Math.min(560, vh - 170);
    const size = Math.max(200, Math.floor(Math.min(maxW, maxH)));
    this.fullCanvas.width = size;
    this.fullCanvas.height = size;
  }

  toggleFullMap(forceState) {
    if (!this._mounted) this.mount();
    const next = typeof forceState === 'boolean' ? forceState : !this.fullMapOpen;
    this.fullMapOpen = next;
    if (this.overlayEl) this.overlayEl.hidden = !next;
    this.doc?.body?.classList?.toggle('fullmap-open', next);
    if (next) {
      this._resizeFullCanvas();
      if (this.lastState) this.render(this.lastState);
    }
    this.onToggle?.(next);
    this.eventBus?.emit?.('ui:fullmap', { open: next });
    return next;
  }

  _drawArrow(ctx, x, y, angle, size, fill, stroke) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = fill;
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.6;
    }
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(-size * 0.72, size * 0.78);
    ctx.lineTo(0, size * 0.42);
    ctx.lineTo(size * 0.72, size * 0.78);
    ctx.closePath();
    ctx.fill();
    if (stroke) ctx.stroke();
    ctx.restore();
  }

  renderSurface(ctx, width, height, state = {}, northUp = false) {
    if (!ctx || width <= 0 || height <= 0) return;

    const px = Number(state.player?.x) || 0;
    const pz = Number(state.player?.z) || 0;
    const heading = Number(state.heading) || 0;
    const playTime = Number(state.playTime) || 0;
    const wanted = !!state.wanted;
    const cx = width / 2;
    const cy = height / 2;

    const scale = northUp
      ? Math.max(0.08, Math.min((width - 28) / 2060, (height - 28) / 2060))
      : this.radarScale;

    const originX = northUp ? 0 : px;
    const originZ = northUp ? -30 : pz;
    const to = (wx) => -(wx - originX) * scale;
    const toY = (wz) => -(wz - originZ) * scale;
    const dot = (p, col, r = 2.5) => {
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.z)) return;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(to(p.x), toY(p.z), r, 0, Math.PI * 2);
      ctx.fill();
    };

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#080e1a';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(cx, cy);
    if (!northUp) ctx.rotate(heading);

    // 1. Ocean, Palm Strip Beachfront Shoreline & Neon Bay Airport Runway
    ctx.fillStyle = '#2e2742';
    ctx.fillRect(to(1020), toY(-832), 2040 * scale, 82 * scale + 2);
    ctx.fillStyle = '#092d4a';
    ctx.fillRect(to(1020), toY(-912), 2040 * scale, Math.max(400, 300 * scale));
    ctx.fillStyle = '#00F0FF';
    ctx.fillRect(to(1020), toY(-912), 2040 * scale, 2);
    // Pier 99 Marina Boardwalk
    ctx.fillStyle = '#735870';
    ctx.fillRect(to(5.5), toY(-908), 11 * scale, 78 * scale);
    // Airport Runway Apron (Bayview East)
    ctx.fillStyle = '#253147';
    ctx.fillRect(to(790), toY(320), 80 * scale, 640 * scale);

    // 2. 2000m x 2000m City Road Grid (Miami Neon Cyan Centerlines)
    const axes = state.roadAxes || [-900, -600, -300, 0, 300, 600, 900];
    ctx.strokeStyle = '#1b2b44';
    ctx.lineWidth = Math.max(3.5, 22 * scale);
    for (const a of axes) {
      ctx.beginPath();
      ctx.moveTo(to(a), toY(960));
      ctx.lineTo(to(a), toY(-920));
      ctx.moveTo(to(-960), toY(a));
      ctx.lineTo(to(960), toY(a));
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.34)';
    ctx.lineWidth = Math.max(0.8, 1.8 * scale);
    for (const a of axes) {
      ctx.beginPath();
      ctx.moveTo(to(a), toY(960));
      ctx.lineTo(to(a), toY(-920));
      ctx.moveTo(to(-960), toY(a));
      ctx.lineTo(to(960), toY(a));
      ctx.stroke();
    }

    // 3. Buildings & Landmarks
    ctx.fillStyle = '#192a3d';
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.16)';
    ctx.lineWidth = 0.7;
    for (const b of state.buildings || []) {
      const bx = to(b.x + b.w / 2);
      const by = toY(b.z + b.d / 2);
      const bw = b.w * scale;
      const bd = b.d * scale;
      ctx.fillRect(bx, by, bw, bd);
    }

    // Park & Landmarks
    ctx.fillStyle = '#12403a';
    ctx.fillRect(to(78 + 30), toY(185 + 25), 60 * scale, 50 * scale);
    for (const s of state.sites || []) {
      ctx.fillStyle = s.id === 'hospital' ? '#2c4252' : s.id === 'villa' ? '#4a3d24' : s.id === 'gym' ? '#4a293a' : '#23384a';
      ctx.fillRect(to(s.x + s.w / 2), toY(s.z + s.d / 2), s.w * scale, s.d * scale);
    }
    // Hospital Cross & Pool
    ctx.fillStyle = '#00F0FF';
    ctx.fillRect(to(-82 + 8.5), toY(-375), 17 * scale, 12 * scale);
    ctx.fillStyle = '#FF2A2A';
    ctx.fillRect(to(-75) - 1.5, toY(193) - 4, 3, 8);
    ctx.fillRect(to(-75) - 4, toY(193) - 1.5, 8, 3);

    // 4. Active Waypoint Route Line
    const routePts = Array.isArray(state.routePoints) ? state.routePoints : [];
    const targets = Array.isArray(state.targets) ? state.targets : [];
    if (routePts.length >= 2) {
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = northUp ? 3 : 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      routePts.forEach((pt, idx) => {
        ctx[idx ? 'lineTo' : 'moveTo'](to(pt.x), toY(pt.z));
      });
      ctx.stroke();
    } else if (targets[0]) {
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(to(px), toY(pz));
      ctx.lineTo(to(targets[0].x), toY(targets[0].z));
      ctx.stroke();
    }

    // 5. Shops, Venues, Vehicles
    for (const sh of state.shops || []) dot(sh, '#00F0FF', 2.1);
    for (const fv of state.foodVenues || []) dot(fv, '#FF007F', 2.1);
    for (const veh of state.vehicles || []) {
      dot(veh.pos, veh.color || '#FFD700', veh.radius || 2.1);
    }

    // 6. Legacy Phase Hooks (only when drawing onto radar canvas where `mc === ctx`)
    if (!northUp && Array.isArray(state.extraDrawHooks)) {
      for (const hook of state.extraDrawHooks) {
        if (typeof hook === 'function') hook(to, toY, dot);
      }
    }

    // Roadblock & Heli overlays on North-Up map (radar draws them via hook or here)
    if (state.roadblock?.active) {
      ctx.fillStyle = '#FF9900';
      ctx.fillRect(to(state.roadblock.x) - 3.5, toY(state.roadblock.z) - 1.5, 7, 3);
    }
    if (state.heli?.active) {
      const hx = to(state.heli.x);
      const hy = toY(state.heli.z);
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(hx - 5, hy - 5);
      ctx.lineTo(hx + 5, hy + 5);
      ctx.moveTo(hx + 5, hy - 5);
      ctx.lineTo(hx - 5, hy + 5);
      ctx.stroke();
    }

    // 7. Blinking Police Dots
    const blinkOn = Math.floor(playTime * 7) % 2 === 0;
    const copCol = wanted ? (blinkOn ? '#FF2A2A' : '#00B4FF') : '#4D88FF';
    for (const cop of state.policeUnits || []) {
      if (!cop || !Number.isFinite(cop.x) || !Number.isFinite(cop.z)) continue;
      if (wanted) {
        ctx.strokeStyle = blinkOn ? 'rgba(255,42,42,0.55)' : 'rgba(0,180,255,0.55)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(to(cop.x), toY(cop.z), 5.6, 0, Math.PI * 2);
        ctx.stroke();
      }
      dot(cop, copCol, wanted ? 3.2 : 2.5);
    }

    // 8. Active Waypoint Target Beacon
    for (const t of targets) {
      dot(t, '#FFD700', northUp ? 4.2 : 3.4);
      ctx.strokeStyle = '#FFF7D6';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(to(t.x), toY(t.z), northUp ? 7.5 : 5.8, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();

    // 9. Upright District Labels (World-Projected onto Radar / Map)
    ctx.font = northUp ? '700 11px Segoe UI, sans-serif' : '700 8px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const marginX = northUp ? 52 : Math.min(44, cx - 14);
    const marginY = northUp ? 16 : 12;
    for (const d of MINIMAP_DISTRICTS) {
      const p2 = computeMinimapTransform(d.x, d.z, originX, originZ, northUp ? 0 : heading, cx, cy, scale, northUp);
      const lx = Math.max(marginX, Math.min(width - marginX, p2.x));
      const ly = Math.max(marginY, Math.min(height - marginY, p2.y));
      ctx.fillStyle = 'rgba(8, 14, 26, 0.72)';
      const tw = Math.max(46, (ctx.measureText?.(d.label)?.width || 48) + 8);
      ctx.fillRect(lx - tw / 2, ly - 6, tw, 12);
      ctx.fillStyle = d.color;
      ctx.fillText(d.label, lx, ly);
    }

    // 10. Cardinal North Marker on Rotating Radar Rim
    if (!northUp) {
      const northPt = computeMinimapTransform(px, pz + 1000, px, pz, heading, cx, cy, scale, false);
      const ang = Math.atan2(northPt.y - cy, northPt.x - cx);
      const rimR = Math.min(cx, cy) - 9;
      const nx = cx + Math.cos(ang) * rimR;
      const ny = cy + Math.sin(ang) * rimR;
      ctx.fillStyle = '#0A0E18';
      ctx.beginPath();
      ctx.arc(nx, ny, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#00F0FF';
      ctx.font = '800 9px Segoe UI, sans-serif';
      ctx.fillText('N', nx, ny + 0.5);
    }

    // 11. Player Arrow (Centered & Forward-Up on radar, oriented in North-Up map)
    const pCanvas = northUp
      ? computeMinimapTransform(px, pz, originX, originZ, 0, cx, cy, scale, true)
      : { x: cx, y: cy };
    const arrowAngle = northUp ? -heading : 0;
    this._drawArrow(ctx, pCanvas.x, pCanvas.y, arrowAngle, northUp ? 7.5 : 6, '#FFFFFF', '#00F0FF');
  }

  render(state = {}) {
    this.lastState = state;
    if (this.radarCanvas && this.radarCtx) {
      this.renderSurface(this.radarCtx, this.radarCanvas.width || 180, this.radarCanvas.height || 180, state, false);
    }
    if (this.fullMapOpen && this.fullCanvas && this.fullCtx) {
      this.renderSurface(this.fullCtx, this.fullCanvas.width || 560, this.fullCanvas.height || 560, state, true);
    }
  }

  destroy() {
    for (const fn of this._cleanups) fn();
    this._cleanups = [];
    this._mounted = false;
  }
}
