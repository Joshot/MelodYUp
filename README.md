# MelodYUp

Platform analisis lagu YouTube — deteksi kunci, chord, BPM secara otomatis.

## Setup

1. Clone repo
2. `npm install`
3. Copy `.env.local.example` ke `.env.local` dan isi dengan Supabase credentials
4. Jalankan SQL di `supabase/schema.sql` di Supabase SQL Editor
5. `npm run dev`

## Deploy

Deploy ke Vercel dan set environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
