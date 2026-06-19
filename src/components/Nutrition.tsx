import React, { useState, useRef } from 'react';
import { UserSession, DailyLog, Meal } from '../types';
import { Plus, Camera, Image, Trash2, Apple, Check, ArrowRight, Sparkles, ChefHat, Calendar, Clock, Smile, AlertCircle } from 'lucide-react';

interface NutritionProps {
  userSession: UserSession;
  onUpdateLog: (date: string, updatedLog: DailyLog) => void;
  onGenerateDiet: () => Promise<void>;
}

export default function Nutrition({ userSession, onUpdateLog, onGenerateDiet }: NutritionProps) {
  const [activeTab, setActiveTab] = useState<'journal' | 'calendar'>('journal');
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  
  // Manual adding state
  const [manualName, setManualName] = useState('');
  const [manualCals, setManualCals] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualFat, setManualFat] = useState('');
  const [manualTime, setManualTime] = useState('12:00');
  const [isAddingMeal, setIsAddingMeal] = useState(false);

  // AI image-upload scanning states
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [scanError, setScanError] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  };

  // Sum current nutritional entries
  const eatenCalories = todayLog.meals.reduce((acc, m) => acc + m.calories, 0);
  const eatenProtein = todayLog.meals.reduce((acc, m) => acc + m.protein, 0);
  const eatenCarbs = todayLog.meals.reduce((acc, m) => acc + m.carbs, 0);
  const eatenFat = todayLog.meals.reduce((acc, m) => acc + m.fat, 0);

  // Manual Meal Save
  const handleSaveManualMeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !manualCals) return;

    const newMeal: Meal = {
      id: `meal_${Date.now()}`,
      name: manualName.trim(),
      calories: parseInt(manualCals) || 0,
      protein: parseInt(manualProtein) || 0,
      carbs: parseInt(manualCarbs) || 0,
      fat: parseInt(manualFat) || 0,
      time: manualTime || '12:00',
    };

    const updated = {
      ...todayLog,
      meals: [...todayLog.meals, newMeal],
    };

    onUpdateLog(todayStr, updated);
    
    // Reset Manual inputs
    setManualName('');
    setManualCals('');
    setManualProtein('');
    setManualCarbs('');
    setManualFat('');
    setIsAddingMeal(false);
  };

  // Meal Deletion
  const handleDeleteMeal = (mealId: string) => {
    const updated = {
      ...todayLog,
      meals: todayLog.meals.filter(m => m.id !== mealId),
    };
    onUpdateLog(todayStr, updated);
  };

  // AI Camera Image upload processing
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setScanError('');
    setScanResult(null);

    // Read local image to draw static previews
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      setScanError('');
      setScanResult(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleScanFoodImage = async () => {
    if (!previewUrl) return;

    setScanning(true);
    setScanError('');
    setScanResult(null);

    try {
      const response = await fetch('/api/ai/estimate-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Image: previewUrl })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Connection pipeline failed checking image.');
      }

      setScanResult(data.data);
    } catch (err: any) {
      setScanError(err.message || 'AI engine failed estimating calories for this meal.');
    } finally {
      setScanning(false);
    }
  };

  const handleAcceptScanResult = () => {
    if (!scanResult) return;

    const newMeal: Meal = {
      id: `meal_ai_${Date.now()}`,
      name: scanResult.name,
      calories: scanResult.calories || 0,
      protein: scanResult.protein || 0,
      carbs: scanResult.carbs || 0,
      fat: scanResult.fat || 0,
      time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      imageUrl: previewUrl || undefined,
      isAiGenerated: true,
    };

    const updated = {
      ...todayLog,
      meals: [...todayLog.meals, newMeal],
    };

    onUpdateLog(todayStr, updated);

    // Reset image tools
    setImageFile(null);
    setPreviewUrl(null);
    setScanResult(null);
  };

  const handleSavePresetToLog = (aiMealPreset: { name: string; calories: number; protein: number; carbs: number; fat: number }) => {
    const newMeal: Meal = {
      id: `meal_preset_${Date.now()}`,
      name: aiMealPreset.name,
      calories: aiMealPreset.calories,
      protein: aiMealPreset.protein,
      carbs: aiMealPreset.carbs,
      fat: aiMealPreset.fat,
      time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    };

    const updated = {
      ...todayLog,
      meals: [...todayLog.meals, newMeal],
    };

    onUpdateLog(todayStr, updated);
  };

  return (
    <div id="nutrition-view" className="space-y-6">
      
      {/* Upper Mode Selector tabs: Journal vs 7-Day Plan */}
      <div className="flex justify-between items-center bg-stone-900 border border-stone-800 p-1.5 rounded-2xl">
        <div className="flex gap-1">
          <button
            id="tab-journal"
            className={`py-2 px-4 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'journal' ? 'bg-emerald-500 text-stone-950 font-black' : 'text-stone-400 hover:text-white'
            }`}
            onClick={() => setActiveTab('journal')}
          >
            Nutrition Journal
          </button>
          <button
            id="tab-calendar"
            className={`py-2 px-4 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'calendar' ? 'bg-emerald-500 text-stone-950 font-black' : 'text-stone-400 hover:text-white'
            }`}
            onClick={() => setActiveTab('calendar')}
          >
            <Calendar className="h-3.5 w-3.5" /> AI 7-Day Plan
          </button>
        </div>

        <span className="text-[10px] text-stone-500 font-mono hidden sm:inline">
          Live Tracker • {todayStr}
        </span>
      </div>

      {activeTab === 'journal' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Logged Meals list and interactive form */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Logged Meals List */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                    <Apple className="text-emerald-400 h-5 w-5" /> Today's Meal Journal
                  </h3>
                  <p className="text-stone-500 text-xs">Meals consumed on {todayStr}</p>
                </div>

                <button
                  id="toggle-add-meal-form"
                  onClick={() => setIsAddingMeal(!isAddingMeal)}
                  className="bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs py-2 px-3 rounded-xl flex items-center gap-1 transition cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Add Item
                </button>
              </div>

              {isAddingMeal && (
                <form id="add-meal-form" onSubmit={handleSaveManualMeal} className="bg-stone-950 border border-stone-850 p-4 rounded-2xl space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Meal Title</label>
                      <input
                        id="meal-title-input"
                        type="text"
                        required
                        placeholder="e.g. Scrambled eggs & whole wheat toast"
                        className="w-full bg-stone-900 border border-stone-800 focus:border-emerald-500 rounded-xl py-2 px-3 text-white text-xs outline-none"
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Calories (kcal)</label>
                      <input
                        id="meal-calories-input"
                        type="number"
                        required
                        placeholder="e.g. 350"
                        className="w-full bg-stone-900 border border-stone-800 focus:border-emerald-500 rounded-xl py-2 px-3 text-white text-xs outline-none"
                        value={manualCals}
                        onChange={(e) => setManualCals(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[10px] text-stone-400 uppercase mb-1 text-center">Protein (g)</label>
                      <input
                        id="meal-protein-input"
                        type="number"
                        placeholder="0"
                        className="w-full bg-stone-900 border border-stone-800 focus:border-emerald-500 rounded-xl py-1.5 px-2 text-white text-xs text-center outline-none"
                        value={manualProtein}
                        onChange={(e) => setManualProtein(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-stone-400 uppercase mb-1 text-center">Carbs (g)</label>
                      <input
                        id="meal-carbs-input"
                        type="number"
                        placeholder="0"
                        className="w-full bg-stone-900 border border-stone-800 focus:border-emerald-500 rounded-xl py-1.5 px-2 text-white text-xs text-center outline-none"
                        value={manualCarbs}
                        onChange={(e) => setManualCarbs(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-stone-400 uppercase mb-1 text-center">Fat (g)</label>
                      <input
                        id="meal-fat-input"
                        type="number"
                        placeholder="0"
                        className="w-full bg-stone-900 border border-stone-800 focus:border-emerald-500 rounded-xl py-1.5 px-2 text-white text-xs text-center outline-none"
                        value={manualFat}
                        onChange={(e) => setManualFat(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-stone-400 uppercase mb-1 text-center">Time</label>
                      <input
                        id="meal-time-input"
                        type="text"
                        placeholder="12:00"
                        className="w-full bg-stone-900 border border-stone-800 focus:border-emerald-500 rounded-xl py-1.5 px-2 text-white text-xs text-center outline-none"
                        value={manualTime}
                        onChange={(e) => setManualTime(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setIsAddingMeal(false)}
                      className="px-3 py-1.5 bg-stone-900 hover:bg-stone-850 text-stone-400 text-xs font-semibold rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs font-bold rounded-lg"
                    >
                      Save Meal
                    </button>
                  </div>
                </form>
              )}

              {/* Journal meals records */}
              {todayLog.meals.length === 0 ? (
                <div id="no-meals-state" className="py-12 text-center border border-dashed border-stone-800 rounded-2xl">
                  <ChefHat className="h-10 w-10 text-stone-600 mx-auto mb-2" />
                  <p className="text-stone-400 text-sm font-semibold">Your journal is currently empty</p>
                  <p className="text-stone-600 text-xs mt-1 max-w-[280px] mx-auto">
                    Use 'Add Item' above or process a camera snapshot scan on the right!
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {todayLog.meals.map(meal => (
                    <div
                      key={meal.id}
                      className="flex items-center justify-between p-3.5 bg-stone-950 border border-stone-850 rounded-2xl hover:border-stone-800 transition-all duration-200"
                    >
                      <div className="flex items-center gap-3">
                        {meal.imageUrl ? (
                          <img
                            src={meal.imageUrl}
                            className="w-12 h-12 rounded-xl object-cover border border-stone-800"
                            alt="Scan Preview"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-center">
                            <Apple className="h-5 w-5 text-emerald-400" />
                          </div>
                        )}

                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-white text-sm font-bold tracking-tight">{meal.name}</span>
                            {meal.isAiGenerated && (
                              <span className="p-0.5 px-2 bg-emerald-950 border border-emerald-900 text-emerald-400 text-[8px] uppercase font-black rounded-lg flex items-center gap-0.5">
                                <Sparkles className="h-2 w-2" /> AI Verified
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-stone-500 mt-1 flex gap-2">
                            <span>Clock: {meal.time}</span>
                            <span>•</span>
                            <span className="text-stone-400">P:{meal.protein}g   C:{meal.carbs}g   F:{meal.fat}g</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-white bg-stone-900 px-2.5 py-1 rounded-lg border border-stone-850">
                          {meal.calories} kcal
                        </span>
                        <button
                          onClick={() => handleDeleteMeal(meal.id)}
                          className="text-stone-500 hover:text-red-400 p-1.5 bg-stone-900 hover:bg-stone-850 rounded-xl transition cursor-pointer"
                          title="Delete meal"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Camera Scan visual tool & quick recommendations */}
          <div className="space-y-6">
            
            {/* Visual Calorie Counter Camera Scanner mock feature */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Camera className="text-emerald-400 h-4.5 w-4.5" /> Cal AI Photo Estimator
                </h3>
                <p className="text-stone-500 text-xs mt-0.5">Drag & drop or upload a food photo to estimate calories instantly.</p>
              </div>

              {/* Upload Drop Zone container */}
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={triggerUploadClick}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 ${
                  previewUrl 
                    ? 'border-emerald-500 bg-stone-950/20' 
                    : 'border-stone-800 hover:border-stone-750 bg-stone-950'
                }`}
              >
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileChange}
                />

                {previewUrl ? (
                  <div className="space-y-3">
                    <img
                      src={previewUrl}
                      className="max-h-40 mx-auto rounded-xl object-contain border border-stone-800"
                      alt="Food selection upload"
                      referrerPolicy="no-referrer"
                    />
                    <span className="text-[10px] text-stone-400 block">Tap here to choose a different photo</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="p-3 bg-stone-900 rounded-full w-fit mx-auto border border-stone-850">
                      <Image className="h-6 w-6 text-stone-500" />
                    </div>
                    <p className="text-xs text-stone-400 font-semibold">Drop food photo or tap to browse</p>
                    <p className="text-[10px] text-stone-600">Supports JPEG, PNG up to 10MB</p>
                  </div>
                )}
              </div>

              {previewUrl && !scanResult && (
                <button
                  id="btn-scan-food"
                  onClick={handleScanFoodImage}
                  disabled={scanning}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-stone-800 text-stone-950 font-bold text-xs py-2.5 rounded-xl transition flex justify-center items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                  {scanning ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin"></span> Connecting with Gemini AI Estimation...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" /> Estimate Calories with Gemini
                    </>
                  )}
                </button>
              )}

              {scanError && (
                <div className="p-3 bg-red-950/50 border border-red-900 text-red-300 rounded-xl text-[10px] flex gap-1.5">
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                  <span>{scanError}</span>
                </div>
              )}

              {scanResult && (
                <div className="bg-stone-950 border border-stone-850 p-4 rounded-2xl space-y-4">
                  <div className="border-b border-stone-850 pb-2">
                    <div className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> AI Estimation Results
                    </div>
                    <div className="text-white font-bold text-sm mt-1">{scanResult.name}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-stone-900/60 p-2 rounded-xl">
                      <span className="block text-[8px] text-stone-500 uppercase font-bold">Estimated kcal</span>
                      <span className="text-white font-mono font-black text-sm">{scanResult.calories}</span>
                    </div>

                    <div className="bg-stone-900/60 p-2 rounded-xl">
                      <span className="block text-[8px] text-stone-500 uppercase font-bold">Protein (g)</span>
                      <span className="text-emerald-400 font-mono font-black text-xs">{scanResult.protein}g</span>
                    </div>

                    <div className="bg-stone-900/60 p-2 rounded-xl">
                      <span className="block text-[8px] text-stone-500 uppercase font-bold">Carbs (g)</span>
                      <span className="text-lime-400 font-mono font-black text-xs">{scanResult.carbs}g</span>
                    </div>

                    <div className="bg-stone-900/60 p-2 rounded-xl">
                      <span className="block text-[8px] text-stone-500 uppercase font-bold">Fat (g)</span>
                      <span className="text-yellow-400 font-mono font-black text-xs">{scanResult.fat}g</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      id="btn-confirm-scan"
                      onClick={handleAcceptScanResult}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs font-bold py-2 rounded-xl transition cursor-pointer"
                    >
                      Add to journal
                    </button>
                    <button
                      id="btn-discard-scan"
                      onClick={() => {
                        setScanResult(null);
                        setImageFile(null);
                        setPreviewUrl(null);
                      }}
                      className="px-3 border border-stone-800 text-stone-400 hover:text-white rounded-xl text-xs"
                    >
                      Discard
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick-Log Meal presets aligned to goal */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <ChefHat className="text-emerald-400 h-4 w-4" /> Recommended Presets
              </h3>
              <p className="text-stone-500 text-xs">Instantly tap to log popular nutrition-conscious macros:</p>
              
              <div className="space-y-2 pt-1 text-xs">
                {[
                  { name: 'Double Breast Grilled Chicken with Jasmine Rice', calories: 510, protein: 44, carbs: 55, fat: 10 },
                  { name: 'Organic Greek Yogurt with Fresh Berries', calories: 240, protein: 18, carbs: 22, fat: 6 },
                  { name: 'Baked Salmon with Steamed Asparagus spears', calories: 420, protein: 35, carbs: 8, fat: 24 },
                  { name: 'Whey Isolate Protein Shake with Almond Milk', calories: 180, protein: 26, carbs: 5, fat: 4 },
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSavePresetToLog(preset)}
                    className="w-full p-2.5 bg-stone-950 border border-stone-850 hover:border-emerald-500/20 text-left rounded-xl transition flex justify-between items-center group cursor-pointer"
                  >
                    <div className="max-w-[170px] truncate">
                      <div className="text-stone-300 font-bold truncate group-hover:text-emerald-400">{preset.name}</div>
                      <div className="text-[10px] text-stone-500 mt-0.5">P:{preset.protein}g  C:{preset.carbs}g  F:{preset.fat}g</div>
                    </div>
                    <div className="text-white font-mono font-bold bg-stone-900 border border-stone-800 py-1 px-2 rounded group-hover:border-emerald-500/30">
                      +{preset.calories}
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>

        </div>
      ) : (
        /* AI CALENDAR MEAL SCHEDULES DETAILED DISPLAY */
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <ChefHat className="text-emerald-400" /> AI-Generated 7-Day Meal Schedule
              </h3>
              <p className="text-stone-500 text-xs">Balanced specifically for {macros.calories} Daily Calories target.</p>
            </div>

            {/* Quick Diet Generator inside Nutrition schedule view if missing */}
            {!userSession.weeklyDietPlan && (
              <button
                id="btn-gen-diet-nutrition-page"
                onClick={onGenerateDiet}
                className="bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1 cursor-pointer transition"
              >
                <Sparkles className="h-4 w-4 text-stone-950" /> Generate Weekly Schedule
              </button>
            )}
          </div>

          {userSession.weeklyDietPlan ? (
            <div className="space-y-6">
              {/* Day selection slider pills */}
              <div className="flex gap-2 overflow-x-auto pb-2 pr-1">
                {userSession.weeklyDietPlan.days.map(day => (
                  <button
                    key={day.dayName}
                    id={`diet-day-tab-${day.dayName}`}
                    className={`py-2 px-4 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer ${
                      selectedDay === day.dayName
                        ? 'bg-emerald-500 text-stone-950'
                        : 'bg-stone-950 text-stone-400 hover:text-white border border-stone-850'
                    }`}
                    onClick={() => setSelectedDay(day.dayName)}
                  >
                    {day.dayName}
                  </button>
                ))}
              </div>

              {/* Meals of chosen day */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userSession.weeklyDietPlan.days
                  .find(d => d.dayName === selectedDay)
                  ?.meals.map((mealItem, idx) => (
                    <div
                      key={idx}
                      className="bg-stone-950 border border-stone-850 p-4.5 rounded-2xl space-y-3 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="p-1 px-2.5 text-[9px] bg-stone-900 border border-stone-800 text-stone-400 font-extrabold uppercase rounded-lg">
                            {mealItem.mealType}
                          </span>
                          <span className="font-mono text-xs font-bold text-emerald-400">
                            {mealItem.calories} kcal
                          </span>
                        </div>

                        <h4 className="text-white text-base font-extrabold tracking-tight mt-1">{mealItem.name}</h4>
                        <p className="text-stone-400 text-xs mt-1.5 leading-relaxed">{mealItem.description}</p>
                      </div>

                      <div className="pt-3 border-t border-stone-900 flex justify-between items-center text-[10px] text-stone-500 mt-2 font-mono">
                        <span>P: {mealItem.protein}g</span>
                        <span>C: {mealItem.carbs}g</span>
                        <span>F: {mealItem.fat}g</span>
                        <button
                          onClick={() => handleSavePresetToLog({
                            name: `AI: ${mealItem.name}`,
                            calories: mealItem.calories,
                            protein: mealItem.protein,
                            carbs: mealItem.carbs,
                            fat: mealItem.fat,
                          })}
                          className="p-1 px-3 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-stone-950 rounded-lg text-[9px] font-bold transition flex items-center gap-0.5"
                        >
                          Log Meal <Check className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <div className="py-16 text-center border border-dashed border-stone-800 rounded-3xl">
              <chef-hat className="h-12 w-12 text-stone-600 mx-auto mb-2" />
              <p className="text-stone-400 text-sm font-semibold">Weekly Diet Schedule has not been generated yet</p>
              <p className="text-stone-600 text-xs mt-1 max-w-[340px] mx-auto mb-6">
                Tap the Generator button above so our AI system uses Gemini models to assemble a balanced diet plan!
              </p>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
