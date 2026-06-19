import React, { useState, useEffect } from 'react';
import { UserSession, DailyLog } from './types';
import Auth from './components/Auth';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import Nutrition from './components/Nutrition';
import WorkoutView from './components/Workout';
import Progress from './components/Progress';
import Profile from './components/Profile';
import AiCoach from './components/AiCoach';
import { 
  Activity, 
  Apple, 
  Dumbbell, 
  BarChart2, 
  User, 
  LogOut, 
  Menu, 
  X, 
  Flame, 
  Sparkles,
  HelpCircle,
  AlertCircle,
  MessageSquare
} from 'lucide-react';

export default function App() {
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Status check for server-side Gemini key configuration
  const [geminiStatus, setGeminiStatus] = useState<{ status: string; geminiConfigured: boolean } | null>(null);

  // Load saved session on init
  useEffect(() => {
    const savedEmail = localStorage.getItem('fitai_user_email');
    if (savedEmail) {
      fetch('/api/user/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: savedEmail })
      })
      .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(data => {
        if (data.success && data.user) {
          setUserSession(data.user);
          // If profile is fully configured, go to dashboard. Otherwise onboard!
          if (data.user.profile) {
            setActiveView('dashboard');
          } else {
            setActiveView('onboarding');
          }
        }
      })
      .catch(() => {
        // Fallback or clear if session error
        localStorage.removeItem('fitai_user_email');
      });
    }

    // Ping health check to see if Gemini key is ready
    fetch('/api/health')
      .then(res => res.json())
      .then(status => setGeminiStatus(status))
      .catch(() => console.log('Backend health query idle'));
  }, []);

  const handleAuthSuccess = (user: any) => {
    setUserSession(user);
    localStorage.setItem('fitai_user_email', user.email);
    if (user.profile) {
      setActiveView('dashboard');
    } else {
      setActiveView('onboarding');
    }
  };

  const handleOnboardingComplete = (updatedUser: any) => {
    setUserSession(updatedUser);
    setActiveView('dashboard');
  };

  const handleUpdateLog = async (date: string, updatedLog: DailyLog) => {
    if (!userSession) return;

    // Speculatively update client state for near-instant latency free response!
    const updatedLogs = {
      ...userSession.logs,
      [date]: updatedLog
    };

    const nextSessionState = {
      ...userSession,
      logs: updatedLogs
    };

    setUserSession(nextSessionState);

    // Sync back to backend Express DB file
    try {
      const response = await fetch('/api/user/save-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: userSession.email,
          date,
          log: updatedLog 
        })
      });

      const data = await response.json();
      if (response.ok && data.user) {
        setUserSession(data.user);
      }
    } catch (e) {
      console.error("Failed to sync log back to backend Express DB:", e);
    }
  };

  const handleGenerateDietPlan = async () => {
    if (!userSession) return;
    try {
      const response = await fetch('/api/ai/diet-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userSession.email })
      });
      const data = await response.json();
      if (response.ok && data.weeklyDietPlan) {
        // Update user session with the new plan
        const synced = await fetch('/api/user/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userSession.email })
        });
        const syncData = await synced.json();
        if (syncData.success) {
          setUserSession(syncData.user);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerateWorkoutPlan = async () => {
    if (!userSession) return;
    try {
      const response = await fetch('/api/ai/workout-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userSession.email })
      });
      const data = await response.json();
      if (response.ok && data.weeklyWorkoutPlan) {
        // Refetch active session values
        const synced = await fetch('/api/user/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userSession.email })
        });
        const syncData = await synced.json();
        if (syncData.success) {
          setUserSession(syncData.user);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('fitai_user_email');
    setUserSession(null);
    setActiveView('dashboard');
  };

  // Route authentication gates
  if (!userSession) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  if (activeView === 'onboarding' || !userSession.profile) {
    return (
      <Onboarding 
        email={userSession.email} 
        onOnboardingComplete={handleOnboardingComplete} 
      />
    );
  }

  // Define sidebar links and titles
  const navigationItems = [
    { key: 'dashboard', label: 'Overview', icon: Flame },
    { key: 'aicoach', label: 'AI Chat Coach', icon: MessageSquare },
    { key: 'nutrition', label: 'Nutrition Journal', icon: Apple },
    { key: 'workout', label: 'Workouts & Exercises', icon: Dumbbell },
    { key: 'progress', label: 'Progress Tracking', icon: BarChart2 },
    { key: 'profile', label: 'My Profile Settings', icon: User },
  ];

  return (
    <div id="app-container" className="min-h-screen bg-stone-950 text-stone-100 flex font-sans">
      
      {/* DESKTOP PERMANENT NAVIGATION BAR */}
      <aside className="w-64 bg-[#0A0A0B] border-r border-stone-800 hidden lg:flex flex-col justify-between p-6 shrink-0 relative z-20">
        <div className="space-y-8">
          
          {/* Logo brand label */}
          <div className="flex items-center gap-2.5 px-2">
            <div className="p-1.5 bg-emerald-950 border border-emerald-800/60 rounded-xl">
              <Activity className="h-5 w-5 text-emerald-400" />
            </div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center">
              Fit<span className="text-emerald-400">AI</span>
            </h2>
          </div>

          <nav className="space-y-1.5 pt-4">
            {navigationItems.map(item => {
              const Icon = item.icon;
              const isActive = activeView === item.key;
              return (
                <button
                  key={item.key}
                  id={`nav-item-${item.key}`}
                  onClick={() => setActiveView(item.key)}
                  className={`w-full py-2.5 px-4 rounded-xl text-left font-bold text-xs flex items-center gap-3 transition-all duration-300 cursor-pointer ${
                    isActive 
                      ? 'bg-emerald-500 text-stone-950 flex shadow-lg shadow-emerald-500/20 font-bold border border-emerald-300/10' 
                      : 'text-stone-400 hover:text-white hover:bg-stone-850'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom account profile widget inside sidebar */}
        <div className="pt-6 border-t border-stone-800">
          <div className="flex items-center justify-between p-2 rounded-xl bg-stone-950 border border-stone-800">
            <div className="max-w-[120px] truncate leading-tight">
              <div className="text-xs text-white font-extrabold truncate">{userSession.email}</div>
              <span className="text-[9px] text-stone-500">Live Session synced</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-850 text-stone-400 hover:text-red-400 transition cursor-pointer"
              title="Sign out of Coach"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* MOBILE SHEETS OVERLAY AND TOP MOBILE ACTION BAR */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header menu indicators on Mobile and Tablet and preview status info */}
        <header className="bg-[#0A0A0B] border-b border-stone-800 py-3.5 px-4 md:px-8 flex items-center justify-between lg:justify-end z-10">
          <div className="flex items-center gap-3 lg:hidden">
            <button
              id="mobile-drawer-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 border border-stone-800 hover:border-stone-700 bg-stone-850 rounded-xl text-stone-300"
            >
              {sidebarOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
            </button>
            <div className="flex items-center gap-1.5">
              <Activity className="h-4.5 w-4.5 text-emerald-400" />
              <span className="text-sm font-black text-white">FitAI Coach</span>
            </div>
          </div>

          {/* Configuration status indicator badge */}
          {geminiStatus && !geminiStatus.geminiConfigured && (
            <div id="api-key-banner" className="flex items-center gap-1.5 bg-yellow-950/40 border border-yellow-800/40 p-1.5 px-3 rounded-xl text-yellow-300 text-[10px] font-bold">
              <AlertCircle className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
              <span>AI offline (using presets). Configure custom Gemini API Key in platform settings.</span>
            </div>
          )}
        </header>

        {/* MOBILE SIDEBAR PANEL DRAWER */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm z-30 lg:hidden" onClick={() => setSidebarOpen(false)}>
            <div 
              className="w-64 h-full bg-[#0A0A0B] border-r border-stone-800 p-6 flex flex-col justify-between absolute left-0 top-0 transition-transform duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-6">
                <div className="flex justify-between items-center pr-1">
                  <span className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="h-4 text-emerald-400" /> Navigation Links
                  </span>
                  <button onClick={() => setSidebarOpen(false)} className="text-stone-500">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <nav className="space-y-1.5">
                  {navigationItems.map(item => {
                    const Icon = item.icon;
                    const isActive = activeView === item.key;
                    return (
                      <button
                        key={item.key}
                        onClick={() => {
                          setActiveView(item.key);
                          setSidebarOpen(false);
                        }}
                        className={`w-full py-2 px-3 rounded-lg text-left font-bold text-xs flex items-center gap-3 transition-all duration-200 ${
                          isActive 
                            ? 'bg-emerald-500 text-stone-950 flex font-bold border border-emerald-300/10' 
                            : 'text-stone-400 hover:text-white hover:bg-stone-850'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="pt-4 border-t border-stone-800 flex justify-between items-center text-xs">
                <div className="max-w-[130px] truncate">
                  <div className="text-white font-bold truncate">{userSession.email}</div>
                  <span className="text-[10px] text-stone-500">Live Session synced</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1 px-2.5 border border-red-900/40 text-red-400 font-bold text-[10px] rounded-lg bg-red-950/20"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PRIMARY MAIN LAYOUT WORKSPACE */}
        <main id="main-scroll-content" className="flex-1 overflow-y-auto px-4 py-6 md:px-8 max-w-7xl w-full mx-auto pb-16">
          {activeView === 'dashboard' && (
            <Dashboard 
              userSession={userSession} 
              onUpdateLog={handleUpdateLog}
              onChangeView={setActiveView}
              onGenerateDiet={handleGenerateDietPlan}
              onGenerateWorkout={handleGenerateWorkoutPlan}
            />
          )}

          {activeView === 'aicoach' && (
            <AiCoach 
              userSession={userSession}
              onUpdateUserSession={(updated) => setUserSession(updated)}
            />
          )}

          {activeView === 'nutrition' && (
            <Nutrition 
              userSession={userSession}
              onUpdateLog={handleUpdateLog}
              onGenerateDiet={handleGenerateDietPlan}
            />
          )}

          {activeView === 'workout' && (
            <WorkoutView 
              userSession={userSession}
              onUpdateLog={handleUpdateLog}
              onGenerateWorkout={handleGenerateWorkoutPlan}
            />
          )}

          {activeView === 'progress' && (
            <Progress 
              userSession={userSession}
              onUpdateLog={handleUpdateLog}
            />
          )}

          {activeView === 'profile' && (
            <Profile 
              userSession={userSession}
              onUpdateProfile={(updated) => setUserSession(updated)}
              onLogout={handleLogout}
            />
          )}
        </main>
      </div>

    </div>
  );
}
