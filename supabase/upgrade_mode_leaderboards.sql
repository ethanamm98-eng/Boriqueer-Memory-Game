-- Run once in Supabase Dashboard > SQL Editor for an existing project.

create table if not exists public.leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mode text not null check (mode in ('classic','clock','rush','streak','last-chance')),
  score integer not null default 0 check (score >= 0),
  pairs integer not null default 0 check (pairs between 0 and 80),
  moves integer not null default 0 check (moves >= 0),
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  game_type text not null check (game_type in ('local','online')),
  room_id uuid references public.game_rooms(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(room_id, user_id)
);
create index if not exists leaderboard_mode_rank_idx on public.leaderboard_entries(mode, score desc, duration_seconds, moves);
alter table public.leaderboard_entries enable row level security;
revoke all on public.leaderboard_entries from anon, authenticated;

create or replace function public.record_local_leaderboard(p_mode text, p_score integer, p_pairs integer, p_moves integer, p_duration_seconds integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'You must be signed in.'; end if;
  if p_mode not in ('classic','clock','rush','streak','last-chance') then raise exception 'Invalid game mode.'; end if;
  insert into public.leaderboard_entries(user_id, mode, score, pairs, moves, duration_seconds, game_type)
  values(auth.uid(), p_mode, greatest(p_score,0), least(greatest(p_pairs,0),80), greatest(p_moves,0), greatest(p_duration_seconds,0), 'local');
end;
$$;

create or replace function public.get_mode_leaderboard(p_mode text)
returns table(id uuid, display_name text, avatar_url text, score integer, pairs integer, moves integer, duration_seconds integer)
language sql stable security definer set search_path = public as $$
  with ranked as (
    select le.*, row_number() over(partition by le.user_id order by le.score desc, le.duration_seconds asc, le.moves asc, le.created_at asc) as attempt_rank
    from public.leaderboard_entries le where le.mode = p_mode
  )
  select r.id, p.display_name, p.avatar_url, r.score, r.pairs, r.moves, r.duration_seconds
  from ranked r join public.profiles p on p.id = r.user_id
  where r.attempt_rank = 1
  order by r.score desc, r.duration_seconds asc, r.moves asc
  limit 3;
$$;

create or replace function public.capture_online_leaderboard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status <> 'finished' and new.status = 'finished' then
    insert into public.leaderboard_entries(user_id, mode, score, pairs, moves, duration_seconds, game_type, room_id)
    select rp.user_id, new.mode, rp.score, cardinality(new.matched_pair_ids), new.moves,
      greatest(0, extract(epoch from (coalesce(new.finished_at, now()) - coalesce(new.started_at, new.created_at)))::integer), 'online', new.id
    from public.room_players rp where rp.room_id = new.id
    on conflict(room_id, user_id) do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists game_room_leaderboard on public.game_rooms;
create trigger game_room_leaderboard after update of status on public.game_rooms
for each row execute function public.capture_online_leaderboard();

revoke all on function public.record_local_leaderboard(text, integer, integer, integer, integer) from public, anon;
grant execute on function public.record_local_leaderboard(text, integer, integer, integer, integer) to authenticated;
revoke all on function public.get_mode_leaderboard(text) from public;
grant execute on function public.get_mode_leaderboard(text) to anon, authenticated;
