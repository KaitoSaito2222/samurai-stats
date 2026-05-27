-- Supabase-specific roles required by GoTrue (auth) and PostgREST (rest).
-- The supabase/postgres image provides extensions but does not pre-create
-- these application-level roles via /docker-entrypoint-initdb.d.
-- This file runs before 001_initial_schema.sql (alphabetical order).

DO $$
BEGIN
  -- GoTrue connects with this role to run its own auth schema migrations.
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    CREATE ROLE supabase_auth_admin
      NOINHERIT CREATEROLE CREATEDB LOGIN NOREPLICATION
      PASSWORD 'localpassword';
  END IF;

  -- PostgREST connects as "authenticator" and switches to anon/authenticated.
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'localpassword';
  END IF;

  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
END $$;

GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role TO authenticator;

-- Allow supabase_auth_admin to create tables in public schema (GoTrue needs this).
GRANT ALL ON SCHEMA public TO supabase_auth_admin;
