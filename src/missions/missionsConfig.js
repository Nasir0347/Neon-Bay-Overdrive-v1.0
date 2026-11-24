/**
 * Master Campaign Configuration for NEON BAY: OVERDRIVE (20 Missions / 4 Acts).
 * Pure zero-import ES Module compatible with browser & Node.js tests.
 * Synchronized across the 2000m x 2000m 4-District Open World:
 *   - Apex Core (x: -450..450, z: -450..450) — Solaris Tower, Titan National Bank, Police HQ
 *   - Palm Strip (z < -450) — Pier 99 (0,-910), Palm Strip Beach Sand (z <= -840)
 *   - Iron Docks (x < -450) — Iron Docks Terminal (-600,0), East Docks (600,300)
 *   - Bayview Heights (z > 450 & Airport) — Vega's Garage (0,420), Mega-Ramp (0,600), Airport Runway (750,-260..260)
 */

export const PLAYABLE_BOUNDS = Object.freeze({
  minX: -980,
  maxX: 980,
  minZ: -975,
  maxZ: 980
});

export const VALID_MISSION_VEHICLE_IDS = Object.freeze([
  'C01', 'C02', 'C03', 'C04', 'C05', 'C06', 'C07', 'C08', 'C09', 'C10', 'C11', 'C12',
  'B01', 'B02', 'B03', 'B04'
]);

export function isPointInPlayableBounds(pt) {
  if (!pt || !Number.isFinite(pt.x) || !Number.isFinite(pt.z)) return false;
  return (
    pt.x >= PLAYABLE_BOUNDS.minX &&
    pt.x <= PLAYABLE_BOUNDS.maxX &&
    pt.z >= PLAYABLE_BOUNDS.minZ &&
    pt.z <= PLAYABLE_BOUNDS.maxZ
  );
}

export function hasNoNaN(val) {
  if (typeof val === 'number') return Number.isFinite(val);
  if (Array.isArray(val)) return val.every((item) => hasNoNaN(item));
  if (val && typeof val === 'object') return Object.values(val).every((v) => hasNoNaN(v));
  return true;
}

