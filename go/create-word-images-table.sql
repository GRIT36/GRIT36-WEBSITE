create table if not exists public.word_images (
  word_list_id uuid not null references public.word_lists(id) on delete cascade,
  word_id text not null,
  image_url text not null,
  updated_at timestamptz not null default now(),
  primary key (word_list_id, word_id)
);

alter table public.word_images enable row level security;

grant select, insert, update on public.word_images to anon;

drop policy if exists "Iedereen kan afbeeldingen bekijken" on public.word_images;
drop policy if exists "Iedereen kan afbeeldingen toevoegen" on public.word_images;
drop policy if exists "Iedereen kan afbeeldingen wijzigen" on public.word_images;

create policy "Iedereen kan afbeeldingen bekijken"
on public.word_images
for select
to anon
using (true);

create policy "Iedereen kan afbeeldingen toevoegen"
on public.word_images
for insert
to anon
with check (true);

create policy "Iedereen kan afbeeldingen wijzigen"
on public.word_images
for update
to anon
using (true)
with check (true);
