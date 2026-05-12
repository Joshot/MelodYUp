// Client-side audio analysis using Web Audio API + chromagram
// Runs entirely in the browser — no external API needed

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

const CHORD_TEMPLATES = [
  // Major triads
  { name: 'C',   root: 0,  type: 'maj', intervals: [0, 4, 7] },
  { name: 'C#',  root: 1,  type: 'maj', intervals: [0, 4, 7] },
  { name: 'D',   root: 2,  type: 'maj', intervals: [0, 4, 7] },
  { name: 'D#',  root: 3,  type: 'maj', intervals: [0, 4, 7] },
  { name: 'E',   root: 4,  type: 'maj', intervals: [0, 4, 7] },
  { name: 'F',   root: 5,  type: 'maj', intervals: [0, 4, 7] },
  { name: 'F#',  root: 6,  type: 'maj', intervals: [0, 4, 7] },
  { name: 'G',   root: 7,  type: 'maj', intervals: [0, 4, 7] },
  { name: 'G#',  root: 8,  type: 'maj', intervals: [0, 4, 7] },
  { name: 'A',   root: 9,  type: 'maj', intervals: [0, 4, 7] },
  { name: 'A#',  root: 10, type: 'maj', intervals: [0, 4, 7] },
  { name: 'B',   root: 11, type: 'maj', intervals: [0, 4, 7] },
  // Minor triads
  { name: 'Cm',  root: 0,  type: 'min', intervals: [0, 3, 7] },
  { name: 'C#m', root: 1,  type: 'min', intervals: [0, 3, 7] },
  { name: 'Dm',  root: 2,  type: 'min', intervals: [0, 3, 7] },
  { name: 'D#m', root: 3,  type: 'min', intervals: [0, 3, 7] },
  { name: 'Em',  root: 4,  type: 'min', intervals: [0, 3, 7] },
  { name: 'Fm',  root: 5,  type: 'min', intervals: [0, 3, 7] },
  { name: 'F#m', root: 6,  type: 'min', intervals: [0, 3, 7] },
  { name: 'Gm',  root: 7,  type: 'min', intervals: [0, 3, 7] },
  { name: 'G#m', root: 8,  type: 'min', intervals: [0, 3, 7] },
  { name: 'Am',  root: 9,  type: 'min', intervals: [0, 3, 7] },
  { name: 'A#m', root: 10, type: 'min', intervals: [0, 3, 7] },
  { name: 'Bm',  root: 11, type: 'min', intervals: [0, 3, 7] },
]

