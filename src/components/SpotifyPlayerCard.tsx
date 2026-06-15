import React from "react";
import { VocalRecipe } from "../types";
import { Play, Pause, Trash2, Music, Tv } from "lucide-react";
import { motion } from "motion/react";

interface SpotifyPlayerCardProps {
  activeRecipe: VocalRecipe;
  isPlaying: boolean;
  stemSelected: "full" | "vocals" | "instrumental";
  onStemChange: (stem: "full" | "vocals" | "instrumental") => void;
  uploadedFiles: { name: string; size: string; artistGuess: string }[];
  onRemoveUploadedFile: (idx: number) => void;
  youtubeInput: string;
  setYoutubeInput: (val: string) => void;
  onAnalyzeSong: (val: string, isYoutube: boolean) => void;
  onTogglePlayback: () => void;
  retuneCtrl: number;
  highpassCtrl: number;
  presenceCtrl: number;
  driveCtrl: number;
  reverbMixCtrl: number;
}

export default function SpotifyPlayerCard({
  activeRecipe,
  isPlaying,
  stemSelected,
  onStemChange,
  uploadedFiles,
  onRemoveUploadedFile,
  youtubeInput,
  setYoutubeInput,
  onAnalyzeSong,
  onTogglePlayback,
  retuneCtrl,
  highpassCtrl,
  presenceCtrl,
  driveCtrl,
  reverbMixCtrl
}: SpotifyPlayerCardProps) {
  return (
    <div className="ps5-panel p-8 flex flex-col gap-6">
      {/* Song Info */}
      <div className="flex gap-4 items-start">
        <div className="w-24 h-24 bg-gradient-to-br from-cyan-400/20 to-purple-400/20 rounded-lg border border-cyan-400/30 flex items-center justify-center flex-shrink-0">
          <Music className="w-12 h-12 text-[#2563eb]" />
        </div>
        <div className="flex-1">
          <h3 className="text-2xl font-bold mb-1 headline-large">{activeRecipe.songTitle}</h3>
          <p className="text-[#0f172a] font-semibold" style={{opacity:0.8}}>{activeRecipe.artistName}</p>
          <p className="text-sm muted mt-3">{activeRecipe.acapellaAcousticsDescription}</p>
        </div>
      </div>

      {/* Stem Selection */}
      <div style={{display:'flex',gap:10}}>
        {(["full", "vocals", "instrumental"] as const).map((stem) => (
          <button
            key={stem}
            onClick={() => onStemChange(stem)}
            className={`flex-1 px-3 py-2 rounded-xl text-sm font-semibold transition-all capitalize`}
            style={stemSelected === stem ? {background:'linear-gradient(90deg,var(--accent),var(--accent-2))',color:'#fff'} : {border:'1px solid rgba(15,23,42,0.06)'}}
          >
            {stem}
          </button>
        ))}
      </div>

      {/* YouTube Input */}
      <div style={{display:'flex',gap:8}}>
        <input
          type="text"
          placeholder="Paste YouTube URL..."
          value={youtubeInput}
          onChange={(e) => setYoutubeInput(e.target.value)}
          className="flex-1 px-4 py-2 rounded-lg border" 
          style={{borderColor:'rgba(15,23,42,0.06)'}}
        />
        <button onClick={() => onAnalyzeSong(youtubeInput, true)} className="ps5-btn" style={{padding:'10px 14px'}}>
          <Tv className="w-4 h-4" />
        </button>
      </div>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="rounded-lg p-3" style={{border:'1px solid rgba(15,23,42,0.04)'}}>
          <p className="text-xs muted font-mono uppercase mb-3">Loaded Files</p>
          <div className="space-y-2">
            {uploadedFiles.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span style={{fontWeight:600}}>{file.name}</span>
                <button onClick={() => onRemoveUploadedFile(idx)} style={{color:'#ef4444'}}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Control Readout */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded p-3" style={{border:'1px solid rgba(15,23,42,0.04)'}}>
          <div className="muted">Retune</div>
          <div style={{fontWeight:800,color:'var(--accent)'}}>{retuneCtrl}ms</div>
        </div>
        <div className="rounded p-3" style={{border:'1px solid rgba(15,23,42,0.04)'}}>
          <div className="muted">High Pass</div>
          <div style={{fontWeight:800,color:'var(--accent)'}}>{highpassCtrl}Hz</div>
        </div>
        <div className="rounded p-3" style={{border:'1px solid rgba(15,23,42,0.04)'}}>
          <div className="muted">Presence</div>
          <div style={{fontWeight:800,color:'var(--accent)'}}>+{presenceCtrl}dB</div>
        </div>
        <div className="rounded p-3" style={{border:'1px solid rgba(15,23,42,0.04)'}}>
          <div className="muted">Drive</div>
          <div style={{fontWeight:800,color:'var(--accent)'}}>+{driveCtrl}%</div>
        </div>
      </div>
    </div>
  );
}