export const ACT_1_MISSIONS = Object.freeze([
  {
    id: 'M1',
    number: 1,
    act: 1,
    title: 'Neon Midnight Drop',
    chapterTag: 'ACT 1 · NIGHT COURIER',
    storyHook: 'An encrypted syndicate ledger surfaced at midnight. Reach Pier 99 before NBPD traces the signal — then walk the drop inside.',
    steps: [
      'Speed south down Oceanic Blvd through 3 Marina gates',
      'Exit car (E) & walk inside Pier 99 Lounge',
      'Shake any late 1-Star patrol spotlight on approach'
    ],
    midComms: {
      onFoot: { speaker: 'Fixer', color: '#00f0ff', line: 'Pier 99 Lounge doors unlocked ahead — step out of the car and hand over the ledger inside!' },
      twist: { speaker: 'Rico Vega', color: '#ff007f', line: 'Scanner just spiked — 1-Star cruiser locking onto Oceanic Blvd! Move fast!' }
    },
    vehicleId: 'C01',
    timeLimitSec: 60,
    rewardCash: 600,
    starThresholds: { threeStarSec: 20, twoStarSec: 8, minConditionPct: 0 },
    objectiveSummary: 'Pier 99 Drop — deliver the encrypted ledger south down Oceanic Blvd, park & walk inside Pier 99 Lounge.',
    nextTeaser: 'M2 unlocks next: rain-slicked drifting across Apex Core intersections.',
    spawn: { x: 0, z: 0, yaw: Math.PI },
    dialogue: [
      { speaker: 'Rico Vega', color: '#00f0ff', line: 'Engines warm on Oceanic Boulevard. Keeping eyes open for NBPD on the Marina strip.' },
      { speaker: 'Fixer', color: '#ff007f', line: 'Reach Pier 99 within 60s, exit your car [E] and walk the ledger inside Pier 99 Lounge!' }
    ],
    checkpoints: [
      { id: 'm1_cp1', label: 'Midtown Oceanic Blvd', x: 0, z: -300, radius: 14 },
      { id: 'm1_cp2', label: 'Sunset Strip Arch', x: 0, z: -600, radius: 14 },
      { id: 'm1_pier99', label: 'Pier 99 Entrance', x: 0, z: -875, radius: 16 },
      {
        id: 'm1_lounge',
        label: 'Pier 99 Lounge Interior',
        x: 24,
        z: -875,
        radius: 7.5,
        requiresOnFoot: true,
        buildingId: 'pier99Lounge',
        buildingLabel: 'PIER 99 LOUNGE',
        enterHint: 'Park & EXIT CAR (E) -> Walk inside Pier 99 Lounge!',
        isFinish: true
      }
    ],
    mechanics: {
      type: 'late_cop_drop',
      triggerRemainingSec: 15,
      lateCopAtRemainingSec: 15,
      triggerWantedStars: 1,
      lateCopStars: 1
    }
  },
  {
    id: 'M2',
    number: 2,
    act: 1,
    title: 'Street Heat Drift',
    chapterTag: 'ACT 1 · RAIN & SIDEWAYS',
    storyHook: 'Tropical downpour slicks Apex Core tarmac. Prove Rico owns the corners while tagging 5 encrypted relay intersections.',
    steps: [
      'Hit Space / Drift button in wet intersections',
      'Tag 5 glowing Apex Core zones & score 1,000+ pts'
    ],
    midComms: {
      halfway: { speaker: 'Fixer', color: '#00f0ff', line: 'Rain sensors picking up serious tire smoke — keep sliding cleanly between corners!' }
    },
    vehicleId: 'C02',
    timeLimitSec: 75,
    rewardCash: 900,
    starThresholds: { threeStarSec: 18, twoStarSec: 7, minConditionPct: 0 },
    objectiveSummary: 'Slide through 5 Apex Core drift zones and hit 1,000 drift points in the wet.',
    nextTeaser: 'M3 unlocks next: Shadow Alley rooftops & slow-mo ramp jumps.',
    spawn: { x: 0, z: 0, yaw: Math.PI / 2 },
    dialogue: [
      { speaker: 'Rico Vega', color: '#00f0ff', line: 'Neon rain is pouring on Apex Core tarmac. Time to throw the Drift-R sideways.' },
      { speaker: 'Fixer', color: '#ff007f', line: 'Tag 5 glow intersections while holding Space/Brake in turns to clear 1,000 points!' }
    ],
    checkpoints: [
      { id: 'm2_z1', label: 'Central Boulevard East', x: 300, z: 0, radius: 26, isDriftZone: true },
      { id: 'm2_z2', label: 'South Apex Corner', x: 300, z: 300, radius: 26, isDriftZone: true },
      { id: 'm2_z3', label: 'Titan Bank Plaza', x: 0, z: 300, radius: 26, isDriftZone: true },
      { id: 'm2_z4', label: 'West Crosstown Corner', x: -300, z: 300, radius: 26, isDriftZone: true },
      { id: 'm2_z5', label: 'Shadow Alley Hairpin', x: -300, z: 0, radius: 26, isDriftZone: true },
      { id: 'm2_z6', label: 'Solaris Finish Corner', x: 0, z: 0, radius: 26, isDriftZone: true }
    ],
    mechanics: {
      type: 'rain_drift',
      targetDriftScore: 1000,
      driftZonesRequired: 5,
      driftScoreRate: 280,
      zoneBonusPoints: 220
    }
  },
  {
    id: 'M3',
    number: 3,
    act: 1,
    title: 'Alleyway Phantom',
    chapterTag: 'ACT 1 · ROOFTOP FLIGHT',
    storyHook: 'NBPD blockades seal Sunset Strip. Boost off the Neon Ramp in slow-motion flight and ghost back to Vega’s Garage.',
    steps: [
      'Hit Shadow Alley Stunt Ramp at speed for 1.5s Slow-Mo air',
      "Thread West Gate & Titan Turn back to Vega's Garage"
    ],
    midComms: {
      ramp: { speaker: 'Rico Vega', color: '#00f0ff', line: 'Clean launch over Sunset blockade! Dropping straight down toward Bayview!' }
    },
    vehicleId: 'C04',
    timeLimitSec: 60,
    rewardCash: 1100,
    starThresholds: { threeStarSec: 18, twoStarSec: 7, minConditionPct: 0 },
    objectiveSummary: "Launch the Shadow Alley ramp in slow-mo and reach Vega's Garage.",
    nextTeaser: 'M4 unlocks next: trigger a 2-star NBPD decoy siren outside Solaris Tower.',
    spawn: { x: -300, z: -300, yaw: 0 },
    dialogue: [
      { speaker: 'Rico Vega', color: '#00f0ff', line: 'Patrol cruisers are sealing Sunset Strip. Taking the Shadow Alley ramp shortcut.' },
      { speaker: 'Fixer', color: '#ff007f', line: "Punch nitrous up the ramp, nail the landing, and park at Vega's Garage." }
    ],
    checkpoints: [
      { id: 'm3_ramp1', label: 'Shadow Alley Stunt Ramp', x: -300, z: -180, radius: 15, isRamp: true },
      { id: 'm3_cp2', label: 'West Iron Gate', x: -300, z: 0, radius: 15 },
      { id: 'm3_cp3', label: 'Titan Bank Turn', x: 0, z: 300, radius: 15 },
      { id: 'm3_end', label: "Vega's Garage", x: 0, z: 420, radius: 16, isFinish: true }
    ],
    mechanics: {
      type: 'alley_stunt',
      rampsRequired: 1,
      slowMoSec: 1.5
    }
  },
  {
    id: 'M4',
    number: 4,
    act: 1,
    title: 'The Decoy Siren',
    chapterTag: 'ACT 1 · INSIDE SOLARIS',
    storyHook: 'Infiltrate Solaris Tower lobby on foot, trip the decoy transponder, and pull a whole NBPD wing off the cartel pier.',
    steps: [
      'Exit car (E) & walk inside Solaris Tower Lobby',
      'Trip the Vault relay, grab your V8 & survive 45s pursuit'
    ],
    midComms: {
      twist: { speaker: 'Fixer', color: '#ff007f', line: 'Decoy relay live! Every NBPD unit in Midtown is converging — burn rubber for 45 seconds!' }
    },
    vehicleId: 'C03',
    timeLimitSec: 90,
    rewardCash: 1400,
    starThresholds: { threeStarSec: 15, twoStarSec: 5, minConditionPct: 0 },
    objectiveSummary: 'Enter Solaris Tower Lobby on foot to trip the decoy relay, then survive 45s of 2-star pursuit.',
    nextTeaser: 'M5 unlocks next: cartel ambush in the Iron Docks shipping yard.',
    spawn: { x: 300, z: 0, yaw: -Math.PI / 2 },
    dialogue: [
      { speaker: 'Fixer', color: '#ff007f', line: 'Park outside Solaris Tower, step out on foot [E] and trip the lobby Vault relay!' },
      { speaker: 'Rico Vega', color: '#00f0ff', line: 'Relay tripped — hopping back in the V8 and weaving through Apex Core for 45 seconds.' }
    ],
    checkpoints: [
      {
        id: 'm4_vault',
        label: 'Solaris Tower Lobby',
        x: 52,
        z: 52,
        radius: 8,
        requiresOnFoot: true,
        buildingId: 'solarisTower',
        buildingLabel: 'SOLARIS TOWER LOBBY',
        enterHint: 'Park outside Solaris Tower -> EXIT CAR (E) & walk inside to trip the relay!'
      }
    ],
    mechanics: {
      type: 'decoy_siren',
      triggerWantedStars: 2,
      surviveSec: 45
    }
  },
  {
    id: 'M5',
    number: 5,
    act: 1,
    title: 'Ambush at the Docks',
    chapterTag: 'ACT 1 FINALE · IRON TRAP',
    storyHook: 'The cargo pickup is a cartel setup. When heavy black SUVs box your nose in the alley, whip into REVERSE and escape!',
    steps: [
      'Drive into Iron Docks Terminal pickup zone',
      'Slam REVERSE to clear the 3 blocking SUVs',
      "Outrun 2-Star heat back to Vega's Garage"
    ],
    midComms: {
      trap: { speaker: 'Rico Vega', color: '#ff007f', line: 'Black SUVs pinned the front gate — throwing the V8 in REVERSE right now!' },
      cleared: { speaker: 'Fixer', color: '#00f0ff', line: "Clean reversal! Floor it east off the docks and get back to Vega's Garage!" }
    },
    vehicleId: 'C03',
    timeLimitSec: 90,
    rewardCash: 1800,
    starThresholds: { threeStarSec: 22, twoStarSec: 9, minConditionPct: 0 },
    objectiveSummary: "Reach Iron Docks pickup — when SUVs box your nose, REVERSE out to Vega's Garage!",
    nextTeaser: 'ACT 2 unlocks next: ram & hijack Rogue Hacker Zed in Midtown.',
    spawn: { x: 0, z: 300, yaw: -Math.PI / 2 },
    dialogue: [
      { speaker: 'Fixer', color: '#ff007f', line: 'Syndicate cargo manifest is waiting inside Iron Docks Terminal. Stay sharp.' },
      { speaker: 'Rico Vega', color: '#00f0ff', line: "If they block the exit ahead, I'll throw it in REVERSE and burn rubber east!" }
    ],
    checkpoints: [
      { id: 'm5_trap', label: 'Iron Docks Terminal Pickup', x: -600, z: 0, radius: 18 },
      { id: 'm5_safe', label: "Vega's Garage", x: 0, z: 420, radius: 18, isFinish: true }
    ],
    mechanics: {
      type: 'ambush_escape',
      ambushFlashText: "IT'S A TRAP! REVERSE OUT & ESCAPE!",
      ambushWantedStars: 2,
      reverseClearDistance: 12,
      escapeGoal: { x: 0, z: 420, radius: 18, label: "Vega's Garage" }
    }
  }
]);

