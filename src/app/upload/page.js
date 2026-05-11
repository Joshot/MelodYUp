'use client'
export const dynamic = 'force-dynamic'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

export default function UploadPage() {
  const router = useRouter()
  const fileRef = useRef(null)
  const [step, setStep] = useState(1) // 1=input, 2=analyzing, 3=result
  const [file, setFile] = useState(null)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const handleFile = (f) => {
    if (!f) return
    if (!f.type.startsWith('audio/')) { setError('File harus berformat audio (MP3, WAV, M4A, OGG)'); return }
    if (f.size > 50 * 1024 * 1024) { setError('File maksimal 50MB'); return }
    setFile(f)
    setError('')
  }

  const handleAnalyze = async () => {
    if (!file) { setError('Pilih file audio terlebih dahulu'); return }
    setError('')
    setStep(2)
    setProgress(0)

    const stages = [
      { label: 'Membaca file audio...', pct: 10 },
      { label: 'Mengirim ke AI engine...', pct: 25 },
      { label: 'Mendeteksi nada & melodi...', pct: 50 },
      { label: 'Menganalisis chord progression...', pct: 75 },
      { label: 'Menentukan kunci & skala...', pct: 90 },
      { label: 'Menyempurnakan hasil...', pct: 98 },
    ]

    let stageIdx = 0
    const stageInterval = setInterval(() => {
      if (stageIdx < stages.length) {
        setProgressLabel(stages[stageIdx].label)
        setProgress(stages[stageIdx].pct)
        stageIdx++
      }
    }, 3000)

    try {
      const formData = new FormData()
      formData.append('audio', file)

      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      })

      clearInterval(stageInterval)

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Analisis gagal')
      }

      const data = await res.json()
      setProgress(100)
      setTimeout(() => {
        setResult(data)
        setStep(3)
      }, 400)

    } catch (err) {
      clearInterval(stageInterval)
      setError(err.message)
      setStep(1)
    }
  }

  const handleSave = async () => {
    if (!result) return
    setSaving(true)
    setError('')
    try {
      const songData = {
        user_id: '00000000-0000-0000-0000-000000000000',
        title: file.name.replace(/\.[^.]+$/, ''),
        filename: file.name,
        key_note: result.key,
        key_scale: result.scale,
        bpm: result.bpm,
        chords: [...new Set(result.chords.filter(c=>c.chord).map(c=>c.chord))],
        chord_data: result.chords,
        total_duration: result.totalDuration,
        total_beats: result.totalBeats,
      }
      const { data, error: dbErr } = await supabase.from('songs').insert(songData).select().single()
      if (dbErr) throw dbErr
      setSaved(true)
      setTimeout(() => router.push(`/player/${data.id}`), 700)
    } catch (e) {
      setError('Gagal menyimpan: ' + (e.message || 'coba lagi'))
    }
    setSaving(false)
  }

  const reset = () => { setFile(null); setStep(1); setResult(null); setProgress(0); setSaved(false); setError('') }

  return (
    <div className="min-h-screen bg-[#f0fdf4]">
      {/* NAV */}
      <nav className="bg-white border-b border-green-100 px-4 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" /></svg>
          </div>
          <span className="font-black text-lg gradient-text">MelodYUp</span>
        </Link>
        <Link href="/library" className="text-slate-500 hover:text-slate-800 text-sm font-medium px-4 py-2 rounded-xl hover:bg-green-50 transition">Library</Link>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* STEPPER */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {['Upload File','Analyzing','Results'].map((s,i) => (
            <div key={s} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step > i+1 ? 'bg-green-500 text-white' :
                  step === i+1 ? 'grad-btn shadow' :
                  'bg-green-50 text-slate-400 border border-green-100'
                }`}>
                  {step > i+1 ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                  ) : i+1}
                </div>
                <span className={`text-sm font-semibold hidden sm:block ${ step===i+1?'text-slate-700':'text-slate-400' }`}>{s}</span>
              </div>
              {i<2 && <div className={`w-8 h-px ${ step>i+1?'bg-green-400':'bg-green-100' }`}/>}
            </div>
          ))}
        </div>

        {/* STEP 1 — UPLOAD */}
        {step === 1 && (
          <div className="card">
            <h1 className="text-2xl font-black mb-1">Analyze New Song</h1>
            <p className="text-slate-500 text-sm mb-6">Upload an MP3, WAV, M4A, or OGG file. No login required.</p>
            {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>}

            {/* DROP ZONE */}
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition ${
                dragOver ? 'border-blue-400 bg-blue-50' :
                file ? 'border-green-400 bg-green-50' :
                'border-green-200 hover:border-blue-300 hover:bg-blue-50'
              }`}
            >
              <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
              {file ? (
                <div>
                  <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"/></svg>
                  </div>
                  <p className="font-bold text-slate-700">{file.name}</p>
                  <p className="text-slate-400 text-xs mt-1">{(file.size/1024/1024).toFixed(2)} MB</p>
                  <button onClick={e => { e.stopPropagation(); setFile(null) }} className="mt-3 text-xs text-red-400 hover:text-red-600 transition">Remove</button>
                </div>
              ) : (
                <div>
                  <div className="w-14 h-14 bg-green-50 border-2 border-green-200 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                  </div>
                  <p className="font-semibold text-slate-600">Drag & drop audio file here</p>
                  <p className="text-slate-400 text-xs mt-1">or click to browse</p>
                  <p className="text-slate-300 text-xs mt-3">MP3 · WAV · M4A · OGG · max 50MB</p>
                </div>
              )}
            </div>

            <button
              onClick={handleAnalyze}
              disabled={!file}
              className="grad-btn w-full py-3.5 rounded-2xl font-bold mt-4 text-base"
            >
              Analyze Song
            </button>
          </div>
        )}

        {/* STEP 2 — ANALYZING */}
        {step === 2 && (
          <div className="card text-center py-12">
            <div className="w-20 h-20 grad-btn rounded-3xl flex items-center justify-center mx-auto mb-7 shadow-lg">
              <svg className="w-9 h-9 text-white spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
            </div>
            <h2 className="text-2xl font-black mb-2">Analyzing your song...</h2>
            <p className="text-slate-400 text-sm mb-1">{progressLabel}</p>
            <p className="text-slate-300 text-xs mb-7">This may take 30–90 seconds depending on file size</p>
            <div className="max-w-xs mx-auto">
              <div className="bg-green-100 rounded-full h-2.5 overflow-hidden mb-2">
                <div className="prog-bar h-full" style={{ width: `${progress}%` }}/>
              </div>
              <p className="text-slate-400 text-xs">{progress}%</p>
            </div>
          </div>
        )}

        {/* STEP 3 — RESULT */}
        {step === 3 && result && (
          <div className="space-y-4 fade-in-up">
            {/* Key / BPM / Scale */}
            <div className="grid grid-cols-3 gap-3">
              <div className="grad-btn rounded-2xl p-4 text-center text-white shadow">
                <p className="text-green-100 text-xs font-bold uppercase tracking-wider mb-1">Key</p>
                <p className="text-3xl font-black">{result.key}</p>
                <p className="text-green-100 text-xs capitalize">{result.scale}</p>
              </div>
              <div className="card text-center">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">BPM</p>
                <p className="text-3xl font-black gradient-text">{result.bpm}</p>
              </div>
              <div className="card text-center">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Beats</p>
                <p className="text-3xl font-black gradient-text">{result.totalBeats}</p>
              </div>
            </div>

            {/* Chord grid preview (first 32 beats) */}
            <div className="card">
              <p className="font-bold mb-1">Chord Preview <span className="text-slate-400 font-normal text-sm">(first 32 beats)</span></p>
              <p className="text-slate-400 text-xs mb-4">Save to library to access full sync player</p>
              <div className="grid grid-cols-8 gap-1.5">
                {result.chords.slice(0,32).map((c,i) => (
                  <div key={i} className={`beat-box text-xs font-bold ${ c.chord ? '' : 'opacity-30' }`}>
                    {c.chord || '—'}
                    <span className="beat-num">{i+1}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Unique chords */}
            <div className="card">
              <p className="font-bold mb-3">Chords Found</p>
              <div className="flex flex-wrap gap-2">
                {[...new Set(result.chords.filter(c=>c.chord).map(c=>c.chord))].map(c => (
                  <span key={c} className="bg-green-50 border border-green-200 text-green-800 font-bold px-4 py-2 rounded-xl text-sm">{c}</span>
                ))}
              </div>
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">{error}</div>}

            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={reset} className="flex-1 bg-white border border-green-200 text-slate-600 rounded-2xl py-3 font-semibold text-sm hover:border-blue-300 transition">
                Analyze Another
              </button>
              {!saved ? (
                <button onClick={handleSave} disabled={saving} className="flex-1 grad-btn rounded-2xl py-3 font-bold text-sm flex items-center justify-center gap-2">
                  {saving && <svg className="w-4 h-4 spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>}
                  {saving ? 'Saving...' : 'Save to Library & Play'}
                </button>
              ) : (
                <div className="flex-1 bg-green-50 border border-green-300 text-green-700 rounded-2xl py-3 font-semibold text-sm flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                  Saved! Redirecting...
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
