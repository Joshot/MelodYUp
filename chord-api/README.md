# MelodYUp Chord API

Python FastAPI microservice for audio chord analysis.

## Stack
- **librosa** — CQT chroma extraction (constant-Q transform, 36 bins/octave)
- **Viterbi HMM** — chord sequence smoothing with music-theory transition matrix
- **Krumhansl-Schmuckler** — key detection

## Run locally

```bash
cd chord-api
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Test:
```bash
curl -X POST http://localhost:8000/analyze -F "file=@song.mp3"
```

## Deploy to Railway

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select the `MelodYUp` repo
3. Set **Root Directory** to `chord-api`
4. Railway auto-detects Dockerfile and deploys
5. Copy the generated URL → add to Next.js `.env.local`:

```
CHORD_API_URL=https://your-service.railway.app
```

## Deploy to Render (free tier)

1. Go to [render.com](https://render.com) → New Web Service
2. Connect GitHub → select `MelodYUp` repo
3. Root Directory: `chord-api`
4. Build Command: `pip install -r requirements.txt`
5. Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Instance Type: **Free**