export function detectKey(chroma) {
  const major = [
    [6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88],
    [2.88,6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29],
    [2.29,2.88,6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66],
    [3.66,2.29,2.88,6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39],
    [2.39,3.66,2.29,2.88,6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19],
    [5.19,2.39,3.66,2.29,2.88,6.35,2.23,3.48,2.33,4.38,4.09,2.52],
    [2.52,5.19,2.39,3.66,2.29,2.88,6.35,2.23,3.48,2.33,4.38,4.09],
    [4.09,2.52,5.19,2.39,3.66,2.29,2.88,6.35,2.23,3.48,2.33,4.38],
    [4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88,6.35,2.23,3.48,2.33],
    [2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88,6.35,2.23,3.48],
    [3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88,6.35,2.23],
    [2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88,6.35],
  ]
  const minor = [
    [6.33,2.68,3.52,5.38,2.60,3.97,2.73,5.17,3.00,2.43,3.71,2.97],
    [2.97,6.33,2.68,3.52,5.38,2.60,3.97,2.73,5.17,3.00,2.43,3.71],
    [3.71,2.97,6.33,2.68,3.52,5.38,2.60,3.97,2.73,5.17,3.00,2.43],
    [2.43,3.71,2.97,6.33,2.68,3.52,5.38,2.60,3.97,2.73,5.17,3.00],
    [3.00,2.43,3.71,2.97,6.33,2.68,3.52,5.38,2.60,3.97,2.73,5.17],
    [5.17,3.00,2.43,3.71,2.97,6.33,2.68,3.52,5.38,2.60,3.97,2.73],
    [2.73,5.17,3.00,2.43,3.71,2.97,6.33,2.68,3.52,5.38,2.60,3.97],
    [3.97,2.73,5.17,3.00,2.43,3.71,2.97,6.33,2.68,3.52,5.38,2.60],
    [2.60,3.97,2.73,5.17,3.00,2.43,3.71,2.97,6.33,2.68,3.52,5.38],
    [5.38,2.60,3.97,2.73,5.17,3.00,2.43,3.71,2.97,6.33,2.68,3.52],
    [3.52,5.38,2.60,3.97,2.73,5.17,3.00,2.43,3.71,2.97,6.33,2.68],
    [2.68,3.52,5.38,2.60,3.97,2.73,5.17,3.00,2.43,3.71,2.97,6.33],
  ]
  const norm = chroma.map(v => v / (Math.max(...chroma) || 1))
  let best = -Infinity, key = 'C', scale = 'major'
  major.forEach((tmpl, i) => {
    const s = tmpl.reduce((a, v, j) => a + v * norm[j], 0)
    if (s > best) { best = s; key = NOTE_NAMES[i]; scale = 'major' }
  })
  minor.forEach((tmpl, i) => {
    const s = tmpl.reduce((a, v, j) => a + v * norm[j], 0)
    if (s > best) { best = s; key = NOTE_NAMES[i]; scale = 'minor' }
  })
  return { key, scale }
}

export async function analyzeAudio(file, onProgress) {
  onProgress?.('Decoding audio...', 10)

  const arrayBuffer = await file.arrayBuffer()
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 22050 })
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
  await audioCtx.close()

  onProgress?.('Computing chromagram...', 30)

  const sampleRate = audioBuffer.sampleRate
  const channelData = audioBuffer.getChannelData(0)
  const totalDuration = audioBuffer.duration

  // ── BPM detection via autocorrelation ──
  onProgress?.('Detecting BPM...', 45)
  const bpm = estimateBPM(channelData, sampleRate)
  const beatDuration = 60 / bpm
  const totalBeats = Math.ceil(totalDuration / beatDuration)

  onProgress?.('Detecting chords beat by beat...', 60)

  // ── Chromagram per beat ──
  const beatChromas = []
  const hopSamples = Math.floor(beatDuration * sampleRate)

  for (let beat = 0; beat < totalBeats; beat++) {
    const startSample = beat * hopSamples
    const endSample = Math.min(startSample + hopSamples, channelData.length)
    const segment = channelData.slice(startSample, endSample)
    const chroma = computeChroma(segment, sampleRate)
    beatChromas.push(chroma)
  }

  // ── Global chroma for key detection ──
  const globalChroma = new Array(12).fill(0)
  beatChromas.forEach(c => c.forEach((v, i) => globalChroma[i] += v))
  const { key, scale } = detectKey(globalChroma)

  onProgress?.('Matching chords...', 80)

  // ── Match each beat to best chord ──
  // Use 2-beat window for smoother results
  const rawChords = beatChromas.map((chroma, i) => {
    const window = new Array(12).fill(0)
    for (let w = -1; w <= 1; w++) {
      const wi = i + w
      if (wi >= 0 && wi < beatChromas.length) {
        beatChromas[wi].forEach((v, j) => window[j] += v * (w === 0 ? 1.5 : 0.5))
      }
    }
    return matchChord(window)
  })

  // ── Smooth: remove single-beat anomalies ──
  const smoothed = rawChords.map((c, i) => {
    if (i === 0 || i === rawChords.length - 1) return c
    if (rawChords[i-1] === rawChords[i+1] && rawChords[i] !== rawChords[i-1]) {
      return rawChords[i-1]
    }
    return c
  })

  // ── Build chord data ──
  let prev = null
  const chordData = smoothed.map((chord, beat) => {
    const isNew = chord !== prev
    prev = chord
    return {
      beat,
      chord,
      chordDisplay: isNew ? chord : null,
      time: parseFloat((beat * beatDuration).toFixed(3)),
    }
  })

  onProgress?.('Done!', 100)

  return { chordData, key, scale, bpm, totalDuration: parseFloat(totalDuration.toFixed(2)), totalBeats }
}

