'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '../../lib/supabase'

export default function LibraryPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterKey, setFilterKey] = useState('')
  const [filterTab, setFilterTab] = useState('semua')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/'); return }
      setUser(session.user)
      fetchSongs(session.user.id)
    })
  }, [])

  const fetchSongs = async (uid) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
    if (!error) setSongs(data || [])
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/')
  }

  const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

  const filtered = songs.filter(s => {
    const matchSearch = s.title.toLowerCase().includes(search.toLowerCase())
    const matchKey = filterKey ? s.key_note === filterKey : true
    const matchTab = filterTab === 'favorit' ? s.is_favorite : true
    return matchSearch && matchKey && matchTab
  })

  const formatDuration = (sec) => {
    if (!sec) return '--:--'
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#f1f5f9] flex">
      <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 bg-[#12121a] border-r border-[#1e1e2e] p-6">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-cyan-500 rounded-lg flex items-center justify-center font-bold text-sm">M</div>
          <span className="font-bold text-lg">MelodYUp</span>
        </div>
        <nav className="space-y-1 mb-6">
          {[['semua', '🎵', 'Semua Lagu'], ['favorit', '❤️', 'Favorit']].map(([id, icon, label]) => (
            <button key={id} onClick={() => setFilterTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                filterTab === id ? 'bg-violet-600 text-white' : 'text-[#64748b] hover:text-white hover:bg-[#1e1e2e]'
              }`}>{icon} {label}</button>
          ))}
        </nav>
        <div className="mb-6">
          <p className="text-xs text-[#64748b] font-semibold uppercase tracking-wider mb-2 px-1">Filter Kunci</p>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setFilterKey('')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                filterKey === '' ? 'bg-violet-600 text-white' : 'bg-[#1e1e2e] text-[#64748b] hover:text-white'
              }`}>Semua</button>
            {keys.map(k => (
              <button key={k} onClick={() => setFilterKey(k)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  filterKey === k ? 'bg-violet-600 text-white' : 'bg-[#1e1e2e] text-[#64748b] hover:text-white'
                }`}>{k}</button>
            ))}
          </div>
        </div>
        <div className="mt-auto space-y-2">
          <Link href="/upload" className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition w-full">
            + Analisis Lagu Baru
          </Link>
          <button onClick={handleLogout} className="w-full text-[#64748b] hover:text-red-400 text-sm py-2 transition">Keluar</button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">Library Saya</h1>
            <p className="text-[#64748b] text-sm">{songs.length} lagu tersimpan</p>
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari lagu..."
            className="bg-[#1e1e2e] border border-[#2e2e3e] rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-violet-500 focus:outline-none px-4 py-2 text-sm w-full md:w-64" />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl overflow-hidden animate-pulse">
                <div className="h-40 bg-[#1e1e2e]" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-[#2e2e3e] rounded w-3/4" />
                  <div className="h-3 bg-[#2e2e3e] rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="text-6xl mb-4">🎵</div>
            <h3 className="text-xl font-semibold mb-2">Belum ada lagu</h3>
            <p className="text-[#64748b] mb-6">Mulai analisis lagu pertamamu dari YouTube</p>
            <Link href="/upload" className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl px-6 py-2.5 font-semibold transition">Analisis Sekarang</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(song => (
              <div key={song.id} className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl overflow-hidden hover:border-violet-500/40 transition group">
                <div className="relative h-40 bg-[#1e1e2e]">
                  {song.thumbnail && <Image src={song.thumbnail} alt={song.title} fill className="object-cover" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  {song.is_favorite && <span className="absolute top-2 right-2">❤️</span>}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-sm mb-2 line-clamp-2">{song.title}</h3>
                  <div className="flex gap-2 flex-wrap mb-3">
                    {song.key_note && <span className="bg-violet-600/20 text-violet-400 border border-violet-500/30 rounded-full px-2.5 py-0.5 text-xs font-semibold">{song.key_note} {song.key_scale}</span>}
                    {song.bpm && <span className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-full px-2.5 py-0.5 text-xs font-semibold">{song.bpm} BPM</span>}
                    {song.duration && <span className="bg-[#1e1e2e] text-[#64748b] rounded-full px-2.5 py-0.5 text-xs">{formatDuration(song.duration)}</span>}
                  </div>
                  <Link href={`/player/${song.id}`} className="block w-full text-center bg-violet-600 hover:bg-violet-500 text-white rounded-xl py-2 text-sm font-semibold transition">Lihat Detail</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
