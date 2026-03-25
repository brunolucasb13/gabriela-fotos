-- =========================================================
-- Supabase schema for uploads_evento (Aniversário da Gabriela)
-- =========================================================

create extension if not exists pgcrypto;

create table if not exists public.uploads_evento (
  id uuid primary key default gen_random_uuid(),
  guest_name text null,
  message text null,
  original_file_name text not null,
  storage_path text not null unique,
  file_size bigint not null check (file_size > 0 and file_size <= 15728640),
  mime_type text not null,
  abuse_fingerprint text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_uploads_evento_created_at
  on public.uploads_evento (created_at desc);

create index if not exists idx_uploads_evento_guest_name
  on public.uploads_evento (guest_name);

create index if not exists idx_uploads_evento_abuse_fingerprint_created
  on public.uploads_evento (abuse_fingerprint, created_at desc);

alter table public.uploads_evento enable row level security;

drop policy if exists "Authenticated admins can read uploads" on public.uploads_evento;
create policy "Authenticated admins can read uploads"
  on public.uploads_evento
  for select
  to authenticated
  using (true);

drop policy if exists "Authenticated admins can delete uploads" on public.uploads_evento;
create policy "Authenticated admins can delete uploads"
  on public.uploads_evento
  for delete
  to authenticated
  using (true);

-- ---------------------------------------------------------
-- Storage bucket privado para as fotos do evento
-- ---------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'uploads-evento',
  'uploads-evento',
  false,
  15728640,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif']::text[]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 15728640,
  allowed_mime_types = excluded.allowed_mime_types;

-- Leitura e exclusão para usuários autenticados (admin).
-- Upload público é feito por signed upload URL criada no backend (service role),
-- por isso não há policy anônima de insert/list.
drop policy if exists "Authenticated can read event objects" on storage.objects;
create policy "Authenticated can read event objects"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'uploads-evento');

drop policy if exists "Authenticated can delete event objects" on storage.objects;
create policy "Authenticated can delete event objects"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'uploads-evento');
