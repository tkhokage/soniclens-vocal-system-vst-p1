import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  Upload,
  Sparkles,
  RefreshCw,
  Trash2,
  Send,
  HelpCircle,
  Volume2,
  VolumeX,
  Sliders,
  Activity,
  ArrowRight,
  Music,
  Info,
  Settings,
  MessageSquare,
  X,
  Minus,
  Cpu,
  Search,
  CheckCircle2,
  Disc,
  Disc3,
  Flame,
  ArrowUpRight
} from "lucide-react";
import { VocalRecipe, ChatMessage } from "./types";
import {
  initAudio,
  startPlayback,
  stopPlayback,
  updateAudioParameters,
  loadAudioFileIntoEngine,
  removeAudioFileFromEngine,
  setMasterVolume,
  setAudioPlayerTime,
  getAudioPlayerStats,
  config as audioConfig
} from "./utils/audioEngine";

import DynamicVstCard from "./components/DynamicVstCard";
import SpotifyPlayerCard from "./components/SpotifyPlayerCard";
import VstPresetsDeck from "./components/VstPresetsDeck";
import ThemeToggle from "./components/ThemeToggle";

// Static database template for initial launch style
const INITIAL_DEMO: VocalRecipe = {
  id: "demo-travis",
  songTitle: "SICKO MODE",
  artistName: "Travis Scott",
  confidence: 96,
  detectedChain: [
    {
      pluginName: "AutoTune Pro",
      category: "Pitch Correction",
      purpose: "Aggressive hard-snapping and metallic vocal timbre",
      keySettings: "Retune speed: 0ms, Scale: E Minor Pentatonic, Humanize: 0",
      knobSettings: { "Retune Speed": 0, "Humanize": 0 }
    },
    {
      pluginName: "FabFilter Pro-Q 3",
      category: "EQ",
      purpose: "Surgical highpass filter and high shelf air presence boost",
      keySettings: "High-pass at 110Hz, Presence boost of +6dB at 3.5kHz",
      knobSettings: { "Highpass": 22, "Presence Boost": 75 }
    },
    {
      pluginName: "Classic FET 1176 LN",
      category: "Compression",
      purpose: "Tight dynamic power, fast attack flattening vocal transients",
      keySettings: "Ratio: 4:1, Attack: Fast (position 6), Release: Medium-Fast (position 5)",
      knobSettings: { "Input Level": 45, "Ratio": 30 }
    },
    {
      pluginName: "Soundtoys Decapitator",
      category: "Saturation",
      purpose: "Thick tube harmonics and warm saturation drive",
      keySettings: "Style T (Tube), Drive: 4.8, Punish mode: disabled",
      knobSettings: { "Drive": 48 }
    },
    {
      pluginName: "Valhalla VintageVerb",
      category: "Reverb",
      purpose: "Lush spacey concert-hall atmosphere, long decay decays",
      keySettings: "Mix: 35%, Mode: Concert Hall, Decay: 3.2s, Pre-delay: 24ms",
      knobSettings: { "Mix": 35, "Decay": 64 }
    }
  ],
  simplifiedChain: [
    "DAW Autotune Pitch Correction (Retune 0ms)",
    "DAW Channel EQ (Low-cut at 110Hz, Broad peak at 3.5kHz)",
    "DAW Vintage FET Compressor (Ratio 4:1, Fast Attack)",
    "DAW Saturator Overdrive (+48% drive saturation)",
    "DAW Reverb Simulator (Large Space, 3.2s decay, 35% mix)"
  ],
  artistDna: {
    "Travis Scott": 94,
    "Don Toliver": 45,
    "Kid Cudi": 32,
    "Unique Flavor": 18
  },
  explanation: "Travis Scott's iconic vocal style centers around rapid robotic pitch correction layered with heavy, warm analog tube saturation and drenched in majestic retro-reverbs. This allows his voice to act as a primary harmonic synthesizer blending in with the heavy trap drums.",
  frequencyCritique: "De-essing is heavily automated around 7.5kHz to prevent harsh sibilance in the high-shelf boost. High-pass filter cleared the sub rumble completely at 110Hz to give the 808 bass sufficient room to breathe.",
  acapellaAcousticsDescription: "Dry acapella is very bright, compressed with an immediate upfront presence. Wet acapella is ambient, wide, highly spatial, and carries a subtle organic tape flutter."
};

// Starting options to prompt user deconstruction tests
const POPULAR_SEARCH_PROMPTS = [
  { title: "XO Tour Llif3", artist: "Lil Uzi Vert" },
  { title: "God's Plan", artist: "Drake" },
  { title: "Starboy", artist: "The Weeknd" },
  { title: "Magnolia", artist: "Playboi Carti" }
];

