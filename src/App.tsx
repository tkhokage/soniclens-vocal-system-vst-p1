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
import AiChatBox from "./components/AiChatBox";

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
    <div className="ps5-shell relative min-h-screen">
      <header className="ps5-header">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div className="ps5-logo">VA</div>
          <div>
            <div className="ps5-title">Voice Analyzer</div>
            <div className="ps5-sub muted">Analyze • Deconstruct • Recreate</div>
          </div>
        </div>

        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{minWidth:320}} className="fade-in-up">
            <div className="ps5-panel" style={{display:'flex',alignItems:'center',gap:8}}>
              <Search className="w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="Search or paste a song / URL"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAnalyzeSong(searchInput, false); }}
                className="w-full bg-transparent outline-none"
                aria-label="Search"
              />
            </div>
          </div>

          <button onClick={() => fileInputRef.current?.click()} className="ps5-btn">Upload</button>
          <ThemeToggle />
        </div>
      </header>

      {/* HERO */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <section className="ps5-panel p-hero fade-in-up" style={{display:'grid',gridTemplateColumns:'1fr 480px',alignItems:'center',gap:36}}>
          <div>
            <h1 style={{fontSize:42,lineHeight:1.04,marginBottom:12}}>Studio-grade vocal separation, in one click.</h1>
            <p className="muted" style={{fontSize:16,marginBottom:20}}>Upload a track or paste a link and get instant stems, DAW-ready presets, and an AI-informed mixing recipe tailored to the artist's signature sound.</p>
            <div style={{display:'flex',gap:12}}>
              <button className="ps5-btn">Get Started — Upload</button>
              <button className="ps5-btn secondary">Explore Presets</button>
            </div>
            <div style={{marginTop:20,display:'flex',gap:12,alignItems:'center'}}>
              <div className="ps5-panel" style={{padding:'8px 12px'}}>
                <strong>{activeRecipe.songTitle}</strong>
                <div className="muted">{activeRecipe.artistName} • {activeRecipe.confidence}%</div>
              </div>
              <div className="muted">Trusted by pro engineers • Fast • Local processing</div>
            </div>
          </div>

          <div>
            <div className="ps5-hero-media">
              {/* simple illustrative graphic */}
              <svg width="320" height="200" viewBox="0 0 320 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="0" y="0" width="320" height="200" rx="12" fill="url(#g)" />
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#eef6ff"/>
                    <stop offset="1" stopColor="#fff0f6"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </section>

        {/* Features */}
        <section style={{marginTop:28}}>
          <div className="card-grid">
            <div className="ps5-panel fade-in-up">
              <h3 style={{marginBottom:8}}>Automatic Stem Separation</h3>
              <p className="muted">Isolate vocals, instruments, and more with studio-grade quality and low latency.</p>
            </div>
            <div className="ps5-panel fade-in-up">
              <h3 style={{marginBottom:8}}>DAW-ready Presets</h3>
              <p className="muted">One-click exports for Ableton, Logic, and more with recommended plugin chains.</p>
            </div>
            <div className="ps5-panel fade-in-up">
              <h3 style={{marginBottom:8}}>AI Mixing Recipes</h3>
              <p className="muted">Get suggested EQ/compression settings tuned to the detected vocal character.</p>
            </div>
          </div>
        </section>

        {/* Tools area */}
        <section style={{marginTop:28,display:'grid',gridTemplateColumns:'2fr 1fr',gap:20}}>
          <div className="ps5-panel fade-in-up">
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

          <div className="ps5-panel fade-in-up">
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
        </section>

        {/* Footer */}
        <footer style={{marginTop:40,textAlign:'center',color:'#6b7280'}}>
          © {new Date().getFullYear()} SonicLens — Built for creators
        </footer>
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
      <AiChatBox />
    </div>
  );
}
