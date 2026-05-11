'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'

// ── Nashville helper ──────────────────────────────────────────────
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
const ENHARMONIC = { 'Db':'C#','Eb':'D#','Gb':'F#','Ab':'G#','Bb':'A#' }

function parseChordRoot(chord) {
  if (!chord) return null
  const c = ENHARMONIC[chord.replace('m','')] || chord.replace('m','')
  return NOTE_NAMES.includes(c) ? c : null
}

function getNashville(chordName, keyNote, keyScale) {
  const root = parseChordRoot(chordName)
  if (!root || !keyNote) return ''
  const isMinorChord = chordName.endsWith('m') && !chordName.endsWith('#m') && chordName.length > 1
  const keyIdx = NOTE_NAMES.indexOf(keyNote)
  const chordIdx = NOTE_NAMES.indexOf(root)
  if (keyIdx < 0 || chordIdx < 0) return ''
  const interval = (chordIdx - keyIdx + 12) % 12
  const majorMap = {0:'1',2:'2',4:'3',5:'4',7:'5',9:'6',11:'7'}
  const minorMap = {0:'1',2:'2',3:'3',5:'4',7:'5',8:'6',10:'7'}
  const map = keyScale === 'major' ? majorMap : minorMap
  const num = map[interval] || ''
  if (!num) return ''
  return isMinorChord ? `${num}m` : num
}

// ── Transpose helper ──────────────────────────────────────────────
function transposeChord(chord, semitones) {
  if (!chord || semitones === 0) return chord
  const isMinor = chord.endsWith('m') && chord.length > 1
  const root = parseChordRoot(chord)
  if (!root) return chord
  const idx = NOTE_NAMES.indexOf(root)
  const newRoot = NOTE_NAMES[(idx + semitones + 12) % 12]
  return newRoot + (isMinor ? 'm' : '')
}

function transposeKey(key, semitones) {
  if (!key || semitones === 0) return key
  const idx = NOTE_NAMES.indexOf(key)
  if (idx < 0) return key
  return NOTE_NAMES[(idx + semitones + 12) % 12]
}

