'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

export default function HomePage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [tab, setTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nama, setNama] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/library')
      else setChecking(false)
    })
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    else router.replace('/library')
    setLoading(false)
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: nama } }
    })
    if (error) setError(error.message)
    else setSuccess('Cek email kamu untuk konfirmasi akun!')
    setLoading(false)
  }

  if (checking) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#f1f5f9]">
      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-violet-600/10 border border-violet-500/30 text-violet-400 text-sm px-4 py-1.5 rounded-full mb-6">
            <span className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" />
            Powered by AI
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4 leading-tight">
            Analisis Lagu YouTube<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">dalam Detik</span>
          </h1>
          <p className="text-[#64748b] text-lg md:text-xl max-w-xl mx-auto mb-8">
            Temukan kunci, chord, BPM, dan melodi secara otomatis dengan AI.
            Simpan ke library pribadimu.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <a href="#auth" className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl px-6 py-2.5 font-semibold transition">
              Mulai Gratis
            </a>
            <a href="#fitur" className="bg-transparent border border-violet-600 text-violet-400 hover:bg-violet-600/10 rounded-xl px-6 py-2.5 font-semibold transition">
              Lihat Fitur
            </a>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-[#64748b]">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* Fitur */}
      <section id="fitur" className="py-24 px-4 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">Semua yang Kamu Butuhkan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: '🎵', title: 'Deteksi Kunci Otomatis', desc: 'AI mendeteksi kunci lagu secara akurat hanya dari URL YouTube.' },
            { icon: '🎸', title: 'Chord Progression', desc: 'Tampilkan urutan chord lengkap supaya kamu bisa langsung mainkan.' },
            { icon: '🥁', title: 'Analisis BPM', desc: 'Ketahui tempo lagu untuk latihan atau remix secara presisi.' },
          ].map((f) => (
            <div key={f.title} className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6 hover:border-violet-500/40 transition">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-[#64748b] text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Auth */}
      <section id="auth" className="py-24 px-4 flex justify-center">
        <div className="w-full max-w-md bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-8">
          <div className="flex gap-2 mb-8 bg-[#0a0a0f] rounded-xl p-1">
            {['login', 'register'].map((t) => (
              <button key={t} onClick={() => { setTab(t); setError(''); setSuccess('') }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
                  tab === t ? 'bg-violet-600 text-white' : 'text-[#64748b] hover:text-white'
                }`}>
                {t === 'login' ? 'Masuk' : 'Daftar'}
              </button>
            ))}
          </div>

          {error && <p className="text-red-400 text-sm mb-4 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{error}</p>}
          {success && <p className="text-green-400 text-sm mb-4 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-2">{success}</p>}

          {tab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-sm text-[#64748b] mb-1 block">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="kamu@email.com"
                  className="w-full bg-[#1e1e2e] border border-[#2e2e3e] rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-violet-500 focus:outline-none px-4 py-2.5 text-sm" />
              </div>
              <div>
                <label className="text-sm text-[#64748b] mb-1 block">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="••••••••"
                  className="w-full bg-[#1e1e2e] border border-[#2e2e3e] rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-violet-500 focus:outline-none px-4 py-2.5 text-sm" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl py-2.5 font-semibold transition flex items-center justify-center gap-2">
                {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Masuk
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="text-sm text-[#64748b] mb-1 block">Nama</label>
                <input type="text" value={nama} onChange={e => setNama(e.target.value)} required
                  placeholder="Nama kamu"
                  className="w-full bg-[#1e1e2e] border border-[#2e2e3e] rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-violet-500 focus:outline-none px-4 py-2.5 text-sm" />
              </div>
              <div>
                <label className="text-sm text-[#64748b] mb-1 block">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="kamu@email.com"
                  className="w-full bg-[#1e1e2e] border border-[#2e2e3e] rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-violet-500 focus:outline-none px-4 py-2.5 text-sm" />
              </div>
              <div>
                <label className="text-sm text-[#64748b] mb-1 block">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="••••••••"
                  className="w-full bg-[#1e1e2e] border border-[#2e2e3e] rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-violet-500 focus:outline-none px-4 py-2.5 text-sm" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl py-2.5 font-semibold transition flex items-center justify-center gap-2">
                {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Daftar Sekarang
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  )
}
