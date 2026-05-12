import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(req) {
  try {
    const body = await req.json()
    const { title, chordData, bpm, key, scale, totalDuration, totalBeats } = body

    if (!chordData || !Array.isArray(chordData)) {
      return NextResponse.json({ error: 'No chord data provided' }, { status: 400 })
    }

    const uniqueChords = [...new Set(chordData.filter(c => c.chord).map(c => c.chord))]

    const { data: saved, error: dbErr } = await supabase
      .from('songs')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        title: title || 'Untitled',
        key_note: key || 'C',
        key_scale: scale || 'major',
        bpm: bpm || 120,
        chords: uniqueChords,
        chord_data: chordData,
        total_duration: totalDuration || 0,
        total_beats: totalBeats || 0,
      })
      .select().single()

    if (dbErr) throw dbErr

    return NextResponse.json({ songId: saved.id })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
