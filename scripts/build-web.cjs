'use strict';
const fs = require('fs');
const path = require('path');
const { obfuscateDist } = require('./obfuscate-dist.cjs');

const root = path.resolve(__dirname, '..');
const dest = path.join(root, 'www');

// Clean www/ first so zero stale or legacy files ever remain in www/
if (path.resolve(dest) !== path.join(root, 'www')) throw new Error('Unsafe build output path');
fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(path.join(dest, 'vendor'), { recursive: true });
fs.mkdirSync(path.join(dest, 'chunks'), { recursive: true });
fs.mkdirSync(path.join(dest, 'src', 'ui'), { recursive: true });

function wrapEsmModule(relPath, exportNames, preamble = '') {
  const src = fs.readFileSync(path.join(root, relPath), 'utf8');
  const body = src
    .replace(/^\s*import\s+[\s\S]*?from\s+['"][^'"]+['"];\s*$/gm, '')
    .replace(/^\s*export\s+default\s+[^;]+;\s*$/gm, '')
    .replace(/^(\s*)export\s+(?=(const|let|var|function|class)\b)/gm, '$1');
  return `(() => {\n${preamble ? preamble + '\n' : ''}${body}\nreturn { ${exportNames.join(', ')} };\n})()`;
}

// 1. Core Foundation & Driving Controls
const eventBusWrapped = wrapEsmModule('src/core/EventBus.js', ['EVENTS', 'EventBus', 'eventBus']);
const saveMgrWrapped = wrapEsmModule(
  'src/core/SaveManager.js',
  ['SAVE_KEY', 'SCHEMA_VERSION', 'VALID_CAR_IDS', 'VALID_BIKE_IDS', 'STARTER_CARS', 'STARTER_BIKES', 'VALID_MISSION_IDS', 'VALID_QUALITIES', 'VALID_LANGUAGES', 'createDefaultSave', 'SaveManager', 'saveManager'],
  'const defaultEventBus = EventBusModule.eventBus;\nconst EVENTS = EventBusModule.EVENTS;'
);
const gameStateWrapped = wrapEsmModule(
  'src/core/GameState.js',
  ['STATES', 'VALID_TRANSITIONS', 'GameState', 'gameState'],
  'const defaultEventBus = EventBusModule.eventBus;\nconst EVENTS = EventBusModule.EVENTS;'
);
const inputWrapped = wrapEsmModule(
  'src/core/InputManager.js',
  ['applyDeadzone', 'InputManager'],
  'const defaultEventBus = EventBusModule.eventBus;\nconst EVENTS = EventBusModule.EVENTS;'
);
const drivingJuiceWrapped = wrapEsmModule(
  'src/garage/DrivingJuice.js',
  [
    'BASE_FOV',
    'NITRO_FOV',
    'MEGA_RAMP_SLOWMO_SCALE',
    'MEGA_RAMP_SLOWMO_DURATION',
    'computeDynamicFov',
    'CameraShake',
    'SlowMotionController',
    'ParticlePool',
    'flipCar'
  ],
  'const defaultEventBus = EventBusModule.eventBus;\nconst EVENTS = EventBusModule.EVENTS;'
);

// 2. Garage, Smartphone & Photo Mode
const garageWrapped = wrapEsmModule('src/garage/GarageManager.js', ['VEHICLE_ROSTER', 'PAINT_PRESETS', 'NEON_PRESETS', 'TURBO_UPGRADE_COSTS', 'normalizeVehicleMeshScale', 'GarageManager']);
const smartphoneWrapped = wrapEsmModule('src/ui/Smartphone.js', ['CHEAT_CODES', 'RADIO_STATIONS_SPEC', 'PHONE_APPS', 'Smartphone']);
const photoModeWrapped = wrapEsmModule('src/ui/PhotoMode.js', ['PHOTO_WATERMARK_TEXT', 'PhotoMode']);
const featuresWiringWrapped = wrapEsmModule('src/ui/features-runtime-wiring.js', ['initRuntimeFeatures']);

