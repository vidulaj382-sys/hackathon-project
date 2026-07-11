import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Profile {
  id: number;
  name: string;
  level: string;
  mmr: number;
}

interface HistoryItem {
  expression: string;
  is_correct: boolean;
  latency_ms: number;
}

interface CurrentDrill {
  expression: string;
  answer: number | null;
  isCorrect: boolean | null;
  spokenText: string;
  latencyMs: number;
}

function LoadingScreen({ onComplete }: { onComplete: () => void }) {
  const [count, setCount] = useState(0);
  const words = ["Focus", "Calculate", "Ascend"];
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    let start = performance.now();
    const duration = 2500;

    const animate = (time: number) => {
      let progress = (time - start) / duration;
      if (progress > 1) progress = 1;
      setCount(Math.floor(progress * 100));
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setTimeout(onComplete, 400);
      }
    };
    requestAnimationFrame(animate);

    const wordInterval = setInterval(() => {
      setWordIndex(i => (i + 1) % words.length);
    }, 800);

    return () => clearInterval(wordInterval);
  }, [onComplete]);

  return (
    <motion.div 
      initial={{ y: 0 }}
      exit={{ y: "-100%" }}
      transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
      className="fixed inset-0 z-[9999] bg-surface-container-lowest flex flex-col items-center justify-center p-6"
    >
      <div className="w-full max-w-xs space-y-4">
        <div className="flex justify-between items-end">
          <AnimatePresence mode="wait">
            <motion.span 
              key={wordIndex}
              initial={{ y: 5, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -5, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="font-label-sm text-label-sm text-primary tracking-widest uppercase"
            >
              {words[wordIndex]}
            </motion.span>
          </AnimatePresence>
          <span className="font-display-lg text-display-lg-mobile text-on-surface tabular-nums">
            {String(count).padStart(3, "0")}
          </span>
        </div>
        <div className="h-1 w-full bg-surface-container-highest rounded-full overflow-hidden">
          <div 
            className="h-full accent-gradient transition-all duration-75 ease-out" 
            style={{ width: `${count}%` }}
          />
        </div>
      </div>
    </motion.div>
  );
}

function RoleCycler() {
  const roles = ["Tactical Anzan", "Mental Mastery", "Offline Edge AI"];
  const [roleIdx, setRoleIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRoleIdx(prev => (prev + 1) % roles.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-8 flex items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.p
          key={roleIdx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.5 }}
          className="font-body-lg text-body-lg text-primary/80"
        >
          {roles[roleIdx]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [drillStatus, setDrillStatus] = useState<'idle' | 'speaking' | 'listening' | 'finished' | 'error'>('idle');
  const [transcript, setTranscript] = useState('');
  const [currentDrill, setCurrentDrill] = useState<CurrentDrill | null>(null);
  const [mmrChange, setMmrChange] = useState(0);
  const [error, setError] = useState('');

  const BACKEND_URL = 'http://localhost:5000';

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/profile`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (e) {
      console.error("Error fetching profile:", e);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/history`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (e) {
      console.error("Error fetching history:", e);
    }
  };

  useEffect(() => {
    if (!isLoading) {
      fetchProfile();
      fetchHistory();

      // Establish Server-Sent Events listener
      const eventSource = new EventSource(`${BACKEND_URL}/api/stream`);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'drill_started':
              setDrillStatus('speaking');
              setTranscript('');
              setCurrentDrill({
                expression: data.data.expression,
                answer: data.data.answer,
                isCorrect: null,
                spokenText: '',
                latencyMs: 0
              });
              setMmrChange(0);
              break;

            case 'drill_status':
              if (data.data.status === 'listening') {
                setDrillStatus('listening');
              }
              break;

            case 'transcript':
              setTranscript(data.data.text);
              break;

            case 'drill_finished':
              setDrillStatus('finished');
              setCurrentDrill(prev => {
                if (!prev) return null;
                return {
                  ...prev,
                  expression: data.data.expression,
                  answer: data.data.answer,
                  isCorrect: data.data.is_correct,
                  spokenText: data.data.spoken_text,
                  latencyMs: data.data.latency_ms
                };
              });
              setMmrChange(data.data.is_correct ? 15 : -10);
              fetchProfile();
              fetchHistory();
              break;

            case 'drill_stopped':
              setDrillStatus('idle');
              break;

            case 'error':
              setError(data.data.message);
              setDrillStatus('idle');
              break;

            default:
              break;
          }
        } catch (e) {
          console.error("Error parsing SSE message:", e);
        }
      };

      return () => {
        eventSource.close();
      };
    }
  }, [isLoading]);

  const startDrill = async () => {
    setError('');
    try {
      await fetch(`${BACKEND_URL}/api/generate_drill`, { method: 'POST' });
    } catch (e) {
      setError('Could not connect to the backend server.');
    }
  };

  const stopDrill = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/stop_drill`, { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
  };

  // Sparkline SVG coordinates generator
  const generateSparkline = () => {
    const currentMmr = profile?.mmr || 1420;
    let mmr = currentMmr;
    const mmrValues = [mmr];
    
    for (const item of history) {
      if (item.is_correct) {
        mmr -= 15;
      } else {
        mmr += 10;
      }
      mmrValues.unshift(mmr);
    }

    const minMMR = Math.min(...mmrValues);
    const maxMMR = Math.max(...mmrValues);
    
    let pathD = "M0 80 Q50 70 100 85 T200 40 T300 60 T400 20";
    let fillD = "M0 80 Q50 70 100 85 T200 40 T300 60 T400 20 L400 100 L0 100 Z";
    
    if (mmrValues.length > 1) {
      const points = mmrValues.map((val, idx) => {
        const x = (idx / (mmrValues.length - 1)) * 400;
        const y = maxMMR === minMMR ? 50 : 80 - ((val - minMMR) / (maxMMR - minMMR)) * 60;
        return { x, y };
      });
      pathD = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ");
      fillD = `${pathD} L 400 100 L 0 100 Z`;
    }
    
    return { pathD, fillD };
  };

  const { pathD, fillD } = generateSparkline();

  // Streak calculator
  const calculateStreak = () => {
    let streak = 0;
    for (const item of history) {
      if (item.is_correct) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  const streakVal = calculateStreak();

  const getRankColorClass = (level: string) => {
    switch (level.toLowerCase()) {
      case 'gold': return 'text-yellow-400';
      case 'silver': return 'text-slate-300';
      case 'bronze': return 'text-amber-600';
      default: return 'text-sky-400';
    }
  };

  return (
    <>
      <AnimatePresence>
        {isLoading && <LoadingScreen onComplete={() => setIsLoading(false)} />}
      </AnimatePresence>
      
      {!isLoading && (
        <div className="bg-background text-on-background selection:bg-primary selection:text-on-primary-fixed overflow-x-hidden font-body-md text-body-md min-h-screen flex flex-col">
          
          {/* TopNavBar Component */}
          <nav className="fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-7xl rounded-full border border-outline-variant/20 bg-white/10 dark:bg-white/10 backdrop-blur-xl z-50 flex justify-between items-center px-8 py-3">
            <div className="flex items-center gap-6">
              <span className="font-display-lg text-[32px] tracking-tighter text-on-surface dark:text-on-surface">GW</span>
              <div className="hidden md:flex items-center gap-6">
                <a className="text-primary font-bold border-b border-primary pb-1 font-label-sm text-label-sm" href="#">Dashboard</a>
                <a className="text-on-surface-variant font-label-sm text-label-sm transition-colors hover:text-primary transition-all duration-300" href="#telemetry">Training</a>
                <a className="text-on-surface-variant font-label-sm text-label-sm transition-colors hover:text-primary transition-all duration-300" href="#ledger">Ledger</a>
              </div>
            </div>
            {drillStatus === 'idle' ? (
              <button 
                onClick={startDrill}
                className="bg-primary text-on-primary-fixed px-6 py-1.5 rounded-full font-label-sm text-label-sm active:scale-95 transition-transform cursor-pointer"
              >
                Initialize
              </button>
            ) : (
              <button 
                onClick={stopDrill}
                className="bg-error text-on-error px-6 py-1.5 rounded-full font-label-sm text-label-sm active:scale-95 transition-transform cursor-pointer"
              >
                Stop
              </button>
            )}
          </nav>

          {/* Hero Section / Active Drill HUD */}
          <section className="relative h-screen w-full flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 z-0">
              <div className="absolute inset-0 bg-background/60 z-10"></div>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background z-20"></div>
              <img 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBbhx7kXQ4pktOEpYuKA2CbQ9e-MG7bs57z3cW2sAdQzmCeqhkDMbB-nkvd0M2BSeMshTWfXpDZDUqqIYFTH1Hg5e2HTEcayGmwDfJYuAxzFuc5pp7PWxs0NF6ZnPkPH7BMtcz8svJ42mrusUfGsiOtXh9ZQ3NBWcudXnCFm6NBIv9emptWWqUktLcy6IWLzPcp8IqLi-M7ZAVS7TTCnH7Qe82rMk_OjfpqmO-_WYosDuIhZWD4rhGs-JJJMOpzbmBjrKk" 
                alt="Tactical Abacus Backdrop" 
                className="w-full h-full object-cover grayscale opacity-40"
              />
            </div>

            <div className="relative z-10 text-center space-y-6 max-w-4xl w-full px-4 flex flex-col items-center">
              
              {/* Dynamic HUD rendering based on drillStatus */}
              <AnimatePresence mode="wait">
                {drillStatus === 'idle' && (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col items-center space-y-6"
                  >
                    <div className="inline-block border border-outline-variant/30 px-3 py-1 rounded-full bg-surface-container/30 backdrop-blur-md">
                      <span className="font-label-sm text-label-sm text-outline tracking-widest">
                        OPERATOR: {profile?.name.toUpperCase() || 'SIDDHESH'} | VIT PUNE NODE
                      </span>
                    </div>
                    <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg italic text-on-surface leading-tight">
                      Gwen OS v1.0
                    </h1>
                    <RoleCycler />
                    <div className="flex flex-col md:flex-row items-center justify-center gap-4 pt-8">
                      <button 
                        onClick={startDrill}
                        className="accent-gradient text-on-primary px-10 py-4 rounded-xl font-label-sm text-label-sm tracking-widest uppercase hover:opacity-90 transition-all flex items-center gap-2 cursor-pointer"
                      >
                        Start Daily Drill
                        <span className="material-symbols-outlined text-[18px]">bolt</span>
                      </button>
                      <button 
                        onClick={() => {
                          document.getElementById('telemetry')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="border border-outline-variant/50 backdrop-blur-md text-on-surface px-10 py-4 rounded-xl font-label-sm text-label-sm tracking-widest uppercase hover:bg-white/5 transition-all cursor-pointer"
                      >
                        View Telemetry
                      </button>
                    </div>
                    {error && (
                      <div className="text-xs bg-error-container/40 border border-error-container/50 text-error p-3.5 rounded-xl max-w-xs text-center">
                        {error}
                      </div>
                    )}
                  </motion.div>
                )}

                {drillStatus === 'speaking' && (
                  <motion.div
                    key="speaking"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col items-center space-y-6 max-w-md"
                  >
                    <div className="inline-block border border-outline-variant/30 px-3 py-1 rounded-full bg-surface-container/30 backdrop-blur-md">
                      <span className="font-label-sm text-label-sm text-primary tracking-widest animate-pulse">
                        GENERATING MATH WAVE
                      </span>
                    </div>
                    
                    <div className="relative flex items-center justify-center my-6">
                      <div className="absolute w-28 h-28 rounded-full bg-primary/10 border border-primary/20 animate-ping" />
                      <div className="w-20 h-20 rounded-full border border-primary/40 bg-primary/20 flex items-center justify-center text-primary relative z-10">
                        <span className="material-symbols-outlined text-[36px] animate-bounce">volume_up</span>
                      </div>
                    </div>

                    <h2 className="font-display-lg text-display-lg-mobile md:text-5xl italic text-on-surface leading-tight">
                      Listen Closely
                    </h2>
                    <p className="text-sm text-outline tracking-wider italic">"Audio synthesis streaming..."</p>
                    
                    <button 
                      onClick={stopDrill}
                      className="border border-outline-variant/50 backdrop-blur-md text-on-surface px-8 py-3 rounded-xl font-label-sm text-label-sm tracking-widest uppercase hover:bg-white/5 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </motion.div>
                )}

                {drillStatus === 'listening' && (
                  <motion.div
                    key="listening"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col items-center space-y-6 max-w-md w-full"
                  >
                    <div className="inline-block border border-outline-variant/30 px-3 py-1 rounded-full bg-surface-container/30 backdrop-blur-md">
                      <span className="font-label-sm text-label-sm text-error tracking-widest uppercase flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-error animate-ping" />
                        Listening Active
                      </span>
                    </div>

                    <div className="relative flex items-center justify-center my-6">
                      <div className="absolute w-36 h-36 rounded-full bg-error-container/10 border border-error-container/30 animate-pulse" />
                      <div className="absolute w-28 h-28 rounded-full bg-error-container/20 border border-error-container/40 animate-ping" />
                      <div className="w-20 h-20 rounded-full border border-error-container bg-error-container flex items-center justify-center text-on-error relative z-10 shadow-lg shadow-error/20">
                        <span className="material-symbols-outlined text-[36px]">mic</span>
                      </div>
                    </div>

                    {/* Simple live equalizer bars */}
                    <div className="flex items-center gap-1 h-8 justify-center">
                      {[1, 2, 3, 4, 5, 4, 3, 2, 1].map((h, i) => (
                        <motion.span 
                          key={i}
                          animate={{ height: ['20%', `${Math.random() * 80 + 20}%`, '20%'] }}
                          transition={{ repeat: Infinity, duration: 0.6 + (i * 0.05), ease: 'easeInOut' }}
                          className="w-[3px] bg-error rounded-full"
                        />
                      ))}
                    </div>

                    <h2 className="font-display-lg text-display-lg-mobile md:text-5xl italic text-on-surface leading-tight">
                      Speak Your Answer
                    </h2>
                    
                    <div className="w-full py-3.5 px-6 rounded-2xl bg-surface-container/50 border border-outline-variant/20 min-h-[60px] flex items-center justify-center max-w-sm">
                      <p className="text-md text-primary font-medium font-mono tracking-wide">
                        {transcript ? `"${transcript}"` : "Waiting for audio..."}
                      </p>
                    </div>

                    <button 
                      onClick={stopDrill}
                      className="border border-outline-variant/50 backdrop-blur-md text-on-surface px-8 py-3 rounded-xl font-label-sm text-label-sm tracking-widest uppercase hover:bg-white/5 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      Stop Trainer
                    </button>
                  </motion.div>
                )}

                {drillStatus === 'finished' && currentDrill && (
                  <motion.div
                    key="finished"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col items-center space-y-6 max-w-xl w-full"
                  >
                    <div className="inline-block border border-outline-variant/30 px-3 py-1 rounded-full bg-surface-container/30 backdrop-blur-md">
                      <span className={`font-label-sm text-label-sm tracking-widest uppercase flex items-center gap-1.5 ${
                        currentDrill.isCorrect ? 'text-primary' : 'text-error'
                      }`}>
                        <span className={`material-symbols-outlined text-[16px]`}>
                          {currentDrill.isCorrect ? 'check_circle' : 'cancel'}
                        </span>
                        Drill Graded: {currentDrill.isCorrect ? 'Successful' : 'Failed'}
                      </span>
                    </div>

                    <h2 className="font-display-lg text-6xl md:text-7xl italic text-on-surface font-semibold tracking-wider">
                      {currentDrill.expression} = {currentDrill.answer}
                    </h2>

                    {/* Metrics glass card */}
                    <div className="grid grid-cols-3 gap-6 w-full max-w-md glass-card p-6 rounded-2xl border border-outline-variant/20 shadow-xl">
                      <div className="flex flex-col items-center text-center">
                        <span className="text-[10px] text-outline uppercase tracking-wider mb-1">MMR Rating</span>
                        <span className={`text-xl font-bold font-mono ${currentDrill.isCorrect ? 'text-primary' : 'text-error'}`}>
                          {currentDrill.isCorrect ? `+15 MMR` : `-10 MMR`}
                        </span>
                      </div>
                      <div className="flex flex-col items-center text-center border-x border-outline-variant/10">
                        <span className="text-[10px] text-outline uppercase tracking-wider mb-1">Latency</span>
                        <span className="text-xl font-semibold font-mono text-on-surface">
                          {(currentDrill.latencyMs / 1000).toFixed(2)}s
                        </span>
                      </div>
                      <div className="flex flex-col items-center text-center">
                        <span className="text-[10px] text-outline uppercase tracking-wider mb-1">Response</span>
                        <span className="text-md font-mono text-outline italic truncate max-w-full px-2" title={currentDrill.spokenText}>
                          "{currentDrill.spokenText || 'Silent'}"
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button 
                        onClick={startDrill}
                        className="accent-gradient text-on-primary px-8 py-4 rounded-xl font-label-sm text-label-sm tracking-widest uppercase hover:opacity-90 transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-primary/15"
                      >
                        Next Drill
                        <span className="material-symbols-outlined text-[18px]">bolt</span>
                      </button>
                      <button 
                        onClick={() => setDrillStatus('idle')}
                        className="border border-outline-variant/50 backdrop-blur-md text-on-surface px-8 py-4 rounded-xl font-label-sm text-label-sm tracking-widest uppercase hover:bg-white/5 transition-all cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* Section 3: Tactical Telemetry Bento Grid */}
          <section id="telemetry" className="py-24 px-4 md:px-8 max-w-7xl mx-auto w-full">
            <div className="mb-12">
              <h2 className="font-headline-md text-headline-md text-on-surface">Tactical Telemetry</h2>
              <p className="text-on-surface-variant font-label-sm text-label-sm tracking-[0.2em] uppercase">Real-time Performance Metrics</p>
            </div>

            <div className="grid grid-cols-12 gap-6">
              
              {/* Card 1: MMR */}
              <div className="col-span-12 md:col-span-7 glass-card p-8 rounded-3xl relative overflow-hidden group">
                <div className="relative z-10">
                  <span className="font-label-sm text-label-sm text-primary uppercase mb-2 block">Mental MMR</span>
                  <div className="text-[48px] font-display-lg text-on-surface font-semibold">{profile?.mmr || '1,420'}</div>
                </div>
                
                {/* Dynamically generated SVG sparkline */}
                <div className="mt-8 h-32 w-full">
                  <svg className="w-full h-full stroke-primary fill-transparent stroke-[2px]" viewBox="0 0 400 100" preserveAspectRatio="none">
                    <path d={pathD} />
                    <path className="fill-primary/5 stroke-none" d={fillD} />
                  </svg>
                </div>
              </div>

              {/* Card 2: Current Rank */}
              <div className="col-span-12 md:col-span-5 glass-card p-8 rounded-3xl flex flex-col justify-between items-center text-center group">
                <span className="font-label-sm text-label-sm text-outline uppercase">Current Rank</span>
                <div className="relative py-8">
                  <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-50 group-hover:scale-100 transition-transform duration-700"></div>
                  <span className={`material-symbols-outlined text-[120px] relative ${getRankColorClass(profile?.level || 'Iron')}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                    workspace_premium
                  </span>
                </div>
                <span className="text-display-lg-mobile font-headline-md text-on-surface italic">{profile?.level || 'Iron'}</span>
              </div>

              {/* Card 3: Streak */}
              <div className="col-span-12 md:col-span-5 glass-card p-8 rounded-3xl relative overflow-hidden flex flex-col justify-between">
                <div>
                  <span className="font-label-sm text-label-sm text-outline uppercase mb-2 block">Consistency</span>
                  <div className="text-headline-md text-on-surface">{streakVal} Run Streak</div>
                </div>
                <div className="flex items-center gap-4 mt-8">
                  <span className="material-symbols-outlined text-error text-[48px] animate-pulse">local_fire_department</span>
                  <div className="flex gap-1.5">
                    {Array.from({ length: 7 }).map((_, idx) => {
                      // Check if the history list contains a correct run at this position
                      const hasCorrect = history[idx] ? history[idx].is_correct : false;
                      return (
                        <div 
                          key={idx} 
                          className={`h-8 w-2 rounded-full transition-all duration-300 ${hasCorrect ? 'bg-primary shadow-[0_0_8px_rgba(207,188,255,0.4)]' : 'bg-outline-variant/30'}`} 
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Card 4: Economy */}
              <div className="col-span-12 md:col-span-7 glass-card p-8 rounded-3xl relative overflow-hidden halftone-overlay">
                <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                  <img 
                    alt="Tactical Abacus" 
                    className="w-full h-full object-cover grayscale" 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuATW7m31faYrsecdRV1gnNfCR-Pfo7AD-xVwkNei7viDfVjFz2b2liD_reR_PtvQ_vlkSpTcM_gHpTAddOu-DWGrynwg9jSsH63rjUwcq9uf557z-yRUMvavlINImH9ZpxfKeYNm_MAYGv09JI-klYUAnaZREI9GgOe0hQnk5l4VPk5mMHSwuV0TUGsVRL-C8_X1AIPOwZEhd4hRPmux9ZoOOIzlga-V4oHIcFQYoSj7TokX9TIZkn6tg" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-container to-transparent"></div>
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-label-sm text-label-sm text-outline uppercase mb-2 block">Economy</span>
                    <div className="text-[48px] font-display-lg text-on-surface">
                      {history.filter(h => h.is_correct).length * 10} <span className="text-primary font-label-sm text-[24px]">MT</span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-primary text-[40px]">database</span>
                </div>
                <p className="text-on-surface-variant text-body-md mt-4 max-w-xs relative z-10">Accumulate Mental Tokens to unlock higher tier neural-link challenges.</p>
                <div className="mt-8 flex gap-3 relative z-10">
                  <div className="px-4 py-2 bg-surface-container rounded-full border border-outline-variant/20 font-label-sm text-label-sm text-on-surface-variant">
                    +{history.filter((h, idx) => h.is_correct && idx < 5).length * 10} Session MT
                  </div>
                  <div className="px-4 py-2 bg-surface-container rounded-full border border-outline-variant/20 font-label-sm text-label-sm text-on-surface-variant">Top 5% Node</div>
                </div>
              </div>

            </div>
          </section>

          {/* Section 4: Action Ledger */}
          <section id="ledger" className="py-24 px-4 md:px-8 max-w-7xl mx-auto w-full">
            <div className="mb-12 flex justify-between items-end">
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface">Action Ledger</h2>
                <p className="text-on-surface-variant font-label-sm text-label-sm tracking-[0.2em] uppercase">Session History</p>
              </div>
            </div>

            <div className="space-y-4">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 rounded-2xl border border-outline-variant/10 bg-surface-container/20 text-center text-outline">
                  <span className="material-symbols-outlined text-[48px] mb-2 opacity-50">query_stats</span>
                  <p className="italic">No equations logged. Complete a daily speed run to begin ledger sync.</p>
                </div>
              ) : (
                history.map((item, index) => (
                  <div 
                    key={index}
                    className="flex flex-wrap items-center justify-between p-6 rounded-2xl border border-outline-variant/10 bg-surface-container/10 hover:bg-surface-container-low transition-colors group gap-4"
                  >
                    <div className="flex items-center gap-6 min-w-[200px]">
                      <span className={`material-symbols-outlined ${item.is_correct ? 'text-primary' : 'text-error'}`}>
                        {item.is_correct ? 'psychology' : 'calculate'}
                      </span>
                      <div>
                        <div className="text-on-surface font-semibold font-mono tracking-wide text-md">{item.expression}</div>
                        <div className="text-outline font-label-sm text-[10px] uppercase">Anzan Speed Drill</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-center min-w-[80px]">
                        <div className={`font-semibold ${item.is_correct ? 'text-primary' : 'text-error'}`}>
                          {item.is_correct ? 'SUCCESS' : 'FAILED'}
                        </div>
                        <div className="text-outline font-label-sm text-[10px] uppercase">Accuracy</div>
                      </div>
                      <div className="text-center min-w-[60px]">
                        <div className={item.is_correct ? 'text-tertiary' : 'text-error'}>
                          {item.is_correct ? '+15' : '-10'}
                        </div>
                        <div className="text-outline font-label-sm text-[10px] uppercase">MMR</div>
                      </div>
                      <div className="text-right min-w-[120px]">
                        <div className="text-on-surface-variant font-mono">
                          {(item.latency_ms / 1000).toFixed(2)}s
                        </div>
                        <div className="text-outline font-label-sm text-[10px] uppercase">Latency</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Section 5: Webcam Arena Boss Fight */}
          <section className="relative py-48 px-4 overflow-hidden w-full">
            <div className="absolute inset-0 z-0">
              <img 
                alt="Mental Combat Equations" 
                className="w-full h-full object-cover opacity-30 grayscale" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBCtY8rdH6VGZpQDEe82Y2amx3kqAgp5oFT-aGNSHkRcy6EiV7qMUqhNb9KC28xgmq4x-OqFadbwKtWyOGONBSNkSK5r3OswYYCCc7bOqUbY-zRK3B9srkXDaO4saStFguXYDDU0c-xLrnnt5x-7s7nXhQb7Z2SfAwwwRw5Rnm7atXrlltSDxDZMODxJaVMJEGwjVcvO_X31JlBxPGH3Pf_9Q3zhaqK-Be9_cLSkky85Yt3jrc46SrZ-Q" 
              />
              <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background"></div>
            </div>

            <div className="relative z-10 max-w-xl mx-auto">
              <div className="glass-card p-12 rounded-[40px] border-2 border-outline-variant/30 text-center relative shadow-2xl">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface-dim px-6 py-2 border border-outline-variant/30 rounded-full flex items-center gap-2">
                  <span className="text-error font-label-sm text-label-sm tracking-widest uppercase flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">lock</span> Forbidden Arena
                  </span>
                </div>
                <h3 className="font-display-lg text-display-lg-mobile text-on-surface mb-4 italic">Webcam Arena</h3>
                <p className="text-on-surface-variant mb-12">Engage in real-time facial-tracking mental combat. High-stakes neuro-performance matches with AI adversaries.</p>
                <div className="space-y-6">
                  <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
                    <div className="h-full bg-error w-1/4"></div>
                  </div>
                  <div className="flex justify-between text-on-surface-variant font-label-sm text-[10px] uppercase">
                    <span>Current Progress: Level 4</span>
                    <span>Requires: Level 10</span>
                  </div>
                  <button className="w-full py-4 rounded-2xl bg-surface-variant text-outline cursor-not-allowed font-label-sm tracking-widest uppercase" disabled>
                    Locked
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Section 6: Footer */}
          <footer className="bg-surface-dim border-t border-outline-variant/10 relative overflow-hidden mt-auto w-full">
            <div className="relative z-10">
              <div className="w-full py-6 overflow-hidden flex items-center whitespace-nowrap bg-surface-container-lowest/50 backdrop-blur-md">
                <div className="marquee-track flex gap-12">
                  <span className="text-tertiary font-label-sm text-label-sm tracking-[0.4em] uppercase">ZERO CLOUD • PURE EDGE • NEURAL SYNC • DISCIPLINE •</span>
                  <span className="text-tertiary font-label-sm text-label-sm tracking-[0.4em] uppercase">ZERO CLOUD • PURE EDGE • NEURAL SYNC • DISCIPLINE •</span>
                  <span className="text-tertiary font-label-sm text-label-sm tracking-[0.4em] uppercase">ZERO CLOUD • PURE EDGE • NEURAL SYNC • DISCIPLINE •</span>
                </div>
              </div>
              <div className="max-w-7xl mx-auto px-8 py-12 flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="flex items-center gap-12">
                  <span className="font-label-sm text-label-sm text-on-surface tracking-tighter">GWEN OS 2026</span>
                  <div className="flex items-center gap-2 animate-pulse">
                    <div className="w-2 h-2 rounded-full bg-green-500 pulse-dot"></div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant monospaced">
                      {drillStatus === 'idle' ? 'System Offline Ready' : 'Active Neural Synapse'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-8">
                  <a className="text-outline font-label-sm text-label-sm hover:text-tertiary-fixed transition-colors" href="#">Documentation</a>
                  <a className="text-outline font-label-sm text-label-sm hover:text-tertiary-fixed transition-colors" href="#">Terminal Log</a>
                  <a className="text-outline font-label-sm text-label-sm hover:text-tertiary-fixed transition-colors" href="#">Node Settings</a>
                </div>
              </div>
            </div>
          </footer>

        </div>
      )}
    </>
  );
}

export default App;
