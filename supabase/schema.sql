-- Boricuir Memory - Supabase schema
-- Run this entire file once in Supabase Dashboard > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 30),
  avatar_url text,
  games_played integer not null default 0 check (games_played >= 0),
  games_won integer not null default 0 check (games_won >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = 5242880;

create table if not exists public.game_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  host_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'waiting' check (status in ('waiting','playing','finished')),
  mode text not null check (mode in ('classic','clock','rush','streak','last-chance')),
  categories text[] not null default array['general','puerto-rico','sexual-health','identities']::text[]
    check (categories <@ array['general','puerto-rico','sexual-health','identities']::text[] and cardinality(categories) between 1 and 4),
  pair_count integer not null check (pair_count between 1 and 80),
  max_players integer not null check (max_players between 2 and 4),
  deck integer[] not null,
  flipped_indices integer[] not null default '{}',
  matched_pair_ids integer[] not null default '{}',
  current_player_index integer not null default 0,
  moves integer not null default 0,
  lives integer not null default 5,
  started_at timestamptz,
  finished_at timestamptz,
  time_limit_seconds integer not null default 120,
  last_flip_was_match boolean,
  turn_state text not null default 'ready' check (turn_state in ('ready','resolving')),
  winner_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.game_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  seat_index integer not null check (seat_index between 0 and 3),
  score integer not null default 0,
  streak integer not null default 0,
  is_ready boolean not null default false,
  joined_at timestamptz not null default now(),
  unique(room_id, user_id),
  unique(room_id, seat_index)
);

create table if not exists public.room_events (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.game_rooms(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (event_type in ('joined','left','started','match','miss','turn','win','system')),
  message text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

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

create index if not exists room_players_room_idx on public.room_players(room_id, seat_index);
create index if not exists room_events_room_created_idx on public.room_events(room_id, created_at desc);
create index if not exists game_rooms_code_waiting_idx on public.game_rooms(code) where status = 'waiting';

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists game_rooms_updated_at on public.game_rooms;
create trigger game_rooms_updated_at before update on public.game_rooms for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  v_name := trim(coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), split_part(coalesce(new.email, ''), '@', 1), 'Player'));
  if char_length(v_name) < 2 then v_name := 'Player'; end if;
  insert into public.profiles (id, display_name)
  values (new.id, left(v_name, 30))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Backfill profiles for accounts created before this schema was installed.
insert into public.profiles(id, display_name)
select id,
  left(case when char_length(trim(coalesce(raw_user_meta_data->>'display_name', split_part(coalesce(email, ''), '@', 1)))) >= 2
    then trim(coalesce(raw_user_meta_data->>'display_name', split_part(coalesce(email, ''), '@', 1))) else 'Player' end, 30)
from auth.users
on conflict(id) do nothing;

create or replace function public.is_room_member(p_room_id uuid, p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.room_players where room_id = p_room_id and user_id = p_user_id);
$$;

