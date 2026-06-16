import React from "react";
import { Sparkles } from "lucide-react";

export default function PluginChainPanel({ chain }: { chain: any[] }) {
  if (!chain || chain.length === 0) {
    return (
      <div className="ps5-panel p-4" style={{minHeight:140}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <Sparkles />
          <strong>Preset Chain</strong>
        </div>
        <div className="muted" style={{marginTop:8}}>Upload a song or paste a link to see the detected vocal chain here.</div>
      </div>
    );
  }

  return (
    <div className="ps5-panel p-4" style={{minHeight:140}}>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <Sparkles />
        <strong>Detected Vocal Chain</strong>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr',gap:8,marginTop:12}}>
        {chain.map((p, i) => (
          <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:10,background:'linear-gradient(90deg,rgba(255,255,255,0.6),rgba(255,255,255,0.3))',borderRadius:10}}>
            <div>
              <div style={{fontWeight:800}}>{p.pluginName}</div>
              <div className="muted" style={{fontSize:12}}>{p.category} — {p.purpose || ''}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontWeight:700,color:'var(--accent)'}}>{p.keySettings || ''}</div>
              <div className="muted" style={{fontSize:12}}>{p.knobSettings ? Object.entries(p.knobSettings).map(([k,v])=>`${k}: ${v}`).join(', ') : ''}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
