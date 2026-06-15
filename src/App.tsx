import React, { useState, useEffect, useRef } from "react";
import {
  Play, Pause, Upload, Volume2, VolumeX, Search,
  Sparkles, Sliders, Cpu, Activity, Music
} from "lucide-react";
import { motion } from "motion/react";
import { VocalRecipe, ChatMessage } from "./types";
import {
  initAudio, startPlayback, stopPlayback, updateAudioParameters,
  loadAudioFileIntoEngine, removeAudioFileFromEngine,
  setMasterVolume, setAudioPlayerTime, getAudioPlayerStats
} from "./utils/audioEngine";

import SpotifyPlayerCard from "./components/SpotifyPlayerCard";
import VstPresetsDeck from "./components/VstPresetsDeck";
import ThemeToggle from "./components/ThemeToggle";

const INITIAL_DEMO: VocalRecipe = {
  id: "demo-travis",
  songTitle: "SICKO MODE",
  artistName: "Travis Scott",
  confidence: 96,
  detectedChain: [
    {
      pluginName: "AutoTune Pro",
      category: "Pitch Correction",
      purpose: "Hard-snapping pitch correction",
      keySettings: "Retune speed: 0ms",
      knobSettings: { "Retune Speed": 0 }
    }
  ],
  simplifiedChain: [],
  artistDna: { "Travis Scott": 96 },
  explanation: "High confidence match",
  frequencyCritique: "Bright presence with clear highs",
  acapellaAcousticsDescription: "Clean isolated vocal"
};

const POPULAR_SEARCH_PROMPTS = [
  { title: "XO Tour Llif3", artist: "Lil Uzi Vert" },
  { title: "God's Plan", artist: "Drake" },
  { title: "Starboy", artist: "The Weeknd" }
];

