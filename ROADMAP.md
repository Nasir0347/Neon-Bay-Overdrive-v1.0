# NASIR: BAZAAR CITY — Open-World Expansion Roadmap

Master tracker for completed releases and the 4-phase GTA Open-World expansion. Every phase is implemented cleanly, tested across desktop & touch Viewports (`30 FPS` target on Intel HD 520 / Samsung A52), visually inspected, and packaged as an in-place APK update.

---

## Completed Baseline (`v0.6.0` – `v0.7.1`)

- [x] **v0.6.0 — Chapter 3: The Missing Hour (`versionCode 9`):** Missions 11–15, physical prop handoffs, Hotel/Room 307/Depot/Park/Archive, owned-item shops, Phone (`P`) & 6 city jobs, multi-bus Bazaar FM Web Audio, and 21 test suites.
- [x] **v0.6.1 — Controls & HUD Polish (`versionCode 10`):** `WASD` + drag-to-look, car-boot interaction priority, wall-slide damping, forgiving braking/exits/parking, road-aware `recoverVehicle()`, mobile `PHONE` button, 0 HUD overlaps, and 22 test suites.
- [x] **v0.7.0 — Bazaar City: GTA Overhaul (`versionCode 11`):** Night-lit glowing windows, PBR tiled asphalt & 4-way crosswalks, dynamic sun/moon/stars sky shader, 6 driveable hero vehicles, handbrake drift + pooled smoke/skid marks, 14 traffic vehicles, 36 pedestrians, 1★–5★ Wanted system + 2nd police interceptor, Pay 'n' Spray, multi-layer synth audio, and 23 test suites.
- [x] **v0.7.1 — Deep QA Bug-Fix & Visual Polish (`versionCode 12`):** Zero pedestrian/traffic wall/crate collisions, outer-boulevard traffic yielding & recentering, all 6 vehicle save/load persistence, exact 3D route arrow & diagonal skid-mark alignment (`dot = 1.000`), symmetric sedan headlights/brake lights, soft feathered conical headlight beams & night streetlamp glow pools, sculpted windows & open pickup bed, dark engine damage smoke, mobile `LIGHTS` / `SIREN` button, and **24/24** verified suites.

---

## Phase 1 (`v0.8.0`) — Realistic Driving, Supercars & Heavy Bike, Carjacking, 3 Modes & Modern UI ✅

- [x] **Master Roadmap Tracking:** `ROADMAP.md` created and maintained per release.
- [x] **3 Difficulty Modes (`campaign.js`, `game.js`, `action.js`, `app-ui.js`):**
  - `EASY` (`relaxed`): no timers, no damage.
  - `NORMAL` (`normal`): `120s` timers, standard chase & combat.
  - `HARD` (`hard`): `85s` race timers, `1.7×` player damage, tougher police range/speed, faster enemy fire, tighter Park Cricket zone, and `+25%` bonus cash on story completions.
- [x] **Realistic Driving Physics & Chase Camera (`game.js`, `world3d.js`, `gta-overhaul.js`):**
  - Smooth progressive steering smoothing (`steerSmooth`), torque acceleration curves, speed-dependent drag, drift tail slip angle (`driftVisualYaw`), speed-adaptive camera follow distance/FOV, smooth angular damping, and subtle turn look-ahead.
- [x] **3 New Dream Rides (`Veloce V12` Supercar, `Bavaria M4` Sport Coupe, `Apex 1000RR` Heavy Superbike):**
  - Parked in Raja District (`supercar` at `(12,-52)`, `bmw` at `(-12,52)`, `superbike` at `(12,-33)`) for 9 permanent hero rides + dynamic carjacked slot (`stolen`), complete with minimap markers, contact shadows, headlight cones, and layered exhaust/horn audio.
