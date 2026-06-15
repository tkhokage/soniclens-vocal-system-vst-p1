let audioCtx: AudioContext | null = null;
let isInitialized = false;

// Audio player for genuine MP3 tracks & voice separation simulation
let audioPlayer: HTMLAudioElement | null = null;
let mediaSource: MediaElementAudioSourceNode | null = null;

// DSP effects nodes
let eqFilter: BiquadFilterNode | null = null;
let lpFilter: BiquadFilterNode | null = null;
let dynamicPeaking: BiquadFilterNode | null = null;
let saturationNode: WaveShaperNode | null = null;
let delayNode: DelayNode | null = null;
let delayFeedback: GainNode | null = null;
let reverbConvolver: DelayNode | null = null;
let reverbFeedback: GainNode | null = null;
let outputGain: GainNode | null = null;

// Synth sound nodes (fallback/sandbox sequencer)
let kickOsc: OscillatorNode | null = null;
let subGain: GainNode | null = null;
let synthGain: GainNode | null = null;
let vocalOsc: OscillatorNode | null = null;
let vocalFilter: BiquadFilterNode | null = null;
let vocalGain: GainNode | null = null;

// Sequencer intervals
let sequencerInterval: any = null;
let currentStep = 0;

// Presets frequencies (Drake/Travis/Uzi style scales)
const scaleNotes = [130.81, 146.83, 155.56, 174.61, 196.00, 220.00, 233.08, 261.63, 293.66, 311.13, 349.23, 392.00]; // C minor scale
const melodySteps = [7, 7, 9, 8, 7, 6, 5, 4, 3, 4, 5, 7, 9, 10, 8, 7];

// Dynamic configurations
export let config = {
  stemType: "vocals" as "full" | "vocals" | "instrumental",
  isPlaying: false,
  isAudioFileActive: false, // true when playing custom uploaded file or youtube source
  // Effect parameters (from knob settings)
  eqHighpass: 110, // Hz
  eqPresenceBoost: 6, // dB
  saturationDrive: 48, // %
  autotuneSpeed: 0, // ms retune speed
  reverbMix: 35, // %
  reverbDecay: 3.2, // seconds
  delayFeedbackAmount: 30, // %
  compressorRatio: 4, // 1176 styling
};

