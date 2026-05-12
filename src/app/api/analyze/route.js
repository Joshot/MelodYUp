import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 120

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// Convert MIDI note number to pitch class
function midiToPitchClass(midi) {
  return ((midi % 12) + 12) % 12
}

// Given a list of active midi notes at a time window, match to best chord
function matchChordFromNotes(midiNotes) {
  if (!midiNotes || midiNotes.length === 0) return null

  const CHORD_TEMPLATES = [
    ...NOTE_NAMES.map((n, i) => ({ name: n, root: i, intervals: [0, 4, 7] })),        // major
    ...NOTE_NAMES.map((n, i) => ({ name: n + 'm', root: i, intervals: [0, 3, 7] })), // minor
    ...NOTE_NAMES.map((n, i) => ({ name: n + '7', root: i, intervals: [0, 4, 7, 10] })), // dom7
    ...NOTE_NAMES.map((n, i) => ({ name: n + 'm7', root: i, intervals: [0, 3, 7, 10] })), // min7
  ]

  // Build pitch class set with weights
  const chroma = new Array(12).fill(0)
  for (const midi of midiNotes) {
    const pc = midiToPitchClass(midi)
    chroma[pc] += 1
  }

  let best = -Infinity, bestChord = null
  for (const tmpl of CHORD_TEMPLATES) {
    let score = 0
    for (const iv of tmpl.intervals) {
      score += chroma[(tmpl.root + iv) % 12] * (iv === 0 ? 2 : 1) // weight root
    }
    for (let i = 0; i < 12; i++) {
      if (!tmpl.intervals.includes((i - tmpl.root + 12) % 12)) {
        score -= chroma[i] * 0.4
      }
    }
    if (score > best) { best = score; bestChord = tmpl.name }
  }
  return bestChord
}

// Krumhansl-Schmuckler key detection
function detectKey(chroma) {
  const KP_MAJOR = [6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88]
  const KP_MINOR = [6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17]
  const normalize = v => { const s = v.reduce((a,b)=>a+b,0)||1; return v.map(x=>x/s) }
  const corr = (a, b) => a.reduce((s,v,i) => s+v*b[i], 0)
  const normC = normalize(chroma)
  let best = -Infinity, bestKey = 'C', bestScale = 'major'
  for (let i = 0; i < 12; i++) {
    const rot = [...normC.slice(i), ...normC.slice(0, i)]
    const mj = corr(rot, normalize(KP_MAJOR))
    const mn = corr(rot, normalize(KP_MINOR))
    if (mj > best) { best = mj; bestKey = NOTE_NAMES[i]; bestScale = 'major' }
    if (mn > best) { best = mn; bestKey = NOTE_NAMES[i]; bestScale = 'minor' }
  }
  return { key: bestKey, scale: bestScale }
}

