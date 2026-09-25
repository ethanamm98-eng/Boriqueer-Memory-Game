-- Run once on an existing Boricuir Memory Supabase project.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = 5242880;

drop policy if exists "Avatar images are public" on storage.objects;
create policy "Avatar images are public" on storage.objects for select to public using (bucket_id = 'avatars');
drop policy if exists "Users upload their own avatar" on storage.objects;
create policy "Users upload their own avatar" on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users update their own avatar" on storage.objects;
create policy "Users update their own avatar" on storage.objects for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create or replace function public.record_local_game(p_won boolean)
returns void language sql security definer set search_path = public as $$
  update public.profiles set games_played = games_played + 1,
    games_won = games_won + case when p_won then 1 else 0 end where id = auth.uid();
$$;
revoke all on function public.record_local_game(boolean) from public, anon;
grant execute on function public.record_local_game(boolean) to authenticated;
