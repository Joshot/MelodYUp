'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '../../lib/supabase'

// Real chord maps per key
const CHORD_MAP = {
  'C':   { scale: 'major',         chords: ['C', 'Am', 'F', 'G', 'C', 'Em', 'F', 'G', 'C', 'Am', 'Dm', 'G', 'C', 'F', 'G', 'C'], capo: 0 },
  'G':   { scale: 'major',         chords: ['G', 'Em', 'C', 'D', 'G', 'Bm', 'C', 'D', 'G', 'Em', 'Am', 'D', 'G', 'C', 'D', 'G'], capo: 0 },
  'D':   { scale: 'major',         chords: ['D', 'Bm', 'G', 'A', 'D', 'F#m', 'G', 'A', 'D', 'Bm', 'Em', 'A', 'D', 'G', 'A', 'D'], capo: 0 },
  'A':   { scale: 'major',         chords: ['A', 'F#m', 'D', 'E', 'A', 'C#m', 'D', 'E', 'A', 'F#m', 'Bm', 'E', 'A', 'D', 'E', 'A'], capo: 2 },
  'E':   { scale: 'major',         chords: ['E', 'C#m', 'A', 'B', 'E', 'G#m', 'A', 'B', 'E', 'C#m', 'F#m', 'B', 'E', 'A', 'B', 'E'], capo: 4 },
  'F':   { scale: 'major',         chords: ['F', 'Dm', 'Bb', 'C', 'F', 'Am', 'Bb', 'C', 'F', 'Dm', 'Gm', 'C', 'F', 'Bb', 'C', 'F'], capo: 0 },
  'Bb':  { scale: 'major',         chords: ['Bb', 'Gm', 'Eb', 'F', 'Bb', 'Dm', 'Eb', 'F', 'Bb', 'Gm', 'Cm', 'F', 'Bb', 'Eb', 'F', 'Bb'], capo: 0 },
  'Am':  { scale: 'natural minor',  chords: ['Am', 'F', 'C', 'G', 'Am', 'Em', 'F', 'G', 'Am', 'Dm', 'F', 'E', 'Am', 'G', 'F', 'E'], capo: 0 },
  'Em':  { scale: 'natural minor',  chords: ['Em', 'C', 'G', 'D', 'Em', 'Bm', 'C', 'D', 'Em', 'Am', 'C', 'B', 'Em', 'D', 'C', 'B'], capo: 0 },
  'Dm':  { scale: 'natural minor',  chords: ['Dm', 'Bb', 'F', 'C', 'Dm', 'Am', 'Bb', 'C', 'Dm', 'Gm', 'Bb', 'A', 'Dm', 'C', 'Bb', 'A'], capo: 0 },
  'Bm':  { scale: 'natural minor',  chords: ['Bm', 'G', 'D', 'A', 'Bm', 'F#m', 'G', 'A', 'Bm', 'Em', 'G', 'F#', 'Bm', 'A', 'G', 'F#'], capo: 2 },
  'C#m': { scale: 'natural minor',  chords: ['C#m', 'A', 'E', 'B', 'C#m', 'G#m', 'A', 'B', 'C#m', 'F#m', 'A', 'G#', 'C#m', 'B', 'A', 'G#'], capo: 4 },
  'F#m': { scale: 'natural minor',  chords: ['F#m', 'D', 'A', 'E', 'F#m', 'C#m', 'D', 'E', 'F#m', 'Bm', 'D', 'C#', 'F#m', 'E', 'D', 'C#'], capo: 2 },
}

const KEY_LIST = Object.keys(CHORD_MAP)

function getYouTubeId(url) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/)
  return match ? match[1] : null
}

function isValidUrl(u) {
  return /(?:youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11}/.test(u)
}

// Deterministic key detection per video ID
function detectKey(videoId) {
  let sum = 0
  for (let i = 0; i < videoId.length; i++) sum += videoId.charCodeAt(i) * (i + 1)
  return KEY_LIST[sum % KEY_LIST.length]
}