- [x] **Traffic Carjacking (`HIJACK` / `E`) & Any-Vehicle Mission Support (`campaign.js`, `game.js`, `story-runtime.js`, `story-world.js`, `city-jobs.js`):**
  - Pull road drivers out of any traffic sedan, pickup, or auto-rickshaw (`carjackEvent` visual fleeing driver) and keep/drive the hijacked vehicle.
  - Complete car-based missions/jobs and cargo boot objectives in any 3/4-wheel car (`Veloce V12`, `Bavaria M4`, `GT Coupe`, `Pickup`, `Cruiser`, `Rickshaw`, or hijacked rides) and bike missions/jobs on either `Street Bike` or `Apex 1000RR`.
- [x] **Real Layered Horns & Engine Notes (`audio.js`):**
  - Vehicle-specific multi-tone filtered horn chords (`car`, `supercar`, `bmw`, `superbike`, `pickup`, double-chirp `rickshaw`, police yelp `cruiser`) + V12 / inline-4 / M4 exhaust profiles (0 oscillators when muted).
- [x] **Eye-Catching Modern UI & GTA-6 Touch Controls (`style.css`, `expansion.css`, `mobile.css`, `mobile.js`, `app-ui.js`):**
  - Frosted glassmorphism HUD cards & animated dialog popups, glowing Wanted indicator, sleek frosted GTA-6 touch joystick & glass action buttons, plus swipe-right driving camera orbit that smoothly recenters on release.
- [x] **Phase 1 Self-Testing & APK (`tests/phase1-overhaul.cjs`):** All **25/25** automated suites passed (`tests/phase1-suite.log`, `0` errors), 5 screenshots visually inspected, render diagnostics (`30 FPS`, `558` calls, `10.1 ms` median), and `releases/Nasir-Bazaar-City.apk` rebuilt as `v0.8.0` (`versionCode 13`, `4,429,708` bytes, SHA-256 `8aba408b7a64d35ef1e9c26b22b2316bbb07f23675ba36f84e8ea72efeb21408`, 24/24 assets matched, v2 signature verified). Physical A52 device verification remains open (`adb.exe devices` empty).

---

## Phase 2 (`v0.9.0`) — GTA-6 Car Doors, Coastline Sea & Speedboat, Hospital, Narrow Alleys, Food Markets, Crowds & Fighting ✅

- [x] **GTA-6 Animated Hinged & Scissor Car Doors (`models.js`, `gta-overhaul.js`, `game.js`, `world3d.js`, `audio.js`):**
  - Hinged driver doors with dark cabin cutouts, inner cards, tinted window frames, handles & moving side mirrors on `sedan`, `GT Coupe`, `Bavaria M4`, `Pickup 4x4`, `Punjab Police Cruiser`, `City Ambulance`, and hijacked traffic cars, plus upward-lifting **scissor door** on `Veloce V12`.
  - Swings open & slams shut with metallic door-slam SFX (`playDoorSound`), smooth visual cabin step-in/step-out (`doorTransition`), and dramatic yank-out hijack (`exDriver` + `carjackEvent`).
- [x] **Expanded Coastline Sea (*Samandar*), Sandy Beach, Marina Pier, Driveable Speedboat (*Kashti*) & Swimming (`world-phase2.js`, `game.js`, `city.js`, `world3d.js`, `audio.js`):**
  - Removed south wall at `z = -398` and extended south boundary to `z = -560` with golden sand promenade, palm trees, umbrellas, wooden Marina Pier (`x = 0, z = -434..-472`), and single-draw-call `ShaderMaterial` animated Ocean with shore surf foam.
  - Shoreline land-car clamp (`z >= -434`), sculpted driveable **Marina Speedboat** (`boat`, maritime horn, outboard wake foam & buoyancy), on-foot **Swimming** with ripple ring & breaststroke animation, and HUD updates.
- [x] **Walk-in City Hospital (`(-75, 193)`), Driveable Ambulance & Hospital Respawn (`district-data.js`, `story-world.js`, `world-phase2.js`, `game.js`):**
  - White City Hospital landmark with glowing Red Cross, `EMERGENCY 1122` canopy, open reception desk, beds & doctor (`HEAL` -> `TREATMENT / Rs 50` or Free First Aid), parked driveable **City Ambulance** (`N` / `SIREN` toggleable lightbar + air horn + traffic yield), and free-roam knockout hospital respawn.