export const ACT_2_MISSIONS = Object.freeze([
  {
    id: 'M6',
    number: 6,
    act: 2,
    title: 'Hijack the Hacker',
    chapterTag: 'ACT 2 · SYNDICATE CIPHER',
    storyHook: "Rogue hacker Zed bolted with our vault keys. Slam his blue Solstice GT-R until its HP drops to zero, then take the wheel!",
    steps: [
      "Chase & ram Zed's Blue Sports Car to 0% HP (~4 hits)",
      "Drive Zed's hijacked coupe straight to Vega's Garage"
    ],
    midComms: {
      hijacked: { speaker: 'Rico Vega', color: '#00f0ff', line: "Zed bailed! I've got the keys and his coupe — bringing it into Vega's Garage now!" }
    },
    vehicleId: 'C04',
    timeLimitSec: 90,
    rewardCash: 2200,
    starThresholds: { threeStarSec: 20, twoStarSec: 8, minConditionPct: 0 },
    objectiveSummary: "Ram Zed's Blue Sports Car until its HP bar hits 0, then deliver it to Vega's Garage.",
    nextTeaser: 'M7 unlocks next: blackout sabotage before the EMP signal bomb detonates.',
    spawn: { x: 300, z: 0, yaw: -Math.PI / 2 },
    dialogue: [
      { speaker: 'Fixer', color: '#ff007f', line: "Zed bolted with our decryption key on Oceanic Blvd! Smash his coupe to 0% HP!" },
      { speaker: 'Rico Vega', color: '#00f0ff', line: "On his bumper now — once he bails, I'm taking his ride straight to the Garage." }
    ],
    checkpoints: [
      { id: 'm6_garage', label: "Vega's Garage Dropoff", x: 0, z: 420, radius: 18, isFinish: true }
    ],
    mechanics: {
      type: 'hacker_hijack',
      targetName: "Zed's Blue Sports Car",
      targetStart: { x: 0, z: -300, yaw: 0 },
      targetSpeed: 15,
      targetMaxHp: 100,
      ramDamage: 30,
      ramRadius: 8.5,
      minRamSpeed: 6,
      ramCooldownSec: 0.7,
      switchVehicleId: 'C04',
      dropoffGoal: { x: 0, z: 420, radius: 18, label: "Vega's Garage" }
    }
  },
  {
    id: 'M7',
    number: 7,
    act: 2,
    title: 'Signal Ghost',
    chapterTag: 'ACT 2 · FREQUENCY FUSE',
    storyHook: 'A pulsing trace bomb ticks faster every second beneath your chassis. Scramble all 4 Midtown relay intersections and clear Iron Docks!',
    steps: [
      'Scramble all 4 Syndicate Cell Towers across Apex Core',
      'Reach Iron Docks Relay Exit before the fuse blows'
    ],
    midComms: {
      halfway: { speaker: 'Fixer', color: '#ff007f', line: 'Beep cadence doubling — two towers left, push that Spyder through Crosstown!' }
    },
    vehicleId: 'C05',
    timeLimitSec: 75,
    rewardCash: 2500,
    starThresholds: { threeStarSec: 18, twoStarSec: 7, minConditionPct: 0 },
    objectiveSummary: 'Smash 4 Syndicate Cell Towers across Apex Core before the accelerating signal bomb fires.',
    nextTeaser: 'M8 unlocks next: 200+ km/h highway duel down East Bay Expressway.',
    spawn: { x: 0, z: 0, yaw: Math.PI / 2 },
    dialogue: [
      { speaker: 'Fixer', color: '#ff007f', line: 'Frequency bomb armed under your chassis — tear through all 4 relay intersections!' },
      { speaker: 'Rico Vega', color: '#00f0ff', line: 'That beeping gets faster every second. Flooring the Spyder corner to corner!' }
    ],
    checkpoints: [
      { id: 'm7_t1', label: 'Cell Tower #1 (Bay Ave)', x: 300, z: 0, radius: 15 },
      { id: 'm7_t2', label: 'Cell Tower #2 (Crosstown East)', x: 300, z: 300, radius: 15 },
      { id: 'm7_t3', label: 'Cell Tower #3 (Titan Bank Corner)', x: 0, z: 300, radius: 15 },
      { id: 'm7_t4', label: 'Cell Tower #4 (West Crosstown)', x: -300, z: 300, radius: 15 },
      { id: 'm7_esc', label: 'Iron Docks Relay Exit', x: -600, z: 300, radius: 18, isFinish: true }
    ],
    mechanics: {
      type: 'signal_ghost',
      cellTowers: 4,
      baseBeepIntervalSec: 1.4,
      minBeepIntervalSec: 0.22
    }
  },
  {
    id: 'M8',
    number: 8,
    act: 2,
    title: 'Midnight Highway Duel',
    chapterTag: 'ACT 2 · EXPRESSWAY RUN',
    storyHook: 'Side-by-side drag battle down the East Bay Expressway. Hit Nitro early and cross Bayview Express Depot ahead of the Syndicate Courier.',
    steps: [
      'Draft & overtake the Syndicate Courier down Bay Ave',
      'Beat your rival across the z=600 finish line'
    ],
    midComms: {
      halfway: { speaker: 'Rico Vega', color: '#00f0ff', line: 'Pulling past Airport Perimeter — keeping Nitro pinned to the depot gate!' }
    },
    vehicleId: 'C05',
    timeLimitSec: 90,
    rewardCash: 2800,
    starThresholds: { threeStarSec: 22, twoStarSec: 8, minConditionPct: 0 },
    objectiveSummary: 'Beat the Syndicate Courier straight down the East Bay Expressway to z=600.',
    nextTeaser: 'M9 unlocks next: brakes severed above Apex Core — coast stop on Palm Strip sand.',
    spawn: { x: 600, z: -600, yaw: 0 },
    dialogue: [
      { speaker: 'Rico Vega', color: '#00f0ff', line: 'Locked side-by-side on the East Bay Expressway. Nitro injectors primed.' },
      { speaker: 'Fixer', color: '#ff007f', line: 'Hit every gate first and beat that courier to Bayview Express Depot!' }
    ],
    checkpoints: [
      { id: 'm8_cp1', label: 'Airport Perimeter N', x: 600, z: -300, radius: 16 },
      { id: 'm8_cp2', label: 'Airport Terminal Gate', x: 600, z: 0, radius: 16 },
      { id: 'm8_cp3', label: 'East Highway Split', x: 600, z: 300, radius: 16 },
      { id: 'm8_finish', label: 'Bayview Express Depot', x: 600, z: 600, radius: 18, isFinish: true }
    ],
    mechanics: {
      type: 'highway_duel',
      rivalName: 'Syndicate Courier',
      rivalStart: { x: 600, z: -580, yaw: 0 },
      rivalSpeed: 17.5,
      finishZ: 600
    }
  },
  {
    id: 'M9',
    number: 9,
    act: 2,
    title: 'NO BRAKES!',
    chapterTag: 'ACT 2 · SEVERED LINES',
    storyHook: 'Cartel mechanics cut your hydraulic brake lines on Titan Hill. Weave south at high speed and coast to a stop on Palm Strip Beach sand!',
    steps: [
      'Thread all Oceanic Blvd gates with BRAKES DISABLED',
      'Hit Palm Strip Beach sand (z <= -840) to coast to a stop'
    ],
    midComms: {
      sandApproach: { speaker: 'Fixer', color: '#ff007f', line: 'Palm Strip seawall dead ahead — steer straight onto the beach sand and let drag stop you!' }
    },
    vehicleId: 'C06',
    timeLimitSec: 80,
    rewardCash: 3200,
    starThresholds: { threeStarSec: 18, twoStarSec: 7, minConditionPct: 0 },
    objectiveSummary: 'Brakes disabled! Weave south down Oceanic Blvd into Palm Strip Beach sand to coast to a stop.',
    nextTeaser: 'M10 unlocks next: Zero-Scratch armored delivery across Bayview Heights.',
    spawn: { x: 0, z: 300, yaw: Math.PI },
    dialogue: [
      { speaker: 'Fixer', color: '#ff007f', line: 'Saboteurs cut your brake lines on Titan Bank hill! Pedal input is dead!' },
      { speaker: 'Rico Vega', color: '#00f0ff', line: 'Aiming straight south toward Palm Strip Beach — deep sand will catch us!' }
    ],
    checkpoints: [
      { id: 'm9_cp1', label: 'Solaris Plaza', x: 0, z: 0, radius: 16 },
      { id: 'm9_cp2', label: 'North Oceanic Gate', x: 0, z: -300, radius: 16 },
      { id: 'm9_cp3', label: 'Sunset Strip', x: 0, z: -600, radius: 16 },
      { id: 'm9_sand', label: 'Palm Strip Beach Sand Stop', x: 0, z: -865, radius: 30, isBeachSand: true, isFinish: true }
    ],
    mechanics: {
      type: 'no_brakes',
      disableBrakes: true,
      beachSandZMax: -840,
      stopSpeedMax: 2.0
    }
  },
  {
    id: 'M10',
    number: 10,
    act: 2,
    title: 'Zero-Scratch Heist',
    chapterTag: "ACT 2 FINALE · MINT CONDITION",
    storyHook: "Steal Don Salazar's prototype bullion SUV cleanly across Bayview Heights (>= 80% condition), park & walk inside Vega's Garage!",
    steps: [
      'Drive clean lines across Bayview (keep Condition >= 80%)',
      "Park outside, exit SUV (E) & step inside Vega's Garage"
    ],
    midComms: {
      onFoot: { speaker: 'Fixer', color: '#00f0ff', line: "Paint is spotless! Park outside the bay, exit the SUV (E), and step inside Vega's Garage!" }
    },
    vehicleId: 'C07',
    timeLimitSec: 120,
    rewardCash: 3600,
    starThresholds: { threeStarSec: 30, twoStarSec: 12, minConditionPct: 80 },
    objectiveSummary: "Keep condition >= 80% through Bayview Heights to Vega's Garage.",
    nextTeaser: 'ACT 3 unlocks next: smash 6 police barricades at Titan National Bank!',
    spawn: { x: 300, z: 900, yaw: -Math.PI / 2 },
    dialogue: [
      { speaker: 'Fixer', color: '#ff007f', line: 'This prototype bullion SUV belongs to the syndicate boss — keep integrity >= 80%.' },
      { speaker: 'Rico Vega', color: '#00f0ff', line: "Clean lines through Bayview Heights. Not a dent until it's parked inside the bay." }
    ],
    checkpoints: [
      { id: 'm10_cp1', label: 'Skyline North Curve', x: 0, z: 900, radius: 15 },
      { id: 'm10_cp2', label: 'Skyline Construction', x: 0, z: 600, radius: 15 },
      { id: 'm10_cp3', label: 'Bayview West', x: -300, z: 600, radius: 15 },
      { id: 'm10_cp4', label: 'West Crosstown', x: -300, z: 300, radius: 15 },
      { id: 'm10_apron', label: "Vega's Garage Driveway", x: 0, z: 420, radius: 18 },
      {
        id: 'm10_garage',
        label: "Vega's Garage Interior",
        x: 36,
        z: 420,
        radius: 8,
        requiresOnFoot: true,
        buildingId: 'vegaGarage',
        buildingLabel: "VEGA'S GARAGE",
        enterHint: "Park SUV & EXIT CAR (E) -> Walk inside Vega's Garage!",
        isFinish: true
      }
    ],
    mechanics: {
      type: 'zero_scratch',
      minConditionPct: 80
    }
  }
]);

