/**
 * Neon Bay Dynamic Atmosphere, 24h Day/Sunset/Night/Rain/Storm Clock,
 * Instanced Weather Rain Drops, and 4 Merged 3D Stunt Ramps with Jump Physics.
 * Pure zero-import ES Module.
 */

export const NEON_STUNT_RAMPS = Object.freeze([
  { id: 'skyline_mega_ramp', name: 'Skyline Construction Mega-Ramp', x: 0, z: 600, yaw: 0, dirX: 0, dirZ: 1, width: 8.4, len: 18, height: 3.8 },
  { id: 'shadow_alley_ramp', name: 'Shadow Alley Launch Ramp', x: -300, z: -180, yaw: 0, dirX: 0, dirZ: 1, width: 6.4, len: 13, height: 3.0 },
  { id: 'palm_strip_ramp', name: 'Palm Strip Neon Ramp', x: 0, z: -720, yaw: Math.PI, dirX: 0, dirZ: -1, width: 6.4, len: 13, height: 3.0 },
  { id: 'iron_docks_ramp', name: 'Iron Docks Overpass Ramp', x: -660, z: 0, yaw: -Math.PI / 2, dirX: -1, dirZ: 0, width: 6.4, len: 13, height: 3.0 },
  { id: 'marina_beach', name: 'Marina Beach Mega Ramp', x: 120, z: -860, yaw: Math.PI / 2, dirX: 1, dirZ: 0, width: 6.4, len: 13, height: 3.0 }
]);

const WEATHER_STAGES = Object.freeze([
  ['clear', 90],
  ['rain', 45],
  ['clear', 80],
  ['storm', 40]
]);

export function hourToDuskFactor(hour) {
  const h = Number(hour) || 12;
  if (h >= 7.5 && h <= 16.5) {
    const d = Math.abs(h - 12) / 4.5;
    return Math.min(0.06, Math.max(0, d * 0.05));
  }
  if (h > 16.5 && h < 19.5) {
    return h < 18.2
      ? 0.05 + ((h - 16.5) / 1.7) * 0.63
      : 0.68 + ((h - 18.2) / 1.3) * 0.26;
  }
  if (h >= 5.0 && h < 7.5) {
    return h < 6.2
      ? 0.94 - ((h - 5) / 1.2) * 0.62
      : 0.32 - ((h - 6.2) / 1.3) * 0.26;
  }
  return 0.94;
}

export class EnvironmentFX {
  constructor({
    win = globalThis.window || null,
    doc = globalThis.document || null,
    saveManager = null,
    eventBus = null,
    drivingJuice = null,
    audioManager = null
  } = {}) {
    this.win = win;
    this.doc = doc;
    this.saveManager = saveManager;
    this.eventBus = eventBus;
    this.drivingJuice = drivingJuice;
    this.audioManager = audioManager;

    this.timeMode = 'auto';
    this.weatherMode = 'auto';
    this.stuntRamps = NEON_STUNT_RAMPS;

    this.worldClock = {
      hour: 18.0,
      manualOffset: 0,
      weather: 'clear',
      rainIntensity: 0,
      nightAlpha: 0.56,
      lightning: 0,
      lightningTimer: 7,
      stageIdx: 0,
      weatherTimer: WEATHER_STAGES[0][1],
      syncMode: () => this.syncMode(),
      advanceHours: (h = 3) => this.advanceHours(h),
      badge: () => this.getClockBadge()
    };

    this._rainMesh = null;
    this._rainMat = null;
    this._rainDummy = null;
    this._rainDrops = [];
    this._rainCount = 0;
  }