// 3. Audio & Performance Engineering
const audioWrapped = wrapEsmModule('src/audio/AudioManager.js', ['NEON_RADIO_STATIONS', 'computeEngineRpmPitch', 'AudioManager']);
const perfWrapped = wrapEsmModule('src/core/PerformanceManager.js', ['VRAM_BUDGET_MB', 'BUNDLE_BUDGET_MB', 'QUALITY_PRESETS', 'normalizeQualityId', 'disposeObject3D', 'HalfResBloomPass', 'VehicleResourceManager', 'InstancedPropBatcher', 'LazyChunkLoader', 'estimateGpuVramMB', 'PerformanceManager']);
const audioPerfWiringWrapped = wrapEsmModule('src/core/audio-perf-runtime-wiring.js', ['initRuntimeAudioPerf']);

// 4. Living Open World (1-5★ Police, Pooled Traffic, Destructibles, Vehicle Damage, EnvironmentFX)
const policeWrapped = wrapEsmModule('src/world/PoliceManager.js', ['POLICE_POOL_LIMITS', 'WANTED_TIERS', 'computeRubberBandSpeed', 'computePitManeuver', 'PoliceManager']);
const trafficWrapped = wrapEsmModule('src/world/TrafficManager.js', ['TRAFFIC_VARIANTS', 'TrafficManager']);
const destructiblesWrapped = wrapEsmModule('src/world/Destructibles.js', ['PROP_TYPES', 'DestructiblesManager']);
const damageWrapped = wrapEsmModule('src/world/VehicleDamage.js', ['DAMAGE_STATES', 'FIRE_EJECT_DURATION', 'classifyDamageState', 'VehicleDamageController']);
const envFxWrapped = wrapEsmModule('src/world/EnvironmentFX.js', ['NEON_STUNT_RAMPS', 'hourToDuskFactor', 'EnvironmentFX']);
const worldWiringWrapped = wrapEsmModule('src/world/world-runtime-wiring.js', ['initRuntimeWorld']);

// 5. Story Campaign (20 Missions), Daily Missions, Viral Challenges, Side Hustles & Easter Eggs
const missionsCfgWrapped = wrapEsmModule('src/missions/missionsConfig.js', ['PLAYABLE_BOUNDS', 'VALID_MISSION_VEHICLE_IDS', 'ACT_1_MISSIONS', 'ACT_2_MISSIONS', 'ACT_3_MISSIONS', 'ACT_4_MISSIONS', 'STORY_MISSIONS', 'MISSION_MAP', 'getMissionById', 'hasNoNaN', 'isPointInPlayableBounds', 'validateMissionSchema']);
const missionMgrWrapped = wrapEsmModule('src/missions/MissionManager.js', ['MISSION_STATES', 'ASSIST_FAIL_THRESHOLD', 'ASSIST_BONUS_TIME_SEC', 'ASSIST_POLICE_AGGRESSION_MULT', 'computeStarRating', 'MissionManager']);
const dailyMissionsWrapped = wrapEsmModule('src/missions/DailyMissions.js', ['STREAK_REWARD_DAYS', 'STREAK_REWARD_SKIN', 'DAILY_TASK_POOL', 'todayISODate', 'generateDailyMissions', 'validateDailyTasks', 'DailyMissionManager']);
const challengeModesWrapped = wrapEsmModule('src/missions/ChallengeModes.js', ['CHALLENGE_STATES', 'CHALLENGE_MODES', 'CHALLENGE_MAP', 'validateChallengeSchema', 'ChallengeModeManager']);
const sideHustlesWrapped = wrapEsmModule('src/missions/SideHustles.js', ['SIDE_HUSTLE_TYPES', 'VIP_TEST_DRIVE_CONFIG', 'EASTER_EGGS', 'VIP_TAXI_STOPS', 'validateEasterEggSchema', 'SideHustleManager']);
const missionsWiringWrapped = wrapEsmModule('src/missions/missions-runtime-wiring.js', ['initRuntimeMissions']);

