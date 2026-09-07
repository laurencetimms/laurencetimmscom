/**
 * LoadedZone — Calculator Library
 *
 * Pure functions for zone 2 heart rate calculation, metabolic cost estimation
 * (Pandolf equation), and the reverse zone 2 calculator that maps load/pace
 * combinations to heart rate zones.
 *
 * All functions are stateless and side-effect free. Units are metric internally
 * (kg, m/s, watts). Conversion helpers are provided for display.
 */

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface UserProfile {
  age: number;
  bodyWeightKg: number;
  restingHR?: number;        // bpm, measured
  knownMaxHR?: number;       // bpm, from lab test or field test
  sex?: 'male' | 'female';
  fitnessLevel: 'sedentary' | 'light' | 'moderate' | 'very_active';
}

export interface Zone2Range {
  low: number;   // bpm
  high: number;  // bpm
  method: string;
  confidence: 'high' | 'moderate' | 'estimate';
  description: string;
}

export type TerrainType = 'pavement' | 'gravel' | 'grass' | 'mixed';
export type GradientType = 'flat' | 'gentle' | 'moderate';

export interface LoadUpInput {
  bodyWeightKg: number;
  zone2Low: number;          // bpm
  zone2High: number;         // bpm
  durationMinutes: number;
  terrain: TerrainType;
  gradient: GradientType;
  fitnessLevel: 'sedentary' | 'light' | 'moderate' | 'very_active';
  maxHR: number;             // bpm (estimated or known)
  restingHR: number;         // bpm (estimated or known)
}

export interface LoadPaceCombination {
  loadKg: number;
  paceKmh: number;
  estimatedHR: number;
  metabolicCostWatts: number;
  inZone2: boolean;
  caloriesPerHour: number;
}

export interface LoadUpResult {
  recommended: {
    loadKg: number;
    paceKmh: number;
    estimatedHR: number;
    caloriesTotal: number;
  };
  combinations: LoadPaceCombination[];
  safetyNotes: string[];
  terrainAdjustment: string;
  progressionAdvice: string;
}

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

/** Terrain coefficients for the Pandolf equation (η - terrain factor) */
const TERRAIN_FACTORS: Record<TerrainType, number> = {
  pavement: 1.0,
  gravel: 1.2,
  grass: 1.3,
  mixed: 1.2,
};

/** Gradient as decimal slope */
const GRADIENT_VALUES: Record<GradientType, number> = {
  flat: 0,
  gentle: 0.03,   // ~1.7 degrees, typical gentle path
  moderate: 0.06,  // ~3.4 degrees, noticeable hill
};

/** Estimated resting HR by fitness level (used when user doesn't provide theirs) */
const ESTIMATED_RHR: Record<string, number> = {
  sedentary: 72,
  light: 65,
  moderate: 58,
  very_active: 50,
};

// ──────────────────────────────────────────────
// Max Heart Rate Estimation
// ──────────────────────────────────────────────

/**
 * Tanaka formula — more accurate across age ranges than 220-age.
 * Tanaka, H., Monahan, K.D., & Seals, D.R. (2001). JACC.
 */
export function maxHR_Tanaka(age: number): number {
  return Math.round(208 - 0.7 * age);
}

/**
 * Traditional Fox formula (220 - age).
 * Widely known but has ±10-12 bpm standard deviation.
 */
export function maxHR_Fox(age: number): number {
  return 220 - age;
}

/**
 * Gulati formula — more accurate for women.
 * Gulati, M. et al. (2010). Circulation.
 */
export function maxHR_Gulati(age: number): number {
  return Math.round(206 - 0.88 * age);
}

/**
 * Estimate max HR using the best available method for the user.
 */
export function estimateMaxHR(profile: UserProfile): { maxHR: number; method: string } {
  if (profile.knownMaxHR) {
    return { maxHR: profile.knownMaxHR, method: 'Measured (your test result)' };
  }
  if (profile.sex === 'female') {
    return { maxHR: maxHR_Gulati(profile.age), method: 'Gulati formula (206 − 0.88 × age) — optimised for women' };
  }
  return { maxHR: maxHR_Tanaka(profile.age), method: 'Tanaka formula (208 − 0.7 × age)' };
}

// ──────────────────────────────────────────────
// Zone 2 Heart Rate Calculation
// ──────────────────────────────────────────────

/**
 * Karvonen method — the gold standard for personalised zones.
 * Uses Heart Rate Reserve (HRR) = MaxHR - RestingHR.
 * Zone 2 = 60-70% of HRR + RestingHR.
 *
 * Karvonen, M.J. et al. (1957). Annales Medicinae Experimentalis.
 */