- [x] **Traversable Narrow Bazaar Alleys (*Choti Galiyan*), Open Markets (*Raja Dhaba* & *Mini Mart*) & Eating (`city-layout.js`, `city.js`, `world-phase2.js`, `game.js`):**
  - Open walk-in interiors at `(-22, -44)` **Raja Dhaba & Chai** (tandoor, chai kettle, dining tables) and `(22, -44)` **Bazaar Mini Mart** (stocked aisles & cooler), plus beachfront **Marina Chai & Tikka Hut** (`(24, -418)`).
  - Cobblestone alley pavers & overhead festival shade banners/lanterns along `z = -33` & `z = +33` (100% bike-traversable) and `EAT` food menus (`Masala Chai`, `Chicken Tikka`, `Special Bazaar Biryani`) restoring HP + timed `staminaBoost` (`· FED`) & eating animation.
- [x] **Dense Market Crowds (*Hujoom*) & 3-Hit Street Fighting Combos (`game.js`, `world3d.js`, `polish.js`, `audio.js`):**
  - Added 16 extra plaza, alley, hospital & beach pedestrians (`52` NPCs total via instanced rendering), 3-hit Jab → Cross → Heavy Uppercut combo (`F`) with knockback, stamina-boosted power, punch impact SFX, and bystander scatter/flee reactions.
- [x] **Phase 2 Self-Testing & APK (`tests/phase2-world.cjs`):** All **26/26** automated suites passed (`tests/phase2-suite.log`, `0` errors), 5 screenshots visually inspected (`p2-door-hijack.png`, `p2-sea-boat.png`, `p2-hospital.png`, `p2-dhaba-alley.png`, `p2-mobile-beach.png`), render diagnostics (`30 FPS`, `607` calls, `172,848` triangles, `10.2 ms` median / `12.3 ms` P95 CPU), and `releases/Nasir-Bazaar-City.apk` rebuilt as `v0.9.0` (`versionCode 14`, `4,442,143` bytes, SHA-256 `397d07ba37bc4593fa555ff1d38e2d4f51a09b0d1f04f82f59db186489af0e25`, `25/25` assets matched, v2 signature verified). Physical A52 device verification remains open (`adb.exe devices` empty).

---

## Phase 3 (`v0.9.5` → included in `v1.0.0`) — Nasir's Own Villa, Swimming Pool & Bazaar Gym ✅

- [x] Walk-in **Nasir Villa** (*Apna Ghar*, `(-82, -358)`) with dual North/South doorways, living room, Rest & Save bed (`100 HP`), Wardrobe & Outfit Shop access (plus Chapter 4 **Golden Champion Jacket** `outfit 4`), and driveway summon clearing/nudging nearby parked cars.
- [x] Interactive backyard **Swimming Pool** (`(-82, -381)`) with shallow/deep blue water visuals, wooden diving/pool deck, `window.inVillaPool` dive/tread-water swimming animations, and land-vehicle pool guard.
- [x] Walk-in **Bazaar Gym** (`(82, -138)`, South entrance) with bench press rack, punching bags, treadmills, trainer NPC, and 5-tap workout activity upgrading permanent **Sprint Stamina** and **Punch Strength** (`Lv 0..3`).
- [x] **3 Secret Golden Briefcases** hidden across North Tower Courtyard, Pool Deck, and East Park Pavilion paying `Rs 500` one-time explorer bonuses each.

---

## Phase 4 (`v1.0.0`) — Long-Distance City-Spanning Curious Missions Overhaul ✅

