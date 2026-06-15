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
          <Music className="w-12 h-12 text-cyan-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-2xl font-bold mb-1">{activeRecipe.songTitle}</h3>
          <p className="text-cyan-400 font-semibold">{activeRecipe.artistName}</p>
          <p className="text-sm text-zinc-400 mt-3">{activeRecipe.acapellaAcousticsDescription}</p>
        </div>
      </div>

      {/* Stem Selection */}
      <div className="flex gap-2">
        {(["full", "vocals", "instrumental"] as const).map((stem) => (
          <button
            key={stem}
            onClick={() => onStemChange(stem)}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${
              stemSelected === stem
                ? "bg-gradient-to-r from-cyan-400 to-purple-400 text-black"
                : "bg-glass border border-white/10 text-white hover:border-cyan-400/40"
            }`}
          >
            {stem}
          </button>
        ))}
      </div>

      {/* YouTube Input */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Paste YouTube URL..."
          value={youtubeInput}
          onChange={(e) => setYoutubeInput(e.target.value)}
          className="flex-1 px-4 py-2 rounded-lg bg-glass border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-cyan-400/40"
        />
        <button
          onClick={() => onAnalyzeSong(youtubeInput, true)}
          className="ps5-btn flex items-center gap-2"
        >
          <Tv className="w-4 h-4" />
          Load
        </button>
      </div>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="bg-black/20 rounded-lg p-4 border border-white/5">
          <p className="text-xs text-cyan-400/60 font-mono uppercase mb-3">Loaded Files</p>
          <div className="space-y-2">
            {uploadedFiles.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-white">{file.name}</span>
                <button
                  onClick={() => onRemoveUploadedFile(idx)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Control Readout */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-black/30 rounded p-3 border border-white/5">
          <span className="text-zinc-400 block">Retune</span>
          <span className="text-cyan-300 font-bold">{retuneCtrl}ms</span>
        </div>
        <div className="bg-black/30 rounded p-3 border border-white/5">
          <span className="text-zinc-400 block">High Pass</span>
          <span className="text-cyan-300 font-bold">{highpassCtrl}Hz</span>
        </div>
        <div className="bg-black/30 rounded p-3 border border-white/5">
          <span className="text-zinc-400 block">Presence</span>
          <span className="text-cyan-300 font-bold">+{presenceCtrl}dB</span>
        </div>
        <div className="bg-black/30 rounded p-3 border border-white/5">
          <span className="text-zinc-400 block">Drive</span>
          <span className="text-cyan-300 font-bold">+{driveCtrl}%</span>
        </div>
      </div>
    </div>
  );
}
