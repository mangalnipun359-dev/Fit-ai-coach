import React, { useState } from 'react';
import { UserProfile } from '../types';
import { ChevronRight, ChevronLeft, Sparkles, Ruler, Weight, User, Flame, Apple, Heart } from 'lucide-react';

interface OnboardingProps {
  email: string;
  onOnboardingComplete: (updatedUser: any) => void;
}

export default function Onboarding({ email, onOnboardingComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 4;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [profile, setProfile] = useState<UserProfile>({
    age: 26,
    gender: 'male',
    height: 175,
    weight: 72,
    activityLevel: 'moderately_active',
    goal: 'lose_weight',
    dietPreference: 'anything',
    environment: 'gym',
    equipmentAvailable: [],
  });

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSelectGender = (val: 'male' | 'female' | 'other') => {
    setProfile(prev => ({ ...prev, gender: val }));
  };

  const handleSelectActivity = (val: UserProfile['activityLevel']) => {
    setProfile(prev => ({ ...prev, activityLevel: val }));
  };

  const handleSelectGoal = (val: UserProfile['goal']) => {
    setProfile(prev => ({ ...prev, goal: val }));
  };

  const handleSelectDiet = (val: UserProfile['dietPreference']) => {
    setProfile(prev => ({ ...prev, dietPreference: val }));
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, profile })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to successfully submit profile indicators.');
      }

      onOnboardingComplete(data.user);
    } catch (err: any) {
      setError(err.message || 'Server error. Please retry again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="onboarding-stepper" className="min-h-screen bg-stone-950 text-white flex items-center justify-center py-10 px-4 font-sans">
      <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2"></div>
      
      <div className="w-full max-w-xl bg-stone-900 border border-stone-800 rounded-3xl p-6 md:p-10 shadow-2xl relative z-10">
        {/* Progress Tracker Slider bar */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold tracking-wider text-xs uppercase">
            <Sparkles className="h-4 w-4 animate-pulse text-emerald-400" />
            FitAI Setup Setup — Onboarding ({step}/{totalSteps})
          </div>
          <span className="text-stone-400 text-xs">
            {Math.round((step / totalSteps) * 100)}% Complete
          </span>
        </div>

        {/* Progress horizontal indicator */}
        <div className="w-full h-1 bg-stone-800 rounded-full mb-8 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-emerald-500 to-lime-400 h-1 transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-950/50 border border-red-900/60 rounded-xl text-red-300 text-xs text-center font-medium">
            {error}
          </div>
        )}

        {/* STEP CONTENT SWITCH PANEL */}
        <div className="min-h-[280px]">
          {step === 1 && (
            <div id="step-1" className="space-y-6">
              <div className="space-y-1.5">
                <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                  <User className="text-emerald-400" /> Tell us about yourself
                </h2>
                <p className="text-stone-400 text-sm">
                  We calculate custom metabolic targets relative to accurate gender and age indicators.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-2.5">
                    What is your Gender Identity?
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['male', 'female', 'other'] as const).map(g => (
                      <button
                        type="button"
                        key={g}
                        id={`gender-${g}`}
                        className={`py-3 px-4 rounded-xl font-bold border capitalize transition-all duration-300 cursor-pointer text-sm ${
                          profile.gender === g
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                            : 'bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700'
                        }`}
                        onClick={() => handleSelectGender(g)}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-2">
                    How old are you? (Years)
                  </label>
                  <div className="relative">
                    <input
                      id="input-age"
                      type="number"
                      min="12"
                      max="110"
                      className="w-full bg-stone-950 border border-stone-800 focus:border-emerald-500/80 rounded-xl py-3 px-4 text-white font-mono text-base outline-none"
                      value={profile.age === 0 ? '' : profile.age}
                      onChange={(e) => setProfile(prev => ({ ...prev, age: parseInt(e.target.value) || 0 }))}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-500 text-sm font-medium">years old</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div id="step-2" className="space-y-6">
              <div className="space-y-1.5">
                <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                  <Ruler className="text-emerald-400" /> Height & weight measurements
                </h2>
                <p className="text-stone-400 text-sm">
                  Crucial measurements for auto-figuring your BMR (Basal Metabolic Rate).
                </p>
              </div>

              <div className="space-y-5 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-2">
                    Current Height (Centimeters)
                  </label>
                  <div className="relative">
                    <Ruler className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 h-4.5 w-4.5" />
                    <input
                      id="input-height"
                      type="number"
                      min="80"
                      max="250"
                      className="w-full bg-stone-950 border border-stone-800 focus:border-emerald-500/80 rounded-xl py-3 pl-12 pr-12 text-white font-mono text-base outline-none"
                      value={profile.height || ''}
                      onChange={(e) => setProfile(prev => ({ ...prev, height: parseFloat(e.target.value) || 0 }))}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 text-sm">cm</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-2">
                    Current Weight (Kilograms)
                  </label>
                  <div className="relative">
                    <Weight className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 h-4.5 w-4.5" />
                    <input
                      id="input-weight"
                      type="number"
                      min="30"
                      max="300"
                      step="0.1"
                      className="w-full bg-stone-950 border border-stone-800 focus:border-emerald-500/80 rounded-xl py-3 pl-12 pr-12 text-white font-mono text-base outline-none"
                      value={profile.weight || ''}
                      onChange={(e) => setProfile(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 text-sm">kg</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div id="step-3" className="space-y-6">
              <div className="space-y-1.5">
                <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                  <Flame className="text-emerald-400" /> Lifestyle & Preference
                </h2>
                <p className="text-stone-400 text-sm">
                  Your direct activity defines metabolic multiplier calories (TDEE calculation).
                </p>
              </div>

              <div className="space-y-5 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-2">
                    Activity Level
                  </label>
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {[
                      { key: 'sedentary', label: 'Sedentary', desc: 'Little to no exercise, desk bound' },
                      { key: 'lightly_active', label: 'Lightly Active', desc: 'Light workout/sports 1-3 days/week' },
                      { key: 'moderately_active', label: 'Moderately Active', desc: 'Moderate exercises 3-5 days/week' },
                      { key: 'very_active', label: 'Very Active', desc: 'Hard sports or manual physical job 6-7 days/week' },
                      { key: 'extra_active', label: 'Extra Active', desc: 'Athletic endurance training or highly extreme sports' },
                    ].map(act => (
                      <button
                        type="button"
                        key={act.key}
                        id={`btn-act-${act.key}`}
                        className={`w-full p-2.5 rounded-xl border text-left flex justify-between items-center transition-all duration-300 cursor-pointer ${
                          profile.activityLevel === act.key
                            ? 'bg-emerald-500/10 border-emerald-500/80 text-emerald-400'
                            : 'bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700'
                        }`}
                        onClick={() => handleSelectActivity(act.key as any)}
                      >
                        <div>
                          <div className="font-bold text-xs">{act.label}</div>
                          <div className="text-stone-500 text-[10px] mt-0.5">{act.desc}</div>
                        </div>
                        {profile.activityLevel === act.key && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-2">
                    Dietary preference
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'anything', label: 'Anything' },
                      { key: 'vegetarian', label: 'Veg' },
                      { key: 'vegan', label: 'Vegan' },
                      { key: 'keto', label: 'Keto' },
                      { key: 'paleo', label: 'Paleo' },
                      { key: 'mediterranean', label: 'Mediter' },
                    ].map(diet => (
                      <button
                        type="button"
                        key={diet.key}
                        id={`btn-diet-${diet.key}`}
                        className={`py-2 px-1 rounded-xl font-bold border capitalize transition-all duration-200 text-[11px] cursor-pointer text-center ${
                          profile.dietPreference === diet.key
                            ? 'bg-emerald-500/15 border-emerald-500/80 text-emerald-400'
                            : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                        }`}
                        onClick={() => handleSelectDiet(diet.key as any)}
                      >
                        {diet.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-2">
                      Training Environment
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: 'gym', label: 'Commercial Gym' },
                        { key: 'home', label: 'Home Workout' },
                      ].map(env => (
                        <button
                          type="button"
                          key={env.key}
                          id={`btn-env-${env.key}`}
                          className={`py-2.5 rounded-xl text-xs font-bold border transition-all duration-200 cursor-pointer text-center ${
                            profile.environment === env.key
                              ? 'bg-emerald-500/15 border-emerald-500/80 text-emerald-400'
                              : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                          }`}
                          onClick={() => setProfile(prev => ({ ...prev, environment: env.key as any }))}
                        >
                          {env.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-2">
                      Equipment Available
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { key: 'barbell', label: 'Barbell' },
                        { key: 'dumbbells', label: 'Dumbbells' },
                        { key: 'kettlebell', label: 'Kettle' },
                        { key: 'bands', label: 'Bands' },
                      ].map(eq => {
                        const isSel = (profile.equipmentAvailable || []).includes(eq.key);
                        return (
                          <button
                            type="button"
                            key={eq.key}
                            id={`btn-eq-${eq.key}`}
                            className={`py-1.5 px-2 bg-stone-950 border rounded-lg text-[10px] uppercase font-mono tracking-tight transition cursor-pointer ${
                              isSel 
                                ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20' 
                                : 'border-stone-800 text-stone-500 hover:border-stone-700'
                            }`}
                            onClick={() => {
                              const list = profile.equipmentAvailable || [];
                              const updated = list.includes(eq.key)
                                ? list.filter(x => x !== eq.key)
                                : [...list, eq.key];
                              setProfile(prev => ({ ...prev, equipmentAvailable: updated }));
                            }}
                          >
                            {eq.label} {isSel ? '✓' : '+'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {step === 4 && (
            <div id="step-4" className="space-y-6">
              <div className="space-y-1.5">
                <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                  <Heart className="text-emerald-400" /> Primary Health Targets
                </h2>
                <p className="text-stone-400 text-sm">
                  Choose your fitness goal to calibrate daily macro rations!
                </p>
              </div>

              <div className="space-y-3.5 pt-3 max-h-[300px] overflow-y-auto pr-1">
                {[
                  { key: 'lose_weight', label: 'Lose Body Weight', desc: 'Caloric deficit targeting healthy fat reduction' },
                  { key: 'maintain_weight', label: 'Maintain & Tone', desc: 'Stay active at your current muscular scale status' },
                  { key: 'gain_weight', label: 'Gain Muscle Mass', desc: 'Controlled caloric surplus with dynamic strength workout guide' },
                  { key: 'bulking', label: 'Bulking Phase (Surplus)', desc: 'Caloric surplus with high carb/protein ratios to gain weight and power' },
                  { key: 'cutting', label: 'Cutting Phase (Deficit)', desc: 'Caloric deficit with high protein focus to preserve muscular size while shredding fat' },
                  { key: 'body_recomposition', label: 'Body Recomposition', desc: 'Simultaneous fat reduction and muscle gain at a strategic neutral caloric level' },
                ].map(g => (
                  <button
                    type="button"
                    key={g.key}
                    id={`btn-goal-${g.key}`}
                    className={`w-full p-4 rounded-2xl border text-left flex justify-between items-center transition-all duration-300 cursor-pointer ${
                      profile.goal === g.key
                        ? 'bg-gradient-to-r from-emerald-950/40 to-stone-900 border-emerald-500 text-white'
                        : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                    }`}
                    onClick={() => handleSelectGoal(g.key as any)}
                  >
                    <div>
                      <div className="font-bold text-sm tracking-tight">{g.label}</div>
                      <div className="text-stone-400 text-xs mt-1">{g.desc}</div>
                    </div>
                    {profile.goal === g.key && (
                      <span className="p-1 px-2.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-emerald-500 text-stone-950 flex items-center gap-1">
                        Active Target
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="pt-4 border-t border-stone-850">
                <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-2">
                  Physical Injuries, Pain points or limitations (Optional)
                </label>
                <input
                  id="input-injuries"
                  type="text"
                  className="w-full bg-stone-950 border border-stone-800 focus:border-emerald-500 rounded-xl py-3 px-4 text-white text-xs outline-none"
                  placeholder="e.g. Mild Knee Pain, back tightness, shoulder stiffness, none"
                  value={profile.injuriesOrLimitations || ''}
                  onChange={(e) => setProfile(prev => ({ ...prev, injuriesOrLimitations: e.target.value }))}
                />
                <p className="text-[10px] text-stone-500 mt-1">Our Conversational AI Coach maintains memory of this to suggest alternative exercises.</p>
              </div>
            </div>
          )}
        </div>

        {/* CONTROLS AREA BUTTONS */}
        <div className="flex justify-between items-center mt-10 pt-6 border-t border-stone-850">
          <button
            id="onboarding-back-btn"
            type="button"
            className={`flex items-center gap-1.5 text-stone-400 hover:text-white font-bold text-sm py-2 px-3 border border-stone-800 rounded-xl transition duration-200 cursor-pointer ${
              step === 1 ? 'opacity-0 pointer-events-none' : ''
            }`}
            onClick={handleBack}
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>

          {step < totalSteps ? (
            <button
              id="onboarding-next-btn"
              type="button"
              className="flex items-center gap-1 bg-white hover:bg-stone-200 text-stone-950 font-bold text-sm py-2 px-4 rounded-xl transition duration-200 cursor-pointer"
              onClick={handleNext}
            >
              Continue <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              id="onboarding-submit-btn"
              type="button"
              disabled={loading || profile.height === 0 || profile.weight === 0 || profile.age === 0}
              className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-900 text-stone-950 font-extrabold text-sm py-2.5 px-6 rounded-xl transition duration-200 cursor-pointer shadow-lg shadow-emerald-500/10"
              onClick={handleSubmit}
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  Build My Plan <Sparkles className="h-4 w-4 text-stone-950" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
