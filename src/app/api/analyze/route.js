import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN
// basic-pitch by spotify — correct model version
const BASIC_PITCH_VERSION = 'a0a535ef0c5dd9558f47e1a6d7334b3db682bb66b08ed4fce0e5d8cf13a49a35'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio')
    const title = formData.get('title') || 'Untitled'

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }
    if (!REPLICATE_API_TOKEN) {
      return NextResponse.json({ error: 'REPLICATE_API_TOKEN not set in environment' }, { status: 500 })
    }

    // Convert file to base64 data URI
    const bytes = await audioFile.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')
    const mimeType = audioFile.type || 'audio/mpeg'
    const dataUri = `data:${mimeType};base64,${base64}`

    // Run basic-pitch on Replicate
    const createRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: BASIC_PITCH_VERSION,
        input: {
          audio: dataUri,
          onset_threshold: 0.5,
          frame_threshold: 0.3,
          minimum_note_length: 58,
          minimum_frequency: 32.7,
          maximum_frequency: 2093.0,
        }
      })
    })

    if (!createRes.ok) {
      const errBody = await createRes.text()
      console.error('Replicate create error:', createRes.status, errBody)
      if (createRes.status === 402) throw new Error('Replicate billing required: add payment method at replicate.com/account/billing')
      if (createRes.status === 401) throw new Error('Invalid Replicate API token — check REPLICATE_API_TOKEN env var')
      if (createRes.status === 429) throw new Error('Replicate rate limit — add a payment method at replicate.com/account/billing (still has free tier after)')
      throw new Error(`Replicate API error: ${createRes.status}`)
    }

    const prediction = await createRes.json()
    let result = prediction

    // Poll until complete (max 3 minutes)
    let attempts = 0
    while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < 90) {
      await new Promise(r => setTimeout(r, 2000))
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
        headers: { 'Authorization': `Token ${REPLICATE_API_TOKEN}` }
      })
      result = await pollRes.json()
      attempts++
    }

    if (result.status === 'failed') {
      throw new Error('Replicate prediction failed: ' + (result.error || 'unknown error'))
    }
    if (result.status !== 'succeeded') {
      throw new Error('Replicate timed out — try a shorter audio file')
    }

    // basic-pitch returns MIDI notes array
    const notes = result.output?.notes || result.output || []
    const processedData = processNotesToChords(Array.isArray(notes) ? notes : [])

    // Auto-save to Supabase immediately
    const songData = {
      user_id: '00000000-0000-0000-0000-000000000000',
      title: title,
      filename: audioFile.name || title,
      key_note: processedData.key,
      key_scale: processedData.scale,
      bpm: processedData.bpm,
      chords: [...new Set(processedData.chords.filter(c => c.chord).map(c => c.chord))],
      chord_data: processedData.chords,
      total_duration: processedData.totalDuration,
      total_beats: processedData.totalBeats,
    }

    const { data: savedSong, error: dbErr } = await supabaseAdmin
      .from('songs')
      .insert(songData)
      .select()
      .single()

    if (dbErr) {
      console.error('Supabase insert error:', dbErr)
      // Return analysis data even if save failed
      return NextResponse.json({ ...processedData, saveError: dbErr.message })
    }

    return NextResponse.json({ ...processedData, songId: savedSong.id })

  } catch (err) {
    console.error('Analyze error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function detectKey(chromaProfile) {
  const majorTemplates = [
    [1,0,1,0,1,1,0,1,0,1,0,1],[1,1,0,1,0,1,1,0,1,0,1,0],[0,1,1,0,1,0,1,1,0,1,0,1],
    [1,0,1,1,0,1,0,1,1,0,1,0],[0,1,0,1,1,0,1,0,1,1,0,1],[1,0,1,0,1,1,0,1,0,1,1,0],
    [0,1,0,1,0,1,1,0,1,0,1,1],[1,0,1,0,1,0,1,1,0,1,0,1],[1,1,0,1,0,1,0,1,1,0,1,0],
    [0,1,1,0,1,0,1,0,1,1,0,1],[1,0,1,1,0,1,0,1,0,1,1,0],[0,1,0,1,1,0,1,0,1,0,1,1],
  ]
  const minorTemplates = [
    [1,0,1,1,0,1,0,1,1,0,1,0],[0,1,0,1,1,0,1,0,1,1,0,1],[1,0,1,0,1,1,0,1,0,1,1,0],
    [0,1,0,1,0,1,1,0,1,0,1,1],[1,0,1,0,1,0,1,1,0,1,0,1],[1,1,0,1,0,1,0,1,1,0,1,0],
    [0,1,1,0,1,0,1,0,1,1,0,1],[1,0,1,1,0,1,0,1,0,1,1,0],[0,1,0,1,1,0,1,0,1,0,1,1],
    [1,0,1,0,1,1,0,1,0,1,0,1],[0,1,0,1,0,1,1,0,1,0,1,0],[1,0,1,0,1,0,1,1,0,1,0,1],
  ]
  const noteNames = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
  const normalize = arr => { const s = arr.reduce((a,b)=>a+b,0)||1; return arr.map(v=>v/s) }
  const norm = normalize(chromaProfile)
  let best = -Infinity, bestKey = 'C', bestScale = 'major'
  majorTemplates.forEach((tmpl,i) => {
    const score = tmpl.reduce((s,v,j) => s + v*norm[j], 0)
    if (score > best) { best = score; bestKey = noteNames[i]; bestScale = 'major' }
  })
  minorTemplates.forEach((tmpl,i) => {
    const score = tmpl.reduce((s,v,j) => s + v*norm[j], 0)
    if (score > best) { best = score; bestKey = noteNames[i]; bestScale = 'minor' }
  })
  return { key: bestKey, scale: bestScale }
}

function getNashville(chordRoot, keyRoot, scale) {
  const notes = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
  const majorIntervals = [0,2,4,5,7,9,11]
  const minorIntervals = [0,2,3,5,7,8,10]
  const intervals = scale === 'major' ? majorIntervals : minorIntervals
  const majorNumbers = ['1','2m','3m','4','5','6m','7dim']
  const minorNumbers = ['1m','2dim','3M','4m','5m','6M','7M']
  const numbers = scale === 'major' ? majorNumbers : minorNumbers
  const keyIdx = notes.indexOf(keyRoot)
  const chordIdx = notes.indexOf(chordRoot)
  if (keyIdx < 0 || chordIdx < 0) return '?'
  const semitones = (chordIdx - keyIdx + 12) % 12
  const degreeIdx = intervals.indexOf(semitones)
  return degreeIdx >= 0 ? numbers[degreeIdx] : '?'
}

function processNotesToChords(notes) {
  if (!notes || notes.length === 0) {
    return { chords: [], bpm: 120, key: 'C', scale: 'major', totalDuration: 0, totalBeats: 0 }
  }

  const chroma = new Array(12).fill(0)
  notes.forEach(n => { chroma[n.pitch % 12] += (n.end_time - n.start_time) })
  const { key, scale } = detectKey(chroma)

  const onsets = notes.map(n => n.start_time).sort((a,b) => a-b)
  let bpm = 120
  if (onsets.length > 4) {
    const diffs = []
    for (let i = 1; i < Math.min(onsets.length, 100); i++) {
      const d = onsets[i] - onsets[i-1]
      if (d > 0.08 && d < 2.0) diffs.push(d)
    }
    if (diffs.length > 2) {
      diffs.sort((a,b) => a-b)
      const median = diffs[Math.floor(diffs.length/2)]
      bpm = Math.round(60 / median)
      bpm = Math.max(50, Math.min(220, bpm))
    }
  }

  const beatDuration = 60 / bpm
  const totalDuration = Math.max(...notes.map(n => n.end_time))
  const totalBeats = Math.ceil(totalDuration / beatDuration)

  const beatNotes = Array.from({ length: totalBeats }, () => new Array(12).fill(0))
  notes.forEach(n => {
    const startBeat = Math.floor(n.start_time / beatDuration)
    const endBeat = Math.ceil(n.end_time / beatDuration)
    for (let b = startBeat; b < Math.min(endBeat, totalBeats); b++) {
      beatNotes[b][n.pitch % 12] += (n.end_time - n.start_time)
    }
  })

  const CHORD_TEMPLATES = [
    {name:'C',root:0,intervals:[0,4,7]},{name:'C#',root:1,intervals:[0,4,7]},
    {name:'D',root:2,intervals:[0,4,7]},{name:'D#',root:3,intervals:[0,4,7]},
    {name:'E',root:4,intervals:[0,4,7]},{name:'F',root:5,intervals:[0,4,7]},
    {name:'F#',root:6,intervals:[0,4,7]},{name:'G',root:7,intervals:[0,4,7]},
    {name:'G#',root:8,intervals:[0,4,7]},{name:'A',root:9,intervals:[0,4,7]},
    {name:'A#',root:10,intervals:[0,4,7]},{name:'B',root:11,intervals:[0,4,7]},
    {name:'Cm',root:0,intervals:[0,3,7]},{name:'C#m',root:1,intervals:[0,3,7]},
    {name:'Dm',root:2,intervals:[0,3,7]},{name:'D#m',root:3,intervals:[0,3,7]},
    {name:'Em',root:4,intervals:[0,3,7]},{name:'Fm',root:5,intervals:[0,3,7]},
    {name:'F#m',root:6,intervals:[0,3,7]},{name:'Gm',root:7,intervals:[0,3,7]},
    {name:'G#m',root:8,intervals:[0,3,7]},{name:'Am',root:9,intervals:[0,3,7]},
    {name:'A#m',root:10,intervals:[0,3,7]},{name:'Bm',root:11,intervals:[0,3,7]},
  ]

  // Smooth chords: use 2-beat window for better accuracy
  const chords = beatNotes.map((beatChroma, beatIdx) => {
    // Merge with adjacent beat for smoother detection
    const window = new Array(12).fill(0)
    for (let w = -1; w <= 1; w++) {
      const wb = beatIdx + w
      if (wb >= 0 && wb < beatNotes.length) {
        beatNotes[wb].forEach((v,i) => window[i] += v)
      }
    }
    const total = window.reduce((a,b) => a+b, 0)
    if (total === 0) return { beat: beatIdx, chord: null, nashville: null, time: beatIdx * beatDuration }
    let bestScore = -1, bestChord = null
    CHORD_TEMPLATES.forEach(tmpl => {
      const score = tmpl.intervals.reduce((s,interval) => s + (window[(tmpl.root+interval)%12]||0), 0) / total
      if (score > bestScore) { bestScore = score; bestChord = tmpl }
    })
    const rootName = bestChord.name.replace('m','').replace('#m','#')
    const nashville = getNashville(rootName, key, scale)
    return {
      beat: beatIdx,
      chord: bestChord.name,
      nashville,
      time: +(beatIdx * beatDuration).toFixed(3),
      score: +bestScore.toFixed(3),
    }
  })

  // De-duplicate consecutive same chords for cleaner display
  let prevChord = null
  const dedupedChords = chords.map(c => {
    const display = c.chord === prevChord ? { ...c, chordDisplay: null } : { ...c, chordDisplay: c.chord }
    prevChord = c.chord
    return display
  })

  return { chords: dedupedChords, bpm, key, scale, totalDuration: +totalDuration.toFixed(2), totalBeats }
}
