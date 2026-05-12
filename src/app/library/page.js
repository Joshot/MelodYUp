'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

export default function Library() {
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [keyFilter, setKeyFilter] = useState('All')

  useEffect(() => {
    supabase.from('songs').select('*').order('created_at', { ascending: false }).limit(100)
      .then(({ data }) => { setSongs(data || []); setLoading(false) })
  }, [])

  const keys = ['All','C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
  const filtered = songs.filter(s =>
    s.title?.toLowerCase().includes(search.toLowerCase()) &&
    (keyFilter === 'All' || s.key_note === keyFilter)
  )

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <nav className="bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl btn-primary flex items-center justify-center shadow-sm">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" /></svg>
          </div>
          <span className="font-black text-lg gradient-text">MelodYUp</span>
        </Link>
        <Link href="/upload" className="btn-primary px-4 py-2 rounded-xl text-sm shadow-sm">+ Analyze</Link>
      </nav>

      <div className="max-w-5xl mx-auto px-5 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-black">Library</h1>
            <p className="text-slate-400 text-sm">{songs.length} song{songs.length !== 1 ? 's' : ''}</p>
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..."
            className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 w-full sm:w-56"
          />
        </div>

        <div className="flex gap-1.5 flex-wrap mb-6">
          {keys.map(k => (
            <button key={k} onClick={() => setKeyFilter(k)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                keyFilter === k ? 'btn-primary shadow-sm' : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
              }`}>{k}
            </button>
          ))}
        </div>

        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array(8).fill(0).map((_,i) => (
              <div key={i} className="bg-white border border-slate-100 rounded-2xl overflow-hidden animate-pulse">
                <div className="h-32 bg-slate-50" />
                <div className="p-3"><div className="h-3.5 bg-slate-50 rounded mb-2" /><div className="h-3 bg-slate-50 rounded w-1/2" /></div>
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map(s => (
              <Link key={s.id} href={`/songs/${s.id}`}
                className="bg-white border border-slate-100 rounded-2xl overflow-hidden hover:shadow-md hover:border-slate-200 transition group block">
                <div className="h-32 bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center relative">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center">
                    <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"/></svg>
                  </div>
                  <span className="absolute bottom-2 right-2 btn-primary text-xs font-bold px-2 py-0.5 rounded-lg">{s.key_note} {s.key_scale}</span>
                </div>
                <div className="p-3">
                  <p className="font-bold text-sm truncate">{s.title}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{s.bpm} BPM · {(s.chords||[]).length} chords</p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="text-slate-400 font-medium mb-4">{search || keyFilter !== 'All' ? 'No songs match' : 'No songs yet'}</p>
            <Link href="/upload" className="btn-primary px-6 py-2.5 rounded-xl text-sm">Analyze First Song</Link>
          </div>
        )}
      </div>
    </div>
  )
}