export const ACT_3_MISSIONS = Object.freeze([
  {
    id: 'M11',
    number: 11,
    act: 3,
    title: 'Barricade Breaker',
    chapterTag: 'ACT 3 · TITAN BANK BREACH',
    storyHook: 'NBPD fortified Titan National Bank with 6 steel barricades. Obliterate the blockade, storm the Vault on foot, and sprint to East Docks!',
    steps: [
      'Smash all 6 steel police barricades on Oceanic Blvd',
      'Exit 4x4 (E) & walk INSIDE Titan National Bank Vault',
      'Get back in your truck & extract to East Docks (600, 300)'
    ],
    midComms: {
      barsCleared: { speaker: 'Fixer', color: '#00f0ff', line: 'All 6 barricades shattered! Park outside Titan Bank, EXIT CAR (E), and rush the Vault!' },
      vaultGrabbed: { speaker: 'Rico Vega', color: '#ff007f', line: 'Treasury bonds secured! Hopping back in the Titan 4x4 — flooring it east to East Docks!' }
    },
    vehicleId: 'C08',
    timeLimitSec: 90,
    rewardCash: 4500,
    starThresholds: { threeStarSec: 22, twoStarSec: 9, minConditionPct: 0 },
    objectiveSummary: 'Smash 6 police barricades on Oceanic Blvd, walk inside Titan Bank Vault, and escape to East Docks.',
    nextTeaser: 'M12 unlocks next: launch the Skyline Mega-Ramp at 180+ km/h in slow-mo.',
    spawn: { x: 0, z: 120, yaw: 0 },
    dialogue: [
      { speaker: 'Rico Vega', color: '#00f0ff', line: 'Titan National Bank is cordoned ahead on Oceanic Blvd. Good thing this 4x4 eats steel.' },
      { speaker: 'Fixer', color: '#ff007f', line: 'Smash ALL 6 barricades, step inside Titan Bank [E] for the bonds, then sprint east!' }
    ],
    checkpoints: [
      {
        id: 'm11_bank',
        label: 'Titan Bank Interior Vault',
        x: -42,
        z: 260,
        radius: 8.5,
        requiresOnFoot: true,
        buildingId: 'titanBank',
        buildingLabel: 'TITAN NATIONAL BANK',
        enterHint: 'EXIT CAR (E) -> Walk INSIDE Titan National Bank to grab the Vault Bonds!'
      },
      { id: 'm11_docks', label: 'East Docks Escape', x: 600, z: 300, radius: 18, isFinish: true }
    ],
    mechanics: {
      type: 'barricade_breaker',
      targetBarricades: 6,
      triggerWantedStars: 2,
      smashRadius: 9,
      minSmashSpeed: 5,
      barricadePositions: [
        { x: -5, z: 215 },
        { x: 0, z: 222 },
        { x: 5, z: 215 },
        { x: -5, z: 250 },
        { x: 0, z: 258 },
        { x: 5, z: 250 }
      ]
    }
  },
  {
    id: 'M12',
    number: 12,
    act: 3,
    title: 'Skyline Daredevil',
    chapterTag: 'ACT 3 · 180 KM/H LEAP',
    storyHook: 'Clear a collapsed Bayview overpass with one insane leap off the Skyline Construction Mega-Ramp at 180+ km/h in slow-mo.',
    steps: [
      'Build 180+ km/h speed straight north up Oceanic Blvd',
      'Launch the Skyline Mega-Ramp & land cleanly across the gap'
    ],
    midComms: {
      ramp: { speaker: 'Rico Vega', color: '#00f0ff', line: 'Past 180 KM/H! Hanging over Skyline Construction in slow-motion!' }
    },
    vehicleId: 'C09',
    timeLimitSec: 75,
    rewardCash: 4800,
    starThresholds: { threeStarSec: 18, twoStarSec: 7, minConditionPct: 0 },
    objectiveSummary: 'Build full speed north, hit the Skyline Mega-Ramp >= 180 km/h, and clear the slow-mo jump.',
    nextTeaser: 'M13 unlocks next: haul 500kg gold cargo while knocking out 3 pursuers.',
    spawn: { x: 0, z: 200, yaw: 0 },
    dialogue: [
      { speaker: 'Fixer', color: '#ff007f', line: '400m straight run-up to Skyline Construction Site! You MUST hit >= 180 km/h at launch!' },
      { speaker: 'Rico Vega', color: '#00f0ff', line: 'Flooring throttle north and punching Nitro right up the ramp deck!' }
    ],
    checkpoints: [
      { id: 'm12_run', label: 'Skyline Straight Approach', x: 0, z: 450, radius: 16 },
      { id: 'm12_ramp', label: 'Skyline Mega-Ramp (>= 180 km/h)', x: 0, z: 600, radius: 16, isMegaRamp: true },
      { id: 'm12_land', label: 'North Landing Zone', x: 0, z: 740, radius: 22, isFinish: true }
    ],
    mechanics: {
      type: 'skyline_ramp_jump',
      minJumpSpeedKmh: 180,
      slowMoSec: 1.5
    }
  },
  {
    id: 'M13',
    number: 13,
    act: 3,
    title: 'Gold Convoy Escape',
    chapterTag: 'ACT 3 · 500KG BULLION',
    storyHook: 'With 500kg of bank bullion weighing down your rear axle, sideswipe 3 pursuing cartel trucks off the road and drop into Iron Docks.',
    steps: [
      'Meet the ambush along Crosstown Avenue',
      'Sideswipe all 3 pursuing syndicate trucks off your tail',
      'Haul the bullion safely into Iron Docks Hideout'
    ],
    midComms: {
      clearedPursuers: { speaker: 'Fixer', color: '#00f0ff', line: 'All 3 cartel rigs wrecked! Carry that 500kg load west into Iron Docks Hideout!' }
    },
    vehicleId: 'C08',
    timeLimitSec: 120,
    rewardCash: 5000,
    starThresholds: { threeStarSec: 25, twoStarSec: 10, minConditionPct: 0 },
    objectiveSummary: 'Smash 3 pursuing syndicate trucks off your tail and extract to Iron Docks.',
    nextTeaser: 'M14 unlocks next: headlights-off stealth run beneath sweeping helicopter cones.',
    spawn: { x: 300, z: 300, yaw: -Math.PI / 2 },
    dialogue: [
      { speaker: 'Rico Vega', color: '#00f0ff', line: 'Five hundred kilos of bullion in the bed — corners handle heavy, ramming hits harder.' },
      { speaker: 'Fixer', color: '#ff007f', line: 'Sideswipe all 3 pursuing syndicate rigs out of action before dropping into Iron Docks!' }
    ],
    checkpoints: [
      { id: 'm13_mid', label: 'Intercept Convoy', x: 0, z: 300, radius: 16 },
      { id: 'm13_docks', label: 'Iron Docks Hideout', x: -600, z: 0, radius: 18, isFinish: true }
    ],
    mechanics: {
      type: 'convoy_smash',
      cargoMassKg: 500,
      pursuerCount: 3,
      pursuerSpeed: 17,
      smashRadius: 9.0,
      minSmashSpeed: 7,
      ramCooldownSec: 0.55
    }
  },
  {
    id: 'M14',
    number: 14,
    act: 3,
    title: 'Blackout Stealth',
    chapterTag: 'ACT 3 · DARK INFILTRATION',
    storyHook: 'City grid went dark — cartel choppers sweep north Apex Core with blinding beams. Slip into Iron Docks Sanctuary on foot undetected.',
    steps: [
      'Run blacked-out west & stay clear of chopper searchlight cones',
      'Park outside & slip INSIDE Iron Docks Sanctuary on foot'
    ],
    midComms: {
      onFoot: { speaker: 'Fixer', color: '#00f0ff', line: 'Right outside the safehouse! Cut the engine, EXIT CAR (E), and slip inside Iron Docks Sanctuary!' }
    },
    vehicleId: 'C09',
    timeLimitSec: 90,
    rewardCash: 5500,
    starThresholds: { threeStarSec: 20, twoStarSec: 8, minConditionPct: 0 },
    objectiveSummary: 'Slip through Apex Core into Iron Docks with headlights dark — dodge helicopter searchlights!',
    nextTeaser: 'M15 unlocks next: intercept your rogue partner before the Airport Private Jet.',
    spawn: { x: 300, z: -300, yaw: -Math.PI / 2 },
    dialogue: [
      { speaker: 'Fixer', color: '#ff007f', line: 'Power grid offline — chopper searchlights sweep every north block. Keep out of the beams!' },
      { speaker: 'Rico Vega', color: '#00f0ff', line: 'Blackout lights engaged. Threading west between patrol sweeps.' }
    ],
    checkpoints: [
      { id: 'm14_cp1', label: 'Dark North Passage', x: 0, z: -300, radius: 15 },
      { id: 'm14_cp2', label: 'Northwest Turn', x: -300, z: -300, radius: 15 },
      { id: 'm14_cp3', label: 'Docks North Approach', x: -300, z: 0, radius: 15 },
      { id: 'm14_apron', label: 'Iron Docks Entrance', x: -600, z: 0, radius: 16 },
      {
        id: 'm14_exit',
        label: 'Iron Docks Sanctuary Interior',
        x: -626,
        z: -36,
        radius: 8.5,
        requiresOnFoot: true,
        buildingId: 'docksWarehouse',
        buildingLabel: 'IRON DOCKS SANCTUARY',
        enterHint: 'Park & EXIT CAR (E) -> Slip INSIDE Iron Docks Sanctuary!',
        isFinish: true
      }
    ],
    mechanics: {
      type: 'blackout_stealth',
      detectionRatePerSec: 65,
      decayRatePerSec: 35,
      searchlights: [
        { x: -150, z: -300, sweepRadius: 14, coneRadius: 18, speed: 1.1, phase: 0 },
        { x: -300, z: -150, sweepRadius: 14, coneRadius: 18, speed: 1.25, phase: 2.1 },
        { x: -450, z: 0, sweepRadius: 14, coneRadius: 18, speed: 1.0, phase: 4.2 }
      ]
    }
  },
  {
    id: 'M15',
    number: 15,
    act: 3,
    title: 'The Double Cross',
    chapterTag: 'ACT 3 FINALE · BETRAYAL',
    storyHook: 'Your former partner just sold Neon Bay out to the cartel and is sprinting for the Airport Jet. Hunt down & slam his Veneno-X twice!',
    steps: [
      'Intercept your Rogue Partner along Bayview Highway',
      'Deliver 2 heavy slams before he reaches the Airport Runway'
    ],
    midComms: {
      firstHit: { speaker: 'Rico Vega', color: '#ff007f', line: 'One hard slam landed! One more hit finishes him before Runway 01!' }
    },
    vehicleId: 'C10',
    timeLimitSec: 120,
    rewardCash: 6000,
    starThresholds: { threeStarSec: 28, twoStarSec: 10, minConditionPct: 0 },
    objectiveSummary: 'Hunt down and slam the Rogue Partner twice before reaching the Airport Private Jet.',
    nextTeaser: 'ACT 4 FINALE unlocks next: 4-star lockdown across Neon Bay.',
    spawn: { x: -300, z: 300, yaw: Math.PI / 2 },
    dialogue: [
      { speaker: 'Fixer', color: '#ff007f', line: 'Your ex-partner is bolting east for the Airport runway! Cut him off with 2 hard rams!' },
      { speaker: 'Rico Vega', color: '#00f0ff', line: "Veneno-X twin-turbos lit. He isn't making that flight." }
    ],
    checkpoints: [
      { id: 'm15_jet', label: 'Airport Runway Jet', x: 750, z: -260, radius: 18, isFinish: true }
    ],
    mechanics: {
      type: 'double_cross_intercept',
      targetName: 'Rogue Partner',
      targetStart: { x: 0, z: 300, yaw: Math.PI / 2 },
      targetSpeed: 16.5,
      interceptRadius: 12,
      interceptHitsRequired: 2,
      ramCooldownSec: 0.65,
      targetWaypoints: [
        { x: 300, z: 300 },
        { x: 600, z: 300 },
        { x: 600, z: 0 },
        { x: 750, z: -260 }
      ]
    }
  }
]);

