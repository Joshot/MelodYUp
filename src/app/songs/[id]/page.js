'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'

const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

function parseRoot(chord) {
  if (!chord) return ''
  const ENARH = {Db:'C#',Eb:'D#',Gb:'F#',Ab:'G#',Bb:'A#'}
  const r = chord.length > 1 && chord[1] === '#' ? chord.slice(0,2) : chord[0]
  return ENARH[r] || r
}

function transposeChord(chord, n) {
  if (!chord || n === 0) return chord
  const root = parseRoot(chord)
  const isMin = chord.length > root.length && chord.slice(root.length) === 'm'
  const idx = NOTES.indexOf(root)
  if (idx < 0) return chord
  return NOTES[(idx + n + 12) % 12] + (isMin ? 'm' : '')
}

function transposeNote(note, n) {
  const idx = NOTES.indexOf(note)
  if (idx < 0) return note
  return NOTES[(idx + n + 12) % 12]
}

function nashville(chord, keyNote, keyScale) {
  const root = parseRoot(chord)
  const isMin = chord.length > root.length
  const ki = NOTES.indexOf(keyNote), ci = NOTES.indexOf(root)
  if (ki < 0 || ci < 0) return ''
  const interval = (ci - ki + 12) % 12
  const mj = {0:'1',2:'2',4:'3',5:'4',7:'5',9:'6',11:'7'}
  const mn = {0:'1',2:'2',3:'3',5:'4',7:'5',8:'6',10:'7'}
  const map = keyScale === 'major' ? mj : mn
  const n2 = map[interval] || ''
  return n2 ? (isMin ? n2+'m' : n2) : ''
}