// 6. Miami Neon Glassmorphism HUD, Rotating 2D GPS Minimap & Touch Controls
const hudWrapped = wrapEsmModule('src/ui/HUD.js', ['NEON_DISTRICTS', 'PORTRAIT_FOV_MIN_BONUS', 'PORTRAIT_FOV_MAX_BONUS', 'resolveNeonDistrict', 'resolveNeonStreet', 'computeResponsiveFov', 'formatCash', 'formatWantedStars', 'computeLayoutMode', 'HUD']);
const minimapWrapped = wrapEsmModule('src/ui/Minimap.js', ['MINIMAP_DISTRICTS', 'computeMinimapTransform', 'Minimap']);
const touchWrapped = wrapEsmModule('src/ui/TouchControls.js', ['TouchControls']);
const uiWiringWrapped = wrapEsmModule('src/ui/runtime-wiring.js', ['initRuntimeUI']);

// 7. Monetization (AdManager), Multi-Language i18n (6 Locales) & Viral Score Card
const adMgrWrapped = wrapEsmModule('src/monetization/AdManager.js', ['PORTAL_PLATFORMS', 'REWARDED_PLACEMENTS', 'INTERSTITIAL_MISSION_INTERVAL', 'detectPortalPlatform', 'isInsideIframe', 'AdManager']);
const i18nWrapped = wrapEsmModule('src/i18n/i18n.js', ['SUPPORTED_LOCALES', 'LOCALE_META', 'TRANSLATIONS', 'normalizeLocaleCode', 'validateI18nCatalog', 'I18nManager']);
const shareCardWrapped = wrapEsmModule('src/ui/ShareCard.js', ['SHARE_CARD_WIDTH', 'SHARE_CARD_HEIGHT', 'computePlayerRankBadge', 'ShareCardGenerator']);
const releaseWiringWrapped = wrapEsmModule('src/monetization/release-runtime-wiring.js', ['initRuntimeRelease']);

// 8. Master V1.0 Orchestrator (`src/main.js`)
const mainWrapped = wrapEsmModule('src/main.js', ['initNeonBayApp']);

const neonAppBundle = `/* Auto-generated by scripts/build-web.cjs — NEON BAY: OVERDRIVE Unified V1.0 Bundle */
(function(root){
'use strict';
const EventBusModule = ${eventBusWrapped};
const SaveManagerModule = ${saveMgrWrapped};
const GameStateModule = ${gameStateWrapped};
const CoreModules = Object.assign({}, EventBusModule, SaveManagerModule, GameStateModule);
const InputModule = ${inputWrapped};
const DrivingJuiceModule = ${drivingJuiceWrapped};
const GarageModule = ${garageWrapped};
const PhoneModule = ${smartphoneWrapped};
const PhotoModule = ${photoModeWrapped};
const FeaturesWiringModule = ${featuresWiringWrapped};
const AudioModule = ${audioWrapped};
const PerfModule = ${perfWrapped};
const AudioPerfWiringModule = ${audioPerfWiringWrapped};
const PoliceModule = ${policeWrapped};
const TrafficModule = ${trafficWrapped};
const DestructiblesModule = ${destructiblesWrapped};
const DamageModule = ${damageWrapped};
const EnvFXModule = ${envFxWrapped};
const WorldWiringModule = ${worldWiringWrapped};
const MissionsConfigModule = ${missionsCfgWrapped};
const MissionManagerModule = ${missionMgrWrapped};
const DailyMissionsModule = ${dailyMissionsWrapped};
const ChallengeModesModule = ${challengeModesWrapped};
const SideHustlesModule = ${sideHustlesWrapped};
const MissionsWiringModule = ${missionsWiringWrapped};
const HUDModule = ${hudWrapped};
const MinimapModule = ${minimapWrapped};
const TouchModule = ${touchWrapped};
const UIWiringModule = ${uiWiringWrapped};
const AdModule = ${adMgrWrapped};
const I18nModule = ${i18nWrapped};
const ShareModule = ${shareCardWrapped};
const ReleaseWiringModule = ${releaseWiringWrapped};
const MainModule = ${mainWrapped};

root.NeonUIModules = Object.assign({}, HUDModule, MinimapModule, TouchModule);
root.NeonWorldModules = Object.assign({}, PoliceModule, TrafficModule, DestructiblesModule, DamageModule, EnvFXModule);
root.NeonFeatureModules = Object.assign({}, CoreModules, InputModule, DrivingJuiceModule, GarageModule, PhoneModule, PhotoModule);
root.NeonMissionModules = Object.assign({}, MissionsConfigModule, MissionManagerModule, DailyMissionsModule, ChallengeModesModule, SideHustlesModule);
root.NeonAudioPerfModules = Object.assign({}, AudioModule, PerfModule);
root.NeonReleaseModules = Object.assign({}, AdModule, I18nModule, ShareModule);

root.NeonApp = MainModule.initNeonBayApp({
  CoreModules,
  InputModule,
  DrivingJuiceModule,
  GarageModule,
  PhoneModule,
  PhotoModule,
  FeaturesWiringModule,
  AudioModule,
  PerfModule,
  AudioPerfWiringModule,
  PoliceModule,
  TrafficModule,
  DestructiblesModule,
  DamageModule,
  WorldWiringModule,
  EnvFXModule,
  HUDModule,
  MinimapModule,
  UIWiringModule,
  TouchModule,
  MissionsConfigModule,
  MissionManagerModule,
  DailyMissionsModule,
  ChallengeModesModule,
  SideHustlesModule,
  MissionsWiringModule,
  AdModule,
  I18nModule,
  ShareModule,
  ReleaseWiringModule,
  win: root,
  doc: root.document
});
})(globalThis);
`;