// Custom wavetable curve for Decapitator saturation distortion
function makeDistortionCurve(amount: number) {
  const k = typeof amount === "number" ? amount : 50;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

export function initAudio() {
  if (isInitialized) return;
  
  try {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioCtxClass();
    
    // Master Output Gain
    outputGain = audioCtx.createGain();
    outputGain.gain.setValueAtTime(0.45, audioCtx.currentTime);
    outputGain.connect(audioCtx.destination);

    // Create highpass filter node (FabFilter style EQ)
    eqFilter = audioCtx.createBiquadFilter();
    eqFilter.type = "highpass";
    eqFilter.frequency.setValueAtTime(config.eqHighpass, audioCtx.currentTime);

    // Create lowpass filter node (to isolate pocket vocal frequency range)
    lpFilter = audioCtx.createBiquadFilter();
    lpFilter.type = "lowpass";
    lpFilter.frequency.setValueAtTime(20000, audioCtx.currentTime); // default open wide

    // Create presence peaking filter
    dynamicPeaking = audioCtx.createBiquadFilter();
    dynamicPeaking.type = "peaking";
    dynamicPeaking.frequency.setValueAtTime(3500, audioCtx.currentTime);
    dynamicPeaking.Q.setValueAtTime(1.5, audioCtx.currentTime);
    dynamicPeaking.gain.setValueAtTime(config.eqPresenceBoost, audioCtx.currentTime);

    // Create saturation node (Decapitator style)
    saturationNode = audioCtx.createWaveShaper();
    saturationNode.curve = makeDistortionCurve(config.saturationDrive);
    saturationNode.oversample = "4x";

    // Setup stereo delay node
    delayNode = audioCtx.createDelay(1.0);
    delayNode.delayTime.setValueAtTime(0.35, audioCtx.currentTime);
    
    delayFeedback = audioCtx.createGain();
    delayFeedback.gain.setValueAtTime(config.delayFeedbackAmount / 100, audioCtx.currentTime);
    
    // Wire up delay feedback
    delayNode.connect(delayFeedback);
    delayFeedback.connect(delayNode);

    // Setup Reverb Node (Feedback Delay Network simulation)
    reverbConvolver = audioCtx.createDelay(2.0);
    reverbConvolver.delayTime.setValueAtTime(0.12, audioCtx.currentTime);
    
    reverbFeedback = audioCtx.createGain();
    reverbFeedback.gain.setValueAtTime((config.reverbMix / 100) * 0.7, audioCtx.currentTime);
    
    reverbConvolver.connect(reverbFeedback);
    reverbFeedback.connect(reverbConvolver);

    // Dynamic Connections for DSP rack:
    // Source -> eqFilter -> lpFilter -> dynamicPeaking -> saturationNode -> Output
    eqFilter.connect(lpFilter);
    lpFilter.connect(dynamicPeaking);
    dynamicPeaking.connect(saturationNode);
    
    // Dry Out
    saturationNode.connect(outputGain);
    
    // Delay Send Out
    saturationNode.connect(delayNode);
    delayNode.connect(outputGain);
    
    // Reverb Send Out
    saturationNode.connect(reverbConvolver);
    reverbConvolver.connect(outputGain);

    isInitialized = true;
    console.log("SonicLens Audio Engine initialized with real audio pipeline.");
  } catch (err) {
    console.warn("Web Audio API is not supported in this environment.", err);
  }
}

// Loads local audio files/buffers safely into the engine
export function loadAudioFileIntoEngine(fileOrBlobUrl: File | string) {
  initAudio();
  if (!audioCtx) return;

  if (!audioPlayer) {
    audioPlayer = new Audio();
    audioPlayer.crossOrigin = "anonymous";
    audioPlayer.loop = true;
    
    // Node connection
    mediaSource = audioCtx.createMediaElementSource(audioPlayer);
    mediaSource.connect(eqFilter!);
  }

  // Set the source blob or web url
  if (typeof fileOrBlobUrl === "string") {
    audioPlayer.src = fileOrBlobUrl;
  } else {
    audioPlayer.src = URL.createObjectURL(fileOrBlobUrl);
  }

  config.isAudioFileActive = true;
  audioPlayer.load();
  
  if (config.isPlaying) {
    audioPlayer.play().catch(e => console.warn("Audio play gesture required first.", e));
  }
}

// Removes active audio files from the engine and returns to sandbox synth mode
export function removeAudioFileFromEngine() {
  if (audioPlayer) {
    audioPlayer.pause();
    audioPlayer.src = "";
  }
  config.isAudioFileActive = false;
}

// Function to simulate a beat and melody step-by-step
function playStep() {
  if (!audioCtx || audioCtx.state === "suspended") return;
  const time = audioCtx.currentTime;

  // If a real audio file is active, we let it play and skip fallback synth sequences
  if (config.isAudioFileActive) {
    // Dynamically tweak the actual EQ response curve based on Stem state to isolate vocals/instrumentals
    if (eqFilter && lpFilter && dynamicPeaking) {
      if (config.stemType === "vocals") {
        // HIGHLY AGGRESSIVE acapella isolation bandpass pocket (280Hz - 3200Hz)
        // Highpass at 280Hz completely cuts sub, bass, and kick drums
        eqFilter.frequency.setValueAtTime(280, time);
        // Lowpass at 3200Hz completely rolls off hi-hats, crashes, and high synth sizzle
        lpFilter.frequency.setValueAtTime(3200, time);
        // Boost center vocal presence/harmonics (+10dB boost around 2.2kHz) for distinct acapella clarity
        dynamicPeaking.frequency.setValueAtTime(2200, time);
        dynamicPeaking.Q.setValueAtTime(1.0, time);
        dynamicPeaking.gain.setValueAtTime(config.eqPresenceBoost + 10, time);
      } else if (config.stemType === "instrumental") {
        // Deep notch filter to isolate and cancel out the vocal mid frequencies while keeping full instrumental ends
        eqFilter.frequency.setValueAtTime(50, time); // keep deep subs for drums/808
        lpFilter.frequency.setValueAtTime(18000, time); // keep high air/symbols
        // Apply high-attenuation notch in the vocal fundamental and formants range (1000Hz - 3000Hz)
        dynamicPeaking.frequency.setValueAtTime(1500, time);
        dynamicPeaking.Q.setValueAtTime(1.5, time);
        dynamicPeaking.gain.setValueAtTime(-30, time); // absolute vocal cancellation
      } else {
        // Balanced (Full mixed song) - restore full dynamic range
        eqFilter.frequency.setValueAtTime(config.eqHighpass, time);
        lpFilter.frequency.setValueAtTime(20000, time); // wide open
        dynamicPeaking.frequency.setValueAtTime(3500, time);
        dynamicPeaking.Q.setValueAtTime(1.5, time);
        dynamicPeaking.gain.setValueAtTime(config.eqPresenceBoost, time);
      }
    }
    return;
  }

  // 1. Synth Backbeat (drum chords sequencer)
  const isInstrumentalOn = config.stemType === "full" || config.stemType === "instrumental";
  
  if (isInstrumentalOn) {
    // 808 Kick
    if (currentStep % 4 === 0) {
      const kick = audioCtx.createOscillator();
      const kickGainNode = audioCtx.createGain();
      
      kick.connect(kickGainNode);
      kickGainNode.connect(outputGain!);
      
      kick.type = "sine";
      kick.frequency.setValueAtTime(110, time);
      kick.frequency.exponentialRampToValueAtTime(45, time + 0.25);
      
      kickGainNode.gain.setValueAtTime(0.3, time);
      kickGainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
      
      kick.start(time);
      kick.stop(time + 0.35);
    }

    // Hi-hats
    if (currentStep % 2 !== 0) {
      const bufferSize = audioCtx.sampleRate * 0.05;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      
      const filter = audioCtx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.setValueAtTime(7000, time);
      
      const hatGain = audioCtx.createGain();
      hatGain.gain.setValueAtTime(0.08, time);
      hatGain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
      
      noise.connect(filter);
      filter.connect(hatGain);
      hatGain.connect(outputGain!);
      
      noise.start(time);
      noise.stop(time + 0.05);
    }

    // Cord Pads (Warm backing)
    if (currentStep % 8 === 0) {
      const chords = [
        [130.81, 164.81, 196.00], // C major
        [116.54, 146.83, 174.61], // Bb major
      ];
      const chord = chords[(currentStep / 8) % chords.length];
      chord.forEach((freq) => {
        const padOsc = audioCtx!.createOscillator();
        const padGain = audioCtx!.createGain();
        padOsc.connect(padGain);
        padGain.connect(outputGain!);
        
        padOsc.type = "triangle";
        padOsc.frequency.setValueAtTime(freq, time);
        
        padGain.gain.setValueAtTime(0.0, time);
        padGain.gain.linearRampToValueAtTime(0.12, time + 0.2);
        padGain.gain.exponentialRampToValueAtTime(0.001, time + 1.8);
        
        padOsc.start(time);
        padOsc.stop(time + 1.9);
      });
    }
  }

  // 2. Lead vocal synthesizer
  const isVocalsOn = config.stemType === "full" || config.stemType === "vocals";
  
  if (isVocalsOn) {
    const noteIndex = melodySteps[currentStep];
    const targetFreq = scaleNotes[noteIndex];

    const voiceOsc = audioCtx.createOscillator();
    const voiceGain = audioCtx.createGain();
    const formantFilter = audioCtx.createBiquadFilter();

    voiceOsc.connect(formantFilter);
    formantFilter.connect(voiceGain);
    
    // Connect to dynamic FX chain
    voiceGain.connect(eqFilter!);

    voiceOsc.type = "sawtooth";
    
    // AutoTune latency speed simulation!
    const currentFreq = targetFreq;
    const prevFreq = scaleNotes[melodySteps[(currentStep - 1 + 16) % 16]];
    
    if (config.autotuneSpeed < 15) {
      // Hard tuned robotic
      voiceOsc.frequency.setValueAtTime(currentFreq, time);
    } else {
      // Natural fluid slide
      voiceOsc.frequency.setValueAtTime(prevFreq, time);
      voiceOsc.frequency.exponentialRampToValueAtTime(currentFreq, time + (config.autotuneSpeed / 1000));
    }

    // Vibrato LFO
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    lfo.frequency.setValueAtTime(6.2, time); 
    lfoGain.gain.setValueAtTime(3.0, time);
    lfo.connect(lfoGain);
    lfoGain.connect(voiceOsc.frequency);
    
    lfo.start(time);
    lfo.stop(time + 0.45);

    // Vowel formant bandpass simulation
    formantFilter.type = "bandpass";
    formantFilter.frequency.setValueAtTime(650, time);
    formantFilter.Q.setValueAtTime(2.0, time);

    voiceGain.gain.setValueAtTime(0.0, time);
    voiceGain.gain.linearRampToValueAtTime(0.24, time + 0.05);
    voiceGain.gain.exponentialRampToValueAtTime(0.001, time + 0.43);

    voiceOsc.start(time);
    voiceOsc.stop(time + 0.45);
  }

  currentStep = (currentStep + 1) % 16;
}

export function startPlayback() {
  initAudio();
  if (!audioCtx) return;

  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }

  config.isPlaying = true;
  currentStep = 0;
  
  if (config.isAudioFileActive && audioPlayer) {
    audioPlayer.play().catch(e => console.warn("Player trigger required inside active visual UI click.", e));
  }

  // 120 BPM -> 125ms per step
  sequencerInterval = setInterval(() => {
    playStep();
  }, 125);
}

