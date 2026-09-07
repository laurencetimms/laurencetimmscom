import { useState, useEffect, useMemo } from 'react';
import {
  estimateMaxHR,
  zone2_Karvonen,
  calculateLoadUp,
  type UserProfile,
  type TerrainType,
  type GradientType,
  type LoadUpResult,
  type LoadPaceCombination,
} from '../../lib/loadedzone/calculators';

const ESTIMATED_RHR: Record<string, number> = {
  sedentary: 72,
  light: 65,
  moderate: 58,
  very_active: 50,
};

export default function LoadUpCalculator() {
  // 1. Gateway State
  const [userGoal, setUserGoal] = useState<'health' | 'performance' | null>(null);

  // Form state
  const [age, setAge] = useState<string>('');
  const [bodyWeight, setBodyWeight] = useState<string>('');
  const [useImperial, setUseImperial] = useState(false);
  const [restingHR, setRestingHR] = useState<string>('');
  const [knownMaxHR, setKnownMaxHR] = useState<string>('');
  const [sex, setSex] = useState<'male' | 'female' | ''>('');
  const [fitnessLevel, setFitnessLevel] = useState<'sedentary' | 'light' | 'moderate' | 'very_active'>('light');
  const [duration, setDuration] = useState<string>('45');
  const [terrain, setTerrain] = useState<TerrainType>('pavement');
  const [gradient, setGradient] = useState<GradientType>('flat');
  const [showScience, setShowScience] = useState(false);

  // Result state
  const [result, setResult] = useState<LoadUpResult | null>(null);
  const [zone2Range, setZone2Range] = useState<{ low: number; high: number } | null>(null);

  // 2. Read URL Parameters on Mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const goalParam = params.get('goal');
      if (goalParam === 'health' || goalParam === 'performance') {
        setUserGoal(goalParam);
      }
    }
  }, []);

  // Update defaults based on goal
  useEffect(() => {
    if (userGoal === 'health') {
      setTerrain('pavement');
      setGradient('flat');
    }
  }, [userGoal]);

  const canCalculate = age && bodyWeight && parseInt(age) > 0 && parseFloat(bodyWeight) > 0;

  function handleCalculate() {
    if (!canCalculate) return;

    const ageNum = parseInt(age);
    const weightKg = useImperial ? parseFloat(bodyWeight) * 0.453592 : parseFloat(bodyWeight);
    const rhr = restingHR ? parseInt(restingHR) : undefined;
    const maxhr = knownMaxHR ? parseInt(knownMaxHR) : undefined;

    const profile: UserProfile = {
      age: ageNum,
      bodyWeightKg: weightKg,
      restingHR: rhr,
      knownMaxHR: maxhr,
      sex: sex || undefined,
      fitnessLevel,
    };

    const { maxHR: estimatedMax } = estimateMaxHR(profile);
    const effectiveRHR = rhr ?? ESTIMATED_RHR[fitnessLevel];
    const zone2 = zone2_Karvonen(estimatedMax, effectiveRHR);

    setZone2Range({ low: zone2.low, high: zone2.high });

    // Enforce safety cap for health path
    let internalWeightOverride = weightKg;
    if (userGoal === 'health' && ageNum > 55) {
       // Just a marker here; the actual capping logic happens below by evaluating the results
    }

    const loadUpResult = calculateLoadUp({
      bodyWeightKg: weightKg,
      zone2Low: zone2.low,
      zone2High: zone2.high,
      durationMinutes: parseInt(duration) || 45,
      terrain,
      gradient,
      fitnessLevel,
      maxHR: estimatedMax,
      restingHR: effectiveRHR,
    });

    // Enforce Health/Longevity Guardrails post-calculation
    if (userGoal === 'health') {
        const maxSafeLoad = weightKg * 0.10; // Cap at 10% BW for health/older users
        if (loadUpResult.recommended.loadKg > maxSafeLoad) {
            // Find a faster pace with a safe load
            const safeCombos = loadUpResult.combinations.filter(c => c.loadKg <= maxSafeLoad && c.inZone2);
            if (safeCombos.length > 0) {
                 // Sort by closest to mid zone
                 const midZone = (zone2.low + zone2.high) / 2;
                 safeCombos.sort((a,b) => Math.abs(a.estimatedHR - midZone) - Math.abs(b.estimatedHR - midZone));
                 loadUpResult.recommended.loadKg = safeCombos[0].loadKg;
                 loadUpResult.recommended.paceKmh = safeCombos[0].paceKmh;
                 loadUpResult.recommended.estimatedHR = safeCombos[0].estimatedHR;
            } else {
                 // If no safe load hits zone 2, cap the load and recommend max pace available
                 loadUpResult.recommended.loadKg = Math.round(maxSafeLoad);
            }
        }
    }

    setResult(loadUpResult);
  }

  const uniqueLoads = useMemo(() => {
    if (!result) return [];
    const loads = [...new Set(result.combinations.map(c => c.loadKg))].filter(l => l > 0);
    return loads.filter((_, i) => i % 2 === 0 || loads.length < 15);
  }, [result]);

  const uniquePaces = useMemo(() => {
    if (!result) return [];
    return [...new Set(result.combinations.map(c => c.paceKmh))];
  }, [result]);

  // 3. The Gateway UI
  if (!userGoal) {
    return (
      <div className="max-w-2xl mx-auto text-center py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h2 className="font-display text-3xl font-bold text-stone-900 mb-4">
          What brings you to LoadedZone?
        </h2>
        <p className="text-stone-600 mb-8">
          Select your goal so we can tailor the calculator and safety recommendations to your body.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          <button 
            onClick={() => setUserGoal('health')}
            className="p-8 bg-white border border-stone-200 rounded-xl hover:border-zone hover:shadow-md transition-all flex flex-col gap-3 group"
          >
            <span className="text-3xl group-hover:scale-110 transition-transform origin-left">🚶‍♀️</span>
            <span className="font-display font-bold text-stone-900 group-hover:text-zone text-xl">Health & Longevity</span>
            <span className="text-sm text-stone-500 leading-relaxed">I want to walk safely for cardiovascular health, joint support, and active aging.</span>
          </button>

          <button 
            onClick={() => setUserGoal('performance')}
            className="p-8 bg-white border border-stone-200 rounded-xl hover:border-zone hover:shadow-md transition-all flex flex-col gap-3 group"
          >
            <span className="text-3xl grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all origin-left">⏱️</span>
            <span className="font-display font-bold text-stone-900 group-hover:text-zone text-xl">Zone 2 Performance</span>
            <span className="text-sm text-stone-500 leading-relaxed">I want the exact metabolic math to dial in my loaded walking heart rate zones.</span>
          </button>
        </div>
      </div>
    );
  }

  // 4. The Main Calculator UI
  return (
    <div className="max-w-3xl mx-auto animate-in fade-in duration-500">
      {/* Introduction */}
      <div className="mb-8 flex items-center justify-between">
        <div>
            <h2 className="font-display text-2xl font-bold text-stone-900 mb-2">
                {userGoal === 'health' ? 'Your Health Plan' : 'Your Performance Metrics'}
            </h2>
            <p className="text-stone-600">
            Tell us about you. Answer a few simple questions, and we'll calculate your exact walk plan.
            </p>
        </div>
        <button 
            onClick={() => {setUserGoal(null); setResult(null);}} 
            className="text-sm font-semibold text-stone-400 hover:text-zone transition-colors underline underline-offset-4"
        >
            Change Goal
        </button>
      </div>

      {/* Form */}
      <div className="bg-white border border-stone-200 rounded-xl p-6 sm:p-8 shadow-sm">
        
        {/* Section 1: The Human */}
        <div className="mb-8">
          <h3 className="font-display font-bold text-lg text-stone-900 mb-4 border-b border-stone-100 pb-2">1. The Human</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Age */}
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1">Your age</label>
              <p className="text-xs text-stone-500 mb-2">Used to calculate heart rate targets.</p>
              <input
                type="number"
                value={age}
                onChange={e => setAge(e.target.value)}
                placeholder="e.g. 45"
                min="16"
                max="100"
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-zone/40 focus:border-zone transition"
              />
            </div>

            {/* Body weight */}
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1">
                Your weight
                <button
                  onClick={() => setUseImperial(!useImperial)}
                  className="ml-2 text-xs font-normal text-zone hover:text-zone-dark transition"
                >
                  ({useImperial ? 'switch to kg' : 'switch to lbs'})
                </button>
              </label>
              <p className="text-xs text-stone-500 mb-2">Used for metabolic baseline.</p>
              <div className="relative">
                <input
                  type="number"
                  value={bodyWeight}
                  onChange={e => setBodyWeight(e.target.value)}
                  placeholder={useImperial ? 'e.g. 175' : 'e.g. 80'}
                  min="30"
                  max="250"
                  className="w-full px-4 py-2.5 border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-zone/40 focus:border-zone transition pr-12"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-stone-400">
                  {useImperial ? 'lbs' : 'kg'}
                </span>
              </div>
            </div>

            {/* Fitness level */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-stone-700 mb-1">How would you describe your cardio fitness?</label>
              <select
                value={fitnessLevel}
                onChange={e => setFitnessLevel(e.target.value as any)}
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-zone/40 focus:border-zone transition mt-1"
              >
                <option value="sedentary">Just starting out (rarely exercise)</option>
                <option value="light">Active (I walk or exercise a few times a week)</option>
                <option value="moderate">Trained (I do dedicated cardio regularly)</option>
                <option value="very_active">Highly trained (I do intense cardio 4+ times a week)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: The Environment (Hidden/Simplified for Health users) */}
        {userGoal === 'performance' && (
            <div className="mb-6">
            <h3 className="font-display font-bold text-lg text-stone-900 mb-4 border-b border-stone-100 pb-2">2. The Environment</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">Where will you walk?</label>
                <select
                    value={terrain}
                    onChange={e => setTerrain(e.target.value as TerrainType)}
                    className="w-full px-4 py-2.5 border border-stone-300 rounded-lg text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-zone/40 focus:border-zone transition"
                >
                    <option value="pavement">Pavements & Tarmac</option>
                    <option value="gravel">Dirt Roads & Park Paths</option>
                    <option value="grass">Rough Trails & Grass</option>
                    <option value="mixed">Mixed terrain</option>
                </select>
                </div>

                <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">How hilly is the route?</label>
                <select
                    value={gradient}
                    onChange={e => setGradient(e.target.value as GradientType)}
                    className="w-full px-4 py-2.5 border border-stone-300 rounded-lg text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-zone/40 focus:border-zone transition"
                >
                    <option value="flat">Mostly Flat</option>
                    <option value="gentle">Gentle Hills</option>
                    <option value="moderate">Moderate Hills</option>
                </select>
                </div>

                <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">How long?</label>
                <select
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                    className="w-full px-4 py-2.5 border border-stone-300 rounded-lg text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-zone/40 focus:border-zone transition"
                >
                    <option value="20">20 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">60 minutes</option>
                    <option value="90">90 minutes</option>
                </select>
                </div>
            </div>
            </div>
        )}

        {/* Section 3: Advanced Biometrics (Hidden for Health users) */}
        {userGoal === 'performance' && (
            <details className="mb-8 group">
            <summary className="text-sm font-semibold text-stone-500 cursor-pointer hover:text-stone-800 transition-colors list-none flex items-center gap-2">
                <span className="text-lg leading-none transition-transform group-open:rotate-45">+</span>
                Advanced Biometrics (Optional)
            </summary>
            <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-stone-100 mt-4">
                <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1">Resting HR</label>
                <div className="relative">
                    <input
                    type="number"
                    value={restingHR}
                    onChange={e => setRestingHR(e.target.value)}
                    placeholder="e.g. 62"
                    min="30"
                    max="120"
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-zone/40 focus:border-zone transition pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">bpm</span>
                </div>
                </div>
                <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1">Known Max HR</label>
                <div className="relative">
                    <input
                    type="number"
                    value={knownMaxHR}
                    onChange={e => setKnownMaxHR(e.target.value)}
                    placeholder="e.g. 185"
                    min="120"
                    max="230"
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-zone/40 focus:border-zone transition pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">bpm</span>
                </div>
                </div>
                <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1">Sex</label>
                <select
                    value={sex}
                    onChange={e => setSex(e.target.value as 'male' | 'female' | '')}
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-zone/40 focus:border-zone transition"
                >
                    <option value="">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                </select>
                </div>
            </div>
            </details>
        )}

        {/* Calculate button */}
        <div className="mt-8 pt-4 border-t border-stone-100">
          <button
            onClick={handleCalculate}
            disabled={!canCalculate}
            className="w-full px-8 py-3.5 bg-zone text-white font-bold rounded-lg hover:bg-zone-dark disabled:bg-stone-300 disabled:cursor-not-allowed transition-colors text-lg shadow-sm"
          >
            Calculate my walk plan
          </button>
        </div>
      </div>

      {/* Results */}
      {result && zone2Range && (
        <div className="mt-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* Primary recommendation */}
          <div className="bg-gradient-to-br from-zone/5 to-zone/10 border border-zone/20 rounded-xl p-6 sm:p-8">
            <h2 className="font-display text-3xl font-bold text-stone-900 mb-8">Your Zone 2 Walk</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Carry */}
              <div className="bg-white rounded-lg p-5 border border-stone-100 shadow-sm flex flex-col items-center justify-center">
                <span className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-1">Carry</span>
                <div className="text-4xl font-bold text-zone mb-1">{result.recommended.loadKg} <span className="text-lg font-medium text-stone-400">{useImperial ? 'kg' : 'kg'}</span></div>
                <div className="text-sm text-stone-500 text-center mt-2">
                  {useImperial && <span className="block mb-1">({Math.round(result.recommended.loadKg * 2.205)} lbs)</span>}
                  <span className="text-stone-400">e.g., A sturdy rucksack</span>
                </div>
              </div>

              {/* Pace */}
              <div className="bg-white rounded-lg p-5 border border-stone-100 shadow-sm flex flex-col items-center justify-center">
                <span className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-1">Pace</span>
                <div className="text-4xl font-bold text-zone mb-1">{useImperial ? (result.recommended.paceKmh * 0.621).toFixed(1) : result.recommended.paceKmh} <span className="text-lg font-medium text-stone-400">{useImperial ? 'mph' : 'km/h'}</span></div>
                <div className="text-sm text-stone-500 text-center mt-2">
                  {!useImperial && <span className="block mb-1">({(result.recommended.paceKmh * 0.621).toFixed(1)} mph)</span>}
                  <span className="text-stone-400">A brisk, purposeful walk</span>
                </div>
              </div>

              {/* Target HR */}
              <div className="bg-white rounded-lg p-5 border border-stone-100 shadow-sm flex flex-col items-center justify-center">
                <span className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-1">Target Heart Rate</span>
                <div className="text-3xl font-bold text-stone-800 mb-1">{zone2Range.low}–{zone2Range.high} <span className="text-lg font-medium text-stone-400">bpm</span></div>
                <div className="text-sm text-stone-500 text-center mt-2">
                  <span className="text-stone-400">Estimated output: ~{result.recommended.estimatedHR} bpm</span>
                </div>
              </div>
            </div>

            <div className="bg-white/60 rounded-lg p-5 text-stone-700 leading-relaxed border border-white/50">
              <p>
                {userGoal === 'health' 
                  ? result.recommended.loadKg === 0 
                    ? 'Walk without extra weight at this pace. This is a perfect starting point to build cardiovascular health without stressing your joints.'
                    : `Start with your normal walking pace and add ${result.recommended.loadKg}kg to your pack. This slight resistance is perfect for supporting joint health and building cardiovascular endurance safely.`
                  : result.recommended.loadKg === 0
                    ? 'Walk without extra weight at this pace. Your natural effort should put you right in your zone 2 threshold. Once this feels effortless, start adding 2-3kg.'
                    : `Load ${result.recommended.loadKg}kg into a comfortable pack and walk at ${result.recommended.paceKmh} km/h. This specific combination satisfies the metabolic demand needed to keep your heart rate in the ${zone2Range.low}–${zone2Range.high} bpm range.`
                }
              </p>
            </div>
            
            {/* Safety Guardrails (Only trigger if performance path, health path is capped inherently) */}
            {userGoal === 'performance' && (result.recommended.loadKg > 20 || result.recommended.loadKg > (useImperial ? parseFloat(bodyWeight) * 0.453592 : parseFloat(bodyWeight)) * 0.20) && (
              <div className="mb-6 mt-6 bg-amber-50 border border-amber-200 rounded-lg p-5 text-amber-900 shadow-sm flex items-start gap-3">
                <span className="text-xl leading-none mt-0.5">⚠️</span>
                <div>
                  <h4 className="font-bold text-amber-900 mb-1">Heavy Load Alert</h4>
                  {result.recommended.loadKg > 20 ? (
                    <p className="text-sm text-amber-800 leading-relaxed">
                      This plan calls for <strong>{result.recommended.loadKg}kg</strong>. While specialist rucking gear can handle this, putting this much weight in a standard rucksack shifts the workout from cardio to heavy strength endurance, and risks straining your back. <strong>We strongly recommend changing your terrain to a hill, or increasing your walking pace to lower the required weight.</strong>
                    </p>
                  ) : (
                    <p className="text-sm text-amber-800 leading-relaxed">
                      This plan calls for a load that is over <strong>20% of your body weight</strong>. Carrying this much can alter your natural walking gait and increase impact on your knees and lower back. Consider walking slightly faster to reduce the weight needed.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Session Card CTA Loop */}
            <div className="mt-8 bg-white border border-stone-200 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
              <div>
                <h4 className="font-bold text-stone-900 text-lg">Take this with you</h4>
                <p className="text-sm text-stone-600 mt-1">Print this plan so you can leave your phone at home and just walk.</p>
              </div>
              <a href="/loadedzone/session-card/" className="whitespace-nowrap px-6 py-3 bg-stone-900 text-white font-semibold rounded-lg hover:bg-stone-700 transition-colors shadow-sm">
                Generate my Session Card
              </a>
            </div>
          </div>

          {/* Zone 2 map — Hidden for Health to keep UI clean */}
          {userGoal === 'performance' && uniqueLoads.length > 0 && uniquePaces.length > 0 && (
            <div className="bg-white border border-stone-200 rounded-xl p-6 sm:p-8 shadow-sm">
              <h3 className="font-display text-xl font-bold text-stone-900 mb-2">Zone 2 combinations</h3>
              <p className="text-sm text-stone-500 mb-4">
                All the load/pace combinations that put you in zone 2. Green cells are in zone 2. Pick the one that suits your route and mood.
              </p>
              <div className="overflow-x-auto -mx-2 px-2">
                <table className="text-sm w-full">
                  <thead>
                    <tr>
                      <th className="text-left text-stone-500 font-medium py-2 pr-3 sticky left-0 bg-white">
                        {useImperial ? 'lbs ↓' : 'kg ↓'} / {useImperial ? 'mph →' : 'km/h →'}
                      </th>
                      {uniquePaces.map(p => (
                        <th key={p} className="text-center text-stone-500 font-medium py-2 px-2 whitespace-nowrap">
                          {useImperial ? (p * 0.621).toFixed(1) : p}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {uniqueLoads.map(load => (
                      <tr key={load}>
                        <td className="font-medium text-stone-700 py-1.5 pr-3 sticky left-0 bg-white">
                          {useImperial ? Math.round(load * 2.205) : load}
                        </td>
                        {uniquePaces.map(pace => {
                          const combo = result.combinations.find(c => c.loadKg === load && c.paceKmh === pace);
                          if (!combo) return <td key={pace} className="text-center py-1.5 px-2">—</td>;
                          return (
                            <td
                              key={pace}
                              className={`text-center py-1.5 px-2 rounded transition-colors ${
                                combo.inZone2
                                  ? 'bg-zone/15 text-zone-dark font-semibold'
                                  : combo.estimatedHR < (zone2Range?.low ?? 0)
                                    ? 'text-stone-300'
                                    : 'text-stone-300'
                              }`}
                              title={`${combo.estimatedHR} bpm, ~${combo.caloriesPerHour} kcal/hr`}
                            >
                              {combo.inZone2 ? combo.estimatedHR : '·'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Terrain & progression */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-stone-900 mb-2">
                 {userGoal === 'health' ? 'Why this works' : 'Terrain note'}
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                 {userGoal === 'health' 
                   ? 'Walking with a light load increases muscular endurance and improves balance—two key factors in maintaining mobility and bone health as we age.'
                   : result.terrainAdjustment}
              </p>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-stone-900 mb-2">What's next</h3>
              <p className="text-sm text-stone-600 leading-relaxed">{result.progressionAdvice}</p>
            </div>
          </div>

          {/* Safety */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
            <h3 className="font-semibold text-amber-900 mb-3">Important</h3>
            <ul className="space-y-2">
              {result.safetyNotes.map((note, i) => (
                <li key={i} className="text-sm text-amber-800 leading-relaxed flex gap-2">
                  <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
                  {note}
                </li>
              ))}
              {userGoal === 'health' && parseInt(age) > 55 && (
                 <li className="text-sm text-amber-800 leading-relaxed flex gap-2">
                  <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
                  Note: If you are walking specifically for bone health (e.g. osteopenia), loaded walking is great for balance, but should be paired with resistance training for maximum bone benefits.
                </li>
              )}
            </ul>
          </div>

          {/* Show me the science (Only show on Performance Path) */}
          {userGoal === 'performance' && (
              <div className="border border-stone-200 rounded-xl overflow-hidden bg-white">
                <button
                onClick={() => setShowScience(!showScience)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-stone-50 transition-colors"
                >
                <span className="font-semibold text-stone-800">How did we calculate this?</span>
                <span className={`text-stone-400 transition-transform ${showScience ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {showScience && (
                <div className="px-6 py-6 border-t border-stone-100 text-sm text-stone-600 space-y-5 leading-relaxed bg-stone-50/50">
                    <div>
                    <h4 className="font-semibold text-stone-800 mb-1.5">The Pandolf Equation</h4>
                    <p>
                        To calculate your specific zone 2 load, we use the Pandolf Equation, a clinical formula developed by the US military in 1977 to measure the exact metabolic cost of carrying loads on foot. It accounts for your body weight, the pack weight, walking speed, terrain coefficient, and gradient.
                    </p>
                    <p className="mt-3 font-mono text-xs bg-white border border-stone-200 p-3 rounded text-stone-700">
                        M = 1.5W + 2.0(W+L)(L/W)² + η(W+L)(1.5V² + 0.35VG)
                    </p>
                    <p className="mt-2 text-xs text-stone-400">
                        Pandolf, K.B. et al. (1977). "Predicting energy expenditure with loads while standing or walking very slowly."
                        Journal of Applied Physiology, 43(4), 577-581.
                    </p>
                    </div>
                    <div>
                    <h4 className="font-semibold text-stone-800 mb-1.5">Reverse Engineering your Zone 2</h4>
                    <p>
                        Based on your age, resting heart rate, and fitness level, we calculate your target zone 2 threshold using the Karvonen method. We then convert this required heart rate into an estimated oxygen consumption (VO₂) demand. Finally, we reverse-engineer the Pandolf formula against your chosen terrain to find the exact combination of pace and weight required to reach that specific metabolic demand.
                    </p>
                    </div>

                    <div>
                    <h4 className="font-semibold text-stone-800 mb-1.5">Modern Adjustments</h4>
                    <p>
                        While the original Pandolf equation is foundational, modern research (such as Drain et al., 2017) shows it consistently underestimates the energy burned by civilians using modern gear, especially at brisk speeds. We apply a sliding-scale biomechanical correction factor (+5% to +30%) to the raw output based on your speed, load ratio, and fitness level to ensure your heart rate targets are accurate for the real world.
                    </p>
                    </div>

                    <div>
                    <h4 className="font-semibold text-stone-800 mb-1.5">Limitations</h4>
                    <p>
                        This is an evidence-based estimate, not a medical prescription. The Pandolf equation was validated for steady-state walking. Individual variation in walking economy, cardiovascular drift, temperature, and hydration can shift actual heart rate by ±10-15% from these estimates. We recommend using a heart rate monitor for your first few sessions to calibrate these numbers against your actual physiology.
                    </p>
                    </div>
                </div>
                )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}