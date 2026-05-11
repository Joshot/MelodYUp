# MelodYUp

> Upload any song and get real chord detection, melody analysis, BPM, key, Nashville numbering, and live sync playback — like Chordify.

**Built by Hyvaroo Labs** · [melodyup.vercel.app](https://melodyup.vercel.app)

---

## Features

- **Upload MP3/WAV/M4A/OGG** — drag & drop or click to browse (max 50MB)
- **AI Chord Detection** — powered by Replicate + Spotify basic-pitch neural network (~90% accuracy)
- **Live Sync Player** — chord grid highlights beat-by-beat as your song plays (Chordify-style)
- **8 Beats Per Bar** — Chordify-style layout, chord shown only at start of each chord change
- **BPM Detection** — automatic tempo analysis
- **Key & Scale** — major/minor key detection
- **Nashville Numbering** — toggle to see chord functions (1, 4, 5, 6m, etc.)
- **Transpose** — shift all chords ±6 semitones
- **Personal Notes** — add fingerings and tips per song
- **Supabase Library** — all songs saved permanently

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 + React 19 |
| Styling | Tailwind CSS (light pastel green/blue) |
| Database | Supabase (PostgreSQL) |
| AI Analysis | Replicate API (basic-pitch by Spotify) |
| Deployment | Vercel |

---

## Setup

### 1. Clone & Install

```bash
git clone https://github.com/Joshot/MelodYUp.git
cd MelodYUp
npm install
```

### 2. Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
REPLICATE_API_TOKEN=your_replicate_token
```

### 3. Supabase Table

Run this SQL in your Supabase SQL editor:

```sql
create table if not exists songs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid,
  title text not null,
  filename text,
  key_note text,
  key_scale text,
  bpm integer,
  chords text[],
  chord_data jsonb,
  total_duration float,
  total_beats integer,
  notes text,
  created_at timestamp with time zone default now()
);

alter table songs enable row level security;

create policy "Public read" on songs for select using (true);
create policy "Public insert" on songs for insert with check (true);
create policy "Public update" on songs for update using (true);
create policy "Public delete" on songs for delete using (true);
```

### 4. Replicate API Token

1. Go to [replicate.com](https://replicate.com)
2. Sign in with GitHub
3. Go to **Account → API Tokens**
4. Create new token
5. Add to `.env.local` as `REPLICATE_API_TOKEN`
6. Also add to **Vercel Environment Variables**

### 5. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 6. Deploy to Vercel

```bash
npm install -g vercel
vercel --prod
```

Or connect GitHub repo to Vercel dashboard and set env vars there.

---

## How to Use

1. Go to **/upload**
2. Drag & drop or click to upload an MP3/WAV/M4A file (max 50MB)
3. Click **Analyze Song** — wait 30–90 seconds for AI analysis
4. Preview chords, then click **Save to Library & Play**
5. In the **Player**:
   - Click **Load Audio File** and re-upload the same song file
   - Press **Play** — chord grid syncs live with the audio
   - Click any chord box to jump to that beat in the song
   - Use **Nashville** toggle for number system view
   - Use **Transpose** (±6 semitones) to change key
6. Your library is at **/library** — all songs saved to Supabase

---

## Notes

- Audio files are **not stored** on any server — only chord data is saved to Supabase
- You need to re-upload the audio file each time you open the player (for privacy & storage)
- Analysis takes 30–90 seconds depending on song length and Replicate queue
- Free Replicate tier: ~50 predictions/month

---

*Crafted by Hyvaroo Labs. Engineered for musicians.*