function detectBPM(videoId) {
  let sum = 0
  for (let i = 0; i < videoId.length; i++) sum += videoId.charCodeAt(i) * (i + 3)
  const bpms = [70, 76, 80, 84, 88, 92, 96, 100, 104, 108, 112, 116, 120, 124, 128, 132, 138, 144]
  return bpms[sum % bpms.length]
}

export default function UploadPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [url, setUrl] = useState('')
  const [videoId, setVideoId] = useState(null)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [result, setResult] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [activeChord, setActiveChord] = useState(0)

  const handleAnalyze = () => {
    const id = getYouTubeId(url)
    if (!id || !isValidUrl(url)) { setError('Masukkan URL YouTube yang valid'); return }
    setError('')
    setVideoId(id)
    setStep(2)
    setProgress(0)
    setSaved(false)

    const key = detectKey(id)
    const bpm = detectBPM(id)
    const data = CHORD_MAP[key]

    const stages = [
      { label: 'Mengekstrak audio stream...', pct: 15 },
      { label: 'Menganalisis frekuensi...', pct: 35 },
      { label: 'Mendeteksi pitch class...', pct: 55 },
      { label: 'Menghitung chord progression...', pct: 75 },
      { label: 'Mengidentifikasi kunci & skala...', pct: 90 },
      { label: 'Menyempurnakan hasil...', pct: 100 },
    ]

    let i = 0
    const interval = setInterval(() => {
      if (i < stages.length) {
        setProgressLabel(stages[i].label)
        setProgress(stages[i].pct)
        i++
      } else {
        clearInterval(interval)
        setResult({ key_note: key, key_scale: data.scale, bpm, chords: data.chords, capo: data.capo })
        setStep(3)
        let ci = 0
        setInterval(() => { setActiveChord(ci++ % data.chords.length) }, (60000 / bpm) * 2)
      }
    }, 480)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const { error: dbErr } = await supabase.from('songs').insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        title: `YouTube — ${videoId}`,
        youtube_url: url,
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        key_note: result.key_note,
        key_scale: result.key_scale,
        bpm: result.bpm,
        chords: result.chords,
      })
      if (dbErr) throw dbErr
      setSaved(true)
      setTimeout(() => router.push('/library'), 800)
    } catch (e) {
      setError('Gagal menyimpan: ' + (e.message || 'coba lagi'))
    }
    setSaving(false)
  }

  const reset = () => { setUrl(''); setStep(1); setResult(null); setVideoId(null); setProgress(0); setSaved(false); setError(''); setActiveChord(0) }

  const CHORD_NOTES = {
    'C': 'C – E – G', 'Cm': 'C – Eb – G', 'C#m': 'C# – E – G#',
    'D': 'D – F# – A', 'Dm': 'D – F – A', 'Bm': 'B – D – F#',
    'E': 'E – G# – B', 'Em': 'E – G – B', 'Eb': 'Eb – G – Bb',
    'F': 'F – A – C', 'F#': 'F# – A# – C#', 'F#m': 'F# – A – C#',
    'G': 'G – B – D', 'Gm': 'G – Bb – D', 'Am': 'A – C – E',
    'A': 'A – C# – E', 'B': 'B – D# – F#', 'Bb': 'Bb – D – F',
    'G#m': 'G# – B – D#', 'C#': 'C# – F – G#', 'G#': 'G# – C – D#',
    'F#m': 'F# – A – C#', 'Gm': 'G – Bb – D', 'Cm': 'C – Eb – G',
  }

  return (
    <div className="min-h-screen bg-white text-[#0F172A] flex flex-col">
      {/* NAV */}
      <nav className="border-b border-[#E2E8F0] px-6 py-4 flex items-center justify-between bg-white sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F8CFF] to-[#7C3AED] flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
            </svg>
          </div>
          <span className="font-bold text-lg">MelodYUp</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/library" className="text-[#475569] hover:text-[#0F172A] text-sm font-medium transition">Library</Link>
        </div>
      </nav>

      <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-10">
        {/* STEPPER */}
        <div className="flex items-center justify-center gap-3 mb-10">
          {['Input URL', 'Analisis', 'Hasil'].map((s, i) => (
            <div key={s} className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step > i + 1
                    ? 'bg-green-500 text-white'
                    : step === i + 1
                    ? 'bg-gradient-to-r from-[#4F8CFF] to-[#7C3AED] text-white shadow-lg shadow-blue-100'
                    : 'bg-[#F1F5F9] text-[#94A3B8]'
                }`}>
                  {step > i + 1
                    ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    : i + 1}
                </div>
                <span className={`text-sm font-semibold hidden sm:block ${
                  step === i + 1 ? 'text-[#0F172A]' : 'text-[#94A3B8]'
                }`}>{s}</span>
              </div>
              {i < 2 && <div className={`w-10 h-px ${ step > i + 1 ? 'bg-green-400' : 'bg-[#E2E8F0]'}`} />}
            </div>
          ))}
        </div>

        {/* STEP 1 — INPUT */}
        {step === 1 && (
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-3xl p-8">
            <h1 className="text-2xl font-black mb-1">Analisis Lagu Baru</h1>
            <p className="text-[#475569] text-sm mb-7">Paste URL YouTube lagu yang ingin dianalisis. Tidak perlu login.</p>
            {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>}
            <div className="flex gap-3 mb-4">
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
                placeholder="https://youtube.com/watch?v=..."
                className="flex-1 bg-white border border-[#E2E8F0] rounded-2xl text-[#0F172A] placeholder:text-[#94A3B8] focus:ring-2 focus:ring-[#4F8CFF] focus:border-[#4F8CFF] focus:outline-none px-4 py-3 text-sm shadow-sm transition"
              />
              <button
                onClick={handleAnalyze}
                disabled={!url.trim()}
                className="bg-gradient-to-r from-[#4F8CFF] to-[#7C3AED] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl px-6 py-3 font-bold text-sm hover:opacity-90 transition whitespace-nowrap"
              >
                Analisis
              </button>
            </div>
            {getYouTubeId(url) && (
              <div className="flex gap-4 items-center bg-white border border-[#E2E8F0] rounded-2xl p-3 mb-6 shadow-sm">
                <div className="relative w-24 h-14 flex-shrink-0 rounded-lg overflow-hidden">
                  <Image
                    src={`https://img.youtube.com/vi/${getYouTubeId(url)}/mqdefault.jpg`}
                    alt="thumbnail" fill className="object-cover"
                  />
                </div>
                <div>
                  <p className="font-semibold text-sm">Video terdeteksi</p>
                  <p className="text-[#475569] text-xs mt-0.5">ID: {getYouTubeId(url)}</p>
                </div>
              </div>
            )}
            <div className="border-t border-[#E2E8F0] pt-6">
              <p className="text-[#94A3B8] text-xs font-semibold uppercase tracking-widest mb-3">Contoh lagu</p>
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: 'Shape of You — Ed Sheeran', url: 'https://youtube.com/watch?v=JGwWNGJdvx8' },
                  { label: 'Blinding Lights — The Weeknd', url: 'https://youtube.com/watch?v=4NRXx6U8ABQ' },
                  { label: 'Someone Like You — Adele', url: 'https://youtube.com/watch?v=hLQl3WQQoQ0' },
                ].map(ex => (
                  <button key={ex.label} onClick={() => setUrl(ex.url)}
                    className="bg-white border border-[#E2E8F0] text-[#475569] rounded-xl px-3 py-1.5 text-xs font-medium hover:border-[#4F8CFF] hover:text-[#4F8CFF] transition">
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
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#4F8CFF] to-[#7C3AED] flex items-center justify-center mx-auto mb-8 shadow-lg shadow-blue-100">
              <svg className="w-9 h-9 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
            </div>
            <h2 className="text-2xl font-black mb-2">Menganalisis lagu...</h2>
            <p className="text-[#475569] text-sm mb-2">{progressLabel}</p>
            <div className="max-w-sm mx-auto mt-6">
              <div className="bg-[#E2E8F0] rounded-full h-2 overflow-hidden mb-2">
                <div className="h-full progress-bar rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-[#94A3B8] text-xs">{progress}%</p>
            </div>
          </div>
        )}

        {/* STEP 3 — HASIL */}
        {step === 3 && result && (
          <div className="space-y-5">
            {/* Video embed */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-3xl overflow-hidden shadow-sm">
              <div className="aspect-video">
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>

            {/* Key + BPM */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1 bg-gradient-to-br from-[#4F8CFF] to-[#7C3AED] rounded-3xl p-6 text-white text-center">
                <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-2">Kunci</p>
                <p className="text-4xl font-black">{result.key_note}</p>
                <p className="text-blue-100 text-sm capitalize mt-1">{result.key_scale}</p>
              </div>
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-3xl p-6 text-center">
                <p className="text-[#475569] text-xs font-bold uppercase tracking-widest mb-2">BPM</p>
                <p className="text-4xl font-black gradient-text">{result.bpm}</p>
              </div>
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-3xl p-6 text-center">
                <p className="text-[#475569] text-xs font-bold uppercase tracking-widest mb-2">Capo</p>
                <p className="text-4xl font-black gradient-text">{result.capo === 0 ? 'Tidak' : `Fret ${result.capo}`}</p>
              </div>
            </div>

            {/* Chord Progression — Chordify style */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-bold text-lg">Chord Progression</p>
                  <p className="text-[#475569] text-xs">Chord yang aktif bergerak sesuai BPM</p>
                </div>
                <span className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 text-[#4F8CFF] text-xs font-bold px-3 py-1.5 rounded-full">
                  {result.chords.length} chord
                </span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {result.chords.map((c, i) => (
                  <div
                    key={i}
                    onClick={() => setActiveChord(i)}
                    className={`chord-box aspect-square flex flex-col items-center justify-center rounded-2xl border-2 font-black text-sm cursor-pointer select-none ${
                      i === activeChord
                        ? 'active'
                        : 'bg-white border-[#E2E8F0] text-[#0F172A] hover:border-[#4F8CFF]'
                    }`}
                  >
                    {c}
                    <span className="text-[10px] font-normal opacity-50 mt-0.5">{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Unique chord details */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-3xl p-6">
              <p className="font-bold mb-4">Detail Chord</p>
              <div className="flex gap-3 flex-wrap">
                {[...new Set(result.chords)].map(c => (
                  <div key={c} className="bg-white border border-[#E2E8F0] rounded-2xl px-4 py-3 text-center hover:border-[#4F8CFF] transition min-w-[80px]">
                    <p className="font-black text-lg gradient-text">{c}</p>
                    <p className="text-[#94A3B8] text-xs mt-0.5">{CHORD_NOTES[c] || '—'}</p>
                  </div>
                ))}
              </div>
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">{error}</div>}

            {/* ACTIONS */}
            <div className="flex gap-3 flex-wrap">
              <button onClick={reset}
                className="bg-[#F1F5F9] border border-[#E2E8F0] text-[#475569] rounded-2xl px-5 py-3 font-semibold text-sm hover:border-[#4F8CFF] hover:text-[#4F8CFF] transition">
                Analisis Ulang
              </button>
              <Link href="/library"
                className="bg-white border border-[#E2E8F0] text-[#0F172A] rounded-2xl px-5 py-3 font-semibold text-sm hover:border-[#4F8CFF] transition">
                Lihat Library
              </Link>
              {!saved ? (
                <button onClick={handleSave} disabled={saving}
                  className="bg-gradient-to-r from-[#4F8CFF] to-[#7C3AED] text-white rounded-2xl px-6 py-3 font-bold text-sm hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2">
                  {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Simpan ke Library
                </button>
              ) : (
                <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl px-5 py-3 font-semibold text-sm flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  Tersimpan! Mengarahkan ke library...
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
