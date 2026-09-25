-- Run this file if you already installed a previous Boricuir Memory schema.
-- It fixes private-room deck generation and backfills missing profiles.

alter table public.game_rooms drop constraint if exists game_rooms_pair_count_check;
alter table public.game_rooms add constraint game_rooms_pair_count_check check (pair_count in (6,12,20,40,80));

insert into public.profiles(id, display_name)
select id,
  left(case when char_length(trim(coalesce(raw_user_meta_data->>'display_name', split_part(coalesce(email, ''), '@', 1)))) >= 2
    then trim(coalesce(raw_user_meta_data->>'display_name', split_part(coalesce(email, ''), '@', 1))) else 'Player' end, 30)
from auth.users
on conflict(id) do nothing;

create or replace function public.create_game_room(p_mode text, p_pair_count integer, p_max_players integer)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_room_id uuid;
  v_code text;
  v_selected integer[];
  v_deck integer[];
begin
  if auth.uid() is null then raise exception 'You must be signed in.'; end if;
  if p_mode not in ('classic','clock','rush','streak','last-chance') then raise exception 'Invalid game mode.'; end if;
  if p_pair_count not in (6,12,20,40,80) then raise exception 'Invalid board size.'; end if;
  if p_max_players not between 2 and 4 then raise exception 'Online games require 2 to 4 players.'; end if;

  if not exists(select 1 from public.profiles where id = auth.uid()) then
    raise exception 'Your player profile is missing. Sign out and sign in again.';
  end if;

  select array_agg(card_id) into v_selected
  from (select card_id from generate_series(1,80) as cards(card_id) order by random() limit p_pair_count) selected;
  select array_agg(card_id) into v_deck
  from (select card_id from unnest(v_selected || v_selected) as cards(card_id) order by random()) shuffled;

  loop
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text || auth.uid()::text), 1, 6));
    exit when not exists(select 1 from public.game_rooms where code = v_code);
  end loop;

  insert into public.game_rooms(code, host_id, mode, pair_count, max_players, deck, time_limit_seconds)
  values(v_code, auth.uid(), p_mode, p_pair_count, p_max_players, v_deck, public.calculate_time_limit(p_pair_count))
  returning id into v_room_id;

  insert into public.room_players(room_id, user_id, seat_index, is_ready)
  values(v_room_id, auth.uid(), 0, true);

  insert into public.room_events(room_id, user_id, event_type, message)
  values(v_room_id, auth.uid(), 'joined', public.player_name(auth.uid()) || ' created the room.');

  return v_room_id;
end;
$$;

revoke all on function public.create_game_room(text, integer, integer) from public, anon;
grant execute on function public.create_game_room(text, integer, integer) to authenticated;