export default function App() {
  const [activeRecipe, setActiveRecipe] = useState<VocalRecipe>(INITIAL_DEMO);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(172);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<"rack" | "presets">("rack");
  const [searchInput, setSearchInput] = useState("");
  const [youtubeInput, setYoutubeInput] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [stemSelected, setStemSelected] = useState<"full" | "vocals" | "instrumental">("vocals");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Knob parameters
  const [retuneCtrl, setRetuneCtrl] = useState(0);
  const [highpassCtrl, setHighpassCtrl] = useState(110);
  const [presenceCtrl, setPresenceCtrl] = useState(6);
  const [ratioCtrl, setRatioCtrl] = useState(4);
  const [driveCtrl, setDriveCtrl] = useState(48);
  const [reverbMixCtrl, setReverbMixCtrl] = useState(35);
  const [reverbDecayCtrl, setReverbDecayCtrl] = useState(3.2);
  const [delayFbCtrl, setDelayFbCtrl] = useState(30);

  useEffect(() => {
    initAudio();
    setMasterVolume(0.8);
  }, []);

  useEffect(() => {
    setMasterVolume(isMuted ? 0 : volume);
  }, [volume, isMuted]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentTime((prev) => (prev >= duration ? 0 : prev + 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying, duration]);

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

  const handleAnalyzeSong = async (titleOrUrl: string, isYoutube = false) => {
    if (!titleOrUrl.trim()) return;
    setAnalyzing(true);
    setAnalysisProgress(0);

    const interval = setInterval(() => {
      setAnalysisProgress((prev) => (prev >= 100 ? 100 : prev + Math.random() * 40));
    }, 200);

    setTimeout(() => {
      clearInterval(interval);
      setAnalysisProgress(100);
      setAnalyzing(false);
      setSearchInput("");
    }, 2000);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.round(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="ps5-shell relative flex flex-col h-screen w-full text-white overflow-hidden">
      
      {/* HEADER */}
      <header className="ps5-header h-24 flex items-center justify-between px-8 shrink-0 z-30">
        <div className="flex items-center gap-4">
          <div className="ps5-logo">VA</div>
          <div>
            <h1 className="ps5-title text-2xl">VOICE ANALYZER</h1>
            <p className="ps5-sub text-sm">Deconstruct • Analyze • Master</p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-1 max-w-lg mx-8">
          <div className="flex bg-glass rounded-lg px-4 py-2 border border-white/10 focus-within:border-cyan-400/40 transition-all w-full items-center">
            <Search className="w-4 h-4 text-cyan-400/60 mr-2" />
            <input
              type="text"
              placeholder="Analyze any song..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="bg-transparent border-none text-sm focus:outline-none w-full text-white placeholder-zinc-500"
              onKeyDown={(e) => { if (e.key === 'Enter') handleAnalyzeSong(searchInput, false); }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="ps5-btn flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* LOADER */}
      {analyzing && (
        <div className="absolute inset-0 bg-black/98 backdrop-blur-xl z-50 flex flex-col items-center justify-center gap-8">
          <motion.div className="w-20 h-20 rounded-full border-3 border-cyan-400/10 border-t-2 border-t-cyan-400 flex items-center justify-center" animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
            <Sparkles className="w-8 h-8 text-cyan-400" />
          </motion.div>
          <div className="text-center">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent uppercase tracking-widest">Analyzing Stems</h3>
            <p className="text-sm text-zinc-400 mt-2">Reading spectral profiles...</p>
            <div className="w-64 h-2 bg-zinc-800 rounded-full overflow-hidden mt-6 border border-cyan-400/20">
              <div className="h-full bg-gradient-to-r from-cyan-400 to-purple-400" style={{width: `${analysisProgress}%`}} />
            </div>
          </div>
        </div>
      )}

      {/* MAIN */}
      <main className="flex-1 overflow-y-auto bg-gradient-to-b from-transparent via-cyan-400/[0.01] to-purple-400/[0.01] pb-24">
        <div className="max-w-7xl mx-auto w-full px-6 py-8 flex flex-col gap-8">
          
          {/* Hero */}
          <div className="ps5-panel p-8 border-l-4 border-l-cyan-400">
            <div className="flex justify-between items-start">
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

          {/* Player */}
          <div className="ps5-panel p-6">
            <div className="flex items-center justify-between gap-4">
              <button onClick={handleTogglePlayback} className="ps5-btn px-6 py-3 flex items-center gap-2">
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs text-zinc-400 min-w-10">{formatTime(currentTime)}</span>
                <div className="flex-1 h-2 bg-zinc-800 rounded-full cursor-pointer" onClick={(e) => setCurrentTime((e.clientX / (e.currentTarget as HTMLElement).offsetWidth) * duration)}>
                  <div className="h-full bg-cyan-400 rounded-full" style={{width: `${(currentTime / duration) * 100}%`}} />
                </div>
                <span className="text-xs text-zinc-400 min-w-10">{formatTime(duration)}</span>
              </div>
              <div className="flex items-center gap-2">
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                <input type="range" min="0" max="1" step="0.01" value={isMuted ? 0 : volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-20" />
              </div>
            </div>
          </div>

          {/* Quick Load */}
          <div className="ps5-panel p-6">
            <p className="text-xs text-cyan-400/60 font-mono uppercase tracking-wider mb-4">Quick Load</p>
            <div className="flex flex-wrap gap-2">
              {POPULAR_SEARCH_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnalyzeSong(`${prompt.title} by ${prompt.artist}`)}
                  className="px-4 py-2 rounded-lg text-sm bg-glass border border-cyan-400/20 text-cyan-300 hover:bg-cyan-400/10 transition-all"
                >
                  {prompt.title}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <SpotifyPlayerCard
                activeRecipe={activeRecipe}
                isPlaying={isPlaying}
                stemSelected={stemSelected}
                onStemChange={setStemSelected}
                uploadedFiles={uploadedFiles}
                onRemoveUploadedFile={() => setUploadedFiles([])}
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

            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab("rack")}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "rack" ? "bg-gradient-to-r from-cyan-400 to-purple-400 text-black" : "bg-glass border border-white/5"}`}
                >
                  <Sliders className="w-3 h-3 inline mr-1" />
                  Rack
                </button>
                <button
                  onClick={() => setActiveTab("presets")}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "presets" ? "bg-gradient-to-r from-cyan-400 to-purple-400 text-black" : "bg-glass border border-white/5"}`}
                >
                  <Cpu className="w-3 h-3 inline mr-1" />
                  DAW
                </button>
              </div>

              {activeTab === "presets" && (
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
              )}
            </div>
          </div>
        </div>
      </main>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) setUploadedFiles([{ name: file.name, size: `${(file.size / 1024 / 1024).toFixed(2)} MB`, artistGuess: "Unknown" }]);
        }}
        className="hidden"
      />
    </div>
  );
}