export function zone2_Karvonen(maxHR: number, restingHR: number): Zone2Range {
  const hrr = maxHR - restingHR;
  return {
    low: Math.round(hrr * 0.6 + restingHR),
    high: Math.round(hrr * 0.7 + restingHR),
    method: 'Karvonen (Heart Rate Reserve)',
    confidence: 'high',
    description: 'Uses your resting heart rate for personalised zones. Most accurate without lab testing.',
  };
}

/**
 * Simple percentage of max HR method.
 * Zone 2 = 60-70% of MaxHR.
 */
export function zone2_PercentMax(maxHR: number): Zone2Range {
  return {
    low: Math.round(maxHR * 0.6),
    high: Math.round(maxHR * 0.7),
    method: 'Percentage of Max HR',
    confidence: 'moderate',
    description: 'Good estimate, but doesn\'t account for individual fitness level.',
  };
}

/**
 * Maffetone MAF method (180 - age ± adjustments).
 * Popular in the Attia/longevity community.
 * Returns a single target with ±5 range.
 */
export function zone2_MAF(age: number, fitnessLevel: string): Zone2Range {
  let maf = 180 - age;

  switch (fitnessLevel) {
    case 'sedentary':
      maf -= 5;
      break;
    case 'light':
      break; // no adjustment
    case 'moderate':
      break; // no adjustment
    case 'very_active':
      maf += 5;
      break;
  }

  return {
    low: maf - 5,
    high: maf,
    method: 'Maffetone (MAF)',
    confidence: 'moderate',
    description: 'Simple age-based formula popular in endurance and longevity communities.',
  };
}

/**
 * Calculate all available zone 2 ranges for a user profile.
 * Returns results ranked by confidence.
 */
export function calculateAllZone2(profile: UserProfile): Zone2Range[] {
  const { maxHR } = estimateMaxHR(profile);
  const restingHR = profile.restingHR ?? ESTIMATED_RHR[profile.fitnessLevel];

  const results: Zone2Range[] = [];

  // Karvonen is always first if we have (or estimate) resting HR
  results.push(zone2_Karvonen(maxHR, restingHR));

  // Percentage of max
  results.push(zone2_PercentMax(maxHR));

  // MAF
  results.push(zone2_MAF(profile.age, profile.fitnessLevel));

  // If user provided their own RHR, mark Karvonen as high confidence
  if (profile.restingHR) {
    results[0].confidence = 'high';
    results[0].description = 'Uses your measured resting heart rate. Most accurate without lab testing.';
  } else {
    results[0].confidence = 'moderate';
    results[0].description = `Uses estimated resting HR of ${restingHR} bpm based on your fitness level. Measure your actual resting HR for better accuracy.`;
  }

  return results;
}

// ──────────────────────────────────────────────
// Pandolf Equation — Metabolic Cost of Load Carriage
// ──────────────────────────────────────────────

/**
 * Modernised Pandolf equation for metabolic cost of walking with load.
 * * Base equation (1977): M = 1.5W + 2.0(W + L)(L/W)² + η(W + L)(1.5V² + 0.35VG)
 * * Correction Factor (Civilian/Modern Gear Adjustment):
 * Research (Drain et al., 2017) shows the original military formula systematically 
 * under-predicts metabolic cost by 12-33%, especially at higher speeds (>1.25 m/s) 
 * and heavier loads. We apply a sliding-scale multiplier to bridge the gap between 
 * 1970s infantrymen and modern civilian walkers.
 */
export function pandolfMetabolicCost(
  bodyWeightKg: number,
  loadKg: number,
  speedMs: number,
  gradePercent: number,
  terrainFactor: number,
  fitnessLevel: string // Added to influence the correction factor
): number {
  const W = bodyWeightKg;
  const L = loadKg;
  const V = speedMs;
  const G = gradePercent;
  const eta = terrainFactor;

  // 1. Calculate Base Pandolf (1977)
  const standing = 1.5 * W;
  const loadCost = 2.0 * (W + L) * Math.pow(L / W, 2);
  const locomotion = eta * (W + L) * (1.5 * V * V + 0.35 * V * G);
  let baseWatts = standing + loadCost + locomotion;

  // Santee correction for downhill 
  if (G < 0) {
    baseWatts += eta * (W + L) * (V * G * (G + 6)) / 100;
  }

  baseWatts = Math.max(baseWatts, standing);

  // 2. Calculate Modern Correction Factor (Multiplier)
  let correctionMultiplier = 1.0;

  // A. Speed Adjustment: Pandolf severely underestimates above 1.25 m/s (~4.5 km/h)
  if (V > 1.25) {
      // Smoothly scale up to an extra 15% at brisk walking speeds
      correctionMultiplier += (V - 1.25) * 0.20; 
  }

  // B. Load Adjustment: Underestimation compounds as load increases relative to body weight
  const loadRatio = L / W;
  if (loadRatio > 0.15) {
      // Add up to 10% penalty for heavy loads altering civilian gait
      correctionMultiplier += (loadRatio - 0.15) * 0.5; 
  }

  // C. Biomechanical Efficiency Penalty (Fitness Level)
  // Sedentary/Light users lack the load-carriage economy of trained personnel
  if (fitnessLevel === 'sedentary') {
      correctionMultiplier += 0.08; 
  } else if (fitnessLevel === 'light') {
      correctionMultiplier += 0.04;
  }
  
  // Cap the multiplier to prevent runaway estimates at extreme edges
  correctionMultiplier = Math.min(correctionMultiplier, 1.35);

  return baseWatts * correctionMultiplier;
}

