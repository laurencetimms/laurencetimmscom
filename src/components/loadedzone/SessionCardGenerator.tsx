import { useState, useRef } from 'react';

interface SessionCardData {
  zone2Low: number;
  zone2High: number;
  loadKg: number;
  paceKmh: number;
  durationMinutes: number;
  terrain: string;
  date: string;
}

export default function SessionCardGenerator() {
  const [zone2Low, setZone2Low] = useState('');
  const [zone2High, setZone2High] = useState('');
  const [loadKg, setLoadKg] = useState('');
  const [paceKmh, setPaceKmh] = useState('');
  const [duration, setDuration] = useState('45');
  const [terrain, setTerrain] = useState('pavement');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [useImperial, setUseImperial] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const canGenerate = zone2Low && zone2High && loadKg && paceKmh;

  function handleGenerate() {
    if (!canGenerate) return;
    setShowCard(true);
  }

  function handlePrint() {
    window.print();
  }

  const loadDisplay = useImperial ? `${Math.round(parseFloat(loadKg) * 2.205)} lbs` : `${loadKg} kg`;
  const paceDisplay = useImperial ? `${(parseFloat(paceKmh) * 0.621).toFixed(1)} mph` : `${paceKmh} km/h`;

  const checkInMinutes = parseInt(duration) >= 40
    ? [10, Math.round(parseInt(duration) / 2), parseInt(duration) - 5]
    : [10, parseInt(duration) - 5];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <p className="text-lg text-stone-600 leading-relaxed">
          Generate a walk plan you can print or screenshot.
          Page one is your session. Page two is a quick reference for heart rate checking,
          the talk test, and when to stop. <strong>Leave your phone at home.</strong>
        </p>
        <p className="mt-3 text-sm text-stone-500">
          Already used <a href="/loadedzone/load-up/" className="text-zone hover:text-zone-dark underline">Load Up</a>?
          Enter the numbers it gave you below.
        </p>
      </div>

      {/* Form */}
      {!showCard && (
        <div className="bg-white border border-stone-200 rounded-xl p-6 sm:p-8 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1.5">Zone 2 low (bpm)</label>
              <input type="number" value={zone2Low} onChange={e => setZone2Low(e.target.value)}
                placeholder="e.g. 120" min="60" max="200"
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-zone/40 focus:border-zone transition" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1.5">Zone 2 high (bpm)</label>
              <input type="number" value={zone2High} onChange={e => setZone2High(e.target.value)}
                placeholder="e.g. 140" min="60" max="200"
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-zone/40 focus:border-zone transition" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                Pack weight
                <button onClick={() => setUseImperial(!useImperial)} className="ml-2 text-xs font-normal text-zone hover:text-zone-dark">
                  ({useImperial ? 'switch to kg' : 'switch to lbs'})
                </button>
              </label>
              <div className="relative">
                <input type="number" value={loadKg} onChange={e => setLoadKg(e.target.value)}
                  placeholder={useImperial ? 'e.g. 26' : 'e.g. 12'} min="0" max="50"
                  className="w-full px-4 py-2.5 border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-zone/40 focus:border-zone transition pr-12" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-stone-400">{useImperial ? 'lbs' : 'kg'}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1.5">Target pace</label>
              <div className="relative">
                <input type="number" value={paceKmh} onChange={e => setPaceKmh(e.target.value)}
                  placeholder={useImperial ? 'e.g. 3.1' : 'e.g. 5.0'} min="2" max="8" step="0.1"
                  className="w-full px-4 py-2.5 border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-zone/40 focus:border-zone transition pr-14" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-stone-400">{useImperial ? 'mph' : 'km/h'}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1.5">Duration</label>
              <select value={duration} onChange={e => setDuration(e.target.value)}
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-zone/40 focus:border-zone transition">
                <option value="20">20 minutes</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">60 minutes</option>
                <option value="90">90 minutes</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1.5">Date</label>
              <input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-zone/40 focus:border-zone transition" />
            </div>
          </div>

          <div className="mt-8">
            <button onClick={handleGenerate} disabled={!canGenerate}
              className="w-full sm:w-auto px-8 py-3 bg-zone text-white font-semibold rounded-lg hover:bg-zone-dark disabled:bg-stone-300 disabled:cursor-not-allowed transition-colors text-lg">
              Generate session card
            </button>
          </div>
        </div>
      )}

      {/* Generated Card */}
      {showCard && (
        <>
          {/* Action buttons (hidden in print) */}
          <div className="no-print flex flex-wrap gap-3 mb-6">
            <button onClick={handlePrint}
              className="px-6 py-2.5 bg-zone text-white font-semibold rounded-lg hover:bg-zone-dark transition-colors">
              Print / Save as PDF
            </button>
            <button onClick={() => setShowCard(false)}
              className="px-6 py-2.5 bg-white text-stone-700 font-semibold rounded-lg border border-stone-300 hover:border-zone hover:text-zone transition-colors">
              Edit details
            </button>
          </div>

          {/* PAGE 1: The Walk Plan */}
          <div ref={printRef} className="bg-white border border-stone-200 rounded-xl p-8 sm:p-10 shadow-sm print:shadow-none print:border-0 print:rounded-none print:p-6">
            <div className="flex items-start justify-between mb-8">
              <div>
                <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">LoadedZone Session Card</span>
                <h2 className="font-display text-2xl font-bold text-stone-900 mt-1">Walk Plan</h2>
              </div>
              <div className="text-right text-sm text-stone-500">
                <div className="font-semibold text-stone-700">{sessionDate}</div>
                <div className="capitalize">{terrain}</div>
              </div>
            </div>

            {/* Key numbers */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <div className="border-2 border-zone rounded-lg p-4 text-center">
                <div className="text-xs font-semibold text-zone uppercase tracking-wider">Heart Rate</div>
                <div className="text-3xl font-bold text-zone mt-1">{zone2Low}–{zone2High}</div>
                <div className="text-xs text-stone-400">bpm (zone 2)</div>
              </div>
              <div className="border border-stone-200 rounded-lg p-4 text-center">
                <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Pack</div>
                <div className="text-3xl font-bold text-stone-800 mt-1">{loadDisplay}</div>
              </div>
              <div className="border border-stone-200 rounded-lg p-4 text-center">
                <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Pace</div>
                <div className="text-3xl font-bold text-stone-800 mt-1">{paceDisplay}</div>
              </div>
              <div className="border border-stone-200 rounded-lg p-4 text-center">
                <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Duration</div>
                <div className="text-3xl font-bold text-stone-800 mt-1">{duration}</div>
                <div className="text-xs text-stone-400">minutes</div>
              </div>
            </div>

            {/* Check-ins */}
            <div className="mb-8">
              <h3 className="font-semibold text-stone-800 mb-3">Check-ins</h3>
              <div className="space-y-2">
                {checkInMinutes.map((min, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <span className="font-bold text-stone-700 w-14 flex-shrink-0">{min} min</span>
                    <span className="text-stone-600">
                      {i === 0 && `Check HR. Above ${zone2High}? Slow down a touch. Below ${zone2Low}? Pick up the pace or find a hill.`}
                      {i === 1 && checkInMinutes.length === 3 && `Halfway. How do you feel? HR should be steady. Can you still talk in full sentences?`}
                      {i === checkInMinutes.length - 1 && `Nearly done. Maintain pace. Start thinking about your cool-down walk home.`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes space */}
            <div className="border-t border-stone-200 pt-6">
              <h3 className="font-semibold text-stone-800 mb-3">Notes</h3>
              <div className="grid grid-cols-2 gap-4 text-sm text-stone-400">
                <div>
                  <p className="mb-1">Weather:</p>
                  <div className="border-b border-stone-200 pb-4"></div>
                </div>
                <div>
                  <p className="mb-1">Actual HR (if checked):</p>
                  <div className="border-b border-stone-200 pb-4"></div>
                </div>
                <div className="col-span-2">
                  <p className="mb-1">How it felt:</p>
                  <div className="border-b border-stone-200 pb-4 mt-6"></div>
                </div>
              </div>
            </div>
          </div>

          {/* PAGE 2: Standard Guidance (page break for print) */}
          <div className="bg-white border border-stone-200 rounded-xl p-8 sm:p-10 shadow-sm mt-6 print:shadow-none print:border-0 print:rounded-none print:p-6 print:break-before-page">
            <div className="mb-8">
              <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">LoadedZone Session Card</span>
              <h2 className="font-display text-2xl font-bold text-stone-900 mt-1">Quick Reference</h2>
            </div>

            <div className="space-y-6 text-sm text-stone-700 leading-relaxed">
              {/* Talk test */}
              <div>
                <h3 className="font-bold text-stone-900 mb-1">The Talk Test</h3>
                <p>
                  Zone 2 means you can speak in full sentences but you're slightly breathless. 
                  If you can sing, you're going too easy — pick up the pace or add a hill.
                  If you can only manage a few words, you're too hard — slow down.
                  Walking and chatting with a friend? That's probably perfect.
                </p>
              </div>

              {/* Checking HR */}
              <div>
                <h3 className="font-bold text-stone-900 mb-1">Checking Your Heart Rate</h3>
                <p className="mb-2"><strong>With a watch:</strong> Glance at your heart rate reading. If it's above your zone 2 high, ease back. If it's below your zone 2 low, push a little harder.</p>
                <p><strong>Without a watch:</strong> Place two fingers (not your thumb) on the inside of your wrist, thumb side. Count beats for 15 seconds. Multiply by 4. That's your current heart rate.</p>
              </div>

              {/* Posture */}
              <div>
                <h3 className="font-bold text-stone-900 mb-1">Posture</h3>
                <p>
                  Shoulders back and down. Core lightly engaged — imagine bracing for a light push.
                  Pack should sit high on your back, close to your body. If the weight pulls you forward or
                  makes you lean, it's either too heavy or positioned too low.
                </p>
              </div>

              {/* Hydration */}
              <div>
                <h3 className="font-bold text-stone-900 mb-1">Hydration</h3>
                <p>
                  Drink water before you leave. For walks under 45 minutes in cool weather, you probably
                  don't need to carry water. For longer walks or warm days, bring some. Dehydration
                  raises heart rate — if your HR starts climbing despite steady effort, you may need a drink.
                </p>
              </div>

              {/* When to stop */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-bold text-red-900 mb-1">When to Stop</h3>
                <p className="text-red-800">
                  Stop immediately and rest if you experience: dizziness or light-headedness, 
                  sharp pain in any joint (especially knees, hips, or lower back), 
                  chest tightness or pain, unusual shortness of breath that doesn't ease when you slow down, 
                  or nausea. These are signals to stop, not push through.
                  If symptoms persist, seek medical attention.
                </p>
              </div>

              {/* Footer */}
              <div className="border-t border-stone-200 pt-4 text-xs text-stone-400">
                <p>Generated at laurencetimms.com/loadedzone. This is not medical advice. Consult your GP before starting any new exercise programme.</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