  mountScene(THREE_ref = globalThis.THREE) {
    const hasThree = !!(THREE_ref && typeof scene !== 'undefined');
    if (!hasThree) return this;

    const isLow = !!this.doc?.body?.classList?.contains('gfx-low');
    this._rainCount = isLow ? 160 : 280;
    this._rainMat = new THREE_ref.MeshBasicMaterial({
      color: '#d6eeff',
      transparent: true,
      opacity: 0.44,
      depthWrite: false
    });
    this._rainMesh = new THREE_ref.InstancedMesh(
      new THREE_ref.BoxGeometry(0.024, 0.92, 0.024),
      this._rainMat,
      this._rainCount
    );
    this._rainMesh.instanceMatrix.setUsage(THREE_ref.DynamicDrawUsage);
    this._rainMesh.frustumCulled = false;
    this._rainMesh.visible = false;
    scene.add(this._rainMesh);

    this._rainDummy = new THREE_ref.Object3D();
    this._rainDrops = Array.from({ length: this._rainCount }, () => ({
      ox: (Math.random() - 0.5) * 34,
      y: Math.random() * 18,
      oz: (Math.random() - 0.5) * 34,
      spd: 21 + Math.random() * 7
    }));

    // Build 4 Merged 3D Stunt Ramps
    if (typeof texture === 'function' && typeof mergeStaticModel === 'function') {
      const rampDeckTex = texture((c, w, h) => {
        c.fillStyle = '#141d2b';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#00f0ff';
        c.fillRect(0, 0, 18, h);
        c.fillRect(w - 18, 0, 18, h);
        for (let y = 0; y < h; y += 32) {
          c.fillStyle = '#0d131f';
          c.fillRect(0, y, 18, 16);
          c.fillRect(w - 18, y + 16, 18, 16);
        }
        // Bright forward directional launch chevrons so ramp direction is unmistakable
        c.strokeStyle = '#ffd700';
        c.lineWidth = 10;
        c.lineCap = 'round';
        c.lineJoin = 'round';
        for (const cy of [30, 64, 98]) {
          c.beginPath();
          c.moveTo(w * 0.28, cy - 8);
          c.lineTo(w * 0.5, cy + 16);
          c.lineTo(w * 0.72, cy - 8);
          c.stroke();
        }
      }, 128, 128);

      const rampBodyMat = new THREE_ref.MeshStandardMaterial({ color: '#33404f', roughness: 0.8, metalness: 0.25 });
      const rampTopMat = new THREE_ref.MeshStandardMaterial({
        map: rampDeckTex,
        emissive: '#0c4754',
        emissiveIntensity: 0.55,
        roughness: 0.45
      });

      for (const r of this.stuntRamps) {
        const rg = new THREE_ref.Group();
        rg.position.set(r.x, 0, r.z);
        rg.rotation.y = r.yaw;
        scene.add(rg);

        const sh = new THREE_ref.Shape();
        sh.moveTo(-r.len / 2, 0);
        sh.lineTo(r.len / 2, 0);
        sh.lineTo(r.len / 2, r.height);
        sh.closePath();

        const wedge = new THREE_ref.ExtrudeGeometry(sh, { depth: r.width, bevelEnabled: false, steps: 1 });
        wedge.translate(0, 0, -r.width / 2);
        wedge.rotateY(-Math.PI / 2);
        const wm = new THREE_ref.Mesh(wedge, rampBodyMat);
        wm.castShadow = true;
        wm.receiveShadow = true;
        rg.add(wm);

        const slopeLen = Math.hypot(r.len, r.height);
        const deck = new THREE_ref.Mesh(new THREE_ref.BoxGeometry(r.width + 0.06, 0.12, slopeLen), rampTopMat);
        deck.position.set(0, r.height / 2 + 0.04, 0);
        deck.rotation.x = -Math.atan2(r.height, r.len);
        rg.add(deck);

        const railH = 0.32;
        for (const sx of [-r.width / 2 + 0.16, r.width / 2 - 0.16]) {
          const rail = new THREE_ref.Mesh(new THREE_ref.BoxGeometry(0.22, railH, slopeLen), rampTopMat);
          rail.position.set(sx, r.height / 2 + railH / 2 + 0.06, 0);
          rail.rotation.x = -Math.atan2(r.height, r.len);
          rg.add(rail);
        }

        const merged = mergeStaticModel(rg);
        if (typeof citySectors !== 'undefined' && Array.isArray(citySectors)) {
          citySectors.push({ x: r.x, z: r.z, model: merged });
        }
      }
    }

    return this;
  }

