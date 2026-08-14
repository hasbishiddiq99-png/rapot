-- Jalankan file ini SEKALI di database Neon Anda (lewat Neon SQL Editor
-- di dashboard, atau lewat `psql "$DATABASE_URL" -f sql/schema.sql`).

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'staff',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Data aplikasi (pengaturan, daftar santri, nilai per semester) disimpan
-- sebagai satu baris JSON per "key", dipakai bersama oleh semua staf yang
-- login -- meniru cara window.storage(shared:true) bekerja sebelumnya,
-- hanya saja sekarang beneran tersimpan permanen di Postgres.
CREATE TABLE IF NOT EXISTS app_data (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