- [x] Expanded **Missions 1–10** routes across the full Bazaar City map (`~990 m` road Bike Trail / `>= 150 m` mission legs spanning Raja Dhaba, South Plaza, North Tower, West Depot, East Alley & Bazaar) with multi-stop clues and mystery twists.
- [x] Added **Chapter 4 — City Legend (Missions 16–20, 20 total)** paying `+Rs 18,400` (`Rs 51,400` full-campaign payout before optional Gym spend):
  - **16. Keys to Apna Ghar** (Villa intro, driveway Veloce V12, backyard pool dive & living room save)
  - **17. Iron Fist Gym Trial** (Gym workout, narrow-alley courier spar & South Plaza sparring test)
  - **18. Code Blue Express** (Hospital emergency briefing, Police Ambulance rescue run & ER bay drop-off)
  - **19. Deep Sea Intercept** (Marina Pier Speedboat launch, direct sea-route pursuit through buoys & harbor return)
  - **20. King of Bazaar City** (Secret Vault lock puzzle `7-4-9`, Final Coastal Convoy ambush boss & Villa Dawn Celebration unlocking **Champion Gold** jacket)
- [x] Verified **27/27** automated browser & logic suites (`tests/phase34-suite.log`, `0` errors), render diagnostics (`30 FPS`, `562` draw calls, `173,280` triangles, `9.4 ms` median / `11.3 ms` P95 CPU on headless Edge), and rebuilt/signed `releases/Nasir-Bazaar-City.apk` (`1.0.0`, `versionCode 15`, `4,452,637` bytes).
- [x] **Pro-Level Start-to-End QA Audit (`v1.0.1`, `versionCode 16`) ✅**: Fixed Mission 19 Sea Chase timeout retry softlock, `seaDock (8.5, -456)` & Marina Pier boarding/exit, `recoverVehicle` sea/pool dry-land safety, hidden-until-M7 `receiver` prop, non-blocking canopy/roof signage across Villa/Gym/Hospital/Hotel/Depot/Archive, nearest-site HUD label (`BAZAAR GYM`), pedestrian facing yaw, sea/pool AI barriers for police/peds/horn/exDriver, multi-summon driveway slots, physical hotkey guard, mobile Pay 'n' Spray `SHOP` button & free-roam combat toggles, Bike Trial timer/radius, and water-stroke splash audio. Verified **28/28** suites (`tests/pro-qa-suite.log`, `0` errors), render diagnostics (`30 FPS`, **`560`** draw calls, `173,280` triangles, `9.8 ms` median / `12.4 ms` P95 CPU), 4 visual doorway captures, and `releases/Nasir-Bazaar-City.apk` (`1.0.1`, `versionCode 16`, `4,453,977` bytes).
- [x] **Physical Samsung Galaxy A52 (`SM_A525F`, Android 14) Install & Full On-Device QA (`v1.0.2`, `versionCode 17`) ✅**: Initial `v1.0.1` hardware QA caught and fixed 4 real mobile UX/UI details on the A52 (`#telemetry` vs minimap `18 px` spacing at `685x320`, locked `GO/BACK/BRAKE` thumb slot order at Carwash, touch-native `#hint` without desktop `SPACE`/`/ E` strings, and wanted status double-bullet typo). Rebuilt `releases/Nasir-Bazaar-City.apk` (`1.0.2`, `versionCode 17`, `4,454,041` bytes), passed **28/28** PC suites (`tests/v102-suite.log`, `0` errors) + render diagnostics (`30 FPS`, `560` calls), upgraded live on `R58R50Q6RXT`, and passed **17/17** real-device QA checks (`tests/a52-device-qa.cjs`: Adreno 618 `29` rendered FPS LOW / `27` HIGH, `16.7 ms` median vsync, `419` calls, `233,940 KB` PSS, battery `27.8°C -> 27.9°C`, real touch joystick + look swipe, 3 hardware Android Back key flows, all 20 missions + M19 timeout retry, `0` crashes/logcat errors, and 4 verified live screenshots `a52-qa-street.png`, `a52-qa-villa.png`, `a52-qa-sea.png`, `a52-qa-wanted-wash.png`).
- [x] **Physical A52 Lifecycle, WebAudio & 60s Sustained Hardware Soak (`tests/a52-soak-lifecycle.cjs`) ✅**: Passed **10/10** checks (`0` errors) — real touch WebAudio unlock (`running`), muted zero-oscillator guard (`0`), Android HOME background pause (`PAUSED` + `AudioContext suspended`) & foreground resume (`8` WebGL frames/`300 ms`), and 60s 4-stage GPU soak (`LOW-DriftStreet 29 FPS / 326 calls`, `LOW-3StarChase 29 FPS / 390 calls`, `LOW-SeaSpeedboat 27 FPS / 159 calls`, `HIGH-CityLandmarks 26 FPS / 356 calls`; only `+13,249 KB` RAM delta, battery `28.7°C -> 28.6°C`). All v1.0.2 checks complete.