create or replace function public.player_name(p_user_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(display_name, 'Player') from public.profiles where id = p_user_id;
$$;

create or replace function public.record_local_game(p_won boolean)
returns void language sql security definer set search_path = public as $$
  update public.profiles set games_played = games_played + 1,
    games_won = games_won + case when p_won then 1 else 0 end where id = auth.uid();
$$;

create or replace function public.calculate_time_limit(p_pairs integer)
returns integer language sql immutable as $$
  select case when p_pairs <= 6 then 60 when p_pairs <= 12 then 120 when p_pairs <= 20 then 210 else 900 end;
$$;

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

create or replace function public.finish_room(p_room_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_top integer;
  v_winners uuid[];
begin
  select max(score) into v_top from public.room_players where room_id = p_room_id;
  select coalesce(array_agg(user_id order by seat_index), '{}') into v_winners
  from public.room_players where room_id = p_room_id and score = coalesce(v_top, 0);

  update public.game_rooms set status = 'finished', finished_at = now(), winner_ids = v_winners where id = p_room_id and status <> 'finished';
  if found then
    update public.profiles p set games_played = games_played + 1
    where exists(select 1 from public.room_players rp where rp.room_id = p_room_id and rp.user_id = p.id);
    update public.profiles set games_won = games_won + 1 where id = any(v_winners);
    insert into public.room_events(room_id, event_type, message, payload)
    values (p_room_id, 'win', 'The game is complete!', jsonb_build_object('winner_ids', v_winners));
  end if;
end;
$$;

create or replace function public.create_game_room(p_mode text, p_pair_count integer, p_max_players integer, p_categories text[])
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_room_id uuid;
  v_code text;
  v_selected integer[];
  v_deck integer[];
begin
  if auth.uid() is null then raise exception 'You must be signed in.'; end if;
  if p_mode not in ('classic','clock','rush','streak','last-chance') then raise exception 'Invalid game mode.'; end if;
  if p_categories is null or cardinality(p_categories) not between 1 and 4 then raise exception 'Choose between 1 and 4 categories.'; end if;
  if exists(select 1 from unnest(p_categories) c where c not in ('general','puerto-rico','sexual-health','identities')) then raise exception 'Invalid card category.'; end if;
  if cardinality(p_categories) <> (select count(distinct c) from unnest(p_categories) c) then raise exception 'Duplicate card categories are not allowed.'; end if;
  if p_max_players not between 2 and 4 then raise exception 'Online games require 2 to 4 players.'; end if;

  select array_agg(card_id) into v_selected
  from (
    select card_id from generate_series(1,80) as cards(card_id)
    where ('general' = any(p_categories) and card_id between 1 and 33)
       or ('puerto-rico' = any(p_categories) and card_id between 34 and 54)
       or ('sexual-health' = any(p_categories) and card_id between 55 and 67)
       or ('identities' = any(p_categories) and card_id between 68 and 80)
    order by random()
  ) selected;
  if cardinality(v_selected) <> p_pair_count then raise exception 'The board size must match the selected categories.'; end if;
  select array_agg(card_id) into v_deck
  from (select card_id from unnest(v_selected || v_selected) as cards(card_id) order by random()) shuffled;

  loop
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text || auth.uid()::text), 1, 6));
    exit when not exists(select 1 from public.game_rooms where code = v_code);
  end loop;

  insert into public.game_rooms(code, host_id, mode, categories, pair_count, max_players, deck, time_limit_seconds)
  values(v_code, auth.uid(), p_mode, p_categories, p_pair_count, p_max_players, v_deck, public.calculate_time_limit(p_pair_count)) returning id into v_room_id;
  insert into public.room_players(room_id, user_id, seat_index, is_ready) values(v_room_id, auth.uid(), 0, true);
  insert into public.room_events(room_id, user_id, event_type, message) values(v_room_id, auth.uid(), 'joined', public.player_name(auth.uid()) || ' created the room.');
  return v_room_id;
end;
$$;

