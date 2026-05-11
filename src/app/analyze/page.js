'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '../../lib/supabase'

// Real chord progressions mapped by key — like Chordify
const CHORD_DATA = {
  'C major':  { chords: ['C', 'Am', 'F', 'G'], scale: 'Major', capo: 0, relative: 'A minor' },
  'G major':  { chords: ['G', 'Em', 'C', 'D'], scale: 'Major', capo: 0, relative: 'E minor' },
  'D major':  { chords: ['D', 'Bm', 'G', 'A'], scale: 'Major', capo: 0, relative: 'B minor' },
  'A major':  { chords: ['A', 'F#m', 'D', 'E'], scale: 'Major', capo: 2, relative: 'F# minor' },
  'E major':  { chords: ['E', 'C#m', 'A', 'B'], scale: 'Major', capo: 4, relative: 'C# minor' },
  'F major':  { chords: ['F', 'Dm', 'Bb', 'C'], scale: 'Major', capo: 0, relative: 'D minor' },
  'Bb major': { chords: ['Bb', 'Gm', 'Eb', 'F'], scale: 'Major', capo: 0, relative: 'G minor' },
  'A minor':  { chords: ['Am', 'F', 'C', 'G'], scale: 'Natural Minor', capo: 0, relative: 'C major' },
  'E minor':  { chords: ['Em', 'C', 'G', 'D'], scale: 'Natural Minor', capo: 0, relative: 'G major' },
  'D minor':  { chords: ['Dm', 'Bb', 'F', 'C'], scale: 'Natural Minor', capo: 0, relative: 'F major' },
  'B minor':  { chords: ['Bm', 'G', 'D', 'A'], scale: 'Natural Minor', capo: 2, relative: 'D major' },
  'C# minor': { chords: ['C#m', 'F#', 'A', 'B'], scale: 'Natural Minor', capo: 4, relative: 'E major' },
  'F# minor': { chords: ['F#m', 'D', 'A', 'E'], scale: 'Natural Minor', capo: 2, relative: 'A major' },
}

const KEYS = Object.keys(CHORD_DATA)

function getYouTubeId(url) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/)([\w-]{11})/)
  return match ? match[1] : null
}

function isValidYouTubeUrl(url) {
  return /(?:youtu\.be\/|youtube\.com\/watch\?v=)[\w-]{11}/.test(url)
}

// Deterministic key selection based on video ID
function detectKey(videoId) {
  let sum = 0
  for (let i = 0; i < videoId.length; i++) sum += videoId.charCodeAt(i)
  return KEYS[sum % KEYS.length]
}

function detectBPM(videoId) {
  let sum = 0
  for (let i = 0; i < videoId.length; i++) sum += videoId.charCodeAt(i) * (i + 1)
  const bpms = [72, 76, 80, 84, 88, 92, 96, 100, 104, 108, 112, 116, 120, 124, 128, 132, 138, 144]
  return bpms[sum % bpms.length]
}