fs.writeFileSync(path.join(root, 'neon-app-bundle.js'), neonAppBundle, 'utf8');

// Copy ONLY active V1.0 runtime files into www/
const runtimeFiles = [
  'index.html',
  'manifest.json',
  'assets/app-icon-1024.png',
  'src/ui/hud.css',
  'vendor/three.min.js',
  'vendor/THREE-LICENSE.txt',
  'city-layout.js',
  'game.js',
  'models.js',
  'world3d.js',
  'polish.js',
  'city.js',
  'vehicle-models.js',
  'neon-app-bundle.js',
  'chunks/neon-lazy-pack.js'
];

for (const name of runtimeFiles) {
  const dstFile = path.join(dest, name);
  fs.mkdirSync(path.dirname(dstFile), { recursive: true });
  fs.copyFileSync(path.join(root, name), dstFile);
}

// Relative & Case-Sensitive Asset Path Audit (iframe & Linux CDN safe)
function verifyExactCasePath(baseDir, relPath) {
  if (!relPath || /^(https?:|file:|\/\/|\/)/i.test(relPath)) return 'Non-relative URL: ' + relPath;
  const clean = relPath.split('?')[0].split('#')[0];
  const segs = clean.split('/').filter(Boolean);
  let cur = baseDir;
  for (const seg of segs) {
    if (!fs.existsSync(cur)) return 'Missing parent dir for: ' + relPath;
    const entries = fs.readdirSync(cur);
    if (!entries.includes(seg)) return `Case/file mismatch for "${seg}" in ${relPath}`;
    cur = path.join(cur, seg);
  }
  return null;
}

const htmlText = fs.readFileSync(path.join(dest, 'index.html'), 'utf8');
const refs = [];
for (const m of htmlText.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)) {
  const val = m[1];
  if (!val.startsWith('data:')) refs.push(val);
}
const pathViolations = [];
for (const ref of refs) {
  const err = verifyExactCasePath(dest, ref);
  if (err) pathViolations.push(err);
}
const pathAudit = { checkedRefs: refs, violations: pathViolations, valid: pathViolations.length === 0 };
fs.writeFileSync(path.join(dest, 'path-audit.json'), JSON.stringify(pathAudit, null, 2));
if (!pathAudit.valid) throw new Error('Asset path audit failed: ' + pathViolations.join('; '));

