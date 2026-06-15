import React from "react";
import { Cpu } from "lucide-react";
import { motion } from "motion/react";

interface Plugin {
  pluginName: string;
  category: string;
  purpose: string;
  keySettings: string;
  knobSettings?: Record<string, number>;
}

interface DynamicVstCardProps {
  plugin: Plugin;
  index: number;
  isPlaying?: boolean;
}

export default function DynamicVstCard({ plugin, index, isPlaying = false }: DynamicVstCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="ps5-panel p-6 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-400/20 to-purple-400/20">
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h4 className="font-bold text-sm">{plugin.pluginName}</h4>
            <p className="text-xs text-cyan-400">{plugin.category}</p>
          </div>
        </div>
      </div>

      <p className="text-xs text-zinc-400">{plugin.purpose}</p>

      <div className="bg-black/20 rounded p-2 border border-white/5 mt-2">
        <p className="text-xs text-zinc-300 font-mono">{plugin.keySettings}</p>
      </div>

      {isPlaying && (
        <div className="flex items-center gap-1 mt-2">
          {[1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              className="flex-1 h-1 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 0.8 + i * 0.1, repeat: Infinity }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