/**
 * Convert metabolic watts to approximate calories per hour.
 * 1 watt ≈ 0.86 kcal/hour (approximate for mixed substrate oxidation)
 */
export function wattsToKcalPerHour(watts: number): number {
  return watts * 0.86;
}

// ──────────────────────────────────────────────
// Metabolic Cost to Heart Rate Mapping
// ──────────────────────────────────────────────

/**
 * Estimate heart rate from metabolic cost using the linear HR-VO2 relationship.
 *
 * This is the key bridge between the Pandolf equation and heart rate zones.
 * The relationship between %VO2max and %HRR is approximately linear,
 * which is why the Karvonen method works well.
 *
 * We estimate VO2 from metabolic cost, then map to HR via the HRR relationship.
 *
 * Assumptions:
 * - VO2 (ml/kg/min) ≈ metabolic watts / bodyWeight * 60 / 20.9 (approximate)
 * - VO2max estimated from fitness level
 * - %VO2max maps approximately to %HRR
 *
 * This is an ESTIMATE. The site must be clear about this.
 */

const ESTIMATED_VO2MAX: Record<string, { male: number; female: number }> = {
  sedentary:   { male: 35, female: 30 },
  light:       { male: 40, female: 35 },
  moderate:    { male: 45, female: 40 },
  very_active: { male: 52, female: 47 },
};

export function estimateVO2max(fitnessLevel: string, sex: 'male' | 'female' = 'male'): number {
  return ESTIMATED_VO2MAX[fitnessLevel]?.[sex] ?? 40;
}

export function metabolicCostToHR(
  metabolicWatts: number,
  bodyWeightKg: number,
  maxHR: number,
  restingHR: number,
  vo2max: number,
): number {
  // Convert watts to VO2 (ml/kg/min)
  // 1 watt ≈ 60 / (20.9 * bodyWeight) in L/min, then * 1000 / bodyWeight for ml/kg/min
  // Simplified: VO2 (ml/kg/min) ≈ watts * 60 / (bodyWeight * 20.9)
  // Actually the standard conversion: 1 L O2 ≈ 20.9 kJ ≈ 348.3 watts·min
  // So VO2 (L/min) = watts * 60 / (20.9 * 1000) ... let me use the standard conversion:
  // watts = VO2 (L/min) * 20.9 * 1000 / 60
  // VO2 (L/min) = watts * 60 / 20900
  // VO2 (ml/kg/min) = watts * 60 / 20.9 / bodyWeight

  const vo2 = (metabolicWatts * 60) / (20.9 * bodyWeightKg);

  // %VO2max
  const percentVO2max = Math.min(vo2 / vo2max, 1.0);

  // %HRR ≈ %VO2max (Swain et al., 1994 — within ~5% for moderate intensities)
  const percentHRR = percentVO2max;

  // HR = %HRR * (MaxHR - RestingHR) + RestingHR
  const hr = percentHRR * (maxHR - restingHR) + restingHR;

  return Math.round(hr);
}

// ──────────────────────────────────────────────
// Reverse Zone 2 Calculator — THE FLAGSHIP TOOL
// ──────────────────────────────────────────────

/**
 * Convert km/h to m/s
 */
export function kmhToMs(kmh: number): number {
  return kmh / 3.6;
}

/**
 * The reverse zone 2 calculator.
 *
 * Given a user's profile and constraints, find the load/pace combinations
 * that will put them in zone 2.
 *
 * This is the tool that doesn't exist anywhere else.
 */