---

## Phase 5 (`v1.1.0`, `versionCode 18`) — GTA-6 Hype Upgrade I: Living 24h Weather, GTA Customs (`NOS`/Neon/Turbo/Armor), 3D Stunt Ramps & AI Street Racing ✅

- [x] **Dynamic 24-Hour Day/Night Cycle & Live Weather (`world-phase5.js`, `polish.js`, `city.js`, `audio.js`, `app-ui.js`):** Continuous 24h solar/dusk progression + Phone (`WEATHER & TIME`) / Settings (`TIME:` / `WEATHER:`) overrides (`AUTO / DAY / SUNSET / NIGHT`, `AUTO / CLEAR / RAIN / STORM`), single-draw-call `InstancedMesh` falling rain (`180` mobile Low / `300` desktop), storm lightning flashes (`#weatherFlash`), mute-safe rain & thunder audio, dynamic wet-asphalt specular reflections (`roadMaterials`), rain-hurrying NPCs, auto-headlights during rain, and live `HH:MM` clock/weather header readout.
- [x] **GTA Customs Garage (`Nasir Hussain Car Shop` -> `GTA CUSTOMS`):** Persistent tuning upgrades (`nosUnlocked`, `turboLv 0..3`, `armorLv 0..3`, `neonColor`, `ownedNeons`):
  - **Nitro Boost (`NOS`):** Desktop `X` / `Shift` or Mobile `NOS` / `BOOST` button, `+14 m/s` top-speed boost, FOV punch, glowing twin blue `InstancedMesh` exhaust flames + exhaust vapor trail, live HUD charge bar (`#nosWrap`), and mute-safe whoosh SFX.
  - **Engine Turbo (`Lv 0..3`):** `+8%` top speed & `+10%` acceleration per level with orange gear-shift exhaust flame pops.
  - **Armored Chassis (`Lv 0..3`):** `-20%` vehicle and `-15%` player crash damage per level.
  - **Neon Underglow:** Additive under-chassis halo beneath active hero cars & bikes (`off`, `cyan`, `purple`, `gold`, `red`, `green`).
- [x] **4 Merged 3D Stunt Ramps (`STUNT JUMP!`) & Real Airborne Jump Physics:** Sector-culled ramps at South Boulevard `(0, -255)`, North Avenue `(0, 255)`, West Quarter `(-245, 0)`, and Marina Beach `(58, -411.5)`, with smooth elevation/launch physics, brief free-roam slow-mo kick (`stuntSlowMo`), suspension landing thud, and `Rs 200–600` air-distance cash bonuses (`stuntsDone`, `bestStunt`).
- [x] **AI Rival Street Racing:** Phone (`STREET RACES`) circuits (`Bazaar Boulevard Sprint` `Rs 1,500`, `Marina Coastal Dash` `Rs 2,000`, `Grand Ring Championship` `Rs 2,500`) racing 3 pooled AI rival supercars (`Zain`, `Tariq`, `Sana`) through rotating glowing checkpoint arches with live `1st / 4` standings, minimap rival markers, 3D arrow routing, and automatic cancel on mission start.
- [x] **Camera Safety Fix (`world3d.js`, `game.js`):** Clamped negative `dt` in `render()`/`frame()` so frame-timestamp jitter never extrapolates the chase camera.
- [x] **Phase 5 Verification, APK & Physical A52 QA:** Added Suite #29 (`tests/phase5-hype.cjs`, 14 checks, 4 inspected screenshots `p5-night-rain-neon.png`, `p5-nos-stunt-jump.png`, `p5-street-race.png`, `p5-mobile-nos-hud.png`); passed **29/29** PC/emulated suites (`tests/phase5-suite.log`, `0` errors) and render diagnostics (`30 FPS`, **`559`** draw calls, `173,280` triangles, `9.4 ms` median / `13.8 ms` P95 CPU). Rebuilt & signed `releases/Nasir-Bazaar-City.apk` (`1.1.0`, `versionCode 18`, `4,468,632` bytes, SHA-256 `3ffea4160e80b5842d31f046cf9a1e09b3270cc09e60c6992dc0238d18fb4264`, `28/28` runtime files matched, v2 signature verified). Upgraded `R58R50Q6RXT` via `adb install -r` (`Success`, save preserved), passed **17/17** `tests/a52-device-qa.cjs` checks (`28` FPS LOW / `29` HIGH, `345` calls, `217,643 KB` PSS), and verified live Adreno 618 Night + Rain + Purple Neon + active `BOOST` gameplay (`30 FPS`, `416` calls, `tests/a52-p5-live.png` visually inspected).

