'use client'
export const dynamic = 'force-dynamic'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// ─── CHORD DETECTION ENGINE (client-side) ─────────────────────────────────────

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

const CHORD_TEMPLATES = [
  ...NOTE_NAMES.map((n, i) => ({ name: n,       root: i, intervals: [0, 4, 7] })),  // major
  ...NOTE_NAMES.map((n, i) => ({ name: n + 'm',  root: i, intervals: [0, 3, 7] })),  // minor
]

function detectKey(chroma) {
  const KP_REF_MAJOR = [6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88]
  const KP_REF_MINOR = [6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17]
  const normalize = v => { const s = v.reduce((a,b)=>a+b,0)||1; return v.map(x=>x/s) }
  const corr = (a, b) => a.reduce((s,v,i) => s + v*b[i], 0)
  const normChroma = normalize(chroma)
  let best = -Infinity, bestKey = 'C', bestScale = 'major'
  for (let i = 0; i < 12; i++) {
    const rotated = [...normChroma.slice(i), ...normChroma.slice(0,i)]
    const mj = corr(rotated, normalize(KP_REF_MAJOR))
    const mn = corr(rotated, normalize(KP_REF_MINOR))
    if (mj > best) { best = mj; bestKey = NOTE_NAMES[i]; bestScale = 'major' }
    if (mn > best) { best = mn; bestKey = NOTE_NAMES[i]; bestScale = 'minor' }
  }
  return { key: bestKey, scale: bestScale }
}

function chromaFromFFT(fftData, sampleRate, fftSize) {
  const chroma = new Array(12).fill(0)
  const binFreq = sampleRate / fftSize
  for (let bin = 1; bin < fftData.length; bin++) {
    const freq = bin * binFreq
    if (freq < 27.5 || freq > 4186) continue
    const midi = Math.round(12 * Math.log2(freq / 440) + 69)
    if (midi < 21 || midi > 108) continue
    const pitchClass = ((midi % 12) + 12) % 12
    const power = Math.pow(10, fftData[bin] / 20)  // dB to linear
    chroma[pitchClass] += power
  }
  return chroma
}

function matchChord(chroma) {
  const total = chroma.reduce((a,b)=>a+b,0)
  if (total < 0.001) return null
  let best = -1, bestChord = null
  for (const tmpl of CHORD_TEMPLATES) {
    let score = 0
    for (const iv of tmpl.intervals) {
      score += chroma[(tmpl.root + iv) % 12]
    }
    // Penalize non-chord tones
    for (let i = 0; i < 12; i++) {
      if (!tmpl.intervals.includes((i - tmpl.root + 12) % 12)) {
        score -= chroma[i] * 0.3
      }
    }
    if (score > best) { best = score; bestChord = tmpl.name }
  }
  return bestChord
}

