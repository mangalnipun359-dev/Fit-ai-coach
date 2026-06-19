import React, { useState } from 'react';
import { UserSession, UserProfile } from '../types';
import { User, Activity, Dumbbell, ChevronRight, Apple, Heart, Flame, Save, Shield, Compass, LogOut } from 'lucide-react';

interface ProfileProps {
  userSession: UserSession;
  onUpdateProfile: (updatedUser: any) => void;
  onLogout: () => void;
}

export default function Profile({ userSession, onUpdateProfile, onLogout }: ProfileProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [profile, setProfile] = useState<UserProfile>(userSession.profile || {
    age: 26,
    gender: 'male',
    height: 175,
    weight: 72,
    activityLevel: 'moderately_active',
    goal: 'lose_weight',
    dietPreference: 'anything',
  });

  const macros = userSession.macroGoals || {
    calories: 2000,
    protein: 150,
    carbs: 220,
    fat: 65,
    bmr: 1600,
    tdee: 2200,
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userSession.email, profile })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update physical profile limits.');
      }

      onUpdateProfile(data.user);
      setSuccess('Physique profile parameters successfully saved!');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="profile-view" className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      
      {/* Left Column: Accounts Summary and Metabolic Multipliers */}
      <div className="space-y-6">
        
        {/* Profile Card Summary */}
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl relative overflow-hidden text-center">
          <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl"></div>
          
          <div className="h-20 w-20 rounded-2xl bg-emerald-950 border border-emerald-800 mx-auto flex items-center justify-center text-emerald-400 mb-4 font-black text-2xl relative z-10">
            {userSession.email[0].toUpperCase()}
          </div>

          <h3 className="text-white font-extrabold text-lg truncate relative z-10">{userSession.email}</h3>
          <p className="text-stone-500 text-xs mt-1 relative z-10">Active Session Identity ID</p>
          
          {/* Active stats display tags */}
          <div className="flex justify-center gap-1.5 mt-5">
            <span className="p-1 px-3 text-[10px] uppercase font-bold tracking-wider rounded-lg bg-stone-950 border border-stone-850 text-stone-400">
              {profile.gender}
            </span>
            <span className="p-1 px-3 text-[10px] uppercase font-bold tracking-wider rounded-lg bg-stone-950 border border-stone-850 text-stone-400">
              {profile.age} yrs
            </span>
          </div>

          <div className="pt-6 mt-6 border-t border-stone-850/80">
            <button
              id="profile-logout-btn"
              onClick={onLogout}
              className="w-full bg-red-950/20 hover:bg-red-950/40 border border-red-900/40 text-red-400 font-bold text-xs py-2 px-4 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut className="h-4 w-4" /> End Active Session
            </button>
          </div>
        </div>

        {/* Metabolic Targets panel */}
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 shadow-xl space-y-4">
          <h4 className="text-sm font-bold text-stone-300 uppercase tracking-wider pl-0.5">Calculated Metabolics</h4>
          
          <div className="space-y-2.5">
            <div className="flex justify-between items-center p-3 bg-stone-950 border border-stone-850 rounded-xl">
              <div>
                <span className="text-[10px] text-stone-500 font-semibold block uppercase">Basal Metabolic Rate (BMR)</span>
                <span className="text-stone-400 text-xs mt-0.5">Energy burned completely at rest</span>
              </div>
              <span className="font-mono font-bold text-base text-white">{macros.bmr} <span className="text-[10px] text-stone-500">kcal</span></span>
            </div>

            <div className="flex justify-between items-center p-3 bg-stone-950 border border-stone-850 rounded-xl">
              <div>
                <span className="text-[10px] text-stone-500 font-semibold block">Total Daily Energy (TDEE)</span>
                <span className="text-stone-400 text-xs mt-0.5">Target calorie burn with daily activity</span>
              </div>
              <span className="font-mono font-bold text-base text-white">{macros.tdee} <span className="text-[10px] text-stone-500">kcal</span></span>
            </div>

            <div className="flex justify-between items-center p-3 bg-stone-950 border border-stone-850/80 rounded-xl bg-gradient-to-r from-emerald-950/20 to-stone-950">
              <div>
                <span className="text-[10px] text-emerald-400 font-bold block">Personal Intake Goal</span>
                <span className="text-stone-400 text-[11px] mt-0.5">Calibrated target to achieve milestone</span>
              </div>
              <span className="font-mono font-black text-lg text-emerald-400">{macros.calories} <span className="text-[10px] text-stone-500 font-normal">kcal</span></span>
            </div>
          </div>
        </div>

      </div>

      {/* Right Area: Form Parameters Updates */}
      <div className="lg:col-span-2 bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl space-y-5">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
            <Shield className="text-emerald-400 h-5 w-5" /> Physique parameters
          </h3>
          <p className="text-stone-500 text-xs mt-0.5">Overhaul body statistics and preferences to shift base macros immediately.</p>
        </div>

        {success && (
          <div className="p-3 bg-emerald-950/50 border border-emerald-900 text-emerald-300 rounded-xl text-xs text-center font-bold">
            {success}
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-950/50 border border-red-900 text-red-300 rounded-xl text-xs text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs font-sans">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Age (Years)</label>
              <input
                id="profile-age-input"
                type="number"
                required
                className="w-full bg-stone-950 border border-stone-800 focus:border-emerald-500 rounded-xl py-2 px-3 text-white outline-none"
                value={profile.age}
                onChange={(e) => setProfile(prev => ({ ...prev, age: parseInt(e.target.value) || 0 }))}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Height (cm)</label>
              <input
                id="profile-height-input"
                type="number"
                required
                className="w-full bg-stone-950 border border-stone-800 focus:border-emerald-500 rounded-xl py-2 px-3 text-white outline-none"
                value={profile.height}
                onChange={(e) => setProfile(prev => ({ ...prev, height: parseFloat(e.target.value) || 0 }))}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Weight (kg)</label>
              <input
                id="profile-weight-input"
                type="number"
                step="0.1"
                required
                className="w-full bg-stone-950 border border-stone-800 focus:border-emerald-500 rounded-xl py-2 px-3 text-white outline-none"
                value={profile.weight}
                onChange={(e) => setProfile(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Your Primary Goal</label>
              <select
                id="profile-goal-select"
                className="w-full bg-stone-950 border border-stone-800 text-white rounded-xl py-2.5 px-3 outline-none"
                value={profile.goal}
                onChange={(e) => setProfile(prev => ({ ...prev, goal: e.target.value as any }))}
              >
                <option value="lose_weight">Lose Weight (Caloric Deficit)</option>
                <option value="maintain_weight">Maintain & Optimize Weight</option>
                <option value="gain_weight">Gain Muscle Mass (Caloric Surplus)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Dietary Target Preference</label>
              <select
                id="profile-diet-select"
                className="w-full bg-stone-950 border border-stone-800 text-white rounded-xl py-2.5 px-3 outline-none"
                value={profile.dietPreference}
                onChange={(e) => setProfile(prev => ({ ...prev, dietPreference: e.target.value as any }))}
              >
                <option value="anything">Anything goes (Unrestricted)</option>
                <option value="vegetarian">Vegetarian</option>
                <option value="vegan">Vegan / Plant-Based</option>
                <option value="keto">Keto (High Fat, Low Carb)</option>
                <option value="paleo">Paleo diet</option>
                <option value="mediterranean">Mediterranean</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1.5">Weekly Activity LevelMultiplier</label>
            <select
              id="profile-activity-select"
              className="w-full bg-stone-950 border border-stone-800 text-white rounded-xl py-2.5 px-3 outline-none"
              value={profile.activityLevel}
              onChange={(e) => setProfile(prev => ({ ...prev, activityLevel: e.target.value as any }))}
            >
              <option value="sedentary">Sedentary (No exercise, desk bound)</option>
              <option value="lightly_active">Lightly active (sports 1-3 days/week)</option>
              <option value="moderately_active">Moderately active (workout 3-5 days/week)</option>
              <option value="very_active">Very active (Hard exercise 6-7 days/week)</option>
              <option value="extra_active">Extra active (Endurance sports, physical work)</option>
            </select>
          </div>

          <div className="pt-2">
            <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Physical Injuries, Limitations or Pain (AI Memory System)</label>
            <input
              id="profile-injury-input"
              type="text"
              className="w-full bg-stone-950 border border-stone-800 focus:border-emerald-500 rounded-xl py-2.5 px-3 text-white outline-none"
              placeholder="e.g. Mild Knee Pain, back discomfort, travel restrictions, shoulder injury"
              value={profile.injuriesOrLimitations || ''}
              onChange={(e) => setProfile(prev => ({ ...prev, injuriesOrLimitations: e.target.value }))}
            />
            <p className="text-[10px] text-stone-500 mt-1">Our Conversational AI Coach and workout adjustments dynamically read this to protect you from heavy loading on pain points.</p>
          </div>

          <div className="pt-4 border-t border-stone-850/80 flex justify-end">
            <button
              id="profile-save-submit-btn"
              type="submit"
              disabled={loading}
              className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-900 text-stone-950 font-extrabold text-xs py-2.5 px-6 rounded-xl flex items-center gap-1 transition cursor-pointer"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <Save className="h-4.5 w-4.5" /> Save Physique Changes
                </>
              )}
            </button>
          </div>

        </form>
      </div>

    </div>
  );
}