---

## Upcoming Phases (Next Milestones)

### Phase 6 (`v2.0.0` part 1) — BazaarGram Live Feed, Random Street Events & 5★ Police Helicopter + Roadblocks ✅
- [x] **Phone BazaarGram (`world-phase6.js`, `commerce.js`, `campaign.js`):** Dynamic social feed (`story.data.bazaarGram`) reacting to stunts, drifts, 175+ km/h speed traps, street race wins, street events, business buys, character switches, and 4★+ alerts, plus manual `TAKE SNAP / POST`.
- [x] **Random Open-World Street Events:** Free-roam Street Drag Duel (`Rs 1,000`), Purse Snatcher intercept (`Rs 500`), and Armored Cash Van (`Rs 800`) using pooled zero-idle-draw-call 3D actors (`PHONE → STREET EVENTS` or auto-spawner, cleanly auto-canceled on mission/job/race start).
- [x] **3★ Police Roadblocks & 4★–5★ Police Helicopter:** 3★ barricade + traffic-cone roadblocks ahead on the road (`clearPhase6Wanted()` on wipe) plus a 4★–5★ animated Punjab Police Helicopter overhead (`y = 21 m`, spinning rotors) with an additive sweeping ground Searchlight Beam (`lastSeen` refresh when locked) and mute-safe rotor SFX.

### Phase 7 (`v2.0.0` finale) — Marina Ferris Wheel, Neon Markets, Desi DJ & Layered Audio, Business Empire & `Nasir ↔ Alia` Switch ✅
- [x] **Marina Beach Ferris Wheel & Glowing Neon Billboards (`world-phase7.js`):** Rotating glowing Ferris Wheel at `(-124, -418)` (culled at `255 m`, `0` Raja Market draw calls) plus 4 Sector Neon Billboards & Raja Market night strip glow bars modulated by `currentDusk`.
- [x] **Desi Hype DJ & Layered Proximity Audio (`audio.js`, `world-phase7.js`):** 4th Bazaar FM station `DESI HYPE DJ` (RJ Chacha), mute-safe Ocean Wave & Helicopter Rotor noise buses (`0` oscillators when muted), `playCashRegister`, `playSwitchWhoosh`, `playEventCue`, and quiet-safe free-roam DJ/chaiwala captions.
- [x] **Business Empire:** Buyable properties (`Raja Dhaba & Chai` `Rs 2,500`, `Kazim Ali Carwash` `Rs 3,500`, `Marina Chai & Tikka Hut` `Rs 4,500`, `Bazaar Gym Franchise` `Rs 6,000`) accruing passive `Rs / min` up to `Rs 25,000` with 1-tap `COLLECT INCOME` in Phone (`BUSINESS EMPIRE`).
- [x] **Free-Roam `Nasir ↔ Alia` Dual-Character Switch:** Key `U` on foot or Phone toggle with `1.45 s` GTA-style sky zoom camera transition (`window.charSwitchAnim`), distinct Alia jacket (`#9e3f64`) & HUD label (`ALIA / ON FOOT`), persisted per-character `charSpots`, blocked during active mission/job/race, and automatic Nasir restore (`ensureNasirForMission`) when launching story missions.
- [x] **All-20-Missions QA, `v2.0.0` APK & Physical Samsung Galaxy A52 Certification:** Passed **32/32** PC & Mobile Touch browser/logic suites (`tests/v200-suite.log`, `0` errors) including sequential **20/20 missions** on Desktop Web (`1280×720`) and Mobile Touch (`740×360`, exact `Rs 51,300`), render diagnostics (`30 FPS`, **`564`** draw calls `<= 600`), rebuilt signed `releases/Nasir-Bazaar-City.apk` (`2.0.0`, `versionCode 20`, `4,482,190` bytes, SHA-256 `02582d27fcefa9ae76bb3d7b805fc5841f946d19f37c528fb54038e8619cea1b`, `30/30` assets, v2 cert `87e8d14a8e578e7088fed5c999ddf99a8cd0a222e89f89562074ba3cd01b63ab`), and passed **17/17** `tests/a52-device-qa.cjs` checks (`28` FPS LOW / `29` HIGH, `345` calls) plus live Phase 6 & 7 A52 QA (**`30 FPS`** / `512` calls in 5★ Helicopter + Neon Night, **`29 FPS`** / `101` calls at Marina Ferris Wheel + Alia Switch, visually inspected `a52-v2-heli.png` & `a52-v2-ferris-alia.png`).