function matchChord(chroma) {
  const total = chroma.reduce((a, b) => a + b, 0)
  if (total < 0.01) return null
  const norm = chroma.map(v => v / total)
  let best = -1, bestName = null
  CHORD_TEMPLATES.forEach(tmpl => {
    const score = tmpl.intervals.reduce((s, iv) => s + norm[(tmpl.root + iv) % 12], 0)
    if (score > best) { best = score; bestName = tmpl.name }
  })
  return bestName
}

function computeChroma(samples, sampleRate) {
  // Constant-Q inspired chromagram using harmonic summation
  const chroma = new Array(12).fill(0)
  const N = samples.length
  if (N === 0) return chroma

  // Reference frequencies for each pitch class (A4 = 440 Hz)
  const refFreqs = [
    261.63, 277.18, 293.66, 311.13, 329.63, 349.23,
    369.99, 392.00, 415.30, 440.00, 466.16, 493.88
  ] // C4..B4

  // Goertzel algorithm for each note across 4 octaves
  refFreqs.forEach((baseFreq, pc) => {
    let energy = 0
    for (let octave = 0; octave < 5; octave++) {
      const freq = baseFreq * Math.pow(2, octave - 1)
      if (freq > sampleRate / 2) break
      energy += goertzel(samples, freq, sampleRate)
    }
    chroma[pc] = energy
  })

  return chroma
}

function goertzel(samples, freq, sampleRate) {
  const N = samples.length
  const k = Math.round(N * freq / sampleRate)
  const omega = 2 * Math.PI * k / N
  const cosine = Math.cos(omega)
  const coeff = 2 * cosine
  let s0 = 0, s1 = 0, s2 = 0
  for (let i = 0; i < N; i++) {
    s0 = samples[i] + coeff * s1 - s2
    s2 = s1
    s1 = s0
  }
  return s1 * s1 + s2 * s2 - coeff * s1 * s2
}

function estimateBPM(samples, sampleRate) {
  // Onset detection via energy difference
  const frameSize = Math.floor(sampleRate * 0.023) // 23ms frames
  const hopSize = Math.floor(frameSize / 2)
  const energies = []

  for (let i = 0; i + frameSize < samples.length; i += hopSize) {
    let e = 0
    for (let j = i; j < i + frameSize; j++) e += samples[j] * samples[j]
    energies.push(e)
  }

  // Onset = positive energy flux
  const onsets = []
  for (let i = 1; i < energies.length; i++) {
    const diff = energies[i] - energies[i-1]
    if (diff > 0) onsets.push(i * hopSize / sampleRate)
  }

  if (onsets.length < 8) return 120

  // Find most common inter-onset interval → BPM
  const iois = []
  for (let i = 1; i < Math.min(onsets.length, 200); i++) {
    const d = onsets[i] - onsets[i-1]
    if (d > 0.15 && d < 2.0) iois.push(d)
  }

  if (iois.length < 4) return 120

  // Histogram approach
  const bins = {}
  iois.forEach(d => {
    const rounded = Math.round(d * 4) / 4 // round to nearest 0.25s
    bins[rounded] = (bins[rounded] || 0) + 1
  })
  const dominant = Object.entries(bins).sort((a, b) => b[1] - a[1])[0]
  let bpm = Math.round(60 / parseFloat(dominant[0]))

  // Correct to musical range
  while (bpm < 60) bpm *= 2
  while (bpm > 200) bpm /= 2

  return Math.max(60, Math.min(200, bpm))
}
