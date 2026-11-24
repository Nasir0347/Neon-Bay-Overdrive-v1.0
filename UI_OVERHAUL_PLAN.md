# NEON BAY: OVERDRIVE — Master 4-Phase AAA UI & Menu Overhaul Plan

**Started:** 2026-11-24  
**Research Benchmarks:** *GTA: Definitive Edition Mobile*, *GTA V / VI HUD & Pause Hub*, *CarX Street Mobile*, *Gangstar Vegas*, *Asphalt Legends Unite*  
**Architecture Goal:** 100% circular ergonomic thumb-arc controls on Mobile & Tablet, CarX-grade circular gauges, console-grade tabbed Pause Hub, forget-proof live mission guidance, smooth GPU transitions (60 FPS safe on `LOW`), full 6-locale support, and zero HUD overlaps across Mobile Portrait/Landscape, Tablet Touch, and Desktop.

---

## Research Pillars Applied
1. **100% Gol (Circular) Thumb-Arc Controls:** Circular frosted-glass orbs (`border-radius: 50%`) along natural thumb arcs feel native, prevent "fat-finger" edge clips, and keep maximum open road visibility.
2. **Dynamic Context Morphing:** Vehicle controls cleanly morph when stepping on foot (`EXIT` -> `ENTER`/`CALL`, `BRAKE`/`DRIFT` -> `JUMP`, `NOS` -> `RUN`, 360° driving/walking joystick).
3. **Circular SVG Telemetry & Radar:** Dual-arc circular speedometer + nitro ring and circular radar minimap replace boxy boxes.
4. **Operational Console Pause Hub + Neon OS Smartphone:** Full tabbed navigation (`RESUME · MAP · MISSIONS · GARAGE · CONTROLS & HELP · SETTINGS`) instead of small legacy boxes.
5. **Forget-Proof Live Mission & Controls Help:** Always-accessible clickable Objective Bar + `? Help` sheet telling the player *exactly what step they are on* and *which buttons to press*.

---

## Phase Roadmap & Progress Tracker

### [x] Phase 1 — 100% Circular Mobile Controls, Circular Radar & Circular SVG Speedometer
- **Circular Mobile/Tablet Action Orbs (`src/ui/hud.css`, `src/ui/TouchControls.js`):**
  - Convert all mobile/tablet buttons (`GAS`, `BRAKE`, `DRIFT`, `NOS`, `STEER LEFT/RIGHT`, `EXIT/ENTER/CALL CAR`, `PHONE`, `TOOLS`, `PAUSE`, and all `12` shortcut orbs inside `TOOLS`) into `border-radius: 50%` glossy frosted glass orbs with specular rim lighting and spring active scale feedback.
  - Arrange right-thumb action pedals along a natural thumb arc (`>= 48×48px` even on short landscape viewports).
  - Add a live circular **NOS Charge Perimeter Ring** around the circular `NOS` orb.
  - Arrange the `12` PC-parity shortcuts in a centered 3×4 **Circular Orb Command Dock** (`FLIP`, `CAM`, `HORN`, `LIGHTS`, `RADIO`, `MAP`, `PHOTO`, `GFX`, `GARAGE`, `MISSIONS`, `SOUND`, `STICK/BTNS`), elevated cleanly (`z-index: 48` via `.drawer-open`) above active mission banners & radio dialogues.
- **Rounded-Square GPS Radar Minimap (`src/ui/hud.css`):**
  - Updated `#mapWrap` on Mobile & Tablet per user feedback from circular back to a crisp rounded-square (`border-radius: 12px`, canvas `8px`) with bottom-left `MAP` pill so district corners stay 100% visible (`76px` phone, `114px` tablet, `62px` short landscape).
- **Circular SVG Speedometer & Nitro Gauge (`index.html`, `src/ui/runtime-wiring.js`, `src/ui/hud.css`):**
  - Build radial 250° gradient SVG speed arc (`0–280+ km/h` cyan -> magenta -> gold redline), inner circular Nitro arc, live gear pill (`G1–G5` / `FOOT`), and `tabular-nums` center readout.
