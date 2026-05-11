-- ============================================================
-- MIGRACIÓN 006: Configuración (clave–valor JSONB)
-- ============================================================

-- Una sola tabla con claves conocidas para evitar múltiples tablas
-- de una sola fila. El repositorio lee/escribe por clave (upsert).
create table if not exists settings (
  key        text        primary key,
  value      jsonb       not null,
  updated_at timestamptz not null default now()
);

-- Valores por defecto — se ignoran si ya existen
insert into settings (key, value) values
  ('cardSettings',  '{
    "delayEnabled": false,
    "debitCommission": 0,
    "creditCommission": 0,
    "reteiva": 0,
    "commissionsEnabled": false,
    "reteivaEnabled": false
  }'),
  ('companyInfo', '{
    "name": "Mi Empresa",
    "nit": "",
    "address": "",
    "phone": "",
    "email": ""
  }'),
  ('taxSettings', '{
    "ivaEnabled": true,
    "ivaPercentage": 19
  }')
on conflict (key) do nothing;