export default function App() {
  const [activeRecipe, setActiveRecipe] = useState<VocalRecipe>(INITIAL_DEMO);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: string; artistGuess: string }[]>([]);
  const [youtubeInput, setYoutubeInput] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  
  const [activeTab, setActiveTab] = useState<"rack" | "presets" | "analytics" | "library">("rack");
  const [isChatMinimized, setIsChatMinimized] = useState(true);
  
  // Real Audio playback timers
  const [isPlaying, setIsPlaying] = useState(false);
  const [stemSelected, setStemSelected] = useState<"full" | "vocals" | "instrumental">("vocals");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(172); // Default typical song duration (2m 52s)
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  // Knob Parameters synchronized with the active audio engine Rack
  const [retuneCtrl, setRetuneCtrl] = useState(0); 
  const [highpassCtrl, setHighpassCtrl] = useState(110);
  const [presenceCtrl, setPresenceCtrl] = useState(6);
  const [ratioCtrl, setRatioCtrl] = useState(4);
  const [driveCtrl, setDriveCtrl] = useState(48);
  const [reverbMixCtrl, setReverbMixCtrl] = useState(35);
  const [reverbDecayCtrl, setReverbDecayCtrl] = useState(3.2);
  const [delayFbCtrl, setDelayFbCtrl] = useState(30);

  // General chat messages list
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Yo! I'm your **SonicLens Vocal Engineer AI Advisor**. I analyze vocal recordings from the internet or your custom files to reverse engineer their entire plugin stack. Feel free to adjust the knobs on the active modules, and ask me tips about recreation in FL Studio, Logic Pro, or Ableton!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize initial component state with WebAudio engine
  useEffect(() => {
    initAudio();
    syncAudioParams();
    setMasterVolume(isMuted ? 0 : volume);
  }, []);

  // Sync volume slider
  useEffect(() => {
    setMasterVolume(isMuted ? 0 : volume);
  }, [volume, isMuted]);

  // Sync state parameters to Web Audio AudioEngine whenever they change
  const syncAudioParams = () => {
    updateAudioParameters({
      stemType: stemSelected,
      eqHighpass: highpassCtrl,
      eqPresenceBoost: presenceCtrl,
      saturationDrive: driveCtrl,
      autotuneSpeed: retuneCtrl,
      reverbMix: reverbMixCtrl,
      reverbDecay: reverbDecayCtrl,
      delayFeedbackAmount: delayFbCtrl,
      compressorRatio: ratioCtrl,
    });
  };

  useEffect(() => {
    syncAudioParams();
  }, [stemSelected, highpassCtrl, presenceCtrl, driveCtrl, retuneCtrl, reverbMixCtrl, reverbDecayCtrl, delayFbCtrl, ratioCtrl]);

  // Real-time ticking playback timer for Apple Music seekable track progress
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      const stats = getAudioPlayerStats();
      if (stats) {
        setCurrentTime(stats.currentTime);
        setDuration(stats.duration);
      } else {
        // Fallback simulated ticking sequencer wrapper
        setCurrentTime((prev) => {
          if (prev >= duration) {
            return 0; // Wrap around on end
          }
          return prev + 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, duration]);

  // Handle curate recipe loaded
  const loadRecipe = (recipe: VocalRecipe) => {
    setActiveRecipe(recipe);
    removeAudioFileFromEngine();
    setUploadedFiles([]);
    setCurrentTime(0);
    
    // Auto preset configurations
    const pitchCorrectionPlugin = recipe.detectedChain.find(p => p.category === "Pitch Correction");
    const eqPlugin = recipe.detectedChain.find(p => p.category === "EQ");
    const compPlugin = recipe.detectedChain.find(p => p.category === "Compression");
    const satPlugin = recipe.detectedChain.find(p => p.category === "Saturation");
    const revPlugin = recipe.detectedChain.find(p => p.category === "Reverb");

    setRetuneCtrl(pitchCorrectionPlugin ? (pitchCorrectionPlugin.knobSettings["Retune Speed"] ?? 0) : 10);
    setHighpassCtrl(eqPlugin ? (eqPlugin.knobSettings["Highpass"] ?? 110) : 110);
    setPresenceCtrl(eqPlugin ? (eqPlugin.knobSettings["Presence Boost"] ?? 4) : 4);
    setRatioCtrl(compPlugin ? (compPlugin.knobSettings["Ratio"] ?? 4) : 4);
    setDriveCtrl(satPlugin ? (satPlugin.knobSettings["Drive"] ?? 30) : 30);
    setReverbMixCtrl(revPlugin ? (revPlugin.knobSettings["Mix"] ?? 25) : 25);
    setReverbDecayCtrl(revPlugin ? (revPlugin.knobSettings["Decay"] ?? 2.5) : 2.5);

    setChatMessages([
      {
        id: `welcome-${recipe.songTitle}`,
        role: "assistant",
        content: `I've successfully aligned the vocal mastering rack to **${recipe.artistName}'s** vocal characteristics for _"${recipe.songTitle}"_. Open the tabs to read the professional DAW plugin translations, or ask me for studio tips!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Toggle playback
  const handleTogglePlayback = () => {
    if (isPlaying) {
      stopPlayback();
      setIsPlaying(false);
    } else {
      initAudio();
      startPlayback();
      setIsPlaying(true);
    }
  };

  // Handle seeking along the Apple Music progress bar
  const handleSeek = (newTimeSec: number) => {
    setCurrentTime(newTimeSec);
    setAudioPlayerTime(newTimeSec);
  };

  // Process server Gemini song analysis
  const handleAnalyzeSong = async (titleOrUrl: string, isYoutube = false, fileNameStr?: string) => {
    if (!titleOrUrl.trim()) return;
    setAnalyzing(true);
    setAnalysisProgress(12);

    // Dynamic processing delay simulation
    const interval = setInterval(() => {
      setAnalysisProgress((prev) => {
        if (prev >= 92) {
          clearInterval(interval);
          return 92;
        }
        return prev + 18;
      });
    }, 380);

    try {
      const response = await fetch("/api/analyze-song", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: isYoutube ? "" : titleOrUrl,
          youtubeUrl: isYoutube ? titleOrUrl : "",
          fileName: fileNameStr || ""
        })
      });

      const parsedRecipe = await response.json();
      clearInterval(interval);
      setAnalysisProgress(100);

      if (parsedRecipe && !parsedRecipe.error) {
        const recipeWithDefaults: VocalRecipe = {
          id: `analyzed-${Date.now()}`,
          songTitle: parsedRecipe.songTitle || (isYoutube ? "YouTube Stream" : titleOrUrl),
          artistName: parsedRecipe.artistName || "Custom Artist",
          confidence: parsedRecipe.confidence || 88,
          detectedChain: parsedRecipe.detectedChain || INITIAL_DEMO.detectedChain,
          simplifiedChain: parsedRecipe.simplifiedChain || INITIAL_DEMO.simplifiedChain,
          artistDna: parsedRecipe.artistDna || { "Custom Signature": 80, "Atmosphere": 20 },
          explanation: parsedRecipe.explanation || "Surgical separation of primary vocal frequencies detected.",
          frequencyCritique: parsedRecipe.frequencyCritique || "Presence peaks roll-offs determined in calculations.",
          acapellaAcousticsDescription: parsedRecipe.acapellaAcousticsDescription || "Clean isolated track."
        };
        
        setActiveRecipe(recipeWithDefaults);
        
        const eqPlugin = recipeWithDefaults.detectedChain.find(p => p.category === "EQ");
        const compPlugin = recipeWithDefaults.detectedChain.find(p => p.category === "Compression");
        const satPlugin = recipeWithDefaults.detectedChain.find(p => p.category === "Saturation");
        const revPlugin = recipeWithDefaults.detectedChain.find(p => p.category === "Reverb");

        setRetuneCtrl(0); // Snap 0ms by default for custom modern analytical deconstructions
        setHighpassCtrl(eqPlugin ? (eqPlugin.knobSettings["Highpass"] ?? 110) : 110);
        setPresenceCtrl(eqPlugin ? (eqPlugin.knobSettings["Presence Boost"] ?? 4) : 4);
        setRatioCtrl(compPlugin ? (compPlugin.knobSettings["Ratio"] ?? 4) : 4);
        setDriveCtrl(satPlugin ? (satPlugin.knobSettings["Drive"] ?? 30) : 30);
        setReverbMixCtrl(revPlugin ? (revPlugin.knobSettings["Mix"] ?? 25) : 25);
        setReverbDecayCtrl(revPlugin ? (revPlugin.knobSettings["Decay"] ?? 2.5) : 2.5);

        if (isYoutube) {
          setYoutubeInput("");
          // Synthesize/Stream real separation mock track inside the engine
          loadAudioFileIntoEngine("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3");
        }
      } else {
        console.warn("Dynamic analysis failed, utilizing local fallback recipe matching target.");
      }
    } catch (e) {
      console.error("Analysis network error. Static state kept.", e);
    } finally {
      setAnalyzing(false);
    }
  };

  // Handle local file uploads
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const mockFile = {
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        artistGuess: file.name.split("-")[0]?.replace(/_/g, " ") || "Unknown Vocalist"
      };

      setUploadedFiles([mockFile]); // Hold single active file track as requested (replace or swap easily)
      loadAudioFileIntoEngine(file);
      handleAnalyzeSong(file.name.replace(/\.[^/.]+$/, ""), false, file.name);
    }
  };

  const handleDeleteUploadedFile = () => {
    setUploadedFiles([]);
    removeAudioFileFromEngine();
    setCurrentTime(0);
  };

  // Send message to AI chatbot helper
  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: chatInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...chatMessages, userMsg].map(m => ({ role: m.role, content: m.content })),
          songContext: activeRecipe
        })
      });

      const data = await response.json();
      if (data && data.text) {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: data.text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch (err) {
      console.error("AI Assistant responder error:", err);
    } finally {
      setIsChatLoading(false);
      setTimeout(() => {
        if (chatBottomRef.current) {
          chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }, 150);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.round(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="ps5-shell relative flex flex-col h-screen w-full text-white overflow-hidden">
      
      {/* HEADER BAR - Console Style */}
      <header className="ps5-header h-24 flex items-center justify-between px-8 shrink-0 z-30">
        <div className="flex items-center gap-4">
          <div className="ps5-logo">VA</div>
          <div>
            <h1 className="ps5-title text-xl">VOICE ANALYZER</h1>
            <p className="ps5-sub">Deconstruct • Analyze • Master</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 flex-1 max-w-lg">
            <div className="flex bg-glass rounded-full px-4 py-2 border border-white/5 focus-within:border-cyan-400/40 transition-all w-full items-center backdrop-blur-md">
              <Search className="w-4 h-4 text-cyan-400/60 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Analyze any song..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="bg-transparent border-none text-sm focus:outline-none w-full text-white placeholder-zinc-500"
                onKeyDown={(e) => { if (e.key === 'Enter') { handleAnalyzeSong(searchInput, false); setSearchInput(""); } }}
              />
            </div>
          </div>
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="ps5-btn flex items-center gap-2 text-sm"
          >
            <Upload className="w-4 h-4" />
            Upload
          </button>
          
          <ThemeToggle />
        </div>
      </header>

      {/* LOADER OVERLAY */}
      {analyzing && (
        <div className="absolute inset-0 bg-black/98 backdrop-blur-xl z-50 flex flex-col items-center justify-center gap-8">
          <motion.div className="w-20 h-20 rounded-full border-3 border-cyan-400/10 border-t-2 border-t-cyan-400 flex items-center justify-center" animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
            <Sparkles className="w-8 h-8 text-cyan-400" />
          </motion.div>
          <div className="text-center max-w-md">
            <h3 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent uppercase tracking-widest font-mono">
              Analyzing Stems
            </h3>
            <p className="text-sm text-zinc-400 mt-3">
              Reading spectral profiles & generating DAW configurations.
            </p>
            <div className="w-64 h-2 bg-zinc-800/50 rounded-full overflow-hidden mt-6 mx-auto border border-cyan-400/20">
              <div 
                className="h-full bg-gradient-to-r from-cyan-400 to-purple-400 transition-all duration-500 rounded-full"
                style={{ width: `${analysisProgress}%` }}
              />
            </div>
            <span className="text-xs text-cyan-400/60 font-mono block mt-2">{analysisProgress}%</span>
          </div>
        </div>
      )}

      {/* MAIN VIEWPORT LAYOUT */}
      <main className="flex-1 overflow-y-auto relative pb-32 bg-gradient-to-b from-transparent via-cyan-400/[0.01] to-purple-400/[0.01]">
        <div className="max-w-7xl mx-auto w-full px-6 py-8 flex flex-col gap-8">
          
          {/* Hero Section */}
          <div className="ps5-panel p-8 border-l-4 border-l-cyan-400">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-3xl font-bold mb-1">{activeRecipe.songTitle}</h2>
                <p className="text-cyan-400 font-semibold">{activeRecipe.artistName}</p>
              </div>
              <div className="text-right">
                <div className="text-sm text-zinc-400">Confidence</div>
                <div className="text-2xl font-bold text-cyan-400">{activeRecipe.confidence}%</div>
              </div>
            </div>
          </div>

          {/* SPOTIFY PLAYER HEADER CARD */}
          <div>
            <SpotifyPlayerCard
              activeRecipe={activeRecipe}
              isPlaying={isPlaying}
              stemSelected={stemSelected}
              onStemChange={(stem) => setStemSelected(stem)}
              uploadedFiles={uploadedFiles}
              onRemoveUploadedFile={handleDeleteUploadedFile}
              youtubeInput={youtubeInput}
              setYoutubeInput={setYoutubeInput}
              onAnalyzeSong={handleAnalyzeSong}
              onTogglePlayback={handleTogglePlayback}
              retuneCtrl={retuneCtrl}
              highpassCtrl={highpassCtrl}
              presenceCtrl={presenceCtrl}
              driveCtrl={driveCtrl}
              reverbMixCtrl={reverbMixCtrl}
            />
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 flex-wrap z-20">
            <button
              onClick={() => setActiveTab("rack")}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === "rack"
                  ? "bg-gradient-to-r from-cyan-400 to-purple-400 text-black shadow-lg"
                  : "bg-glass border border-white/5 text-white hover:border-cyan-400/40"
              }`}
            >
              <Sliders className="w-4 h-4" />
              FX Rack
            </button>
            <button
              onClick={() => setActiveTab("presets")}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === "presets"
                  ? "bg-gradient-to-r from-cyan-400 to-purple-400 text-black shadow-lg"
                  : "bg-glass border border-white/5 text-white hover:border-cyan-400/40"
              }`}
            >
              <Cpu className="w-4 h-4" />
              DAW Presets
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === "analytics"
                  ? "bg-gradient-to-r from-cyan-400 to-purple-400 text-black shadow-lg"
                  : "bg-glass border border-white/5 text-white hover:border-cyan-400/40"
              }`}
            >
              <Activity className="w-4 h-4" />
              Spectrum
            </button>
            <button
              onClick={() => setActiveTab("library")}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === "library"
                  ? "bg-gradient-to-r from-cyan-400 to-purple-400 text-black shadow-lg"
                  : "bg-glass border border-white/5 text-white hover:border-cyan-400/40"
              }`}
            >
              <Music className="w-4 h-4" />
              Library
            </button>
          </div>

          {/* ACTIVE TAB CONTENT */}
          <div className="flex-1 w-full min-h-[300px]">
            
            {/* TAB 1: INTERACTIVE FX DIALS */}
            {activeTab === "rack" && (
              <div className="flex flex-col gap-6 animate-fadeIn">
                
                {/* Simulated Waveform spectral visualizer */}
                <div className="bg-zinc-950/40 p-4 rounded-3xl border border-zinc-900">
                  <div className="flex justify-between items-center text-[9px] text-zinc-550 font-mono uppercase mb-2">
                    <span>Isolated Stem Frequency Monitoring Engine (44.1 kHz • Active Dials Sync)</span>
                    <span className="text-[#1DB954]">{isPlaying ? "SIGNAL STREAM LIVE" : "SEQ IDLE"}</span>
                  </div>
                  <div className="h-14 bg-zinc-950 border border-zinc-900/60 rounded-xl flex items-end justify-between p-2.5 gap-0.5 overflow-hidden relative">
                    {Array.from({ length: 64 }).map((_, idx) => {
                      const randHeight = isPlaying 
                        ? Math.round(15 + Math.sin((idx + Date.now() / 250)) * 25 + Math.random() * 25)
                        : Math.round(4 + Math.sin(idx / 5) * 8);
                      
                      let barColor = "bg-zinc-800";
                      if (isPlaying) {
                        if (idx < 16) barColor = "bg-emerald-500/80";
                        else if (idx < 44) barColor = "bg-teal-400";
                        else barColor = "bg-indigo-400";
                      }

                      return (
                        <div
                          key={idx}
                          className={`w-1 rounded-t transition-all duration-150 ${barColor}`}
                          style={{ height: `${Math.max(4, Math.min(100, randHeight))}%` }}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[8px] font-mono text-zinc-600 mt-1 uppercase px-1">
                    <span>20Hz (Subs)</span>
                    <span>300Hz (Vocal Core Body)</span>
                    <span>3.5kHz (Audible Air Presence)</span>
                    <span>12kHz (Gloss Shimmer)</span>
                  </div>
                </div>

                {/* Knobs Grid - Dynamically populated from reverse-engineered AI Vocal Chain recipe */}
                <div id="vst-rack-slots-grid" className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {activeRecipe.detectedChain.map((plugin, idx) => (
                    <DynamicVstCard
                      key={`${plugin.pluginName}-${idx}`}
                      plugin={plugin}
                      index={idx}
                      isPlaying={isPlaying && stemSelected !== "instrumental"}
                    />
                  ))}
                </div>

              </div>
            )}

            {/* TAB 2: DAW PRESETS & PREMIUM VSTs */}
            {activeTab === "presets" && (
              <div className="animate-fadeIn">
                <VstPresetsDeck
                  activeRecipe={activeRecipe}
                  retuneCtrl={retuneCtrl}
                  highpassCtrl={highpassCtrl}
                  presenceCtrl={presenceCtrl}
                  ratioCtrl={ratioCtrl}
                  driveCtrl={driveCtrl}
                  reverbMixCtrl={reverbMixCtrl}
                  reverbDecayCtrl={reverbDecayCtrl}
                  delayFbCtrl={delayFbCtrl}
                />
              </div>
            )}

            {/* TAB 3: SURGICAL ANALYTICS & ARTIST DNA */}
            {activeTab === "analytics" && (
              <div className="flex flex-col gap-6 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Signal Routing Tree Map */}
                  <div className="bg-[#0c0c0d] p-5 rounded-2xl border border-zinc-900 flex flex-col gap-3">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest font-mono">Signal Routing Sequence</span>
                    <div className="flex flex-col items-center gap-1.5 p-4 bg-black/60 rounded-xl border border-zinc-900/40 relative">
                      <div className="w-40 rounded-lg border border-zinc-800 text-center py-1.5 bg-black text-[9px] font-mono text-zinc-300">
                        🎙️ Isolated Input Track
                      </div>
                      <div className="w-px h-3 bg-emerald-500" />
                      <div className="w-40 rounded-lg border border-emerald-500/20 text-center py-1.5 bg-emerald-500/5 text-[9px] font-mono text-emerald-450 font-semibold">
                        ⚙️ Pitch Autotune ({retuneCtrl}ms)
                      </div>
                      <div className="w-px h-3 bg-violet-500" />
                      <div className="w-40 rounded-lg border border-violet-500/20 text-center py-1.5 bg-violet-500/5 text-[9px] font-mono text-violet-400 font-semibold">
                        🎛️ FabFilter EQ ({highpassCtrl}Hz)
                      </div>
                      <div className="w-px h-3 bg-teal-500" />
                      <div className="w-40 rounded-lg border border-teal-500/20 text-center py-1.5 bg-teal-500/5 text-[9px] font-mono text-teal-400 font-semibold">
                        📟 FET Compressor ({ratioCtrl}:1)
                      </div>
                      <div className="w-px h-3 bg-rose-500" />
                      <div className="w-40 rounded-lg border border-rose-500/20 text-center py-1.5 bg-rose-500/5 text-[9px] font-mono text-rose-450 font-semibold">
                        🔥 Harmonic Saturation (+{driveCtrl}%)
                      </div>
                      <div className="w-px h-3 bg-indigo-500" />
                      <div className="w-40 rounded-lg border border-indigo-500/20 text-center py-1.5 bg-indigo-500/5 text-[9px] font-mono text-indigo-400 font-semibold">
                        🌌 Space Aux Send ({reverbMixCtrl}%)
                      </div>
                    </div>
                  </div>

                  {/* Character DNA weights */}
                  <div className="flex flex-col gap-3 bg-[#0c0c0d] p-5 rounded-2xl border border-zinc-900 justify-between">
                    <div>
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest font-mono">Dynamic Timbre Matching Weights</span>
                      <p className="text-[11px] text-zinc-500 font-serif mt-1">Surgical percentage matches detected on dry/wet frequency layers:</p>
                    </div>

                    <div className="flex flex-col gap-3 mt-2">
                      {Object.entries(activeRecipe.artistDna).map(([artist, pct]) => (
                        <div key={artist} className="flex flex-col gap-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-zinc-300">{artist}</span>
                            <span className="font-mono text-emerald-400 font-bold">{pct}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-900">
                            <div 
                              className="h-full bg-gradient-to-r from-[#1DB954] to-emerald-400 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="text-[9px] font-mono text-zinc-600 mt-2 text-center uppercase tracking-widest">
                      Extraction Confidence rating: {activeRecipe.confidence}%
                    </div>
                  </div>
                </div>

                {/* Analysis breakdown details */}
                <div className="p-6 rounded-2xl bg-[#0c0c0d] border border-zinc-900 flex flex-col gap-4">
                  <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-zinc-200">Vocal Timbre & Acapella Analysis</h4>
                  </div>

                  <div>
                    <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">Acoustic Reconstruction Summary</span>
                    <p className="text-xs text-zinc-300 leading-relaxed font-serif">{activeRecipe.explanation}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1">
                    <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-900">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">Spectral Signature</span>
                      <p className="text-xs text-zinc-400 italic font-serif">{activeRecipe.frequencyCritique}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-900">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">Acapella Acoustics</span>
                      <p className="text-xs text-zinc-400 italic font-serif">{activeRecipe.acapellaAcousticsDescription}</p>
                    </div>
                  </div>

                  <div className="mt-2 pt-4 border-t border-zinc-900">
                    <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-2">Equivalent Chain Order</span>
                    <div className="flex flex-wrap gap-2">
                      {activeRecipe.simplifiedChain.map((plug, idx) => (
                        <div key={idx} className="bg-zinc-950 p-2 px-3 rounded-lg border border-zinc-900 text-[9px] font-mono text-zinc-300 flex items-center gap-1.5">
                          <span className="text-[#1DB954] font-bold">{idx + 1}</span> {plug}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: MEDIA LIBRARY & LOCAL MP3 BACKUP */}
            {activeTab === "library" && (
              <div className="grid grid-cols-1 gap-6 animate-fadeIn">
                
                {/* Uploader section */}
                <div className="flex flex-col gap-5 p-6 bg-zinc-950/40 rounded-3xl border border-zinc-900">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider mb-1 flex items-center gap-1.5 font-mono">
                      <Upload className="w-4 h-4 text-[#1DB954]" />
                      Import Vocals (MP3/WAV/etc)
                    </h3>
                    <p className="text-xs text-zinc-400 font-serif">
                      Drop any standard audio acapella or recording to reverse engineer its acoustic structure using Gemini's modeling.
                    </p>
                  </div>

                  {/* Drag drop container */}
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-zinc-800 hover:border-[#1DB954]/50 rounded-2xl p-8 text-center cursor-pointer transition-all bg-zinc-950 hover:bg-zinc-900"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="audio/*"
                      className="hidden"
                    />
                    <Upload className="w-8 h-8 text-zinc-600 mx-auto mb-2.5 hover:scale-105 duration-250 text-emerald-400" />
                    <h4 className="text-xs font-bold text-zinc-300">Select Acapella File</h4>
                    <p className="text-[10px] text-zinc-600 mt-1">Accepts WAV, MP3, M4A or AIFF files</p>
                  </div>

                  {/* Active uploaded items */}
                  {uploadedFiles.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      <span className="text-[9px] font-extrabold text-white/40 uppercase tracking-widest font-mono">Active Loaded Audio</span>
                      {uploadedFiles.map((file, i) => (
                        <div key={i} className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between">
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <Disc className="w-4 h-4 text-emerald-400 animate-spin" />
                            <div className="overflow-hidden">
                              <div className="text-xs font-bold truncate text-emerald-300">{file.name}</div>
                              <div className="text-[9px] text-[#1DB954]/75 font-mono mt-0.5">{file.size} • Isolated vocal</div>
                            </div>
                          </div>
                          <button 
                            onClick={handleDeleteUploadedFile}
                            className="p-1 rounded text-zinc-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-zinc-500 italic text-center py-2">
                      No custom file currently active. Using stock synthesized scale stems in Web Audio.
                    </p>
                  )}
                </div>

              </div>
            )}



          </div>

        </div>
      </main>

      {/* FLOATING CUTE SIDEBAR AI HELPER BOX */}
      {isChatMinimized ? (
        <button
          onClick={() => setIsChatMinimized(false)}
          className="fixed bottom-24 right-6 w-12 h-12 bg-gradient-to-tr from-[#1DB954] to-emerald-400 hover:scale-105 rounded-full flex items-center justify-center text-neutral-900 shadow-2xl z-40 transition-all cursor-pointer"
          title="Open AI Vocal Advisor"
        >
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-black animate-pulse" />
          <MessageSquare className="w-5 h-5 text-neutral-950" />
        </button>
      ) : (
        <div className="fixed bottom-24 right-6 w-80 max-w-[calc(100vw-2rem)] h-[380px] bg-[#0c0c0e]/95 border border-zinc-800 rounded-2xl shadow-2xl z-40 flex flex-col overflow-hidden backdrop-blur-xl animate-fadeIn">
          
          <div className="p-3 bg-zinc-950 border-b border-zinc-900 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#1DB954] animate-pulse" />
              <h4 className="text-[10px] font-bold font-mono text-zinc-300 uppercase tracking-widest">AI Vocal Assistant</h4>
            </div>
            <button
              onClick={() => setIsChatMinimized(true)}
              className="p-1 rounded bg-zinc-900/60 text-zinc-400 hover:text-white"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Chat text */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 scrollbar-thin text-[11px] leading-relaxed">
            {chatMessages.map((msg) => {
              const isAi = msg.role === "assistant";
              return (
                <div key={msg.id} className={`flex gap-2 items-start ${isAi ? "" : "flex-row-reverse"}`}>
                  <div className={`p-2.5 rounded-xl text-zinc-150 ${isAi ? "bg-zinc-900 border border-zinc-900/40" : "bg-emerald-500/10 border border-emerald-500/20"}`}>
                    <p className="whitespace-pre-line font-serif">{msg.content}</p>
                  </div>
                </div>
              );
            })}
            
            {isChatLoading && (
              <div className="text-[9px] text-zinc-500 italic">
                <RefreshCw className="w-3 h-3 animate-spin inline-block mr-1 text-[#1DB954]" /> responding...
              </div>
            )}
          </div>

          {/* Message input */}
          <div className="p-2.5 bg-[#08080a] border-t border-zinc-900 flex items-center gap-1.5 shrink-0">
            <input
              type="text"
              placeholder="Ask for FL Studio or Logic configurations..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSendMessage(); }}
              className="flex-1 bg-zinc-900 border border-zinc-850 rounded-full px-3 py-1 text-xs focus:outline-none focus:border-[#1DB954] text-zinc-200 placeholder-zinc-700"
            />
            <button
              onClick={handleSendMessage}
              className="w-7 h-7 bg-emerald-500 hover:bg-[#1DB954] text-black rounded-full flex items-center justify-center shrink-0 shadow transition-transform"
            >
              <Send className="w-3 h-3" />
            </button>
          </div>

        </div>
      )}

      {/* APPLE MUSIC GLASSMORPHIC FIXED BOTTOM PLAYER BAR */}
      <div 
        id="apple-music-fixed-player"
        className="fixed bottom-0 left-0 right-0 h-20 z-40 backdrop-blur-xl bg-zinc-950/75 border-t border-white/5 flex items-center justify-between px-6 select-none"
      >
        {/* Left Side: Artwork/Song Labels */}
        <div className="flex items-center gap-3.5 w-1/4 min-w-[200px]">
          <div className="relative">
            <div className={`w-11 h-11 bg-gradient-to-tr from-zinc-800 to-black rounded-lg border border-white/10 flex items-center justify-center overflow-hidden shadow-md shrink-0 ${isPlaying ? 'animate-pulse' : ''}`}>
              <Disc3 className={`w-6 h-6 text-zinc-400 ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
            </div>
            {isPlaying && (
              <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-[#1DB954] rounded-full border-2 border-black" />
            )}
          </div>

          <div className="overflow-hidden">
            <h5 className="text-xs font-bold truncate text-white leading-tight" title={activeRecipe.songTitle}>
              {activeRecipe.songTitle}
            </h5>
            <p className="text-[10px] text-zinc-400 truncate leading-normal" title={activeRecipe.artistName}>
              {activeRecipe.artistName}
            </p>
          </div>
        </div>

        {/* Center: Play/Pause controls & Seek Slider */}
        <div className="flex flex-col items-center gap-1.5 flex-1 max-w-lg">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleTogglePlayback}
              className="w-9 h-9 rounded-full bg-white text-black hover:scale-105 active:scale-95 flex items-center justify-center transition-all shadow cursor-pointer"
              title={isPlaying ? "Pause Vocals" : "Play Vocals"}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-black text-black" />
              ) : (
                <Play className="w-4 h-4 fill-black text-black ml-0.5" />
              )}
            </button>
          </div>

          {/* Seeker Progress Timeline */}
          <div className="flex items-center gap-3 w-full text-[9px] font-mono text-zinc-400">
            <span>{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration}
              value={currentTime}
              onChange={(e) => handleSeek(Number(e.target.value))}
              className="w-full h-1 bg-zinc-800 rounded-full appearance-none accent-[#1DB954] cursor-pointer"
            />
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right Side: Stem quick pills + Volume Controls */}
        <div className="flex items-center justify-end gap-6 w-1/4 min-w-[240px]">
          
          {/* Stem Select Capsule Pill */}
          <div className="hidden lg:flex bg-neutral-900 border border-zinc-850 p-1 rounded-full items-center">
            {(["vocals", "full", "instrumental"] as const).map((stem) => (
              <button
                key={stem}
                onClick={() => setStemSelected(stem)}
                className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase transition-all tracking-wider ${
                  stemSelected === stem
                    ? "bg-[#1DB954] text-black font-extrabold shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {stem === "vocals" ? "Vocals" : stem === "full" ? "Full" : "Beats"}
              </button>
            ))}
          </div>

          {/* Volume Deck */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button 
              onClick={() => setIsMuted(!isMuted)} 
              className="p-1 text-zinc-450 hover:text-white transition-colors"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-zinc-500" />
              ) : (
                <Volume2 className="w-4 h-4 text-zinc-300" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume * 100}
              onChange={(e) => {
                setVolume(Number(e.target.value) / 100);
                setIsMuted(false);
              }}
              className="w-16 h-1 bg-zinc-800 rounded-full appearance-none accent-zinc-300 cursor-pointer"
              title="Output Volume"
            />
          </div>

        </div>
      </div>

    </div>
  );
}