export const ACT_4_MISSIONS = Object.freeze([
  {
    id: 'M16',
    number: 16,
    act: 4,
    title: '4-Star Lockdown',
    chapterTag: 'ACT 4 · CITY LOCKDOWN',
    storyHook: 'Salazar bribed the commissioner — NBPD, SWAT & aerial units declare a 4-Star lockdown across Neon Bay. Survive 120 seconds alive!',
    steps: [
      'Hold open boulevards & dodge SWAT roadblocks + PIT cruisers',
      'Survive all 120 seconds without wrecking your ride'
    ],
    midComms: {
      halfway: { speaker: 'Fixer', color: '#ff007f', line: '60 seconds left on the clock! Keep weaving between wide intersections!' }
    },
    vehicleId: 'C09',
    timeLimitSec: 120,
    rewardCash: 6500,
    starThresholds: { threeStarSec: 10, twoStarSec: 3, minConditionPct: 0 },
    objectiveSummary: 'Survive 120 seconds of relentless 4-star NBPD & SWAT lockdown anywhere in Neon Bay.',
    nextTeaser: 'M17 unlocks next: traffic sprint on a Bike into a Hypercar swap at Iron Docks.',
    spawn: { x: 0, z: 420, yaw: Math.PI },
    dialogue: [
      { speaker: 'Fixer', color: '#ff007f', line: 'Every cruiser, SWAT truck, and chopper is on your plate! Stay moving for 2 minutes!' },
      { speaker: 'Rico Vega', color: '#00f0ff', line: 'Lockdown accepted. Taking the wide boulevards and keeping momentum high.' }
    ],
    checkpoints: [
      { id: 'm16_hold', label: 'Keep Moving Across Neon Bay', x: 0, z: 0, radius: 950 }
    ],
    mechanics: {
      type: 'lockdown_survival',
      triggerWantedStars: 4,
      surviveSec: 120
    }
  },
  {
    id: 'M17',
    number: 17,
    act: 4,
    title: 'The Bay Switch',
    chapterTag: 'ACT 4 · BIKE TO HYPERCAR',
    storyHook: 'Split heavy gridlock on your agile Street Bike, hit the Iron Docks drop-bay for an instant C10 Veneno-X swap, and blitz north!',
    steps: [
      'Split downtown traffic on your Street Bike (B01)',
      'Hit Iron Docks Swap Bay -> instant Hypercar (C10) upgrade',
      'Rocket up Skyline Expressway to Bayview North Terminal'
    ],
    midComms: {
      swapped: { speaker: 'Rico Vega', color: '#00f0ff', line: 'Veneno-X twin-turbos screaming! Time to tear open the northern expressway!' }
    },
    vehicleId: 'B01',
    timeLimitSec: 120,
    rewardCash: 7000,
    starThresholds: { threeStarSec: 25, twoStarSec: 10, minConditionPct: 0 },
    objectiveSummary: 'Cut downtown on your Street Bike, swap automatically to the Hypercar at Iron Docks, and blitz north!',
    nextTeaser: 'M18 unlocks next: stay ABOVE 60 km/h or the chassis bomb blows!',
    spawn: { x: 300, z: 0, yaw: -Math.PI / 2 },
    dialogue: [
      { speaker: 'Rico Vega', color: '#00f0ff', line: 'Thread the needle on two wheels into Iron Docks — fresh C10 hypercar waiting!' },
      { speaker: 'Fixer', color: '#ff007f', line: 'Hit the Iron Docks swap pad and unleash 320 km/h all the way to Bayview North.' }
    ],
    checkpoints: [
      { id: 'm17_c1', label: 'Apex Core Cut', x: 0, z: 0, radius: 16 },
      { id: 'm17_swap', label: 'Iron Docks Hypercar Swap Bay', x: -600, z: 0, radius: 18, isVehicleSwap: true },
      { id: 'm17_c2', label: 'Bayview Outer Bend', x: -300, z: 600, radius: 16 },
      { id: 'm17_end', label: 'Bayview North Terminal', x: 0, z: 900, radius: 18, isFinish: true }
    ],
    mechanics: {
      type: 'mid_mission_switch',
      startVehicleId: 'B01',
      switchVehicleId: 'C10',
      swapPoint: { x: -600, z: 0 }
    }
  },
  {
    id: 'M18',
    number: 18,
    act: 4,
    title: '60 KM/H Bomb',
    chapterTag: 'ACT 4 · DO NOT SLOW DOWN',
    storyHook: 'A speed-triggered C4 charge is wired into your starter. Drop below 60 km/h for 3 seconds and the whole highway lights up!',
    steps: [
      'Pin the throttle north up Oceanic Boulevard (>= 60 km/h)',
      'Reach Bayview Defusal Pad without ever braking below 60'
    ],
    midComms: {
      halfway: { speaker: 'Fixer', color: '#ff007f', line: 'Bomb armed and hot! Stay above 60 KM/H past Solaris Plaza all the way north!' }
    },
    vehicleId: 'C10',
    timeLimitSec: 90,
    rewardCash: 7500,
    starThresholds: { threeStarSec: 24, twoStarSec: 10, minConditionPct: 0 },
    objectiveSummary: 'Hold >= 60 km/h straight north up Oceanic Boulevard to defuse the chassis bomb.',
    nextTeaser: "M19 unlocks next: ram Don Salazar's Armored Limo under 5-star police heat.",
    spawn: { x: 0, z: -600, yaw: 0 },
    dialogue: [
      { speaker: 'Fixer', color: '#ff007f', line: 'Velocity bomb armed! Drop under 60 km/h for 3 seconds and it vaporizes!' },
      { speaker: 'Rico Vega', color: '#00f0ff', line: 'Oceanic Boulevard is straight all the way north. Pedal pinned to the firewall!' }
    ],
    checkpoints: [
      { id: 'm18_cp1', label: 'North Oceanic Gate', x: 0, z: -300, radius: 16 },
      { id: 'm18_cp2', label: 'Solaris Tower Plaza', x: 0, z: 0, radius: 16 },
      { id: 'm18_cp3', label: 'Titan Bank Plaza', x: 0, z: 300, radius: 16 },
      { id: 'm18_cp4', label: 'Skyline Construction', x: 0, z: 600, radius: 16 },
      { id: 'm18_end', label: 'Bayview Defusal Pad', x: 0, z: 880, radius: 18, isFinish: true }
    ],
    mechanics: {
      type: 'speed_bomb',
      minSpeedKmh: 60,
      explodeDelaySec: 3.0,
      armGraceSec: 5.0
    }
  },
  {
    id: 'M19',
    number: 19,
    act: 4,
    title: 'Cartel Boss Takedown',
    chapterTag: 'ACT 4 · FALL OF SALAZAR',
    storyHook: "Cartel kingpin Don Salazar is escaping under full 5-Star escort in an armored monarch limo. Batter its 150 HP armour down to zero!",
    steps: [
      "Hunt Don Salazar's Armoured Limo across Apex Core",
      'Smash it 5+ times until its 150 HP armour bar shatters'
    ],
    midComms: {
      halfHp: { speaker: 'Rico Vega', color: '#00f0ff', line: "Salazar's limo armour is cracking — two more heavy slams finishes the cartel!" }
    },
    vehicleId: 'C07',
    timeLimitSec: 150,
    rewardCash: 8500,
    starThresholds: { threeStarSec: 35, twoStarSec: 15, minConditionPct: 0 },
    objectiveSummary: "Smash Don Salazar's Armored Limo across Apex Core until its armour bar hits 0.",
    nextTeaser: 'M20 GRAND FINALE unlocks next: breach Airport Lockdown for the Golden Supercar!',
    spawn: { x: -300, z: -300, yaw: Math.PI / 2 },
    dialogue: [
      { speaker: 'Fixer', color: '#ff007f', line: "Don Salazar's armored limo is circling Apex Core under 5-star escort! Smash it 5+ times!" },
      { speaker: 'Rico Vega', color: '#00f0ff', line: 'Time to end the cartel stranglehold on Neon Bay once and for all!' }
    ],
    checkpoints: [
      { id: 'm19_boss', label: "Don Salazar's Armoured Limo", x: 0, z: 300, radius: 16 }
    ],
    mechanics: {
      type: 'boss_takedown',
      bossName: "Don Salazar's Armoured Limo",
      bossStart: { x: 0, z: 300, yaw: -Math.PI / 2 },
      bossSpeed: 14.5,
      bossMaxHp: 150,
      ramDamage: 30,
      ramRadius: 9.5,
      minRamSpeed: 7,
      ramCooldownSec: 0.7,
      triggerWantedStars: 5
    }
  },
  {
    id: 'M20',
    number: 20,
    act: 4,
    title: 'Golden Sunrise Finale',
    chapterTag: 'GRAND FINALE · LEGEND OF NEON BAY',
    storyHook: 'Dawn breaks over Neon Bay. Smash the final 4-Star airport perimeter, storm VIP Terminal on foot, and board your Private Jet to unlock Vortex Apex Gold!',
    steps: [
      'Breach Bayview & East Highway blockades to Airport Gate',
      'Exit car (E) & rush INSIDE Airport VIP Terminal for clearance',
      'Return to runway & board your Private Jet -> Unlock C11 + City 2!'
    ],
    midComms: {
      onFoot: { speaker: 'Fixer', color: '#00f0ff', line: 'VIP Terminal ahead! Park outside, EXIT CAR (E), and rush inside to clear Runway 01!' },
      terminalCleared: { speaker: 'Rico Vega', color: '#ffd700', line: 'Runway 01 cleared! Back to the car — straight into the Private Jet at full boost!' }
    },
    vehicleId: 'C10',
    timeLimitSec: 150,
    rewardCash: 15000,
    starThresholds: { threeStarSec: 35, twoStarSec: 15, minConditionPct: 0 },
    objectiveSummary: 'Break the final citywide blockade across Bayview Heights into Neon Bay Airport Private Jet.',
    nextTeaser: 'CAMPAIGN COMPLETE! Vortex Apex Gold (C11) & Mirage Valley Bridge unlocked!',
    spawn: { x: 0, z: 900, yaw: 0 },
    dialogue: [
      { speaker: 'Fixer', color: '#ff007f', line: 'Private jet motors spooling on Airport Runway! Push past the 4-star barricade!' },
      { speaker: 'Rico Vega', color: '#00f0ff', line: 'First light hitting Neon Bay — taking the Golden Supercar and flying out legend status!' }
    ],
    checkpoints: [
      { id: 'm20_cp1', label: 'Skyline Construction', x: 0, z: 600, radius: 16 },
      { id: 'm20_cp2', label: 'Bayview Outer Bend', x: 300, z: 600, radius: 16 },
      { id: 'm20_cp3', label: 'East Highway Split', x: 600, z: 300, radius: 16 },
      { id: 'm20_cp4', label: 'Airport Runway Approach', x: 600, z: 0, radius: 16 },
      {
        id: 'm20_terminal',
        label: 'Airport VIP Terminal',
        x: 665,
        z: -36,
        radius: 8.5,
        requiresOnFoot: true,
        buildingId: 'airportTower',
        buildingLabel: 'AIRPORT VIP TERMINAL',
        enterHint: 'EXIT CAR (E) -> Rush INSIDE Airport Terminal to clear takeoff!'
      },
      { id: 'm20_jet', label: 'Neon Bay Airport Private Jet', x: 750, z: -260, radius: 20, isFinish: true }
    ],
    mechanics: {
      type: 'sunrise_finale',
      triggerWantedStars: 4,
      unlockVehicleId: 'C11',
      unlockCity2: true,
      city2Name: 'Mirage Valley',
      city2BridgeCoord: { x: 0, z: 960 }
    }
  }
]);