- **Phase 1 Exit Criteria (VERIFIED COMPLETE):**
  - `npm run build`: `www/` (`13` files, `1.425 MB < 15 MB`, `10/10` paths OK) & `dist/` (`9` obfuscated JS, `1.329 MB`, `0` legacy strings, `syntaxVerified=true`).
  - `npm run test:core`: **`47 / 47`** (`14` suites, `0` fails).
  - `node tests/overhaul-master-gate.cjs`: **`48 / 48`** (`www/` + `dist/`, Mobile Portrait `85.14%` open, Mobile Landscape `89.6%` open, Tablet Touch `93.17%` open, `0` overlaps, `0` errors).
  - `node tests/ui-responsive-gate.cjs`: **`68 / 68`** (`0` overlaps, `0` off-screen elements, `>= 48×48px` pedals across all 5 viewports, `tabular-nums`, `gfx-low` blur suppression).
  - 5/5 Multi-Device Screenshots visually verified clean (`Mobile Portrait`, `Mobile Portrait + 12-Orb Tools Dock`, `Mobile Landscape`, `Tablet Touch`, `Desktop`).

### [x] Phase 2 — Cinematic Title Showcase & Console-Grade Tabbed Pause Hub
- **Cinematic Title / Boot Showcase (`index.html`, `src/ui/hud.css`, `src/ui/runtime-wiring.js`):**
  - Upgraded `#bootPlayOverlay` over the orbiting Rico Vega car showcase with glowing gradient accent bar, pulsing live indicator dot, live campaign progress badge (`#bootProgressPill`), `PLAY FREE ROAM` + dynamic `START M[X]` CTAs, and **4 circular quick action orbs** (`#bootGarageOrb`, `#bootMissionsOrb`, `#bootSoundOrb`, `#bootHelpOrb`).
- **Console-Grade 6-Tab Pause Hub (`index.html`, `src/ui/runtime-wiring.js`, `src/ui/hud.css`, `src/i18n/i18n.js`):**
  - Transformed `#pauseOverlay` into an operational multi-tab glass hub (`RESUME`, `MAP`, `MISSIONS`, `GARAGE`, `CONTROLS & HELP`, `SETTINGS`) with live header stat chips (`Cash`, `X/20 · ★`, `Active Vehicle`, `Current District`), circular close orb (`#pauseCloseOrb`), 1-tap mission launcher, owned garage stat bars & quick spawn, complete Mobile/PC/Mission Help cards, `STEER/SOUND/GFX` toggles, 4 Radio stations, and 6-Locale live switcher (with RTL Arabic/Urdu support).
  - Localized all 15 new Phase 2 keys cleanly across all 6 locales (`en`, `es`, `pt`, `fr`, `de`, `ar`) with `gfx-low` blur suppression intact.
- **Phase 2 Exit Criteria (VERIFIED COMPLETE):**
  - `npm run build`: `www/` (`13` files, `1.468 MB < 15 MB`, `paths=10 OK`) & `dist/` (`9` obfuscated JS, `1.369 MB`, `0` legacy strings, `syntaxVerified=true`).
  - `npm run test:core`: **`47 / 47`** (`14` suites, `0` fails — includes full 6-locale catalog validation & zero banned-terms audit).
  - `node tests/overhaul-master-gate.cjs`: **`48 / 48` PASS** (`www/` + `dist/`, `0` overlaps, `0` errors).
  - `node tests/ui-responsive-gate.cjs`: **`68 / 68` PASS** (`0` overlaps, `0` off-screen elements, `>= 48×48px` pedals across 5 viewports).
  - `node tests/cutover-final-gate.cjs`: **`12 / 12` PASS** (`16` dist files, `0` unused chunks, `0` legacy strings).
  - Interactive Phase 2 Verification & Visual QA (`capture_p2.cjs`): **`21 / 21` PASS** + `8 / 8` screenshots visually verified clean (`p2_map_fixed_mobile_portrait`, `p2_boot_mobile_portrait`, `p2_boot_mobile_landscape`, `p2_boot_desktop`, `p2_pause_resume_desktop`, `p2_pause_missions_mobile`, `p2_pause_help_tablet`, `p2_pause_settings_mobile`).

### [x] Phase 3 — Next-Gen Neon OS Smartphone, Forget-Proof Live Help & Celebration Modals
- **Next-Gen Neon OS Smartphone (`src/ui/Smartphone.js`, `src/ui/hud.css`):**
  - Added live OS status bar (`#phoneSysClock`, `#phoneSysDistrict` `5G`, `#phoneSysCash`, `98%` battery), **4 glossy circular SVG app orbs** on Home screen (`Missions`, `Mechanic`, `Music Radio`, `Cheats`), circular 3-orb quick utility dock (`Map`, `Photo Mode`, `Help Guide`), live Garage stat bars (`SPEED / ACCEL / HANDLING`), glossy circular paint swatches, and color-ringed NEON pills.
