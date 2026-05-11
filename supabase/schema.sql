-- Tabel songs
create table if not exists songs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  title       text not null,
  youtube_url text not null,
  thumbnail   text,
  key_note    text,
  key_scale   text,
  bpm         integer,
  chords      text[],
  duration    integer,
  is_favorite boolean default false,
  notes       text,
  created_at  timestamptz default now()
);

-- Enable RLS
alter table songs enable row level security;

-- Policy: user hanya akses data sendiri
create policy "songs_own" on songs
  for all using (user_id = auth.uid());