// Production bundle size audit (< 15 MB budget)
const filesAudit = runtimeFiles.map((f) => {
  const sz = fs.statSync(path.join(dest, f)).size;
  return {
    file: f,
    bytes: sz,
    kb: Math.round((sz / 1024) * 10) / 10,
    isLazy: f.startsWith('chunks/'),
    isRuntimeBoot: !f.startsWith('chunks/')
  };
});
const totalBytes = filesAudit.reduce((s, x) => s + x.bytes, 0);
const initialBootBytes = filesAudit.filter((x) => x.isRuntimeBoot).reduce((s, x) => s + x.bytes, 0);
const lazyBytes = filesAudit.filter((x) => x.isLazy).reduce((s, x) => s + x.bytes, 0);
const auditReport = {
  budgetMB: 15,
  totalBytes,
  totalMB: Math.round((totalBytes / 1048576) * 1000) / 1000,
  initialBootBytes,
  initialBootMB: Math.round((initialBootBytes / 1048576) * 1000) / 1000,
  lazyBytes,
  withinBudget: totalBytes < 15 * 1048576,
  fileCount: filesAudit.length,
  largestFiles: [...filesAudit].sort((a, b) => b.bytes - a.bytes).slice(0, 10)
};
fs.writeFileSync(path.join(dest, 'bundle-audit.json'), JSON.stringify(auditReport, null, 2));
if (!auditReport.withinBudget) throw new Error(`Bundle exceeded 15 MB cap: ${auditReport.totalMB} MB`);

// Production Obfuscated & Domain-Locked /dist Build
const distDir = path.join(root, 'dist');
const distRes = obfuscateDist({ rootDir: root, wwwDir: dest, distDir });

// Automated dist/ Legacy-String & Unused-Chunk Verification Audit
const BANNED_LEGACY_PATTERNS = [
  { name: 'Nasir', regex: /\bNasir\b/i },
  { name: 'BazaarStory', regex: /\bBazaarStory\b/i },
  { name: 'Bazaar City', regex: /Bazaar\s+City/i },
  { name: 'Raja District/Market/Bazaar', regex: /\bRaja\s+(?:District|Market|Bazaar|Chowk|Dhaba|Festival)\b/i },
  { name: 'Alia Batool', regex: /\bAlia\s+Batool\b/i },
  { name: 'Kazim Ali', regex: /\bKazim\s+Ali\b/i },
  { name: 'Rawalpindi', regex: /\bRawalpindi\b/i },
  { name: 'Punjab Police', regex: /\bPunjab\s+Police\b/i },
  { name: 'Noor Market', regex: /\bNoor\s+Market\b/i },
  { name: 'A favour for an old friend', regex: /A\s+favour\s+for\s+an\s+old\s+friend/i },
  { name: 'Grand Theft Auto', regex: /Grand\s+Theft\s+Auto/i },
  { name: 'Vice City', regex: /Vice\s+City/i },
  { name: 'Rockstar', regex: /\bRockstar\b/i },
  { name: 'Lamborghini', regex: /\bLamborghini\b/i },
  { name: 'Ferrari', regex: /\bFerrari\b/i },
  { name: 'Bavaria M4', regex: /\bBavaria\s+M4\b/i }
];

const legacyViolations = [];
function scanDistTextFiles(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'vendor') continue;
      scanDistTextFiles(full);
      continue;
    }
    if (!/\.(html|js|css)$/i.test(ent.name)) continue;
    const rel = path.relative(distDir, full).replace(/\\/g, '/');
    const txt = fs.readFileSync(full, 'utf8');
    for (const pat of BANNED_LEGACY_PATTERNS) {
      if (pat.regex.test(txt)) {
        legacyViolations.push(`${rel}: matched banned legacy pattern "${pat.name}"`);
      }
    }
  }
}
scanDistTextFiles(distDir);
if (legacyViolations.length > 0) {
  throw new Error('Legacy strings found in dist/: ' + legacyViolations.join('; '));
}

console.log(
  `Bundled NEON BAY: OVERDRIVE V1.0 in www/ (${auditReport.fileCount} files, initialBoot=${auditReport.initialBootMB} MB, total=${auditReport.totalMB} MB < 15 MB, paths=${pathAudit.checkedRefs.length} OK) & dist/ (${distRes.obfuscatedCount} obfuscated JS, ${distRes.totalMB} MB, 0 legacy strings, syntaxVerified=${distRes.syntaxVerified}).`
);