  _updateRoadWetness(rain) {
    const mats = this.win?.roadMaterials || [];
    for (const m of mats) {
      if (!m) continue;
      m.roughness = Math.max(0.18, 0.9 - rain * 0.68);
      m.metalness = Math.min(0.42, rain * 0.38);
    }
  }

  syncMode() {
    const w = this.weatherMode || 'auto';
    if (w !== 'auto') {
      this.worldClock.weather = w;
      this.worldClock.rainIntensity = w === 'storm' ? 1 : w === 'rain' ? 0.68 : 0;
    } else {
      this.worldClock.weather = WEATHER_STAGES[this.worldClock.stageIdx][0];
      this.worldClock.rainIntensity =
        this.worldClock.weather === 'storm' ? 1 : this.worldClock.weather === 'rain' ? 0.68 : 0;
    }
    this.worldClock.lightning = 0;
    if (this.worldClock.weather === 'storm') this.worldClock.lightningTimer = 2.5;
    const flash = this.doc?.getElementById('weatherFlash');
    if (flash) flash.style.opacity = '0';
    this._updateRoadWetness(this.worldClock.rainIntensity);
    if (this.win) this.win.sceneDirty = true;
  }

  advanceHours(h = 3) {
    this.worldClock.manualOffset = (this.worldClock.manualOffset + h) % 24;
    if (this.win) this.win.sceneDirty = true;
  }

  getClockBadge() {
    const hh = String(Math.floor(this.worldClock.hour)).padStart(2, '0');
    const mm = String(Math.floor((this.worldClock.hour % 1) * 60)).padStart(2, '0');
    const wTag =
      this.worldClock.rainIntensity > 0.35
        ? this.worldClock.weather === 'storm'
          ? ' · STORM'
          : ' · RAIN'
        : '';
    return ` · ${hh}:${mm}${wTag}`;
  }

  computeAtmosphere(_time, dt, prevFestive, { playTime = 0, running = true, activeMission = null } = {}) {
    const wc = this.worldClock;
    const stepDt = Math.max(0, Math.min(0.25, Number(dt) || 0));

    // Align atmosphere cleanly with active Mission weather / time-of-day rules
    const mWeather = activeMission?.weather;
    if (this.timeMode === 'day') wc.hour = 12.5;
    else if (this.timeMode === 'sunset' || mWeather === 'sunset') wc.hour = 17.8;
    else if (this.timeMode === 'sunrise' || mWeather === 'sunrise') wc.hour = 6.2;
    else if (this.timeMode === 'night' || mWeather === 'night' || mWeather === 'blackout') wc.hour = 22.5;
    else {
      wc.hour = ((21.5 + playTime / 24 + wc.manualOffset) % 24 + 24) % 24;
    }

    const targetDusk = mWeather === 'blackout' ? 0.98 : hourToDuskFactor(wc.hour);
    wc.nightAlpha = targetDusk;
    const stepRate = this.timeMode !== 'auto' ? 4.5 : 0.7;
    const festive =
      prevFestive +
      Math.sign(targetDusk - prevFestive) * Math.min(Math.abs(targetDusk - prevFestive), Math.max(stepDt * stepRate, 0.05));

    if (mWeather === 'rain') {
      wc.weather = 'rain';
    } else if (this.weatherMode === 'auto') {
      if (running) {
        wc.weatherTimer -= stepDt;
        if (wc.weatherTimer <= 0) {
          wc.stageIdx = (wc.stageIdx + 1) % WEATHER_STAGES.length;
          wc.weather = WEATHER_STAGES[wc.stageIdx][0];
          wc.weatherTimer = WEATHER_STAGES[wc.stageIdx][1];
        }
      }
    } else {
      wc.weather = this.weatherMode;
    }

    const targetRain =
      mWeather === 'rain'
        ? activeMission?.mechanics?.rainIntensity || 0.88
        : wc.weather === 'storm'
          ? 1
          : wc.weather === 'rain'
            ? 0.68
            : 0;

    wc.rainIntensity +=
      Math.sign(targetRain - wc.rainIntensity) * Math.min(Math.abs(targetRain - wc.rainIntensity), Math.max(stepDt * 0.55, 0.04));
    this._updateRoadWetness(wc.rainIntensity);

    if (wc.weather === 'storm' && wc.rainIntensity > 0.82) {
      if (running) {
        wc.lightningTimer -= stepDt;
        if (wc.lightningTimer <= 0) {
          wc.lightning = 1;
          wc.lightningTimer = 6 + Math.random() * 5;
        }
      }
    } else {
      wc.lightning = 0;
    }
    if (wc.lightning > 0) wc.lightning = Math.max(0, wc.lightning - stepDt * 3.6);

    const flash = this.doc?.getElementById('weatherFlash');
    if (flash) {
      flash.style.opacity = (wc.lightning * 0.42).toFixed(3);
    }
    return { festive, dusk: targetDusk, rain: wc.rainIntensity, lightning: wc.lightning };
  }

