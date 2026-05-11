'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'

export default function PlayerPage() {
  const router = useRouter()
  const { id } = useParams()
  const [song, setSong] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState('')
  const [editingNotes, setEditingNotes] = useState(false)
  const [savingNotes, setSavingNotes] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [activeChord, setActiveChord] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/'); return }
      fetchSong()
    })
  }, [])

  useEffect(() => {
    if (!song?.chords?.length) return
    const interval = setInterval(() => {
      setActiveChord(prev => (prev + 1) % song.chords.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [song])

  const fetchSong = async () => {
    const { data, error } = await supabase.from('songs').select('*').eq('id', id).single()
    if (error || !data) { router.replace('/library'); return }
    setSong(data)
    setNotes(data.notes || '')
    setLoading(false)
  }

  const getVideoId = (url) => {
    const match = url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)?([\w-]{11})/)
    return match ? match[1] : null
  }

  const toggleFavorite = async () => {
    const { data } = await supabase.from('songs').update({ is_favorite: !song.is_favorite }).eq('id', id).select().single()
    if (data) setSong(data)
  }

  const saveNotes = async () => {
    setSavingNotes(true)
    await supabase.from('songs').update({ notes }).eq('id', id)
    setSavingNotes(false)
    setEditingNotes(false)
  }

  const deleteSong = async () => {
    await supabase.from('songs').delete().eq('id', id)
    router.replace('/library')
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const videoId = getVideoId(song.youtube_url)

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#f1f5f9]">
      <header className="sticky top-0 backdrop-blur-md bg-[#0a0a0f]/80 border-b border-[#1e1e2e] px-6 py-4 flex items-center justify-between">
        <Link href="/library" className="text-[#64748b] hover:text-white transition text-sm">← Library</Link>
        <div className="flex items-center gap-3">
          <button onClick={toggleFavorite}
            className={`text-2xl transition hover:scale-110 ${song.is_favorite ? 'text-red-400' : 'text-[#64748b]'}`}>
            {song.is_favorite ? '❤️' : '🤍'}
          </button>
          <button onClick={() => setShowDelete(true)}
            className="text-[#64748b] hover:text-red-400 text-sm transition">Hapus</button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Video */}
        <div>
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-[#12121a] mb-4">
            {videoId && (
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?rel=0`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
          <h1 className="text-xl font-bold mb-1">{song.title}</h1>
          <p className="text-[#64748b] text-sm">Dianalisis {new Date(song.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>

        {/* Info */}
        <div className="space-y-4">
          <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6 text-center">
            <p className="text-[#64748b] text-sm mb-2">Kunci Lagu</p>
            <div className="flex items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-2xl font-extrabold">
                {song.key_note}
              </div>
              <span className="text-3xl font-bold capitalize">{song.key_scale}</span>
            </div>
          </div>

          <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6 text-center">
            <p className="text-[#64748b] text-sm mb-2">BPM</p>
            <p className="text-5xl font-extrabold text-cyan-400 animate-pulse-ring">{song.bpm}</p>
          </div>

          {song.chords?.length > 0 && (
            <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6">
              <p className="text-[#64748b] text-sm mb-3">Chord Progression</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {song.chords.map((c, i) => (
                  <span key={i} className={`flex-shrink-0 border rounded-xl px-4 py-2 font-bold text-sm transition-all duration-300 ${
                    i === activeChord
                      ? 'bg-violet-600 border-violet-500 text-white scale-110'
                      : 'bg-[#1e1e2e] border-[#2e2e3e] text-white'
                  }`}>{c}</span>
                ))}
              </div>
            </div>
          )}

          <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[#64748b] text-sm">Catatan</p>
              <button onClick={() => setEditingNotes(!editingNotes)}
                className="text-violet-400 hover:text-violet-300 text-sm transition">
                {editingNotes ? 'Batal' : 'Edit'}
              </button>
            </div>
            {editingNotes ? (
              <>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                  placeholder="Tulis catatan..."
                  className="w-full bg-[#1e1e2e] border border-[#2e2e3e] rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-violet-500 focus:outline-none px-4 py-2.5 text-sm resize-none mb-3" />
                <button onClick={saveNotes} disabled={savingNotes}
                  className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl px-4 py-2 text-sm font-semibold transition">
                  {savingNotes ? 'Menyimpan...' : 'Simpan'}
                </button>
              </>
            ) : (
              <p className="text-sm text-[#64748b]">{notes || 'Belum ada catatan.'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Delete dialog */}
      {showDelete && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-8 max-w-sm w-full text-center">
            <p className="text-xl font-bold mb-2">Hapus Lagu?</p>
            <p className="text-[#64748b] text-sm mb-6">Lagu ini akan dihapus dari library dan tidak bisa dikembalikan.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDelete(false)}
                className="flex-1 border border-[#2e2e3e] text-[#64748b] hover:text-white rounded-xl py-2.5 font-semibold transition">Batal</button>
              <button onClick={deleteSong}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white rounded-xl py-2.5 font-semibold transition">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
