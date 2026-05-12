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

# ─── Chord vocabulary (built from intervals, not templates) ───────────────────
# Each chord is defined by its interval set from root
CHORD_INTERVALS = {
    '':     [0, 4, 7],          # major
    'm':    [0, 3, 7],          # minor
    '7':    [0, 4, 7, 10],     # dominant 7
    'maj7': [0, 4, 7, 11],     # major 7
    'm7':   [0, 3, 7, 10],     # minor 7
    'dim':  [0, 3, 6],         # diminished
    'dim7': [0, 3, 6, 9],      # fully diminished
    'sus2': [0, 2, 7],         # sus2
    'sus4': [0, 5, 7],         # sus4
    'add9': [0, 2, 4, 7],      # add9
}

# Build all 12 chords * len(types) chord labels + 'N' (no chord)
VOCAB = []
for root in range(12):
    for quality, ivs in CHORD_INTERVALS.items():
        VOCAB.append({'name': NOTES[root] + quality, 'root': root, 'intervals': ivs})
VOCAB.append({'name': 'N', 'root': -1, 'intervals': []})  # no chord
N_CHORDS = len(VOCAB)

# ─── Build chroma profile per chord from intervals ────────────────────────────
# This is the key: profile = weighted sum of interval activations, NOT a fixed template
def chord_chroma_profile(root: int, intervals: List[int]) -> np.ndarray:
    """Build a chroma profile from a chord's interval structure.
    Root gets highest weight, then third, then fifth, then extensions.
    This reflects real acoustic energy distribution."""
    weights = [3.0, 1.5, 1.2, 0.8]  # root, 3rd/2nd, 5th/4th, extensions
    profile = np.zeros(12)
    if root < 0:
        return profile
    # Sort intervals by harmonic importance (root=0 always first)
    sorted_ivs = sorted(intervals)
    for i, iv in enumerate(sorted_ivs):
        pc = (root + iv) % 12
        w = weights[i] if i < len(weights) else 0.5
        profile[pc] += w
        # Add slight energy to adjacent semitones (tuning tolerance + overtones)
        profile[(pc + 1) % 12] += w * 0.1
        profile[(pc - 1) % 12] += w * 0.1
    # L2 normalize
    norm = np.linalg.norm(profile)
    return profile / norm if norm > 0 else profile

PROFILES = np.array([
    chord_chroma_profile(c['root'], c['intervals'])
    for c in VOCAB
])

# ─── HMM transition matrix (music-theory informed) ───────────────────────────
def build_hmm_transition(self_prob=0.85):
    """Build a chord-to-chord transition matrix.
    - High self-transition (chord tends to hold)
    - Neighboring chords on circle of fifths get higher probability
    - All other transitions share the remaining probability
    """
    T = np.full((N_CHORDS, N_CHORDS), 1e-6)

    for i, ci in enumerate(VOCAB):
        if ci['root'] < 0:  # no-chord row
            T[i, :] = 1.0 / N_CHORDS
            continue

        # Self-transition
        T[i, i] = self_prob
        remaining = 1.0 - self_prob

        # Circle-of-fifths neighbors (±5 semitones) get 3x base probability
        for j, cj in enumerate(VOCAB):
            if i == j or cj['root'] < 0:
                continue
            root_diff = abs(ci['root'] - cj['root'])
            root_diff = min(root_diff, 12 - root_diff)

            # Common progressions: P5 up/down, relative major/minor (3 semitones)
            if root_diff in [5, 7]:    # Perfect 4th/5th
                T[i, j] = 3e-4
            elif root_diff in [3, 4]:  # Minor/major 3rd (relative key)
                T[i, j] = 2e-4
            else:
                T[i, j] = 1e-5

        # Normalize row
        T[i] /= T[i].sum()

    return T

TRANS = build_hmm_transition()
LOG_TRANS = np.log(TRANS + 1e-10)

