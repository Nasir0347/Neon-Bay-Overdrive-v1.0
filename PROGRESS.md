# NEON BAY: OVERDRIVE — Engineering Progress & Architecture Audit

> **Master Spec Reference:** [`neon_bay_overdrive_single_master_spec_4_prompts.md`](neon_bay_overdrive_single_master_spec_4_prompts.md) *(spec alias: `GAME_MASTER_SPEC_V1.md`)*  
> **Updated Date:** 2026-11-24 (`V1.0 4-Phase AAA UI/Menu/Help Overhaul, Circular Mobile Orbs, 6-Tab Pause Hub, Live Mission Help & Final Ship Build Verified`)  
> **Release Artifacts:** `www/` (`1.506 MB`, `13` files), obfuscated `dist/` (`1.405 MB`, `15` files / `9` obfuscated JS, `0` legacy strings, `0` unused chunks), Android APK [`releases/Neon-Bay-Overdrive-v1.0.apk`](releases/Neon-Bay-Overdrive-v1.0.apk) (`4.55 MB`).

---

## 0. Latest V1.0 4-Phase AAA UI Overhaul, OBB SAT Physics & Release Status (2026-11-24)

- **4-Phase AAA UI, Console Menu & Forget-Proof Live Mission Help Overhaul ([`UI_OVERHAUL_PLAN.md`](UI_OVERHAUL_PLAN.md)):**
  - **Phase 1:** 100% circular (`border-radius: 50%`) Mobile & Tablet thumb-arc orbs (`GAS`, `BRAKE`, `DRIFT`, `NOS` + live cyan charge perimeter ring, `EXIT/ENTER/CALL`, `PHONE`, `TOOLS`, `PAUSE`, 12-orb `TOOLS` dock elevated at `z-index: 48`), rounded-square GPS radar (`#mapWrap`), and dual-arc SVG radial speedometer (`#telemetry.radial-gauge`, `G1–G5`/`FOOT`).
  - **Phase 2:** Cinematic Boot Showcase (`#bootPlayOverlay` w/ `#bootProgressPill` + 4 circular quick orbs) and operational 6-tab Console Pause Hub (`RESUME`, `MAP`, `MISSIONS`, `GARAGE`, `CONTROLS & HELP`, `SETTINGS` w/ 4 Radio stations & 6-Locale switcher including RTL).
  - **Phase 3:** Next-Gen Neon OS Smartphone (live status bar, 4 circular app orbs, 3-orb utility dock, Garage `SPEED/ACCEL/HANDLING` stat bars), Forget-Proof Live Mission & Controls Help Drawer (`#objectiveHelpPill` `?` / `[H]` pausing countdown & highlighting step checklist + device button tips via `getLiveHelpGuide()`), and dramatic pop-in `★ ★ ★` Celebration & Failure modals.
  - **Phase 4:** Full 6-locale + Arabic/Urdu RTL + `LOW/MED/HIGH` blur QA (`0` banned terms), all 9 verification suites passed (`test:core 47/47`, `overhaul-master-gate 48/48`, `ui-responsive-gate 68/68`, `cutover-final-gate 12/12`, `world-living-gate 11/11`, `missions-gate 14/14`, `garage-phone-photo-gate 17/17`, `audio-perf-gate 7/7`, `release-gate 6/6`), and final Web + Android APK (`4.55 MB`) built cleanly.

