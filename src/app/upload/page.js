'use client'
export const dynamic = 'force-dynamic'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { analyzeAudio } from '../../lib/analyzer'

export default function UploadPage() {
  const router = useRouter()
  const fileRef = useRef(null)
  const [file, setFile] = useState(null)
  const [step, setStep] = useState(1)
  const [progress, setProgress] = useState(0)
  const [label, setLabel] = useState('')
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const handleFile = f => {
    if (!f) return
    if (!f.type.startsWith('audio/')) { setError('File harus audio (MP3, WAV, M4A, OGG)'); return }
    if (f.size > 60 * 1024 * 1024) { setError('Maksimal 60MB'); return }
    setFile(f); setError('')
  }

  const handleAnalyze = async () => {
    if (!file) return
    setError(''); setStep(2); setProgress(0)
    try {
      const result = await analyzeAudio(file, (lbl, pct) => {
        setLabel(lbl); setProgress(pct)
      })

      setLabel('Saving to library...'); setProgress(98)

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: file.name.replace(/\.[^.]+$/, ''),
          filename: file.name,
          ...result,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Save failed')

      setProgress(100); setLabel('Done!')
      // Cache audio URL for player
      sessionStorage.setItem(`audio_${data.songId}`, URL.createObjectURL(file))
      setTimeout(() => router.push(`/songs/${data.songId}`), 500)
    } catch (e) {
      setError(e.message); setStep(1)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* NAV */}
      <nav className="bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 g-bg rounded-xl flex items-center justify-center shadow-sm">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"/></svg>
          </div>
          <span className="font-black text-lg g-text">MelodYUp</span>
        </Link>
        <Link href="/library" className="text-slate-500 text-sm font-medium hover:text-slate-800 transition">Library</Link>
      </nav>

      <div className="max-w-lg mx-auto px-4 py-10">
        {/* Stepper */}
        <div className="flex items-center justify-center gap-3 mb-10">
          {['Upload','Analyzing','Done'].map((s, i) => (
            <div key={s} className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step > i+1 ? 'bg-emerald-500 text-white' :
                  step === i+1 ? 'g-btn shadow-md' :
                  'bg-slate-100 text-slate-400'
                }`}>
                  {step > i+1
                    ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                    : i+1
                  }
                </div>
                <span className={`text-sm font-semibold hidden sm:block ${ step===i+1 ? 'text-slate-700' : 'text-slate-300' }`}>{s}</span>
              </div>
              {i < 2 && <div className={`w-6 h-px ${ step > i+1 ? 'bg-emerald-400' : 'bg-slate-200' }`}/>}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="card fade-up">
            <h1 className="text-2xl font-black mb-1">Analyze a Song</h1>
            <p className="text-slate-400 text-sm mb-6">Upload audio and get chord detection in your browser. No API, no waiting.</p>

            {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl px-4 py-3 text-sm mb-4">{error}</div>}

            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                dragOver ? 'border-blue-400 bg-blue-50 scale-[1.01]' :
                file ? 'border-emerald-400 bg-emerald-50' :
                'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
              }`}
            >
              <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
              {file ? (
                <div>
                  <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"/></svg>
                  </div>
                  <p className="font-bold text-slate-700 truncate px-4">{file.name}</p>
                  <p className="text-slate-400 text-xs mt-1">{(file.size/1024/1024).toFixed(2)} MB</p>
                  <button onClick={e => { e.stopPropagation(); setFile(null) }} className="mt-3 text-xs text-red-400 hover:text-red-600 transition font-medium">Remove</button>
                </div>
              ) : (
                <div>
                  <div className="w-14 h-14 bg-slate-50 border-2 border-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                  </div>
                  <p className="font-semibold text-slate-600">Drop audio file here</p>
                  <p className="text-slate-400 text-xs mt-1">or click to browse</p>
                  <p className="text-slate-300 text-xs mt-3">MP3 · WAV · M4A · OGG · max 60MB</p>
                </div>
              )}
            </div>

            <button onClick={handleAnalyze} disabled={!file} className="g-btn w-full py-3.5 rounded-2xl font-bold mt-4 text-base shadow-md">
              Analyze Song
            </button>

            <p className="text-center text-slate-300 text-xs mt-4">Analysis runs entirely in your browser · Nothing uploaded to servers</p>
          </div>
        )}

        {step === 2 && (
          <div className="card text-center py-14 fade-up">
            <div className="relative w-20 h-20 mx-auto mb-7">
              <div className="absolute inset-0 g-bg rounded-3xl opacity-20 pulse-ring"/>
              <div className="w-20 h-20 g-btn rounded-3xl flex items-center justify-center shadow-xl relative">
                <svg className="w-9 h-9 text-white spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-black mb-2">Analyzing audio...</h2>
            <p className="text-slate-400 text-sm mb-1">{label}</p>
            <p className="text-slate-300 text-xs mb-8">Running in your browser · No data leaves your device</p>
            <div className="max-w-xs mx-auto">
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                <div className="prog h-full" style={{ width: `${progress}%` }}/>
              </div>
              <p className="text-slate-400 text-xs font-semibold">{progress}%</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
