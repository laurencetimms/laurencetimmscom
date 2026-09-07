import { useState } from 'react';
import {
  calculateAllZone2,
  estimateMaxHR,
  type UserProfile,
  type Zone2Range,
} from '../../lib/loadedzone/calculators';

export default function FindYourZoneCalculator() {
  const [age, setAge] = useState('');
  const [restingHR, setRestingHR] = useState('');
  const [knownMaxHR, setKnownMaxHR] = useState('');
  const [sex, setSex] = useState<'male' | 'female' | ''>('');
  const [fitnessLevel, setFitnessLevel] = useState<'sedentary' | 'light' | 'moderate' | 'very_active'>('light');
  const [results, setResults] = useState<Zone2Range[] | null>(null);
  const [maxHRInfo, setMaxHRInfo] = useState<{ maxHR: number; method: string } | null>(null);
  const [showScience, setShowScience] = useState(false);

  const canCalculate = age && parseInt(age) > 0;

  function handleCalculate() {
    if (!canCalculate) return;

    const profile: UserProfile = {
      age: parseInt(age),
      bodyWeightKg: 70, // not needed for HR calc but required by type
      restingHR: restingHR ? parseInt(restingHR) : undefined,
      knownMaxHR: knownMaxHR ? parseInt(knownMaxHR) : undefined,
      sex: sex || undefined,
      fitnessLevel,
    };

    const zones = calculateAllZone2(profile);
    const maxInfo = estimateMaxHR(profile);
    setResults(zones);
    setMaxHRInfo(maxInfo);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <p className="text-lg text-stone-600 leading-relaxed">
          Your zone 2 heart rate is personal. It depends on your age, fitness, and resting heart rate.
          Enter your details and we'll calculate it three different ways — ranked by accuracy.
        </p>
      </div>

      {/* Form */}
      <div className="bg-white border border-stone-200 rounded-xl p-6 sm:p-8 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Age</label>
            <input
              type="number"
              value={age}
              onChange={e => setAge(e.target.value)}
              placeholder="e.g. 44"
              min="16" max="100"
              className="w-full px-4 py-2.5 border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-zone/40 focus:border-zone transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">
              Resting heart rate
              <span className="text-xs font-normal text-stone-400 ml-1">(recommended)</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={restingHR}
                onChange={e => setRestingHR(e.target.value)}
                placeholder="e.g. 62"
                min="30" max="120"
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-zone/40 focus:border-zone transition pr-14"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-stone-400">bpm</span>
            </div>
            <p className="text-xs text-stone-400 mt-1">First thing in the morning, before getting out of bed. Average 3-5 days.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">
              Known max heart rate
              <span className="text-xs font-normal text-stone-400 ml-1">(optional)</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={knownMaxHR}
                onChange={e => setKnownMaxHR(e.target.value)}
                placeholder="Leave blank to estimate"
                min="120" max="230"
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-zone/40 focus:border-zone transition pr-14"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-stone-400">bpm</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Sex</label>
            <select
              value={sex}
              onChange={e => setSex(e.target.value as any)}
              className="w-full px-4 py-2.5 border border-stone-300 rounded-lg text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-zone/40 focus:border-zone transition"
            >
              <option value="">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
            <p className="text-xs text-stone-400 mt-1">Selects a more accurate max HR formula for women (Gulati).</p>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Current fitness level</label>
            <select
              value={fitnessLevel}
              onChange={e => setFitnessLevel(e.target.value as any)}
              className="w-full px-4 py-2.5 border border-stone-300 rounded-lg text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-zone/40 focus:border-zone transition"
            >
              <option value="sedentary">Sedentary (mostly desk-based)</option>
              <option value="light">Lightly active (walk regularly)</option>
              <option value="moderate">Moderately active (exercise 2-3x/week)</option>
              <option value="very_active">Very active (exercise 4+x/week)</option>
            </select>
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={handleCalculate}
            disabled={!canCalculate}
            className="w-full sm:w-auto px-8 py-3 bg-zone text-white font-semibold rounded-lg hover:bg-zone-dark disabled:bg-stone-300 disabled:cursor-not-allowed transition-colors text-lg"
          >
            Calculate my zone 2
          </button>
        </div>
      </div>

      {/* Results */}
      {results && maxHRInfo && (
        <div className="mt-10 space-y-6">

          {/* Primary result — Karvonen */}
          <div className="bg-gradient-to-br from-zone/5 to-zone/10 border border-zone/20 rounded-xl p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-zone-dark mb-1">Your zone 2 range (recommended)</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl sm:text-6xl font-bold text-zone font-display">{results[0].low}</span>
                  <span className="text-2xl text-stone-400">–</span>
                  <span className="text-5xl sm:text-6xl font-bold text-zone font-display">{results[0].high}</span>
                  <span className="text-lg text-stone-400 ml-1">bpm</span>
                </div>
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded ${
                results[0].confidence === 'high'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {results[0].confidence === 'high' ? 'High accuracy' : 'Good estimate'}
              </span>
            </div>
            <p className="mt-4 text-stone-600">{results[0].description}</p>
            <p className="mt-3 text-sm text-stone-500">
              Method: {results[0].method} · Max HR: {maxHRInfo.maxHR} bpm ({maxHRInfo.method})
            </p>
          </div>

          {/* Talk test */}
          <div className="bg-white border border-stone-200 rounded-xl p-6">
            <h3 className="font-semibold text-stone-900 mb-2">The talk test (no tech needed)</h3>
            <p className="text-stone-600 leading-relaxed">
              At the right zone 2 intensity, you can speak in full sentences but feel slightly breathless. 
              If you can sing, you're too easy. If you can only manage a few words at a time, you're too hard.
              Walking with a friend and chatting normally? That's probably zone 2.
            </p>
          </div>

          {/* Other methods */}
          <div className="bg-white border border-stone-200 rounded-xl p-6">
            <h3 className="font-semibold text-stone-900 mb-4">Other calculation methods</h3>
            <div className="space-y-4">
              {results.slice(1).map((zone, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-stone-100 last:border-0">
                  <div>
                    <p className="font-medium text-stone-700">{zone.method}</p>
                    <p className="text-sm text-stone-400">{zone.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <span className="text-xl font-bold text-stone-700">{zone.low}–{zone.high}</span>
                    <span className="text-sm text-stone-400 ml-1">bpm</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Next step */}
          <div className="bg-zone/5 border border-zone/20 rounded-xl p-6 text-center">
            <p className="text-stone-700 font-medium">Now you know your zone 2 range.</p>
            <a
              href="/loadedzone/load-up/"
              className="inline-flex items-center justify-center mt-3 px-6 py-2.5 bg-zone text-white font-semibold rounded-lg hover:bg-zone-dark transition-colors"
            >
              Find your ideal load &amp; pace →
            </a>
          </div>

          {/* Show me the science */}
          <div className="border border-stone-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowScience(!showScience)}
              className="w-full px-6 py-4 text-left flex items-center justify-between bg-stone-50 hover:bg-stone-100 transition-colors"
            >
              <span className="font-semibold text-stone-800">Show me the science</span>
              <span className={`text-stone-400 transition-transform ${showScience ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {showScience && (
              <div className="px-6 py-6 text-sm text-stone-600 space-y-4 leading-relaxed">
                <div>
                  <h4 className="font-semibold text-stone-800 mb-1">Karvonen Method (Heart Rate Reserve)</h4>
                  <p>
                    The gold standard for personalised zone calculation without lab testing. Uses your resting heart rate
                    to account for individual fitness. Recommended by the ACSM for exercise prescription.
                  </p>
                  <p className="mt-2 font-mono text-xs bg-stone-100 p-3 rounded">
                    Target HR = ((Max HR − Resting HR) × %Intensity) + Resting HR
                  </p>
                  <p className="mt-2 text-xs text-stone-500">
                    Karvonen, M.J. et al. (1957). "The effects of training on heart rate." Annales Medicinae Experimentalis et Biologiae Fenniae.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-stone-800 mb-1">Max HR Estimation</h4>
                  <p>
                    The common "220 minus age" formula has a standard deviation of ±10-12 bpm — significant for zone 2 accuracy.
                    We use the Tanaka formula (208 − 0.7 × age) which is more accurate across age ranges, and the Gulati formula
                    (206 − 0.88 × age) for women.
                  </p>
                  <p className="mt-2 text-xs text-stone-500">
                    Tanaka, H. et al. (2001). JACC. · Gulati, M. et al. (2010). Circulation.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-stone-800 mb-1">What does "zone 2" actually mean?</h4>
                  <p>
                    Zone 2, as defined by exercise physiologist Iñigo San Millán, is the intensity that maximally stimulates
                    mitochondrial function — your body's ability to burn fat and clear lactate. It's not tied to any single
                    heart rate model (3-zone, 5-zone, 7-zone). The 60-70% of HRR range is the best proxy without a lab metabolic test.
                  </p>
                  <p className="mt-2 text-xs text-stone-500">
                    San-Millán, I. & Brooks, G.A. (2018). "Assessment of Metabolic Flexibility by Means of Measuring Blood Lactate, Fat, and Carbohydrate Oxidation Responses to Exercise in Professional Endurance Athletes and Less-Fit Individuals." Sports Medicine.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