async function analyzeAudio(file, onProgress) {
  onProgress('Decoding audio...', 10)
  const arrayBuffer = await file.arrayBuffer()
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  const ctx = new AudioCtx({ sampleRate: 22050 })
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
  ctx.close()

  onProgress('Detecting tempo...', 25)
  const rawData = audioBuffer.getChannelData(0)
  const sampleRate = audioBuffer.sampleRate
  const totalDuration = audioBuffer.duration

  // BPM via autocorrelation on onset envelope
  const hopSize = 512
  const envelope = []
  for (let i = 0; i < rawData.length - hopSize; i += hopSize) {
    let energy = 0
    for (let j = 0; j < hopSize; j++) energy += rawData[i+j] * rawData[i+j]
    envelope.push(Math.sqrt(energy / hopSize))
  }
  // Simple peak-based BPM
  const envSR = sampleRate / hopSize
  const maxLag = Math.round(envSR * 60 / 60)   // 60 BPM
  const minLag = Math.round(envSR * 60 / 180)  // 180 BPM
  let bestCorr = 0, bestLag = Math.round(envSR * 60 / 120)
  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0
    for (let i = 0; i < envelope.length - lag; i++) corr += envelope[i] * envelope[i + lag]
    if (corr > bestCorr) { bestCorr = corr; bestLag = lag }
  }
  let bpm = Math.round(envSR * 60 / bestLag)
  if (bpm < 60) bpm *= 2
  if (bpm > 180) bpm = Math.round(bpm / 2)
  bpm = Math.max(60, Math.min(180, bpm))

  onProgress('Analyzing chords...', 45)

  const beatDuration = 60 / bpm
  const totalBeats = Math.ceil(totalDuration / beatDuration)
  const fftSize = 8192
  const analyser = new (window.OfflineAudioContext || window.AudioContext)({ sampleRate: 22050, length: 1, numberOfChannels: 1 })

  // Process each beat
  const globalChroma = new Array(12).fill(0)
  const beatChords = []

  // Use offline analysis: slice audio per beat window
  const windowSamples = Math.round(beatDuration * sampleRate)
  const overlapSamples = Math.round(windowSamples * 0.5)

  onProgress('Computing chromagram...', 60)

  // Sliding window chromagram via manual FFT
  // We'll use a simplified DFT for chroma bands
  const CHROMA_FREQS = NOTE_NAMES.map((_, i) => 261.63 * Math.pow(2, i / 12)) // C4 and up
  const OCTAVES = [0.25, 0.5, 1, 2, 4] // weight multiple octaves

  function getChromaWindow(startSample, length) {
    const chroma = new Array(12).fill(0)
    const end = Math.min(startSample + length, rawData.length)
    const N = end - startSample
    if (N < 100) return chroma

    for (let pc = 0; pc < 12; pc++) {
      let power = 0
      for (const octMult of OCTAVES) {
        const freq = CHROMA_FREQS[pc] * octMult
        if (freq < 20 || freq > 4000) continue
        let re = 0, im = 0
        const step = Math.max(1, Math.floor(N / 512)) // subsample for speed
        let count = 0
        for (let n = 0; n < N; n += step) {
          const t = n / sampleRate
          const w = 0.5 - 0.5 * Math.cos(2 * Math.PI * n / N) // Hann window
          re += rawData[startSample + n] * Math.cos(2 * Math.PI * freq * t) * w
          im -= rawData[startSample + n] * Math.sin(2 * Math.PI * freq * t) * w
          count++
        }
        power += (re*re + im*im) / (count * count)
      }
      chroma[pc] = Math.sqrt(power)
    }
    return chroma
  }

  for (let b = 0; b < totalBeats; b++) {
    if (b % 16 === 0) onProgress(`Analyzing beat ${b+1}/${totalBeats}...`, 60 + Math.round(30 * b / totalBeats))
    const startSample = Math.round(b * beatDuration * sampleRate)
    const chroma = getChromaWindow(startSample, windowSamples)
    for (let i = 0; i < 12; i++) globalChroma[i] += chroma[i]
    beatChords.push({ chroma, beat: b, time: +(b * beatDuration).toFixed(3) })
  }

  onProgress('Detecting key...', 90)
  const { key, scale } = detectKey(globalChroma)

  // Smooth chords using 3-beat window
  onProgress('Finalizing chords...', 95)
  const chords = []
  let prevChord = null
  for (let b = 0; b < beatChords.length; b++) {
    // Merge 3-beat window for smoother result
    const merged = new Array(12).fill(0)
    for (let w = -1; w <= 1; w++) {
      const wb = b + w
      if (wb >= 0 && wb < beatChords.length) {
        const weight = w === 0 ? 2 : 1
        beatChords[wb].chroma.forEach((v, i) => merged[i] += v * weight)
      }
    }
    const chord = matchChord(merged)
    chords.push({
      beat: b,
      chord,
      chordDisplay: chord !== prevChord ? chord : null,
      time: beatChords[b].time,
    })
    prevChord = chord
  }

  return { chords, bpm, key, scale, totalDuration: +totalDuration.toFixed(2), totalBeats }
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const router = useRouter()
  const fileRef = useRef(null)
  const [step, setStep] = useState(1)
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [error, setError] = useState('')

  const handleFile = (f) => {
    if (!f) return
    if (!f.type.startsWith('audio/')) { setError('Please upload an audio file (MP3, WAV, M4A, OGG)'); return }
    if (f.size > 60 * 1024 * 1024) { setError('File too large — max 60MB'); return }
    setFile(f); setError('')
  }

  const handleAnalyze = async () => {
    if (!file) return
    setError(''); setStep(2); setProgress(0)
    try {
      const onProgress = (label, pct) => { setProgressLabel(label); setProgress(pct) }
      const result = await analyzeAudio(file, onProgress)
      setProgress(97); setProgressLabel('Saving to library...')

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: file.name.replace(/\.[^.]+$/, ''),
          ...result,
        })
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Save failed')

      setProgress(100); setProgressLabel('Done!')
      sessionStorage.setItem(`audio_${data.songId}`, URL.createObjectURL(file))
      setTimeout(() => router.push(`/songs/${data.songId}`), 500)

    } catch (err) {
      setError(err.message); setStep(1)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <nav className="bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl btn-primary flex items-center justify-center shadow-sm">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" /></svg>
          </div>
          <span className="font-black text-lg gradient-text">MelodYUp</span>
        </Link>
        <Link href="/library" className="text-slate-400 text-sm hover:text-slate-600 transition">Library</Link>
      </nav>

      <div className="max-w-lg mx-auto px-5 py-12">
        {/* Steps */}
        <div className="flex items-center justify-center gap-3 mb-10">
          {['Upload', 'Analyze', 'Done'].map((s, i) => (
            <div key={s} className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step > i+1 ? 'bg-emerald-500 text-white' :
                  step === i+1 ? 'btn-primary text-white' :
                  'bg-slate-100 text-slate-400'
                }`}>
                  {step > i+1
                    ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                    : i+1
                  }
                </div>
                <span className={`text-sm font-medium hidden sm:block ${ step===i+1?'text-slate-700':'text-slate-400' }`}>{s}</span>
              </div>
              {i < 2 && <div className={`w-10 h-px ${ step > i+1 ? 'bg-emerald-400' : 'bg-slate-200' }`} />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="card shadow-sm fade-up">
            <h1 className="text-xl font-black mb-1">Analyze a Song</h1>
            <p className="text-slate-400 text-sm mb-6">Upload MP3, WAV, M4A or OGG. Max 60MB.</p>

            {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-5">{error}</div>}

            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                dragOver ? 'border-blue-400 bg-blue-50' :
                file ? 'border-emerald-400 bg-emerald-50' :
                'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
              {file ? (
                <>
                  <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"/></svg>
                  </div>
                  <p className="font-semibold text-slate-700 text-sm truncate px-4">{file.name}</p>
                  <p className="text-slate-400 text-xs mt-1">{(file.size/1024/1024).toFixed(1)} MB</p>
                  <button onClick={e=>{e.stopPropagation();setFile(null)}} className="mt-3 text-xs text-red-400 hover:text-red-500">Remove</button>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                  </div>
                  <p className="font-medium text-slate-500 text-sm">Drag & drop or click to browse</p>
                  <p className="text-slate-300 text-xs mt-2">MP3 · WAV · M4A · OGG · max 60MB</p>
                </>
              )}
            </div>

            <button onClick={handleAnalyze} disabled={!file} className="btn-primary w-full py-3 rounded-xl mt-4 text-sm">
              Analyze Song
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="card text-center py-14 shadow-sm fade-up">
            <div className="w-16 h-16 btn-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md">
              <svg className="w-8 h-8 text-white spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
            </div>
            <h2 className="text-xl font-black mb-2">Analyzing your song...</h2>
            <p className="text-slate-400 text-sm mb-1">{progressLabel}</p>
            <p className="text-slate-300 text-xs mb-8">Processing locally — no data sent to external servers</p>
            <div className="max-w-xs mx-auto">
              <div className="prog-track h-2 mb-2">
                <div className="prog-fill h-full" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-slate-400 text-xs">{progress}%</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
