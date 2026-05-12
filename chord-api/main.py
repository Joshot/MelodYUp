from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import librosa
import tempfile, os, shutil
from typing import List

app = FastAPI(title="MelodYUp Chord API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST"],
    allow_headers=["*"],
)

# ─── Note names ────────────────────────────────────────────────────────────────
NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

# ─── Chord vocabulary ─────────────────────────────────────────────────────────
CHORD_INTERVALS = {
    '':     [0, 4, 7],
    'm':    [0, 3, 7],
    '7':    [0, 4, 7, 10],
    'maj7': [0, 4, 7, 11],
    'm7':   [0, 3, 7, 10],
    'dim':  [0, 3, 6],
    'sus2': [0, 2, 7],
    'sus4': [0, 5, 7],
}

VOCAB = []
for root in range(12):
    for quality, ivs in CHORD_INTERVALS.items():
        VOCAB.append({'name': NOTES[root] + quality, 'root': root, 'intervals': ivs})
VOCAB.append({'name': 'N', 'root': -1, 'intervals': []})
N_CHORDS = len(VOCAB)

# ─── Chord chroma profiles ────────────────────────────────────────────────────
def chord_chroma_profile(root: int, intervals: List[int]) -> np.ndarray:
    weights = [3.0, 1.8, 1.4, 0.8]
    profile = np.zeros(12)
    if root < 0:
        return profile
    sorted_ivs = sorted(intervals)
    for i, iv in enumerate(sorted_ivs):
        pc = (root + iv) % 12
        w = weights[i] if i < len(weights) else 0.5
        profile[pc] += w
        # Tighter tolerance window (removed ±1 semitone smearing → cleaner)
        profile[(pc + 1) % 12] += w * 0.05
        profile[(pc - 1) % 12] += w * 0.05
    norm = np.linalg.norm(profile)
    return profile / norm if norm > 0 else profile

PROFILES = np.array([
    chord_chroma_profile(c['root'], c['intervals'])
    for c in VOCAB
])

# ─── HMM transition matrix ────────────────────────────────────────────────────
def build_hmm_transition(self_prob=0.75):  # was 0.85, tuned down for better chord changes
    T = np.full((N_CHORDS, N_CHORDS), 1e-6)
    for i, ci in enumerate(VOCAB):
        if ci['root'] < 0:
            T[i, :] = 1.0 / N_CHORDS
            continue
        T[i, i] = self_prob
        for j, cj in enumerate(VOCAB):
            if i == j or cj['root'] < 0:
                continue
            root_diff = abs(ci['root'] - cj['root'])
            root_diff = min(root_diff, 12 - root_diff)
            if root_diff in [5, 7]:    # P4/P5
                T[i, j] = 6e-4
            elif root_diff in [3, 4]:  # relative maj/min
                T[i, j] = 4e-4
            elif root_diff in [2]:     # step motion
                T[i, j] = 2e-4
            else:
                T[i, j] = 1e-5
        T[i] /= T[i].sum()
    return T

TRANS = build_hmm_transition()
LOG_TRANS = np.log(TRANS + 1e-10)

# ─── Vectorized Viterbi ───────────────────────────────────────────────────────
def viterbi(log_emissions: np.ndarray) -> np.ndarray:
    T_len, N = log_emissions.shape
    dp = np.full((T_len, N), -np.inf)
    bp = np.zeros((T_len, N), dtype=np.int32)
    dp[0] = log_emissions[0] - np.log(N)
    for t in range(1, T_len):
        # Vectorized: (N,1) + (N,N) broadcast
        trans_scores = dp[t-1, :, None] + LOG_TRANS  # (N, N)
        bp[t] = np.argmax(trans_scores, axis=0)
        dp[t] = trans_scores[bp[t], np.arange(N)] + log_emissions[t]
    path = np.zeros(T_len, dtype=int)
    path[-1] = np.argmax(dp[-1])
    for t in range(T_len - 2, -1, -1):
        path[t] = bp[t + 1, path[t + 1]]
    return path