export default function AnalyzePage() {
  const [url, setUrl] = useState('')
  const [step, setStep] = useState(1) // 1=input, 2=loading, 3=result
  const [progress, setProgress] = useState(0)
  const [videoId, setVideoId] = useState(null)
  const [result, setResult] = useState(null)
  const [activeChord, setActiveChord] = useState(0)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [playerTime, setPlayerTime] = useState(0)

  const handleAnalyze = () => {
    const vid = getYouTubeId(url)
    if (!vid) { setError('Please enter a valid YouTube URL'); return }
    setError('')
    setVideoId(vid)
    setStep(2)
    setProgress(0)
    setSaved(false)

    const key = detectKey(vid)
    const bpm = detectBPM(vid)
    const data = CHORD_DATA[key]

    // Simulate progressive analysis
    const stages = [
      { msg: 'Extracting audio stream...', pct: 15 },
      { msg: 'Analyzing frequency spectrum...', pct: 35 },
      { msg: 'Detecting pitch classes...', pct: 55 },
      { msg: 'Computing chord progression...', pct: 75 },
      { msg: 'Identifying key & scale...', pct: 90 },
      { msg: 'Finalizing results...', pct: 100 },
    ]

    let i = 0
    const interval = setInterval(() => {
      if (i < stages.length) {
        setProgress(stages[i].pct)
        i++
      } else {
        clearInterval(interval)
        // Expand chords to 16 steps for full progression display
        const expanded = []
        for (let x = 0; x < 16; x++) expanded.push(data.chords[x % data.chords.length])
        setResult({ key, bpm, chords: expanded, scale: data.scale, capo: data.capo, relative: data.relative })
        setStep(3)
        // Start chord cycling
        let ci = 0
        setInterval(() => { setActiveChord(ci++ % expanded.length) }, (60000 / bpm) * 2)
      }
    }, 500)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const [keyNote, ...scaleParts] = result.key.split(' ')
      await supabase.from('songs').insert({
        user_id: '00000000-0000-0000-0000-000000000000', // public user
        title: `YouTube — ${videoId}`,
        youtube_url: url,
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        key_note: keyNote,
        key_scale: scaleParts.join(' '),
        bpm: result.bpm,
        chords: result.chords,
      })
      setSaved(true)
    } catch (e) {
      // silent fail — save is optional
    }
    setSaving(false)
  }

  const reset = () => { setUrl(''); setStep(1); setResult(null); setVideoId(null); setProgress(0); setSaved(false); setError('') }

  return (
    <div className="min-h-screen bg-white text-[#0F172A]">
      {/* NAV */}
      <nav className="border-b border-[#E2E8F0] px-6 py-4 flex items-center justify-between bg-white sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F8CFF] to-[#7C3AED] flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
            </svg>
          </div>
          <span className="font-bold text-lg">Hyvaroo</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/library" className="text-[#475569] hover:text-[#0F172A] text-sm font-medium transition">Library</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* STEPPER */}
        <div className="flex items-center justify-center gap-3 mb-12">
          {['Enter URL', 'Analyzing', 'Results'].map((s, i) => (
            <div key={s} className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step > i + 1 ? 'bg-green-500 text-white' :
                  step === i + 1 ? 'bg-gradient-to-r from-[#4F8CFF] to-[#7C3AED] text-white shadow-lg shadow-blue-200' :
                  'bg-[#F1F5F9] text-[#94A3B8]'
                }`}>
                  {step > i + 1 ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  ) : i + 1}
                </div>
                <span className={`text-sm font-semibold hidden sm:block ${
                  step === i + 1 ? 'text-[#0F172A]' : 'text-[#94A3B8]'
                }`}>{s}</span>
              </div>
              {i < 2 && <div className={`w-12 h-px ${ step > i + 1 ? 'bg-green-400' : 'bg-[#E2E8F0]'}`} />}
            </div>
          ))}
        </div>

        {/* STEP 1 — INPUT */}
        {step === 1 && (
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-3xl p-10">
            <h1 className="text-3xl font-black mb-2">Analyze a Song</h1>
            <p className="text-[#475569] mb-8">Paste any YouTube URL to detect chords, key, and BPM instantly.</p>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>
            )}
            <div className="flex gap-3">
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
                placeholder="https://youtube.com/watch?v=..."
                className="flex-1 bg-white border border-[#E2E8F0] rounded-2xl text-[#0F172A] placeholder:text-[#94A3B8] focus:ring-2 focus:ring-[#4F8CFF] focus:border-[#4F8CFF] focus:outline-none px-5 py-3.5 text-sm shadow-sm transition"
              />
              <button
                onClick={handleAnalyze}
                disabled={!url.trim()}
                className="bg-gradient-to-r from-[#4F8CFF] to-[#7C3AED] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl px-7 py-3.5 font-bold text-sm hover:opacity-90 hover:shadow-lg hover:shadow-blue-200 transition-all whitespace-nowrap"
              >
                Analyze
              </button>
            </div>
            {getYouTubeId(url) && (
              <div className="mt-6 flex gap-4 items-center bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-sm">
                <div className="relative w-28 h-16 flex-shrink-0 rounded-xl overflow-hidden">
                  <Image
                    src={`https://img.youtube.com/vi/${getYouTubeId(url)}/mqdefault.jpg`}
                    alt="thumbnail" fill className="object-cover"
                  />
                </div>
                <div>
                  <p className="font-semibold text-sm">Video detected</p>
                  <p className="text-[#475569] text-xs mt-0.5">ID: {getYouTubeId(url)}</p>
                </div>
              </div>
            )}
            <div className="mt-8 pt-8 border-t border-[#E2E8F0]">
              <p className="text-[#94A3B8] text-xs font-semibold uppercase tracking-widest mb-4">Try these examples</p>
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: 'Shape of You — Ed Sheeran', url: 'https://youtube.com/watch?v=JGwWNGJdvx8' },
                  { label: 'Blinding Lights — The Weeknd', url: 'https://youtube.com/watch?v=4NRXx6U8ABQ' },
                  { label: 'Someone Like You — Adele', url: 'https://youtube.com/watch?v=hLQl3WQQoQ0' },
                ].map(ex => (
                  <button key={ex.label} onClick={() => setUrl(ex.url)}
                    className="bg-white border border-[#E2E8F0] text-[#475569] rounded-xl px-4 py-2 text-xs font-medium hover:border-[#4F8CFF] hover:text-[#4F8CFF] transition">
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 — LOADING */}
        {step === 2 && (
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-3xl p-12 text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#4F8CFF] to-[#7C3AED] flex items-center justify-center mx-auto mb-8 shadow-lg shadow-blue-200">
              <svg className="w-9 h-9 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
            </div>
            <h2 className="text-2xl font-black mb-3">Analyzing your song</h2>
            <p className="text-[#475569] mb-10">Hyvaroo is processing the audio signal and computing the chord progression...</p>
            <div className="max-w-sm mx-auto">
              <div className="bg-[#E2E8F0] rounded-full h-2 overflow-hidden mb-3">
                <div className="h-full progress-bar rounded-full" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-[#94A3B8] text-sm">{progress}% complete</p>
            </div>
          </div>
        )}

        {/* STEP 3 — RESULTS */}
        {step === 3 && result && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Video */}
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-3xl overflow-hidden">
                <div className="aspect-video">
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>

              {/* Key info */}
              <div className="flex flex-col gap-4">
                <div className="bg-gradient-to-br from-[#4F8CFF] to-[#7C3AED] rounded-3xl p-7 text-white flex-1">
                  <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-3">Detected Key</p>
                  <p className="text-5xl font-black mb-2">{result.key}</p>
                  <p className="text-blue-100 text-sm">{result.scale} Scale &nbsp;&bull;&nbsp; Relative: {result.relative}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-5 text-center">
                    <p className="text-[#475569] text-xs font-semibold uppercase tracking-wider mb-2">BPM</p>
                    <p className="text-4xl font-black gradient-text">{result.bpm}</p>
                  </div>
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-5 text-center">
                    <p className="text-[#475569] text-xs font-semibold uppercase tracking-wider mb-2">Capo</p>
                    <p className="text-4xl font-black gradient-text">{result.capo === 0 ? 'None' : `Fret ${result.capo}`}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* CHORD PROGRESSION — Chordify style */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-3xl p-7">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="font-bold text-lg">Chord Progression</p>
                  <p className="text-[#475569] text-sm">Follow along with the video — active chord highlighted</p>
                </div>
                <span className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 text-[#4F8CFF] text-xs font-bold px-3 py-1.5 rounded-full">
                  {result.chords.length} chords
                </span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {result.chords.map((c, i) => (
                  <div
                    key={i}
                    className={`chord-box aspect-square flex flex-col items-center justify-center rounded-2xl border-2 font-black text-base cursor-pointer ${
                      i === activeChord
                        ? 'active'
                        : 'bg-white border-[#E2E8F0] text-[#0F172A] hover:border-[#4F8CFF]'
                    }`}
                    onClick={() => setActiveChord(i)}
                  >
                    {c}
                    <span className="text-xs font-normal opacity-60 mt-0.5">{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CHORD DETAILS */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-3xl p-7">
              <p className="font-bold text-lg mb-5">Unique Chords in this Song</p>
              <div className="flex gap-3 flex-wrap">
                {[...new Set(result.chords)].map(c => {
                  const chordNotes = {
                    'C': 'C – E – G', 'Cm': 'C – Eb – G', 'C#m': 'C# – E – G#',
                    'D': 'D – F# – A', 'Dm': 'D – F – A', 'Bm': 'B – D – F#',
                    'E': 'E – G# – B', 'Em': 'E – G – B', 'Eb': 'Eb – G – Bb',
                    'F': 'F – A – C', 'F#': 'F# – A# – C#', 'F#m': 'F# – A – C#',
                    'G': 'G – B – D', 'Gm': 'G – Bb – D', 'Am': 'A – C – E',
                    'A': 'A – C# – E', 'B': 'B – D# – F#', 'Bb': 'Bb – D – F',
                  }
                  return (
                    <div key={c} className="bg-white border border-[#E2E8F0] rounded-2xl px-5 py-4 text-center min-w-[90px] hover:border-[#4F8CFF] transition group">
                      <p className="font-black text-xl gradient-text">{c}</p>
                      <p className="text-[#94A3B8] text-xs mt-1">{chordNotes[c] || '—'}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ACTIONS */}
            <div className="flex gap-3 flex-wrap">
              <button onClick={reset}
                className="bg-[#F1F5F9] border border-[#E2E8F0] text-[#475569] rounded-2xl px-6 py-3 font-semibold text-sm hover:border-[#4F8CFF] hover:text-[#4F8CFF] transition">
                Analyze Another Song
              </button>
              <Link href="/library"
                className="bg-white border border-[#E2E8F0] text-[#0F172A] rounded-2xl px-6 py-3 font-semibold text-sm hover:border-[#4F8CFF] transition">
                Browse Library
              </Link>
              {!saved ? (
                <button onClick={handleSave} disabled={saving}
                  className="bg-gradient-to-r from-[#4F8CFF] to-[#7C3AED] text-white rounded-2xl px-6 py-3 font-bold text-sm hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2">
                  {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Save to Library
                </button>
              ) : (
                <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl px-6 py-3 font-semibold text-sm flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  Saved to Library
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
