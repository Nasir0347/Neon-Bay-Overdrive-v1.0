# NEON BAY: OVERDRIVE — MASTER GAME DESIGN & TECHNICAL SPECIFICATION (SINGLE SOURCE OF TRUTH: V1.0 + V2.0)

**Instructions for AI Coding Agents (Codex / Antigravity / Cursor):**
This single file is the complete blueprint for building **Version 1.0** of **NEON BAY: OVERDRIVE**, a cross-platform Three.js 3D open-world driving, heist, and police chase game—engineered to look and feel like a full AAA studio production (GTA-tier visual polish & UI/UX) while passing strict 2026 web portal QA (Poki, CrazyGames, YouTube Playables) and running at 60 FPS on 4 GB RAM Chromebooks, Android, iOS, Tablets, and Ultrawide Desktops.
* **Existing Assets:** The codebase already contains a base **City**, **10 Cars**, and **2 Bikes**. Do NOT rebuild working assets from scratch; map, scale (`1 Three.js unit = 1 meter`), optimize, and expand strictly according to this spec.
* **V2.0 Future-Proofing:** Build ONLY the V1.0 scope for launch, but keep core modules decoupled (`EventBus`, Vehicle State Serialization, Chunk-based World Loader) so **Version 2.0** (Section 12) plugs in cleanly later.

---

## 1. PROJECT OVERVIEW, BRANDING & REVENUE STRATEGY
* **Official Title:** **NEON BAY: OVERDRIVE** *(Backup alternatives: Palm City: Outlaw, Sunset Syndicate, Coastline Heist)*.
* **Genre:** 3D Open-World Action, Driving, Heist & Police Chase (GTA 6 / Miami Neon Coastal Vibe).
* **Tech Stack:** Three.js (WebGL), HTML5/JS, Capacitor (Android `.aab` & iOS builds), Firebase/Supabase (Global Leaderboards & Telemetry).
* **Revenue Target:** $10,000+/month targeting Tier-1 traffic (USA, UK, Canada, Germany, Australia).
* **2026 Web Portal Strategy:**
  * **Poki (Primary Pitch):** Requires Web Exclusivity (cannot be on CrazyGames simultaneously, but Google Play & Apple App Store ARE allowed). 50/50 split on Poki traffic + **100% revenue share on direct creator traffic** (YouTube Shorts/TikTok).
  * **CrazyGames (Secondary / Non-Exclusive Path):** 2-Stage Launch (*Basic Launch* 7–21 days metrics test -> *Full Launch* with full ad monetization). Pair with Yandex Games & itch.io if non-exclusive.
* **STRICT LEGAL & COPYRIGHT COMPLIANCE:**
  * NEVER use "GTA", "Grand Theft Auto", "Vice City", "Rockstar", "Lucia", "Jason", or real car brand names/logos (Lamborghini, Ferrari, BMW, etc.) in code, UI, textures, or store listings. Use ONLY the original fictional brands and world names below.

---

## 2. AAA WORLD BIBLE (CAST, CITIES, DISTRICTS, ROADS & LANDMARKS)

### 2.1 Cast of Characters (Radio Subtitles & Cutscenes)
* **Rico Vega** *(Main Player — V1.0)*: Street getaway specialist with a Miami coastal vibe.
* **Maya Cross** *(Dual Protagonist — V2.0)*: High-speed heist & escape partner.
* **Victor Kane ("The Ghost")** *(Act 1 Handler)*: Mysterious encrypted caller testing Rico.
* **Don Salazar** *(Main Villain)*: Cartel boss who orchestrates the Mission 5 ambush.
* **Zed** *(Underworld Hacker)*: Drives the Blue Sports Car targeted in Mission 6.
* **Captain Miller** *(Police Radio Chief)*: Broadcasts tactical radio alerts during 3-Star to 5-Star chases.

