import React, { useState } from 'react';
import { UserSession, DailyLog } from '../types';
import { Flame, Apple, Dumbbell, Coffee, Plus, HelpCircle, Droplet, Sparkles, User, RefreshCw, Trophy, ChevronRight, Heart, Activity, Scissors } from 'lucide-react';

interface DashboardProps {
  userSession: UserSession;
  onUpdateLog: (date: string, updatedLog: DailyLog) => void;
  onChangeView: (view: string) => void;
  onGenerateDiet: () => Promise<void>;
  onGenerateWorkout: () => Promise<void>;
}

export default function Dashboard({
  userSession,
  onUpdateLog,
  onChangeView,
  onGenerateDiet,
  onGenerateWorkout,
}: DashboardProps) {
  const [addingQuickCal, setAddingQuickCal] = useState(false);
  const [quickCalVal, setQuickCalVal] = useState('');
  const [generatingDiet, setGeneratingDiet] = useState(false);
  const [generatingWorkout, setGeneratingWorkout] = useState(false);

  // Smart alert alarms and reminders
  const [reminders, setReminders] = useState([
    { id: 'water', type: 'Hydration Alert', time: '10:00', enabled: true, freq: 'Every 2 hours', desc: 'Sip 250ml water to protect hair roots & metabolic rate.' },
    { id: 'meal', type: 'PBF Macro Fuel Alert', time: '13:00', enabled: true, freq: 'Daily basis', desc: 'Peak protein synthesis trigger: Feed protein & micronutrients!' },
    { id: 'workout', type: 'Postural Training Alarm', time: '18:30', enabled: true, freq: 'Workouts cycle', desc: 'Lock joint shields & load today\'s generated workout presets now.' },
  ]);
  const [activeNotification, setActiveNotification] = useState<string | null>(null);

  const triggerNotificationSim = (type: string, text: string) => {
    setActiveNotification(`${type}: ${text}`);
    setTimeout(() => {
      setActiveNotification(null);
    }, 4500);
  };

  // Get current date code
  const todayStr = new Date().toISOString().split('T')[0];
  const todayLog: DailyLog = userSession.logs[todayStr] || {
    date: todayStr,
    waterMl: 0,
    meals: [],
    workouts: [],
  };

  const macros = userSession.macroGoals || {
    calories: 2000,
    protein: 150,
    carbs: 220,
    fat: 65,
    bmr: 1600,
    tdee: 2200,
  };

  // Eaten Calculations
  const eatenCalories = todayLog.meals.reduce((acc, m) => acc + m.calories, 0);
  const eatenProtein = todayLog.meals.reduce((acc, m) => acc + m.protein, 0);
  const eatenCarbs = todayLog.meals.reduce((acc, m) => acc + m.carbs, 0);
  const eatenFat = todayLog.meals.reduce((acc, m) => acc + m.fat, 0);

  // Burned Calculations
  const burnedWorkoutCalories = todayLog.workouts.reduce((acc, w) => acc + w.caloriesBurned, 0);
  const netCalories = eatenCalories - burnedWorkoutCalories;
  const remainingCalories = Math.max(0, macros.calories - eatenCalories + burnedWorkoutCalories);

  // Hydration Trigger
  const handleAddWater = () => {
    const updated = {
      ...todayLog,
      waterMl: todayLog.waterMl + 250,
    };
    onUpdateLog(todayStr, updated);
  };

  const handleResetWater = () => {
    const updated = {
      ...todayLog,
      waterMl: 0,
    };
    onUpdateLog(todayStr, updated);
  };

  // Generate handlers with custom safety
  const handleTriggerDiet = async () => {
    setGeneratingDiet(true);
    try {
      await onGenerateDiet();
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingDiet(false);
    }
  };

  const handleTriggerWorkout = async () => {
    setGeneratingWorkout(true);
    try {
      await onGenerateWorkout();
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingWorkout(false);
    }
  };

  // Quick calorie logger shortcut inside dashboard
  const handleQuickAddCalories = (e: React.FormEvent) => {
    e.preventDefault();
    const cals = parseInt(quickCalVal) || 0;
    if (cals <= 0) return;

    const newMeal = {
      id: `meal_${Date.now()}`,
      name: 'Quick Log Supplement',
      calories: cals,
      protein: Math.round(cals * 0.05),
      carbs: Math.round(cals * 0.1),
      fat: Math.round(cals * 0.03),
      time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    };

    const updated = {
      ...todayLog,
      meals: [...todayLog.meals, newMeal],
    };

    onUpdateLog(todayStr, updated);
    setQuickCalVal('');
    setAddingQuickCal(false);
  };

  // Micronutrient update helpers
  const handleUpdateMicronutrient = (field: 'biotinMcg' | 'ironMg' | 'zincMg', amount: number) => {
    const current = todayLog[field] || 0;
    const updated = {
      ...todayLog,
      [field]: Math.max(0, current + amount),
    };
    onUpdateLog(todayStr, updated);
  };

  // Macro progress ratios
  const proteinPercent = Math.min(100, Math.round((eatenProtein / macros.protein) * 100));
  const carbsPercent = Math.min(100, Math.round((eatenCarbs / macros.carbs) * 100));
  const fatPercent = Math.min(100, Math.round((eatenFat / macros.fat) * 100));

  // Circular ring variables
  const limit = macros.calories;
  const currentRatio = eatenCalories / limit;
  const dashOffset = 2 * Math.PI * 50 * (1 - Math.min(1, currentRatio));

  return (
    <div id="dashboard-view" className="space-y-6 relative">
      
      {/* Floating simulated alert push banner */}
      {activeNotification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-md px-4 animate-fade-in pointer-events-none">
          <div className="bg-stone-900 border border-emerald-500 rounded-2xl p-4 shadow-2xl backdrop-blur-md flex items-start gap-3 text-left">
            <div className="p-2 bg-emerald-950/40 rounded-xl text-emerald-400 font-mono text-base">🔔</div>
            <div className="space-y-0.5">
              <span className="block text-[9px] uppercase font-mono tracking-widest font-black text-emerald-400">FitCoach AI Smart Alert Triggered</span>
              <span className="block font-bold text-white text-xs leading-snug">{activeNotification}</span>
              <span className="block text-[8px] text-stone-500 font-medium">Automatic background scheduling enabled in user profile</span>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Header Badge and Greeting Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Today is fresh</h1>
          <p className="text-stone-400 text-sm mt-0.5">Let's balance your macros and log your fitness goals.</p>
        </div>
        
        {/* Dynamic target profile goals information */}
        <div className="flex items-center gap-3 bg-stone-900 border border-stone-800 p-2.5 rounded-2xl">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 font-bold text-xs uppercase">
            {userSession.profile?.goal === 'lose_weight' ? 'Loss' : userSession.profile?.goal === 'gain_weight' ? 'Bulk' : 'Tone'}
          </div>
          <div>
            <div className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold">Current Goal</div>
            <div className="text-white text-xs font-bold capitalize">
              {userSession.profile?.goal?.replace('_', ' ') || 'Calibrate Plan'}
            </div>
          </div>
          <button
            id="edit-profile-shortcut"
            onClick={() => onChangeView('profile')}
            className="p-1 px-2.5 ml-2 rounded-lg bg-stone-850 hover:bg-stone-800 text-stone-300 text-[10px] font-bold tracking-tight transition cursor-pointer"
          >
            Adjust
          </button>
        </div>
      </div>

      {/* METABOLICS SUMMARY BLOCK: CALORIES CIRCLE AND STATS PROGRESS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Card: Calorie Tracker Donut & Summary with nice layout */}
        <div className="lg:col-span-2 bg-stone-900 border border-stone-800 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-around gap-6 shadow-xl relative overflow-hidden">
          {/* Subtle grid background accent */}
          <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] opacity-10"></div>
          
          <div className="relative flex items-center justify-center h-44 w-44 z-10 flex-shrink-0">
            {/* SVG circle */}
            <svg className="w-full h-full transform -rotate-90">
              {/* Bg Circle */}
              <circle
                cx="88"
                cy="88"
                r="70"
                className="stroke-stone-800"
                strokeWidth="10"
                fill="transparent"
              />
              {/* Eaten Fill Circle */}
              <circle
                cx="88"
                cy="88"
                r="70"
                className="stroke-emerald-400 transition-all duration-500"
                strokeWidth="10"
                strokeDasharray={2 * Math.PI * 70}
                strokeDashoffset={2 * Math.PI * 70 * (1 - Math.min(1, eatenCalories / macros.calories))}
                strokeLinecap="round"
                fill="transparent"
              />
              {/* Burned excess offset fill circle */}
              {burnedWorkoutCalories > 0 && (
                <circle
                  cx="88"
                  cy="88"
                  r="78"
                  className="stroke-orange-400 transition-all duration-300"
                  strokeWidth="4"
                  strokeDasharray={2 * Math.PI * 78}
                  strokeDashoffset={2 * Math.PI * 78 * (1 - Math.min(1, burnedWorkoutCalories / macros.calories))}
                  fill="transparent"
                />
              )}
            </svg>
            <div className="absolute text-center">
              <span className="text-3xl font-black font-mono tracking-tight text-white block">
                {remainingCalories}
              </span>
              <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">
                kcal left
              </span>
            </div>
          </div>

          <div className="space-y-4 w-full max-w-sm z-10">
            <div>
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest pl-0.5">Energy Meter</span>
              <h3 className="text-xl font-bold text-white tracking-tight mt-0.5">Calorie Balance</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-stone-950 p-3 rounded-xl border border-stone-850">
                <div className="flex items-center gap-1.5 text-stone-500 text-xs font-semibold mb-1">
                  <Apple className="h-3.5 w-3.5 text-emerald-400" />
                  Eaten Consumed
                </div>
                <div className="font-mono text-base font-bold text-white">
                  {eatenCalories} <span className="text-xs text-stone-500 font-normal">/ {macros.calories}</span>
                </div>
              </div>

              <div className="bg-stone-950 p-3 rounded-xl border border-stone-850">
                <div className="flex items-center gap-1.5 text-stone-500 text-xs font-semibold mb-1">
                  <Flame className="h-3.5 w-3.5 text-orange-400 animate-pulse" />
                  Active Burned
                </div>
                <div className="font-mono text-base font-bold text-white">
                  {burnedWorkoutCalories} <span className="text-xs text-stone-500 font-normal">kcal</span>
                </div>
              </div>
            </div>

            <button
              id="log-meal-shortcut"
              onClick={() => onChangeView('nutrition')}
              className="w-full bg-stone-800 hover:bg-stone-750 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4 text-emerald-400" /> Log Food or Upload Picture
            </button>
          </div>
        </div>

        {/* Right Card: Quick Macro Meter Breakdown */}
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div>
            <h3 className="text-sm font-bold text-stone-300 uppercase tracking-wider mb-4 pl-0.5">Nutritional Macros</h3>
            <div className="space-y-4">
              
              {/* Protein Tracking */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-stone-300 font-bold">Protein (⚡ Growth)</span>
                  <span className="text-stone-400 font-mono">{eatenProtein}g / {macros.protein}g</span>
                </div>
                <div className="w-full h-2 bg-stone-950 rounded-full overflow-hidden">
                  <div className="bg-emerald-400 h-full rounded-full transition-all duration-300" style={{ width: `${proteinPercent}%` }} />
                </div>
              </div>

              {/* Protein Carbonhydrates */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-stone-300 font-bold">Carbs (🚀 Energy)</span>
                  <span className="text-stone-400 font-mono">{eatenCarbs}g / {macros.carbs}g</span>
                </div>
                <div className="w-full h-2 bg-stone-950 rounded-full overflow-hidden">
                  <div className="bg-lime-400 h-full rounded-full transition-all duration-300" style={{ width: `${carbsPercent}%` }} />
                </div>
              </div>

              {/* Fats tracking */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-stone-300 font-bold">Healthy Fats (🧠 Protection)</span>
                  <span className="text-stone-400 font-mono">{eatenFat}g / {macros.fat}g</span>
                </div>
                <div className="w-full h-2 bg-stone-950 rounded-full overflow-hidden">
                  <div className="bg-yellow-400 h-full rounded-full transition-all duration-300" style={{ width: `${fatPercent}%` }} />
                </div>
              </div>

            </div>
          </div>

          <div className="pt-4 border-t border-stone-850 flex justify-between items-center text-xs mt-3">
            <span className="text-stone-500 font-medium">Dietary preference</span>
            <span className="text-stone-300 capitalize font-bold bg-stone-950 px-2 py-1 rounded-lg border border-stone-850">
              {userSession.profile?.dietPreference || 'not set'}
            </span>
          </div>
        </div>

      </div>

      {/* MID SECTION: HYDRATION TRACKER & QUICK REGISTER ACCESS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Hydration Widget */}
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                <Droplet className="h-5 w-5 text-blue-400 animate-bounce" /> Hydration Monitor
              </h3>
              <p className="text-stone-400 text-xs mt-0.5">Stay focused. The baseline hydration is roughly 2.5 Litres.</p>
            </div>
            <div className="font-mono text-xl font-black text-blue-400">
              {todayLog.waterMl} <span className="text-xs text-stone-500 font-normal">ml</span>
            </div>
          </div>

          {/* Water cups simulation row */}
          <div className="flex flex-wrap gap-2 py-3">
            {Array.from({ length: 8 }).map((_, i) => {
              const currentWaterVol = (i + 1) * 250;
              const active = todayLog.waterMl >= currentWaterVol;
              return (
                <div
                  key={i}
                  className={`w-10 h-12 rounded-lg border flex flex-col items-center justify-center transition-all duration-300 ${
                    active 
                      ? 'bg-blue-900/35 border-blue-500 text-blue-400' 
                      : 'bg-stone-950 border-stone-850 text-stone-600'
                  }`}
                >
                  <Droplet className={`h-4 w-4 ${active ? 'fill-blue-400' : ''}`} />
                  <span className="text-[8px] mt-1 font-mono font-bold">250ml</span>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              id="btn-drink-water"
              onClick={handleAddWater}
              className="flex-1 bg-blue-500 hover:bg-blue-400 text-stone-950 font-bold text-xs py-2 px-3 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
            >
              <Droplet className="h-4.5 w-4.5" /> Drink 250ml cup
            </button>
            <button
              id="btn-reset-water"
              onClick={handleResetWater}
              className="p-2 border border-stone-800 hover:border-stone-700 text-stone-400 hover:text-white rounded-xl transition cursor-pointer"
              title="Reset Water Track"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Quick Log widget card */}
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-1.5 mb-1">
              <Coffee className="h-5 w-5 text-emerald-400" /> Quick calorie addition
            </h3>
            <p className="text-stone-400 text-xs">Instantly append nutritional numbers without detailed macro items.</p>
          </div>

          {addingQuickCal ? (
            <form onSubmit={handleQuickAddCalories} className="space-y-3 py-3">
              <div className="relative">
                <input
                  id="quick-calorie-input"
                  type="number"
                  required
                  placeholder="e.g. 350"
                  className="w-full bg-stone-950 border border-stone-800 focus:border-emerald-500 rounded-xl py-2 px-3 text-white font-mono text-sm outline-none"
                  value={quickCalVal}
                  onChange={(e) => setQuickCalVal(e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-500">kcal</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs font-bold py-2 rounded-xl"
                >
                  Save Log
                </button>
                <button
                  type="button"
                  onClick={() => setAddingQuickCal(false)}
                  className="px-3 py-2 border border-stone-800 text-stone-400 hover:text-white rounded-xl text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="py-4 text-center">
              <button
                id="btn-expand-quick-cal"
                onClick={() => setAddingQuickCal(true)}
                className="mx-auto flex items-center gap-1.5 bg-stone-950 border border-stone-850 hover:border-stone-700 text-stone-300 hover:text-white font-bold text-xs py-2 px-5 rounded-xl transition cursor-pointer"
              >
                <Plus className="h-4 w-4 text-emerald-400" /> Tap to Add Quick Calorie Count
              </button>
            </div>
          )}

          <div className="text-[10px] text-stone-500 text-center border-t border-stone-850/80 pt-2 font-medium">
            Calories added here will automatically approximate base proteins and carbs.
          </div>
        </div>

        {/* Smart Alert Reminders Widget Card */}
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-1.5 mb-1">
              <Plus className="h-5 w-5 text-emerald-400 rotate-45" /> Smart Alert Reminders
            </h3>
            <p className="text-stone-400 text-xs">Configure alerts for hydration cycles, protein targets, and active workouts.</p>
          </div>

          <div className="space-y-2.5 max-h-[175px] overflow-y-auto pr-1">
            {reminders.map(rem => (
              <div key={rem.id} className="p-2.5 bg-stone-950 border border-stone-850 rounded-xl flex items-center justify-between gap-3 text-left">
                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${rem.enabled ? 'bg-emerald-500' : 'bg-stone-600'}`}></span>
                    <span className="font-bold text-white text-xs truncate">{rem.type}</span>
                  </div>
                  <span className="block text-[8px] uppercase tracking-wider font-mono text-stone-500">{rem.time} • {rem.freq}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => triggerNotificationSim(rem.type, rem.desc)}
                    disabled={!rem.enabled}
                    className="p-1 px-2 border border-stone-800 rounded-lg text-[9px] hover:text-emerald-400 hover:border-emerald-500 disabled:opacity-40 transition cursor-pointer font-bold shrink-0 text-stone-300"
                    title="Test Alert Notification"
                  >
                    Test
                  </button>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={rem.enabled} 
                      onChange={() => {
                        setReminders(prev => prev.map(x => x.id === rem.id ? { ...x, enabled: !x.enabled } : x));
                      }} 
                    />
                    <div className="w-7 h-4 bg-stone-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-stone-400 after:border-stone-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-stone-850/80 text-[10px] text-stone-500 font-medium text-center">
            Custom timing can be synchronized directly in user settings.
          </div>
        </div>

      </div>

      {/* HOLISTIC MICRO-NUTRIENTS AND HAIR WELLNESS MONITOR */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl relative overflow-hidden space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Scissors className="h-5 w-5 text-emerald-400 rotate-90" /> Micronutrient & Hair Follicle Density Tracker
            </h3>
            <p className="text-stone-400 text-xs">Track key minerals for hair synthesis, sebum balance, and cellular energy retention.</p>
          </div>
          <div className="bg-[#18181b] border border-stone-800 rounded-xl px-3 py-1.5 flex items-center gap-2 text-[10px] text-stone-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active Keratin Shield
          </div>
        </div>

        {/* 3-Column Tracker Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Biotin (Hair Strength) */}
          <div className="bg-stone-950 p-4 border border-stone-850 rounded-2xl flex flex-col justify-between space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-white text-xs">Biotin (Vit B7)</span>
                <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-emerald-400 bg-emerald-950/45 px-2 py-0.5 rounded border border-emerald-900/65">Hair Shaft Strength</span>
              </div>
              <p className="text-[10px] text-stone-500">Promotes strong keratin construction, minimizing follicular splitting.</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-stone-400">Today:</span>
                <span className="text-white font-bold">{todayLog.biotinMcg || 0} mcg / 30 mcg</span>
              </div>
              <div className="w-full h-2 bg-stone-900 rounded-full overflow-hidden border border-stone-800">
                <div 
                  className="bg-emerald-400 h-full rounded-full transition-all duration-300" 
                  style={{ width: `${Math.min(100, Math.round(((todayLog.biotinMcg || 0) / 30) * 100))}%` }}
                />
              </div>
            </div>

            <div className="flex gap-1.5 font-sans">
              <button
                type="button"
                id="btn-add-biotin-10"
                onClick={() => handleUpdateMicronutrient('biotinMcg', 10)}
                className="flex-1 py-1.5 px-2 bg-stone-900 hover:bg-stone-850 border border-stone-800 hover:border-stone-700 text-stone-300 hover:text-white rounded-lg text-[10.5px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
              >
                +10 mcg <span className="text-[8px] text-stone-500 font-mono">(Eggs)</span>
              </button>
              <button
                type="button"
                id="btn-remove-biotin-10"
                onClick={() => handleUpdateMicronutrient('biotinMcg', -10)}
                className="py-1.5 px-2.5 bg-stone-900 hover:bg-stone-850 border border-stone-800 hover:border-red-950 text-stone-500 hover:text-red-400 rounded-lg text-[10.5px] transition cursor-pointer"
              >
                -
              </button>
            </div>
          </div>

          {/* Iron (Oxygen Delivery) */}
          <div className="bg-stone-950 p-4 border border-stone-850 rounded-2xl flex flex-col justify-between space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-white text-xs">Iron (Fe Element)</span>
                <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-red-400 bg-red-950/45 px-2 py-0.5 rounded border border-red-900/65">Root Oxygenation</span>
              </div>
              <p className="text-[10px] text-stone-500">Drives healthy oxygen transport to cellular tissue at follicle roots.</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-stone-400">Today:</span>
                <span className="text-white font-bold">{todayLog.ironMg || 0} mg / 18 mg</span>
              </div>
              <div className="w-full h-2 bg-stone-900 rounded-full overflow-hidden border border-stone-800">
                <div 
                  className="bg-red-400 h-full rounded-full transition-all duration-300" 
                  style={{ width: `${Math.min(100, Math.round(((todayLog.ironMg || 0) / 18) * 100))}%` }}
                />
              </div>
            </div>

            <div className="flex gap-1.5 font-sans">
              <button
                type="button"
                id="btn-add-iron-3"
                onClick={() => handleUpdateMicronutrient('ironMg', 3)}
                className="flex-1 py-1.5 px-2 bg-stone-900 hover:bg-stone-850 border border-stone-800 hover:border-stone-700 text-stone-300 hover:text-white rounded-lg text-[10.5px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
              >
                +3 mg <span className="text-[8px] text-stone-500 font-mono">(Spinach)</span>
              </button>
              <button
                type="button"
                id="btn-remove-iron-3"
                onClick={() => handleUpdateMicronutrient('ironMg', -3)}
                className="py-1.5 px-2.5 bg-stone-900 hover:bg-stone-850 border border-stone-800 hover:border-red-950 text-stone-500 hover:text-red-400 rounded-lg text-[10.5px] transition cursor-pointer"
              >
                -
              </button>
            </div>
          </div>

          {/* Zinc (Cellular Renewal) */}
          <div className="bg-stone-950 p-4 border border-stone-850 rounded-2xl flex flex-col justify-between space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-white text-xs">Zinc (Zn Mineral)</span>
                <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-amber-400 bg-amber-950/45 px-2 py-0.5 rounded border border-amber-900/65">Follicle Healing</span>
              </div>
              <p className="text-[10px] text-stone-500">Regulates oil glands around roots, optimizing follicular multiplication.</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-stone-400">Today:</span>
                <span className="text-white font-bold">{todayLog.zincMg || 0} mg / 11 mg</span>
              </div>
              <div className="w-full h-2 bg-stone-900 rounded-full overflow-hidden border border-stone-800 font-sans">
                <div 
                  className="bg-amber-400 h-full rounded-full transition-all duration-300" 
                  style={{ width: `${Math.min(100, Math.round(((todayLog.zincMg || 0) / 11) * 100))}%` }}
                />
              </div>
            </div>

            <div className="flex gap-1.5 font-sans">
              <button
                type="button"
                id="btn-add-zinc-2"
                onClick={() => handleUpdateMicronutrient('zincMg', 2)}
                className="flex-1 py-1.5 px-2 bg-stone-900 hover:bg-stone-850 border border-stone-800 hover:border-stone-700 text-stone-300 hover:text-white rounded-lg text-[10.5px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
              >
                +2 mg <span className="text-[8px] text-stone-500 font-mono">(Eggs)</span>
              </button>
              <button
                type="button"
                id="btn-remove-zinc-2"
                onClick={() => handleUpdateMicronutrient('zincMg', -2)}
                className="py-1.5 px-2.5 bg-stone-900 hover:bg-stone-850 border border-stone-800 hover:border-red-950 text-stone-500 hover:text-red-400 rounded-lg text-[10.5px] transition cursor-pointer"
              >
                -
              </button>
            </div>
          </div>

        </div>

        {/* Informational shield note */}
        <div className="p-3 bg-emerald-950/15 border border-emerald-900/35 rounded-2xl flex items-start gap-2 text-[10.5px] text-stone-400">
          <Activity className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-left font-sans">
            <strong>Holistic Advice:</strong> Hair shedding and follicle shrinking are closely triggered by sudden caloric changes (such as during intense "Cutting" periods). Consistently keeping your Zinc and Biotin indices inside optimal ranges acts as a biological shield for root density.
          </p>
        </div>
      </div>

      {/* BOTTOM AREA: AI CO-PILOT SERVICES GENERATORS */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        {/* Glowing border light */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-2xl"></div>

        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-emerald-400 animate-pulse" />
          <h2 className="text-lg font-bold text-white tracking-tight">AI Co-Pilot Planning Services</h2>
        </div>

        <p className="text-stone-300 text-xs leading-relaxed max-w-2xl mb-6">
          FitAI Coach analyzes your exact BMR and dietary boundaries to generate personalized interactive agendas. Harness Gemini intelligence to draft full weekly workout plans and diet calendars.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* AI Diet Plan setup box */}
          <div className="bg-stone-950 p-4 rounded-2xl border border-stone-850 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className="p-1 px-2 text-[8px] bg-emerald-950 border border-emerald-800 text-emerald-400 font-extrabold uppercase rounded-lg">Diet Plan API</span>
                {userSession.weeklyDietPlan ? (
                  <span className="text-[10px] text-emerald-400 font-bold">✓ Ready</span>
                ) : (
                  <span className="text-[10px] text-stone-500">Not generated yet</span>
                )}
              </div>
              <h4 className="text-white text-sm font-bold">Personalized 7-Day Diet plan</h4>
              <p className="text-stone-400 text-xs mt-1">Get breakfast, lunch, snack, and dinner plans calculated to your macros ({macros.calories} kcal).</p>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                id="btn-gen-diet"
                onClick={handleTriggerDiet}
                disabled={generatingDiet}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:bg-stone-800 text-stone-950 font-bold text-xs py-2 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer disabled:text-stone-500 disabled:cursor-not-allowed"
              >
                {generatingDiet ? (
                  <>
                    <span className="inline-block w-3.5 h-3.5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin"></span> Generating...
                  </>
                ) : userSession.weeklyDietPlan ? (
                  <>Regenerate Schedule</>
                ) : (
                  <>Generate using AI</>
                )}
              </button>
              {userSession.weeklyDietPlan && (
                <button
                  id="view-diet-plan-btn"
                  onClick={() => onChangeView('nutrition')}
                  className="px-3 py-2 bg-stone-800 hover:bg-stone-750 text-white rounded-xl text-xs font-bold transition flex items-center gap-0.5 cursor-pointer"
                >
                  View <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* AI workout plan setup box */}
          <div className="bg-stone-950 p-4 rounded-2xl border border-stone-850 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className="p-1 px-2 text-[8px] bg-emerald-950 border border-emerald-800 text-emerald-400 font-extrabold uppercase rounded-lg">Training API</span>
                {userSession.weeklyWorkoutPlan ? (
                  <span className="text-[10px] text-emerald-400 font-bold">✓ Ready</span>
                ) : (
                  <span className="text-[10px] text-stone-500">Not generated yet</span>
                )}
              </div>
              <h4 className="text-white text-sm font-bold">7-Day Athletic Workout Protocol</h4>
              <p className="text-stone-400 text-xs mt-1">Staggered muscle target workouts aligned with your fitness goal: {userSession.profile?.goal?.replace('_', ' ') || 'Loss'}.</p>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                id="btn-gen-workout"
                onClick={handleTriggerWorkout}
                disabled={generatingWorkout}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:bg-stone-800 text-stone-950 font-bold text-xs py-2 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer disabled:text-stone-500 disabled:cursor-not-allowed"
              >
                {generatingWorkout ? (
                  <>
                    <span className="inline-block w-3.5 h-3.5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin"></span> Generating...
                  </>
                ) : userSession.weeklyWorkoutPlan ? (
                  <>Regenerate Protocols</>
                ) : (
                  <>Generate using AI</>
                )}
              </button>
              {userSession.weeklyWorkoutPlan && (
                <button
                  id="view-workout-plan-btn"
                  onClick={() => onChangeView('workout')}
                  className="px-3 py-2 bg-stone-800 hover:bg-stone-750 text-white rounded-xl text-xs font-bold transition flex items-center gap-0.5 cursor-pointer"
                >
                  View <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
