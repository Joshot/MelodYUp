'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '../../lib/supabase'

function getYouTubeId(url) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/)
  return match ? match[1] : null
}

const dummyAnalysis = {
  key_note: 'C',
  key_scale: 'major',
  bpm: 120,
  chords: ['C', 'Am', 'F', 'G', 'C', 'Em', 'F', 'G'],
  capo: 0,
}

export default function UploadPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [step, setStep] = useState(1)
  const [url, setUrl] = useState('')
  const [videoId, setVideoId] = useState(null)
  const [videoTitle, setVideoTitle] = useState('')
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/'); return }
      setUser(session.user)
    })
  }, [])

  const handleAnalyze = () => {
    const id = getYouTubeId(url)
    if (!id) { setError('URL YouTube tidak valid'); return }
    setVideoId(id)
    setVideoTitle('Judul Lagu (dari YouTube)')
    setError('')
    setStep(2)
    setProgress(0)

    let p = 0
    const interval = setInterval(() => {
      p += Math.random() * 18
      if (p >= 100) { p = 100; clearInterval(interval); setResult(dummyAnalysis); setStep(3) }
      setProgress(Math.min(p, 100))
    }, 300)
  }

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase.from('songs').insert({
      user_id: user.id,
      title: videoTitle,
      youtube_url: url,
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      key_note: result.key_note,
      key_scale: result.key_scale,
      bpm: result.bpm,
      chords: result.chords,
    })
    setSaving(false)
    if (error) { setError(error.message); return }
    router.push('/library')
  }

  const steps = ['Input URL', 'Analisis', 'Hasil']

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#f1f5f9] flex flex-col">
      <header className="sticky top-0 backdrop-blur-md bg-[#0a0a0f]/80 border-b border-[#1e1e2e] px-6 py-4 flex items-center gap-4">
        <Link href="/library" className="text-[#64748b] hover:text-white transition text-sm">← Library</Link>
        <h1 className="font-bold text-lg">Analisis Lagu Baru</h1>
      </header>

      <div className="flex-1 flex flex-col items-center px-4 py-12">
        {/* Stepper */}
        <div className="flex items-center gap-2 mb-12">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition ${
                step > i + 1 ? 'bg-green-500 text-white' :
                step === i + 1 ? 'bg-violet-600 text-white' :
                'bg-[#1e1e2e] text-[#64748b]'
              }`}>{step > i + 1 ? '✓' : i + 1}</div>
              <span className={`text-sm hidden sm:block ${
                step === i + 1 ? 'text-white font-semibold' : 'text-[#64748b]'
              }`}>{s}</span>
              {i < steps.length - 1 && <div className={`w-8 h-0.5 ${
                step > i + 1 ? 'bg-green-500' : 'bg-[#1e1e2e]'
              }`} />}
            </div>
          ))}
        </div>

        <div className="w-full max-w-2xl">
          {/* Step 1 */}
          {step === 1 && (
            <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-8">
              <h2 className="text-xl font-bold mb-2">Paste URL YouTube</h2>
              <p className="text-[#64748b] text-sm mb-6">Masukkan link lagu yang ingin dianalisis</p>
              {error && <p className="text-red-400 text-sm mb-4 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{error}</p>}
              <input value={url} onChange={e => setUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full bg-[#1e1e2e] border border-[#2e2e3e] rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-violet-500 focus:outline-none px-4 py-3 text-sm mb-4" />
              {getYouTubeId(url) && (
                <div className="flex gap-4 items-center bg-[#1e1e2e] rounded-xl p-3 mb-4">
                  <Image
                    src={`https://img.youtube.com/vi/${getYouTubeId(url)}/mqdefault.jpg`}
                    alt="preview" width={120} height={68} className="rounded-lg object-cover" />
                  <div>
                    <p className="text-sm font-medium">Preview tersedia</p>
                    <p className="text-xs text-[#64748b]">ID: {getYouTubeId(url)}</p>
                  </div>
                </div>
              )}
              <button onClick={handleAnalyze} disabled={!getYouTubeId(url)}
                className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl py-3 font-semibold transition">
                Mulai Analisis
              </button>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-violet-600/10 border-2 border-violet-500/30 flex items-center justify-center mx-auto mb-6 animate-pulse-ring">
                <span className="text-3xl">🎵</span>
              </div>
              <h2 className="text-xl font-bold mb-2">Menganalisis Lagu...</h2>
              <p className="text-[#64748b] text-sm mb-8">AI sedang memproses audio dan mendeteksi kunci, chord, dan BPM</p>
              <div className="bg-[#1e1e2e] rounded-full h-2 overflow-hidden mb-2">
                <div className="h-full bg-gradient-to-r from-violet-600 to-cyan-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }} />
              </div>
              <p className="text-[#64748b] text-xs">{Math.round(progress)}%</p>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && result && (
            <div className="space-y-4">
              <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-8 text-center">
                <p className="text-[#64748b] text-sm mb-1">Kunci Terdeteksi</p>
                <p className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">
                  {result.key_note} <span className="text-3xl">{result.key_scale}</span>
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6 text-center">
                  <p className="text-[#64748b] text-sm mb-1">BPM</p>
                  <p className="text-4xl font-bold text-cyan-400">{result.bpm}</p>
                </div>
                <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6 text-center">
                  <p className="text-[#64748b] text-sm mb-1">Capo</p>
                  <p className="text-4xl font-bold">{result.capo === 0 ? 'Tidak' : `Fret ${result.capo}`}</p>
                </div>
              </div>
              <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6">
                <p className="text-[#64748b] text-sm mb-3">Chord Progression</p>
                <div className="flex gap-2 flex-wrap">
                  {result.chords.map((c, i) => (
                    <span key={i} className="bg-[#1e1e2e] border border-[#2e2e3e] text-white rounded-xl px-4 py-2 font-bold text-sm">{c}</span>
                  ))}
                </div>
              </div>
              {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{error}</p>}
              <div className="flex gap-3">
                <button onClick={() => { setStep(1); setUrl(''); setResult(null) }}
                  className="flex-1 bg-transparent border border-violet-600 text-violet-400 hover:bg-violet-600/10 rounded-xl py-3 font-semibold transition">
                  Analisis Ulang
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl py-3 font-semibold transition flex items-center justify-center gap-2">
                  {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Simpan ke Library
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
