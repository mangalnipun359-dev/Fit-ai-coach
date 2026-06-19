import React, { useState } from 'react';
import { UserSession, DailyLog, Workout, WorkoutExercise } from '../types';
import { Plus, Dumbbell, Trash2, Check, Sparkles, Flame, Calendar, Clock, Heart, Award, CheckCircle2, ShieldAlert, RefreshCw } from 'lucide-react';

interface WorkoutProps {
  userSession: UserSession;
  onUpdateLog: (date: string, updatedLog: DailyLog) => void;
  onGenerateWorkout: () => Promise<void>;
}

export default function WorkoutView({ userSession, onUpdateLog, onGenerateWorkout }: WorkoutProps) {
  const [activeTab, setActiveTab] = useState<'journal' | 'calendar' | 'library'>('journal');
  const [selectedDay, setSelectedDay] = useState<string>('Monday');

  // Manual adding state
  const [manualTitle, setManualTitle] = useState('');
  const [manualCategory, setManualCategory] = useState<'strength' | 'cardio' | 'hiit' | 'flexibility'>('strength');
  const [manualDuration, setManualDuration] = useState('');
  const [manualBurned, setManualBurned] = useState('');
  const [isAddingWorkout, setIsAddingWorkout] = useState(false);

  // Nested exercises adding
  const [exerciseInput, setExerciseInput] = useState('');
  const [setsInput, setSetsInput] = useState('3');
  const [repsInput, setRepsInput] = useState('10');
  const [pendingExercises, setPendingExercises] = useState<WorkoutExercise[]>([]);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayLog: DailyLog = userSession.logs[todayStr] || {
    date: todayStr,
    waterMl: 0,
    meals: [],
    workouts: [],
  };

  const [modifying, setModifying] = useState(false);
  const [modifyError, setModifyError] = useState('');
  const [modifySuccess, setModifySuccess] = useState('');

  const handleInjuryModify = async () => {
    setModifying(true);
    setModifyError('');
    setModifySuccess('');
    try {
      const response = await fetch('/api/ai/modify-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userSession.email,
          date: todayStr
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to modify workout list.');
      }
      
      // Update log locally
      if (data.user && data.user.logs && data.user.logs[todayStr]) {
        onUpdateLog(todayStr, data.user.logs[todayStr]);
        setModifySuccess('Workout routine adjusted to match reported pain/injury criteria successfully!');
        setTimeout(() => setModifySuccess(''), 4500);
      } else {
        setModifyError('You must first log workouts or exercises today to apply modifications.');
      }
    } catch (err: any) {
      setModifyError(err.message || 'Error occurred while modifying.');
    } finally {
      setModifying(false);
    }
  };

  const handleAddPendingExercise = () => {
    if (!exerciseInput.trim()) return;
    const newEx: WorkoutExercise = {
      name: exerciseInput.trim(),
      sets: parseInt(setsInput) || 3,
      reps: repsInput.trim() || '10 reps',
    };
    setPendingExercises(prev => [...prev, newEx]);
    setExerciseInput('');
  };

  const handleSaveWorkout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim() || !manualDuration) return;

    const newWorkout: Workout = {
      id: `workout_${Date.now()}`,
      name: manualTitle.trim(),
      category: manualCategory,
      durationMinutes: parseInt(manualDuration) || 30,
      caloriesBurned: parseInt(manualBurned) || 150,
      exercises: pendingExercises,
      completed: true,
    };

    const updated = {
      ...todayLog,
      workouts: [...todayLog.workouts, newWorkout],
    };

    onUpdateLog(todayStr, updated);

    // Reset fields
    setManualTitle('');
    setManualDuration('');
    setManualBurned('');
    setPendingExercises([]);
    setIsAddingWorkout(false);
  };

  const handleDeleteWorkout = (workoutId: string) => {
    const updated = {
      ...todayLog,
      workouts: todayLog.workouts.filter(w => w.id !== workoutId),
    };
    onUpdateLog(todayStr, updated);
  };

  const handleSavePresetWorkout = (aiWorkoutPreset: { name: string; category: any; duration: number; calories: number; exercises: any[] }) => {
    const newWorkout: Workout = {
      id: `workout_preset_${Date.now()}`,
      name: aiWorkoutPreset.name,
      category: aiWorkoutPreset.category,
      durationMinutes: aiWorkoutPreset.duration,
      caloriesBurned: aiWorkoutPreset.calories,
      exercises: aiWorkoutPreset.exercises.map(ex => ({
        name: ex.name,
        sets: ex.sets || 3,
        reps: ex.reps || '10 reps',
      })),
      completed: true,
    };

    const updated = {
      ...todayLog,
      workouts: [...todayLog.workouts, newWorkout],
    };

    onUpdateLog(todayStr, updated);
  };

  return (
    <div id="workouts-view" className="space-y-6">
      
      {/* Upper Tab controllers: Workout Log vs 7-Day Planner vs Library */}
      <div className="flex justify-between items-center bg-stone-900 border border-stone-800 p-1.5 rounded-2xl">
        <div className="flex gap-1 overflow-x-auto">
          <button
            id="tab-workouts-journal"
            className={`py-2 px-4 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
              activeTab === 'journal' ? 'bg-emerald-500 text-stone-950 font-black' : 'text-stone-400 hover:text-white'
            }`}
            onClick={() => setActiveTab('journal')}
          >
            Today's Workouts
          </button>
          <button
            id="tab-workouts-calendar"
            className={`py-2 px-4 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'calendar' ? 'bg-emerald-500 text-stone-950 font-black' : 'text-stone-400 hover:text-white'
            }`}
            onClick={() => setActiveTab('calendar')}
          >
            <Calendar className="h-3.5 w-3.5" /> AI 7-Day Planner
          </button>
          <button
            id="tab-workouts-library"
            className={`py-2 px-4 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'library' ? 'bg-emerald-500 text-stone-950 font-black' : 'text-stone-400 hover:text-white'
            }`}
            onClick={() => setActiveTab('library')}
          >
            <Dumbbell className="h-3.5 w-3.5" /> Posture & Safety Library
          </button>
        </div>

        <span className="text-[10px] text-stone-500 font-mono hidden sm:inline">
          Calories Out Tracker • {todayStr}
        </span>
      </div>

      {activeTab === 'journal' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          
          {/* Left Area: Daily Workout logs */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                    <Dumbbell className="text-emerald-400 h-5 w-5" /> Registered Exercises
                  </h3>
                  <p className="text-stone-500 text-xs">Workouts checked off for {todayStr}</p>
                </div>

                <button
                  id="toggle-add-workout-form"
                  onClick={() => setIsAddingWorkout(!isAddingWorkout)}
                  className="bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs py-2 px-3.5 rounded-xl flex items-center gap-1 transition cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Log Exercise
                </button>
              </div>

              {/* AI Injury Shield Panel */}
              {(userSession.profile?.injuriesOrLimitations || todayLog.workouts.length > 0) && (
                <div className="p-4 bg-stone-950 border border-stone-850 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase tracking-wider font-extrabold text-red-400 bg-red-950/20 px-2 py-0.5 rounded-md border border-red-900/30 flex items-center gap-1 w-max">
                      <ShieldAlert className="h-3.5 w-3.5" /> AI Rehab Memory Active
                    </span>
                    <h4 className="text-white text-xs font-bold mt-1.5">
                      {userSession.profile?.injuriesOrLimitations 
                        ? `Limitation: "${userSession.profile.injuriesOrLimitations}"`
                        : "No joint pain points declared yet"}
                    </h4>
                    <p className="text-[10px] text-stone-500 leading-normal">
                      Have soreness or joint pain? Transform your registered exercises into injury-safe routines in one click.
                    </p>
                  </div>

                  {todayLog.workouts.length > 0 && (
                    <button
                      id="apply-injury-aware-btn"
                      type="button"
                      disabled={modifying}
                      onClick={handleInjuryModify}
                      className="w-full sm:w-auto bg-stone-900 hover:bg-stone-850 text-emerald-400 border border-stone-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0"
                    >
                      {modifying ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Fitting joint safety...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3" /> Adjust for Pain Points
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {modifySuccess && (
                <div className="p-3 bg-emerald-950/50 border border-emerald-900 text-emerald-300 rounded-xl text-xs text-center font-bold">
                  {modifySuccess}
                </div>
              )}

              {modifyError && (
                <div className="p-3 bg-red-950/50 border border-red-900 text-red-300 rounded-xl text-xs text-center font-medium">
                  {modifyError}
                </div>
              )}

              {isAddingWorkout && (
                <form id="add-workout-form" onSubmit={handleSaveWorkout} className="bg-stone-950 border border-stone-850 p-4.5 rounded-2xl space-y-4 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Workout Title / Routine</label>
                      <input
                        id="workout-title-input"
                        type="text"
                        required
                        placeholder="e.g. Intense Upper Push routine"
                        className="w-full bg-stone-900 border border-stone-800 focus:border-emerald-500 rounded-xl py-2 px-3 text-white text-xs outline-none"
                        value={manualTitle}
                        onChange={(e) => setManualTitle(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Activity Category</label>
                      <select
                        id="workout-category-select"
                        className="w-full bg-stone-900 border border-stone-800 text-white text-xs rounded-xl py-2 px-3 outline-none"
                        value={manualCategory}
                        onChange={(e) => setManualCategory(e.target.value as any)}
                      >
                        <option value="strength">Weight Lifting / Strength</option>
                        <option value="cardio">Cardio Endurance</option>
                        <option value="hiit">HIIT / High Intensity Intervals</option>
                        <option value="flexibility">Yoga / Flexibility</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Duration (Minutes)</label>
                      <input
                        id="workout-duration-input"
                        type="number"
                        required
                        placeholder="e.g. 45"
                        className="w-full bg-stone-900 border border-stone-800 focus:border-emerald-500 rounded-xl py-2 px-3 text-white text-xs outline-none"
                        value={manualDuration}
                        onChange={(e) => setManualDuration(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Estimated Calories Burned</label>
                      <input
                        id="workout-burned-input"
                        type="number"
                        placeholder="e.g. 240"
                        className="w-full bg-stone-900 border border-stone-800 focus:border-emerald-500 rounded-xl py-2 px-3 text-white text-xs outline-none"
                        value={manualBurned}
                        onChange={(e) => setManualBurned(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Add exercises sub-forms */}
                  <div className="border-t border-stone-850 pt-3 space-y-3">
                    <span className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest pl-0.5">Exercises in this Workout (Optional)</span>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <input
                          id="nested-ex-name-input"
                          type="text"
                          placeholder="Compound Exercise (e.g. Bench Press)"
                          className="w-full bg-stone-900 border border-stone-800 focus:border-emerald-500 rounded-xl py-1.5 px-3 text-stone-300 text-xs outline-none"
                          value={exerciseInput}
                          onChange={(e) => setExerciseInput(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-1.5">
                        <input
                          id="nested-ex-sets-input"
                          type="number"
                          placeholder="Sets (3)"
                          className="w-12 bg-stone-900 border border-stone-800 rounded-xl py-1.5 text-center text-white"
                          value={setsInput}
                          onChange={(e) => setSetsInput(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={handleAddPendingExercise}
                          className="flex-1 bg-stone-800 hover:bg-stone-750 text-emerald-400 rounded-xl font-bold font-mono"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {pendingExercises.length > 0 && (
                      <div className="bg-stone-900/40 p-2.5 rounded-xl border border-stone-850 space-y-1 font-mono text-[10px] text-stone-400">
                        {pendingExercises.map((ex, id) => (
                          <div key={id} className="flex justify-between">
                            <span>• {ex.name}</span>
                            <span>{ex.sets} sets × {ex.reps}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingWorkout(false)}
                      className="px-3 py-1.5 bg-stone-900 hover:bg-stone-850 text-stone-400 text-xs font-semibold rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs font-bold rounded-lg"
                    >
                      Save Workout
                    </button>
                  </div>
                </form>
              )}

              {/* Workout list records */}
              {todayLog.workouts.length === 0 ? (
                <div id="no-workouts-state" className="py-16 text-center border border-dashed border-stone-800 rounded-2xl">
                  <Dumbbell className="h-10 w-10 text-stone-600 mx-auto mb-2" />
                  <p className="text-stone-400 text-sm font-semibold">No active workout logs found today</p>
                  <p className="text-stone-600 text-xs mt-1 max-w-[280px] mx-auto">
                    Choose 'Log Exercise' above to register calories, or claim workout presets on the right!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayLog.workouts.map(work => (
                    <div
                      key={work.id}
                      className="p-4 bg-stone-950 border border-stone-850 rounded-2xl hover:border-stone-800 transition-all duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-orange-950/20 border border-orange-900/35 flex items-center justify-center text-orange-400">
                            <Dumbbell className="h-5 w-5" />
                          </div>

                          <div>
                            <div className="text-white text-sm font-extrabold tracking-tight capitalize">{work.name}</div>
                            <div className="text-[10px] text-stone-500 mt-0.5 flex gap-2">
                              <span className="capitalize">{work.category}</span>
                              <span>•</span>
                              <span>{work.durationMinutes} minutes duration</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs font-bold text-orange-400 bg-stone-900 px-2.5 py-1 rounded-lg border border-stone-850">
                            -{work.caloriesBurned} kcal
                          </span>
                          <button
                            onClick={() => handleDeleteWorkout(work.id)}
                            className="text-stone-500 hover:text-red-400 p-1.5 bg-stone-900 hover:bg-stone-850 rounded-xl transition cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Display nested exercise sub items */}
                      {work.exercises && work.exercises.length > 0 && (
                        <div className="mt-3.5 pt-3.5 border-t border-stone-900 space-y-2.5 pl-1 font-mono text-[10px]">
                          {work.exercises.map((ex, idx) => (
                            <div key={idx} className="space-y-1 bg-[#151518] p-2.5 rounded-xl border border-stone-850/50">
                              <div className="flex justify-between items-center">
                                <span className="text-stone-300 font-bold truncate">• {ex.name}</span>
                                <span className="text-stone-500 shrink-0 font-medium">{ex.sets} sets × {ex.reps}</span>
                              </div>
                              {ex.notes && (
                                <div className="text-[9px] text-emerald-400 bg-emerald-950/10 p-1 px-1.5 rounded-lg border border-emerald-950/30 font-sans leading-normal">
                                  💡 {ex.notes}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Area: Calorie-Burn Presets & milestones */}
          <div className="space-y-6">
            
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="text-orange-400 h-4.5 w-4.5 animate-pulse" /> Popular Cardio Presets
              </h3>
              <p className="text-stone-500 text-xs">Quick log typical dynamic workout routines:</p>

              <div className="space-y-2 pt-1 font-sans text-xs">
                {[
                  { name: 'Treadmill Interval Running (Sprint focus)', category: 'cardio', duration: 30, calories: 340, exercises: [{ name: 'Warmup Jog', sets: 1, reps: '5 mins' }, { name: 'Sprints', sets: 10, reps: '1 min sprints' }] },
                  { name: 'Heavy Kettlebell Snatches & HIIT Circuits', category: 'hiit', duration: 25, calories: 290, exercises: [{ name: 'Kettlebell swings', sets: 4, reps: '45 seconds' }] },
                  { name: 'Rowing Machine High Intensity', category: 'cardio', duration: 20, calories: 220, exercises: [] },
                  { name: 'Vinyasa Flow Power Yoga & Stretching', category: 'flexibility', duration: 45, calories: 160, exercises: [] },
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSavePresetWorkout(preset)}
                    className="w-full p-2.5 bg-stone-950 border border-stone-850 hover:border-orange-500/20 text-left rounded-xl transition flex justify-between items-center group cursor-pointer animate-fade-in"
                  >
                    <div className="max-w-[170px] truncate">
                      <div className="text-stone-300 font-bold truncate group-hover:text-orange-400">{preset.name}</div>
                      <div className="text-[10px] text-stone-500 mt-0.5">{preset.duration} mins • {preset.category}</div>
                    </div>
                    <div className="text-orange-400 font-mono font-bold bg-stone-900 border border-stone-800 py-1 px-2 rounded group-hover:border-orange-500/30 shrink-0">
                      -{preset.calories}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex gap-2">
                <div className="p-2.5 bg-orange-950/20 border border-orange-900/30 rounded-xl text-orange-400">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-white text-xs font-bold">Active Fitness Milestones</h4>
                  <p className="text-stone-500 text-[10px]">Track caloric targets and muscle tone.</p>
                </div>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <div className="flex justify-between text-[10px] text-stone-400 mb-1">
                    <span>Cardio Goal</span>
                    <span className="font-mono">1/3 workouts weekly</span>
                  </div>
                  <div className="w-full h-1.5 bg-stone-950 rounded-full overflow-hidden">
                    <div className="bg-orange-400 h-full rounded-full" style={{ width: '33%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-stone-400 mb-1">
                    <span>Active Strength target</span>
                    <span className="font-mono">3/3 workouts weekly</span>
                  </div>
                  <div className="w-full h-1.5 bg-stone-950 rounded-full overflow-hidden">
                    <div className="bg-emerald-400 h-full rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {activeTab === 'calendar' && (
        /* AI CALENDAR WEEKLY TRAINING PROTOCOLS */
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <Dumbbell className="text-emerald-400 animate-pulse" /> AI-Generated 7-Day Workout Plan
              </h3>
              <p className="text-stone-500 text-xs">Formulated precisely to achieve: {userSession.profile?.goal?.replace('_', ' ') || 'Loss'}.</p>
            </div>

            {!userSession.weeklyWorkoutPlan && (
              <button
                id="btn-gen-workout-workouts-page"
                onClick={onGenerateWorkout}
                className="bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1 cursor-pointer transition"
              >
                <Sparkles className="h-4 w-4 text-stone-950" /> Generate Weekly Workout plan
              </button>
            )}
          </div>

          {userSession.weeklyWorkoutPlan ? (
            <div className="space-y-6">
              
              {/* Day horizontal selection pills */}
              <div className="flex gap-2 overflow-x-auto pb-2 pr-1">
                {userSession.weeklyWorkoutPlan.days.map(day => (
                  <button
                    key={day.dayName}
                    id={`workout-day-tab-${day.dayName}`}
                    className={`py-2 px-4 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer ${
                      selectedDay === day.dayName
                        ? 'bg-emerald-500 text-stone-950'
                        : 'bg-stone-950 text-stone-400 hover:text-white border border-stone-850'
                    }`}
                    onClick={() => setSelectedDay(day.dayName)}
                  >
                    {day.dayName} {day.restDay ? '(Rest)' : ''}
                  </button>
                ))}
              </div>

              {/* Workouts detailed view for chosen day */}
              <div>
                {(() => {
                  const dayObj = userSession.weeklyWorkoutPlan.days.find(d => d.dayName === selectedDay);
                  if (!dayObj) return null;

                  if (dayObj.restDay || dayObj.workouts.length === 0) {
                    return (
                      <div className="py-12 bg-stone-950 border border-stone-850 rounded-2xl text-center space-y-2">
                        <Heart className="h-8 w-8 text-emerald-400 mx-auto" />
                        <h4 className="text-white text-base font-bold">Planned Muscle Recovery Rest Day</h4>
                        <p className="text-stone-500 text-xs max-w-[320px] mx-auto leading-relaxed">
                          No intensive strength workout. Drink plenty of water, stretch, and let your body build muscle fibres today!
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {dayObj.workouts.map((workRow, keyIdx) => (
                        <div key={keyIdx} className="bg-stone-950 border border-stone-850 p-5 rounded-3xl space-y-4">
                          
                          <div className="flex justify-between items-start flex-wrap gap-2">
                            <div>
                              <span className="p-1 px-2.5 text-[9px] bg-stone-900 border border-stone-800 text-stone-400 uppercase font-black rounded-lg">
                                Category: {workRow.category}
                              </span>
                              <h4 className="text-white text-lg font-black tracking-tight mt-2">{workRow.name}</h4>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-stone-400 flex items-center gap-0.5 font-mono">
                                <Clock className="h-3.5 w-3.5 text-stone-500" /> {workRow.duration} mins
                              </span>
                              <span>•</span>
                              <span className="text-orange-400 text-xs font-mono font-bold">
                                {workRow.calories} kcal burn
                              </span>
                            </div>
                          </div>

                          {/* Exercise lists inside raw calendar */}
                          {workRow.exercises && workRow.exercises.length > 0 && (
                            <div className="bg-stone-900/40 border border-stone-850 rounded-2xl p-4 space-y-3 font-mono text-xs">
                              <span className="block text-[10px] text-stone-500 font-bold uppercase tracking-widest mb-1 pl-0.5">Exercises Routine checklist</span>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {workRow.exercises.map((exerc, exercIdx) => (
                                  <div key={exercIdx} className="p-2.5 bg-stone-950 rounded-xl border border-stone-850/60 flex flex-col gap-1">
                                    <div className="flex justify-between items-center w-full">
                                      <span className="text-stone-300 font-bold truncate">• {exerc.name}</span>
                                      <span className="text-stone-500 text-[11px] shrink-0">{exerc.sets} s × {exerc.reps}</span>
                                    </div>
                                    {exerc.notes && (
                                      <span className="text-[9px] text-emerald-400 bg-emerald-950/10 p-1 rounded-md border border-emerald-950/20 font-sans leading-normal block mt-0.5">
                                        💡 {exerc.notes}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex justify-end pt-2">
                            <button
                              onClick={() => handleSavePresetWorkout({
                                name: `AI workout: ${workRow.name}`,
                                category: workRow.category,
                                duration: workRow.duration,
                                calories: workRow.calories,
                                exercises: workRow.exercises,
                              })}
                              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 rounded-xl text-xs font-extrabold transition flex items-center gap-1"
                            >
                              Log Routine Completed <CheckCircle2 className="h-4 w-4 text-stone-950" />
                            </button>
                          </div>

                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

            </div>
          ) : (
            <div className="py-16 text-center border border-dashed border-stone-800 rounded-3xl">
              <Dumbbell className="h-12 w-12 text-stone-600 mx-auto mb-2" />
              <p className="text-stone-400 text-sm font-semibold">Weekly Workout Schedule has not been generated yet</p>
              <p className="text-stone-600 text-[11px] mt-1 max-w-[340px] mx-auto mb-6">
                Tap the Generator button above so our Gemini AI agent generates a structured workout routine tailored to your physique!
              </p>
            </div>
          )}
        </div>
      )}

      {/* POSTURE & SAFETY VISUAL LIBRARY TAB */}
      {activeTab === 'library' && (
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl space-y-6 animate-fade-in text-xs">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                <Dumbbell className="text-emerald-400 rotate-45" /> Biomechanical Posture & Rehabilitation Library
              </h3>
              <p className="text-stone-500 text-xs">Aide of premium exercise charts, joint triggers, and how-to guides to eliminate injury rates.</p>
            </div>
            
            <div className="flex items-center gap-2 bg-stone-950 border border-stone-850 px-3 py-1.5 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">AI Guard memory live</span>
            </div>
          </div>

          {/* Interactive search and Muscle categories filters */}
          <WorkoutLibraryController />
        </div>
      )}

    </div>
  );
}

// Separate helper component for state tracking within the Workout Library to avoid rerendering the parent context!
function WorkoutLibraryController() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<'all' | 'legs' | 'back' | 'chest' | 'shoulders'>('all');
  const [expandedId, setExpandedId] = useState<string | null>('squats');

  const exercises = [
    {
      id: 'squats',
      name: 'Barbell Back Squats / Goblet Squats',
      muscle: 'legs',
      target: 'Quadriceps, Glutes, Hamstrings',
      difficulty: 'Intermediate',
      equipment: 'Barbell or Dumbbell',
      jointFocus: 'Knees & Lumbar Spine',
      postureSlogan: 'Drive knees outward, maintain a tall chest posture.',
      instructions: [
        'Place feet shoulder-width apart, toes flared slightly outwards (15-30 degrees).',
        'Break at your hips and knees simultaneously to commence lower descent.',
        'Push your knees outward, tracking in direct line above your toes.',
        'Keep your thoracic spine locked and chest upright; do not let your back round.',
        'Lower to comfortable parallel depth (hips level with or below knees) while maintaining heels flat.'
      ],
      dangerSigns: 'Valgus collapse (knees caving inward) and posterior pelvic tilt ("butt wink") which stresses lower discs.',
      rehabNote: 'If experiencing current knee paint points, replace with seated Leg Extensions or Low-Level Bodyweight Glute Bridges.',
      illustrationText: '┌─────────────────────────┐\n│      ()  [TALL CHEST]   │\n│     /██\\ ─── UPWARD     │\n│     /  \\  ◄── KNEES OUT │\n│    /____\\               │\n│   [HEELS FLAT ON FLOOR] │\n└─────────────────────────┘'
    },
    {
      id: 'deadlifts',
      name: 'Conventional & Romanian Deadlifts (RDL)',
      muscle: 'back',
      target: 'Hamstrings, Gluteus Maximus, Erector Spinae',
      difficulty: 'Advanced',
      equipment: 'Barbell or Heavy Dumbbells',
      jointFocus: 'Lower Lumbar Vertebrae',
      postureSlogan: 'Pivot at hips, drag the bar against shins.',
      instructions: [
        'Stand with shins 1 inch away from the barbell. Midfoot directly under bar center.',
        'Hinge forward by pushing your hips backwards; maintain rigid lower back symmetry.',
        'Spike your lat muscles as if wrapping the bar around your shins.',
        'Drive through your heels to pull, maintaining the barbell in linear contact with shin bone.',
        'Finish with solid glute contraction; do not hyperextend your lumbar spine backwards at top.'
      ],
      dangerSigns: 'Severe cervical rounding (shrugging) or lower lumbar curvature, which redirects peak compression load onto spinal plates.',
      rehabNote: 'If experiencing active lumbar stiffness, exchange immediately for Kettlebell Suitcase Carries or Hip Thrusts.',
      illustrationText: '┌─────────────────────────┐\n│         O               │\n│     \\__/\\[FLAT SPLINE]  │\n│       \\                 │\n│       /\\ ◄── HIP HINGE  │\n│    ===()=== [BAR SHINS] │\n└─────────────────────────┘'
    },
    {
      id: 'benchpress',
      name: 'Flat Dumbbell / Barbell Bench Press',
      muscle: 'chest',
      target: 'Pectoralis Major, Anterior Deltoids, Triceps',
      difficulty: 'Beginner',
      equipment: 'Barbell or Pair of Dumbbells',
      jointFocus: 'Shoulder Rotator Cuffs',
      postureSlogan: 'Retract your scapula and keep feet planted flat.',
      instructions: [
        'Lie flat. Squeeze your shoulder blades tightly together as if holding a pen.',
        'Secure both feet firmly onto the floor. Create a slight natural arch in the lower back.',
        'Lower the load slowly to mid-sternum chest level, keeping elbows tucked at 45 degree angle.',
        'Avoid flaring elbows wide (90 degrees), which causes rotator cuff impingement.',
        'Press upward in a slight diagonal trajectory over your lower chest.'
      ],
      dangerSigns: 'Elbow flare matching 90-degree angle, or shoulder blades sliding forward at the apex of push movement.',
      rehabNote: 'If chest presses aggravate your shoulders, swap out for 45-degree Incline Dumbbell Presses or Neutral grip Floor Presses.',
      illustrationText: '┌─────────────────────────┐\n│        O   [BAR MIDSTER]│\n│    ◄──/█\\──►            │\n│      /   \\  ◄─ 45° ELBOW│\n│    ══════════ [BENCH]   │\n│     /     \\             │\n└─────────────────────────┘'
    },
    {
      id: 'overheadpress',
      name: 'Military Overhead barbell shoulder Press',
      muscle: 'shoulders',
      target: 'Anterior and Lateral Deltoids, Upper Traps',
      difficulty: 'Intermediate',
      equipment: 'Barbell or Dumbbells',
      jointFocus: 'Glenohumeral Joint & Core stability',
      postureSlogan: 'Brace your glutes to prevent back arching.',
      instructions: [
        'Set up the barbell at collarbone height. Grip slightly wider than shoulder width.',
        'Clench your glutes and tighten your core so your pelvis stays neutral.',
        'Push the bar directly upward, pulling your face back slightly to clear the chin.',
        'Once the bar clears your forehead, push your head through the "window" under arms.',
        'Lock out at the peak of the press with elbows pointed forward.'
      ],
      dangerSigns: 'Bending backward at the thoracic spine during struggle, exposing lower back joints to sliding forces.',
      rehabNote: 'If overhead work irritates your shoulders, swap to Dumbbell Lateral Raises or Seated Incline Shoulder Presses.',
      illustrationText: '┌─────────────────────────┐\n│       ════○════[BAR TOP]│\n│         \\O/             │\n│          █ ◄── GLUTE RIG│\n│         / \\             │\n│        |   |            │\n└─────────────────────────┘'
    }
  ];

  const filtered = exercises.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ex.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ex.jointFocus.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMuscle = selectedMuscle === 'all' || ex.muscle === selectedMuscle;
    return matchesSearch && matchesMuscle;
  });

  return (
    <div className="space-y-4 pt-2">
      {/* Search Input and Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 relative">
          <input
            id="exercise-library-search"
            type="text"
            className="w-full bg-stone-950 border border-stone-850 focus:border-emerald-500 rounded-xl py-2 px-3 pl-9 text-white placeholder-stone-500 text-xs outline-none font-bold"
            placeholder="Search posture guidelines / joint limits (e.g. knee, shoulder, lumbar)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 text-xs font-mono">🔍</span>
        </div>

        <div className="flex gap-1 overflow-x-auto">
          {(['all', 'legs', 'back', 'chest', 'shoulders'] as const).map(mus => (
            <button
              key={mus}
              id={`filter-muscle-${mus}`}
              onClick={() => setSelectedMuscle(mus)}
              className={`px-3 py-2 rounded-xl text-[10px] uppercase font-bold tracking-tight transition cursor-pointer shrink-0 border ${
                selectedMuscle === mus
                  ? 'bg-emerald-500 border-emerald-500 text-stone-950 font-black'
                  : 'bg-stone-950 border-stone-850 text-stone-400 hover:text-white'
              }`}
            >
              {mus}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Exercises */}
      <div className="grid grid-cols-1 gap-4">
        {filtered.map(ex => {
          const isExp = expandedId === ex.id;
          return (
            <div
              key={ex.id}
              id={`exercise-card-${ex.id}`}
              className={`bg-stone-950 border rounded-3xl p-5 transition-all duration-300 ${
                isExp ? 'border-emerald-500/80 shadow-2xl shadow-emerald-500/5' : 'border-stone-850 hover:border-stone-700'
              }`}
            >
              <div 
                className="flex justify-between items-start gap-4 cursor-pointer"
                onClick={() => setExpandedId(isExp ? null : ex.id)}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-stone-900 border border-stone-800 text-stone-400 px-2 py-0.5 rounded text-[9px] uppercase font-mono tracking-wider">
                      {ex.difficulty} • {ex.equipment}
                    </span>
                  </div>
                  <h4 className="text-white text-sm font-black tracking-tight">{ex.name}</h4>
                  <p className="text-[10px] text-emerald-400 italic">"{ex.postureSlogan}"</p>
                </div>

                <button
                  type="button"
                  className="bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-400 hover:text-white py-1 px-2.5 rounded-lg text-[10px] font-bold"
                >
                  {isExp ? 'Collapse' : 'Expand Guide'}
                </button>
              </div>

              {isExp && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4 pt-4 border-t border-stone-900 animate-fade-in font-sans text-xs">
                  
                  {/* Left: How to perform */}
                  <div className="lg:col-span-7 space-y-4 text-left">
                    <div className="space-y-1.5">
                      <span className="text-[9px] uppercase tracking-wider font-extrabold text-stone-500 block">Precise Biomechanical Sequence</span>
                      <ol className="space-y-2 text-stone-300 leading-relaxed list-decimal pl-4">
                        {ex.instructions.map((ins, i) => (
                          <li key={i} className="pl-1">
                            {ins}
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-xl space-y-1">
                      <span className="text-[10px] font-black tracking-wider uppercase text-red-400 flex items-center gap-1">
                        ⚠️ DO NOT IGNORE Joint Danger Indicators
                      </span>
                      <p className="text-stone-400 text-[11px] leading-normal">{ex.dangerSigns}</p>
                    </div>

                    <div className="p-3 bg-sky-950/10 border border-sky-900/30 rounded-xl space-y-1">
                      <span className="text-[10px] font-black tracking-wider uppercase text-sky-400">
                        🩹 AI Rehabilitation Modifier Advice
                      </span>
                      <p className="text-stone-400 text-[11px] leading-normal">{ex.rehabNote}</p>
                    </div>
                  </div>

                  {/* Right: Illustration & Target Details */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="space-y-1 text-left">
                      <span className="text-[9px] uppercase tracking-wider font-extrabold text-stone-500 block">Joint Shield alignment</span>
                      <div className="p-3 bg-stone-900 rounded-xl border border-stone-800 space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-stone-400">Target muscle fibres:</span>
                          <span className="font-bold text-white">{ex.target}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-400">Joint load locus:</span>
                          <span className="font-extrabold text-amber-400">{ex.jointFocus}</span>
                        </div>
                      </div>
                    </div>

                    {/* ASCII Blueprint Illustration */}
                    <div className="space-y-1 text-left">
                      <span className="text-[9px] uppercase tracking-wider font-bold text-stone-500 block">Biomechanical Posture Blueprint</span>
                      <pre className="bg-stone-950 border border-stone-850 p-4 rounded-2xl font-mono text-[10px] text-emerald-400 leading-tight block text-center overflow-x-auto">
                        {ex.illustrationText}
                      </pre>
                    </div>
                  </div>

                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="py-12 border border-dashed border-stone-800 rounded-3xl text-center text-stone-500 font-semibold">
            No matching postural guides found. Try searching simple muscle terms like "legs" or "shoulder".
          </div>
        )}
      </div>
    </div>
  );
}
