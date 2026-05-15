-- Peer Rooms: schema, RLS, Realtime, join-by-code RPC
-- Run in Supabase SQL Editor. If "already member of publication" errors, skip those lines.

-- ── Tables ─────────────────────────────────────────────────────────────

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_id uuid not null references auth.users (id) on delete cascade,
  host_display_name text not null default 'Host',
  mode text not null default 'technical',
  role text not null default 'Full Stack Developer',
  is_public boolean not null default false,
  status text not null default 'waiting' check (status in ('waiting', 'active', 'finished')),
  stage text not null default 'setup' check (stage in ('setup', 'question', 'review', 'finished')),
  session_mode text not null default 'turn' check (session_mode in ('turn', 'observer')),
  current_question_index int not null default 0,
  current_turn_user_id uuid references auth.users (id) on delete set null,
  questions jsonb not null default '[]'::jsonb,
  round_answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists rooms_code_idx on public.rooms (code);
create index if not exists rooms_public_waiting_idx on public.rooms (is_public, status);

create table if not exists public.room_participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null,
  score_last int,
  joined_at timestamptz not null default now(),
  unique (room_id, user_id)
);

create index if not exists room_participants_room_idx on public.room_participants (room_id);
create index if not exists room_participants_user_idx on public.room_participants (user_id);

-- Join private rooms by code without exposing all waiting rooms (SECURITY DEFINER)
create or replace function public.room_by_code(_code text)
returns setof public.rooms
language sql
security definer
set search_path = public
stable
as $$
  select *
  from public.rooms
  where upper(trim(code)) = upper(trim(_code))
    and status in ('waiting', 'active');
$$;

grant execute on function public.room_by_code(text) to authenticated;

-- ── Realtime (ignore error if tables already added) ─────────────────────

alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_participants;

-- ── RLS ────────────────────────────────────────────────────────────────

alter table public.rooms enable row level security;
alter table public.room_participants enable row level security;

drop policy if exists "rooms_select_participant_or_public" on public.rooms;
drop policy if exists "rooms_select_participant_or_host_or_public_wait" on public.rooms;
create policy "rooms_select_participant_or_host_or_public_wait"
  on public.rooms for select
  using (
    host_id = auth.uid()
    or exists (
      select 1 from public.room_participants p
      where p.room_id = rooms.id and p.user_id = auth.uid()
    )
    or (is_public = true and status = 'waiting')
  );

create policy "rooms_insert_host"
  on public.rooms for insert
  with check (auth.uid() is not null and host_id = auth.uid());

drop policy if exists "rooms_update_host" on public.rooms;
drop policy if exists "rooms_update_participant" on public.rooms;
create policy "rooms_update_host"
  on public.rooms for update
  using (host_id = auth.uid())
  with check (host_id = auth.uid());

create policy "rooms_update_participant"
  on public.rooms for update
  using (
    exists (
      select 1 from public.room_participants p
      where p.room_id = rooms.id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.room_participants p
      where p.room_id = rooms.id and p.user_id = auth.uid()
    )
  );

drop policy if exists "room_participants_select" on public.room_participants;
create policy "room_participants_select"
  on public.room_participants for select
  using (
    exists (
      select 1 from public.room_participants p2
      where p2.room_id = room_participants.room_id and p2.user_id = auth.uid()
    )
    or exists (
      select 1 from public.rooms r
      where r.id = room_participants.room_id and r.host_id = auth.uid()
    )
    or exists (
      select 1 from public.rooms r
      where r.id = room_participants.room_id and r.is_public = true and r.status = 'waiting'
    )
  );

drop policy if exists "room_participants_insert_self" on public.room_participants;
create policy "room_participants_insert_self"
  on public.room_participants for insert
  with check (
    auth.uid() is not null
    and user_id = auth.uid()
    and exists (
      select 1 from public.rooms r
      where r.id = room_id
        and r.status in ('waiting', 'active')
    )
  );

create policy "room_participants_update_self"
  on public.room_participants for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "room_participants_delete_self"
  on public.room_participants for delete
  using (user_id = auth.uid());
