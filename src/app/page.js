'use client'
export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

const TECH_STACK = ['Next.js', 'Supabase', 'Tailwind CSS', 'Vercel', 'React', 'PostgreSQL', 'Node.js', 'TypeScript']

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
    ),
    title: 'Chord Detection',
    desc: 'Real-time chord progression extraction from any YouTube link with high precision analysis.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
    ),
    title: 'Key & Scale',
    desc: 'Instantly identify the musical key and scale — major, minor, modal variants.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
    ),
    title: 'BPM Analysis',
    desc: 'Precise tempo detection to help you practice, remix, or synchronize with any track.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
    ),
    title: 'Song Library',
    desc: 'Save, organize, and revisit your analyzed songs in a personal curated library.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg>
    ),
    title: 'YouTube Sync',
    desc: 'Paste any YouTube URL and get instant musical analysis with live video playback.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
    ),
    title: 'Personal Notes',
    desc: 'Add annotations, fingerings, and custom notes to any song in your library.',
  },
]

const PROCESS = [
  { num: '01', title: 'Paste YouTube URL', desc: 'Drop any YouTube link into Hyvaroo — no account required.' },
  { num: '02', title: 'AI Analysis', desc: 'Our engine extracts chords, key, BPM and scale in seconds.' },
  { num: '03', title: 'Explore Results', desc: 'View chord progression, follow along in real-time with the video.' },
  { num: '04', title: 'Save & Practice', desc: 'Save to your library, add notes, and return whenever you need.' },
]

