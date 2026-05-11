import { NextResponse } from 'next/server'

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN

export async function POST(request) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio')

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
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
        version: 'b5b9e8f4e2e9e8e9e8e9e8e9e8e9e8e9e8e9e8e9e8e9e8e9e8e9e8e9e8e9e8',
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
      throw new Error(`Replicate API error: ${createRes.status}`)
    }

    const prediction = await createRes.json()
    let result = prediction

    // Poll until complete
    let attempts = 0
    while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < 60) {
      await new Promise(r => setTimeout(r, 2000))
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
        headers: { 'Authorization': `Token ${REPLICATE_API_TOKEN}` }
      })
      result = await pollRes.json()
      attempts++
    }

    if (result.status === 'failed') {
      throw new Error('Replicate prediction failed: ' + result.error)
    }

    // Process notes into chords
    const notes = result.output?.notes || []
    const processedData = processNotesToChords(notes)

    return NextResponse.json(processedData)

  } catch (err) {
    console.error('Analyze error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Map MIDI note to note name
function midiToNote(midi) {
  const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
  return names[midi % 12]
}

// Detect key from chroma profile
function detectKey(chromaProfile) {
  const majorTemplates = [
    [1,0,1,0,1,1,0,1,0,1,0,1], // C
    [1,1,0,1,0,1,1,0,1,0,1,0], // C#
    [0,1,1,0,1,0,1,1,0,1,0,1], // D
    [1,0,1,1,0,1,0,1,1,0,1,0], // D#
    [0,1,0,1,1,0,1,0,1,1,0,1], // E
    [1,0,1,0,1,1,0,1,0,1,1,0], // F
    [0,1,0,1,0,1,1,0,1,0,1,1], // F#
    [1,0,1,0,1,0,1,1,0,1,0,1], // G
    [1,1,0,1,0,1,0,1,1,0,1,0], // G#
    [0,1,1,0,1,0,1,0,1,1,0,1], // A
    [1,0,1,1,0,1,0,1,0,1,1,0], // A#
    [0,1,0,1,1,0,1,0,1,0,1,1], // B
  ]
  const minorTemplates = [
    [1,0,1,1,0,1,0,1,1,0,1,0], // Cm
    [0,1,0,1,1,0,1,0,1,1,0,1], // C#m
    [1,0,1,0,1,1,0,1,0,1,1,0], // Dm
    [0,1,0,1,0,1,1,0,1,0,1,1], // D#m
    [1,0,1,0,1,0,1,1,0,1,0,1], // Em
    [1,1,0,1,0,1,0,1,1,0,1,0], // Fm
    [0,1,1,0,1,0,1,0,1,1,0,1], // F#m
    [1,0,1,1,0,1,0,1,0,1,1,0], // Gm
    [0,1,0,1,1,0,1,0,1,0,1,1], // G#m
    [1,0,1,0,1,1,0,1,0,1,0,1], // Am
    [0,1,0,1,0,1,1,0,1,0,1,0], // A#m
    [1,0,1,0,1,0,1,1,0,1,0,1], // Bm
  ]
  const noteNames = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
  const normalize = arr => { const s = arr.reduce((a,b)=>a+b,0)||1; return arr.map(v=>v/s) }
  const norm = normalize(chromaProfile)
  let best = -Infinity, bestKey = 'C', bestScale = 'major'
  majorTemplates.forEach((tmpl, i) => {
    const score = tmpl.reduce((s,v,j) => s + v*norm[j], 0)
    if (score > best) { best = score; bestKey = noteNames[i]; bestScale = 'major' }
  })
  minorTemplates.forEach((tmpl, i) => {
    const score = tmpl.reduce((s,v,j) => s + v*norm[j], 0)
    if (score > best) { best = score; bestKey = noteNames[i]; bestScale = 'minor' }
  })
  return { key: bestKey, scale: bestScale }
}

// Nashville number system
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
    return { chords: [], bpm: 120, key: 'C', scale: 'major', totalDuration: 0 }
  }

  // Build chroma profile
  const chroma = new Array(12).fill(0)
  notes.forEach(n => { chroma[n.pitch % 12] += (n.end_time - n.start_time) })
  const { key, scale } = detectKey(chroma)

  // Estimate BPM from note onsets
  const onsets = notes.map(n => n.start_time).sort((a,b)=>a-b)
  let bpm = 120
  if (onsets.length > 4) {
    const diffs = []
    for (let i = 1; i < Math.min(onsets.length, 50); i++) {
      const d = onsets[i] - onsets[i-1]
      if (d > 0.1 && d < 2.0) diffs.push(d)
    }
    if (diffs.length > 0) {
      const avgDiff = diffs.reduce((a,b)=>a+b,0)/diffs.length
      bpm = Math.round(60 / avgDiff)
      bpm = Math.max(60, Math.min(200, bpm))
    }
  }

  const beatDuration = 60 / bpm
  const totalDuration = Math.max(...notes.map(n => n.end_time))
  const totalBeats = Math.ceil(totalDuration / beatDuration)

  // Assign notes to beats
  const beatNotes = Array.from({ length: totalBeats }, () => new Array(12).fill(0))
  notes.forEach(n => {
    const startBeat = Math.floor(n.start_time / beatDuration)
    const endBeat = Math.ceil(n.end_time / beatDuration)
    for (let b = startBeat; b < Math.min(endBeat, totalBeats); b++) {
      beatNotes[b][n.pitch % 12] += 1
    }
  })

  // Identify chord per beat using template matching
  const CHORD_TEMPLATES = [
    { name:'C',  root:0,  intervals:[0,4,7] },
    { name:'C#', root:1,  intervals:[0,4,7] },
    { name:'D',  root:2,  intervals:[0,4,7] },
    { name:'D#', root:3,  intervals:[0,4,7] },
    { name:'E',  root:4,  intervals:[0,4,7] },
    { name:'F',  root:5,  intervals:[0,4,7] },
    { name:'F#', root:6,  intervals:[0,4,7] },
    { name:'G',  root:7,  intervals:[0,4,7] },
    { name:'G#', root:8,  intervals:[0,4,7] },
    { name:'A',  root:9,  intervals:[0,4,7] },
    { name:'A#', root:10, intervals:[0,4,7] },
    { name:'B',  root:11, intervals:[0,4,7] },
    { name:'Cm',  root:0,  intervals:[0,3,7] },
    { name:'C#m', root:1,  intervals:[0,3,7] },
    { name:'Dm',  root:2,  intervals:[0,3,7] },
    { name:'D#m', root:3,  intervals:[0,3,7] },
    { name:'Em',  root:4,  intervals:[0,3,7] },
    { name:'Fm',  root:5,  intervals:[0,3,7] },
    { name:'F#m', root:6,  intervals:[0,3,7] },
    { name:'Gm',  root:7,  intervals:[0,3,7] },
    { name:'G#m', root:8,  intervals:[0,3,7] },
    { name:'Am',  root:9,  intervals:[0,3,7] },
    { name:'A#m', root:10, intervals:[0,3,7] },
    { name:'Bm',  root:11, intervals:[0,3,7] },
  ]

  const chords = beatNotes.map((beatChroma, beatIdx) => {
    const total = beatChroma.reduce((a,b)=>a+b,0)
    if (total === 0) return { beat: beatIdx, chord: null, nashville: null, time: beatIdx * beatDuration }
    let bestScore = -1, bestChord = null
    CHORD_TEMPLATES.forEach(tmpl => {
      const score = tmpl.intervals.reduce((s, interval) => {
        return s + (beatChroma[(tmpl.root + interval) % 12] || 0)
      }, 0) / total
      if (score > bestScore) { bestScore = score; bestChord = tmpl }
    })
    const nashville = bestChord ? getNashville(bestChord.name.replace('m',''), key, scale) : null
    return {
      beat: beatIdx,
      chord: bestChord ? bestChord.name : null,
      nashville,
      time: beatIdx * beatDuration,
      score: bestScore,
    }
  })

  // Group beats into bars of 4, keep chord changes
  const bars = []
  const BEATS_PER_BAR = 4
  for (let bar = 0; bar < Math.ceil(totalBeats / BEATS_PER_BAR); bar++) {
    const barBeats = []
    for (let b = 0; b < BEATS_PER_BAR; b++) {
      const beatIdx = bar * BEATS_PER_BAR + b
      if (beatIdx < chords.length) barBeats.push(chords[beatIdx])
    }
    bars.push(barBeats)
  }

  return { chords, bars, bpm, key, scale, totalDuration, totalBeats }
}
