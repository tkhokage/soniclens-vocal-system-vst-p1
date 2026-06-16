SonicLens Analysis Microservice

This FastAPI service extracts audio from YouTube URLs (via `yt-dlp`) and computes audio features with `librosa` to heuristically infer which vocal plugins/effects may have been used.

Requirements

- Python 3.10+
- Install dependencies:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Run

```bash
uvicorn app:app --host 0.0.0.0 --port 9000 --reload
```

API

POST /analyze
Body: JSON { "url": "https://youtube.com/..." }
Returns: { features: {...}, detectedChain: [...] }

Notes

- This is a heuristic-based detector and not 100% accurate; for better accuracy consider training a classifier with labeled examples or integrating crepe/torch-based pitch models.
- `yt-dlp` must be installed and available in PATH.
