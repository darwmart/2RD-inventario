-- Tabla para diseños de etiquetas y tirillas POS
create table if not exists public.label_designs (
  id               text primary key,
  code             text not null default '',
  name             text not null,
  description      text,
  document_type    text not null default '',
  printer_name     text not null default '',
  label_width      text not null default '0',
  label_height     text not null default '0',
  labels_per_row   text not null default '1',
  labels_per_column text not null default '1',
  top_margin       text not null default '0',
  left_margin      text not null default '0',
  horizontal_spacing text not null default '0',
  vertical_spacing text not null default '0',
  fields           jsonb,
  is_default       boolean not null default false,
  created_at       timestamptz not null default now()
);

alter table public.label_designs enable row level security;

create policy "label_designs_auth" on public.label_designs
  for all using (auth.role() = 'authenticated');
