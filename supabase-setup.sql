-- 在 Supabase Dashboard 的 SQL Editor 貼上並執行一次。
create table if not exists public.mushrooms (
  id text primary key,
  user_name text not null check (char_length(user_name) between 1 and 40),
  mushroom text not null check (char_length(mushroom) between 1 and 60),
  power bigint not null check (power >= 0),
  start_at timestamptz not null,
  end_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- 將已清除的活動保留為歷史資料，不會永久刪除。
alter table public.mushrooms add column if not exists is_archived boolean not null default false;

-- 常用人員獨立保存；即使蘑菇紀錄被刪除，名稱仍會留在下拉清單中。
create table if not exists public.common_people (
  user_name text primary key check (char_length(user_name) between 1 and 40),
  created_at timestamptz not null default now()
);

alter table public.mushrooms enable row level security;
alter table public.common_people enable row level security;
grant select, insert, update, delete on table public.mushrooms to anon, authenticated;
grant select, insert on table public.common_people to anon, authenticated;

drop policy if exists "Public read mushrooms" on public.mushrooms;
drop policy if exists "Public insert mushrooms" on public.mushrooms;
drop policy if exists "Public update mushrooms" on public.mushrooms;
drop policy if exists "Public delete mushrooms" on public.mushrooms;
drop policy if exists "Public read common people" on public.common_people;
drop policy if exists "Public insert common people" on public.common_people;

create policy "Public read mushrooms" on public.mushrooms for select to anon, authenticated using (true);
create policy "Public insert mushrooms" on public.mushrooms for insert to anon, authenticated with check (true);
create policy "Public update mushrooms" on public.mushrooms for update to anon, authenticated using (true) with check (true);
create policy "Public delete mushrooms" on public.mushrooms for delete to anon, authenticated using (true);
create policy "Public read common people" on public.common_people for select to anon, authenticated using (true);
create policy "Public insert common people" on public.common_people for insert to anon, authenticated with check (true);

-- 將既有蘑菇紀錄的使用者加入常用人員清單，可安全重複執行。
insert into public.common_people (user_name)
select distinct user_name from public.mushrooms
on conflict (user_name) do nothing;

-- 啟用即時同步；可安全重複執行。
do $$
begin
  alter publication supabase_realtime add table public.mushrooms;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.common_people;
exception when duplicate_object then null;
end $$;
