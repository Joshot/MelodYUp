'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'

export default function PlayerPage() {
  const router = useRouter()
  const { id } = useParams()
  const [song, setSong] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeChord, setActiveChord] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [notes, setNotes] = useState('')
  const [editingNotes, setEditingNotes] = useState(false)
  const [savingNotes, setSavingNotes] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  useEffect(() => {
    fetchSong()
  }, [id])

  useEffect(() => {
    if (!song?.chords?.length || !isPlaying) return
    const interval = setInterval(() => {
      setActiveChord(prev => (prev + 1) % song.chords.length)
    }, song.bpm ? (60000 / song.bpm) * 2 : 2000)
    return () => clearInterval(interval)
  }, [song, isPlaying])

  const fetchSong = async () => {
    try {
      const { data } = await supabase.from('songs').select('*').eq('id', id).single()
      if (!data) { router.replace('/library'); return }
      setSong(data)
      setNotes(data.notes || '')
    } catch {
      router.replace('/library')
    }
    setLoading(false)
  }

  const getVideoId = (url) => {
    const match = url?.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([\w-]{11})/)
    return match ? match[1] : null
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

  const chordNotes = {
    'C': 'C – E – G', 'Cm': 'C – Eb – G', 'C#m': 'C# – E – G#',
    'D': 'D – F# – A', 'Dm': 'D – F – A', 'Bm': 'B – D – F#',
    'E': 'E – G# – B', 'Em': 'E – G – B',
    'F': 'F – A – C', 'F#': 'F# – A# – C#', 'F#m': 'F# – A – C#',
    'G': 'G – B – D', 'Gm': 'G – Bb – D', 'Am': 'A – C – E',
    'A': 'A – C# – E', 'B': 'B – D# – F#', 'Bb': 'Bb – D – F',
  }

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-10 h-10 border-3 border-[#4F8CFF] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const videoId = getVideoId(song.youtube_url)

  return (
    <div className="min-h-screen bg-white text-[#0F172A]">
      <nav className="border-b border-[#E2E8F0] px-6 py-4 flex items-center justify-between bg-white sticky top-0 z-50">
        <Link href="/library" className="flex items-center gap-2 text-[#475569] hover:text-[#0F172A] transition text-sm font-medium">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Library
        </Link>
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F8CFF] to-[#7C3AED] flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
            </svg>
          </div>
          <span className="font-bold">Hyvaroo</span>
        </Link>
        <button onClick={() => setShowDelete(true)} className="text-[#94A3B8] hover:text-red-500 text-sm transition">
          Delete
        </button>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* LEFT — Video + info */}
          <div className="lg:col-span-3 space-y-5">
            <div className="rounded-3xl overflow-hidden bg-[#F8FAFC] border border-[#E2E8F0] shadow-sm">
              <div className="aspect-video">
                {videoId && (
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}?rel=0`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )}
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-black mb-1">{song.title}</h1>
              <p className="text-[#475569] text-sm">
                Analyzed {new Date(song.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>

            {/* Chord grid — Chordify style */}
            {song.chords?.length > 0 && (
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-3xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <p className="font-bold text-lg">Chord Progression</p>
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition ${
                      isPlaying
                        ? 'bg-[#F1F5F9] text-[#475569]'
                        : 'bg-gradient-to-r from-[#4F8CFF] to-[#7C3AED] text-white shadow-sm'
                    }`}
                  >
                    {isPlaying ? (
                      <><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pause</>
                    ) : (
                      <><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg> Follow Along</>
                    )}
                  </button>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {song.chords.map((c, i) => (
                    <div
                      key={i}
                      onClick={() => setActiveChord(i)}
                      className={`chord-box aspect-square flex flex-col items-center justify-center rounded-2xl border-2 font-black text-base cursor-pointer select-none ${
                        i === activeChord
                          ? 'active'
                          : 'bg-white border-[#E2E8F0] text-[#0F172A] hover:border-[#4F8CFF]'
                      }`}
                    >
                      {c}
                      <span className="text-[10px] font-normal opacity-50 mt-0.5">{i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unique chords */}
            {song.chords?.length > 0 && (
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-3xl p-6">
                <p className="font-bold text-lg mb-4">Chord Details</p>
                <div className="flex gap-3 flex-wrap">
                  {[...new Set(song.chords)].map(c => (
                    <div key={c} className="bg-white border border-[#E2E8F0] rounded-2xl px-5 py-4 text-center hover:border-[#4F8CFF] transition">
                      <p className="font-black text-xl gradient-text">{c}</p>
                      <p className="text-[#94A3B8] text-xs mt-1">{chordNotes[c] || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — Analysis panel */}
          <div className="lg:col-span-2 space-y-4">
            {/* Key */}
            <div className="bg-gradient-to-br from-[#4F8CFF] to-[#7C3AED] rounded-3xl p-7 text-white">
              <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-3">Detected Key</p>
              <p className="text-5xl font-black mb-2">{song.key_note}</p>
              <p className="text-blue-100 capitalize">{song.key_scale}</p>
            </div>

            {/* BPM */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-3xl p-6 text-center">
              <p className="text-[#475569] text-xs font-bold uppercase tracking-widest mb-3">Tempo</p>
              <p className="text-6xl font-black gradient-text">{song.bpm || '—'}</p>
              <p className="text-[#475569] text-sm mt-1">BPM</p>
            </div>

            {/* Notes */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="font-bold">My Notes</p>
                <button onClick={() => setEditingNotes(!editingNotes)}
                  className="text-[#4F8CFF] hover:text-[#7C3AED] text-sm font-semibold transition">
                  {editingNotes ? 'Cancel' : 'Edit'}
                </button>
              </div>
              {editingNotes ? (
                <>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4}
                    placeholder="Add fingerings, tips, or personal notes..."
                    className="w-full bg-white border border-[#E2E8F0] rounded-2xl text-[#0F172A] placeholder:text-[#94A3B8] focus:ring-2 focus:ring-[#4F8CFF] focus:outline-none px-4 py-3 text-sm resize-none mb-3 transition" />
                  <button onClick={saveNotes} disabled={savingNotes}
                    className="w-full bg-gradient-to-r from-[#4F8CFF] to-[#7C3AED] text-white rounded-xl py-2.5 text-sm font-bold transition hover:opacity-90 disabled:opacity-50">
                    {savingNotes ? 'Saving...' : 'Save Notes'}
                  </button>
                </>
              ) : (
                <p className="text-sm text-[#475569] leading-relaxed">{notes || 'No notes yet. Click Edit to add annotations.'}</p>
              )}
            </div>

            {/* Info */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-3xl p-6">
              <p className="font-bold mb-4">Song Info</p>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#475569]">Key</span>
                  <span className="font-semibold">{song.key_note} {song.key_scale}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#475569]">BPM</span>
                  <span className="font-semibold">{song.bpm || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#475569]">Chords</span>
                  <span className="font-semibold">{[...new Set(song.chords || [])].join(', ') || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#475569]">Analyzed</span>
                  <span className="font-semibold">{new Date(song.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete modal */}
      {showDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white border border-[#E2E8F0] rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <p className="text-xl font-black mb-2">Delete this song?</p>
            <p className="text-[#475569] text-sm mb-7">This will permanently remove the song from your library.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDelete(false)}
                className="flex-1 border border-[#E2E8F0] text-[#475569] rounded-2xl py-3 font-semibold text-sm hover:border-[#94A3B8] transition">Cancel</button>
              <button onClick={deleteSong}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-2xl py-3 font-bold text-sm transition">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
