'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'

const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

function parseRoot(chord) {
  if (!chord) return ''
  return chord.length > 1 && chord[1] === '#' ? chord.slice(0,2) : chord[0]
}
function isMinor(chord) {
  if (!chord) return false
  const root = parseRoot(chord)
  return chord.length > root.length && chord.slice(root.length) === 'm'
}
function transposeChord(chord, n) {
  if (!chord || n === 0) return chord
  const root = parseRoot(chord)
  const min = isMinor(chord)
  const idx = NOTES.indexOf(root)
  if (idx < 0) return chord
  return NOTES[(idx + n + 12) % 12] + (min ? 'm' : '')
}
function transposeNote(note, n) {
  if (!note) return note
  const idx = NOTES.indexOf(note)
  if (idx < 0) return note
  return NOTES[(idx + n + 12) % 12]
}
function nashville(chord, keyNote, keyScale) {
  const root = parseRoot(chord)
  const min = isMinor(chord)
  const majorMap = {0:'1',2:'2',4:'3',5:'4',7:'5',9:'6',11:'7'}
  const minorMap = {0:'1',2:'2',3:'3',5:'4',7:'5',8:'6',10:'7'}
  const map = keyScale === 'major' ? majorMap : minorMap
  const keyIdx = NOTES.indexOf(keyNote)
  const rootIdx = NOTES.indexOf(root)
  if (keyIdx < 0 || rootIdx < 0) return chord
  const interval = (rootIdx - keyIdx + 12) % 12
  const num = map[interval]
  if (!num) return chord
  return min ? `${num}m` : num
}
const fmt = s => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`

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
  const [activeBeat, setActiveBeat] = useState(-1)
  const [transpose, setTranspose] = useState(0)
  const [showNashville, setShowNashville] = useState(false)
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
    const onTime = () => { setCurrentTime(audio.currentTime); setActiveBeat(Math.floor(audio.currentTime / bd)) }
    const onMeta = () => setDuration(audio.duration || 0)
    const onEnd = () => { setIsPlaying(false); setActiveBeat(-1) }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('ended', onEnd)
    return () => { audio.removeEventListener('timeupdate', onTime); audio.removeEventListener('loadedmetadata', onMeta); audio.removeEventListener('ended', onEnd) }
  }, [song, audioRef.current])

  useEffect(() => {
    if (!gridRef.current || activeBeat < 0) return
    const el = gridRef.current.querySelector(`[data-beat="${activeBeat}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
  }, [activeBeat])

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false) }
    else { audioRef.current.play().catch(()=>{}); setIsPlaying(true) }
  }
  const seekToBeat = beat => {
    if (!audioRef.current || !song) return
    audioRef.current.currentTime = beat * (60 / (song.bpm || 120))
    setActiveBeat(beat)
    if (!isPlaying) { audioRef.current.play().catch(()=>{}); setIsPlaying(true) }
  }
  const loadAudio = f => {
    if (!f) return
    const url = URL.createObjectURL(f)
    setAudioUrl(url)
    sessionStorage.setItem(`audio_${id}`, url)
  }
  const saveNote = async () => {
    await supabase.from('songs').update({ notes: noteText }).eq('id', id)
    setSong(s => ({ ...s, notes: noteText })); setEditNote(false)
  }
  const deleteSong = async () => {
    await supabase.from('songs').delete().eq('id', id)
    sessionStorage.removeItem(`audio_${id}`)
    router.push('/library')
  }

  if (loading) return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-500 rounded-full spin"/>
    </div>
  )

  const chordData = song?.chord_data || []
  const BEATS_PER_BAR = 8
  const bars = []
  for (let i = 0; i < chordData.length; i += BEATS_PER_BAR) bars.push(chordData.slice(i, i + BEATS_PER_BAR))

  const displayKey = transposeNote(song?.key_note, transpose)
  const getLabel = chord => {
    if (!chord) return null
    const t = transposeChord(chord, transpose)
    return showNashville ? nashville(t, displayKey, song?.key_scale) : t
  }

  const uniqueChords = [...new Set(chordData.filter(c => c.chord).map(c => getLabel(c.chord)))].filter(Boolean)

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* NAV */}
      <nav className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Link href="/library" className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          </Link>
          <Link href="/" className="flex items-center gap-1.5">
            <div className="w-7 h-7 g-bg rounded-lg flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"/></svg>
            </div>
          </Link>
        </div>
        <p className="font-bold text-sm truncate max-w-[160px] sm:max-w-xs text-slate-700">{song?.title}</p>
        <div className="relative">
          <button onClick={() => setShowMenu(v=>!v)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
          </button>
          {showMenu && (
            <div className="absolute right-0 top-11 bg-white border border-slate-100 rounded-2xl shadow-xl p-4 w-64 z-50" onClick={e=>e.stopPropagation()}>
              <p className="font-bold text-sm mb-3 text-slate-700">Options</p>
              <button onClick={() => { setShowNashville(v=>!v); setShowMenu(false) }}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-50 text-sm flex items-center justify-between">
                Nashville Numbers
                <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${ showNashville?'bg-emerald-100 text-emerald-700':'bg-slate-100 text-slate-400' }`}>{showNashville?'ON':'OFF'}</span>
              </button>
              <div className="mt-3 mb-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">Transpose</p>
                <div className="flex items-center justify-between bg-slate-50 rounded-xl p-1">
                  <button onClick={() => setTranspose(v=>Math.max(v-1,-6))} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 font-bold text-slate-600 hover:border-blue-300 transition">−</button>
                  <div className="text-center">
                    <p className="font-black text-sm">{transpose>0?`+${transpose}`:transpose}</p>
                    <p className="text-[10px] text-slate-400">{displayKey} {song?.key_scale}</p>
                  </div>
                  <button onClick={() => setTranspose(v=>Math.min(v+1,6))} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 font-bold text-slate-600 hover:border-blue-300 transition">+</button>
                </div>
              </div>
              <button onClick={() => { setShowDel(true); setShowMenu(false) }}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-red-50 text-red-500 text-sm mt-2">Delete Song</button>
            </div>
          )}
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-5 space-y-4">
        {/* PLAYER */}
        <div className="card">
          <audio ref={audioRef} src={audioUrl || undefined} preload="auto"/>
          {!audioUrl ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <p className="font-semibold text-slate-700">Load audio file to sync chords</p>
                <p className="text-slate-400 text-xs mt-0.5">Re-upload the same MP3 · Audio stays on your device</p>
              </div>
              <label className="g-btn px-5 py-2.5 rounded-xl font-bold text-sm cursor-pointer shadow-md flex-shrink-0">
                Load Audio
                <input type="file" accept="audio/*" className="hidden" onChange={e => loadAudio(e.target.files[0])}/>
              </label>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button onClick={togglePlay} className="w-11 h-11 g-btn rounded-2xl flex items-center justify-center shadow flex-shrink-0">
                {isPlaying
                  ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                  : <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
              </button>
              <div className="flex-1 min-w-0">
                <input type="range" min="0" max={duration||1} step="0.1" value={currentTime}
                  onChange={e => { if(audioRef.current) audioRef.current.currentTime=+e.target.value }}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>{fmt(currentTime)}</span><span>{fmt(duration)}</span>
                </div>
              </div>
              <label className="p-2 text-slate-300 hover:text-slate-500 cursor-pointer rounded-xl hover:bg-slate-50 transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                <input type="file" accept="audio/*" className="hidden" onChange={e => loadAudio(e.target.files[0])}/>
              </label>
            </div>
          )}
        </div>

        {/* STATS */}
        <div className="grid grid-cols-3 gap-3">
          <div className="g-btn rounded-2xl p-4 text-center shadow-md">
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">Key</p>
            <p className="text-xl font-black text-white">{displayKey}</p>
            <p className="text-white/60 text-[10px] capitalize">{song?.key_scale}</p>
          </div>
          <div className="card text-center">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">BPM</p>
            <p className="text-xl font-black g-text">{song?.bpm}</p>
          </div>
          <div className="card text-center">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Beats</p>
            <p className="text-xl font-black g-text">{song?.total_beats}</p>
          </div>
        </div>

        {/* CHORD GRID */}
        <div className="card">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <p className="font-bold text-slate-800">Chord Grid</p>
              <p className="text-xs text-slate-400">8 beats/bar · Click to jump & play</p>
            </div>
            <button onClick={() => setShowNashville(v=>!v)}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition ${
                showNashville ? 'g-btn border-transparent shadow' : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300'
              }`}>
              {showNashville ? 'Nashville ON' : 'Nashville'}
            </button>
          </div>
          <div ref={gridRef} className="space-y-2 overflow-y-auto max-h-[58vh] pr-0.5">
            {bars.map((bar, bi) => (
              <div key={bi} className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-300 font-bold w-5 text-right flex-shrink-0">{bi+1}</span>
                <div className="flex-1 grid gap-1" style={{ gridTemplateColumns: `repeat(${bar.length},1fr)` }}>
                  {bar.map((beat, bib) => {
                    const gb = bi * BEATS_PER_BAR + bib
                    const active = gb === activeBeat && isPlaying
                    const label = beat?.chordDisplay !== undefined ? getLabel(beat.chordDisplay) : getLabel(beat?.chord)
                    const isStart = beat?.chordDisplay != null
                    return (
                      <div key={bib} data-beat={gb} onClick={() => seekToBeat(gb)}
                        className={`beat ${ active ? 'beat-active' : isStart ? 'beat-new' : '' }`}
                        style={{ minHeight: 48 }}>
                        <span className="chord-label">{label || ''}</span>
                        <span className="bn">{gb+1}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            {chordData.length === 0 && (
              <p className="text-center text-slate-300 py-8 text-sm">No chord data</p>
            )}
          </div>
        </div>

        {/* CHORD LIST */}
        <div className="card">
          <p className="font-bold mb-3 text-slate-800">Chords Found</p>
          <div className="flex flex-wrap gap-2">
            {uniqueChords.map(c => (
              <span key={c} className="bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold px-4 py-2 rounded-xl text-sm">{c}</span>
            ))}
          </div>
        </div>

        {/* NOTES */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-slate-800">My Notes</p>
            {!editNote && <button onClick={()=>setEditNote(true)} className="text-xs font-semibold text-blue-500 hover:text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-50 transition">Edit</button>}
          </div>
          {editNote ? (
            <div>
              <textarea value={noteText} onChange={e=>setNoteText(e.target.value)}
                placeholder="Add fingerings, capo tips, notes..." rows={4}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-300 focus:outline-none resize-none bg-slate-50"
              />
              <div className="flex gap-2 mt-2">
                <button onClick={()=>setEditNote(false)} className="flex-1 bg-white border border-slate-200 text-slate-500 rounded-xl py-2 text-sm font-semibold">Cancel</button>
                <button onClick={saveNote} className="flex-1 g-btn rounded-xl py-2 text-sm font-bold shadow">Save</button>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-sm leading-relaxed">
              {song?.notes || <span className="text-slate-300">No notes. Click Edit to add.</span>}
            </p>
          )}
        </div>

        {/* INFO */}
        <div className="card mb-6">
          <p className="font-bold mb-3 text-slate-800">Song Info</p>
          <div className="space-y-2 text-sm">
            {[['Title', song?.title],['Key', `${displayKey} ${song?.key_scale}`],['BPM', song?.bpm],
              ['Duration', song?.total_duration ? fmt(song.total_duration) : '—'],
              ['Analyzed', new Date(song?.created_at).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})]
            ].map(([k,v])=>(
              <div key={k} className="flex justify-between">
                <span className="text-slate-400">{k}</span>
                <span className="font-semibold text-slate-700">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* DELETE MODAL */}
      {showDel && (
        <div className="fixed inset-0 bg-black/25 backdrop-blur-sm flex items-center justify-center z-50 px-4" onClick={()=>setShowDel(false)}>
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl fade-up" onClick={e=>e.stopPropagation()}>
            <div className="w-14 h-14 bg-red-50 border-2 border-red-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </div>
            <h3 className="text-xl font-black text-center mb-2">Delete Song?</h3>
            <p className="text-slate-400 text-sm text-center mb-6">Permanently remove <strong>{song?.title}</strong>.</p>
            <div className="flex gap-3">
              <button onClick={()=>setShowDel(false)} className="flex-1 bg-white border border-slate-200 text-slate-600 rounded-2xl py-3 font-semibold">Cancel</button>
              <button onClick={deleteSong} className="flex-1 bg-red-500 text-white rounded-2xl py-3 font-bold hover:bg-red-600 transition">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