# ─── Key detection (Krumhansl-Schmuckler) ─────────────────────────────────────
KS_MAJ = np.array([6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88])
KS_MIN = np.array([6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17])

def detect_key(global_chroma: np.ndarray):
    best_r, best_key, best_scale = -np.inf, 'C', 'major'
    for i in range(12):
        rot = np.roll(global_chroma, -i)
        r_maj = np.corrcoef(rot, KS_MAJ)[0, 1]
        r_min = np.corrcoef(rot, KS_MIN)[0, 1]
        if r_maj > best_r: best_r, best_key, best_scale = r_maj, NOTES[i], 'major'
        if r_min > best_r: best_r, best_key, best_scale = r_min, NOTES[i], 'minor'
    return best_key, best_scale

# ─── Main analysis endpoint ───────────────────────────────────────────────────
@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    suffix = os.path.splitext(file.filename or 'audio.mp3')[1] or '.mp3'
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        # 1. Load audio
        y, sr = librosa.load(tmp_path, sr=22050, mono=True)
        duration = librosa.get_duration(y=y, sr=sr)

        # 2. Harmonic-Percussive Source Separation (HPSS)
        # Removes drums/bass noise BEFORE chroma — this is the biggest accuracy boost
        y_harmonic, _ = librosa.effects.hpss(y, margin=3.0)

        # 3. Beat tracking on original (not harmonic — beats need transients)
        tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr, units='frames')
        bpm = int(round(float(tempo)))
        if bpm < 60: bpm *= 2
        if bpm > 200: bpm = bpm // 2
        bpm = max(60, min(200, bpm))
        beat_times = librosa.frames_to_time(beat_frames, sr=sr)
        total_beats = len(beat_times)

        # 4. CQT Chroma on harmonic signal only
        hop_length = 512
        chroma = librosa.feature.chroma_cqt(
            y=y_harmonic,
            sr=sr,
            hop_length=hop_length,
            bins_per_octave=36,
            norm=2,
        )

        # 5. Sync chroma to beats (median aggregate)
        beat_chroma = librosa.util.sync(
            chroma,
            beat_frames,
            aggregate=np.median,
        ).T  # (total_beats, 12)

        # 6. Key detection
        global_chroma = np.sum(beat_chroma, axis=0)
        global_chroma /= (np.linalg.norm(global_chroma) + 1e-10)
        key, scale = detect_key(global_chroma)

        # 7. Emission probabilities with better temperature
        beat_chroma_norm = beat_chroma / (np.linalg.norm(beat_chroma, axis=1, keepdims=True) + 1e-10)
        similarities = beat_chroma_norm @ PROFILES.T  # (T, N_CHORDS)

        TEMP = 0.55  # was 0.3 — smoother, less overconfident on wrong chords
        log_em = similarities / TEMP
        log_em -= np.max(log_em, axis=1, keepdims=True)
        log_em -= np.log(np.sum(np.exp(log_em), axis=1, keepdims=True) + 1e-10)

        # 8. Viterbi decode
        path = viterbi(log_em)
        chord_names = [VOCAB[p]['name'] for p in path]

        # 9. Smooth out single-beat outliers (if surrounded by same chord, replace it)
        smoothed = list(chord_names)
        for i in range(1, len(smoothed) - 1):
            if smoothed[i-1] == smoothed[i+1] and smoothed[i] != smoothed[i-1]:
                smoothed[i] = smoothed[i-1]

        # 10. Build output
        chords_out = []
        prev = None
        for i, (chord, t) in enumerate(zip(smoothed, beat_times)):
            disp = chord if chord != prev else None
            chords_out.append({
                'beat': i,
                'chord': chord,
                'chordDisplay': disp,
                'time': round(float(t), 3),
            })
            prev = chord

        return {
            'chords': chords_out,
            'bpm': bpm,
            'key': key,
            'scale': scale,
            'totalDuration': round(duration, 2),
            'totalBeats': total_beats,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        os.unlink(tmp_path)

@app.get("/health")
def health(): return {"status": "ok"}