### 2.2 Cities & Districts
* **City 1 (V1.0 — Unlocked): NEON BAY** (`2000m x 2000m` dense coastal map divided into 4 zones):
  1. **Apex Core (Downtown):** Glowing skyscrapers, neon billboards, Police HQ, and narrow alleys.
  2. **Palm Strip (Beachfront):** Ocean shoreline, palm trees, golden sunset lighting, luxury hotels, and sand braking zone.
  3. **Iron Docks (Industrial Port):** Shipping containers, cranes, warehouses, and mega stunt ramps.
  4. **Bayview Heights (Suburbs & Highway):** Fast ring-road highway, villas, and car meet parking plazas.
* **City 2 (V1.0 — Unlocks after Mission 20): MIRAGE VALLEY** *(Las Vegas + Desert Canyon Vibe)*:
  * **The Gold Strip** (neon casinos & top-speed straightaways), **Red Canyon** (mountain roads & ramps), **Dusty Airfield** (abandoned runway).
* **City 3 (V2.0 Expansion): EMERALD KEYS** *(Tropical Islands — Coral Island & Smuggler's Cove linked by sea bridges)*.

### 2.3 Iconic Roads, Bridges & Landmarks (Display on HUD/GPS)
* **Roads & Bridges:** *Oceanic Boulevard*, *Skyline Expressway*, *Bayview Causeway* (locked until M20), *Shadow Alley*, *Sunset Strip*.
* **Landmarks:** *Solaris Tower*, *Titan National Bank*, *Pier 99*, *Vega's Garage*, *Skyline Construction Site*, *Neon Bay International Airport*.

### 2.4 In-Game Car Radio Stations (Royalty-Free Audio Loops)
* **99.5 Neon FM** *(Miami Synthwave)* | **104.2 Drift Radio** *(Phonk / Bass)* | **88.0 Bay Beats** *(Hip-Hop / Trap)*.

---

## 3. COMPLETE VEHICLE ROSTER & EXACT THREE.JS SCALE (`1 Unit = 1 Meter`)
**Scale Rule:** Normalize every imported `.glb` vehicle mesh so its bounding box matches the exact `Length x Width x Height (m)` below, with wheels resting cleanly at `y = 0` and forward aligned consistently. Start player with **C01, C02, and B01** unlocked; lock others via Cash, Rewarded Ads, or IAP.

### 3.1 Cars (12 Total — Map Existing 10 Cars + Add 2)
| ID | Fictional Name | Real-World Archetype | Scale (L x W x H m) | Top Speed | Mass | Role |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **C01** | **Kuro Civic-X** | Street Starter Sedan | `4.50 x 1.85 x 1.42` | 175 km/h | 1,350 kg | Balanced starter (M1, Free) |
| **C02** | **Kuro Drift-R** | JDM Street Coupe (GTR/Supra) | `4.55 x 1.90 x 1.35` | 210 km/h | 1,420 kg | High drift angle (M2, Free) |
| **C03** | **Stallion V8 GT** | American Muscle (Charger) | `4.85 x 1.95 x 1.40` | 225 km/h | 1,750 kg | Heavy torque, loud V8 (M4, M5) |
| **C04** | **Kuro Turbo-RS** | Rally Turbo Hatchback | `4.30 x 1.85 x 1.45` | 215 km/h | 1,300 kg | Agile ramming & corners (M6) |
| **C05** | **Vortex Spyder** | Mid-Engine Sports (Ferrari) | `4.60 x 1.98 x 1.22` | 265 km/h | 1,450 kg | Sharp grip, high speed (M7, M12) |
| **C06** | **Solaris Drop-Top** | Luxury Miami Convertible | `4.75 x 1.92 x 1.32` | 235 km/h | 1,600 kg | Smooth cruiser (M9 No-Brakes) |
| **C07** | **Titan Executive** | Armoured SUV (G-Wagon) | `4.95 x 2.05 x 1.95` | 195 km/h | 2,600 kg | High HP, ramming boss (M10, M19) |
| **C08** | **Titan 4x4 Crusher** | Heavy Off-Road Truck | `5.40 x 2.15 x 2.05` | 185 km/h | 3,100 kg | Smashes barricades (M11, M13) |
| **C09** | **Vortex Shadow** | Matte-Black Stealth Coupe | `4.65 x 1.98 x 1.24` | 275 km/h | 1,480 kg | Stealth & lockdown (M14, M16) |
| **C10** | **Vortex Veneno-X** | Wedge Hypercar (Lamborghini) | `4.78 x 2.06 x 1.16` | 320 km/h | 1,520 kg | Flagship speedster (M15, M17, M18) |
| **C11** | **Vortex Apex Gold** | Exclusive Golden Hypercar | `4.80 x 2.08 x 1.15` | 340 km/h | 1,490 kg | M20 Grand Finale Reward / VIP |
| **C12** | **NBPD Interceptor** | Police Pursuit Cruiser | `4.90 x 1.96 x 1.48` | 250 km/h | 1,850 kg | Siren + Vigilante Mode Unlock |

### 3.2 Bikes (4 Total — Map Existing 2 Bikes + Add 2)
| ID | Fictional Name | Real-World Archetype | Scale (L x W x H m) | Top Speed | Mass | Role |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **B01** | **Phantom Street 600** | Agile Sport Bike | `2.05 x 0.78 x 1.12` | 220 km/h | 195 kg | Narrow alleys & ramps (M3, M17, Free) |
| **B02** | **Phantom Dirt-X** | Stunt / Motocross Bike | `2.15 x 0.82 x 1.25` | 185 km/h | 125 kg | High air control, mega-jumps |
| **B03** | **Phantom R1000** | Heavy Highway Superbike | `2.10 x 0.80 x 1.15` | 295 km/h | 210 kg | Highway duels (M8, M15) |
| **B04** | **Phantom Neon-Z** | Futuristic Cyber Light-Bike | `2.20 x 0.85 x 1.10` | 315 km/h | 180 kg | Secret/Boss unlock, neon trails |

---

## 4. COMPLETE 20 STORY MISSIONS (DATA-DRIVEN CONFIG)
**Rules:** 60s–2.5 min duration | 3-second radio subtitle intro | Post-mission screen shows Cash + 1–3 Stars, Next Mission Teaser, and Monetization CTA (*2x Cash Ad* / *Retry +20s Ad*).

### ACT 1: THE MYSTERIOUS CALLER (Neon Night & Rain)
1. **M1 — Neon Midnight Drop** *(C01 | 60s)*: Victor Kane says not to open the silver briefcase. Reach Pier 99 in 60s. **Twist:** 1 cop spawns in last 15s.
2. **M2 — Rain & Drift** *(C02 | 75s)*: Wet slippery road physics. Score drift points across 5 Neon Drift Zones on Sunset Strip.
3. **M3 — Alleyway Phantom** *(B01 | 60s)*: Main roads blocked. Use Shadow Alley & 2 ramps (slow-mo jump cam) to deliver parcel.
4. **M4 — The Decoy Siren** *(C03 | 90s)*: Fake siren mounted on car. Trigger 2-Star Police in Apex Core and survive/escape 45s.
5. **M5 — THE AMBUSH [Plot Twist #1]** *(C03 | 90s)*: 3 black SUVs block destination! Red screen flash *"IT'S A TRAP! ESCAPE!"* Reverse out to Vega's Garage.

### ACT 2: REVENGE & UNDERWORLD
6. **M6 — Hijack the Hacker** *(C04 | 90s)*: Ram Zed's Blue Sports Car (red HP bar) 3–4 times to stop it, switch into it, and drive to Vega's Garage.
7. **M7 — Signal Ghost** *(C05 | 75s)*: Live bomb tracker armed. Pass 4 Cell Towers in 75s to scramble signal (accelerating beep).
8. **M8 — Midnight Highway Duel** *(B03 | 90s)*: Chase rival courier on Skyline Expressway weaving through traffic with motion blur.
9. **M9 — NO BRAKES!** *(C06 | 80s)*: **Disable brake input completely.** Weave through checkpoints and crash-stop into Palm Strip Beach Sand.
10. **M10 — Zero-Scratch Heist** *(C07 | 120s)*: Steal Don Salazar's Armoured SUV from Bayview Heights. Fail if `Car Condition` < 80%.

### ACT 3: LEONIDA HEIST & CHAOS
11. **M11 — Barricade Breaker** *(C08 | 90s)*: Smash destructible police barricades outside Titan National Bank to distract police.
12. **M12 — Skyline Ramp Jump** *(C05 | 75s)*: Hit Skyline Construction Site mega-ramp at 180+ km/h with slow-mo side camera.
13. **M13 — Gold Convoy Escape** *(C08 | 120s)*: Heavy mass with 500kg gold. Side-smash 3 pursuing mafia cars off the road to Iron Docks.
14. **M14 — Blackout Stealth** *(C09 | 90s)*: City blackout, headlights off. Dodge moving ground searchlight cones to Iron Docks.
15. **M15 — THE DOUBLE CROSS [Plot Twist #2]** *(B03 vs C10 | 120s)*: Partner flees in Vortex Veneno-X. Cut them off before Airport runway.

### ACT 4: KING OF THE CITY (Golden Sunrise Finale)
16. **M16 — 4-Star Lockdown** *(C09 | 120s)*: Survive 2 minutes against 4 police cars and roadblocks.
17. **M17 — The Bay Switch** *(B01 -> C10 | 120s)*: Cross jammed bridge on Bike, swap into parked C10 at Iron Docks for highway sprint.
18. **M18 — 60 KM/H BOMB** *(C10 | 90s)*: Drop below `60 km/h` for 3 seconds = car explodes! Drift corners to Bomb Squad Zone.
19. **M19 — Cartel Boss Takedown** *(C07 | 150s)*: Ram Don Salazar's armoured limousine 5+ times to destroy it.
20. **M20 — VICE LEGEND FINALE** *(C11 | 150s)*: Golden sunrise. Mega-race + 4-Star chase down Airport runway to private jet. **Reward:** Unlock **Vortex Apex Gold (C11)** + Infinite Free Roam + **Mirage Valley (City 2)** via Bayview Causeway.

---

## 5. EXTRA MISSION LAYERS (INFINITE RETENTION — REUSE EXISTING ASSETS)
1. **Daily Missions (24h Reset):** 3 procedural daily tasks (500m continuous drift, escape 3-Star < 45s, jump 3 ramps on Bike) + **7-Day Streak** exclusive skin.
2. **Viral Challenge Modes:** *The 1% Impossible Rooftop Ramp*, *Reverse-Gear Race*, *1-HP Survival* (car on fire, 60s no scratch).
3. **Secret / Easter Egg Missions:** *The Midnight Ghost Racer* (Night Mode highway glowing car—honk to race & unlock) & *Hidden Tunnel Vault* (breakable wall cash stash).
4. **Free-Roam Side Hustles:** *VIP Taxi / Escape Uber*, *Police Vigilante Mode* (C12), and *30-Min VIP Test-Drive Popup* (Watch 1 Ad to drive C11 for 2 mins).

---

## 6. ULTRA AAA UI/UX DESIGN SYSTEM & CROSS-DEVICE RESPONSIVENESS (MANDATORY)
* **Visual Theme (Miami Neon Glassmorphism):**
  * Glass panels: `rgba(10, 14, 24, 0.72)`, `1px solid rgba(255, 255, 255, 0.14)`, `backdrop-filter: blur(12px)` (disable blur on `Low` graphics preset for 60 FPS).
  * Neon Accents: Electric Cyan (`#00F0FF`) GPS/Nitro, Sunset Magenta (`#FF007F`) Drift/Vice, Gold (`#FFD700`) Cash/Stars, Hazard Red (`#FF2A2A`) Police/Damage.
  * Typography: Condensed bold uppercase for Speedometer/Headers/Banners; clean sans-serif for subtitles. **CRITICAL:** Apply `font-variant-numeric: tabular-nums;` to Speedometer, Timers, and Cash so digits never jitter.
* **GTA HUD Hierarchy & Micro-Interactions:**
  * Keep center 65% of screen completely clear. Corners: Bottom-Left (Rotating Minimap + HP/Armor), Top-Right (Cash, 1–5 Wanted Stars, Timer), Bottom-Right (Speedometer + Nitro), Bottom-Center (Color-coded Radio Subtitles).
  * Contextual Auto-Fade (fade Road Name/Cash after 4s idle; pulse in on update).
  * Tactile button feedback (`scale(0.94)` on press, `120ms–220ms` non-blocking transitions, Gamepad neon focus rings), distinct UI audio clicks, red vignette on hit, radial speed-lines above `220 km/h`.
* **Universal Responsive & Safe-Area Architecture (All Devices):**
  * HTML `<head>`: `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">`
  * Canvas fills `100dvw x 100dvh` edge-to-edge (no black bars). HUD respects iPhone Dynamic Island/notches via `padding: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left));`.
  * Fluid Scaling: Use `vmin` for HUD widgets and `clamp(12px, 2.2vmin, 22px)` for text. Minimum **48×48 CSS px** mobile touch buttons with `touch-action: none; user-select: none;`.
  * `ResizeObserver` on canvas wrapper syncs Three.js size, aspect, and Half-Res Bloom across browser resize, orientation flip, and Portal Iframes.
  * **Portrait Mode (`aspect < 1`):** Automatically widen vertical FOV by `+10°` to `+14°`, move Minimap to Top-Left, anchor ergonomic pedals in lower thumb zone.
  * **Auto-Switch Input HUD:** Hide touch controls automatically on Keyboard/Gamepad input; show instantly on first touch.
  * **DPR Cap:** `renderer.setPixelRatio(Math.min(window.devicePixelRatio, IS_MOBILE ? 1.5 : 2))`.
  * **QA Matrix:** Verify zero overlap at `360×640`, `390×844`, `844×390`, `768×1024`, `800×450`, `640×640`, `1920×1080`, and `21:9` Ultrawide.

---

## 7. AAA GAMEPLAY FEEL ("JUICE") & WORLD SYSTEMS
* **Zero-Menu Instant Action:** Load directly behind idling car on Oceanic Boulevard with **"TAP TO DRIVE"** (unlocks iOS `AudioContext.resume()`).
* **Driving Physics & VFX:** Chassis body roll/pitch, Smart Drift Assist, Surface Physics (Asphalt/Wet/Sand), Dynamic Camera FOV (60 -> 80 on Nitro), Camera Shake, pooled Drift Smoke & Sparks (`ParticlePool.js`).
* **Half-Resolution Selective Bloom:** `new THREE.Vector2(width / 2, height / 2)` on `UnrealBloomPass` for Headlights, Brake Lights, Sirens, and Neon only (saves 75% GPU).
* **Dynamic Weather & Living World:** 10-minute cycle (Day -> Golden Sunset -> Neon Night -> Light Rain) with matching `THREE.FogExp2`, pooled breakable lampposts/hydrants/cones, 3D Spatial Audio (`THREE.PositionalAudio`).
* **5-Star Wanted & Police AI:** Escalating pursuit, smooth rubber-banding, **Line-of-Sight Cooldown** (break sight 10s -> stars flash -> clear), PIT maneuvers at 3+ Stars.
* **In-Game Smartphone UI:** Slide-up glassmorphic phone with *Missions*, *Garage (Call Mechanic)*, *Radio*, and *Cheat Codes* (`9999` Super Jump, `7777` Vortex Apex Gold, `0000` Clear Police, `5555` Moon Gravity).
* **3 Cameras + Gamepad + Photo Mode:** Chase, Hood, Cinematic (`C` key); Xbox/PS Controller support; 1-tap Photo Mode with *NEON BAY: OVERDRIVE* watermark.

---

## 8. 2026 PORTAL & MOBILE 60 FPS ENGINEERING STANDARDS
* **Strict Budgets:** Initial download **< 15 MB** (under 20 MB CrazyGames mobile cap, under 30 MiB YouTube Playables); mobile draw calls **< 50** (desktop **< 120**); mobile **GPU VRAM < 150 MB**; smooth on **4 GB RAM Chromebooks**.
* **Optimization:** Auto Device-Tier (`IS_MOBILE`) + `Low / Med / High` toggle; `THREE.InstancedMesh` for repeated city props; **Draco** mesh compression + **KTX2 / WebP** textures; explicit `.dispose()` on unloaded chunks; **Zero-GC** in render loop (no `new THREE.Vector3()` per frame).
* **Rendering & Safety:** `ACESFilmicToneMapping`, `PCFSoftShadowMap`, HDRI (`RGBELoader` + `PMREMGenerator`), `MeshPhysicalMaterial` for rigged characters (15k–25k tris). **Flip/Unstuck Car** (`R`), Haptics, `visibilitychange` auto-pause/mute.
* **Iframe & Path Hygiene:** Relative, case-sensitive paths only; HTTPS only; zero errors in cross-origin `<iframe>`.

---

## 9. MONETIZATION, PORTAL SDK, SAVE, ANALYTICS & i18n
* **`AdManager.js`:** Unified wrapper for **Poki / CrazyGames SDK** (Web) and **Capacitor AdMob** (Android/iOS).
  * *Rewarded Ads (80% Revenue):* +20s Revive & Repair, 2x Cash, VIP Test-Drive, Free Neon Underglow.
  * *Interstitial Ads:* NEVER mid-mission—ONLY after every **2 completed missions**.
  * *IAP (App Stores):* `remove_ads` ($2.99), `unlock_all_vehicles` ($4.99).
* **`PortalSDK.js`:** Fire `gameplayStart()`, `gameplayStop()`, `happytime()`. Mute audio & pause loop before any ad; resume ONLY in `adFinished` / `adError`. Hide external links inside iframes.
* **`SaveManager.js` (`neon_bay_save_v1`):** Persist cash, vehicles, missions, stars, customizations, streak, settings, City 2 unlock.
* **Anti-Rage-Quit & Analytics:** After 3 consecutive fails on the same mission, silently add +10s timer or -15% police aggression. Track `game_loaded`, `mission_start/complete/fail`, `ad_rewarded_watched`, `vehicle_unlocked`.
* **Viral Share Card & i18n:** 1-tap shareable record badge; externalized JSON strings for `en`, `es`, `pt`, `fr`, `de`, `ar`.

---

## 10. LAUNCH, SECURITY & MARKETING CHECKLIST
* **Production Code Protection:** Run **JavaScript Obfuscator** + configurable **Domain-Lock** (allowing `localhost`, Poki, CrazyGames, and production domain) on Vite/Webpack production builds.
* **Real Device QA:** Test 30–60 FPS on a real 3–4 GB RAM Android phone & iOS Safari before publishing.
* **Marketing:** High-contrast neon Vortex hypercar + police siren + sunset thumbnail; post 15s vertical clips (No-Brakes, mega-ramps, 5-Star chases) on Shorts/TikTok/X.

---

## 11. AI AGENT GUARDRAILS & FOLDER STRUCTURE
**Guardrails:** Event-driven decoupling (`EventBus.js`), non-destructive wrapping of existing assets, config-first JSON files, zero-crash fallbacks, and zero `// TODO` stubs.

```text
/src
  /core          -> EventBus.js, GameLoop.js, SceneManager.js, AudioManager.js, SaveManager.js, InputManager.js
  /world         -> CityManager.js, ChunkLOD.js, WeatherCycle.js, TrafficAI.js, Destructibles.js, Minimap.js
  /vehicles      -> VehicleController.js, VehicleData.js, GarageCustomization.js, ParticlePool.js
  /missions      -> missionsConfig.js, MissionManager.js, DailyMissions.js, ChallengeModes.js, SideHustles.js
  /police        -> WantedSystem.js, PoliceAI.js
  /ui            -> HUD.js, TouchControls.js, SmartphoneUI.js, CheatCodes.js, PhotoMode.js, ShareCard.js, i18n.js
  /monetization  -> AdManager.js, PortalSDK.js, IAPManager.js, AnalyticsManager.js
```

---

## 12. VERSION 2.0 EXPANSION BLUEPRINT (PREPARE HOOKS ONLY — DO NOT BUILD IN V1.0)
* **Multiplayer & P2P Proximity Voice Chat:** Private Friend Rooms (4–8 players via `Colyseus`/`Socket.io` + CrazyGames Invite Links), WebRTC P2P 3D Proximity Voice Chat, Public Quick-Chat + Mute/Report/Profanity Filter, Co-Op Heists.
* **World & Vehicles:** **City 3: Emerald Keys** (islands & sea bridges), Underground Car Meet Arena, Airport Drag Strip, Mountain Touge Pass; Speedboats, Jet Skis, Light Helicopter.
* **Live-Ops:** On-Foot Mode (Lite) with dual protagonists (*Rico Vega* & *Maya Cross*), Buyable Properties, Monthly Battle Passes.

---

## 13. THE 4 COPY-PASTE PROMPTS FOR CODEX / ANTIGRAVITY (4-DAY EXECUTION)
**Workflow Rule:** Run ONE prompt per day. After each prompt finishes, test in your browser/mobile emulator and run `git commit` before starting the next prompt.

### PROMPT 1 (DAY 1): Audit, Core Systems, AAA UI/UX, Driving Feel, Police AI & Smartphone
> Read `GAME_MASTER_SPEC_V1.md` completely and inspect my existing Three.js codebase (City, 10 Cars, 2 Bikes). Do NOT break or rewrite working city/vehicle assets. Execute the following cleanly with zero `// TODO` stubs:
> 1. Create `PROGRESS.md` and build `/src/core/EventBus.js`, `SaveManager.js` (`neon_bay_save_v1`), and `InputManager.js` (Keyboard, Gamepad, Mobile Touch).
> 2. Map and normalize existing 10 Cars & 2 Bikes in `/src/vehicles/VehicleData.js` to exact `1 unit = 1 meter` scales (Section 3).
> 3. Implement **Section 6 (Ultra AAA UI/UX & Universal Responsiveness)** from day one: Miami Neon Glassmorphism theme, `tabular-nums`, `viewport-fit=cover`, `100dvw x 100dvh`, `env(safe-area-inset-*)`, `clamp()`/`vmin` scaling, `ResizeObserver`, Portrait FOV adaptation, Auto-Switch Touch/Keyboard HUD, `"TAP TO DRIVE"` iOS audio unlock, and Flip Car (`R`).
> 4. Add AAA Driving Feel (`VehicleController.js`, `ParticlePool.js`): body roll/pitch, Nitro FOV zoom, camera shake, 3 camera modes, drift smoke/sparks.
> 5. Build GTA HUD, Rotating 2D Minimap (`Minimap.js`), **5-Star Police AI** with Line-of-Sight cooldown (`WantedSystem.js`, `PoliceAI.js`), and the **In-Game Smartphone UI** with working Cheat Codes (`9999`, `7777`, `0000`, `5555`).

### PROMPT 2 (DAY 2): Modular Mission Engine, All 20 Story Missions & Extra Retention Layers
> Reference `GAME_MASTER_SPEC_V1.md` (Sections 2, 4, 5, 9). Build the complete mission and retention layer with zero `// TODO` placeholders:
> 1. Build `/src/missions/MissionManager.js` with 3-second GTA radio subtitle intros, countdown timers, glowing 3D checkpoints, GPS minimap routing, vehicle condition/HP bars, Post-Mission screen (Cash + 1–3 Stars, Next Mission Teaser, 2x Cash / Retry Ad CTAs), and **Anti-Rage-Quit** (after 3 fails, silently add +10s or -15% police aggression).
> 2. Implement **all 20 Story Missions (`M1`–`M20`)** in `missionsConfig.js` across Acts 1–4—including M5 Ambush twist, M9 No-Brakes, M10 Zero-Scratch, M14 Blackout Searchlights, M17 Vehicle Switch, M18 60 km/h Bomb, and M20 Finale unlocking **Vortex Apex Gold (C11)** + Infinite Free Roam + **Mirage Valley (City 2)**.
> 3. Build the 4 Extra Retention Layers reusing existing assets: `DailyMissions.js` (3 daily tasks + 7-day streak), `ChallengeModes.js` (1% Ramp, Reverse Race, 1-HP Survival), and `SideHustles.js` (VIP Taxi, Police Vigilante C12, Midnight Ghost Racer secret, 30-min VIP Test-Drive popup).

### PROMPT 3 (DAY 3): Audio, Vega's Garage, Weather, Destructibles & 60 FPS Optimization
> Reference `GAME_MASTER_SPEC_V1.md` (Sections 2, 3, 6, 7, 8). Polish visuals, audio, and 2026 60 FPS performance:
> 1. Build `/src/core/AudioManager.js`: Web Audio dynamic engine pitch (RPM/speed), drift screech, collision thuds, 3D spatial police sirens, UI click feedback, and 3 Radio Stations (*99.5 Neon FM*, *104.2 Drift Radio*, *88.0 Bay Beats*) with full mute/unmute & `visibilitychange` auto-pause.
> 2. Build `/src/vehicles/GarageCustomization.js` for all **12 Cars (`C01`–`C12`)** and **4 Bikes (`B01`–`B04`)** with Paint Colors, **Neon Underglow**, and Turbo/Handling upgrades saved in `SaveManager`.
> 3. Build `WeatherCycle.js` (10-min Day/Sunset/Night/Rain cycle + `THREE.FogExp2`), `Destructibles.js` (pooled lampposts/hydrants/cones), and `PhotoMode.js` (orbit + *NEON BAY: OVERDRIVE* watermark).
> 4. Enforce **Section 8 60 FPS Engineering**: Half-Resolution Selective Bloom (`width/2, height/2`), `THREE.InstancedMesh` (< 50 mobile draw calls), `Low / Medium / High` Graphics Toggle (disabling glass blur on Low), explicit `.dispose()` cleanup (< 150 MB mobile GPU VRAM), `ACESFilmicToneMapping`, and zero GC allocations in the render loop.

### PROMPT 4 (DAY 4): Monetization, Portal SDKs, i18n, QA Sweep, Security & Final Builds
> Reference `GAME_MASTER_SPEC_V1.md` (Sections 1, 6, 8, 9, 10, 12). Finalize monetization, QA, security, and production builds:
> 1. Build `/src/monetization/`: `PortalSDK.js` (Poki/CrazyGames/Capacitor auto-detect, `gameplayStart/Stop`, `happytime`, hide external links in iframes), `AdManager.js` (Rewarded ads for +20s Revive, 2x Cash, VIP Test-Drive, Neon Underglow; Interstitial ONLY after every 2 completed missions; mandatory audio mute & game pause during ads), `IAPManager.js` (`remove_ads`, `unlock_all_vehicles`), and `AnalyticsManager.js`.
> 2. Build `ShareCard.js` (1-tap viral score badge) and `i18n.js` (`en`, `es`, `pt`, `fr`, `de`, `ar`).
> 3. Run a full QA audit: verify all 20 missions, Responsive QA Matrix (`360×640` to `21:9` Ultrawide & cross-origin `<iframe>`), relative case-sensitive asset paths, initial download **< 15 MB**, and zero console errors.
> 4. Add production **JavaScript Obfuscation** + configurable **Domain-Lock** to the Web build, verify V2.0 decoupled hooks in `PROGRESS.md`, and generate both the final Web Portal `/dist` bundle and synced **Capacitor Android/iOS** projects (`npx cap sync`).