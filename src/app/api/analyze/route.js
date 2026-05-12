import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 120

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const CHORD_API = process.env.CHORD_API_URL || 'http://localhost:8000'

export async function POST(req) {
  try {
    const formData = await req.formData()
    const file = formData.get('file')
    const title = formData.get('title') || 'Untitled'

    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    // ── Forward audio to Python API ──────────────────────────────────────────
    const pyForm = new FormData()
    pyForm.append('file', file)
    const pyRes = await fetch(`${CHORD_API}/analyze`, { method: 'POST', body: pyForm })
    if (!pyRes.ok) {
      const err = await pyRes.json().catch(() => ({}))
      throw new Error(err.detail || `Python API error ${pyRes.status}`)
    }
    const { chords: chordData, bpm, key, scale, totalDuration, totalBeats } = await pyRes.json()

    // ── Save to Supabase ─────────────────────────────────────────────────────
    const uniqueChords = [...new Set(chordData.filter(c => c.chord && c.chord !== 'N').map(c => c.chord))]
    const { data: saved, error: dbErr } = await supabase.from('songs').insert({
      user_id: '00000000-0000-0000-0000-000000000000',
      title, key_note: key, key_scale: scale,
      bpm, chords: uniqueChords, chord_data: chordData,
      total_duration: totalDuration, total_beats: totalBeats,
    }).select().single()
    if (dbErr) throw dbErr

    return NextResponse.json({ songId: saved.id })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
