import React, { useState } from "react";
import { VocalRecipe } from "../types";
import { Copy, Check, Cpu } from "lucide-react";

interface VstPresetsDeckProps {
  activeRecipe: VocalRecipe;
  retuneCtrl: number;
  highpassCtrl: number;
  presenceCtrl: number;
  ratioCtrl: number;
  driveCtrl: number;
  reverbMixCtrl: number;
  reverbDecayCtrl: number;
  delayFbCtrl: number;
}

export default function VstPresetsDeck({
  activeRecipe,
  retuneCtrl,
  highpassCtrl,
  presenceCtrl,
  ratioCtrl,
  driveCtrl,
  reverbMixCtrl,
  reverbDecayCtrl,
  delayFbCtrl,
}: VstPresetsDeckProps) {
  const [copied, setCopied] = useState(false);

  const presets = [
    { daw: "Ableton Live", icon: "🔊" },
    { daw: "FL Studio", icon: "🎹" },
    { daw: "Logic Pro", icon: "🍎" },
    { daw: "Pro Tools", icon: "🎙️" },
  ];

  const plugins = [
    { name: "Auto-Tune Pro", setting: `Retune: ${retuneCtrl}ms` },
    { name: "FabFilter Pro-Q 3", setting: `High-Pass: ${highpassCtrl}Hz` },
    { name: "Compressor", setting: `Ratio: ${ratioCtrl}:1` },
    { name: "Saturation", setting: `Drive: +${driveCtrl}%` },
    { name: "Reverb", setting: `Mix: ${reverbMixCtrl}%` },
    { name: "Delay", setting: `Feedback: ${delayFbCtrl}%` },
  ];

  const copyToClipboard = () => {
    const text = plugins.map(p => `${p.name}: ${p.setting}`).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="ps5-panel p-6 flex flex-col gap-4">
      {/* DAW Presets */}
      <div>
        <p className="text-xs muted font-mono uppercase tracking-wider mb-3">DAW Presets</p>
        <div className="grid grid-cols-2 gap-2">
          {presets.map((preset, idx) => (
            <button
              key={idx}
              className="px-3 py-2 rounded-lg text-xs font-semibold"
              style={{border:'1px solid rgba(15,23,42,0.06)'}}
            >
              <span style={{marginRight:8}}>{preset.icon}</span>
              {preset.daw}
            </button>
          ))}
        </div>
      </div>

      {/* Plugin Settings */}
      <div style={{borderTop:'1px solid rgba(15,23,42,0.04)',paddingTop:12}}>
        <p className="text-xs muted font-mono uppercase tracking-wider mb-3">Plugin Settings</p>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {plugins.map((plugin, idx) => (
            <div key={idx} className="flex justify-between items-center text-sm rounded p-2" style={{border:'1px solid rgba(15,23,42,0.04)'}}>
              <span style={{fontWeight:600}}>{plugin.name}</span>
              <span style={{color:'var(--accent)',fontWeight:700}}>{plugin.setting}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Copy Button */}
      <button
        onClick={copyToClipboard}
        className="w-full px-4 py-2 rounded-lg text-black font-semibold text-sm flex items-center justify-center gap-2"
        style={{background:'linear-gradient(90deg,var(--accent),var(--accent-2))'}}
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        {copied ? "Copied!" : "Copy Preset"}
      </button>
    </div>
  );
}
