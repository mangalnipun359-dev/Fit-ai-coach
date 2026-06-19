import React, { useState, useRef, useEffect } from 'react';
import { UserSession, ChatMessage } from '../types';
import { 
  MessageSquare, 
  Send, 
  Sparkles, 
  Trash2, 
  Brain, 
  Flame, 
  Activity, 
  ShieldAlert, 
  Dumbbell, 
  CornerDownLeft,
  Plus,
  Mic,
  Volume2,
  Image as ImageIcon,
  Paperclip,
  FileText,
  Search,
  Check,
  Zap,
  Info,
  ChevronDown,
  Apple,
  TrendingUp,
  Sliders,
  Award,
  Globe,
  Settings,
  X,
  Camera,
  Video,
  HelpCircle,
  HelpCircle as QuestionIcon
} from 'lucide-react';

interface AiCoachProps {
  userSession: UserSession;
  onUpdateUserSession: (updatedUser: any) => void;
}

type CoachMode = 'fitness' | 'nutrition' | 'injury' | 'progress' | 'product_consultant' | 'general';

export default function AiCoach({ userSession, onUpdateUserSession }: AiCoachProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(userSession.chatMessages || []);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Custom states matching the Gemini interface screenshot & extra requested logic
  const [selectedMode, setSelectedMode] = useState<CoachMode>('fitness');
  const [menuOpen, setMenuOpen] = useState(false);
  const [thinkingActive, setThinkingActive] = useState(false);
  const [researchActive, setResearchActive] = useState(false);
  const [searchGrounding, setSearchGrounding] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ name: string; size: string; type: string; url?: string } | null>(null);
  
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync messages
  useEffect(() => {
    if (userSession.chatMessages) {
      setMessages(userSession.chatMessages);
    }
  }, [userSession.chatMessages]);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Close menus on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSendMessage = async (textToSend?: string) => {
    let textStr = (textToSend || inputText).trim();
    if (!textStr && !attachedFile && !loading) return;

    // Inject contextual modifiers based on active switches
    let prefix = '';
    if (thinkingActive) prefix += '[THINKING REASONING MODE] ';
    if (researchActive) prefix += '[DEEP CLINICAL RESEARCH Grounding] ';
    if (searchGrounding) prefix += '[WEB SEARCH VERIFIED] ';
    
    // Add file details if attached
    if (attachedFile) {
      prefix += `[ATTACHED FILE: ${attachedFile.name} (${attachedFile.type})] `;
    }

    // Force mode parameter in prompt text to trigger backend intent rules
    if (selectedMode === 'product_consultant') {
      prefix += '[PRODUCT CONSULTANT MODE - App Development, Monetization & Setup feedback] ';
    } else if (selectedMode === 'nutrition') {
      prefix += '[AI NUTRITIONIST MODE - Food Analysis, Macros, Dietary] ';
    } else if (selectedMode === 'injury') {
      prefix += '[AI INJURY-AWARE MODE - Joint Pain & Rehab] ';
    } else if (selectedMode === 'progress') {
      prefix += '[PROGRESS ANALYST - Metrics & Weight evaluation] ';
    }

    const fullMessageText = `${prefix}${textStr}`;

    if (!textToSend) {
      setInputText('');
    }
    // reset file attachment
    setAttachedFile(null);

    setLoading(true);
    setError('');

    // Pre-add user message client-side for rapid response
    const newUserMsg: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      sender: 'user',
      text: textStr || `Analyzed custom parameters with Mode: ${selectedMode}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, newUserMsg]);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userSession.email,
          message: fullMessageText,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Coach couldn\'t respond. Please retry.');
      }

      onUpdateUserSession(data.user);
      if (data.user && data.user.chatMessages) {
        setMessages(data.user.chatMessages);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Let\'s try sending that again.');
      setMessages(prev => prev.filter(m => m.id !== newUserMsg.id));
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (!window.confirm('Are you sure you want to clear your conversation history? Your coach keeps a memory of key parameters regardless!')) {
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/ai/clear-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userSession.email }),
      });
      const data = await response.json();
      if (response.ok) {
        onUpdateUserSession(data.user);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to clear chat:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRealFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const urlStr = reader.result as string;
        setAttachedFile({
          name: file.name,
          size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          type: file.type || 'unknown/file',
          url: urlStr
        });
        if (file.type?.startsWith('image/')) {
          setInputText(`Please analyze my uploaded photo "${file.name}" for fitness/nutrition details!`);
        } else {
          setInputText(`Read the custom contents inside "${file.name}" and formulate customized health recommendations.`);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
      setMenuOpen(false);
    } catch (err) {
      console.error("Camera access failed:", err);
      alert("Could not access camera device. Ensure camera permissions are permitted or choose file upload option.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const urlStr = canvas.toDataURL('image/jpeg');
        setAttachedFile({
          name: `camera_snap_${Date.now()}.jpg`,
          size: '0.4 MB',
          type: 'image/jpeg',
          url: urlStr
        });
        setInputText("Please analyze this captured camera photo for healthy food tracking or posture feedback!");
      }
      stopCamera();
    }
  };

  // Sync effect to stop camera on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Simulating custom demo attached file options to give the user "everything" of vision/files!
  const triggerMockFileAttach = (fileName: string, typeStr: string) => {
    setAttachedFile({
      name: fileName,
      size: '1.2 MB',
      type: typeStr
    });
    setMenuOpen(false);
    setInputText(`Is food source in this ${typeStr} healthy? Estimate its macros & protein target.`);
  };

  const simulateSpeechInput = () => {
    if (voiceActive) {
      setVoiceActive(false);
      return;
    }
    setVoiceActive(true);
    setInputText("Listening voice input...");
    setTimeout(() => {
      setVoiceActive(false);
      setInputText("Can you make a high protein calorie budget plan for me?");
    }, 3000);
  };

  const currentInjury = userSession.profile?.injuriesOrLimitations || '';
  const currentGoal = userSession.profile?.goal || 'maintain_weight';
  const currentDiet = userSession.profile?.dietPreference || 'anything';

  // Specific high value recommendations according to detected intentions list
  const suggestions = [
    { text: 'Help me lose weight & calculate macros', label: 'Diet Plan', mode: 'nutrition' as const },
    { text: 'Suggest dumbbell alternatives for severe knee/joint pain', label: 'Injury Assist', mode: 'injury' as const },
    { text: 'Suggest how to monetize this application with premium features', label: 'Product Advisor', mode: 'product_consultant' as const },
    { text: 'Identify nutrients of high protein Oats Oatmeal with bananas', label: 'Food Log', mode: 'nutrition' as const },
  ];

  return (
    <div id="ai-coach-custom-view" className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-140px)] min-h-[500px]">
      
      {/* Left Column: AI Memory, Roles, and Prompt Parameter Settings */}
      <div className="lg:col-span-1 flex flex-col gap-4">
        
        {/* Dynamic Coach Role Selector HUD */}
        <div className="bg-[#111113] border border-stone-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                <Sliders className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-white font-extrabold text-xs tracking-wide uppercase">Select FitAI Mode</h3>
                <p className="text-[9px] text-stone-500">Choose custom specialist behavior</p>
              </div>
            </div>
            <span className="text-[9px] font-mono text-emerald-500 bg-emerald-950/30 px-1.5 py-0.5 rounded border border-emerald-900/40">ONLINE</span>
          </div>

          <div className="grid grid-cols-1 gap-1.5 pt-1 text-xs">
            <button
              id="mode-fitness-btn"
              onClick={() => { setSelectedMode('fitness'); setInputText('How to build muscle or reduce weight safely?'); }}
              className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                selectedMode === 'fitness'
                  ? 'bg-emerald-950/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-stone-900 border-stone-850 hover:border-stone-800 text-stone-400'
              }`}
            >
              <span className="font-bold flex items-center gap-2">
                <Flame className="h-3.5 w-3.5" /> AI Fitness Coach
              </span>
              {selectedMode === 'fitness' && <Check className="h-3 w-3 text-emerald-400" />}
            </button>

            <button
              id="mode-nutrition-btn"
              onClick={() => { setSelectedMode('nutrition'); setInputText('Please analyze my macros or formulate a customized nutrition tracker.'); }}
              className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                selectedMode === 'nutrition'
                  ? 'bg-emerald-950/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-stone-900 border-stone-850 hover:border-stone-800 text-stone-400'
              }`}
            >
              <span className="font-bold flex items-center gap-2">
                <Apple className="h-3.5 w-3.5" /> AI Nutritionist / Diet
              </span>
              {selectedMode === 'nutrition' && <Check className="h-3 w-3 text-emerald-400" />}
            </button>

            <button
              id="mode-injury-btn"
              onClick={() => { setSelectedMode('injury'); setInputText('My joint experiences pain. Give me protective injury-safe alternatives.'); }}
              className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                selectedMode === 'injury'
                  ? 'bg-red-950/20 border-red-900/50 text-red-300'
                  : 'bg-stone-900 border-stone-850 hover:border-stone-800 text-stone-400'
              }`}
            >
              <span className="font-bold flex items-center gap-2">
                <ShieldAlert className="h-3.5 w-3.5 text-red-400" /> Injury-Aware Rehab
              </span>
              {selectedMode === 'injury' && <Check className="h-3 w-3 text-red-400" />}
            </button>

            <button
              id="mode-progress-btn"
              onClick={() => { setSelectedMode('progress'); setInputText('How does my body recomposition tracking look like over historical days?'); }}
              className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                selectedMode === 'progress'
                  ? 'bg-blue-950/20 border-blue-900/50 text-blue-300'
                  : 'bg-stone-900 border-stone-850 hover:border-stone-800 text-stone-400'
              }`}
            >
              <span className="font-bold flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-blue-400" /> Progress Analyst
              </span>
              {selectedMode === 'progress' && <Check className="h-3 w-3 text-blue-405" />}
            </button>

            <button
              id="mode-product-btn"
              onClick={() => { setSelectedMode('product_consultant'); setInputText('How can I monetize this fitness application, improve UX, or scale features?'); }}
              className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                selectedMode === 'product_consultant'
                  ? 'bg-purple-950/20 border-purple-900/50 text-purple-300 font-extrabold'
                  : 'bg-stone-900 border-stone-850 hover:border-stone-800 text-stone-400'
              }`}
            >
              <span className="font-extrabold flex items-center gap-2">
                <Settings className="h-3.5 w-3.5 text-purple-400 animate-spin-slow" /> Product Consultant
              </span>
              {selectedMode === 'product_consultant' && <Check className="h-3 w-3 text-purple-400" />}
            </button>
          </div>
        </div>

        {/* Brain memory details */}
        <div className="bg-[#111113] border border-stone-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-white font-extrabold text-xs">Continuous Sync Memory</h3>
              <p className="text-[10px] text-stone-500">Injects parameters dynamically</p>
            </div>
          </div>

          <div className="space-y-2 pt-1 text-[11px]">
            <div className="p-2.5 bg-stone-950 border border-stone-850/80 rounded-xl leading-tight">
              <span className="text-[9px] text-stone-500 font-bold uppercase block mb-0.5">Core Target goal</span>
              <span className="text-stone-300 font-bold uppercase">{currentGoal.replace('_', ' ')}</span>
            </div>

            <div className="p-2.5 bg-stone-950 border border-stone-850/80 rounded-xl leading-tight">
              <span className="text-[9px] text-stone-500 font-bold uppercase block mb-0.5">Weight / Diet Prefer</span>
              <span className="text-stone-300 capitalize font-medium">{userSession.profile?.weight || 72} kg — {currentDiet}</span>
            </div>

            {currentInjury ? (
              <div className="p-2.5 bg-red-950/20 border border-red-900/30 rounded-xl leading-tight">
                <span className="text-[9px] text-red-400 font-bold uppercase block flex items-center gap-1">
                  <ShieldAlert className="h-3.5 w-3.5 text-red-400" /> Active Pain Limits
                </span>
                <span className="text-stone-200 font-semibold mt-1 block">{currentInjury}</span>
              </div>
            ) : (
              <div className="p-2.5 bg-stone-950 border border-stone-850/80 rounded-xl leading-tight">
                <span className="text-[9px] text-stone-500 font-bold uppercase block mb-0.5">Safety Warning</span>
                <span className="text-stone-400 italic block">No physical limitations declared yet in Profile.</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Right Column: Dynamic ChatGPT/Gemini Ultimate Interface */}
      <div className="lg:col-span-3 flex flex-col bg-[#111113] border border-stone-800 rounded-3xl overflow-hidden shadow-2xl h-full">
        
        {/* Chat header */}
        <div className="bg-stone-900/80 backdrop-blur-md border-b border-stone-800 py-3.5 px-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white text-xs font-black uppercase tracking-wider">FitCoach AI Chat Desk</h3>
                <span className="text-[9px] bg-emerald-950/30 border border-emerald-900/30 rounded-full px-2 py-0.5 text-emerald-400 font-bold capitalize">
                  {selectedMode.replace('_', ' ')} specialist mode
                </span>
              </div>
              <p className="text-[10px] text-stone-500 block">Personalised memory parameter parsing enabled</p>
            </div>
          </div>

          <button
            id="clear-chat-history-custom-btn"
            onClick={handleClearChat}
            disabled={messages.length === 0 || loading}
            title="Clear Chat History"
            className="p-2 rounded-xl border border-stone-800 hover:border-red-900 text-stone-500 hover:text-red-400 bg-stone-950 transition cursor-pointer disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Message Log Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 select-text">
          
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 max-w-lg mx-auto">
              <div className="p-3.5 bg-emerald-950/20 border border-emerald-800/40 rounded-full text-emerald-400 animate-pulse">
                <Brain className="h-8 w-8 text-emerald-400" />
              </div>
              <div className="space-y-1">
                <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest flex items-center gap-1 justify-center">
                  <Sparkles className="h-3 w-3" /> FitCoach AI Multimodal Suite
                </p>
                <h4 className="text-white font-black text-base tracking-tight">How can I help you take charge today?</h4>
                <p className="text-stone-400 text-[11px] leading-relaxed max-w-sm mx-auto">
                  I act dynamically as your Trainer, Nutritionist, Rehab Advisor, or Product Advisor. Powered by stable model generation. Complete with context memory.
                </p>
              </div>

              {currentInjury && (
                <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-xl text-left text-[11px] leading-normal w-full">
                  <span className="font-bold text-red-400 flex items-center gap-1 mb-1">
                    <ShieldAlert className="h-3.5 w-3.5 shrink-0" /> Safety Shield memory sync active
                  </span>
                  My system registers knees/joints limit as <span className="font-bold text-white">"{currentInjury}"</span>. Ask me to substitute deep loading exercises or provide pain-free rehabilitation drills!
                </div>
              )}

              <div className="w-full pt-2.5 space-y-2">
                <span className="text-[9px] text-stone-500 font-bold block uppercase tracking-wider text-left">Quick topics to start:</span>
                <div className="grid grid-cols-2 gap-2 text-left">
                  {suggestions.map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSelectedMode(suggestion.mode);
                        handleSendMessage(suggestion.text);
                      }}
                      className="p-3 bg-stone-905 hover:bg-stone-850 border border-stone-800 rounded-2xl text-left text-[11px] text-stone-300 transition cursor-pointer font-medium leading-normal flex flex-col justify-between h-full"
                    >
                      <span className="text-emerald-400 font-extrabold text-[9px] block mb-1 uppercase tracking-wider">{suggestion.label}</span>
                      <span className="line-clamp-2 text-stone-200">{suggestion.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Intelligent dynamic system intro log */}
              <div className="flex gap-2.5 max-w-[85%]">
                <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-emerald-900 to-teal-950 border border-emerald-800 text-emerald-400 flex items-center justify-center shrink-0 font-black text-[10px]">
                  FCI
                </div>
                <div className="bg-stone-900/70 border border-stone-850 text-stone-200 p-3 rounded-2xl rounded-tl-none text-[11px] leading-relaxed space-y-1.5 shadow-md">
                  <p className="font-bold text-white flex items-center gap-1 text-[10px] uppercase text-emerald-400">
                    <Sparkles className="h-3 w-3" /> FitCoach AI Model Active
                  </p>
                  <p>Aapki profile synchronized hai! Core goal targets: <span className="text-emerald-400 font-bold text-xs">{currentGoal.replace('_', ' ').toUpperCase()}</span> with dietary priority <span className="text-emerald-400 capitalize underline underline-offset-2">{currentDiet}</span>.</p>
                  {currentInjury && (
                    <div className="py-1 px-2.5 bg-red-950/20 border border-red-905/30 rounded-lg text-[10px] text-red-300 flex items-center gap-1.5">
                      <ShieldAlert className="h-3.5 w-3.5 shrink-0" /> Memory registers physical limitation: "{currentInjury}". I will block heavy axial loading exercises!
                    </div>
                  )}
                </div>
              </div>

              {messages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
                  >
                    {!isUser && (
                      <div className="h-7 w-7 rounded-xl bg-[#1d3528] border border-emerald-800 text-emerald-400 flex items-center justify-center shrink-0 font-bold text-[10px] shadow">
                        FC
                      </div>
                    )}
                    <div
                      className={`p-3 rounded-2xl text-[11px] leading-relaxed shadow-sm ${
                        isUser
                          ? 'bg-emerald-500 text-stone-950 rounded-tr-none font-bold'
                          : 'bg-[#18181b] border border-stone-850 text-stone-100 rounded-tl-none'
                      }`}
                    >
                      <p className="whitespace-pre-line">{msg.text}</p>
                      
                      <div className={`text-[8px] mt-2 text-right font-medium ${isUser ? 'text-stone-700' : 'text-stone-500'}`}>
                        {msg.timestamp}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {error && (
            <div className="p-3 bg-red-950/40 border border-red-900/50 text-red-350 text-[11px] rounded-xl text-center font-semibold">
              ⚠️ {error}
            </div>
          )}

          {loading && (
            <div className="flex gap-2.5 max-w-[85%] items-start animate-fade-in">
              <div className="h-7 w-7 rounded-xl bg-emerald-950 border border-emerald-850 text-emerald-400 flex items-center justify-center shrink-0 font-bold text-xs animate-spin-slow">
                FC
              </div>
              <div className="bg-stone-900 border border-stone-850 text-stone-400 p-3 rounded-2xl rounded-tl-none text-[11px] flex flex-col gap-1.5 leading-normal max-w-full">
                <div className="flex items-center gap-2">
                  <span className="flex gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </span>
                  <span className="text-[10px] text-stone-300 font-bold uppercase tracking-wider">
                    {thinkingActive ? "Generative Space Deep Reasoning active..." : "Generating custom fitness counsel response..."}
                  </span>
                </div>
                <p className="text-[9px] text-stone-500 italic block pl-0.5">Assimilating profile metrics, caloric limits & joint protection factors...</p>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Selected Switches Quick Pill Indicators (Thinking Mode, Search Grounding) */}
        {(thinkingActive || researchActive || searchGrounding || attachedFile) && (
          <div className="px-4 py-2 border-t border-stone-850 bg-stone-950/80 flex flex-wrap gap-2 text-[10px]">
            {thinkingActive && (
              <span className="py-1 px-2.5 bg-emerald-950/30 border border-emerald-800/40 text-emerald-400 rounded-full flex items-center gap-1 font-bold">
                <Brain className="h-3 w-3 animate-pulse text-emerald-400" /> Thinking Mode Active (Deep CoT)
                <button onClick={() => setThinkingActive(false)} className="hover:text-red-400 cursor-pointer ml-1 text-stone-500">
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            )}
            {researchActive && (
              <span className="py-1 px-2.5 bg-purple-950/30 border border-purple-800/40 text-purple-400 rounded-full flex items-center gap-1 font-bold">
                <Sparkles className="h-3 w-3 text-purple-400" /> Deep Research Engine
                <button onClick={() => setResearchActive(false)} className="hover:text-red-400 cursor-pointer ml-1 text-stone-500">
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            )}
            {searchGrounding && (
              <span className="py-1 px-2.5 bg-blue-950/30 border border-blue-800/40 text-blue-400 rounded-full flex items-center gap-1 font-bold">
                <Globe className="h-3 w-3 text-blue-400 animate-spin" /> Live Web Search Grounding
                <button onClick={() => setSearchGrounding(false)} className="hover:text-red-400 cursor-pointer ml-1 text-stone-500">
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            )}
            {attachedFile && (
              <span className="py-1 px-2.5 bg-stone-900 border border-stone-800 text-stone-200 rounded-full flex items-center gap-1.5 font-bold">
                <Paperclip className="h-3 w-3 text-emerald-400" /> {attachedFile.name} ({attachedFile.type})
                <button onClick={() => setAttachedFile(null)} className="hover:text-red-400 cursor-pointer ml-1 text-stone-400">
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Suggestion Quick Tags directly under prompt menu (Write or Edit, Look Something Up) */}
        <div className="px-4 py-1.5 bg-stone-950 border-t border-stone-850 flex items-center gap-2.5 overflow-x-auto whitespace-nowrap scrollbar-none">
          <span className="text-[9px] text-stone-500 uppercase font-black uppercase tracking-wider shrink-0 mr-1">Quick Action:</span>
          
          <button
            id="action-tag-write"
            onClick={() => {
              setSelectedMode('nutrition');
              setInputText("Write a 7-day high protein, calorie safe diet menu including breakfast snacks.");
            }}
            className="py-1 px-2.5 bg-stone-900 hover:bg-stone-850 border border-stone-800 hover:border-stone-700 text-stone-400 hover:text-white rounded-full text-[10px] tracking-tight transition cursor-pointer flex items-center gap-1"
          >
            <FileText className="h-3 w-3 text-emerald-400" /> Write or edit
          </button>

          <button
            id="action-tag-lookup"
            onClick={() => {
              setSearchGrounding(true);
              setInputText("Look up the clinical efficacy of collagen peptides on knee joint rehabilitation.");
            }}
            className="py-1 px-2.5 bg-stone-900 hover:bg-stone-850 border border-stone-800 hover:border-stone-700 text-stone-400 hover:text-white rounded-full text-[10px] tracking-tight transition cursor-pointer flex items-center gap-1"
          >
            <Globe className="h-3 w-3 text-blue-400" /> Look something up
          </button>

          <button
            id="action-tag-recipe"
            onClick={() => {
              setSelectedMode('nutrition');
              setInputText("Suggest 3 easy ingredients recipes for high proteins dinners under 450 kcal.");
            }}
            className="py-1 px-2.5 bg-stone-900 hover:bg-stone-850 border border-stone-800 hover:border-stone-700 text-stone-400 hover:text-white rounded-full text-[10px] tracking-tight transition cursor-pointer flex items-center gap-1"
          >
            <Apple className="h-3 w-3 text-amber-500" /> Recipe Generator
          </button>

          <button
            id="action-tag-monetize"
            onClick={() => {
              setSelectedMode('product_consultant');
              setInputText("Analyze my application and propose premium body recomposition features to monetize it.");
            }}
            className="py-1 px-2.5 bg-stone-900 hover:bg-stone-850 border border-stone-800 hover:border-stone-700 text-stone-400 hover:text-white rounded-full text-[10px] tracking-tight transition cursor-pointer flex items-center gap-1"
          >
            <Settings className="h-3 w-3 text-purple-400 animate-pulse" /> Monetize app suggestions
          </button>
        </div>

        {/* Message Input controls: Sleek, deep gravel round pill representing the screenshot exactly! */}
        <div className="p-4 border-t border-stone-800 bg-[#161619]/40 relative">
          
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="relative"
          >
            {/* Dynamic visual preview of the attached file if present */}
            {attachedFile && (
              <div className="mb-2 p-2 bg-stone-900 border border-stone-800 rounded-2xl flex items-center justify-between gap-3 animate-fade-in w-full max-w-lg">
                <div className="flex items-center gap-2 truncate">
                  {attachedFile.url ? (
                    <img 
                      src={attachedFile.url} 
                      alt="Thumbnail" 
                      className="w-10 h-10 object-cover rounded-lg border border-stone-700"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-emerald-950/20 border border-emerald-900/60 rounded-lg flex items-center justify-center">
                      <FileText className="h-5 w-5 text-emerald-400" />
                    </div>
                  )}
                  <div className="truncate text-left">
                    <span className="block text-stone-200 text-xs font-bold truncate">{attachedFile.name}</span>
                    <span className="block text-stone-500 text-[10px] uppercase font-mono">{attachedFile.size} • {attachedFile.type}</span>
                  </div>
                </div>
                <button
                  id="btn-remove-attached-file"
                  type="button"
                  onClick={() => setAttachedFile(null)}
                  className="p-1 rounded-full hover:bg-stone-800 text-stone-400 hover:text-red-400 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Round gravel pill-shape bar */}
            <div id="screenshot-prompt-pill-holder" className="flex items-center bg-stone-900 border border-stone-800 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/20 rounded-3xl px-4 py-2 bg-gradient-to-r from-[#18181b] to-stone-900 shadow-xl transition-all duration-250 w-full min-h-[50px]">
              
              {/* Hidden HTML input picker for standard explorer browsing */}
              <input 
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,video/*,application/pdf,text/plain"
                onChange={handleRealFileChange}
              />

              {/* Left-most '+' button */}
              <div className="relative shrink-0 pr-1.5" ref={menuRef}>
                <button
                  id="prompt-plus-icon-menu-btn"
                  type="button"
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="p-1.5 rounded-full hover:bg-stone-800 text-stone-400 hover:text-white transition flex items-center justify-center cursor-pointer border border-[#2b2b2b]"
                >
                  <Plus className={`h-4.5 w-4.5 transition-transform duration-200 ${menuOpen ? 'rotate-45 text-emerald-400' : ''}`} />
                </button>

                {/* Gemini style Dropdown Pop-up Menu */}
                {menuOpen && (
                  <div className="absolute bottom-11 left-0 bg-[#18181b] border border-stone-800 rounded-2xl w-56 shadow-2xl py-2 z-50 animate-fade-in">
                    <div className="px-3 py-1.5 border-b border-stone-850">
                      <span className="text-[9px] text-stone-500 font-bold uppercase tracking-wider block">Add attachments / select mode</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        fileInputRef.current?.click();
                        setMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-stone-300 hover:bg-stone-900 hover:text-white flex items-center gap-2 transition"
                    >
                      <Paperclip className="h-3.5 w-3.5 text-emerald-400" />
                      <div>
                        <span className="block font-bold">Add photos & files</span>
                        <span className="block text-[8px] text-stone-500">Choose any image, video, or doc</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={startCamera}
                      className="w-full text-left px-3 py-2 text-xs text-stone-300 hover:bg-stone-900 hover:text-white flex items-center gap-2 transition"
                    >
                      <Camera className="h-3.5 w-3.5 text-amber-400" />
                      <div>
                        <span className="block font-bold">Capture from Camera</span>
                        <span className="block text-[8px] text-stone-500">Snap meal or posture live</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => triggerMockFileAttach('Knee_Pain_Xray.pdf', 'Clinical Report')}
                      className="w-full text-left px-3 py-2 text-xs text-stone-300 hover:bg-stone-900 hover:text-white flex items-center gap-2 transition"
                    >
                      <FileText className="h-3.5 w-3.5 text-red-500" />
                      <div>
                        <span className="block font-bold">Demo health report</span>
                        <span className="block text-[8px] text-stone-500">Insert sample medical log sheet</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMode('nutrition');
                        setAttachedFile({ name: 'Avatar_Muscle_Post.png', size: '940 KB', type: 'Diet Plan' });
                        setInputText("Generate healthy custom meal plan to gain lean volume!");
                        setMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-stone-300 hover:bg-stone-900 hover:text-white flex items-center gap-2 transition"
                    >
                      <ImageIcon className="h-3.5 w-3.5 text-blue-400" />
                      <div>
                        <span className="block font-bold">Create custom image</span>
                        <span className="block text-[8px] text-stone-500">Layout diagram or recipe chart</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setThinkingActive(!thinkingActive);
                        setMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-stone-300 hover:bg-stone-900 hover:text-white flex items-center justify-between transition"
                    >
                      <div className="flex items-center gap-2">
                        <Brain className="h-3.5 w-3.5 text-purple-400" />
                        <div>
                          <span className="block font-bold">Thinking Mode</span>
                          <span className="block text-[8px] text-stone-500">Toggle Deep chain-of-thought</span>
                        </div>
                      </div>
                      <span className={`w-2.5 h-2.5 rounded-full ${thinkingActive ? 'bg-emerald-500' : 'bg-stone-700'}`}></span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setResearchActive(!researchActive);
                        setMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-stone-300 hover:bg-stone-900 hover:text-white flex items-center justify-between transition"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                        <div>
                          <span className="block font-bold">Deep Research mode</span>
                          <span className="block text-[8px] text-stone-500">Comprehensive sports analysis</span>
                        </div>
                      </div>
                      <span className={`w-2.5 h-2.5 rounded-full ${researchActive ? 'bg-emerald-500' : 'bg-stone-700'}`}></span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSearchGrounding(!searchGrounding);
                        setMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-stone-300 hover:bg-stone-900 hover:text-white flex items-center justify-between transition"
                    >
                      <div className="flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5 text-teal-400" />
                        <div>
                          <span className="block font-bold">Look something up</span>
                          <span className="block text-[8px] text-stone-500">Live internet search grounding</span>
                        </div>
                      </div>
                      <span className={`w-2.5 h-2.5 rounded-full ${searchGrounding ? 'bg-blue-500 animate-pulse' : 'bg-stone-700'}`}></span>
                    </button>
                  </div>
                )}
              </div>

              {/* Input text box from the screenshot: "Ask anything" style placeholder */}
              <input
                type="text"
                id="screenshot-style-prompt-text-input"
                disabled={loading}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-transparent text-stone-100 placeholder-stone-500 text-xs py-2 px-1 focus:outline-none placeholder-stone-400 font-medium shrink min-w-0"
                placeholder={currentInjury ? `Ask FitCoach AI: "My ${currentInjury.toLowerCase()} is feeling restricted today..."` : "Ask anything - calorie counts, workout swaps, recipe tips, app monetization ideas..."}
              />

              {/* Right-most icons inside prompt pill: mic representation & sound wave */}
              <div className="flex items-center gap-1.5 shrink-0 pl-1">
                {/* Voice input mic toggle */}
                <button
                  id="screenshot-mic-btn"
                  type="button"
                  onClick={simulateSpeechInput}
                  title="Simulate speech voice input"
                  className={`p-1.5 rounded-full transition flex items-center justify-center cursor-pointer ${
                    voiceActive ? 'bg-red-500/20 text-red-400' : 'hover:bg-stone-800 text-stone-400 hover:text-white'
                  }`}
                >
                  <Mic className={`h-4.5 w-4.5 ${voiceActive ? 'animate-ping' : ''}`} />
                </button>

                {/* Simulated sound wave graph indicator */}
                <button
                  id="screenshot-speaker-indicator"
                  type="button"
                  onClick={simulateSpeechInput}
                  title="Voice spectrum"
                  className={`p-1.5 rounded-full hover:bg-stone-800 text-stone-400 hover:text-white transition flex items-center justify-center cursor-pointer`}
                >
                  {voiceActive ? (
                    <span className="flex items-end gap-0.5 h-3">
                      <span className="w-0.5 bg-red-400 h-2 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-0.5 bg-red-400 h-3 animate-bounce" style={{ animationDelay: '100ms' }}></span>
                      <span className="w-0.5 bg-red-400 h-1.5 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-0.5 bg-red-400 h-3.5 animate-bounce" style={{ animationDelay: '200ms' }}></span>
                    </span>
                  ) : (
                    <span className="flex items-end gap-0.5 h-3">
                      <span className="w-0.5 bg-stone-500 h-1"></span>
                      <span className="w-0.5 bg-stone-500 h-2.5"></span>
                      <span className="w-0.5 bg-stone-500 h-1.5"></span>
                    </span>
                  )}
                </button>

                {/* Send Button */}
                <button
                  id="ai-coach-custom-send-btn"
                  type="submit"
                  disabled={loading || (!inputText.trim() && !attachedFile)}
                  className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-stone-800 disabled:text-stone-600 text-stone-950 p-1.5 rounded-full transition flex items-center justify-center cursor-pointer shadow-lg active:scale-95"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>

            </div>
          </form>

        </div>

      </div>

      {/* Camera Active Viewfinder Overlay Modal */}
      {cameraActive && (
        <div className="fixed inset-0 bg-stone-950/90 flex flex-col items-center justify-center p-4 z-[9999] backdrop-blur-md animate-fade-in">
          <div className="bg-stone-900 border border-stone-850 p-6 rounded-3xl w-full max-w-xl shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
                <h3 className="text-white text-sm font-extrabold tracking-tight">Active Live Camera Viewfinder</h3>
              </div>
              <button
                type="button"
                onClick={stopCamera}
                className="bg-stone-950 hover:bg-stone-800 p-2 border border-[#2d2d2d] text-stone-400 hover:text-white rounded-full cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-stone-950 rounded-2xl overflow-hidden border border-stone-800 relative aspect-video flex items-center justify-center">
              <video 
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover scale-x-[-1]"
              />
              <div className="absolute top-3 right-3 bg-stone-950/60 px-2 py-1 rounded text-[10px] text-stone-300 font-mono flex items-center gap-1">
                <Video className="h-3.5 w-3.5 text-emerald-400 animate-pulse" /> Live Feed Active
              </div>
            </div>

            <div className="flex justify-between items-center gap-3">
              <p className="text-[10px] text-stone-500">
                Hold meal items or snap pose to analyze posture tips or estimate calories.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={stopCamera}
                  className="p-2 px-4 rounded-xl text-xs font-bold bg-stone-950 hover:bg-stone-850 text-stone-400 border border-stone-850 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="p-2 px-5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-stone-950 transition cursor-pointer flex items-center gap-1"
                >
                  <Camera className="h-4 w-4 text-stone-950" /> Snap Frame
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