export function calculateLoadUp(input: LoadUpInput): LoadUpResult {
  const {
    bodyWeightKg,
    zone2Low,
    zone2High,
    terrain,
    gradient,
    fitnessLevel,
    maxHR,
    restingHR,
  } = input;

  const terrainFactor = TERRAIN_FACTORS[terrain];
  const gradePercent = GRADIENT_VALUES[gradient] * 100;
  const vo2max = estimateVO2max(fitnessLevel);

  const combinations: LoadPaceCombination[] = [];

  // Sweep load from 0 to 30% of body weight in 1kg steps
  const maxLoad = Math.round(bodyWeightKg * 0.3);

  // Sweep pace from 3.5 to 7.0 km/h in 0.5 steps
  for (let loadKg = 0; loadKg <= maxLoad; loadKg += 1) {
    for (let paceKmh = 3.5; paceKmh <= 7.0; paceKmh += 0.5) {
      const speedMs = kmhToMs(paceKmh);
      const metabolicWatts = pandolfMetabolicCost(bodyWeightKg, loadKg, speedMs, gradePercent, terrainFactor, fitnessLevel);
      const estimatedHR = metabolicCostToHR(metabolicWatts, bodyWeightKg, maxHR, restingHR, vo2max);
      const caloriesPerHour = wattsToKcalPerHour(metabolicWatts);
      const inZone2 = estimatedHR >= zone2Low && estimatedHR <= zone2High;

      combinations.push({
        loadKg,
        paceKmh,
        estimatedHR,
        metabolicCostWatts: Math.round(metabolicWatts),
        inZone2,
        caloriesPerHour: Math.round(caloriesPerHour),
      });
    }
  }

  // Find the best "recommended" starting point:
  // Prefer moderate load (8-15% BW) at a comfortable walking pace (4.5-5.5 km/h)
  // that lands in zone 2
  const zone2Combos = combinations.filter(c => c.inZone2);

  let recommended: LoadUpResult['recommended'];

  if (zone2Combos.length > 0) {
    // Score each combo by how "comfortable" it is
    const scored = zone2Combos.map(c => {
      const loadPercent = c.loadKg / bodyWeightKg;
      const idealLoadProximity = 1 - Math.abs(loadPercent - 0.12); // prefer ~12% BW
      const idealPaceProximity = 1 - Math.abs(c.paceKmh - 5.0) / 5.0; // prefer ~5 km/h
      const zone2Centrality = 1 - Math.abs(c.estimatedHR - (zone2Low + zone2High) / 2) / ((zone2High - zone2Low) / 2); // prefer zone 2 midpoint
      return { ...c, score: idealLoadProximity + idealPaceProximity + zone2Centrality };
    });

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    recommended = {
      loadKg: best.loadKg,
      paceKmh: best.paceKmh,
      estimatedHR: best.estimatedHR,
      caloriesTotal: Math.round(best.caloriesPerHour * (input.durationMinutes / 60)),
    };
  } else {
    // No zone 2 combos found — user might need to walk faster or add more load
    // Give them the closest-to-zone-2 moderate option
    const closest = combinations
      .filter(c => c.paceKmh >= 4.0 && c.paceKmh <= 6.0)
      .sort((a, b) => {
        const midZone = (zone2Low + zone2High) / 2;
        return Math.abs(a.estimatedHR - midZone) - Math.abs(b.estimatedHR - midZone);
      });

    const best = closest[0] ?? combinations[0];
    recommended = {
      loadKg: best.loadKg,
      paceKmh: best.paceKmh,
      estimatedHR: best.estimatedHR,
      caloriesTotal: Math.round(best.caloriesPerHour * (input.durationMinutes / 60)),
    };
  }

  // Safety notes
  const safetyNotes: string[] = [];
  if (recommended.loadKg > 0 && recommended.loadKg < 4) {
    safetyNotes.push('Very light loads can shift around and affect your balance. Make sure the weight is secure and positioned high in the pack.');
  }
  safetyNotes.push('Stop immediately if you feel dizzy, experience sharp joint pain, or have chest tightness.');
  safetyNotes.push('This is an estimate based on the Pandolf equation. Your actual heart rate may differ. Use a heart rate monitor for the first few sessions to calibrate.');

  // Terrain note
  const terrainAdjustment = terrain === 'pavement'
    ? 'Pavement is the most predictable surface. Good for establishing your baseline.'
    : `${terrain.charAt(0).toUpperCase() + terrain.slice(1)} increases effort by roughly ${Math.round((terrainFactor - 1) * 100)}% compared to pavement. You may need slightly less load or a slower pace.`;

  // Progression advice
  const progressionAdvice = recommended.loadKg === 0
    ? 'Start with no extra weight. Focus on maintaining this pace for the full duration. Once comfortable, add 2-3kg and see how your heart rate responds.'
    : `Start here for 2-3 sessions. If your heart rate stays below ${zone2Low} bpm after 10 minutes, increase your pace by 0.5 km/h first. If you're already at a brisk walk, add 2kg. Progress load before speed.`;

  return {
    recommended,
    combinations,
    safetyNotes,
    terrainAdjustment,
    progressionAdvice,
  };
}
