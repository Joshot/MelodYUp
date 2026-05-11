'use client'
export const dynamic = 'force-dynamic'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function UploadPage() {
  const router = useRouter()
  const fileRef = useRef(null)
  const [step, setStep] = useState(1)
  const [file, setFile] = useState(null)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [error, setError] = useState('')
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
      { label: 'Membaca file audio...', pct: 8 },
      { label: 'Mengirim ke AI engine (Replicate basic-pitch)...', pct: 20 },
      { label: 'Mendeteksi nada & melodi...', pct: 40 },
      { label: 'Menganalisis chord progression...', pct: 65 },
      { label: 'Menentukan kunci & skala...', pct: 82 },
      { label: 'Menyimpan ke library...', pct: 95 },
    ]
    let stageIdx = 0
    const stageInterval = setInterval(() => {
      if (stageIdx < stages.length) {
        setProgressLabel(stages[stageIdx].label)
        setProgress(stages[stageIdx].pct)
        stageIdx++
      }
    }, 8000)

    try {
      const formData = new FormData()
      formData.append('audio', file)
      formData.append('title', file.name.replace(/\.[^.]+$/, ''))

      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      })

      clearInterval(stageInterval)

      const data = await res.json()

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Analisis gagal')
      }

      if (data.saveError) {
        throw new Error('Analisis berhasil tapi gagal simpan ke database: ' + data.saveError)
      }

      setProgress(100)
      setProgressLabel('Selesai! Mengarahkan ke player...')

      // Redirect to /songs/[id] — audio will be loaded there
      setTimeout(() => {
        // Store file in sessionStorage as object URL so player can load it
        const audioUrl = URL.createObjectURL(file)
        sessionStorage.setItem(`audio_${data.songId}`, audioUrl)
        router.push(`/songs/${data.songId}`)
      }, 600)

    } catch (err) {
      clearInterval(stageInterval)
      setError(err.message)
      setStep(1)
    }
  }

  const reset = () => { setFile(null); setStep(1); setProgress(0); setError('') }

  return (
    <div className="min-h-screen bg-[#f0fdf4]">
      <nav className="bg-white border-b border-green-100 px-4 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" /></svg>
          </div>
          <span className="font-black text-lg gradient-text">MelodYUp</span>
        </Link>
        <Link href="/library" className="text-slate-500 text-sm font-medium px-4 py-2 rounded-xl hover:bg-green-50 transition">Library</Link>
      </nav>

      <div className="max-w-xl mx-auto px-4 py-8">
        {/* STEPPER */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {['Upload File','Analyzing','Done'].map((s,i) => (
            <div key={s} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step > i+1 ? 'bg-green-500 text-white' :
                  step === i+1 ? 'grad-btn shadow' :
                  'bg-green-50 text-slate-400 border border-green-100'
                }`}>
                  {step > i+1 ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg> : i+1}
                </div>
                <span className={`text-sm font-semibold hidden sm:block ${ step===i+1?'text-slate-700':'text-slate-400' }`}>{s}</span>
              </div>
              {i<2 && <div className={`w-8 h-px ${ step>i+1?'bg-green-400':'bg-green-100' }`}/>}
            </div>
          ))}
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <div className="card">
            <h1 className="text-2xl font-black mb-1">Analyze New Song</h1>
            <p className="text-slate-500 text-sm mb-6">Upload MP3, WAV, M4A, or OGG. Max 50MB. No login required.</p>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4 leading-relaxed">{error}</div>
            )}
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
                  <p className="font-bold text-slate-700 truncate px-4">{file.name}</p>
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
            <button onClick={handleAnalyze} disabled={!file} className="grad-btn w-full py-3.5 rounded-2xl font-bold mt-4 text-base">
              Analyze Song
            </button>
          </div>
        )}

        {/* STEP 2 - ANALYZING */}
        {step === 2 && (
          <div className="card text-center py-14">
            <div className="w-20 h-20 grad-btn rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <svg className="w-9 h-9 text-white spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
            </div>
            <h2 className="text-2xl font-black mb-2">Analyzing your song...</h2>
            <p className="text-slate-500 text-sm mb-1 min-h-[20px]">{progressLabel}</p>
            <p className="text-slate-300 text-xs mb-8">This takes 30–90 seconds · Powered by Spotify basic-pitch AI</p>
            <div className="max-w-xs mx-auto">
              <div className="bg-green-100 rounded-full h-2.5 overflow-hidden mb-2">
                <div className="prog-bar h-full" style={{ width: `${progress}%` }}/>
              </div>
              <p className="text-slate-400 text-xs">{progress}%</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