export default function PlayerPage() {
  const { id } = useParams()
  const router = useRouter()
  const audioRef = useRef(null)
  const animRef = useRef(null)
  const beatGridRef = useRef(null)

  const [song, setSong] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentBeat, setCurrentBeat] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [audioUrl, setAudioUrl] = useState(null)
  const [notes, setNotes] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [editingNotes, setEditingNotes] = useState(false)
  const [transpose, setTranspose] = useState(0)
  const [showNashville, setShowNashville] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showTransposeMenu, setShowTransposeMenu] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('songs').select('*').eq('id', id).single()
      if (!data) { router.push('/library'); return }
      setSong(data)
      setNoteText(data.notes || '')
      setLoading(false)
    }
    load()
  }, [id])

  // Audio playback sync
  useEffect(() => {
    if (!song || !audioRef.current) return
    const audio = audioRef.current
    const beatDuration = 60 / (song.bpm || 120)

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
      const beat = Math.floor(audio.currentTime / beatDuration)
      setCurrentBeat(beat)
    }
    const onLoadedMetadata = () => setDuration(audio.duration)
    const onEnded = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('ended', onEnded)
    }
  }, [song, audioRef.current])

  // Auto-scroll active beat into view
  useEffect(() => {
    if (!beatGridRef.current) return
    const active = beatGridRef.current.querySelector('.beat-box.active')
    if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [currentBeat])

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false) }
    else { audioRef.current.play(); setIsPlaying(true) }
  }

  const seekToBeat = (beat) => {
    if (!audioRef.current || !song) return
    const beatDuration = 60 / (song.bpm || 120)
    audioRef.current.currentTime = beat * beatDuration
    setCurrentBeat(beat)
  }

  const handleSaveNotes = async () => {
    await supabase.from('songs').update({ notes: noteText }).eq('id', id)
    setSong(s => ({ ...s, notes: noteText }))
    setEditingNotes(false)
  }

  const handleDelete = async () => {
    await supabase.from('songs').delete().eq('id', id)
    router.push('/library')
  }

  const formatTime = (s) => {
    if (!s || isNaN(s)) return '0:00'
    return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`
  }

  const chordData = song?.chord_data || []
  const beatDuration = song ? 60 / (song.bpm || 120) : 0.5
  const BEATS_PER_BAR = 8

  // Group beats into bars of 8
  const bars = []
  for (let i = 0; i < chordData.length; i += BEATS_PER_BAR) {
    bars.push(chordData.slice(i, i + BEATS_PER_BAR))
  }

  const displayChord = (chordName) => {
    if (!chordName) return null
    const transposed = transposeChord(chordName, transpose)
    if (showNashville) {
      const key = transposeKey(song?.key_note, transpose)
      return getNashville(transposed, key, song?.key_scale)
    }
    return transposed
  }

  const displayKey = transposeKey(song?.key_note, transpose)

  if (loading) return (
    <div className="min-h-screen bg-[#f0fdf4] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-green-300 border-t-green-600 rounded-full spin"/>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f0fdf4]">
      {/* NAV */}
      <nav className="bg-white border-b border-green-100 px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/library" className="text-slate-400 hover:text-slate-700 transition p-1.5 hover:bg-green-50 rounded-xl">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          </Link>
          <Link href="/" className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"/></svg>
            </div>
            <span className="font-black gradient-text text-sm hidden sm:block">MelodYUp</span>
          </Link>
        </div>
        <p className="font-bold text-sm truncate max-w-[140px] sm:max-w-xs text-slate-700">{song?.title}</p>
        <div className="flex items-center gap-2">
          {/* Transpose & options menu */}
          <div className="relative">
            <button onClick={() => setShowTransposeMenu(v=>!v)}
              className="p-2 hover:bg-green-50 rounded-xl text-slate-400 hover:text-slate-700 transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></svg>
            </button>
            {showTransposeMenu && (
              <div className="absolute right-0 top-10 bg-white border border-green-100 rounded-2xl shadow-xl p-4 w-64 z-50">
                <p className="font-bold text-sm mb-3">Options</p>
                {/* Nashville toggle */}
                <button onClick={() => { setShowNashville(v=>!v); setShowTransposeMenu(false) }}
                  className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-green-50 text-sm flex items-center justify-between">
                  <span>Nashville Numbers</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${ showNashville ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400' }`}>
                    {showNashville ? 'ON' : 'OFF'}
                  </span>
                </button>
                {/* Transpose */}
                <div className="mt-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">Transpose</p>
                  <div className="flex items-center justify-between bg-green-50 rounded-xl p-1">
                    <button onClick={() => setTranspose(v => Math.max(v-1,-6))}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-green-200 font-bold text-slate-600 hover:border-blue-300 transition">−</button>
                    <div className="text-center">
                      <p className="font-black text-sm">{transpose > 0 ? `+${transpose}` : transpose}</p>
                      <p className="text-xs text-slate-400">semitones</p>
                    </div>
                    <button onClick={() => setTranspose(v => Math.min(v+1,6))}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-green-200 font-bold text-slate-600 hover:border-blue-300 transition">+</button>
                  </div>
                  <p className="text-xs text-center text-slate-400 mt-1">Key: <strong>{displayKey} {song?.key_scale}</strong></p>
                </div>
                <button onClick={() => { setShowDeleteModal(true); setShowTransposeMenu(false) }}
                  className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-red-50 text-red-500 text-sm mt-2">Delete Song</button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* MAIN */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">

        {/* AUDIO PLAYER */}
        <div className="card">
          <audio ref={audioRef} src={audioUrl} preload="auto" />
          {!audioUrl ? (
            <div className="text-center py-4">
              <p className="text-slate-500 text-sm mb-3">Load audio file to sync playback</p>
              <label className="grad-btn px-5 py-2.5 rounded-xl font-bold text-sm cursor-pointer inline-block">
                Load Audio File
                <input type="file" accept="audio/*" className="hidden" onChange={e => {
                  const f = e.target.files[0]
                  if (f) setAudioUrl(URL.createObjectURL(f))
                }}/>
              </label>
            </div>
          ) : (
            <div>
              {/* Play controls */}
              <div className="flex items-center gap-4 mb-3">
                <button onClick={togglePlay}
                  className="w-12 h-12 grad-btn rounded-2xl flex items-center justify-center shadow flex-shrink-0">
                  {isPlaying ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  )}
                </button>
                <div className="flex-1">
                  <input type="range" min="0" max={duration||0} step="0.1" value={currentTime}
                    onChange={e => { if (audioRef.current) audioRef.current.currentTime = e.target.value }}
                    className="w-full accent-green-500 h-2"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* KEY + BPM INFO */}
        <div className="grid grid-cols-3 gap-3">
          <div className="grad-btn rounded-2xl p-4 text-center text-white shadow">
            <p className="text-green-100 text-xs font-bold uppercase tracking-wider mb-1">Key</p>
            <p className="text-2xl font-black">{displayKey}</p>
            <p className="text-green-100 text-xs capitalize">{song?.key_scale}</p>
          </div>
          <div className="card text-center">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">BPM</p>
            <p className="text-2xl font-black gradient-text">{song?.bpm}</p>
          </div>
          <div className="card text-center">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Beats</p>
            <p className="text-2xl font-black gradient-text">{song?.total_beats || chordData.length}</p>
          </div>
        </div>

        {/* CHORD GRID — Chordify style, 8 beats per bar */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-bold">Chord Progression</p>
              <p className="text-xs text-slate-400">8 beats per bar · Click any chord to jump</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg transition cursor-pointer ${ showNashville ? 'grad-btn' : 'bg-green-50 text-green-700 border border-green-200' }`}
                onClick={() => setShowNashville(v=>!v)}>
                {showNashville ? 'Nashville ON' : 'Nashville'}
              </span>
            </div>
          </div>

          <div ref={beatGridRef} className="space-y-2 overflow-y-auto max-h-[60vh]">
            {bars.map((bar, barIdx) => (
              <div key={barIdx} className="flex gap-1.5 items-center">
                <span className="text-xs text-slate-300 font-bold w-5 flex-shrink-0">{barIdx+1}</span>
                <div className="grid gap-1.5 flex-1" style={{ gridTemplateColumns: `repeat(${bar.length}, 1fr)` }}>
                  {bar.map((beat, beatInBar) => {
                    const globalBeat = barIdx * BEATS_PER_BAR + beatInBar
                    const chord = displayChord(beat?.chord)
                    const isActive = globalBeat === currentBeat && audioUrl
                    const isChordStart = chord && (beatInBar === 0 || displayChord(bar[beatInBar-1]?.chord) !== chord)
                    return (
                      <div
                        key={beatInBar}
                        onClick={() => seekToBeat(globalBeat)}
                        className={`beat-box ${ isActive ? 'active' : '' } ${ isChordStart && !isActive ? 'chord-start' : '' }`}
                        style={{ minHeight: '52px' }}
                      >
                        <span className="text-xs font-black leading-none">
                          {isChordStart ? chord || '—' : ''}
                        </span>
                        <span className="beat-num">{globalBeat+1}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* UNIQUE CHORDS */}
        <div className="card">
          <p className="font-bold mb-3">Chords in this song</p>
          <div className="flex flex-wrap gap-2">
            {[...new Set(chordData.filter(c=>c.chord).map(c=>displayChord(c.chord)))].filter(Boolean).map(c => (
              <div key={c} className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 text-center">
                <p className="font-black text-sm gradient-text">{c}</p>
              </div>
            ))}
          </div>
        </div>

        {/* NOTES */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold">My Notes</p>
            {!editingNotes && (
              <button onClick={() => setEditingNotes(true)}
                className="text-xs font-semibold text-blue-500 hover:text-blue-700 transition px-3 py-1 rounded-lg hover:bg-blue-50">
                Edit
              </button>
            )}
          </div>
          {editingNotes ? (
            <div>
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Add fingerings, tips, personal notes..."
                rows={4}
                className="w-full border border-green-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-green-300 focus:outline-none resize-none bg-green-50"
              />
              <div className="flex gap-2 mt-2">
                <button onClick={() => setEditingNotes(false)}
                  className="flex-1 bg-white border border-green-200 text-slate-500 rounded-xl py-2 text-sm font-semibold hover:border-slate-300 transition">Cancel</button>
                <button onClick={handleSaveNotes}
                  className="flex-1 grad-btn rounded-xl py-2 text-sm font-bold">Save Notes</button>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-sm leading-relaxed">{song?.notes || <span className="text-slate-300">No notes yet. Click Edit to add.</span>}</p>
          )}
        </div>

        {/* SONG INFO */}
        <div className="card">
          <p className="font-bold mb-3">Song Info</p>
          <div className="space-y-2 text-sm">
            {[
              ['Title', song?.title],
              ['Key', `${displayKey} ${song?.key_scale}`],
              ['BPM', song?.bpm],
              ['Total Beats', song?.total_beats || chordData.length],
              ['Analyzed', new Date(song?.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between">
                <span className="text-slate-400">{label}</span>
                <span className="font-semibold text-slate-700">{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* DELETE MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl">
            <div className="w-14 h-14 bg-red-50 border-2 border-red-200 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </div>
            <h3 className="text-xl font-black text-center mb-2">Delete Song?</h3>
            <p className="text-slate-400 text-sm text-center mb-6">This will permanently remove <strong>{song?.title}</strong> from your library.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)}
                className="flex-1 bg-white border border-green-200 text-slate-600 rounded-2xl py-3 font-semibold hover:border-slate-300 transition">Cancel</button>
              <button onClick={handleDelete}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-2xl py-3 font-bold transition">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