export default function SongPage() {
  const { id } = useParams()
  const router = useRouter()
  const audioRef = useRef(null)
  const gridRef = useRef(null)

  const [song, setSong] = useState(null)
  const [loading, setLoading] = useState(true)
  const [audioUrl, setAudioUrl] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentBeat, setCurrentBeat] = useState(-1)
  const [transpose, setTranspose] = useState(0)
  const [showNash, setShowNash] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [editNote, setEditNote] = useState(false)
  const [showDel, setShowDel] = useState(false)

  useEffect(() => {
    supabase.from('songs').select('*').eq('id', id).single().then(({ data }) => {
      if (!data) { router.push('/library'); return }
      setSong(data); setNoteText(data.notes || ''); setLoading(false)
    })
  }, [id])

  useEffect(() => {
    const cached = sessionStorage.getItem(`audio_${id}`)
    if (cached) setAudioUrl(cached)
  }, [id])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !song) return
    const bd = 60 / (song.bpm || 120)
    const onTime = () => { setCurrentTime(audio.currentTime); setCurrentBeat(Math.floor(audio.currentTime / bd)) }
    const onMeta = () => setDuration(audio.duration || 0)
    const onEnd = () => { setIsPlaying(false); setCurrentBeat(-1) }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('ended', onEnd)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('ended', onEnd)
    }
  }, [song, audioRef.current])

  // Auto-scroll active beat
  useEffect(() => {
    if (currentBeat < 0 || !gridRef.current) return
    const el = gridRef.current.querySelector(`[data-beat="${currentBeat}"]`)
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [currentBeat])

  const togglePlay = () => {
    const a = audioRef.current; if (!a) return
    if (isPlaying) { a.pause(); setIsPlaying(false) }
    else { a.play().catch(()=>{}); setIsPlaying(true) }
  }

  const seekToBeat = (beat) => {
    const a = audioRef.current; if (!a || !song) return
    a.currentTime = beat * (60 / (song.bpm || 120))
    setCurrentBeat(beat)
    if (!isPlaying) { a.play().catch(()=>{}); setIsPlaying(true) }
  }

  const loadFile = (f) => {
    if (!f) return
    const url = URL.createObjectURL(f)
    setAudioUrl(url)
    sessionStorage.setItem(`audio_${id}`, url)
  }

  const saveNote = async () => {
    await supabase.from('songs').update({ notes: noteText }).eq('id', id)
    setSong(s => ({ ...s, notes: noteText }))
    setEditNote(false)
  }

  const deleteSong = async () => {
    await supabase.from('songs').delete().eq('id', id)
    sessionStorage.removeItem(`audio_${id}`)
    router.push('/library')
  }

  const fmt = s => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`

  if (loading) return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full spin" />
    </div>
  )

  const chords = song?.chord_data || []
  const BEATS_PER_BAR = 8
  const bars = []
  for (let i = 0; i < chords.length; i += BEATS_PER_BAR) bars.push(chords.slice(i, i + BEATS_PER_BAR))
  const dispKey = transposeNote(song?.key_note, transpose)

  const disp = (chord) => {
    if (!chord) return ''
    const t = transposeChord(chord, transpose)
    return showNash ? (nashville(t, dispKey, song?.key_scale) || t) : t
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]" onClick={() => showMenu && setShowMenu(false)}>
      {/* NAV */}
      <nav className="bg-white border-b border-slate-100 px-4 sm:px-6 py-3.5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Link href="/library" className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          </Link>
          <Link href="/" className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-lg btn-primary flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"/></svg>
            </div>
          </Link>
        </div>
        <p className="font-bold text-sm truncate max-w-[160px] sm:max-w-sm text-slate-800">{song?.title}</p>
        <div className="relative" onClick={e => e.stopPropagation()}>
          <button onClick={() => setShowMenu(v=>!v)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z"/></svg>
          </button>
          {showMenu && (
            <div className="absolute right-0 top-10 bg-white border border-slate-100 rounded-2xl shadow-xl p-3 w-56 z-50">
              <button onClick={() => { setShowNash(v=>!v); setShowMenu(false) }}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-50 text-sm flex items-center justify-between font-medium">
                Nashville Numbers
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${ showNash?'bg-emerald-100 text-emerald-700':'bg-slate-100 text-slate-400' }`}>{showNash?'ON':'OFF'}</span>
              </button>
              <div className="my-2 border-t border-slate-50" />
              <div className="px-3 pb-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Transpose</p>
                <div className="flex items-center justify-between">
                  <button onClick={() => setTranspose(v=>Math.max(v-1,-6))} className="w-8 h-8 bg-slate-50 hover:bg-slate-100 rounded-lg font-bold text-slate-600 transition text-lg leading-none">−</button>
                  <div className="text-center">
                    <p className="font-black text-sm">{transpose>0?`+${transpose}`:transpose}</p>
                    <p className="text-xs text-slate-400">{dispKey} {song?.key_scale}</p>
                  </div>
                  <button onClick={() => setTranspose(v=>Math.min(v+1,6))} className="w-8 h-8 bg-slate-50 hover:bg-slate-100 rounded-lg font-bold text-slate-600 transition text-lg leading-none">+</button>
                </div>
              </div>
              <div className="my-2 border-t border-slate-50" />
              <button onClick={() => { setShowDel(true); setShowMenu(false) }}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-red-50 text-red-500 text-sm font-medium">
                Delete Song
              </button>
            </div>
          )}
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 space-y-3">

        {/* PLAYER */}
        <div className="card">
          <audio ref={audioRef} src={audioUrl || undefined} preload="auto" />
          {!audioUrl ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex-1">
                <p className="font-semibold text-sm">Load audio to sync</p>
                <p className="text-slate-400 text-xs mt-0.5">Re-upload the same file to enable playback</p>
              </div>
              <label className="btn-primary px-4 py-2 rounded-xl text-xs font-bold cursor-pointer flex-shrink-0">
                Load Audio
                <input type="file" accept="audio/*" className="hidden" onChange={e=>loadFile(e.target.files[0])}/>
              </label>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button onClick={togglePlay} className="w-11 h-11 flex-shrink-0 btn-primary rounded-xl flex items-center justify-center shadow-sm">
                {isPlaying
                  ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                  : <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                }
              </button>
              <div className="flex-1 min-w-0">
                <input type="range" min="0" max={duration||0} step="0.05" value={currentTime}
                  onChange={e => { if(audioRef.current) audioRef.current.currentTime = +e.target.value }}
                  className="w-full h-1.5 accent-emerald-500 cursor-pointer"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>{fmt(currentTime)}</span>
                  <span>{fmt(duration)}</span>
                </div>
              </div>
              <label className="cursor-pointer p-1.5 hover:bg-slate-50 rounded-lg text-slate-300 hover:text-slate-500 transition" title="Change file">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                <input type="file" accept="audio/*" className="hidden" onChange={e=>loadFile(e.target.files[0])}/>
              </label>
            </div>
          )}
        </div>

        {/* KEY / BPM / BEATS */}
        <div className="grid grid-cols-3 gap-3">
          <div className="btn-primary rounded-2xl p-4 text-center shadow-sm">
            <p className="text-emerald-100 text-xs font-semibold uppercase tracking-wide mb-1">Key</p>
            <p className="text-2xl font-black text-white">{dispKey}</p>
            <p className="text-emerald-100 text-xs capitalize">{song?.key_scale}</p>
          </div>
          <div className="card text-center">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-1">BPM</p>
            <p className="text-2xl font-black gradient-text">{song?.bpm}</p>
          </div>
          <div className="card text-center">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-1">Beats</p>
            <p className="text-2xl font-black gradient-text">{song?.total_beats}</p>
          </div>
        </div>

        {/* CHORD GRID */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-bold text-sm">Chord Grid</p>
              <p className="text-slate-400 text-xs">8 beats/bar · Click to jump & play</p>
            </div>
            <button
              onClick={() => setShowNash(v=>!v)}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition ${
                showNash ? 'btn-primary border-transparent' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              {showNash ? 'Nashville ON' : 'Nashville'}
            </button>
          </div>
          <div ref={gridRef} className="space-y-1.5 overflow-y-auto max-h-[52vh] pr-1">
            {bars.map((bar, bi) => (
              <div key={bi} className="flex items-center gap-1.5">
                <span className="text-xs text-slate-200 font-medium w-4 text-right flex-shrink-0">{bi+1}</span>
                <div className="grid flex-1 gap-1" style={{ gridTemplateColumns: `repeat(${bar.length},1fr)` }}>
                  {bar.map((beat, bib) => {
                    const gb = bi * BEATS_PER_BAR + bib
                    const isActive = gb === currentBeat && !!audioUrl && isPlaying
                    const label = beat?.chordDisplay !== undefined ? disp(beat.chordDisplay) : disp(beat?.chord)
                    const hasChord = !!beat?.chordDisplay
                    return (
                      <div
                        key={bib}
                        data-beat={gb}
                        onClick={() => seekToBeat(gb)}
                        className={`beat-cell ${ isActive ? 'active' : hasChord ? 'has-chord' : '' }`}
                      >
                        <span className="text-xs font-black leading-none">{label}</span>
                        <span className="beat-num">{gb+1}</span>
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
          <p className="font-bold text-sm mb-3">Chords</p>
          <div className="flex flex-wrap gap-2">
            {[...new Set(chords.filter(c=>c.chord).map(c=>disp(c.chord)))].filter(Boolean).map(c => (
              <span key={c} className="bg-slate-50 border border-slate-200 text-slate-700 font-bold px-3.5 py-1.5 rounded-xl text-sm">{c}</span>
            ))}
          </div>
        </div>

        {/* NOTES */}
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="font-bold text-sm">My Notes</p>
            {!editNote && (
              <button onClick={() => setEditNote(true)} className="text-xs text-blue-500 hover:text-blue-600 font-medium px-2 py-1 rounded-lg hover:bg-blue-50 transition">Edit</button>
            )}
          </div>
          {editNote ? (
            <>
              <textarea value={noteText} onChange={e=>setNoteText(e.target.value)}
                placeholder="Add fingerings, capo position, tips..." rows={3}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none bg-slate-50"
              />
              <div className="flex gap-2 mt-2">
                <button onClick={()=>setEditNote(false)} className="flex-1 bg-slate-50 border border-slate-200 text-slate-500 rounded-xl py-2 text-xs font-semibold">Cancel</button>
                <button onClick={saveNote} className="flex-1 btn-primary rounded-xl py-2 text-xs">Save</button>
              </div>
            </>
          ) : (
            <p className="text-slate-500 text-sm leading-relaxed min-h-[20px]">
              {song?.notes || <span className="text-slate-300 text-xs">No notes yet.</span>}
            </p>
          )}
        </div>

        {/* INFO */}
        <div className="card mb-6">
          <p className="font-bold text-sm mb-3">Song Info</p>
          <div className="space-y-2">
            {[
              ['Title', song?.title],
              ['Key', `${dispKey} ${song?.key_scale}`],
              ['BPM', song?.bpm],
              ['Duration', song?.total_duration ? `${Math.floor(song.total_duration/60)}:${String(Math.floor(song.total_duration%60)).padStart(2,'0')}` : '—'],
              ['Analyzed', new Date(song?.created_at).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})],
            ].map(([k,v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-slate-400">{k}</span>
                <span className="font-semibold text-slate-700">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* DELETE MODAL */}
      {showDel && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 px-4" onClick={()=>setShowDel(false)}>
          <div className="bg-white rounded-2xl p-7 max-w-sm w-full shadow-2xl" onClick={e=>e.stopPropagation()}>
            <p className="font-black text-lg mb-2">Delete song?</p>
            <p className="text-slate-400 text-sm mb-6">This will permanently remove <strong>{song?.title}</strong>.</p>
            <div className="flex gap-3">
              <button onClick={()=>setShowDel(false)} className="flex-1 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl py-2.5 text-sm font-semibold">Cancel</button>
              <button onClick={deleteSong} className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-2.5 text-sm font-bold transition">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