  updateVehicleJump(v, spec, dt, { speed = 0, activeMission = null, onJumpLanded = null, onJumpLaunch = null } = {}) {
    if (!v || spec?.isBoat) return { launched: false, landed: false, airDist: 0, bonus: 0 };

    if (v.airborne) {
      v.jumpVy = (v.jumpVy || 0) - 14.5 * (this.win?._gravityScale ?? 1) * dt;
      v.jumpY = (v.jumpY || 0) + v.jumpVy * dt;
      v.jumpPitch = Math.max(-0.36, Math.min(0.28, -v.jumpVy * 0.028));

      if (v.jumpY <= 0) {
        v.jumpY = 0;
        v.jumpVy = 0;
        v.jumpPitch = 0;
        v.airborne = false;
        this.drivingJuice?.slowMo?.cancel?.();
        if (this.win) {
          this.win.stuntSlowMo = 0;
          this.win.vehiclePitch = 0.048;
          this.win.triggerCameraShake?.(0.32, 0.26);
        }
        this.audioManager?.playCrash?.(0.32);

        let airDist = 0;
        let bonus = 0;
        if (v.jumpStart) {
          airDist = Math.round(Math.hypot(v.x - v.jumpStart.x, v.z - v.jumpStart.z));
          if (airDist >= 12) {
            bonus = Math.min(600, Math.max(200, Math.round(airDist * 14)));
            this.saveManager?.addCash?.(bonus);
            this.audioManager?.playCue?.('success');
            this.eventBus?.emit?.('physics:stunt', { airDist, bonus });
            onJumpLanded?.(airDist, bonus);
          }
          v.jumpStart = null;
        }
        return { launched: false, landed: true, airDist, bonus };
      }
      return { launched: false, landed: false, airDist: 0, bonus: 0 };
    }

    let activeRamp = null;
    let sLocal = 0;
    for (const r of this.stuntRamps) {
      const dx = v.x - r.x;
      const dz = v.z - r.z;
      const s = dx * r.dirX + dz * r.dirZ;
      const lat = -dx * r.dirZ + dz * r.dirX;
      if (Math.abs(lat) <= r.width / 2 + 0.45 && s >= -r.len / 2 && s <= r.len / 2 + 0.4) {
        activeRamp = r;
        sLocal = s;
        break;
      }
    }

    const triggerLaunch = () => {
      v.airborne = true;
      v.jumpVy = Math.max(6.2, Math.min(13.5, Math.abs(speed) * 0.34)) * ((this.win?._jumpMultiplier || 1) > 1 ? 1.5 : 1);
      v.jumpStart = { x: v.x, z: v.z };
      v.onRamp = null;
      if (!activeMission) {
        this.drivingJuice?.slowMo?.trigger?.(1.5, 0.3);
        if (this.win) this.win.stuntSlowMo = 1.5;
      }
      this.audioManager?.playNosBurst?.();
      onJumpLaunch?.();
      return { launched: true, landed: false, airDist: 0, bonus: 0 };
    };

    if (activeRamp) {
      const dot = Math.sin(v.yaw) * activeRamp.dirX + Math.cos(v.yaw) * activeRamp.dirZ;
      if (!v.onRamp && sLocal > 0.6 && dot < -0.2) {
        // Solid rear wall collision — push car cleanly outside the high back of the ramp (never clip inside!)
        const lat = -(v.x - activeRamp.x) * activeRamp.dirZ + (v.z - activeRamp.z) * activeRamp.dirX;
        const pushS = activeRamp.len / 2 + 2.35;
        v.x = activeRamp.x + activeRamp.dirX * pushS - activeRamp.dirZ * lat;
        v.z = activeRamp.z + activeRamp.dirZ * pushS + activeRamp.dirX * lat;
        v.jumpY = 0;
        v.jumpPitch = 0;
        if (typeof velocity !== 'undefined' && velocity > 0) velocity = -Math.min(3.5, velocity * 0.25);
        return { launched: false, landed: false, airDist: 0, bonus: 0, blockedRear: true };
      }
      const u = Math.max(0, Math.min(1, (sLocal + activeRamp.len / 2) / activeRamp.len));
      v.onRamp = activeRamp.id;
      v.jumpY = u * activeRamp.height;
      v.jumpPitch =
        speed >= 0 && dot > 0.25
          ? -Math.atan2(activeRamp.height, activeRamp.len)
          : dot < -0.25
            ? Math.atan2(activeRamp.height, activeRamp.len)
            : 0;
      if (sLocal > activeRamp.len / 2 - 0.1 && speed * dot >= 9) {
        return triggerLaunch();
      }
    } else if (v.onRamp) {
      const prevR = this.stuntRamps.find((r) => r.id === v.onRamp);
      const pastLip =
        prevR &&
        (v.x - prevR.x) * prevR.dirX + (v.z - prevR.z) * prevR.dirZ > prevR.len / 2 &&
        Math.sin(v.yaw) * prevR.dirX + Math.cos(v.yaw) * prevR.dirZ > 0.3 &&
        speed >= 9;
      if (pastLip) {
        return triggerLaunch();
      }
      if ((v.jumpY || 0) > 0.35) {
        v.airborne = true;
        v.jumpVy = 0.6;
        v.jumpStart = null;
        v.onRamp = null;
      } else {
        v.jumpY = 0;
        v.jumpPitch = 0;
        v.onRamp = null;
      }
    } else {
      v.jumpY = 0;
      v.jumpPitch = 0;
    }
    return { launched: false, landed: false, airDist: 0, bonus: 0 };
  }

