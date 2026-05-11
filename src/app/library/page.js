'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '../../lib/supabase'

export default function LibraryPage() {
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterKey, setFilterKey] = useState('')

  useEffect(() => {
    fetchSongs()
  }, [])

  const fetchSongs = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('songs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      setSongs(data || [])
    } catch (e) {
      setSongs([])
    }
    setLoading(false)
  }

  const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

  const filtered = songs.filter(s => {
    const matchSearch = !search || s.title.toLowerCase().includes(search.toLowerCase())
    const matchKey = !filterKey || s.key_note === filterKey
    return matchSearch && matchKey
  })

  const formatDuration = (sec) => {
    if (!sec) return null
    return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-white text-[#0F172A]">
      <nav className="border-b border-[#E2E8F0] px-6 py-4 flex items-center justify-between bg-white sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F8CFF] to-[#7C3AED] flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
            </svg>
          </div>
          <span className="font-bold text-lg">Hyvaroo</span>
        </Link>
        <Link href="/analyze"
          className="bg-gradient-to-r from-[#4F8CFF] to-[#7C3AED] text-white px-5 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition">
          Analyze Song
        </Link>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-black">Song Library</h1>
            <p className="text-[#475569] mt-1">{songs.length} analyzed songs</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search songs..."
              className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[#0F172A] placeholder:text-[#94A3B8] focus:ring-2 focus:ring-[#4F8CFF] focus:outline-none px-4 py-2.5 text-sm w-56 transition" />
          </div>
        </div>

        {/* Key filter */}
        <div className="flex gap-2 flex-wrap mb-8">
          <button onClick={() => setFilterKey('')}
            className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold transition ${
              filterKey === '' ? 'bg-gradient-to-r from-[#4F8CFF] to-[#7C3AED] text-white shadow-sm' : 'bg-[#F1F5F9] text-[#475569] hover:text-[#0F172A]'
            }`}>All Keys</button>
          {keys.map(k => (
            <button key={k} onClick={() => setFilterKey(k)}
              className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold transition ${
                filterKey === k ? 'bg-gradient-to-r from-[#4F8CFF] to-[#7C3AED] text-white shadow-sm' : 'bg-[#F1F5F9] text-[#475569] hover:text-[#0F172A]'
              }`}>{k}</button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl overflow-hidden animate-pulse">
                <div className="h-36 bg-[#E2E8F0]" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-[#E2E8F0] rounded w-3/4" />
                  <div className="h-3 bg-[#E2E8F0] rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-[#4F8CFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">No songs yet</h3>
            <p className="text-[#475569] mb-6">Analyze your first song to see it here</p>
            <Link href="/analyze"
              className="bg-gradient-to-r from-[#4F8CFF] to-[#7C3AED] text-white rounded-xl px-6 py-2.5 font-bold text-sm hover:opacity-90 transition">
              Analyze a Song
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map(song => (
              <Link key={song.id} href={`/player/${song.id}`}
                className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden hover:shadow-lg hover:border-blue-200 transition-all duration-300 group block">
                <div className="relative h-36 bg-[#F8FAFC]">
                  {song.thumbnail ? (
                    <Image src={song.thumbnail} alt={song.title} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-10 h-10 text-[#CBD5E1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-sm mb-2 line-clamp-2 group-hover:text-[#4F8CFF] transition">{song.title}</h3>
                  <div className="flex gap-1.5 flex-wrap">
                    {song.key_note && (
                      <span className="bg-gradient-to-r from-blue-50 to-purple-50 text-[#4F8CFF] border border-blue-200 rounded-lg px-2.5 py-0.5 text-xs font-bold">
                        {song.key_note} {song.key_scale}
                      </span>
                    )}
                    {song.bpm && (
                      <span className="bg-[#F1F5F9] text-[#475569] rounded-lg px-2.5 py-0.5 text-xs font-semibold">
                        {song.bpm} BPM
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
