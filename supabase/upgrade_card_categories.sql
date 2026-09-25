-- Run once in Supabase SQL Editor when upgrading an existing Boricuir Memory database.
-- Enables selecting any combination of the four categories and derives the board size automatically.

alter table public.game_rooms add column if not exists categories text[];

update public.game_rooms
set categories = case coalesce(category, 'all')
  when 'general' then array['general']::text[]
  when 'puerto-rico' then array['puerto-rico']::text[]
  when 'sexual-health' then array['sexual-health']::text[]
  when 'identities' then array['identities']::text[]
  else array['general','puerto-rico','sexual-health','identities']::text[]
end
where categories is null;

alter table public.game_rooms alter column categories
  set default array['general','puerto-rico','sexual-health','identities']::text[];
alter table public.game_rooms alter column categories set not null;
alter table public.game_rooms drop constraint if exists game_rooms_categories_check;
alter table public.game_rooms add constraint game_rooms_categories_check check (
  categories <@ array['general','puerto-rico','sexual-health','identities']::text[]
  and cardinality(categories) between 1 and 4
);
alter table public.game_rooms drop constraint if exists game_rooms_pair_count_check;
alter table public.game_rooms add constraint game_rooms_pair_count_check check (pair_count between 1 and 80);

drop function if exists public.create_game_room(text, integer, integer);
drop function if exists public.create_game_room(text, integer, integer, text);
drop function if exists public.create_game_room(text, integer, integer, text[]);

create function public.create_game_room(
  p_mode text,
  p_pair_count integer,
  p_max_players integer,
  p_categories text[]
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_room_id uuid;
  v_code text;
  v_selected integer[];
  v_deck integer[];
begin
  if auth.uid() is null then raise exception 'You must be signed in.'; end if;
  if p_mode not in ('classic','clock','rush','streak','last-chance') then raise exception 'Invalid game mode.'; end if;
  if p_max_players not between 2 and 4 then raise exception 'Online games require 2 to 4 players.'; end if;
  if p_categories is null or cardinality(p_categories) not between 1 and 4 then raise exception 'Choose between 1 and 4 categories.'; end if;
  if exists(select 1 from unnest(p_categories) c where c not in ('general','puerto-rico','sexual-health','identities')) then raise exception 'Invalid card category.'; end if;
  if cardinality(p_categories) <> (select count(distinct c) from unnest(p_categories) c) then raise exception 'Duplicate card categories are not allowed.'; end if;

  select array_agg(card_id) into v_selected
  from (
    select card_id from generate_series(1,80) as cards(card_id)
    where ('general' = any(p_categories) and card_id between 1 and 33)
       or ('puerto-rico' = any(p_categories) and card_id between 34 and 54)
       or ('sexual-health' = any(p_categories) and card_id between 55 and 67)
       or ('identities' = any(p_categories) and card_id between 68 and 80)
    order by random()
  ) selected;

  if cardinality(v_selected) <> p_pair_count then
    raise exception 'The board size must match the selected categories.';
  end if;

  select array_agg(card_id) into v_deck
  from (select card_id from unnest(v_selected || v_selected) as cards(card_id) order by random()) shuffled;

  loop
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text || auth.uid()::text), 1, 6));
    exit when not exists(select 1 from public.game_rooms where code = v_code);
  end loop;

  insert into public.game_rooms(code, host_id, mode, categories, pair_count, max_players, deck, time_limit_seconds)
  values(v_code, auth.uid(), p_mode, p_categories, p_pair_count, p_max_players, v_deck, public.calculate_time_limit(p_pair_count))
  returning id into v_room_id;
  insert into public.room_players(room_id, user_id, seat_index, is_ready)
  values(v_room_id, auth.uid(), 0, true);
  insert into public.room_events(room_id, user_id, event_type, message)
  values(v_room_id, auth.uid(), 'joined', public.player_name(auth.uid()) || ' created the room.');
  return v_room_id;
end;
$$;

revoke all on function public.create_game_room(text, integer, integer, text[]) from public, anon;
grant execute on function public.create_game_room(text, integer, integer, text[]) to authenticated;
