# NASIR — Bazaar Stories v0.4.1

An offline stylized Pakistani district game for desktop browsers and Android. No heavy game engine is needed. Open PLAY.bat or index.html in Edge/Chrome. The Unity experiment in Nasir-Unity is separate.

## Five unique missions

1. Pehli Delivery: interact to collect a garments parcel, enter the car, drive a practice gate, park and hand over at the Salon on foot.
2. Bike Trail: ordered motorcycle gates and finish parking. Relaxed mode has no deadline; Normal allows 120 seconds and checkpoint retry.
3. Bazaar Ka Raaz: collect three clues in any order, then solve Blue → Gold → Green at the Salon. Wrong answers explain how to retry.
4. Wash & Shine: park at Kazim Ali Carwash, clean three panels, choose free paint, then precision-park on the west road.
5. Roshan Bazaar: collect festival equipment, deliver by car, restore two cabinets in any order and switch on the festival lights. Replay unlocks at the ending.

## Easy to use

Start with NEW GAME, read one short instruction, press CHALO. Follow gold markers and road arrows. Only the current objective matters. USE is contextual; moving near a handover target does not automatically deliver an item. Parking requires the correct vehicle and low speed.

Default Easy mode has no damage or race deadline. Normal enables melee/civilian response and police patrol/chase/search. Basic combat is non-graphic. Pause has HELP, checkpoint retry, mission restart with confirmation, mission list/replay and settings. HELP can call a ride nearby if you get stuck.

PC: arrows move/steer and accelerate/reverse; Shift runs; Space jumps or brakes; E uses/enters/exits; G shops; H help; R calls a ride; V horn; F punch/B hold block in Normal; C front/follow camera; Q quality; Escape pause.

Phone: left joystick walks in four directions on foot; right swipe moves the camera. The CENTER button restores the follow view. The gold button changes to PICK UP, GET IN, READ, WASH or PAINT. Vehicles have separate GO, BACK and BRAKE holds. WASH/PAINT is also shown when needed in the parked car. GO and steering can be held together. Pause, cancel and mode changes clear held inputs. Landscape only. Large action buttons, subtitles and short English instructions.

## Saving and shops

Versioned browser/WebView localStorage saves objective checkpoints, cash, unlocks, best race, appearance and settings. Continue restores the session; replay preserves campaign completion and gives no duplicate cash rewards. New Game requires confirmation when a save exists. Save errors are reported in the HUD. The earlier prototype save format did not exist and has no progress to migrate.

Alia Batool Garments changes outfit; Alia Batool Salon changes hair/restores health; Nasir Hussain Car Shop offers paint, one-time handling upgrade and ride recovery; Kazim Ali Carwash polishes paint. Mission paint is free. Shop services show prices before purchase.

## Presentation and performance

Original geometric car/character models, textured facades, sunset/evening sky, shops, trees, hill silhouettes, street stalls, traffic, instanced pedestrians, festival lamps, waypoint guidance, engine/horn/footstep and reward tones. No external models/music/downloads are required at runtime. Repeated geometry is batched and NPC parts are instanced. The A52 profile caps render width at 720 by default and targets 30 FPS; High uses 960. Physical A52 frame rate and heating are unverified. No 60 FPS option is promised.

## Validation / build

TASKS.md tracks research, implementation and open physical-device checks.

- npm run test:logic: deterministic campaign checks.
- npm test: browser objective/UI/reload/replay/camera checks.
- npm run test:mobile: trusted CDP multi-touch, cancellation and aspect-ratio checks.
- npm run test:driving: simulated driving-route regression.
- npm run build:web: allowlisted offline bundle into www.
- BUILD-APK.ps1: project-local Java/SDK/Gradle debug build and Android asset sync.

Tests are automated regressions, not a full human playtest. There are no production-quality combat physics, detailed walk-in interiors, rigged animation assets, weather simulation or multiplayer. The game is a compact polished prototype; further art and physical-device testing remain useful.

Original procedural content; Three.js MIT license is bundled in vendor/THREE-LICENSE.txt. Capacitor is bundled by the Android build. Previous game source/APK backup: backups/before-five-missions.

Usability audit v0.4.1: settings-only Continue, mobile carwash actions, Back routing, stale restart state, multi-finger throttle release and keyboard slider handling fixed. Menus stop the car; context loss shows recovery instructions. Run npm run test:all for the recorded regression suite. See TASKS.md for remaining physical-device and first-time-player checks.

Mobile Low now uses scheduled frame pacing and cached static shadows with contact shadows for moving actors. High retains dynamic shadow maps. A short headless PC touch-emulation sample observed 30 FPS; see tests/render-diagnostics.json for scope. This does not certify A52 performance.
