-- Migration 0009: Create Game Catalogues
CREATE TABLE IF NOT EXISTS public.spacecraft_component_catalog (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('structure', 'propulsion', 'fuel', 'power', 'energy', 'communication', 'instruments')),
  mass NUMERIC(8,2) NOT NULL,
  cost NUMERIC(10,2) NOT NULL,
  power_generation NUMERIC(8,2) NOT NULL DEFAULT 0,
  power_consumption NUMERIC(8,2) NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  specifications JSONB NOT NULL DEFAULT '{}'::jsonb,
  catalog_version TEXT NOT NULL DEFAULT 'v1.0.0',
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.launch_vehicle_catalog (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  payload_capacity NUMERIC(8,2) NOT NULL,
  cost NUMERIC(10,2) NOT NULL,
  reliability NUMERIC(4,3) NOT NULL,
  max_delta_v NUMERIC(8,2) NOT NULL,
  destinations TEXT[] NOT NULL DEFAULT '{}'::text[],
  description TEXT NOT NULL,
  catalog_version TEXT NOT NULL DEFAULT 'v1.0.0',
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.mission_catalog (
  id TEXT PRIMARY KEY,
  codename TEXT NOT NULL,
  name TEXT NOT NULL,
  destination TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  duration TEXT NOT NULL,
  budget NUMERIC(12,2) NOT NULL,
  min_delta_v NUMERIC(8,2) NOT NULL,
  max_payload_mass NUMERIC(8,2) NOT NULL,
  required_instruments TEXT[] NOT NULL DEFAULT '{}'::text[],
  description TEXT NOT NULL,
  briefing TEXT NOT NULL,
  objectives JSONB NOT NULL DEFAULT '[]'::jsonb,
  requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  catalog_version TEXT NOT NULL DEFAULT 'v1.0.0',
  is_active BOOLEAN NOT NULL DEFAULT true
);