- **Forget-Proof Live Mission & Controls Help (`src/missions/MissionManager.js`, `src/ui/runtime-wiring.js`, `index.html`, `src/i18n/i18n.js`):**
  - Added clickable `#objectiveBanner` + circular `?` guide button (`#objectiveHelpPill`) and `[H]` keyboard hotkey launching `#missionHelpDrawer` (which safely pauses simulation countdown while reading and resumes on close).
  - Implemented `getLiveHelpGuide()` tracking step-by-step completion checkboxes (`✓` done / `→` active / `1–3` upcoming), target distance, mission story hook, and device-aware contextual button hints (Walk-In EXIT/`[E]`, Rain Drift, No-Brakes Beach Sand, Mega-Ramp 180+ km/h, Ambush Reverse, Blackout Stealth, Speed Bomb, Lockdown), plus 10 localized keys across all 6 locales.
- **Dramatic "MISSION PASSED / FAILED" Celebration Modals (`src/missions/MissionManager.js`, `src/ui/hud.css`):**
  - Upgraded `#missionSummaryModal` with animated gradient ribbon, staggered pop-in golden star orbs (`★`), 3-tile KPI grid (`REWARD`, `TIME LEFT`, `STARS`), golden unlock banner (`C11 Vortex Apex Gold + Mirage Valley Bridge`), next contract teaser, and actionable failure recovery tips.
- **Phase 3 Exit Criteria (VERIFIED COMPLETE):**
  - `npm run build`: `www/` (`13` files, `1.506 MB < 15 MB`, `paths=10 OK`) & `dist/` (`9` obfuscated JS, `1.405 MB`, `0` legacy strings, `syntaxVerified=true`).
  - `npm run test:core`: **`47 / 47` PASS** (`14` suites, `0` fails).
  - `node tests/missions-gate.cjs`: **`14 / 14` PASS** (`0` errors, scene node count constant `263 === 263`).
  - `node tests/garage-phone-photo-gate.cjs`: **`17 / 17` PASS** (`0` errors).
  - `node tests/overhaul-master-gate.cjs`: **`48 / 48` PASS** (`www/` + `dist/`, `0` overlaps, `0` errors).
  - `node tests/ui-responsive-gate.cjs`: **`68 / 68` PASS** (`0` overlaps across 5 viewports).
  - `node tests/release-gate.cjs`: **`6 / 6` PASS** (`www/` + obfuscated `dist/`, 6-locale RTL + ScoreCard).
  - Interactive Phase 3 Verification & Visual QA (`capture_p3.cjs`): **`12 / 12` PASS** + `7 / 7` screenshots visually verified clean (`p3_phone_home_mobile`, `p3_phone_garage_mobile`, `p3_help_active_mission_mobile`, `p3_help_onfoot_desktop`, `p3_mission_passed_desktop`, `p3_mission_passed_mobile`, `p3_mission_failed_mobile`).

### [x] Phase 4 — Final Cross-Device Polish, Full Test Suite, Web Production Build & Android APK (VERIFIED COMPLETE)
- **Final Micro-Polish & Cleanups (`src/ui/hud.css`, `src/missions/MissionManager.js`):**
  - Replaced legacy comment on `hud.css:2352` -> `0` banned strings across `index.html`, `src/**/*.js`, and `src/ui/hud.css`.
  - Updated `getLiveHelpGuide()` so walk-in doorway targets (`requiresOnFoot`) highlight the exact matching `"Exit car / Walk inside"` checklist step cleanly.
- **All 9 Verification Suites & Final Multi-Device/RTL/Preset Visual QA Passed 100%:**
  - `npm run build`: `www/` (`13` files, **`1.505 MB` boot / `1.506 MB` total `< 15 MB`**, `10/10` relative exact-case paths OK) & `dist/` (`15` files, **`1.405 MB`**, `9` obfuscated JS, `0` legacy strings, `syntaxVerified=true`).
  - `npm run test:core`: **`47 / 47` PASS** (`14` suites, `0` fails).
  - `node tests/overhaul-master-gate.cjs`: **`48 / 48` PASS** (`www/` + `dist/`, `0` errors).
  - `node tests/ui-responsive-gate.cjs`: **`68 / 68` PASS** (`0` overlaps, `0` off-screen elements across `360×640`, `844×390`, `1024×768`, `1920×1080`).
  - `node tests/cutover-final-gate.cjs`: **`12 / 12` PASS** (`16` dist items verified, `0` unused chunks, `0` legacy strings).
  - `node tests/world-living-gate.cjs`: **`11 / 11` PASS** (`263/1179` constant scene nodes, `741/116` GPU invariance, `0` errors).
  - `node tests/missions-gate.cjs`: **`14 / 14` PASS** (`263 === 263` scene nodes, `0` errors).
  - `node tests/garage-phone-photo-gate.cjs`: **`17 / 17` PASS** (`0` errors).
  - `node tests/audio-perf-gate.cjs`: **`7 / 7` PASS** (`24.95 MB` VRAM `< 150 MB`, Half-Res Bloom `640×360`, `.dispose()` `386/50 -> 386/50`, `47` `InstancedMesh`es).
  - `node tests/release-gate.cjs`: **`6 / 6` PASS** (`www/` + obfuscated `dist/`, 6-locale RTL + ScoreCard).
  - `capture_p4.cjs`: **`5 / 5` PASS** + `3 / 3` screenshots verified clean (`p4_rtl_pause_mobile`, `p4_rtl_help_mobile`, `p4_high_gfx_desktop`).