- **100% OBB SAT Vehicle Collision & Zero Road-Snag Physics:** Eliminated `3.9m–4.45m` invisible vehicle forcefields, movement-skipping deadlocks, and mid-road parked/abandoned car snags across [`game.js`](game.js), [`TrafficManager.js`](src/world/TrafficManager.js), [`PoliceManager.js`](src/world/PoliceManager.js), [`world-runtime-wiring.js`](src/world/world-runtime-wiring.js), [`missions-runtime-wiring.js`](src/missions/missions-runtime-wiring.js), [`features-runtime-wiring.js`](src/ui/features-runtime-wiring.js), [`src/main.js`](src/main.js), and [`Destructibles.js`](src/world/Destructibles.js). Added sub-stepped 2D OBB SAT separation + tangential sliding + curbside vehicle parking + `parkOtherHeroVehiclesClearOf()` (`0` multi-lane snags, `0` stuck frames across `2.1m..4.0m` side passing, smooth side-scrapes & head-on reverse release).
- **2000m × 2000m 4-District City (`InstancedMesh`):** Expanded `Apex Core`, `Palm Strip`, `Iron Docks`, and `Bayview Heights` (+ `620m` Neon Bay Airport Runway, Private Jet, Control Tower, Pier 99, Titan Bank, Solaris Tower, Vega's Garage, Skyline Mega-Ramp) with District & Street entry toasts (`CityLayout.axes = [-900,-600,-300,0,300,600,900]`).
- **Zero Invisible Colliders (1-to-1 Physics-Visual Sync):** Removed `12` phantom intersection boxes in [`city-layout.js`](city-layout.js), shifted `docksWarehouse` (`-626, -36`) & `airportTower` (`665, -36`) clear of Central Blvd, moved parked vehicles off active lanes in [`game.js`](game.js), and unified `CityLayout.prepare(buildings)` as single source of truth with [`city.js`](city.js) (`0` road hits across all `14` corridors `-880..880`).
- **Modern Multi-Tier Architecture & Crisp Sky:** Fixed black metallic towers caused by premature pre-city `reflectionCamera` capture in [`world3d.js`](world3d.js); replaced checkerboard facades, stretched cone villa roofs, wooden Bazaar stalls, and square sky stars ([`polish.js`](polish.js)) with multi-tier modern glass towers, Miami Art-Deco resorts, flat cantilevered villas, grounded plazas, crisp 4-lane roads, and pinpoint circular stars.
- **On-Foot Gameplay & 7 Walk-In Landmark Interiors (`M1, M4, M10, M11, M14, M20`):** Built hollow walk-in interiors (`Solaris Tower`, `Titan National Bank`, `NBPD Police HQ`, `Vega's Garage` with auto-repair, `Pier 99 Lounge`, `Airport VIP Terminal`, `Iron Docks Sanctuary`), added `E`/`F` & mobile `EXIT CAR`/`ENTER CAR`/`CALL CAR` transitions + indoor camera, and integrated on-foot building stages + `chapterTag` / `storyHook` / `steps` / `midComms` + live step progress & Mystery Teaser cards across all 20 missions ([`missionsConfig.js`](src/missions/missionsConfig.js), [`MissionManager.js`](src/missions/MissionManager.js)).
- **Virtual Driving Joystick, 12-Shortcut PC Parity & Multi-Device AAA Scaling:** Upgraded [`TouchControls.js`](src/ui/TouchControls.js), [`InputManager.js`](src/core/InputManager.js), [`SaveManager.js`](src/core/SaveManager.js), [`Smartphone.js`](src/ui/Smartphone.js), [`HUD.js`](src/ui/HUD.js), [`hud.css`](src/ui/hud.css), and `12` new 6-locale `i18n` keys: unified 360° glowing Driving+Walking Joystick with 1-tap `STICK/BTNS` switch, dedicated `DRIFT` + `NOS` + `BRAKE` + `GAS` 2×2 action cluster, 12-shortcut `TOOLS` Command Grid, centered spacious Smartphone Missions Hub (`CAMPAIGN 0/20` progress bar + filters), Desktop header shortcuts + Pause Quick-Settings, and scaled Tablet Touch UI (`112px` minimap, `146px` joystick).
- **Stage 2 Cleanup & Final Full Verification:** Deleted `140` orphan legacy files/folders, rebuilt `www/` (`1.506 MB`), `dist/` (`1.405 MB`), and Android APK (`4.55 MB`), and passed all `9` verification suites with `0` errors: `test:core` (`47/47`), `overhaul-master-gate` (`48/48`), `cutover-final-gate` (`12/12`), `world-living-gate` (`11/11`, `263/1179` nodes), `audio-perf-gate` (`7/7`, `24.95 MB` VRAM `< 150 MB`, `47` `InstancedMesh`es), `ui-responsive-gate` (`68/68`), `missions-gate` (`14/14`), `garage-phone-photo-gate` (`17/17`), and `release-gate` (`6/6`).

---

## 1. Ten Engineering Steps & Test Gates

| Step | Milestone & Scope | Target Modules | Test Gate Criteria | Status |
| :--- | :--- | :--- | :--- | :---: |
| **Step 1** | Full Spec + Codebase Audit, `PROGRESS.md`, Modular Folder Blueprint & Baseline Dev/Build Check | `PROGRESS.md` | `npm run build` exits `0`; `0` runtime/page/request errors | `[x]` |
| **Step 2a** | Core Foundation (`src/core/EventBus.js`, `src/core/SaveManager.js`, `src/core/GameState.js`) & `npm run build` wiring | `src/core/`, `package.json`, `scripts/build-web.cjs` | `core-foundation.test.mjs` & `npm run build` pass | `[x]` |
| **Step 2b** | `InputManager.js` (Keyboard, Multi-Touch `touch-action: none` + iOS pinch-zoom lock, Gamepad API, 1-tap `AudioContext.resume()` unlock) & Core Runtime | `src/core/InputManager.js`, `src/main.js`, `game.js` | `test:core` (`46/46`) & `overhaul-master-gate` (`36/36`) pass | `[x]` |
| **Step 3** | Driving Feel ("Juice" `60° -> 80°` Nitro FOV, micro impact camera shake, `0.3x` 1.5s mega-ramp slow-mo, pooled smoke/skids, Flip Car `R` + `#flipCarBtn`) & Vehicle Roster/Scales (`GarageManager.js`: 12 Cars `C01–C12`, 4 Bikes `B01–B04`, `normalizeVehicleMeshScale`, live customization) | `src/garage/DrivingJuice.js`, `src/garage/GarageManager.js`, `world3d.js`, `world-phase5.js`, `game.js`, `app-ui.js`, `index.html`, `style.css`, `mobile.css` | `driving-controls.test.mjs`, `garage-phone-photo.test.mjs` (`21/21` core), `garage-phone-photo-gate.cjs` (`17/17` E2E), `phase5-hype.cjs`, `flow-polish.cjs`, `pro-qa-audit.cjs` pass (`0` errors, `0` HUD overlaps) | `[x]` |
| **Step 4** | Ultra AAA Miami Neon Glassmorphism UI/UX (`HUD.js`, `hud.css`, `Minimap.js`, `tabular-nums`, `viewport-fit=cover`, `100dvw x 100dvh`, `env(safe-area-inset-*)`, `ResizeObserver`, Portrait FOV/reflow, Rotating GPS radar + Full-Screen Map `M`/tap, District & Radio toasts) + `Smartphone.js` (`Missions`, `Garage`, `Radio`, `Cheats` `9999`/`7777`/`0000`/`5555`) | `src/ui/HUD.js`, `src/ui/Minimap.js`, `src/ui/Smartphone.js`, `src/ui/hud.css`, `src/ui/runtime-wiring.js`, `src/ui/features-runtime-wiring.js` | `ui-hud-minimap.test.mjs` & `garage-phone-photo.test.mjs` (`21/21` core), `ui-responsive-gate.cjs` (`68/68` across `360x640`, `844x390`, `1024x768`, `1920x1080` w/ `0` overlaps/off-screen elements), `garage-phone-photo-gate.cjs` (`17/17` E2E) pass | `[x]` |
| **Step 5** | Living Open-World Systems (`PoliceManager` 1–5★ w/ roadblocks, SWAT + aerial searchlight, 5★ city lockdown, rubber-banding, PIT & LOS cooldown; fixed-pool `TrafficManager`; `Destructibles` lampposts/barricades/hydrants; progressive `VehicleDamage` + 5s fire eject/fail) + Chunk LOD / 2000m Neon Bay map expansion | `src/world/PoliceManager.js`, `TrafficManager.js`, `Destructibles.js`, `VehicleDamage.js`, `world-runtime-wiring.js` | `tests/world-living.test.mjs` (`18/18` core) & `tests/world-living-gate.cjs` (`11/11` E2E: `0->5->0` escape, traffic pool spawn/despawn, breakables, 5s fire eject, constant `367/1786` scene nodes & `1059/199` steady-state GPU memory, `0` errors); Chunk LOD / Mirage Valley map next | `[~]` |
| **Step 6** | Data-Driven Mission Engine (`MissionManager`, 2-line radio subtitle intros, checkpoints, GPS route, post-mission 1–3★ + Ad CTAs, Silent 3-Fail Assist) & All 20 Story Missions (`M1–M20`, Acts 1–4, unlocking `C11 Vortex Apex Gold` & Mirage Valley City 2) | `src/missions/missionsConfig.js`, `MissionManager.js`, `missions-runtime-wiring.js` | `test:core` (`37/37` tests across `10` suites: `M1–M20` 0-NaN schema + all mechanics + M20 reload unlock persistence) & `test:missions` (`14/14` Playwright E2E w/ M1, M9 No-Brakes, M17 Vehicle Switch, M20 Finale reload persistence, constant `373` scene nodes, `0` errors) | `[x]` |
| **Step 7** | Infinite Retention Layers (`DailyMissions.js` + 7-day `STREAK_GOLD_CHROME` skin, `ChallengeModes.js` 1% Ramp / Reverse / 1-HP, `SideHustles.js` VIP Taxi / Police Vigilante `C12` / 3 Hidden Easter Eggs / VIP Test-Drive) & `PhotoMode.js` (1-tap `PHOTO_MODE`, free orbit, PNG watermark export) + `ShareCard.js` (`1200×630` PNG Viral Score Card) | `src/missions/DailyMissions.js`, `ChallengeModes.js`, `SideHustles.js`, `src/ui/PhotoMode.js`, `ShareCard.js`, `src/core/SaveManager.js` | `campaign-complete.test.mjs`, `missions-gate.cjs` (`14/14`), `garage-phone-photo-gate.cjs` (`17/17`), & `release-gate.cjs` (`6/6`) pass for all 4 retention layers, Photo Mode, and `1200×630` ShareCard | `[x]` |
| **Step 8** | Web Audio Engine (`src/audio/AudioManager.js`: RPM gear pitch, drift screech, crash SFX, 3D sirens, 3 Radio Stations: *99.5 Neon FM*, *104.2 Drift Radio*, *88.0 Bay Beats*, `visibilitychange` mute/suspend) & Vega's Garage Customization (`C01–C12`, `B01–B04` paint, Neon Underglow, Turbo/Handling) | `src/audio/AudioManager.js`, `src/garage/GarageManager.js`, `src/core/audio-perf-runtime-wiring.js` | `audio-performance.test.mjs` (`46/46` core) & `audio-perf-gate.cjs` (`7/7` E2E): `0` muted oscillators, `visibilitychange` suspends (`ctx.state='suspended'`) & resumes cleanly, 3 Radio Stations stream & Garage persists in `SaveManager` | `[x]` |
| **Step 9** | 2026 Portal & Mobile 60 FPS Optimization (`PerformanceManager.js`: Half-Res Selective Bloom `width/2, height/2`, `InstancedMesh` batching, Low/Med/High preset disabling blur+bloom on Low, explicit `.dispose()` vehicle swap cleanup, `LazyChunkLoader`, `< 15 MB` bundle, `< 150 MB` VRAM) & V2.0 hooks | `src/core/PerformanceManager.js`, `src/core/audio-perf-runtime-wiring.js`, `world3d.js`, `scripts/build-web.cjs` | `audio-perf-gate.cjs` (`7/7` pass: Low<->Med<->High `0` WebGL errors, `640x360` half-res bloom, `610/97 -> 610/97` `.dispose()` invariance, `42.14 MB` VRAM `< 150 MB`, `1.88 MB` total / `1.428 MB` boot `< 15 MB`) & `graphics-60fps.cjs` pass; legacy city draw-call consolidation (`573 -> < 50`) deferred beyond V1.0 baseline | `[~]` |
| **Step 10** | Monetization (`AdManager.js`: CrazyGames/Poki/Capacitor AdMob SDKs, `gameplayStart`/`gameplayStop`/`happytime`, mandatory pause/mute/reward/resume, every-2-missions interstitials, IAP), i18n (`en/es/pt/fr/de/ar` RTL), `ShareCard.js`, Relative/Case-Sensitive iFrame Path Audit, Obfuscated + Domain-Locked `/dist`, `capacitor.config.json`, `npx cap sync android` & `QA_REPORT.md` | `src/monetization/AdManager.js`, `src/i18n/i18n.js`, `src/ui/ShareCard.js`, `scripts/obfuscate-dist.cjs`, `capacitor.config.json`, `QA_REPORT.md` | `test:core` (`46/46` across `14` suites), `test:release` (`6/6`: AdManager pause/mute/reward/resume, all `6` locales w/ `ar` RTL, `1200×630` PNG ShareCard, `35` relative paths `OK`, obfuscated `dist/index.html` `0` errors), full Playwright regressions, & `npx cap sync android` (`0.222s`) pass | `[x]` |

---

## 2. Audited Inventory of Existing Codebase (Read-Only Snapshot)

### 2.1 Entry, Build, Physics & Render Pipeline
- **Entry & Packaging:**
  - `index.html`: Classic non-module `<script>` loader importing `vendor/three.min.js` followed by **24 sequential global-scope scripts** (`chapter-three.js` through `world-phase7.js`), plus `style.css`, `mobile.css`, and `expansion.css`.
  - `scripts/build-web.cjs`: Copies **30 runtime assets** into `www/` (`npm run build:web`), verified at `1,066,996` bytes (`1.02 MB`).
  - `capacitor.config.json`: `appId: "com.nasir.bazaarrun"`, `appName: "Nasir Bazaar Run"`, `webDir: "www"`, `androidScheme: "https"`, `allowMixedContent: false`.
  - `package.json`: Version `2.1.0`, `@capacitor/*` `8.6.2`, `playwright` `1.65.1`; zero bundler (no Vite/Rollup/esbuild yet).
- **City Environment:**
  - `city-layout.js`: 5×5 road axis grid (`[-330, -165, 0, 165, 330]`), `790 m × 790 m` boulevards (`16 m` central / `22 m` outer), `24 m` spatial hash grid `CityLayout.index()`, Dijkstra pathfinder `CityLayout.route()`.
  - `district-data.js`: 6 walk-in interior landmarks (`hotel` w/ `roomDoor`, `depot`, `archive`, `hospital`, `villa`, `gym`).
  - `world3d.js` + `city.js` + `polish.js` + `world-phase2/3/5/6/7.js`: `21` batched `citySectors`, `224` buildings, `14` AI traffic vehicles, `52` patrolling pedestrians, `20` Bazaar City story missions, bounds `[-420, 420]` land + marina sea plane down to `z = -574`.
  - Currently `gl.info.memory` reports `601` geometries, `97` textures, and `562` draw calls (`172,601` triangles) at initial Raja Market camera view (`frame 45`).
- **Physics & Render Loop:**
  - `game.js:111` `frame(t)`: Paces mobile to 30 or 60 FPS (`settings.fpsCap`), clamps `dt` in `[0, 0.08]`, calls `update(dt)` (vehicle acceleration, handbrake drift, NOS, stamina, 4 stunt ramps, wall-sliding `moveSlide()`, `landBlocked()`, pedestrian/traffic AI, wanted stars/chase, mission triggers, 5s auto-save) and `render(t)`.
  - `world3d.js:52–56` `render(t)`: Syncs hero meshes (`vehicle`, `patrol`, `nasir`, `walkers`, `motorcycle`), chase/orbit/lookBack/sky-zoom camera (`resolveCamera()` ray/AABB clamping), runs module render hooks (`renderCity`, `renderAction`, `renderStoryWorld`, `renderPolish`, `renderGTA`, `renderPhase2/5/6/7`), calls `gl.render(scene, view)`, and updates 2D minimap `drawMap()`.

### 2.2 Existing Vehicles (Procedural Meshes) & Spec Scale Mapping (`1 Unit = 1 Meter`)
All vehicles are currently procedural Three.js `THREE.Group` models (`models.js`, `world3d.js`, `gta-overhaul.js`, `world-phase2.js`) — **zero `.glb` files** exist. Chassis-only `Box3` dimensions measured cleanly (headlight `beams` planes excluded):

| Existing Key | Existing Name | Procedural Source | Measured `L × W × H (m)` | Measured `minY (m)` | Top Speed | Spec Target Mapping (`Section 3`) |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| `car` | `NASIR SEDAN` | `models.js:sedan()` | `4.76 × 2.33 × 1.66` | `+0.025` | `79 km/h` | **C01 — Kuro Civic-X** (`4.50×1.85×1.42`, `175 km/h`) |
| `sports` | `BAZAAR GT COUPE` | `gta-overhaul.js:makeSportsCoupe()` | `4.89 × 2.24 × 1.40` | `0.000` | `108 km/h` | **C02 — Kuro Drift-R** (`4.55×1.90×1.35`, `210 km/h`) |
| `bmw` | `BAVARIA M4` *(rename!)* | `gta-overhaul.js:makeBmwCoupe()` | `4.85 × 2.25 × 1.46` | `0.000` | `122 km/h` | **C03 / C04 / C09** sporty coupe chassis base (`C03 Stallion V8 GT`, `C04 Kuro Turbo-RS`, `C09 Vortex Shadow`) |
| `supercar` | `VELOCE V12` | `gta-overhaul.js:makeSupercar()` | `4.94 × 2.30 × 1.32` | **`-0.010`** *(clips floor)* | `140 km/h` | **C10 — Vortex Veneno-X** (`4.78×2.06×1.16`, `320 km/h`) + **C05/C11** variants |
| `pickup` | `BAZAAR PICKUP 4x4` | `gta-overhaul.js:makePickupTruck()` | `4.88 × 2.32 × 1.92` | `+0.007` | `83 km/h` | **C08 — Titan 4x4 Crusher** (`5.40×2.15×2.05`, `185 km/h`) |
| `cruiser` | `PUNJAB POLICE CRUISER` | `models.js:sedan(..., true)` | `4.76 × 2.33 × 1.77` | `+0.025` | `97 km/h` | **C12 — NBPD Interceptor** (`4.90×1.96×1.48`, `250 km/h`) |
| `ambulance` | `CITY AMBULANCE` | `world-phase2.js:makeAmbulance()` | `4.78 × 2.31 × 2.37` | `+0.017` | `94 km/h` | **C07 — Titan Executive** SUV frame base (`4.95×2.05×1.95`) |
| `rickshaw` | `AUTO RICKSHAW` | `gta-overhaul.js` | `2.74 × 1.75 × 2.11` | `+0.018` | `58 km/h` | Traffic/legacy NPC variant *(keep or reskin as utility vehicle)* |
| `stolen` | `HIJACKED CAR` | `gta-overhaul.js` (`stolenMeshes`) | Matches traffic `kind` | — | `61–90 km/h` | Traffic pool (`sedan`/`pickup`/`rickshaw`) |
| `patrol2` | 2nd Interceptor | `gta-overhaul.js` | `4.76 × 2.33 × 1.77` | `+0.025` | — | `PoliceAI` pooled pursuit units |
| `boat` | `MARINA SPEEDBOAT` | `world-phase2.js:makeSpeedboat()` | `6.68 × 2.30 × 1.39` | `+0.060` | `108 km/h` | **V2.0 Emerald Keys** watercraft hook *(preserve in `src/world/`)* |
| `bike` | `STREET BIKE` | `world3d.js:63–69` | `2.46 × 1.06 × 1.75` | `+0.010` | `90 km/h` | **B01 — Phantom Street 600** (`2.05×0.78×1.12`, `220 km/h`) + **B02 Dirt-X** base |
| `superbike` | `APEX 1000RR` | `gta-overhaul.js:makeSuperbike()` | `2.48 × 0.80 × 1.40` | `0.000` | `130 km/h` | **B03 — Phantom R1000** (`2.10×0.80×1.15`, `295 km/h`) + **B04 Neon-Z** base |

> **Missing Spec Vehicles to Synthesize/Variant-Extend in Step 3 (`src/garage/`):**
> **C03** `Stallion V8 GT`, **C04** `Kuro Turbo-RS`, **C05** `Vortex Spyder`, **C06** `Solaris Drop-Top` (convertible), **C09** `Vortex Shadow`, **C11** `Vortex Apex Gold` (M20 reward), **B02** `Phantom Dirt-X`, **B04** `Phantom Neon-Z`.

---

## 3. Target Modular Architecture (`src/`) & Non-Destructive Plug-in Map

To migrate incrementally from the 24 global scripts without breaking existing driving physics or procedural meshes, map the codebase into the following 8 modular directories:

```text
src/
├── core/
│   ├── EventBus.js          # Decoupled pub/sub (mission:*, police:*, ad:*, v2:* hooks)
│   ├── GameLoop.js          # Fixed/clamped dt accumulator + visibilitychange pause + FPS cap
│   ├── SceneManager.js      # Three.js WebGLRenderer, ACESFilmic, Half-Res Bloom, resize/DPR, disposal registry
│   ├── SaveManager.js       # `neon_bay_save_v1` schema + safe migration from `nasir-bazaar-stories-v2`
│   ├── InputManager.js      # Unified Keyboard, Gamepad API, Touch input & auto-switching device detection
│   └── LegacyBridge.js      # Wraps existing `window.cityVehicles`, `update()`, `render()`, procedural builders
│
├── world/
│   ├── CityManager.js       # City 1 (Neon Bay 2000x2000) + City 2 (Mirage Valley) + V2.0 City 3 chunk hook
│   ├── ChunkLOD.js          # Spatial chunk streamer w/ explicit geometry/material `.dispose()` on unload
│   ├── WeatherCycle.js      # 10-min Day -> Sunset -> Night -> Light Rain cycle + THREE.FogExp2
│   ├── TrafficAI.js         # Pooled instanced/recycled NPC vehicles obeying lane bounds & sirens
│   ├── Destructibles.js     # Pooled lampposts, hydrants & cones with physics impulse & reset
│   ├── Minimap.js           # Rotating 2D canvas minimap + GPS route line + district/road banner feed
│   ├── WantedSystem.js      # 1-5★ escalation, Line-of-Sight 10s cooldown & star-flash clearing
│   └── PoliceAI.js          # Pooled interceptors, rubber-banding, 3+★ PIT maneuvers & roadblocks
│
├── garage/
│   ├── VehicleData.js       # Config registry for C01-C12 & B01-B04 (normalized LxWxH m, y=0, speed, mass)
│   ├── VehicleController.js # Wraps existing `update(dt)` physics + body roll/pitch, No-Brakes/Bomb hooks, Flip R
│   ├── GarageCustomization.js # Vega's Garage: paint swatches, Neon Underglow, Turbo/Handling persisted in SaveManager
│   └── ParticlePool.js      # Pre-allocated instanced drift smoke, nitro flames & spark pools (zero per-frame GC)
│
├── missions/
│   ├── missionsConfig.js    # Data-driven Act 1-4 configs (`M1` to `M20`: timers, target IDs, intro radio lines, payouts)
│   ├── MissionManager.js    # 3s subtitle intros, checkpoints, car HP bars, 1-3★ summary, Anti-Rage-Quit (+10s / -15% cop)
│   ├── DailyMissions.js     # 24h rotating 3 tasks + 7-day streak skin reward
│   ├── ChallengeModes.js    # 1% Rooftop Ramp, Reverse-Gear Race, 1-HP Survival
│   └── SideHustles.js       # VIP Taxi/Uber, Police Vigilante (C12), Midnight Ghost Racer secret, 2-min C11 test-drive
│
├── ui/
│   ├── HUD.js               # Miami Neon Glassmorphism (`tabular-nums`, center 65% clear, auto-fade road banner, speed-lines >220 km/h)
│   ├── TouchControls.js     # 48x48px safe-area pedals/buttons, Portrait layout mode, auto-hide on KB/Gamepad
│   ├── SmartphoneUI.js      # Slide-up glass phone (Missions, Garage/Mechanic, Radio, Cheats)
│   ├── CheatCodes.js        # `9999` Super Jump, `7777` C11 Spawn, `0000` Clear Wanted, `5555` Moon Gravity
│   ├── PhotoMode.js         # Orbit free-cam + `NEON BAY: OVERDRIVE` watermark snapshot export
│   └── ShareCard.js         # 1-tap shareable stat/score card image generator
│
├── audio/
│   └── AudioManager.js      # Dynamic RPM engine synth, drift screech, collision thuds, 3D PositionalAudio sirens, 3 Radio Stations, "TAP TO DRIVE" unlock
│
├── monetization/
│   ├── PortalSDK.js         # Poki / CrazyGames / Capacitor auto-detect, `gameplayStart/Stop`, `happytime`, iframe link guard
│   ├── AdManager.js         # Rewarded (+20s revive, 2x cash, VIP C11, Neon) & 2-mission Interstitial + mandatory mute/pause lock
│   ├── IAPManager.js        # Capacitor store bridge (`remove_ads` $2.99, `unlock_all_vehicles` $4.99)
│   └── AnalyticsManager.js  # Telemetry events (`game_loaded`, `mission_*`, `ad_rewarded_watched`, `vehicle_unlocked`)
│
└── i18n/
    ├── i18n.js              # Lightweight key lookup, RTL direction switch for Arabic (`ar`), reactive HUD text bind
    └── locales/             # External JSON dictionaries: `en.json`, `es.json`, `pt.json`, `fr.json`, `de.json`, `ar.json`
```

**Integration & V2.0 Decoupling Strategy:**
1. **`LegacyBridge.js` First:** Keep existing procedural builders (`models.js`, `gta-overhaul.js`, `world-phase2.js`) wrapped rather than rewriting meshes; normalize each `THREE.Group` with `Box3` scale/Y-offset helpers inside `VehicleData.js`.
2. **State Serialization (`V2.0` Hook):** Serialize active vehicle `{ id, pos, rot, vel, dmg, nos, neon }` + player district cleanly through `EventBus` & `SaveManager` so future multiplayer sync (`Colyseus`/`Socket.io`) reads one canonical struct.
3. **Chunk World Loader (`V2.0` Hook):** Abstract Neon Bay, Mirage Valley, and future City 3 (*Emerald Keys*) as chunk descriptors implementing `{ mount(), update(dt), unmountAndDispose() }`.

---

## 4. Audit Findings: Console Warnings, Memory Leaks, Paths & Compliance

### 4.1 Console Warnings & Network Errors
1. **Three.js Build Deprecation Warning (`vendor/three.min.js`):**
   - Observed live console warning on boot:  
     `warning: Scripts "build/three.js" and "build/three.min.js" are deprecated with r150+, and will be removed with r160. Please use ES Modules or alternatives`
   - Fix target (Step 2): Switch to ES Module Three.js (`type="module"` + bundler) instead of global script injection.
2. **Missing `/favicon.ico` 404 on HTTP / Capacitor Origin:**
   - `index.html` lacks an icon tag; Capacitor Android (`https://localhost/`) logs a `404 (Not Found)` resource console error on load. (Note: `file://` headless boot had `0` `requestfailed` errors.)
   - Fix target (Step 2/4): Add `<link rel="icon" href="data:,">` in `<head>`.

### 4.2 Memory Leaks, Per-Frame GC Allocations & Render Overhead
1. **Per-Frame GC Object Allocations (`10` total `new THREE.*` hits, `2` in runtime helpers):**
   - `story-world.js:37` & `story-runtime.js:9`: `new THREE.Vector3(.3, ...)` allocated whenever `propPosition('hand')` / `'inventory'` executes during active render. Pre-allocate scratch vectors (`_tmpOffset`) at module scope!
   - Also audit all hot render functions in Step 9 so `0` `THREE.Vector3` / `Color` / `Matrix4` allocations happen inside `frame()`/`render()`.
2. **Insufficient GPU Disposal (`6` `.dispose()` calls total vs `601` geometries & `97` textures):**
   - `.dispose()` currently appears only in `world3d.js` (`4` calls), `polish.js` (`1`), and `gta-overhaul.js` (`1`). Chunk swaps (Mirage Valley / City 3) and vehicle previews/swaps will leak WebGL VRAM unless `SceneManager` / `ChunkLOD` tracks and disposes geometries, materials, and textures on teardown.
   - Specifically in **`world3d.js` lines 6 & 98–99**: Line 6 builds a `PMREMGenerator` `envRT` (`scene.environment = envRT.texture; window.cityEnvMap = envRT.texture;`), and lines 98–99 allocate a second `WebGLCubeRenderTarget` (`reflectionTarget`) + `CubeCamera` and **overwrite `scene.environment = reflectionTarget.texture`** without calling `envRT.dispose()`, orphaning a GPU render target on startup!
3. **Unmanaged Global Event Listeners:**
   - Anonymous `addEventListener` listeners are registered permanently across 8 files (`game.js`, `world3d.js`, `audio.js`, `mobile.js`, `story-runtime.js`, `commerce.js`, `app-ui.js`). Centralize in `InputManager.js` & `GameLoop.js` with clean teardown support.
4. **Draw-Call & Triangle Budget Gap:**
   - Current baseline renders **`562` draw calls** (`172,601` triangles) in Raja Market (`501–564` across modes), exceeding Section 8's **2026 60 FPS target** (`< 50` mobile draw calls / `< 120` desktop). Requires `InstancedMesh` consolidation for street furniture, trees, buildings, and vehicles in Step 9.
   - Additionally, `models.js:49` allocates `new THREE.PlaneGeometry(.52,.13)` inside a loop and `world3d.js:14` `texture()` creates standalone `CanvasTexture` per sign (`sign()` called for every shopfront), contributing to the `97` textures in GPU memory; atlas/canvas reuse will drop VRAM sharply.

### 4.3 Asset Paths, Viewport Meta, Vehicle Scale & Legal Compliance
1. **Master Spec Filename Mismatch:**
   - Workspace file is [`neon_bay_overdrive_single_master_spec_4_prompts.md`](neon_bay_overdrive_single_master_spec_4_prompts.md), not `GAME_MASTER_SPEC_V1.md` (documented here as canonical alias).
2. **Restricted Legal/Brand Terms (`21` code hits vs Section 1):**
   - `"BAVARIA M4"` / `bmw` identifier appears across `game.js` (`8` hits incl. `snapshot`/`restoreSnapshot`/`vehicleSpecs`), `world-phase3.js:88`, `world-phase5.js:344`, `audio.js:258,274`, `city.js:84`, `commerce.js:17`, `gta-overhaul.js:268`, and `"GTA"` appears in comments/UI (`gta-overhaul.js:1`, `world-phase5.js:1,134,155`, `app-ui.js`, `campaign.js`). All UI copy and public brand names MUST be sanitized to fictional Neon Bay brands (`Vortex`, `Kuro`, `Stallion`, `Titan`, `Solaris`, `Phantom`) starting in Step 2–3.
3. **Vehicle Bounding-Box Issues:**
   - `supercar` (`VELOCE V12`) sits at `minY = -0.010 m` (1 cm wheel clip below `y = 0`), and `boat` sits at `minY = +0.060 m`.
   - `sedan` (`car`) & `bike` headlight `beams` planes (`PlaneGeometry(2.3, 11)`) extend `Box3` length from `4.76 m` to `15.48 m` (`car`) and `2.46 m` to `11.66 m` (`bike`) when enabled; normalization helpers in `VehicleData.js` must exclude FX/beam children.
4. **Viewport Meta Tag (`index.html:2`):**
   - Currently `content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover"` — missing `user-scalable=no` and HUD `env(safe-area-inset-*)` container rules required in Section 6.
5. **Clean Hygienes Confirmed:**
   - **External URLs:** `0` (`index.html` & runtime scripts are 100% relative and case-accurate).
   - **TODO Stubs:** `0` (`TODO` / `FIXME` count = `0`).
   - **Bundle Size:** `1.02 MB` total (`30` runtime assets in `www/`), well inside `< 15 MB` web portal budget.

---

## 5. Step 1 Test Gate Results (Read-Only Baseline)

> Executed on **2026-11-23** after creating `PROGRESS.md`, with **zero edits** to any existing source file:

- **`npm run build:web` (`node scripts/build-web.cjs`):** ✅ Passed (`exit code 0`, `30` runtime assets / `1,066,996` bytes bundled cleanly into `www/`).
- **`node tests/campaign.cjs`:** ✅ Passed (`exit code 0`, `78` campaign assertions).
- **`node tests/data-invariants.cjs`:** ✅ Passed (`exit code 0`, `9,135` invariant checks).
- **`node tests/render-diagnostics.cjs`:** ✅ Passed (`exit code 0`, `29 FPS`, `564` draw calls, `173,476` triangles, `16.3 ms` median CPU, `[720, 324]`, ANGLE Intel HD Graphics 520).
- **Playwright `www/index.html` boot & console audit:** ✅ Passed (`exit code 0`, `ready: true`, `errors: []`, `reqFailed: []`, only 1 expected deprecation warning: `Scripts "build/three.js" and "build/three.min.js" are deprecated with r150+, and will be removed with r160...`).

---

## 6. Step 2a Test Gate Results (Core Foundation — Non-Destructive)

> Executed on **2026-11-23** with **zero edits** to existing car/city rendering or physics files (`game.js`, `world3d.js`, `models.js`, `city.js`, `polish.js`, `gta-overhaul.js`, `world-phase*.js`, `index.html`):

- **New Modules Created:**
  - [`src/package.json`](src/package.json) (`{"type":"module"}` scoped strictly to `src/` so `.cjs` legacy tests stay intact)
  - [`src/core/EventBus.js`](src/core/EventBus.js) (`on`, `off`, `once`, `emit`, `clear`, `listenerCount`, `eventNames`, canonical `EVENTS`)
  - [`src/core/SaveManager.js`](src/core/SaveManager.js) (`neon_bay_save_v1`, `SCHEMA_VERSION = 1`, `migrate`, `sanitize`, corrupt JSON recovery, `SecurityError`/`QuotaExceededError` in-memory `Map` fallback, V2.0 `serializeVehicleState` hook)
  - [`src/core/GameState.js`](src/core/GameState.js) (`STATES`, `VALID_TRANSITIONS` + `PAUSED`/`PHOTO_MODE` return-state guards across `LOADING`, `FREE_ROAM`, `MISSION_ACTIVE`, `PAUSED`, `GARAGE`, `PHOTO_MODE`)
  - [`tests/core-foundation.test.mjs`](tests/core-foundation.test.mjs) (automated `node:test` suite)
- **`node --test tests/core-foundation.test.mjs`:** ✅ Passed (`exit code 0`, **`8 / 8` tests passed**, `0` failures, `253.29 ms`).
- **`npm run build` (`node scripts/build-web.cjs`):** ✅ Passed (`exit code 0`, bundles all 30 existing assets + `src/core/*` cleanly into `www/`).
- **`node tests/campaign.cjs`:** ✅ Passed (`exit code 0`, `78` campaign assertions).
- **`node tests/render-diagnostics.cjs`:** ✅ Passed (`exit code 0`, `30 FPS`, `564` draw calls, `173,476` triangles, `8.7 ms` median CPU — existing rendering confirmed intact).

---

## 7. Driving Feel ("Juice"), InputManager & Audio Unlock Test Gate Results

> Executed on **2026-11-23** without replacing core driving physics math or existing procedural car/city meshes:

- **New Modules & Integrations:**
  - [`src/core/InputManager.js`](src/core/InputManager.js) (`DEFAULT_DEADZONE = 0.15`, unified Keyboard + Multi-Touch + Gamepad API normalization, `touch-action: none` enforcement, iOS Safari pinch-zoom lock, and 1-tap `AudioContext.resume()` unlock listener).
  - [`src/garage/DrivingJuice.js`](src/garage/DrivingJuice.js) (`computeDynamicFov` `60° -> 80°`, `CameraShake`, `SlowMotionController` `0.3x` / `1.5s`, zero-GC `ParticlePool`, and `flipCar()` roll/pitch/stuck recovery).
  - Playable runtime wiring across [`world3d.js`](world3d.js), [`world-phase5.js`](world-phase5.js), [`game.js`](game.js), [`audio.js`](audio.js), [`mobile.js`](mobile.js), [`app-ui.js`](app-ui.js), [`index.html`](index.html), [`style.css`](style.css), and [`mobile.css`](mobile.css) (`60° -> 80°` Nitro FOV boost, collision/landing camera shake, `0.3x` 1.5s mega-ramp slow-motion, Gamepad polling, iOS pinch lock + 1-tap `AudioContext.resume()`, and `R` / HUD `#flipCarBtn`).
- **`npm run test:core` (`node --test tests/core-foundation.test.mjs tests/driving-controls.test.mjs`):** ✅ Passed (`exit code 0`, **`11 / 11` tests passed**, `0` failures).
- **`npm run build`:** ✅ Passed (`exit code 0`, bundles runtime + `src/core/*` + `src/garage/*` into `www/`).
- **Playwright Regressions (`0` runtime/console errors):**
  - `node tests/phase5-hype.cjs` (**14 / 14** checks passed incl. `Veloce V12 + NOS` stunt launch & `0` muted SFX oscillators)
  - `node tests/flow-polish.cjs` (**19 / 19** checks passed)
  - `node tests/pro-qa-audit.cjs` (**22 / 22** checks passed)
  - `node tests/render-diagnostics.cjs` (`30 FPS`, `566` draw calls, `173,480` triangles, `9.9 ms` median CPU)
  - Live browser HUD & Juice E2E check (**10 / 10** checks passed: `60.0 -> 80.0` Nitro FOV, `0.149 m` decaying camera shake, `1.5 s` slow-motion trigger at `0.3x effDt`, desktop `KeyR` + `#flipCarBtn`, and zero-overlap mobile `#flipCarBtn` at `685×320` & `740×360`).

---

## 8. Section 6 Miami Neon UI/UX, Cross-Device Responsiveness & Rotating Minimap Test Gate Results

> Executed on **2026-11-23**:

- **New Modules & Styling:**
  - [`src/ui/HUD.js`](src/ui/HUD.js) (`NEON_DISTRICTS`: `Apex Core`, `Palm Strip`, `Iron Docks`, `Bayview Heights`; `computeResponsiveFov` `+10°..+14°` in portrait; `resolveNeonDistrict`, `formatCash`, `formatWantedStars`, `computeLayoutMode`, `HUD` managing `#hudTopRight` Cash/5-Star Wanted/Mission Timer with `tabular-nums`, `#neonToast` District & Radio announcements, speed-lines `> 220 km/h`, damage vignette, `ResizeObserver` layout reflow, auto-switching KB/Touch input classes, and `gfx-low` blur toggle).
  - [`src/ui/Minimap.js`](src/ui/Minimap.js) (`MINIMAP_DISTRICTS`, `computeMinimapTransform`, rotating 2D GPS radar canvas renderer with centered player arrow, cyan waypoint GPS route line, upright district labels, blinking red/cyan police dots, Cardinal `N` marker, and full-screen North-Up tactical map `#fullMapOverlay` toggled via **`M` key** or **minimap tap/click**).
  - [`src/ui/hud.css`](src/ui/hud.css) (`100dvw x 100dvh`, `env(safe-area-inset-*)`, `clamp()`/`vmin` scaling, Miami Neon Glassmorphism `--glass-bg` + `backdrop-filter: blur(12px)` disabled on `body.gfx-low`, `font-variant-numeric: tabular-nums`, `>= 48x48px` mobile action buttons, automatic Portrait/Landscape reflow moving `#mapWrap` to Top-Left and pedals to lower thumb zone in portrait).
  - [`src/ui/runtime-wiring.js`](src/ui/runtime-wiring.js) & [`ui-bundle.js`](ui-bundle.js) (generated deterministically by [`scripts/build-web.cjs`](scripts/build-web.cjs) so classic `file://` builds and ES Module Node tests share one source of truth).
  - Updated [`index.html`](index.html) (`user-scalable=no, viewport-fit=cover`, favicon data URI, stylesheet/bundle links), [`world3d.js`](world3d.js) (`window.fitCamera`, dynamic Portrait FOV bonus `+10°..+14°`, mobile DPR cap `<= 1.5`, `gfx-low` toggle), [`mobile.js`](mobile.js), and [`mobile.css`](mobile.css).
- **Intentional Change Note:** Replaced legacy portrait orientation lock (`#rotateNotice` overlay and automatic `resize` pause in `mobile.js` / `mobile.css`, previously tested by legacy `verify-mobile.cjs`) with Section 6 automatic **Portrait/Landscape reflow** so mobile and desktop portrait screens (`360×640`, etc.) remain live and playable.
- **`npm run build`:** ✅ Passed (`exit code 0`, generated `ui-bundle.js` and bundled all runtime + `src/ui/*` assets into `www/`).
- **`npm run test:core` (`tests/core-foundation.test.mjs`, `tests/driving-controls.test.mjs`, `tests/ui-hud-minimap.test.mjs`):** ✅ Passed (`exit code 0`, **`14 / 14` tests passed**, `0` failures).
- **`npm run test:ui` (`tests/ui-responsive-gate.cjs` on `www/index.html`):** ✅ Passed (`exit code 0`, **`68 / 68` checks passed**, `0` runtime/console errors):
  - **All 4 Target Viewports:** `360×640` mobile portrait (portrait FOV `73.5°` idle / `79.2°` moving vs `60.0°` landscape, minimap Top-Left, lower thumb pedals, live without `#rotateNotice`), `844×390` iPhone landscape, `1024×768` tablet/iframe (both Touch & Desktop modes), and `1920×1080` desktop — **`0` HUD overlaps**, **`0` off-screen elements/buttons**, **`>= 48×48px` mobile action buttons**.
  - Rotating 2D minimap pixels update cleanly with heading, `#fullMapOverlay` toggles via **`M`** & **minimap tap/click**, glass blur toggles (`blur(12px)` High -> `none` Low), radio toast fires on station change, and all 4 districts (`PALM STRIP`, `IRON DOCKS`, `BAYVIEW HEIGHTS`, `APEX CORE`) trigger Neon toasts.
- **Playwright Regressions (`0` runtime/console errors):**
  - `node tests/flow-polish.cjs` (**19 / 19** checks passed)
  - `node tests/pro-qa-audit.cjs` (**22 / 22** checks passed)
  - `node tests/phase5-hype.cjs` (**14 / 14** checks passed incl. `Veloce V12 + NOS` `5.78 m` launch, `+Rs 600` stunt bonus, `0` muted oscillators, `0` overlaps at `740×360` & `685×320`)
  - `node tests/graphics-60fps.cjs` (**8 / 8** checks passed: Desktop `960 -> 1600 -> 1920`, Mobile `685 -> 856 -> 1028`, `0` overlaps at `685×320`)
  - `node tests/bug-audit.cjs` (**9 / 9** checks passed)
  - `node tests/render-diagnostics.cjs` (`30 FPS`, `566` draw calls, `173,480` triangles, `11.2 ms` median CPU, `[720, 324]`, `106` samples)

---

## 9. Living Open-World Systems (`PoliceManager`, `TrafficManager`, Breakable Props & Vehicle Damage) Test Gate Results

> Executed on **2026-11-23**:

- **New Modules & Integrations:**
  - [`src/world/PoliceManager.js`](src/world/PoliceManager.js) (`POLICE_POOL_LIMITS = { maxCruisers: 4, maxSwat: 2, maxRoadblocks: 3 }`, `WANTED_TIERS` `0–5`, `computeRubberBandSpeed`, `computePitManeuver`, `PoliceManager` with 3★+ roadblocks & PIT maneuvers, 4★ SWAT + sweeping aerial helicopter searchlight, 5★ city lockdown, and flashing LOS-break cooldown escape timer).
  - [`src/world/TrafficManager.js`](src/world/TrafficManager.js) (`TRAFFIC_VARIANTS`, fixed-size `poolSize` object-pooled AI traffic manager spawning/despawning around player lanes with headway braking, siren curb yield, lockdown density scaling, and zero heap churn).
  - [`src/world/Destructibles.js`](src/world/Destructibles.js) (`PROP_TYPES`, `DestructiblesManager` pre-allocating `48` city props: `20` lampposts with topple physics, `16` breakable barricades, and `12` fire hydrants with `8s` water geyser FX & distance respawn).
  - [`src/world/VehicleDamage.js`](src/world/VehicleDamage.js) (`DAMAGE_STATES`, `FIRE_EJECT_DURATION = 5.0`, `classifyDamageState`, `VehicleDamageController` driving `clean -> white_smoke -> black_smoke -> fire (5s countdown) -> destroyed (eject/fail)` & `repair()`).
  - [`src/world/world-runtime-wiring.js`](src/world/world-runtime-wiring.js) & [`world-bundle.js`](world-bundle.js) (generated deterministically by [`scripts/build-web.cjs`](scripts/build-web.cjs) with pre-allocated `InstancedMesh` traffic, props, geyser/damage FX, baked SWAT trucks, cruisers, and roadblocks — `0` runtime `scene.add()` calls); updated [`game.js`](game.js), [`src/ui/runtime-wiring.js`](src/ui/runtime-wiring.js), [`index.html`](index.html), and [`package.json`](package.json).
- **`npm run build`:** ✅ Passed (`exit code 0`, generated `ui-bundle.js` + `world-bundle.js` and bundled all assets into `www/`).
- **`npm run test:core` (`tests/core-foundation.test.mjs`, `tests/driving-controls.test.mjs`, `tests/ui-hud-minimap.test.mjs`, `tests/world-living.test.mjs`):** ✅ Passed (`exit code 0`, **`18 / 18` tests passed**, `0` failures).
- **`npm run test:world` (`tests/world-living-gate.cjs` on `www/index.html`):** ✅ Passed (`exit code 0`, **`11 / 11` checks passed**, `0` runtime/console errors):
  - **Wanted `0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 0` (Escape) x 2:** Verified cruiser/SWAT/roadblock/helicopter tiers, 5★ city lockdown, broken-LOS cooldown clearing back to `0★`, and pool reuse.
  - **Traffic Pool Soak:** Spawned `75` and despawned `63` vehicles across all 4 districts within fixed `18`-slot `pool` (`11` instanced visible).
  - **Destructibles & Damage:** Verified lamppost topple, barricade launch, hydrant geyser FX, and `clean -> white_smoke -> black_smoke -> fire` with `5s` countdown ejecting player safely onto dry land.
  - **Scene Graph & Memory Invariance:** `scene.children.length` (`367 -> 367 -> 367 -> 367`) and total recursive `totalSceneNodes` (`1786 -> 1786 -> 1786 -> 1786`) stayed strictly constant from baseline; steady-state GPU `geometries`/`textures` remained invariant (`1059/199 -> 1059/199`).
- **UI & Playwright Regressions (`0` runtime/console errors):**
  - `npm run test:ui` (`tests/ui-responsive-gate.cjs`): **68 / 68** checks passed across `360×640`, `844×390`, `1024×768`, `1920×1080`
  - `node tests/gta-overhaul.cjs`: **19 / 19** checks passed
  - `node tests/phase67-hype.cjs`: **15 / 15** checks passed
  - `node tests/flow-polish.cjs`: **19 / 19** checks passed
  - `node tests/pro-qa-audit.cjs`: **22 / 22** checks passed
  - `node tests/phase5-hype.cjs`: **14 / 14** checks passed (`5.48 m` launch, `+Rs 600` stunt bonus for `114 m` flight)
  - `node tests/render-diagnostics.cjs`: `30 FPS`, `571` draw calls, `174,456` triangles, `10.4 ms` median CPU (`12.1 ms` P95) at `[720, 324]` (`101` samples)

---

## 10. Smartphone UI (`4` Apps + `4` Cheats), Garage (`12` Cars / `4` Bikes + Persistence) & 1-Tap Photo Mode Test Gate Results

> Executed on **2026-11-23**:

- **New Modules & Integrations:**
  - [`src/garage/GarageManager.js`](src/garage/GarageManager.js) (`VEHICLE_ROSTER` defining all **12 Cars** `C01–C12` & **4 Bikes** `B01–B04` with exact copyright-safe names, `1 unit = 1 m` scales, top speeds, masses, `PAINT_PRESETS`, `NEON_PRESETS`, `TURBO_UPGRADE_COSTS`, `normalizeVehicleMeshScale()`, `GarageManager` persisting unlocks & Paint Color / Neon Underglow / Turbo Level in `SaveManager`).
  - [`src/ui/Smartphone.js`](src/ui/Smartphone.js) (slide-up Neon OS Smartphone `#neonSmartphone` toggled via `Tab`/`KeyI` or `openPhone`, featuring **4 apps**: Missions, Mechanic/Garage Spawner & Customizer, Music Radio `99.5 Neon FM` / `104.2 Drift Radio` / `88.0 Bay Beats` / `OFF`, and Cheat Code Dialer for `9999`, `7777`, `0000`, `5555`).
  - [`src/ui/PhotoMode.js`](src/ui/PhotoMode.js) (`PHOTO_WATERMARK_TEXT = 'NEON BAY: OVERDRIVE'`, `PhotoMode` transitioning `GameState` to `PHOTO_MODE`, pausing physics simulation, suppressing gameplay HUD via `body.photo-mode-active`, unlocking pointer/wheel/slider free orbital camera + FOV zoom, exporting watermarked PNG snapshots, and restoring `FREE_ROAM` + physics on `KeyO`/`Escape` exit).
  - [`src/ui/features-runtime-wiring.js`](src/ui/features-runtime-wiring.js) & [`features-bundle.js`](features-bundle.js) (generated deterministically by [`scripts/build-web.cjs`](scripts/build-web.cjs) alongside [`ui-bundle.js`](ui-bundle.js) & [`world-bundle.js`](world-bundle.js)); updated [`game.js`](game.js), [`world-phase5.js`](world-phase5.js), [`world3d.js`](world3d.js), [`mobile.js`](mobile.js), [`src/ui/hud.css`](src/ui/hud.css), [`index.html`](index.html), and [`package.json`](package.json).
- **`npm run build`:** ✅ Passed (`exit code 0`, generated `ui-bundle.js`, `world-bundle.js`, `features-bundle.js`, and `www/` assets).
- **`npm run test:core` (`tests/core-foundation.test.mjs`, `tests/driving-controls.test.mjs`, `tests/ui-hud-minimap.test.mjs`, `tests/world-living.test.mjs`, `tests/garage-phone-photo.test.mjs`):** ✅ Passed (`exit code 0`, **`21 / 21` tests passed**, `0` failures).
- **`npm run test:features` (`tests/garage-phone-photo-gate.cjs` on `www/index.html`):** ✅ Passed (`exit code 0`, **`17 / 17` checks passed**, `0` console/page errors):
  - Smartphone `Tab` open/close, Missions app, Music Radio station switch + radio toast, and all 16 vehicles (`12` Cars + `4` Bikes).
  - Live `C02` customization (Paint `#ff007f`, Neon `magenta`, Turbo `Lv 2`) persisted across `page.reload()` in `SaveManager` (`neon_bay_save_v1`).
  - **Cheat Codes:** `9999` Super Jump (`0.97 m -> 6.32 m`), `5555` Moon Gravity (`0.35x`, `195` air frames), `7777` spawns `C11 Vortex Apex Gold` (`gold` neon, Turbo `Lv 3`), `0000` clears active 4-Star wanted chase (`wantedLevel: 4 -> 0`).
  - **Photo Mode:** `KeyO` enters `PHOTO_MODE`, freezes simulation (`player.z` invariant across `update(0.1)`), hides HUD, orbits free camera, exports valid non-blank PNG with `NEON BAY: OVERDRIVE` watermark, and `Escape` exits cleanly back to `FREE_ROAM` with live physics & HUD resumed.
- **Full Regression Matrix (`0` runtime/console errors):**
  - `npm run test:ui` (`tests/ui-responsive-gate.cjs`): **68 / 68** passed across `360×640`, `844×390`, `1024×768`, `1920×1080`
  - `npm run test:world` (`tests/world-living-gate.cjs`): **11 / 11** passed (constant `367/1786` scene nodes, `1057/197 -> 1057/197` steady-state GPU memory)
  - `node tests/flow-polish.cjs`: **19 / 19** passed
  - `node tests/pro-qa-audit.cjs`: **22 / 22** passed
  - `node tests/phase5-hype.cjs`: **14 / 14** passed (`5.68 m` launch, `+Rs 600` stunt bonus for `114 m` flight)
  - `node tests/phase67-hype.cjs`: **15 / 15** passed
  - `node tests/gta-overhaul.cjs`: **19 / 19** passed
  - `node tests/render-diagnostics.cjs`: `27 FPS`, `571` draw calls, `174,456` triangles, `30.3 ms` median CPU at `[720, 324]` (`83` samples)


---

## 11. Story Mission Engine (`MissionManager`) & Act 1–2 (`M1–M10`) Test Gate Results

> Executed on **2026-11-23**:

- **New Modules & Integrations:**
  - [`src/missions/missionsConfig.js`](src/missions/missionsConfig.js) (`PLAYABLE_BOUNDS`, `ACT_1_MISSIONS` `M1–M5`, `ACT_2_MISSIONS` `M6–M10`, `STORY_MISSIONS`, `MISSION_MAP`, `validateMissionSchema()` with exact timers, playable-bound checkpoints, 2-line radio dialogues, vehicle assignments `C01–C07` / `B01` / `B03`, star thresholds, zero `// TODO` stubs, and zero banned copyright names).
  - [`src/missions/MissionManager.js`](src/missions/MissionManager.js) (`MISSION_STATES` `IDLE`/`INTRO`/`ACTIVE`/`COMPLETED`/`FAILED`, `computeStarRating()`, 2-line radio dialogue banner `#missionRadioBanner`, mechanic HUD pill `#missionMechanicHud`, ambush screen flash `#missionAmbushFlash`, Win/Fail summary modal `#missionSummaryModal` with 1–3★ rating, next-mission preview, Retry/Free-Roam/Ad CTAs, silent 3-fail difficulty assist `+10s` / `0.85x` police aggression, and full Act 1 & Act 2 unique mechanics including `M5` Ambush reverse escape, `M6` Hacker red HP bar & vehicle switch, `M9` No-Brakes Palm Strip Beach Sand crash-stop, and `M10` Zero-Scratch `>= 80%` condition meter).
  - [`src/missions/missions-runtime-wiring.js`](src/missions/missions-runtime-wiring.js) & [`missions-bundle.js`](missions-bundle.js) (pre-allocates 3D checkpoint ring, Hacker/Rival target car, and 3 Ambush black SUVs at startup so `scene.children.length` stays constant; integrates live GPS `activeTargets()`, HUD timer & objective strings, and weather/wanted cleanup); updated [`game.js`](game.js) (`_missionDisableBrakes` & Palm Strip beach sand deceleration), [`src/ui/runtime-wiring.js`](src/ui/runtime-wiring.js), [`src/world/world-runtime-wiring.js`](src/world/world-runtime-wiring.js), [`src/ui/features-runtime-wiring.js`](src/ui/features-runtime-wiring.js), [`src/ui/hud.css`](src/ui/hud.css), [`scripts/build-web.cjs`](scripts/build-web.cjs), [`index.html`](index.html), and [`package.json`](package.json).
- **`npm run build`:** ✅ Passed (`exit code 0`, generated `ui-bundle.js`, `world-bundle.js`, `features-bundle.js`, `missions-bundle.js`, and bundled offline assets into `www/`).
- **`npm run test:core` (`tests/core-foundation.test.mjs`, `tests/driving-controls.test.mjs`, `tests/ui-hud-minimap.test.mjs`, `tests/world-living.test.mjs`, `tests/garage-phone-photo.test.mjs`, `tests/missions-engine.test.mjs`):** ✅ Passed (`exit code 0`, **`29 / 29` tests passed** across `7` suites, `0` failures).
- **`npm run test:missions` (`tests/missions-gate.cjs` on `www/index.html`):** ✅ Passed (`exit code 0`, **`11 / 11` checks passed**, `0` console/page errors):
  - Verified all `10` Act 1 & Act 2 missions registered with overlays hidden when idle and rendered inside Smartphone `Missions` app (`M1` through `M10`).
  - Verified **Mission 1** (`start -> fail -> retry -> complete`): 2-line radio banner, Fail Summary Modal, clean `~60s` retry reset (`59.95s` after 1 live frame), Win Summary Modal with 3-Star rating, and persistence in `NeonSave`.
  - Verified **Mission 9** (`NO BRAKES!`): `window._missionDisableBrakes === true` disables `Space`/`ArrowDown` braking in live `game.js` physics (`brakingNow=false`), fail clears `_missionDisableBrakes`, retry re-arms, and Palm Strip Beach Sand (`z <= -392`) decelerates to stop (`1.00 m/s`) & completes cleanly.
  - Verified constant scene node count (`372 === 372`) and clean return to `FREE_ROAM`.
- **Full Regression Verification (`0` runtime/console errors):**
  - `npm run test:ui` (`tests/ui-responsive-gate.cjs`): **68 / 68** passed across `360×640`, `844×390`, `1024×768`, `1920×1080`
  - `npm run test:world` (`tests/world-living-gate.cjs`): **11 / 11** passed (`372/1805` constant scene nodes, `1059/199 -> 1059/199` steady-state GPU memory)
  - `npm run test:features` (`tests/garage-phone-photo-gate.cjs`): **17 / 17** passed
  - `node tests/flow-polish.cjs`: **19 / 19** passed
  - `node tests/pro-qa-audit.cjs`: **22 / 22** passed
  - `node tests/phase5-hype.cjs`: **14 / 14** passed (`5.92 m` ramp launch, `+Rs 600` stunt bonus for `114 m` flight)
  - `node tests/phase67-hype.cjs`: **15 / 15** passed
  - `node tests/gta-overhaul.cjs`: **19 / 19** passed
  - `node tests/render-diagnostics.cjs`: `30 FPS`, `571` draw calls, `174,456` triangles, `16 ms` median CPU (`30.4 ms` P95) at `[720, 324]` (`103` samples)


---

## 12. Acts 3–4 (`M11–M20`), City 2 Unlock Bridge & 4 Extra Retention Layers Test Gate Results

> Executed on **2026-11-23**:

- **New & Extended Modules:**
  - [`src/core/SaveManager.js`](src/core/SaveManager.js): Added sanitized `retention` persistence (`streakSkinUnlocked`, `dailyDate`, `dailyCompletedIds`, `completedChallenges`, `discoveredSecrets`, `hustlesCompleted`) and `recordChallengeComplete`, `recordSecretDiscovered`, `recordHustleComplete`.
  - [`src/missions/missionsConfig.js`](src/missions/missionsConfig.js) & [`src/missions/MissionManager.js`](src/missions/MissionManager.js): Completed **Act 3 (`M11–M15`)** & **Act 4 (`M16–M20`)** with `hasNoNaN` validation and zero `// TODO` stubs:
    - `M11 Barricade Breaker` (`6` barricades smashed at Titan National Bank), `M12 Skyline Ramp Jump` (`180+ km/h` + slow-mo side camera), `M13 Gold Convoy Escape` (`500kg` cargo + `3` pursuer smash takedowns), `M14 Blackout Stealth` (headlights off + `3` sweeping ground searchlights), `M15 THE DOUBLE CROSS` (`B03` vs `C10` Airport runway intercept), `M16 4-Star Lockdown` (`120s` 4-Star survival), `M17 The Bay Switch` (`B01 -> C10` mid-mission swap), `M18 60 KM/H BOMB` (`3s` below `60 km/h` detonation fuse), `M19 Cartel Boss Takedown` (`5`-ram armoured limo destroy), and `M20 Golden Sunrise Finale` (unlocks **`C11 Vortex Apex Gold`** + `city2Unlocked: true` + **Mirage Valley (City 2)** bridge hook).
  - [`src/missions/DailyMissions.js`](src/missions/DailyMissions.js): Deterministic 24h generator (`3` unique daily tasks per ISO date, zero `NaN`) + **7-Day Streak** exclusive `STREAK_GOLD_CHROME` skin unlock.
  - [`src/missions/ChallengeModes.js`](src/missions/ChallengeModes.js): **3 Viral Challenge Modes** (`CH_ROOFTOP_1PCT` 1% Rooftop Ramp, `CH_REVERSE_RACE` strict reverse gear race, `CH_ONE_HP_SURVIVAL` 1-HP zero-scratch 60s survival).
  - [`src/missions/SideHustles.js`](src/missions/SideHustles.js): **3 Hidden Easter Eggs** (`EGG_GHOST_RACER` unlocking `B04`, `EGG_TUNNEL_VAULT`, `EGG_ROOFTOP_STUNT`), plus **VIP Taxi**, **Police Vigilante (`C12`)**, and **30-min VIP Test-Drive**.
  - Updated [`src/missions/missions-runtime-wiring.js`](src/missions/missions-runtime-wiring.js) (`NeonDailyMissions`, `NeonChallenges`, `NeonSideHustles`, `NeonCity2Bridge`, pre-allocated `searchlightGroup`), [`src/ui/features-runtime-wiring.js`](src/ui/features-runtime-wiring.js), [`scripts/build-web.cjs`](scripts/build-web.cjs), and [`package.json`](package.json).
- **`npm run build`:** ✅ Passed (`exit code 0`, generated `ui-bundle.js`, `world-bundle.js`, `features-bundle.js`, `missions-bundle.js`, and offline `www/` assets).
- **`npm run test:core` (`tests/campaign-complete.test.mjs` + all 6 earlier unit suites):** ✅ Passed (`exit code 0`, **`37 / 37` tests passed** across `10` suites, `0` failures; verified all 20 IDs `M1–M20`, `0` NaN values, `0` TODOs, `0` banned brand names, M11–M20 mechanics, `M20` `C11` + `city2Unlocked` cold reload persistence, Daily generator + 7-day skin unlock, 3 Challenges, 3 Easter Eggs, VIP Taxi, Police Vigilante `C12`, VIP Test-Drive).
- **`npm run test:missions` (`tests/missions-gate.cjs` on `www/index.html`):** ✅ Passed (`exit code 0`, **`14 / 14` checks passed**, `0` console/page errors):
  - Verified all `20` story missions, Daily (`3`), Challenges (`3`), and `NeonCity2Bridge` live; Smartphone renders `M1–M20`, Daily & Challenge cards.
  - Verified live **M1**, **M9 No-Brakes**, **M17 Mid-Mission Vehicle Switch (`bike` -> `supercar`)**, and **M20 Golden Sunrise Finale** unlocking `C11` + `Mirage Valley` across full `page.reload()`, with strictly constant `scene.children.length` (`373 === 373`).
- **Full Regression Verification (`0` runtime/console errors):**
  - `npm run test:ui` (`tests/ui-responsive-gate.cjs`): **68 / 68** passed across `360×640`, `844×390`, `1024×768`, `1920×1080`
  - `npm run test:world` (`tests/world-living-gate.cjs`): **11 / 11** passed (`373/1809` constant scene nodes, `1057/197 -> 1057/197` steady-state GPU memory)
  - `npm run test:features` (`tests/garage-phone-photo-gate.cjs`, standalone run): **17 / 17** passed
  - `node tests/flow-polish.cjs`: **19 / 19** passed
  - `node tests/pro-qa-audit.cjs`: **22 / 22** passed
  - `node tests/phase5-hype.cjs`: **14 / 14** passed (`5.39 m` launch, `+Rs 600` stunt bonus for `115 m` flight)
  - `node tests/phase67-hype.cjs`: **15 / 15** passed
  - `node tests/gta-overhaul.cjs`: **19 / 19** passed
  - `node tests/render-diagnostics.cjs`: `29 FPS`, `571` draw calls, `174,456` triangles, `28 ms` median CPU (`40.7 ms` P95) at `[720, 324]` (`92` samples)


---

## 13. Adaptive Web Audio (`AudioManager.js`), Half-Res Bloom, `.dispose()` & Bundle Audit Test Gate Results

> Executed on **2026-11-23**:

- **New Modules & Integrations:**
  - [`src/audio/AudioManager.js`](src/audio/AudioManager.js) (`NEON_RADIO_STATIONS` `OFF` / `99.5 Neon FM` / `104.2 Drift Radio` / `88.0 Bay Beats`, `computeEngineRpmPitch()` gear 1–5 + Nitro curve, continuous engine/sub oscillators + lowpass filter, tire drift screech noise band, velocity-scaled `playCrash()`, distance-attenuated police sirens, `visibilitychange` + `blur`/`focus` auto-mute & `ctx.suspend()` / `ctx.resume()`, zero oscillators when muted).
  - [`src/core/PerformanceManager.js`](src/core/PerformanceManager.js) (`QUALITY_PRESETS` `low`/`medium`/`high`, zero-dependency shader-based `HalfResBloomPass` at `Math.floor(width/2) × Math.floor(height/2)` on Medium/High and disposed on Low, `disposeObject3D()` + `VehicleResourceManager` protecting shared assets, `InstancedPropBatcher`, `LazyChunkLoader`, `estimateGpuVramMB()`).
  - [`src/core/audio-perf-runtime-wiring.js`](src/core/audio-perf-runtime-wiring.js), [`audio-perf-bundle.js`](audio-perf-bundle.js), & [`chunks/neon-lazy-pack.js`](chunks/neon-lazy-pack.js) (pre-allocated `NeonCoastBollards` `64` + `NeonBoulevardPylons` `32` `InstancedMesh` props in 2 draw calls; Smartphone `LOW / MEDIUM / HIGH` toggle in [`src/ui/Smartphone.js`](src/ui/Smartphone.js); [`world3d.js`](world3d.js) `'medium'` quality support & `HalfResBloomPass.render()`; [`scripts/build-web.cjs`](scripts/build-web.cjs) generating [`www/bundle-audit.json`](www/bundle-audit.json) enforcing `< 15 MB`).
- **Production Bundle Audit ([`www/bundle-audit.json`](www/bundle-audit.json)):**
  - **`npm run build`:** ✅ Passed (`exit code 0`, `64` files, **`1.396 MB` initial boot**, **`1.817 MB` total bundle** — well within `< 15 MB` budget, `chunks/neon-lazy-pack.js` `457 B` loaded lazily on demand).
- **`npm run test:core` (`tests/audio-performance.test.mjs` + all 7 earlier unit suites):** ✅ Passed (`exit code 0`, **`42 / 42` tests passed** across `12` suites, `0` failures).
- **`npm run test:perf` (`tests/audio-perf-gate.cjs` on `www/index.html`):** ✅ Passed (`exit code 0`, **`7 / 7` checks passed**, `0` console/WebGL/page errors):
  - **Audio:** `99.5 Neon FM`, `104.2 Drift Radio`, `88.0 Bay Beats`, RPM scaling (`322.69 Hz`), and `visibilitychange` (`hidden=true` -> `ctx.state='suspended'`, `playCrash()=false`; `hidden=false` -> `ctx.state='running'`).
  - **Quality & Half-Res Bloom:** Live transitions **`Low -> Medium -> High -> Low -> High`** with **`gl.getError() === 0`** on every frame (`640×360` exact half-res targets on `1280×720`, disposed on `Low`, persisted across `page.reload()` in `SaveManager`).
  - **`.dispose()` & VRAM:** 10 live vehicle mesh swaps cleaned all owned geometries/materials/textures back to exact baseline (`610/97 -> 610/97`), estimated VRAM **`42.14 MB` (`< 150 MB`)**.
  - **Instancing & Lazy Loading:** `2` Neon prop batches (`96` instances) + `22` total `scene` `InstancedMesh`es active; `neon-lazy-pack` loaded cleanly on demand.
- **Full Regression Verification (`0` console/page errors):**
  - `node tests/graphics-60fps.cjs`: **8 / 8** passed (`LOW 960 -> HIGH 1600 -> ULTRA 1920`, Mobile `685 -> 856 -> 1028`, `0` HUD overlaps)
  - `npm run test:missions`: **14 / 14** passed (`375 === 375` scene nodes)
  - `npm run test:ui`: **68 / 68** passed across `360×640`, `844×390`, `1024×768`, `1920×1080`
  - `npm run test:world`: **11 / 11** passed (`375/1811` constant scene nodes, `1058/196 -> 1058/196` steady-state GPU memory)
  - `npm run test:features`: **17 / 17** passed
  - `node tests/flow-polish.cjs` (**19/19**), `node tests/pro-qa-audit.cjs` (**22/22**), `node tests/phase5-hype.cjs` (**14/14**, `6.21 m` launch), `node tests/phase67-hype.cjs` (**15/15**), `node tests/gta-overhaul.cjs` (**19/19**), `node tests/render-diagnostics.cjs` (`30 FPS`, `573` draw calls, `176,888` triangles, `10.9 ms` median CPU at `[720, 324]`).


---

## 14. Monetization (`AdManager.js`), 6-Locale i18n, ShareCard, Obfuscated `/dist` & Ship QA Results

> Executed on **2026-11-23**:

- **New Modules & Ship Pipeline:**
  - [`src/monetization/AdManager.js`](src/monetization/AdManager.js) (`PORTAL_PLATFORMS` CrazyGames/Poki/Capacitor/Standalone, `gameplayStart`/`gameplayStop`/`happytime`, `hideExternalLinksInIframe`, mandatory `pause -> mute -> reward -> resume` lifecycle, `REWARDED_PLACEMENTS` `double_cash` / `retry_bonus_time` / `vip_test_drive` / `unlock_neon`, strict every-2-missions interstitials, `purchaseProduct` IAPs `remove_ads` / `unlock_all_vehicles`).
  - [`src/i18n/i18n.js`](src/i18n/i18n.js) (`SUPPORTED_LOCALES` `en`, `es`, `pt`, `fr`, `de`, `ar` w/ Urdu/Arabic RTL `dir='rtl'`, `validateI18nCatalog()`, `SaveManager` persistence).
  - [`src/ui/ShareCard.js`](src/ui/ShareCard.js) (`1200×630` Miami Neon PNG Viral Score Card generator & share/download workflow).
  - [`src/monetization/release-runtime-wiring.js`](src/monetization/release-runtime-wiring.js), [`release-bundle.js`](release-bundle.js), [`capacitor.config.json`](capacitor.config.json) (`appName: "Neon Bay: Overdrive"`, Android & iOS settings + plugins), & [`scripts/obfuscate-dist.cjs`](scripts/obfuscate-dist.cjs) (tokenizer-safe JS compaction/obfuscation + configurable hex Domain-Lock + `vm.Script` verification).
- **Build, Audits & Capacitor Sync:**
  - **`npm run build`:** ✅ Passed (`exit code 0`): `www/` `69` files (`1.428 MB` boot / `1.88 MB` total `< 15 MB`), `35` relative & exact-case paths (`0` violations in [`www/path-audit.json`](www/path-audit.json)), and obfuscated `dist/` `41` files (`31` obfuscated JS, `1.386 MB`, `syntaxVerified=true` in [`dist/dist-audit.json`](dist/dist-audit.json)).
  - **`npx cap sync android`:** ✅ Passed (`0.222s`, synced `www/` -> `android/app/src/main/assets/public`).
- **Complete Final Verification Suite (100% Pass, `0` Errors):**
  - `npm run test:core`: **46 / 46** passed across `14` suites (`0` failures)
  - `npm run test:release`: **6 / 6** passed (`www/` & obfuscated `dist/` boot w/ `0` errors, `AdManager` cycle, `6` locales + `ar` RTL reload, `1200×630` PNG Score Card)
  - `npm run test:perf`: **7 / 7** passed (`42.14 MB` VRAM `< 150 MB`, `640×360` Half-Res Bloom, `0` WebGL errors)
  - `npm run test:missions`: **14 / 14** passed (`M1–M20`, constant `375 === 375` scene nodes)
  - `npm run test:ui`: **68 / 68** passed across `360×640`, `844×390`, `1024×768`, `1920×1080`
  - `npm run test:world`: **11 / 11** passed (`375/1811` constant scene nodes, `1059/197 -> 1059/197` GPU memory)
  - `npm run test:features`: **17 / 17** passed
  - `node tests/graphics-60fps.cjs` (**8/8**), `node tests/flow-polish.cjs` (**19/19**), `node tests/pro-qa-audit.cjs` (**22/22**), `node tests/phase5-hype.cjs` (**14/14**), `node tests/phase67-hype.cjs` (**15/15**), `node tests/gta-overhaul.cjs` (**19/19**), `node tests/render-diagnostics.cjs` (`30 FPS`, `573` draw calls, `176,888` triangles, `12.2 ms` median CPU).
- **Final Sign-Off Report:** See [`QA_REPORT.md`](QA_REPORT.md).

---

## 15. Stage 1 & Stage 2 Full Cutover, Legacy Deletion & Clean V1.0 Bundle Verification

> Executed on **2026-11-23**:

- **Stage 1 — Complete V1.0 Audit & Unified Render-Loop Cutover:**
  - Verified all 10 engineering prompts wired into the active Three.js render/update loop via [`src/main.js`](src/main.js) -> [`neon-app-bundle.js`](neon-app-bundle.js).
  - Kept only the original 3D city environment ([`city-layout.js`](city-layout.js), [`world3d.js`](world3d.js), [`polish.js`](polish.js), [`city.js`](city.js)), core driving physics ([`game.js`](game.js)), and 3D vehicle models ([`models.js`](models.js), [`vehicle-models.js`](vehicle-models.js) mapped to [`src/garage/GarageManager.js`](src/garage/GarageManager.js)).
  - Added [`src/world/EnvironmentFX.js`](src/world/EnvironmentFX.js) (24h clock, rain particles, 4 stunt ramps) and [`src/ui/TouchControls.js`](src/ui/TouchControls.js) (multi-touch steering/pedals/action buttons >= `48×48px`).
- **Stage 2 — Permanent Legacy Deletion & Clean Bundle (`npm run build` + `npx cap sync android`):**
  - Permanently deleted all legacy mission files, old UI/HUD overlays, old menu screens, orphan CSS/HTML, old intermediate bundles, and legacy test/backup scripts.
  - **`npm run build`:** `www/` contains `13` files (`1.253 MB` initial boot / `1.254 MB` total `< 15 MB`, `10/10` relative exact-case paths); `dist/` contains `16` files (`9` obfuscated & domain-locked JS files, `1.175 MB`, `0` legacy mission strings, `0` unused chunks, `syntaxVerified=true`).
  - **`npx cap sync android`:** Synced clean `www/` into `android/app/src/main/assets/public` in `0.155s`.
- **Final Automated Verification Gates (`0` Console/Page/WebGL Errors):**
  - `npm run test:core`: **46 / 46** unit tests passed (`14` suites, `0` failures)
  - `npm run test:cutover` ([`tests/cutover-final-gate.cjs`](tests/cutover-final-gate.cjs)): **12 / 12** checks passed across both `www/index.html` and `dist/index.html`
  - `npm run test:release` ([`tests/release-gate.cjs`](tests/release-gate.cjs)): **6 / 6** checks passed
  - `npm run test:perf` ([`tests/audio-perf-gate.cjs`](tests/audio-perf-gate.cjs)): **7 / 7** checks passed (`35.6 MB` VRAM `< 150 MB`, `418/86 -> 418/86` `.dispose()`)
  - `npm run test:missions` ([`tests/missions-gate.cjs`](tests/missions-gate.cjs)): **14 / 14** checks passed (`254 === 254` constant scene nodes)
  - `npm run test:ui` ([`tests/ui-responsive-gate.cjs`](tests/ui-responsive-gate.cjs)): **68 / 68** checks passed (`360×640`, `844×390`, `1024×768`, `1920×1080`)
  - `npm run test:world` ([`tests/world-living-gate.cjs`](tests/world-living-gate.cjs)): **11 / 11** checks passed (`254/1150` constant scene nodes, `767/183 -> 767/183` GPU memory)
  - `npm run test:features` ([`tests/garage-phone-photo-gate.cjs`](tests/garage-phone-photo-gate.cjs)): **17 / 17** checks passed
- **Live Browser QA Polish & Android APK Build (`2026-11-23`):**
  - Verified live in browser (`http://127.0.0.1:8787/index.html` & `http://127.0.0.1:8787/dist/index.html`) with `0` console errors:
    1. Saved `selectedVehicle` (`C11`) syncs 3D vehicle mesh on boot and parks previous vehicle (`C01`) at curbside bay (`x = ±6.1`).
    2. `isIndoorPoint(x, z, r)` in [`game.js`](game.js) blocks vehicles (`r > 0.5`) at open storefront thresholds while allowing on-foot entry (`r = 0.45`).
    3. Hard `4.35m` (`4.8m` SWAT) post-move bumper separation clamp for traffic & police cruisers plus `2.8m` pedestrian push-out.
    4. Curbside parked vehicles (`x = ±6.1`) and storefront neon sign `z = 0.42` alignment eliminate curb wheel sink and AC box z-fighting.
    5. Smartphone Cheats keypad updates `#phoneCheatDisplay` in-place on digit clicks.
  - **Android APK Built ([`BUILD-APK.ps1`](BUILD-APK.ps1)):** [`releases/Neon-Bay-Overdrive-v1.0.apk`](releases/Neon-Bay-Overdrive-v1.0.apk) (`4.55 MB`, SHA-256: `DB07245AA773851E07B4770D2A4B0253C640D41CB856898EB39883A0598401AC`).