export const STORY_MISSIONS = Object.freeze([
  ...ACT_1_MISSIONS,
  ...ACT_2_MISSIONS,
  ...ACT_3_MISSIONS,
  ...ACT_4_MISSIONS
]);

export const MISSIONS = STORY_MISSIONS;

export const MISSION_MAP = Object.freeze(
  Object.fromEntries(STORY_MISSIONS.map((m) => [m.id, m]))
);

export function getMissionById(id) {
  return MISSION_MAP[id] || null;
}

export function getAllMissions() {
  return STORY_MISSIONS;
}

export function validateMissionSchema(mission) {
  const errors = [];
  if (!mission || typeof mission !== 'object') {
    return { valid: false, errors: ['Mission must be an object'] };
  }
  if (!mission.id || typeof mission.id !== 'string') errors.push('Missing id');
  if (!Number.isFinite(mission.number) || mission.number < 1 || mission.number > 20) errors.push('Invalid mission number');
  if (![1, 2, 3, 4].includes(mission.act)) errors.push('Invalid act');
  if (!mission.title || typeof mission.title !== 'string') errors.push('Missing title');
  if (!mission.vehicleId || typeof mission.vehicleId !== 'string') errors.push('Missing vehicleId');
  if (!Number.isFinite(mission.timeLimitSec) || mission.timeLimitSec <= 0) errors.push('Invalid timeLimitSec');
  if (!Number.isFinite(mission.rewardCash) || mission.rewardCash < 0) errors.push('Invalid rewardCash');
  if (!isPointInPlayableBounds(mission.spawn)) errors.push('spawn out of playable bounds');
  if (!Array.isArray(mission.dialogue) || mission.dialogue.length !== 2) errors.push('dialogue must contain 2 entries');

  if (!Array.isArray(mission.checkpoints) || mission.checkpoints.length === 0) {
    errors.push('Missing checkpoints');
  } else {
    for (const cp of mission.checkpoints) {
      if (!isPointInPlayableBounds(cp)) {
        errors.push(`Checkpoint ${cp && cp.id} out of playable bounds`);
      }
      if (!Number.isFinite(cp?.radius) || cp.radius <= 0) {
        errors.push(`Checkpoint ${cp && cp.id} invalid radius`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