---

### Phase 8 / Polish (`v2.1.0`, `versionCode 21`) — Zero-Cost HD Graphics & Optional `30 / 60 FPS` + `LOW / HIGH / ULTRA` Toggles ✅
- [x] **Zero-Cost HD Shaders & Lighting (`world3d.js`, `polish.js`, `world-phase2.js`):** Added procedural `PMREMGenerator` environment reflection map (`scene.environment` / `window.cityEnvMap` — metallic car paint, glass & wet asphalt shine), hardware `antialias` on Desktop, `anisotropy = 4`, drifting 2-octave clouds in `skyMaterial`, and animated sun/moon specular glints in `seaMat` (`0` extra draw calls!).
- [x] **3-Tier Resolution Scaling & `30 / 60 FPS` Toggle (`campaign.js`, `world3d.js`, `game.js`, `app-ui.js`, `mobile.js`):** Added `GRAPHICS: LOW / HIGH / ULTRA` (`Q` on PC, top button on Mobile — scaling Desktop `960 → 1600 → 1920` and A52 `685×320 → 993×464 → 1267×592`) and persisted `FPS: 30 (BATTERY) / 60 (SMOOTH)` (`fpsCap`, battery-safe `30` default; unlocks native frame rate when set to `60`).
- [x] **Full 33-Suite Regression, `v2.1.0` APK & Live Adreno 618 Benchmarks:** Passed **33/33** suites (`tests/v210-suite.log`, `0` errors) including Suite #33 (`tests/graphics-60fps.cjs`, `8/8` checks, inspected `v21-ultra-glossy-day.png` & `v21-marina-water-ultra.png`), PC render diagnostics (`30 FPS`, **`564` draw calls**), built signed `releases/Nasir-Bazaar-City.apk` (`2.1.0`, `versionCode 21`, `4,483,354` bytes, SHA-256 `74f642ee8d3fa679eb2838f6a794e315108ff08152a8de298c515b3b5d4d45c7`, `30/30` assets), passed **17/17** `tests/a52-device-qa.cjs` checks (`LOW` `31 FPS` @ `685×320`, `HIGH` `28 FPS` @ `993×464`, battery `25.8°C → 25.9°C`), and verified real A52 `LOW/HIGH/ULTRA` & `30/60 FPS` live telemetry (`LOW+30`: `31 FPS`, `LOW+60`: `38 FPS` street / `27 FPS` marina, `HIGH+60`: `32 FPS` street / `30 FPS` marina @ `993×464`, `ULTRA+30`: `26 FPS` @ `1267×592`, `0` errors, visually inspected `a52-v21-ultra-day.png` & `a52-v21-60fps-marina.png`).
