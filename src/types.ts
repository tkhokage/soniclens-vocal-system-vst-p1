export type PluginCategory = "EQ" | "Compression" | "Saturation" | "Pitch Correction" | "Reverb" | "Delay" | "Special";

export interface PluginSetting {
  pluginName: string;
  category: PluginCategory;
  purpose: string;
  keySettings: string;
  knobSettings: { [knobName: string]: number }; // percentage 0-100 values
}

export interface VocalRecipe {
  id: string;
  songTitle: string;
  artistName: string;
  confidence: number;
  detectedChain: PluginSetting[];
  simplifiedChain: string[];
  artistDna: { [artistName: string]: number };
  explanation: string;
  frequencyCritique: string;
  acapellaAcousticsDescription: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface TrackState {
  title: string;
  artist: string;
  youtubeUrl?: string;
  fileName?: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  stemType: "full" | "vocals" | "instrumental";
}
