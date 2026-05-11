'use client'
export const dynamic = 'force-dynamic'
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#f0fdf4]">
      {/* NAV */}
      <nav className="bg-white border-b border-green-100 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center shadow">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
            </svg>
          </div>
          <span className="font-black text-xl tracking-tight gradient-text">MelodYUp</span>
        </div>
        <div className="flex gap-3">
          <Link href="/library" className="text-slate-500 hover:text-slate-800 text-sm font-medium px-4 py-2 rounded-xl hover:bg-green-50 transition">Library</Link>
          <Link href="/upload" className="grad-btn px-5 py-2 rounded-xl text-sm font-bold shadow">Analyze Song</Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="max-w-5xl mx-auto px-4 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold px-4 py-2 rounded-full mb-8">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
          No login required — upload any MP3 instantly
        </div>
        <h1 className="text-5xl md:text-6xl font-black mb-5 leading-tight">
          Upload a song.<br />
          <span className="gradient-text">Know every chord.</span>
        </h1>
        <p className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          MelodYUp analyzes your MP3 and gives you real chord detection, melody notes, BPM, key, Nashville numbering, and transpose — all synced live with your audio.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/upload" className="grad-btn px-8 py-3.5 rounded-2xl font-bold text-base shadow-lg">
            Upload & Analyze
          </Link>
          <Link href="/library" className="bg-white border border-green-200 text-slate-700 px-8 py-3.5 rounded-2xl font-semibold text-base hover:border-blue-300 hover:shadow transition">
            Browse Library
          </Link>
        </div>

        {/* preview mock */}
        <div className="mt-16 bg-white border border-green-100 rounded-3xl p-6 max-w-2xl mx-auto shadow-md">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-5">Live Chord Sync Preview</p>
          <div className="grid grid-cols-8 gap-1.5 mb-5">
            {['G','G','G','G','Em','Em','Em','Em','C','C','C','C','D','D','D','D'].map((c,i) => (
              <div key={i} className={`beat-box text-sm font-black ${ i===0?'active':'' }`}>
                {c}
                <span className="beat-num">{i+1}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-6 text-sm flex-wrap">
            <span className="text-slate-400">Key: <strong className="text-slate-700">G Major</strong></span>
            <span className="text-slate-400">BPM: <strong className="text-slate-700">120</strong></span>
            <span className="text-slate-400">Capo: <strong className="text-slate-700">None</strong></span>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <p className="text-center text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">What you get</p>
          <h2 className="text-3xl font-black text-center mb-12">Everything a musician needs</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" /></svg>, title: 'Real Chord Detection', desc: 'AI-powered chord recognition from your audio using Spotify basic-pitch neural network.' },
              { icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>, title: 'Live BPM Sync', desc: 'Chord grid scrolls and highlights in real-time as your song plays, beat by beat.' },
              { icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" /></svg>, title: 'Transpose & Capo', desc: 'Shift any song to your preferred key instantly — chords update automatically.' },
              { icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>, title: 'Nashville Numbering', desc: 'See chord function numbers (1, 4, 5, 6m) relative to the song key automatically.' },
              { icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>, title: 'Song Library', desc: 'All analyzed songs saved to Supabase — accessible anytime from any device.' },
              { icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>, title: 'Personal Notes', desc: 'Add fingering tips, personal notes, and annotations to any song.' },
            ].map((f,i) => (
              <div key={i} className="card group hover:border-blue-200 hover:shadow-md transition">
                <div className="w-11 h-11 bg-green-50 group-hover:bg-blue-50 rounded-xl flex items-center justify-center mb-4 text-green-600 group-hover:text-blue-600 transition">{f.icon}</div>
                <h3 className="font-bold mb-1.5">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW */}
      <section className="py-20 bg-[#f0fdf4]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">Process</p>
          <h2 className="text-3xl font-black mb-12">From MP3 to chords in seconds</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { n:'01', t:'Upload MP3', d:'Drag or pick any audio file from your device' },
              { n:'02', t:'AI Analysis', d:'Replicate basic-pitch neural network detects every note & chord' },
              { n:'03', t:'Play & Sync', d:'Hit play — chords highlight beat-by-beat in real time' },
              { n:'04', t:'Save & Practice', d:'Song saved to your library permanently' },
            ].map((s,i) => (
              <div key={i} className="text-left">
                <div className="w-12 h-12 grad-btn rounded-2xl flex items-center justify-center font-black text-lg mb-4 shadow">{s.n}</div>
                <h3 className="font-bold mb-1.5">{s.t}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto bg-gradient-to-br from-green-400 to-blue-500 rounded-3xl p-14 text-center text-white shadow-xl">
          <p className="text-green-100 text-xs font-bold uppercase tracking-widest mb-4">Free — No Signup</p>
          <h2 className="text-3xl md:text-4xl font-black mb-4">Ready to learn any song?</h2>
          <p className="text-green-50 mb-8 text-base">Upload an MP3 and MelodYUp will detect every chord, sync them live, and save to your library.</p>
          <Link href="/upload" className="bg-white text-green-600 font-black px-10 py-3.5 rounded-2xl text-base hover:shadow-xl transition inline-block">
            Analyze a Song Now
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-green-100 py-10 px-4 bg-white">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" /></svg>
            </div>
            <span className="font-bold gradient-text">MelodYUp</span>
          </div>
          <p className="text-slate-400 text-sm">Crafted by <span className="font-semibold text-slate-600">Hyvaroo Labs</span>. Engineered for musicians.</p>
          <div className="flex gap-5">
            <Link href="/upload" className="text-slate-400 hover:text-slate-700 text-sm transition">Analyze</Link>
            <Link href="/library" className="text-slate-400 hover:text-slate-700 text-sm transition">Library</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