create or replace function public.join_game_room(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_room public.game_rooms%rowtype;
  v_count integer;
  v_seat integer;
begin
  if auth.uid() is null then raise exception 'You must be signed in.'; end if;
  select * into v_room from public.game_rooms where code = upper(trim(p_code)) for update;
  if not found then raise exception 'Room not found.'; end if;
  if v_room.status <> 'waiting' then raise exception 'This game has already started.'; end if;
  if exists(select 1 from public.room_players where room_id = v_room.id and user_id = auth.uid()) then return v_room.id; end if;
  select count(*) into v_count from public.room_players where room_id = v_room.id;
  if v_count >= v_room.max_players then raise exception 'This room is full.'; end if;
  select candidate into v_seat from generate_series(0, v_room.max_players - 1) as seats(candidate)
  where not exists(select 1 from public.room_players where room_id = v_room.id and seat_index = candidate) order by candidate limit 1;
  insert into public.room_players(room_id, user_id, seat_index) values(v_room.id, auth.uid(), v_seat);
  insert into public.room_events(room_id, user_id, event_type, message) values(v_room.id, auth.uid(), 'joined', public.player_name(auth.uid()) || ' joined the room.');
  return v_room.id;
end;
$$;

create or replace function public.set_player_ready(p_room_id uuid, p_ready boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_room_member(p_room_id) then raise exception 'You are not in this room.'; end if;
  if not exists(select 1 from public.game_rooms where id = p_room_id and status = 'waiting') then raise exception 'The game has already started.'; end if;
  update public.room_players set is_ready = p_ready where room_id = p_room_id and user_id = auth.uid();
end;
$$;

create or replace function public.start_game_room(p_room_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_room public.game_rooms%rowtype; v_count integer;
begin
  select * into v_room from public.game_rooms where id = p_room_id for update;
  if v_room.host_id <> auth.uid() then raise exception 'Only the host can start the game.'; end if;
  if v_room.status <> 'waiting' then raise exception 'The room is not waiting.'; end if;
  select count(*) into v_count from public.room_players where room_id = p_room_id;
  if v_count < 2 then raise exception 'At least two players are required.'; end if;
  if exists(select 1 from public.room_players where room_id = p_room_id and not is_ready) then raise exception 'Every player must be ready.'; end if;
  update public.game_rooms set status = 'playing', started_at = now(), current_player_index = (select min(seat_index) from public.room_players where room_id = p_room_id) where id = p_room_id;
  insert into public.room_events(room_id, user_id, event_type, message) values(p_room_id, auth.uid(), 'started', 'The game has started!');
end;
$$;

create or replace function public.flip_game_card(p_room_id uuid, p_card_index integer)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_room public.game_rooms%rowtype;
  v_player public.room_players%rowtype;
  v_first_match integer;
  v_second_match integer;
  v_next_streak integer;
  v_points integer;
begin
  select * into v_room from public.game_rooms where id = p_room_id for update;
  if not found or v_room.status <> 'playing' then raise exception 'This game is not active.'; end if;
  select * into v_player from public.room_players where room_id = p_room_id and user_id = auth.uid();
  if not found then raise exception 'You are not in this room.'; end if;
  if v_player.seat_index <> v_room.current_player_index then raise exception 'It is not your turn.'; end if;
  if v_room.turn_state <> 'ready' then raise exception 'Wait for the current pair to resolve.'; end if;
  if v_room.mode = 'rush' and now() < v_room.started_at + interval '5 seconds' then raise exception 'Wait for the preview to finish.'; end if;
  if v_room.mode = 'clock' and now() >= v_room.started_at + make_interval(secs => v_room.time_limit_seconds) then
    perform public.finish_room(p_room_id); raise exception 'Time is up.';
  end if;
  if p_card_index < 0 or p_card_index >= cardinality(v_room.deck) then raise exception 'Invalid card.'; end if;
  if p_card_index = any(v_room.flipped_indices) then raise exception 'That card is already flipped.'; end if;
  v_second_match := v_room.deck[p_card_index + 1];
  if v_second_match = any(v_room.matched_pair_ids) then raise exception 'That pair is already matched.'; end if;

  if cardinality(v_room.flipped_indices) = 0 then
    update public.game_rooms set flipped_indices = array[p_card_index] where id = p_room_id;
    return;
  end if;

  v_first_match := v_room.deck[v_room.flipped_indices[1] + 1];
  if v_first_match = v_second_match then
    v_next_streak := v_player.streak + 1;
    v_points := case when v_room.mode = 'streak' then v_next_streak else 1 end;
    update public.room_players set score = score + v_points, streak = v_next_streak where id = v_player.id;
    update public.game_rooms set flipped_indices = flipped_indices || p_card_index, matched_pair_ids = matched_pair_ids || v_second_match,
      moves = moves + 1, turn_state = 'resolving', last_flip_was_match = true where id = p_room_id;
    insert into public.room_events(room_id, user_id, event_type, message, payload) values
      (p_room_id, auth.uid(), 'match', public.player_name(auth.uid()) || ' found a match!', jsonb_build_object('pair_id', v_second_match, 'points', v_points));
    if cardinality(v_room.matched_pair_ids) + 1 = v_room.pair_count then perform public.finish_room(p_room_id); end if;
  else
    update public.game_rooms set flipped_indices = flipped_indices || p_card_index, moves = moves + 1,
      turn_state = 'resolving', last_flip_was_match = false where id = p_room_id;
    update public.room_players set streak = 0 where id = v_player.id;
    insert into public.room_events(room_id, user_id, event_type, message) values(p_room_id, auth.uid(), 'miss', public.player_name(auth.uid()) || ' missed. Next player!');
  end if;
end;
$$;

create or replace function public.resolve_game_turn(p_room_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_room public.game_rooms%rowtype; v_next_seat integer; v_new_lives integer;
begin
  select * into v_room from public.game_rooms where id = p_room_id for update;
  if not public.is_room_member(p_room_id) then raise exception 'You are not in this room.'; end if;
  if v_room.status <> 'playing' or v_room.turn_state <> 'resolving' then return; end if;
  if v_room.last_flip_was_match then
    update public.game_rooms set flipped_indices = '{}', turn_state = 'ready', last_flip_was_match = null where id = p_room_id;
    return;
  end if;
  v_new_lives := v_room.lives - case when v_room.mode = 'last-chance' then 1 else 0 end;
  if v_room.mode = 'last-chance' and v_new_lives <= 0 then
    update public.game_rooms set flipped_indices = '{}', lives = 0, turn_state = 'ready', last_flip_was_match = null where id = p_room_id;
    perform public.finish_room(p_room_id); return;
  end if;
  select min(seat_index) into v_next_seat from public.room_players where room_id = p_room_id and seat_index > v_room.current_player_index;
  if v_next_seat is null then select min(seat_index) into v_next_seat from public.room_players where room_id = p_room_id; end if;
  update public.game_rooms set flipped_indices = '{}', current_player_index = v_next_seat, lives = v_new_lives,
    turn_state = 'ready', last_flip_was_match = null where id = p_room_id;
end;
$$;

create or replace function public.finish_timed_out_room(p_room_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_room public.game_rooms%rowtype;
begin
  if not public.is_room_member(p_room_id) then raise exception 'You are not in this room.'; end if;
  select * into v_room from public.game_rooms where id = p_room_id for update;
  if v_room.status = 'playing' and v_room.mode = 'clock' and now() >= v_room.started_at + make_interval(secs => v_room.time_limit_seconds) then
    perform public.finish_room(p_room_id);
  end if;
end;
$$;

create or replace function public.leave_game_room(p_room_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_room public.game_rooms%rowtype; v_next_host uuid;
begin
  select * into v_room from public.game_rooms where id = p_room_id for update;
  if not public.is_room_member(p_room_id) then return; end if;
  if v_room.status = 'playing' then raise exception 'You cannot leave after the game has started.'; end if;
  delete from public.room_players where room_id = p_room_id and user_id = auth.uid();
  insert into public.room_events(room_id, user_id, event_type, message) values(p_room_id, auth.uid(), 'left', public.player_name(auth.uid()) || ' left the room.');
  if not exists(select 1 from public.room_players where room_id = p_room_id) then delete from public.game_rooms where id = p_room_id;
  elsif v_room.host_id = auth.uid() then
    select user_id into v_next_host from public.room_players where room_id = p_room_id order by seat_index limit 1;
    update public.game_rooms set host_id = v_next_host where id = p_room_id;
  end if;
end;
$$;

alter table public.profiles enable row level security;
alter table public.game_rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.room_events enable row level security;
alter table public.leaderboard_entries enable row level security;

drop policy if exists "Authenticated users can view profiles" on public.profiles;
create policy "Authenticated users can view profiles" on public.profiles for select to authenticated using (true);
drop policy if exists "Public users can view profile pictures" on public.profiles;
create policy "Public users can view profile pictures" on public.profiles for select to anon using (true);
drop policy if exists "Users update their own profile" on public.profiles;
create policy "Users update their own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists "Avatar images are public" on storage.objects;
create policy "Avatar images are public" on storage.objects for select to public using (bucket_id = 'avatars');
drop policy if exists "Users upload their own avatar" on storage.objects;
create policy "Users upload their own avatar" on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users update their own avatar" on storage.objects;
create policy "Users update their own avatar" on storage.objects for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Members view their rooms" on public.game_rooms;
create policy "Members view their rooms" on public.game_rooms for select to authenticated using (public.is_room_member(id));
drop policy if exists "Members view room players" on public.room_players;
create policy "Members view room players" on public.room_players for select to authenticated using (public.is_room_member(room_id));
drop policy if exists "Members view room events" on public.room_events;
create policy "Members view room events" on public.room_events for select to authenticated using (public.is_room_member(room_id));

revoke all on public.game_rooms, public.room_players, public.room_events from anon, authenticated;
grant select on public.game_rooms, public.room_players, public.room_events to authenticated;
grant select, update(display_name, avatar_url) on public.profiles to authenticated;
grant select (id, display_name, avatar_url) on public.profiles to anon;
grant usage, select on sequence public.room_events_id_seq to authenticated;

revoke all on function public.finish_room(uuid) from public, anon, authenticated;
revoke all on function public.create_game_room(text, integer, integer, text[]), public.join_game_room(text),
  public.set_player_ready(uuid, boolean), public.start_game_room(uuid), public.flip_game_card(uuid, integer),
  public.resolve_game_turn(uuid), public.finish_timed_out_room(uuid), public.leave_game_room(uuid) from public, anon;
grant execute on function public.create_game_room(text, integer, integer, text[]), public.join_game_room(text),
  public.set_player_ready(uuid, boolean), public.start_game_room(uuid), public.flip_game_card(uuid, integer),
  public.resolve_game_turn(uuid), public.finish_timed_out_room(uuid), public.leave_game_room(uuid) to authenticated;
grant execute on function public.record_local_game(boolean) to authenticated;
revoke all on public.leaderboard_entries from anon, authenticated;
revoke all on function public.record_local_leaderboard(text, integer, integer, integer, integer) from public, anon;
grant execute on function public.record_local_leaderboard(text, integer, integer, integer, integer) to authenticated;
revoke all on function public.get_mode_leaderboard(text) from public;
grant execute on function public.get_mode_leaderboard(text) to anon, authenticated;

do $$
begin
  if not exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'game_rooms') then alter publication supabase_realtime add table public.game_rooms; end if;
  if not exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'room_players') then alter publication supabase_realtime add table public.room_players; end if;
  if not exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'room_events') then alter publication supabase_realtime add table public.room_events; end if;
end $$;