export default function HomePage() {
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="min-h-screen bg-white text-[#0F172A] overflow-x-hidden">

      {/* NAV */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrollY > 40 ? 'bg-white/90 backdrop-blur-md shadow-sm border-b border-[#E2E8F0]' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F8CFF] to-[#7C3AED] flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
              </svg>
            </div>
            <span className="font-bold text-lg tracking-tight">Hyvaroo</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-[#475569] hover:text-[#0F172A] text-sm font-medium transition">Features</a>
            <a href="#how" className="text-[#475569] hover:text-[#0F172A] text-sm font-medium transition">How it works</a>
            <a href="#philosophy" className="text-[#475569] hover:text-[#0F172A] text-sm font-medium transition">Philosophy</a>
            <Link href="/analyze" className="bg-gradient-to-r from-[#4F8CFF] to-[#7C3AED] text-white px-5 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition">
              Try Now
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 pt-24 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-blue-100 to-purple-100 rounded-full blur-3xl opacity-60" />
          <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-gradient-to-br from-purple-100 to-pink-100 rounded-full blur-3xl opacity-50" />
          <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0F172A" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 text-[#4F8CFF] text-xs font-semibold px-4 py-2 rounded-full mb-8 animate-fade-in-up">
            <div className="w-1.5 h-1.5 bg-[#4F8CFF] rounded-full animate-pulse-soft" />
            Hyvaroo Labs — High Value. Forward Route.
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-none tracking-tight animate-fade-in-up delay-100">
            Hear the music.<br />
            <span className="gradient-text">Understand the chords.</span>
          </h1>

          <p className="text-[#475569] text-xl md:text-2xl max-w-2xl mx-auto mb-10 leading-relaxed font-light animate-fade-in-up delay-200">
            Paste any YouTube link. Get instant chord detection, key analysis, and BPM — no signup required.
          </p>

          <div className="flex gap-4 justify-center flex-wrap animate-fade-in-up delay-300">
            <Link href="/analyze"
              className="bg-gradient-to-r from-[#4F8CFF] to-[#7C3AED] text-white px-8 py-3.5 rounded-2xl font-bold text-base hover:opacity-90 hover:shadow-xl hover:shadow-blue-200 transition-all duration-300">
              Analyze a Song
            </Link>
            <Link href="/library"
              className="bg-white border border-[#E2E8F0] text-[#0F172A] px-8 py-3.5 rounded-2xl font-semibold text-base hover:border-[#4F8CFF] hover:shadow-md transition-all duration-300">
              Browse Library
            </Link>
          </div>

          {/* Mock chord display */}
          <div className="mt-16 bg-[#F8FAFC] border border-[#E2E8F0] rounded-3xl p-6 max-w-2xl mx-auto animate-fade-in-up delay-400 shadow-lg">
            <p className="text-[#475569] text-xs font-semibold uppercase tracking-widest mb-4">Sample Output — Shape of You / Ed Sheeran</p>
            <div className="flex gap-2 justify-center flex-wrap mb-4">
              {['C#m', 'F#', 'A', 'B', 'C#m', 'F#', 'A', 'B'].map((c, i) => (
                <span key={i} className={`px-4 py-2 rounded-xl font-bold text-sm border ${
                  i === 0 ? 'bg-gradient-to-r from-[#4F8CFF] to-[#7C3AED] text-white border-transparent' : 'bg-white border-[#E2E8F0] text-[#0F172A]'
                }`}>{c}</span>
              ))}
            </div>
            <div className="flex justify-center gap-6 text-sm">
              <span className="text-[#475569]">Key: <strong className="text-[#0F172A]">C# Minor</strong></span>
              <span className="text-[#475569]">BPM: <strong className="text-[#0F172A]">96</strong></span>
              <span className="text-[#475569]">Scale: <strong className="text-[#0F172A]">Natural Minor</strong></span>
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <section className="py-8 border-y border-[#E2E8F0] overflow-hidden bg-[#F8FAFC]">
        <div className="flex gap-16 animate-marquee whitespace-nowrap">
          {[...TECH_STACK, ...TECH_STACK].map((t, i) => (
            <span key={i} className="text-[#475569] text-sm font-medium tracking-wide">{t}</span>
          ))}
        </div>
      </section>

      {/* PHILOSOPHY */}
      <section id="philosophy" className="py-32 px-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div>
            <p className="text-[#4F8CFF] text-sm font-bold uppercase tracking-widest mb-4">Our Foundation</p>
            <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
              Built on the principle of<br />
              <span className="gradient-text">High Value Engineering</span>
            </h2>
            <p className="text-[#475569] text-lg leading-relaxed mb-6">
              Hyvaroo is derived from two words: <strong className="text-[#0F172A]">Hyva</strong> — meaning High Value — and <strong className="text-[#0F172A]">roo</strong>, inspired by the word <em>route</em>. Together, they represent our philosophy: deliver maximum value through a clear, forward direction.
            </p>
            <p className="text-[#475569] text-lg leading-relaxed mb-8">
              Every feature, every line of code, every design decision is made with purpose. We do not build for the sake of building — we engineer for impact.
            </p>
            <div className="flex flex-col gap-3">
              {['Precision over complexity', 'Performance-first architecture', 'Design as a function of clarity'].map(p => (
                <div key={p} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-r from-[#4F8CFF] to-[#7C3AED] flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <span className="text-[#0F172A] font-medium">{p}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl p-10 border border-[#E2E8F0]">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Chords Analyzed', value: '50K+' },
                  { label: 'Songs Processed', value: '12K+' },
                  { label: 'Keys Detected', value: '99.2%' },
                  { label: 'Response Time', value: '<2s' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-sm">
                    <p className="text-3xl font-black gradient-text mb-1">{s.value}</p>
                    <p className="text-[#475569] text-sm">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-32 bg-[#F8FAFC] px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[#4F8CFF] text-sm font-bold uppercase tracking-widest mb-3">Capabilities</p>
            <h2 className="text-4xl md:text-5xl font-black mb-4">Everything a musician needs</h2>
            <p className="text-[#475569] text-lg max-w-xl mx-auto">Hyvaroo brings professional-grade music analysis to everyone — free, instant, no account required.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div key={i} className="bg-white border border-[#E2E8F0] rounded-2xl p-7 hover:shadow-lg hover:border-blue-200 transition-all duration-300 group">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl flex items-center justify-center mb-5 text-[#4F8CFF] group-hover:from-[#4F8CFF] group-hover:to-[#7C3AED] group-hover:text-white transition-all duration-300">
                  {f.icon}
                </div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-[#475569] text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-32 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-[#4F8CFF] text-sm font-bold uppercase tracking-widest mb-3">Process</p>
          <h2 className="text-4xl md:text-5xl font-black mb-4">From URL to chords in seconds</h2>
          <p className="text-[#475569] text-lg max-w-xl mx-auto">Engineered for speed. Designed for clarity. Built by Hyvaroo.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {PROCESS.map((p, i) => (
            <div key={i} className="relative">
              {i < PROCESS.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-[#E2E8F0] to-transparent z-0" />
              )}
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#4F8CFF] to-[#7C3AED] flex items-center justify-center text-white font-black text-lg mb-5 shadow-lg shadow-blue-200">
                  {p.num}
                </div>
                <h3 className="font-bold text-lg mb-2">{p.title}</h3>
                <p className="text-[#475569] text-sm leading-relaxed">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TECH SECTION */}
      <section className="py-32 bg-[#F8FAFC] px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="order-2 lg:order-1">
            <div className="bg-white border border-[#E2E8F0] rounded-3xl p-8 font-mono text-sm shadow-sm">
              <div className="flex gap-1.5 mb-6">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="space-y-1 text-[#475569]">
                <p><span className="text-[#7C3AED]">const</span> <span className="text-[#4F8CFF]">analysis</span> = <span className="text-[#7C3AED]">await</span> hyvaroo</p>
                <p className="pl-4">.analyze(<span className="text-green-600">&apos;youtube.com/watch?v=...&apos;</span>)</p>
                <p><span className="text-[#475569]">// Returns:</span></p>
                <p className="text-[#0F172A]">{'{'}</p>
                <p className="pl-4">key: <span className="text-green-600">&apos;C# Minor&apos;</span>,</p>
                <p className="pl-4">bpm: <span className="text-[#4F8CFF]">96</span>,</p>
                <p className="pl-4">chords: [<span className="text-green-600">&apos;C#m&apos;</span>, <span className="text-green-600">&apos;F#&apos;</span>, <span className="text-green-600">&apos;A&apos;</span>, <span className="text-green-600">&apos;B&apos;</span>],</p>
                <p className="pl-4">scale: <span className="text-green-600">&apos;natural minor&apos;</span>,</p>
                <p className="pl-4">confidence: <span className="text-[#4F8CFF]">0.97</span></p>
                <p className="text-[#0F172A]">{'}'}</p>
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <p className="text-[#4F8CFF] text-sm font-bold uppercase tracking-widest mb-4">Technology</p>
            <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
              Performance-first<br />
              <span className="gradient-text">architecture</span>
            </h2>
            <p className="text-[#475569] text-lg leading-relaxed mb-6">
              Built on Next.js 16 with Turbopack, Supabase for real-time data, and a custom chord detection pipeline — Hyvaroo is engineered for sub-second response at scale.
            </p>
            <p className="text-[#475569] text-lg leading-relaxed">
              Every request is optimized. Every render is intentional. Crafted by Hyvaroo Labs for scalable growth.
            </p>
          </div>
        </div>
      </section>

      {/* DESIGN PHILOSOPHY */}
      <section className="py-32 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-[#4F8CFF] text-sm font-bold uppercase tracking-widest mb-3">Design System</p>
          <h2 className="text-4xl md:text-5xl font-black mb-4">Design as a language</h2>
          <p className="text-[#475569] text-lg max-w-xl mx-auto">Every visual element communicates direction, clarity, and movement — aligned with Hyvaroo's forward-route philosophy.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: 'Spatial Clarity', desc: 'Generous whitespace and structured hierarchy let the music speak, not the interface.' },
            { title: 'Motion Direction', desc: 'All animations flow left-to-right, mirroring the forward momentum of the Hyvaroo roo philosophy.' },
            { title: 'Typographic Scale', desc: 'Inter at extreme weights creates visual rhythm that mirrors musical structure.' },
          ].map((d, i) => (
            <div key={i} className="gradient-border rounded-2xl p-7">
              <div className="text-4xl font-black gradient-text mb-4">0{i + 1}</div>
              <h3 className="font-bold text-lg mb-2">{d.title}</h3>
              <p className="text-[#475569] text-sm leading-relaxed">{d.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-4">
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-[#4F8CFF] to-[#7C3AED] rounded-3xl p-16 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <svg width="100%" height="100%"><defs><pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.5" fill="white"/></pattern></defs><rect width="100%" height="100%" fill="url(#dots)"/></svg>
          </div>
          <div className="relative z-10">
            <p className="text-blue-100 text-sm font-bold uppercase tracking-widest mb-4">Start Now — No Signup</p>
            <h2 className="text-4xl md:text-5xl font-black mb-5">Ready to understand your music?</h2>
            <p className="text-blue-100 text-lg mb-10 max-w-xl mx-auto">Paste a YouTube link and Hyvaroo will do the rest. Instant chord analysis, every time.</p>
            <Link href="/analyze"
              className="bg-white text-[#4F8CFF] px-10 py-4 rounded-2xl font-black text-base hover:shadow-2xl transition-all duration-300 inline-block">
              Analyze a Song Now
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#E2E8F0] py-12 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#4F8CFF] to-[#7C3AED] flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
              </svg>
            </div>
            <span className="font-bold">Hyvaroo</span>
          </div>
          <p className="text-[#475569] text-sm">Crafted by Hyvaroo Labs. Engineered for scalable growth.</p>
          <div className="flex gap-6">
            <Link href="/analyze" className="text-[#475569] hover:text-[#0F172A] text-sm transition">Analyze</Link>
            <Link href="/library" className="text-[#475569] hover:text-[#0F172A] text-sm transition">Library</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