# ─── Viterbi decoder ──────────────────────────────────────────────────────────
def viterbi(log_emissions: np.ndarray) -> np.ndarray:
    """Viterbi algorithm over chord sequence.
    log_emissions: shape (T, N_CHORDS)
    Returns: shape (T,) array of chord indices
    """
    T, N = log_emissions.shape
    dp = np.full((T, N), -np.inf)
    bp = np.zeros((T, N), dtype=int)

    dp[0] = log_emissions[0] - np.log(N)  # uniform prior

    for t in range(1, T):
        for j in range(N):
            vals = dp[t-1] + LOG_TRANS[:, j]
            bp[t, j] = np.argmax(vals)
            dp[t, j] = vals[bp[t, j]] + log_emissions[t, j]

    # Backtrack
    path = np.zeros(T, dtype=int)
    path[-1] = np.argmax(dp[-1])
    for t in range(T-2, -1, -1):
        path[t] = bp[t+1, path[t+1]]

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
    # Save to temp file
    suffix = os.path.splitext(file.filename or 'audio.mp3')[1] or '.mp3'
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        # ── 1. Load audio ─────────────────────────────────────────────────────
        y, sr = librosa.load(tmp_path, sr=22050, mono=True)
        duration = librosa.get_duration(y=y, sr=sr)

        # ── 2. Beat tracking ──────────────────────────────────────────────────
        tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr, units='frames')
        bpm = int(round(float(tempo)))
        if bpm < 60: bpm *= 2
        if bpm > 200: bpm = bpm // 2
        bpm = max(60, min(200, bpm))
        beat_times = librosa.frames_to_time(beat_frames, sr=sr)
        total_beats = len(beat_times)

        # ── 3. CQT Chroma (much better than STFT for music) ───────────────────
        # chroma_cqt uses constant-Q transform: resolves pitch better at low freqs
        hop_length = 512
        chroma = librosa.feature.chroma_cqt(
            y=y, sr=sr,
            hop_length=hop_length,
            bins_per_octave=36,   # 3x oversampled for tuning accuracy
            norm=2,               # L2 norm per frame
        )  # shape: (12, T_frames)

        # ── 4. Synchronize chroma to beats ────────────────────────────────────
        beat_chroma = librosa.util.sync(
            chroma,
            beat_frames,
            aggregate=np.median,  # median is more robust than mean
        )  # shape: (12, total_beats)
        # Transpose: (total_beats, 12)
        beat_chroma = beat_chroma.T

        # ── 5. Global chroma for key detection ────────────────────────────────
        global_chroma = np.sum(beat_chroma, axis=0)
        global_chroma /= (np.linalg.norm(global_chroma) + 1e-10)
        key, scale = detect_key(global_chroma)

        # ── 6. Emission probabilities ─────────────────────────────────────────
        # Cosine similarity between each beat's chroma and each chord's profile
        # dot product since both are L2-normalized
        # shape: (total_beats, N_CHORDS)
        beat_chroma_norm = beat_chroma / (np.linalg.norm(beat_chroma, axis=1, keepdims=True) + 1e-10)
        similarities = beat_chroma_norm @ PROFILES.T  # (T, N_CHORDS)

        # Convert to log probabilities via softmax with temperature
        TEMP = 0.3  # lower = more confident
        log_emissions = similarities / TEMP
        log_emissions -= np.max(log_emissions, axis=1, keepdims=True)  # numerical stability
        log_emissions -= np.log(np.sum(np.exp(log_emissions), axis=1, keepdims=True) + 1e-10)

        # ── 7. Viterbi decode ─────────────────────────────────────────────────
        path = viterbi(log_emissions)
        chord_names = [VOCAB[p]['name'] for p in path]

        # ── 8. Build result ───────────────────────────────────────────────────
        beat_dur = 60.0 / bpm
        chords_out = []
        prev = None
        for i, (chord, t) in enumerate(zip(chord_names, beat_times)):
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
