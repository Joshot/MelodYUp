'use client'
export const dynamic = 'force-dynamic'
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <nav className="bg-white/80 backdrop-blur border-b border-slate-100 px-5 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 g-bg rounded-xl flex items-center justify-center shadow">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"/></svg>
          </div>
          <span className="font-black text-xl g-text">MelodYUp</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/library" className="text-slate-500 text-sm font-medium hover:text-slate-800 transition hidden sm:block">Library</Link>
          <Link href="/upload" className="g-btn px-5 py-2.5 rounded-xl text-sm font-bold shadow-md">Analyze Song</Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="max-w-5xl mx-auto px-4 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-4 py-2 rounded-full mb-8">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
          100% browser-based · No server · No card required
        </div>
        <h1 className="text-5xl sm:text-6xl font-black mb-6 leading-[1.1] tracking-tight">
          Upload a song.<br/>
          <span className="g-text">Know every chord.</span>
        </h1>
        <p className="text-slate-500 text-lg sm:text-xl max-w-xl mx-auto mb-10 leading-relaxed">
          Drag in any MP3 and MelodYUp detects chords beat-by-beat, syncs them live as you listen — like Chordify, but free.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/upload" className="g-btn px-9 py-4 rounded-2xl font-bold text-base shadow-lg">
            Analyze a Song
          </Link>
          <Link href="/library" className="bg-white border border-slate-200 text-slate-700 px-9 py-4 rounded-2xl font-semibold text-base hover:border-blue-300 hover:shadow-md transition">
            Browse Library
          </Link>
        </div>

        {/* Mock chord grid */}
        <div className="mt-16 bg-white border border-slate-200 rounded-3xl p-6 max-w-xl mx-auto shadow-md text-left">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-bold text-sm">Sukacita di Surga</p>
              <p className="text-slate-400 text-xs">Key: G Major · 92 BPM</p>
            </div>
            <div className="w-9 h-9 g-btn rounded-xl flex items-center justify-center shadow">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </div>
          </div>
          <div className="grid grid-cols-8 gap-1.5">
            {['G','','','','Em','','','','C','','','','D','','','G'].map((c,i) => (
              <div key={i} className={`beat ${ i===4?'beat-active':c?'beat-new':'' }`} style={{minHeight:44}}>
                <span className="chord-label">{c}</span>
                <span className="bn">{i+1}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <p className="text-center text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">Features</p>
          <h2 className="text-3xl font-black text-center mb-12">Everything a guitarist needs</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { title:'Chord Detection', desc:'Chromagram + template matching detects major & minor chords beat by beat from your audio.' },
              { title:'Live Sync', desc:'Hit play — the chord grid highlights the active beat in real-time as your song plays.' },
              { title:'Transpose', desc:'Shift all chords ±6 semitones to match your capo or preferred key instantly.' },
              { title:'Nashville Numbers', desc:'Toggle to see chord function numbers (1, 4, 5, 6m) relative to the song key.' },
              { title:'Persistent Library', desc:'All analyzed songs saved to Supabase — open any song by URL anytime.' },
              { title:'My Notes', desc:'Add personal fingering tips and annotations to each song in your library.' },
            ].map((f,i) => (
              <div key={i} className="card card-hover">
                <div className="w-10 h-10 g-bg rounded-xl flex items-center justify-center mb-4 shadow-sm">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                </div>
                <h3 className="font-bold mb-1.5">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto g-bg rounded-3xl p-14 text-center text-white shadow-2xl">
          <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-4">Free · No Signup · No Card</p>
          <h2 className="text-3xl font-black mb-4">Ready to learn any song?</h2>
          <p className="text-white/70 mb-8">Upload an MP3 and see every chord instantly.</p>
          <Link href="/upload" className="bg-white text-emerald-600 font-black px-10 py-3.5 rounded-2xl hover:shadow-2xl transition inline-block text-base">
            Analyze Now
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-8 px-4 bg-white">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-bold g-text">MelodYUp</span>
          <p className="text-slate-400 text-sm">Crafted by <strong className="text-slate-600">Hyvaroo Labs</strong></p>
          <div className="flex gap-5">
            <Link href="/upload" className="text-slate-400 hover:text-slate-700 text-sm transition">Analyze</Link>
            <Link href="/library" className="text-slate-400 hover:text-slate-700 text-sm transition">Library</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