export async function POST(req) {
  try {
    const formData = await req.formData()
    const audioFile = formData.get('audio')
    const title = formData.get('title') || 'Untitled'

    if (!audioFile) return NextResponse.json({ error: 'No audio file' }, { status: 400 })

    const HF_TOKEN = process.env.HF_TOKEN
    if (!HF_TOKEN) return NextResponse.json({ error: 'HF_TOKEN not set' }, { status: 500 })

    const bytes = await audioFile.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Audio = buffer.toString('base64')
    const mimeType = audioFile.type || 'audio/mpeg'

    // ─── STEP 1: Call Basic Pitch via HF Spaces Gradio API ───
    // Basic Pitch Space: https://huggingface.co/spaces/spotify/basic-pitch
    let notes = [] // Array of { startTime, endTime, pitch (midi), velocity }

    try {
      // Upload file to HF Spaces
      const uploadRes = await fetch(
        'https://spotify-basic-pitch.hf.space/upload',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${HF_TOKEN}`,
          },
          body: (() => {
            const fd = new FormData()
            const blob = new Blob([buffer], { type: mimeType })
            fd.append('files', blob, audioFile.name || 'audio.mp3')
            return fd
          })(),
        }
      )

      if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`)
      const uploadData = await uploadRes.json()
      const uploadedPath = Array.isArray(uploadData) ? uploadData[0] : uploadData

      // Call predict endpoint
      const predictRes = await fetch(
        'https://spotify-basic-pitch.hf.space/run/predict',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${HF_TOKEN}`,
          },
          body: JSON.stringify({
            data: [
              { name: audioFile.name || 'audio.mp3', data: null, orig_name: audioFile.name || 'audio.mp3', ...uploadedPath },
              0.5,  // onset threshold
              0.3,  // frame threshold
              58,   // min note length (ms)
              true, // melodia trick
            ]
          })
        }
      )

      if (!predictRes.ok) throw new Error(`Predict failed: ${predictRes.status}`)
      const predictData = await predictRes.json()

      // Parse notes from MIDI data returned by Basic Pitch
      // Response contains: [midi_file, audio_file, note_events]
      if (predictData?.data?.[2]) {
        const noteEvents = predictData.data[2]
        if (Array.isArray(noteEvents)) {
          notes = noteEvents.map(n => ({
            startTime: n[0],
            endTime: n[1],
            pitch: n[2], // MIDI note number
            velocity: n[3] || 80,
          }))
        }
      }

      console.log(`Basic Pitch: ${notes.length} notes detected`)
    } catch (bpErr) {
      console.warn('Basic Pitch failed, using fallback:', bpErr.message)
    }

    // ─── STEP 2: Convert notes to beat-synced chords ───
    if (notes.length === 0) {
      return NextResponse.json({ error: 'Could not detect notes. Try a clearer audio file (less reverb/noise).' }, { status: 422 })
    }

    const totalDuration = Math.max(...notes.map(n => n.endTime), 10)

    // Detect BPM from note onset intervals
    const onsets = [...new Set(notes.map(n => n.startTime))].sort((a,b)=>a-b)
    const intervals = []
    for (let i = 1; i < onsets.length; i++) {
      const d = onsets[i] - onsets[i-1]
      if (d > 0.1 && d < 2.0) intervals.push(d)
    }
    intervals.sort((a,b)=>a-b)
    let bpm = 120
    if (intervals.length > 4) {
      const median = intervals[Math.floor(intervals.length / 2)]
      bpm = Math.round(60 / median)
      if (bpm < 60) bpm *= 2
      if (bpm > 200) bpm = Math.round(bpm / 2)
      bpm = Math.max(60, Math.min(200, bpm))
    }

    const beatDuration = 60 / bpm
    const totalBeats = Math.ceil(totalDuration / beatDuration)

    // Build global chroma for key detection
    const globalChroma = new Array(12).fill(0)
    for (const note of notes) {
      const pc = midiToPitchClass(note.pitch)
      const duration = note.endTime - note.startTime
      globalChroma[pc] += duration * (note.velocity / 127)
    }
    const { key, scale } = detectKey(globalChroma)

    // Assign chords per beat using 1-beat window
    const chords = []
    let prevChord = null
    for (let b = 0; b < totalBeats; b++) {
      const beatStart = b * beatDuration
      const beatEnd = beatStart + beatDuration

      // Collect notes active during this beat
      const activeNotes = notes
        .filter(n => n.endTime > beatStart && n.startTime < beatEnd)
        .map(n => n.pitch)

      const chord = matchChordFromNotes(activeNotes)
      chords.push({
        beat: b,
        chord,
        chordDisplay: chord !== prevChord ? chord : null,
        time: +(beatStart.toFixed(3)),
      })
      prevChord = chord
    }

    // Smooth: fill null chords from previous
    let last = null
    for (const c of chords) {
      if (c.chord) last = c.chord
      else if (last) c.chord = last
    }

    // ─── STEP 3: Save to Supabase ───
    const uniqueChords = [...new Set(chords.filter(c=>c.chord).map(c=>c.chord))]
    const { data: saved, error: dbErr } = await supabase
      .from('songs')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        title,
        key_note: key,
        key_scale: scale,
        bpm,
        chords: uniqueChords,
        chord_data: chords,
        total_duration: +totalDuration.toFixed(2),
        total_beats: totalBeats,
      })
      .select().single()

    if (dbErr) throw dbErr

    return NextResponse.json({ songId: saved.id })

  } catch (err) {
    console.error('analyze error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
