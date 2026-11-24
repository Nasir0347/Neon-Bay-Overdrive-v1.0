# Samsung Galaxy A52 build

This is a stylized offline game prototype, not an AAA or photorealistic release.

## Mobile controls

Landscape only. Left joystick moves forward/back and steers. Swipe the central/right area to look around on foot. RUN and BLOCK are hold buttons. PUNCH, SHOP and RIDE are tap actions. JUMP changes to BRAKE in a vehicle; brake is a hold action. RIDE changes to EXIT. Pause clears all touches. CAM toggles front/follow camera. LOW/HIGH switches quality.

## A52 profile

Touch devices default to a maximum render width of 720 pixels, 512-pixel shadow maps and a 30 FPS frame cap. HIGH increases rendering to 960 pixels and shadow maps to 1024. These are targets/settings, not measured performance on a physical A52. The 4 GB RAM variant is the conservative target. The actual phone still needs testing for frame rate, thermals and Android WebView rendering.

## Android project

Capacitor 8.6.2 wraps locally bundled game files. App ID: `com.nasir.bazaarrun`. Minimum Android API 24. Landscape orientation, immersive system bars, custom launcher/splash mark, pause on background, and Android Back pauses the game (Back from the menu exits).

`npm run build:web` copies an explicit runtime-file allowlist into `www`. `npm run android:sync` updates native assets. `.toolchain` contains project-local build tools, avoiding a machine-wide Java/SDK installation. `BUILD-APK.ps1` builds a debug-signed APK for testing, not a Play Store release. No account, ads, analytics or remote game assets are included.

## Validation

`npm test`: desktop mechanics and missions.
`npm run test:mobile`: emulated touch mode, joystick plus run/brake, camera swipe, motorcycle, punch/block, cancel/pause cleanup, 44px+ action targets, portrait guard and page-error checks.

Mobile emulation cannot certify physical-phone performance. Portrait changes pause the game. Refresh/relaunch currently starts a new game; progress saving is not implemented.

## Phone installation after a successful APK build

Copy `releases/Nasir-Bazaar-Run-A52.apk` to the phone with USB or a file-transfer service. Open it in Samsung My Files and permit installation from that source when Android asks. Install and launch NASIR. Allowing unknown-app installation is needed only for the file source you use; Play Store publishing is a separate step.

## Completed build
`releases/Nasir-Bazaar-Run-A52.apk` compiled successfully and passed apksigner verification (v2 signature). Packaged game assets match the tested web bundle. File checksum and size are in releases/build-verification.json. Physical device testing remains outstanding.


## v0.4 five-mission update

The current game is NASIR — Bazaar Stories, with five unique missions, local saves, Relaxed/Normal options, multi-touch gas/steering, camera collision avoidance, interactive puzzle/carwash/paint and a festival ending. See README.md and TASKS.md for controls and verification scope. Android Back now delegates to the game's panel/menu navigation before exiting from the main menu. Previous documentation about only two chapters is superseded by this update.

Current APK: releases/Nasir-Bazaar-Stories-A52.apk (v0.4.0, versionCode 2), debug-signed and verified. The older filename Nasir-Bazaar-Run-A52.apk is an identical compatibility copy. Install the new APK over the prior app when Android offers Update. Keep the app installed to preserve its local save. Physical phone testing is outstanding.

## Usability update v0.4.1
English-only instructions, four-direction foot movement, CENTER camera, fewer contextual buttons, and touch WASH/PAINT are included. Menus stop the vehicle. Back navigation, save/retry, muted sound and interrupted input have regression coverage. App versionCode is 3. Install as an update over v0.4.0 to keep the existing campaign. Physical device tests remain unperformed.