export function stopPlayback() {
  config.isPlaying = false;
  
  if (audioPlayer) {
    audioPlayer.pause();
  }

  if (sequencerInterval) {
    clearInterval(sequencerInterval);
    sequencerInterval = null;
  }
}

// Function to update effects parameters live as knobs rotate
export function updateAudioParameters(params: Partial<typeof config>) {
  Object.assign(config, params);
  
  if (!isInitialized || !audioCtx) return;
  const time = audioCtx.currentTime;

  try {
    if (params.eqHighpass !== undefined && eqFilter) {
      eqFilter.frequency.setValueAtTime(params.eqHighpass, time);
    }
    
    if (params.eqPresenceBoost !== undefined && dynamicPeaking) {
      dynamicPeaking.gain.setValueAtTime(params.eqPresenceBoost, time);
    }
    
    if (params.saturationDrive !== undefined && saturationNode) {
      saturationNode.curve = makeDistortionCurve(params.saturationDrive);
    }
    
    if (params.reverbMix !== undefined && reverbFeedback) {
      const revGain = (params.reverbMix / 100) * 0.75;
      reverbFeedback.gain.setValueAtTime(revGain, time);
    }
    
    if (params.reverbDecay !== undefined && reverbConvolver) {
      const mappedTime = Math.min(2.0, Math.max(0.05, (params.reverbDecay / 5)));
      reverbConvolver.delayTime.setValueAtTime(mappedTime, time);
    }
    
    if (params.delayFeedbackAmount !== undefined && delayFeedback) {
      const fbAmount = Math.min(0.85, (params.delayFeedbackAmount / 100) * 0.65);
      delayFeedback.gain.setValueAtTime(fbAmount, time);
    }
  } catch (err) {
    console.error("Failed to update Audio node parameters dynamically:", err);
  }
}

export function setMasterVolume(val: number) {
  initAudio();
  if (outputGain && audioCtx) {
    const safeVol = Math.max(0, Math.min(1.0, val));
    outputGain.gain.setValueAtTime(safeVol, audioCtx.currentTime);
  }
}

export function setAudioPlayerTime(timeSec: number) {
  if (audioPlayer) {
    audioPlayer.currentTime = timeSec;
  }
}

export function getAudioPlayerStats() {
  if (audioPlayer && config.isAudioFileActive) {
    return {
      currentTime: audioPlayer.currentTime,
      duration: audioPlayer.duration || 180,
    };
  }
  return null;
}

