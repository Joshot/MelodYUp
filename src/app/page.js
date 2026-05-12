'use client'
export const dynamic = 'force-dynamic'
import Link from 'next/link'

const features = [
  { title: 'Upload MP3 / WAV', desc: 'Drag & drop any audio file — no login, no limits.' },
  { title: 'Live Chord Sync', desc: 'Chord grid highlights beat-by-beat as your song plays.' },
  { title: 'Key & BPM Detection', desc: 'Automatic key, scale, and tempo analysis.' },
  { title: 'Nashville Numbers', desc: 'Toggle chord numbers relative to the key (1, 4, 5, 6m…).' },
  { title: 'Transpose ±6', desc: 'Shift all chords up or down in semitones instantly.' },
  { title: 'Saved Library', desc: 'All songs saved to Supabase — accessible anytime.' },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <nav className="bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl btn-primary flex items-center justify-center shadow-sm">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
            </svg>
          </div>
          <span className="font-black text-lg gradient-text">MelodYUp</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/library" className="text-slate-500 text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-50 transition">Library</Link>
          <Link href="/upload" className="btn-primary px-4 py-2 rounded-xl text-sm shadow-sm">Analyze Song</Link>
        </div>
      </nav>

      <section className="max-w-4xl mx-auto px-5 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-8">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full pulse-ring inline-block"></span>
          No login required
        </div>
        <h1 className="text-4xl sm:text-6xl font-black mb-5 leading-tight tracking-tight">
          Upload a song.<br />
          <span className="gradient-text">Know every chord.</span>
        </h1>
        <p className="text-slate-400 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
          MelodYUp detects chords from any audio file and syncs them live as you play — like Chordify, for free.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link href="/upload" className="btn-primary px-8 py-3.5 rounded-2xl text-base shadow-lg">Upload & Analyze</Link>
          <Link href="/library" className="bg-white border border-slate-200 text-slate-600 px-8 py-3.5 rounded-2xl font-semibold text-base hover:border-slate-300 hover:shadow transition">Browse Library</Link>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-5 pb-20">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <div key={i} className="card hover:border-slate-300 hover:shadow-sm transition">
              <p className="font-bold text-sm mb-1">{f.title}</p>
              <p className="text-slate-400 text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 px-5">
        <div className="max-w-2xl mx-auto btn-primary rounded-3xl p-12 text-center shadow-xl">
          <h2 className="text-3xl font-black mb-3 text-white">Ready to learn any song?</h2>
          <p className="text-emerald-100 mb-8 text-sm">Upload an MP3 and get chords in seconds.</p>
          <Link href="/upload" className="bg-white text-emerald-600 font-black px-8 py-3 rounded-xl text-sm hover:shadow-lg transition inline-block">
            Analyze a Song
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-8 px-5 text-center">
        <p className="text-slate-400 text-sm">MelodYUp by <span className="font-semibold text-slate-600">Hyvaroo Labs</span></p>
      </footer>
    </div>
  )
}
