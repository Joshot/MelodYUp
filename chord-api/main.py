from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import librosa
import tempfile, os, shutil
from scipy.ndimage import median_filter
from typing import List

app = FastAPI(title="MelodYUp Chord API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["POST"], allow_headers=["*"])

NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
ENHARMONIC = {'C#':'Db','D#':'Eb','F#':'Gb','G#':'Ab','A#':'Bb'}

# Diatonic chords per key (major: I ii iii IV V vi vii°, minor: i ii° III iv v VI VII)
DIATONIC = {
    # major keys  (root_semitone: [(root, quality), ...])
    0:  [(0,''),(2,'m'),(4,'m'),(5,''),(7,''),(9,'m'),(11,'dim')],   # C
    2:  [(2,''),(4,'m'),(6,'m'),(7,''),(9,''),(11,'m'),(1,'dim')],   # D
    4:  [(4,''),(6,'m'),(8,'m'),(9,''),(11,''),(1,'m'),(3,'dim')],   # E
    5:  [(5,''),(7,'m'),(9,'m'),(10,''),(0,''),(2,'m'),(4,'dim')],   # F
    7:  [(7,''),(9,'m'),(11,'m'),(0,''),(2,''),(4,'m'),(6,'dim')],   # G
    9:  [(9,''),(11,'m'),(1,'m'),(2,''),(4,''),(6,'m'),(8,'dim')],   # A
    11: [(11,''),(1,'m'),(3,'m'),(4,''),(6,''),(8,'m'),(10,'dim')],  # B
    1:  [(1,''),(3,'m'),(5,'m'),(6,''),(8,''),(10,'m'),(0,'dim')],   # Db
    3:  [(3,''),(5,'m'),(7,'m'),(8,''),(10,''),(0,'m'),(2,'dim')],   # Eb
    6:  [(6,''),(8,'m'),(10,'m'),(11,''),(1,''),(3,'m'),(5,'dim')],  # Gb
    8:  [(8,''),(10,'m'),(0,'m'),(1,''),(3,''),(5,'m'),(7,'dim')],   # Ab
    10: [(10,''),(0,'m'),(2,'m'),(3,''),(5,''),(7,'m'),(9,'dim')],   # Bb
}
DIATONIC_MINOR = {
    # natural minor keys
    9:  [(9,'m'),(11,'dim'),(0,''),(2,'m'),(4,'m'),(5,''),(7,'')],   # Am
    11: [(11,'m'),(1,'dim'),(2,''),(4,'m'),(6,'m'),(7,''),(9,'')],   # Bm
    1:  [(1,'m'),(3,'dim'),(4,''),(6,'m'),(8,'m'),(9,''),(11,'')],   # C#m
    3:  [(3,'m'),(5,'dim'),(6,''),(8,'m'),(10,'m'),(11,''),(1,'')],  # Ebm
    4:  [(4,'m'),(6,'dim'),(7,''),(9,'m'),(11,'m'),(0,''),(2,'')],   # Em
    6:  [(6,'m'),(8,'dim'),(9,''),(11,'m'),(1,'m'),(2,''),(4,'')],   # F#m
    8:  [(8,'m'),(10,'dim'),(11,''),(1,'m'),(3,'m'),(4,''),(6,'')],  # G#m
    0:  [(0,'m'),(2,'dim'),(3,''),(5,'m'),(7,'m'),(8,''),(10,'')],   # Cm
    2:  [(2,'m'),(4,'dim'),(5,''),(7,'m'),(9,'m'),(10,''),(0,'')],   # Dm
    5:  [(5,'m'),(7,'dim'),(8,''),(10,'m'),(0,'m'),(1,''),(3,'')],   # Fm
    7:  [(7,'m'),(9,'dim'),(10,''),(0,'m'),(2,'m'),(3,''),(5,'')],   # Gm
    10: [(10,'m'),(0,'dim'),(1,''),(3,'m'),(5,'m'),(6,''),(8,'')],   # Bbm
}

CHORD_INTERVALS = {
    '':    [0, 4, 7],
    'm':   [0, 3, 7],
    '7':   [0, 4, 7, 10],
    'maj7':[0, 4, 7, 11],
    'm7':  [0, 3, 7, 10],
    'dim': [0, 3, 6],
    'sus2':[0, 2, 7],
    'sus4':[0, 5, 7],
}

VOCAB = []
for root in range(12):
    for quality, ivs in CHORD_INTERVALS.items():
        VOCAB.append({'name': NOTES[root] + quality, 'root': root, 'intervals': ivs})
VOCAB.append({'name': 'N', 'root': -1, 'intervals': []})
N_CHORDS = len(VOCAB)

VOCAB_INDEX = {c['name']: i for i, c in enumerate(VOCAB)}

def chord_chroma_profile(root: int, intervals: List[int]) -> np.ndarray:
    # Sharper weights, no smearing -> more precise matching
    weights = [4.0, 2.0, 1.5, 0.8]
    profile = np.zeros(12)
    if root < 0:
        return profile
    for i, iv in enumerate(sorted(intervals)):
        pc = (root + iv) % 12
        w = weights[i] if i < len(weights) else 0.4
        profile[pc] += w
    norm = np.linalg.norm(profile)
    return profile / norm if norm > 0 else profile

PROFILES = np.array([chord_chroma_profile(c['root'], c['intervals']) for c in VOCAB])

# KS profiles for key detection
KS_MAJ = np.array([6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88])
KS_MIN = np.array([6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17])

def detect_key(global_chroma: np.ndarray):
    best_r, best_key, best_scale, best_root = -np.inf, 'C', 'major', 0
    for i in range(12):
        rot = np.roll(global_chroma, -i)
        r_maj = np.corrcoef(rot, KS_MAJ)[0, 1]
        r_min = np.corrcoef(rot, KS_MIN)[0, 1]
        if r_maj > best_r:
            best_r, best_key, best_scale, best_root = r_maj, NOTES[i], 'major', i
        if r_min > best_r:
            best_r, best_key, best_scale, best_root = r_min, NOTES[i], 'minor', i
    return best_key, best_scale, best_root

def get_diatonic_indices(key_root: int, scale: str) -> List[int]:
    """Return VOCAB indices of diatonic chords for this key + common borrowed chords."""
    db = DIATONIC_MINOR if scale == 'minor' else DIATONIC
    diatonic_pairs = db.get(key_root, [])

    allowed = set()
    for (root, quality) in diatonic_pairs:
        name = NOTES[root] + quality
        if name in VOCAB_INDEX:
            allowed.add(VOCAB_INDEX[name])
        # Also allow 7th extension of each diatonic chord
        ext = '7' if quality == '' else ('m7' if quality == 'm' else None)
        if ext:
            ext_name = NOTES[root] + ext
            if ext_name in VOCAB_INDEX:
                allowed.add(VOCAB_INDEX[ext_name])

    # Always allow the parallel major/minor chords (common borrowing)
    alt_db = DIATONIC if scale == 'minor' else DIATONIC_MINOR
    for (root, quality) in alt_db.get(key_root, [])[:4]:  # only first 4
        name = NOTES[root] + quality
        if name in VOCAB_INDEX:
            allowed.add(VOCAB_INDEX[name])

    # Always allow N (no chord)
    allowed.add(N_CHORDS - 1)
    return list(allowed)

def build_hmm_transition(diatonic_idx: List[int], self_prob=0.78):
    """Build transition matrix constrained to diatonic chords."""
    n = len(diatonic_idx)
    idx = np.array(diatonic_idx)
    T = np.full((n, n), 1e-7)

    for i, ci_global in enumerate(diatonic_idx):
        ci = VOCAB[ci_global]
        if ci['root'] < 0:
            T[i, :] = 1.0 / n
            continue
        T[i, i] = self_prob
        for j, cj_global in enumerate(diatonic_idx):
            if i == j:
                continue
            cj = VOCAB[cj_global]
            if cj['root'] < 0:
                continue
            rd = abs(ci['root'] - cj['root'])
            rd = min(rd, 12 - rd)
            if rd in [5, 7]:   T[i, j] = 8e-4   # P4/P5 most common
            elif rd in [3, 4]: T[i, j] = 5e-4   # relative
            elif rd in [2]:    T[i, j] = 3e-4   # step
            else:              T[i, j] = 1e-5
        T[i] /= T[i].sum()
    return T, idx

def viterbi_constrained(log_emissions_full: np.ndarray, diatonic_idx: List[int]) -> np.ndarray:
    """Viterbi only over diatonic chord subset."""
    log_em = log_emissions_full[:, diatonic_idx]  # (T, n_diatonic)
    T_len, n = log_em.shape
    trans_mat, _ = build_hmm_transition(diatonic_idx)
    log_trans = np.log(trans_mat + 1e-12)

    dp = np.full((T_len, n), -np.inf)
    bp = np.zeros((T_len, n), dtype=np.int32)
    dp[0] = log_em[0] - np.log(n)

    for t in range(1, T_len):
        scores = dp[t-1, :, None] + log_trans  # (n, n)
        bp[t] = np.argmax(scores, axis=0)
        dp[t] = scores[bp[t], np.arange(n)] + log_em[t]

    path_local = np.zeros(T_len, dtype=int)
    path_local[-1] = np.argmax(dp[-1])
    for t in range(T_len - 2, -1, -1):
        path_local[t] = bp[t+1, path_local[t+1]]

    # Map back to global VOCAB indices
    return np.array([diatonic_idx[p] for p in path_local])

@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    suffix = os.path.splitext(file.filename or 'audio.mp3')[1] or '.mp3'
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        # 1. Load
        y, sr = librosa.load(tmp_path, sr=22050, mono=True)
        duration = librosa.get_duration(y=y, sr=sr)

        # 2. HPSS - gentler margin so we keep harmonic content
        y_harmonic, _ = librosa.effects.hpss(y, margin=2.0)

        # 3. Beat tracking on original signal
        tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr, units='frames')
        bpm = int(round(float(tempo)))
        if bpm < 60: bpm *= 2
        if bpm > 200: bpm = bpm // 2
        bpm = max(60, min(200, bpm))
        beat_times = librosa.frames_to_time(beat_frames, sr=sr)
        total_beats = len(beat_times)

        hop_length = 512

        # 4. Dual chroma: CQT + CENS blend (CENS is more stable for noisy recordings)
        chroma_cqt = librosa.feature.chroma_cqt(
            y=y_harmonic, sr=sr,
            hop_length=hop_length,
            bins_per_octave=36,
            norm=2,
        )
        chroma_cens = librosa.feature.chroma_cens(
            y=y_harmonic, sr=sr,
            hop_length=hop_length,
        )
        # Blend: 60% CQT (detailed) + 40% CENS (stable)
        chroma = 0.6 * chroma_cqt + 0.4 * chroma_cens

        # 5. Sync to beats
        beat_chroma = librosa.util.sync(chroma, beat_frames, aggregate=np.median).T  # (T, 12)

        # 6. Median filter over time to smooth beat-to-beat noise (window=3 beats)
        beat_chroma = median_filter(beat_chroma, size=(3, 1))

        # 7. Key detection on global chroma
        global_chroma = np.sum(beat_chroma, axis=0)
        global_chroma /= (np.linalg.norm(global_chroma) + 1e-10)
        key, scale, key_root = detect_key(global_chroma)

        # 8. Get diatonic chord indices for this key
        diatonic_idx = get_diatonic_indices(key_root, scale)

        # 9. Emission probabilities (cosine similarity)
        beat_chroma_norm = beat_chroma / (np.linalg.norm(beat_chroma, axis=1, keepdims=True) + 1e-10)
        similarities = beat_chroma_norm @ PROFILES.T  # (T, N_CHORDS)

        TEMP = 0.5
        log_em = similarities / TEMP
        log_em -= np.max(log_em, axis=1, keepdims=True)
        log_em -= np.log(np.sum(np.exp(log_em), axis=1, keepdims=True) + 1e-10)

        # 10. Constrained Viterbi (only diatonic chords)
        path = viterbi_constrained(log_em, diatonic_idx)
        chord_names = [VOCAB[p]['name'] for p in path]

        # 11. Single-beat outlier smoother
        smoothed = list(chord_names)
        for i in range(1, len(smoothed) - 1):
            if smoothed[i-1] == smoothed[i+1] and smoothed[i] != smoothed[i-1]:
                smoothed[i] = smoothed[i-1]

        # 12. Build output
        chords_out, prev = [], None
        for i, (chord, t) in enumerate(zip(smoothed, beat_times)):
            disp = chord if chord != prev else None
            chords_out.append({'beat': i, 'chord': chord, 'chordDisplay': disp, 'time': round(float(t), 3)})
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
