import React, { useState } from 'react';
import { UserSession, DailyLog } from '../types';
import { Scale, ChevronRight, Sparkles, TrendingDown, Clock, Plus, BarChart2, Calendar, AlertCircle } from 'lucide-react';

interface ProgressProps {
  userSession: UserSession;
  onUpdateLog: (date: string, updatedLog: DailyLog) => void;
}

export default function Progress({ userSession, onUpdateLog }: ProgressProps) {
  const [newWeight, setNewWeight] = useState('');
  const [weightDate, setWeightDate] = useState(new Date().toISOString().split('T')[0]);
  const [successMsg, setSuccessMsg] = useState('');

  // Weight history list from session states
  const rawHistory = [...(userSession.weightHistory || [])];
  
  // Sort history by date chronologically
  const sortedHistory = rawHistory.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Handle manual weight logging
  const handleLogWeightSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedWeight = parseFloat(newWeight);
    if (!parsedWeight || parsedWeight <= 20) return;

    // Retrieve or instantiate daily log object
    const targetDateLog: DailyLog = userSession.logs[weightDate] || {
      date: weightDate,
      waterMl: 0,
      meals: [],
      workouts: []
    };

    // Save weight into daily log
    const updatedLog = {
      ...targetDateLog,
      weight: parsedWeight
    };

    onUpdateLog(weightDate, updatedLog);

    setNewWeight('');
    setSuccessMsg(`Weight of ${parsedWeight} kg successfully logged for ${weightDate}!`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Coordinates calculator for our beautiful SVG graph
  const renderSVGChart = () => {
    if (sortedHistory.length === 0) {
      return (
        <div className="py-20 text-center border border-dashed border-stone-850 rounded-2xl">
          <Scale className="h-10 w-10 text-stone-600 mx-auto mb-2" />
          <p className="text-stone-400 text-sm font-semibold">Weight History Chart Empty</p>
          <p className="text-stone-600 text-[11px] mt-1 pr-1 max-w-[280px] mx-auto">
            Log your current weight using the 'Log Weight' input fields to observe active graphics!
          </p>
        </div>
      );
    }

    // Chart margins
    const width = 600;
    const height = 240;
    const paddingX = 45;
    const paddingY = 30;

    // Find extremes
    const weights = sortedHistory.map(w => w.weight);
    const minWeight = Math.max(0, Math.min(...weights) - 3);
    const maxWeight = Math.max(...weights) + 3;
    const weightRange = maxWeight - minWeight || 1;

    // Timeline calculation
    const dates = sortedHistory.map(w => new Date(w.date).getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    const dateRange = maxDate - minDate || 1;

    // Map logic to coordinates
    const points = sortedHistory.map(w => {
      const dateVal = new Date(w.date).getTime();
      const x = paddingX + ((dateVal - minDate) / dateRange) * (width - 2 * paddingX);
      const y = height - paddingY - ((w.weight - minWeight) / weightRange) * (height - 2 * paddingY);
      return { x, y, date: w.date, weight: w.weight };
    });

    // Make beautiful SVG path
    let isSinglePoint = points.length === 1;
    let pathD = '';
    let fillD = '';

    if (!isSinglePoint) {
      // Draw smooth line
      pathD = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        pathD += ` L ${points[i].x} ${points[i].y}`;
      }
      // Fill path for gradient background
      fillD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;
    }

    return (
      <div className="space-y-4">
        <div className="relative bg-stone-950 p-4 border border-stone-850 rounded-2xl overflow-hidden shadow-inner">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
            {/* Gradients */}
            <defs>
              <linearGradient id="chart-fill-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#065f46" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            {Array.from({ length: 4 }).map((_, idx) => {
              const gridY = paddingY + (idx / 3) * (height - 2 * paddingY);
              const gridWeightVal = maxWeight - (idx / 3) * weightRange;
              return (
                <g key={idx} className="opacity-40">
                  <line
                    x1={paddingX}
                    y1={gridY}
                    x2={width - paddingX}
                    y2={gridY}
                    stroke="#27272a"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={paddingX - 10}
                    y={gridY + 4}
                    textAnchor="end"
                    fill="#71717a"
                    className="font-mono text-[9px] font-bold"
                  >
                    {gridWeightVal.toFixed(1)}kg
                  </text>
                </g>
              );
            })}

            {/* Render fill Area */}
            {fillD && (
              <path d={fillD} fill="url(#chart-fill-grad)" />
            )}

            {/* Render trend line path */}
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke="#10b981"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Render points circular badges */}
            {points.map((pt, idx) => (
              <g key={idx} className="group cursor-pointer">
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="6"
                  fill="#022c22"
                  stroke="#10b981"
                  strokeWidth="2"
                />
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="10"
                  fill="#10b981"
                  className="opacity-0 hover:opacity-20 transition duration-150"
                />
                
                {/* Popover point text */}
                <text
                  x={pt.x}
                  y={pt.y - 12}
                  textAnchor="middle"
                  fill="#ffffff"
                  className="font-mono text-[10px] font-black pointer-events-none drop-shadow-md"
                >
                  {pt.weight}kg
                </text>
              </g>
            ))}

            {/* Bottom time Axis indicators */}
            {points.map((pt, idx) => {
              // Print sparse dates for breathing room
              if (points.length > 5 && idx % 2 !== 0 && idx !== points.length - 1) return null;
              
              const formattedDateStr = new Date(pt.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              });

              return (
                <text
                  key={idx}
                  x={pt.x}
                  y={height - paddingY + 16}
                  textAnchor="middle"
                  fill="#71717a"
                  className="text-[8px] font-semibold font-mono"
                >
                  {formattedDateStr}
                </text>
              );
            })}
          </svg>
        </div>

        <div className="flex justify-between items-center bg-stone-900 border border-stone-850 p-3.5 rounded-xl text-xs text-stone-500 font-medium">
          <span>Tracking window: 7-Day scale</span>
          <span>Timeline points: {sortedHistory.length} checked</span>
        </div>
      </div>
    );
  };

  // Analytical stats differences
  const latestWeight = sortedHistory[sortedHistory.length - 1]?.weight || userSession.profile?.weight || 0;
  const initialWeight = sortedHistory[0]?.weight || userSession.profile?.weight || 0;
  const netDifference = latestWeight - initialWeight;

  return (
    <div id="progress-view" className="space-y-6">
      
      {/* Target goals and trends header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <div className="bg-stone-900 border border-stone-800 p-5 rounded-3xl flex justify-between items-center shadow-xl">
          <div>
            <span className="text-[10px] text-stone-500 uppercase tracking-widest font-bold block mb-1">Starting scale</span>
            <div className="text-white text-2xl font-black font-mono">{initialWeight} <span className="text-xs text-stone-500">kg</span></div>
          </div>
          <div className="p-3 bg-stone-950 border border-stone-850 rounded-xl font-bold text-xs text-stone-400">
            Initial
          </div>
        </div>

        <div className="bg-stone-900 border border-stone-800 p-5 rounded-3xl flex justify-between items-center shadow-xl">
          <div>
            <span className="text-[10px] text-stone-500 uppercase tracking-widest font-bold block mb-1">Latest scale</span>
            <div className="text-white text-2xl font-black font-mono">{latestWeight} <span className="text-xs text-stone-500">kg</span></div>
          </div>
          <div className="p-3 bg-stone-950 border border-stone-850 rounded-xl font-bold text-xs text-stone-400">
            Current
          </div>
        </div>

        <div className="bg-stone-900 border border-stone-800 p-5 rounded-3xl flex justify-between items-center shadow-xl">
          <div>
            <span className="text-[10px] text-stone-500 uppercase tracking-widest font-bold block mb-1">Scale Difference</span>
            <div className={`text-2xl font-black font-mono ${netDifference < 0 ? 'text-emerald-400' : netDifference > 0 ? 'text-blue-400' : 'text-stone-400'}`}>
              {netDifference > 0 ? `+${netDifference.toFixed(1)}` : netDifference.toFixed(1)} <span className="text-xs text-stone-500">kg</span>
            </div>
          </div>
          <div className="p-3 bg-stone-950 border border-stone-850 rounded-xl">
            <TrendingDown className={`h-5 w-5 ${netDifference < 0 ? 'text-emerald-400' : 'text-stone-400'}`} />
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Visual timeline Chart graph */}
        <div className="lg:col-span-2 bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
              <BarChart2 className="text-emerald-400 h-5 w-5" /> Weight Progress Timeline
            </h3>
            <p className="text-stone-500 text-xs mt-0.5">Observe patterns over dates. Roll over points to review logged statistics.</p>
          </div>

          <div>
            {renderSVGChart()}
          </div>
        </div>

        {/* Right Column: Weight log form and checklist log */}
        <div className="space-y-6">
          
          {/* Weight entry card */}
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Scale className="text-emerald-400 h-4.5 w-4.5" /> Log Current Weight
              </h3>
              <p className="text-stone-500 text-xs mt-0.5">Quickly key in your weight to log and record macro variables.</p>
            </div>

            {successMsg && (
              <div className="p-2.5 bg-emerald-950/45 border border-emerald-900 text-emerald-300 rounded-xl text-[10px] text-center font-bold">
                {successMsg}
              </div>
            )}

            <form onSubmit={handleLogWeightSubmit} className="space-y-3 font-sans">
              <div>
                <label className="block text-[8px] font-bold text-stone-400 uppercase tracking-widest pl-0.5 mb-1">Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 h-4 w-4" />
                  <input
                    id="weight-log-date-input"
                    type="date"
                    required
                    className="w-full bg-stone-950 border border-stone-800 focus:border-emerald-500 text-white text-xs rounded-xl py-2 pl-10 pr-3 outline-none"
                    value={weightDate}
                    onChange={(e) => setWeightDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[8px] font-bold text-stone-400 uppercase tracking-widest pl-0.5 mb-1">Weight (kg)</label>
                <div className="relative">
                  <Scale className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 h-4 w-4" />
                  <input
                    id="weight-log-kg-input"
                    type="number"
                    step="0.1"
                    min="30"
                    max="280"
                    required
                    placeholder="e.g. 72.5"
                    className="w-full bg-stone-950 border border-stone-800 focus:border-emerald-500 text-white text-xs rounded-xl py-2 pl-10 pr-10 outline-none"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-stone-500 font-bold">kg</span>
                </div>
              </div>

              <button
                id="log-weight-submit-btn"
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-extrabold text-xs py-2.5 rounded-xl transition flex justify-center items-center gap-1 cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Save Record
              </button>
            </form>
          </div>

          {/* Historical points logged list */}
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 shadow-xl space-y-3 max-h-[210px] overflow-y-auto">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider pl-0.5">Timeline History</h3>
            
            {sortedHistory.length === 0 ? (
              <span className="text-[10px] text-stone-600 block text-center py-2">No weight points logged</span>
            ) : (
              <div className="space-y-1.5 font-mono text-[10px] text-stone-400">
                {[...sortedHistory].reverse().map((rec, id) => (
                  <div key={id} className="flex justify-between items-center p-2 bg-stone-950 rounded-xl border border-stone-850/60">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-stone-500" />
                      {rec.date}
                    </span>
                    <span className="text-white font-bold">{rec.weight} kg</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