  render(dt = 0.016, { player = { x: 0, z: 0 }, running = true } = {}) {
    if (!this._rainMesh || !this._rainDummy) return;
    const rInt = this.worldClock.rainIntensity || 0;
    this._rainMesh.visible = rInt > 0.02;
    if (!this._rainMesh.visible) return;

    this._rainMat.opacity = Math.min(0.52, rInt * 0.48);
    const windX = this.worldClock.weather === 'storm' ? 3.5 : 1.2;
    for (let i = 0; i < this._rainCount; i++) {
      const drop = this._rainDrops[i];
      if (running) {
        drop.y -= drop.spd * dt;
        drop.ox += windX * dt;
      }
      if (drop.y < 0) {
        drop.y = 18;
        drop.ox = (Math.random() - 0.5) * 34;
        drop.oz = (Math.random() - 0.5) * 34;
      }
      this._rainDummy.position.set(player.x + drop.ox, drop.y, player.z + drop.oz);
      this._rainDummy.rotation.set(0, 0, 0.1);
      this._rainDummy.scale.set(1, 1, 1);
      this._rainDummy.updateMatrix();
      this._rainMesh.setMatrixAt(i, this._rainDummy.matrix);
    }
    this._rainMesh.instanceMatrix.needsUpdate = true;
  }
}
