'use client'
export const dynamic = 'force-dynamic'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { analyzeAudio } from '../../lib/chordDetector'

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
    if (!f.type.startsWith('audio/')) { setError('Upload audio file (MP3, WAV, M4A, OGG)'); return }
    if (f.size > 60*1024*1024) { setError('File too large — max 60MB'); return }
    setFile(f); setError('')
  }

  const handleAnalyze = async () => {
    if (!file) return
    setError(''); setStep(2); setProgress(0)
    try {
      const onProgress = (label, pct) => { setProgressLabel(label); setProgress(pct) }
      const result = await analyzeAudio(file, onProgress)
      onProgress('Saving to library…', 97)
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: file.name.replace(/\.[^.]+$/, ''), ...result })
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Save failed')
      sessionStorage.setItem(`audio_${data.songId}`, URL.createObjectURL(file))
      onProgress('Done!', 100)
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
        <div className="flex items-center justify-center gap-3 mb-10">
          {['Upload','Analyze','Done'].map((s,i) => (
            <div key={s} className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step>i+1?'bg-emerald-500 text-white':step===i+1?'btn-primary text-white':'bg-slate-100 text-slate-400'
                }`}>
                  {step>i+1
                    ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                    : i+1}
                </div>
                <span className={`text-sm font-medium hidden sm:block ${step===i+1?'text-slate-700':'text-slate-400'}`}>{s}</span>
              </div>
              {i<2 && <div className={`w-10 h-px ${step>i+1?'bg-emerald-400':'bg-slate-200'}`}/>}
            </div>
          ))}
        </div>

        {step===1 && (
          <div className="card shadow-sm fade-up">
            <h1 className="text-xl font-black mb-1">Analyze a Song</h1>
            <p className="text-slate-400 text-sm mb-6">MP3, WAV, M4A or OGG · Max 60MB</p>
            {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-5">{error}</div>}
            <div
              onClick={()=>fileRef.current?.click()}
              onDragOver={e=>{e.preventDefault();setDragOver(true)}}
              onDragLeave={()=>setDragOver(false)}
              onDrop={e=>{e.preventDefault();setDragOver(false);handleFile(e.dataTransfer.files[0])}}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                dragOver?'border-blue-400 bg-blue-50':file?'border-emerald-400 bg-emerald-50':'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={e=>handleFile(e.target.files[0])}/>
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
            <div className="mt-5 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
              <p className="text-slate-600 text-xs font-semibold mb-0.5">⚡ Pitch-first · Processed in your browser</p>
              <p className="text-slate-400 text-xs">FFT peak picking → MIDI notes → chord names. No templates, no guessing.</p>
            </div>
            <button onClick={handleAnalyze} disabled={!file} className="btn-primary w-full py-3 rounded-xl mt-4 text-sm">
              Analyze Song
            </button>
          </div>
        )}

        {step===2 && (
          <div className="card text-center py-14 shadow-sm fade-up">
            <div className="w-16 h-16 btn-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md">
              <svg className="w-8 h-8 text-white spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
            </div>
            <h2 className="text-xl font-black mb-2">Analyzing your song…</h2>
            <p className="text-slate-500 text-sm mb-1 font-medium">{progressLabel}</p>
            <p className="text-slate-300 text-xs mb-8">Detecting pitches beat-by-beat · 30–60s</p>
            <div className="max-w-xs mx-auto">
              <div className="prog-track h-2 mb-2">
                <div className="prog-fill h-full" style={{width:`${progress}%`}}/>
              </div>
              <p className="text-slate-400 text-xs">{progress}%</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