- **Final Release Artifacts & Docs Sync:**
  - Android APK built cleanly via `BUILD-APK.ps1`: [`releases/Neon-Bay-Overdrive-v1.0.apk`](releases/Neon-Bay-Overdrive-v1.0.apk) (`4.55+ MB`).
  - Web Production Bundles ready in `www/` (`1.533 MB`) & obfuscated `dist/` (`1.430 MB`).
  - Synced [QA_REPORT.md](QA_REPORT.md) and [PROGRESS.md](PROGRESS.md) — **4-Phase Overhaul 100% Complete!**

### [x] Post-Phase 4 — 3-Tier AAA Glass Transparency, Car Exit Door-Side Fix & AAA Realistic Vehicle Fleet Upgrade
- **3-Tier AAA Glass Transparency + HUD Opacity Toggle (`src/core/SaveManager.js`, `src/ui/hud.css`, `src/ui/runtime-wiring.js`, `src/ui/Smartphone.js`, `src/i18n/i18n.js`):**
  - Implemented `CLEAR` / `GLASS` (default) / `SOLID` HUD opacity presets persisted in `SaveManager` (`hudOpacity`), toggleable live from both the Pause Hub Settings and Neon OS Smartphone Home screen, with `gfx-low` blur-off protection and crisp `#wantedStars` lit/unlit contrast.
- **Car Exit Door-Side Spawn Fix (`game.js`):**
  - Fixed `exitCandidates` priority in `interactVehicle()` from `[-2.4, 2.4, ...]` to `[2.4, -2.4, ...]` so Rico Vega always exits on the exact local `+X` side where the animated car door opens (`localX = +2.4`, `doorX = +0.915`, `sameSide = true` verified via Playwright).
- **Pro-Level AAA Realistic Vehicle Fleet Upgrade (`models.js`, `vehicle-models.js`, `world3d.js`, `src/world/world-runtime-wiring.js`):**
  - Upgraded **all player cars (12 Cars + 4 Bikes), all NBPD Police Interceptors, both SWAT Armoured Trucks, and all 24 pooled Road Traffic cars** to `MeshPhysicalMaterial` automotive clearcoat PBR (`clearcoat: 1.0`, `clearcoatRoughness: 0.06`, `envMapIntensity: 1.65`) and deep glossy reflective tinted glass.
  - Added grounded soft radial AO contact shadows (`addCarContactShadow`), pro sculpted wheels with ventilated metallic brake discs + painted calipers (`buildProWheel`), LED DRL eyebrows, full-width rear LED lightbars, carbon splitters/diffusers/GT wings, quad exhausts, Police Interceptor front push-bars & aero LED lightbars, sculpted beveled Executive SUV silhouette, tactical SWAT armor & turret hatch, and beveled clearcoat road traffic silhouettes (0 extra traffic draw calls, constant GPU memory `484/50 -> 484/50`, `26.71 MB` VRAM `< 150 MB`).
- **Verification Summary (ALL 10 SUITES PASS — 0 ERRORS):**
  - `npm run build` (`www/` `1.533 MB`, `dist/` `1.430 MB`), `npm run test:core` (**`49 / 49`**), `overhaul-master-gate` (**`48 / 48`**), `ui-responsive-gate` (**`68 / 68`**), `cutover-final-gate` (**`12 / 12`**), `world-living-gate` (**`11 / 11`**), `missions-gate` (**`14 / 14`**), `garage-phone-photo-gate` (**`17 / 17`**), `audio-perf-gate` (**`7 / 7`**), `release-gate` (**`6 / 6`**), plus live Car Exit + AAA Vehicles visual QA (`qa_car_exit_door_side.png`, `qa_aaa_vehicles_showcase.png`).
