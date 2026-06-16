import os
import tempfile
import subprocess
from typing import Optional
from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
import uvicorn
import numpy as np
import librosa
import soundfile as sf

app = FastAPI(title="SonicLens Analysis Service")

class AnalyzeRequest(BaseModel):
    url: Optional[str] = None
    filename: Optional[str] = None


def download_youtube_audio(url: str, dest: str) -> str:
    # Use yt-dlp to download best audio and convert to wav
    cmd = [
        "yt-dlp",
        "-f",
        "bestaudio",
        "--extract-audio",
        "--audio-format",
        "wav",
        "-o",
        dest,
        url,
    ]
    subprocess.run(cmd, check=True)
    return dest


def compute_features(path: str):
    y, sr = librosa.load(path, sr=None, mono=True)
    # RMS
    rms = librosa.feature.rms(y=y)[0]
    rms_mean = float(np.mean(rms))
    # Spectral centroid
    spec_cent = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
    spec_cent_mean = float(np.mean(spec_cent))
    # Spectral bandwidth
    spec_bw = librosa.feature.spectral_bandwidth(y=y, sr=sr)[0]
    spec_bw_mean = float(np.mean(spec_bw))
    # Zero crossing rate
    zcr = librosa.feature.zero_crossing_rate(y)[0]
    zcr_mean = float(np.mean(zcr))
    # Tonal pitch (YIN)
    try:
        f0 = librosa.yin(y, fmin=50, fmax=2000, sr=sr)
        f0_clean = f0[~np.isnan(f0)]
        pitch_mean = float(np.mean(f0_clean)) if len(f0_clean) > 0 else 0.0
        pitch_std = float(np.std(f0_clean)) if len(f0_clean) > 0 else 0.0
    except Exception:
        pitch_mean = 0.0
        pitch_std = 0.0
    # Estimate reverb decay via energy envelope
    hop_length = 512
    frame_len = 2048
    energy = np.array([np.sum(np.abs(y[i:i+frame_len]**2)) for i in range(0, len(y), hop_length)])
    # find median energy peaks and measure decay after peaks
    peaks = np.where(energy > np.percentile(energy, 90))[0]
    decays = []
    for p in peaks[:20]:
        baseline = energy[p]
        idx = p
        while idx < len(energy) and energy[idx] > baseline * 0.1:
            idx += 1
        decays.append((idx - p) * (hop_length / sr))
    decay_mean = float(np.mean(decays)) if len(decays) > 0 else 0.0

    return {
        'rms_mean': rms_mean,
        'spec_cent_mean': spec_cent_mean,
        'spec_bw_mean': spec_bw_mean,
        'zcr_mean': zcr_mean,
        'pitch_mean': pitch_mean,
        'pitch_std': pitch_std,
        'decay_mean': decay_mean,
        'duration': float(len(y) / sr)
    }


def heuristics_to_chain(features: dict):
    chain = []
    # Autotune-like detection: low pitch std and many voiced frames
    if features['pitch_std'] < 1.2 and features['duration'] > 10:
        chain.append({
            'pluginName': 'Auto-Tune Pro',
            'category': 'Pitch Correction',
            'purpose': 'Pitch correction',
            'keySettings': 'Retune Speed: 0-10ms',
            'knobSettings': {'Retune Speed': 0}
        })
    # Reverb detection
    if features['decay_mean'] > 0.6:
        chain.append({
            'pluginName': 'Valhalla VintageVerb',
            'category': 'Reverb',
            'purpose': 'Room/space',
            'keySettings': f'Decay {round(features["decay_mean"],2)}s',
            'knobSettings': {'Decay': round(features['decay_mean'],2)}
        })
    # Saturation/distortion estimation via RMS and spectral flatness
    if features['rms_mean'] > 0.01 or features['spec_bw_mean'] > 2000:
        chain.append({
            'pluginName': 'Decapitator (Saturation)',
            'category': 'Saturation',
            'purpose': 'Warmth / harmonic distortion',
            'keySettings': 'Drive: moderate',
            'knobSettings': {'Drive': 24}
        })
    # EQ presence detection: high spectral centroid suggests bright top end
    if features['spec_cent_mean'] > 2000:
        chain.append({
            'pluginName': 'FabFilter Pro-Q 3',
            'category': 'EQ',
            'purpose': 'Presence boost',
            'keySettings': 'Boost around 2-4kHz',
            'knobSettings': {'2-4kHz': '+2dB'}
        })
    if not chain:
        # fallback generic chain
        chain = [
            {'pluginName': 'Auto-Tune Pro', 'category': 'Pitch Correction', 'purpose': 'Subtle pitch', 'keySettings': 'Retune Speed: 12ms', 'knobSettings': {'Retune Speed': 12}},
            {'pluginName': 'FabFilter Pro-Q 3', 'category': 'EQ', 'purpose': 'Tonal shaping', 'keySettings': 'Low cut 40Hz', 'knobSettings': {'Low cut': 40}}
        ]
    return chain


@app.post('/analyze')
async def analyze(request: AnalyzeRequest):
    tmpdir = tempfile.mkdtemp()
    try:
        if request.url:
            # download to tmp file
            outpath = os.path.join(tmpdir, 'yt_audio.wav')
            # yt-dlp output template
            # run yt-dlp and write to outpath
            cmd = ['yt-dlp', '-f', 'bestaudio', '--extract-audio', '--audio-format', 'wav', '-o', outpath, request.url]
            subprocess.run(cmd, check=True)
            audio_path = outpath
        else:
            # no url provided: return error
            return {'error': 'no url or filename provided'}

        features = compute_features(audio_path)
        chain = heuristics_to_chain(features)
        return {'features': features, 'detectedChain': chain}
    except Exception as e:
        return {'error': str(e)}
    finally:
        try:
            for f in os.listdir(tmpdir):
                os.remove(os.path.join(tmpdir, f))
            os.rmdir(tmpdir)
        except Exception:
            pass


if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=9000)
