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
    const load = async () => {
      const { data } = await supabase.from('songs').select('*').order('created_at', { ascending: false }).limit(100)
      setSongs(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const keys = ['All','C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
  const filtered = songs.filter(s => {
    const matchSearch = s.title?.toLowerCase().includes(search.toLowerCase())
    const matchKey = keyFilter === 'All' || s.key_note === keyFilter
    return matchSearch && matchKey
  })

  return (
    <div className="min-h-screen bg-[#f0fdf4]">
      {/* NAV */}
      <nav className="bg-white border-b border-green-100 px-4 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" /></svg>
          </div>
          <span className="font-black text-lg gradient-text">MelodYUp</span>
        </Link>
        <Link href="/upload" className="grad-btn px-5 py-2 rounded-xl text-sm font-bold shadow">
          + Analyze Song
        </Link>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black">Song Library</h1>
            <p className="text-slate-400 text-sm">{songs.length} song{songs.length!==1?'s':''} analyzed</p>
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search songs..."
            className="bg-white border border-green-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-300 focus:border-green-300 focus:outline-none w-full sm:w-64"
          />
        </div>

        {/* KEY FILTER */}
        <div className="flex gap-2 flex-wrap mb-6">
          {keys.map(k => (
            <button key={k} onClick={() => setKeyFilter(k)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                keyFilter===k ? 'grad-btn shadow' : 'bg-white border border-green-200 text-slate-500 hover:border-blue-300'
              }`}>{k}</button>
          ))}
        </div>

        {/* LOADING */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array(8).fill(0).map((_,i) => (
              <div key={i} className="bg-white border border-green-100 rounded-2xl overflow-hidden animate-pulse">
                <div className="h-36 bg-green-50"/>
                <div className="p-3"><div className="h-4 bg-green-50 rounded mb-2"/><div className="h-3 bg-green-50 rounded w-2/3"/></div>
              </div>
            ))}
          </div>
        )}

        {/* SONGS GRID */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map(s => (
              <Link key={s.id} href={`/player/${s.id}`}
                className="bg-white border border-green-100 rounded-2xl overflow-hidden hover:shadow-md hover:border-blue-200 transition group">
                <div className="h-36 bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center relative">
                  <div className="w-16 h-16 bg-white/60 backdrop-blur rounded-2xl flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"/></svg>
                  </div>
                  <div className="absolute bottom-2 right-2 grad-btn text-xs font-bold px-2 py-0.5 rounded-lg">{s.key_note} {s.key_scale}</div>
                </div>
                <div className="p-3">
                  <p className="font-bold text-sm truncate">{s.title}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{s.bpm} BPM · {(s.chords||[]).length} chords</p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* EMPTY */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-green-50 border-2 border-green-200 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"/></svg>
            </div>
            <p className="text-slate-500 font-semibold mb-4">{search || keyFilter!=='All' ? 'No songs match your filter' : 'No songs yet'}</p>
            <Link href="/upload" className="grad-btn px-6 py-3 rounded-2xl font-bold text-sm">Analyze Your First Song</Link>
          </div>
        )}
      </div>
    </div>
  )
}
