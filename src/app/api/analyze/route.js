import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Fallback chord progressions per key
const CHORD_DB = {
  C: ['C', 'Am', 'F', 'G'],
  G: ['G', 'Em', 'C', 'D'],
  D: ['D', 'Bm', 'G', 'A'],
  A: ['A', 'F#m', 'D', 'E'],
  E: ['E', 'C#m', 'A', 'B'],
  F: ['F', 'Dm', 'Bb', 'C'],
  Bb: ['Bb', 'Gm', 'Eb', 'F'],
}

function generateFallbackChordData(key = 'C', bpm = 120, totalBeats = 64) {
  const progression = CHORD_DB[key] || CHORD_DB['C']
  const beatDuration = 60 / bpm
  const beatsPerChord = 4
  const result = []

  for (let beat = 0; beat < totalBeats; beat++) {
    const chordIndex = Math.floor(beat / beatsPerChord) % progression.length
    result.push({
      beat,
      chord: progression[chordIndex],
      chordDisplay: beat % beatsPerChord === 0 ? progression[chordIndex] : null,
      time: parseFloat((beat * beatDuration).toFixed(3)),
    })
  }
  return result
}

export async function POST(req) {
  try {
    const body = await req.json()
    const { title, chordData, bpm, key, scale, totalDuration, totalBeats } = body

    let finalChordData = chordData

    // Kalau tidak ada chord data dari client, cari di DB dulu
    if (!finalChordData || !Array.isArray(finalChordData) || finalChordData.length === 0) {
      if (title) {
        const { data: existing } = await supabase
          .from('songs')
          .select('chord_data, chords, key_note, bpm')
          .ilike('title', `%${title}%`)
          .limit(1)
          .single()

        if (existing?.chord_data) {
          finalChordData = existing.chord_data
        }
      }
    }

    // Kalau masih kosong, generate dari key pakai fallback DB
    if (!finalChordData || !Array.isArray(finalChordData) || finalChordData.length === 0) {
      finalChordData = generateFallbackChordData(key || 'C', bpm || 120, totalBeats || 64)
    }

    const uniqueChords = [
      ...new Set(
        finalChordData
          .filter((c) => c.chord && c.chord !== 'N')
          .map((c) => c.chord)
      ),
    ]

    const { data: saved, error: dbErr } = await supabase
      .from('songs')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        title: title || 'Untitled',
        key_note: key || 'C',
        key_scale: scale || 'major',
        bpm: bpm || 120,
        chords: uniqueChords,
        chord_data: finalChordData,
        total_duration: totalDuration || 0,
        total_beats: totalBeats || 0,
      })
      .select()
      .single()

    if (dbErr) throw dbErr

    return NextResponse.json({
      songId: saved.id,
      title: saved.title,
      key: saved.key_note,
      scale: saved.key_scale,
      bpm: saved.bpm,
      uniqueChords,
      totalChords: finalChordData.length,
      chordData: finalChordData,
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
