'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

export default function LibraryPage() {
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [keyFilter, setKeyFilter] = useState('All')

  useEffect(() => {
    supabase.from('songs').select('*').order('created_at',{ascending:false}).limit(100)
      .then(({ data }) => { setSongs(data||[]); setLoading(false) })
  }, [])

  const keys = ['All','C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
  const filtered = songs.filter(s =>
    s.title?.toLowerCase().includes(search.toLowerCase()) &&
    (keyFilter === 'All' || s.key_note === keyFilter)
  )

  const gradients = [
    'from-emerald-100 to-blue-100',
    'from-violet-100 to-pink-100',
    'from-amber-100 to-orange-100',
    'from-cyan-100 to-emerald-100',
    'from-blue-100 to-violet-100',
    'from-rose-100 to-amber-100',
  ]

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <nav className="bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 g-bg rounded-xl flex items-center justify-center shadow-sm">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"/></svg>
          </div>
          <span className="font-black text-lg g-text">MelodYUp</span>
        </Link>
        <Link href="/upload" className="g-btn px-5 py-2 rounded-xl text-sm font-bold shadow-md">+ Analyze</Link>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black">Library</h1>
            <p className="text-slate-400 text-sm">{songs.length} song{songs.length!==1?'s':''}</p>
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..."
            className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-300 focus:outline-none w-full sm:w-60"
          />
        </div>

        <div className="flex gap-2 flex-wrap mb-6">
          {keys.map(k => (
            <button key={k} onClick={()=>setKeyFilter(k)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${ keyFilter===k ? 'g-btn shadow' : 'bg-white border border-slate-200 text-slate-500 hover:border-blue-300' }`}>{k}</button>
          ))}
        </div>

        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array(8).fill(0).map((_,i) => (
              <div key={i} className="bg-white border border-slate-100 rounded-2xl overflow-hidden animate-pulse">
                <div className="h-36 bg-slate-50"/>
                <div className="p-3"><div className="h-4 bg-slate-50 rounded mb-2"/><div className="h-3 bg-slate-50 rounded w-2/3"/></div>
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((s,i) => (
              <Link key={s.id} href={`/songs/${s.id}`}
                className="bg-white border border-slate-100 rounded-2xl overflow-hidden card-hover group">
                <div className={`h-36 bg-gradient-to-br ${gradients[i%gradients.length]} flex items-center justify-center relative`}>
                  <div className="w-14 h-14 bg-white/70 backdrop-blur rounded-2xl flex items-center justify-center shadow-sm">
                    <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"/></svg>
                  </div>
                  <div className="absolute bottom-2 right-2 g-btn text-xs font-bold px-2.5 py-1 rounded-lg shadow">{s.key_note} {s.key_scale==='major'?'Maj':'Min'}</div>
                </div>
                <div className="p-3">
                  <p className="font-bold text-sm truncate text-slate-700">{s.title}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{s.bpm} BPM · {(s.chords||[]).length} chords</p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-24">
            <div className="w-16 h-16 bg-slate-50 border-2 border-slate-200 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"/></svg>
            </div>
            <p className="text-slate-400 font-semibold mb-4">{search||keyFilter!=='All'?'No songs match':'No songs yet'}</p>
            <Link href="/upload" className="g-btn px-6 py-3 rounded-2xl font-bold text-sm shadow-md inline-block">Analyze Your First Song</Link>
          </div>
        )}
      </div>
    </div>
  )
}
