
-- 1) Tables to integrate external headless “Scraper Worker”

create table if not exists public.crawl_jobs (
  id uuid primary key default gen_random_uuid(),
  source text not null,                       -- e.g. 'disasterassist'
  start_url text not null,
  payload jsonb not null default '{}'::jsonb, -- any extra params (selectors, pagination size, etc)
  status text not null default 'queued',      -- queued | running | done | failed
  external_job_id text,                       -- job id returned by your worker
  max_pages integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crawl_results (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.crawl_jobs(id) on delete cascade,
  page_url text,
  rows jsonb not null default '[]'::jsonb,    -- array of extracted rows for this page
  created_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists idx_crawl_jobs_status on public.crawl_jobs(status);
create index if not exists idx_crawl_results_job on public.crawl_results(job_id);

-- 2) RLS: service role manages, admins can read

alter table public.crawl_jobs enable row level security;
alter table public.crawl_results enable row level security;

-- Service role can insert/update/delete crawl_jobs
create policy if not exists "Service role can write crawl_jobs"
on public.crawl_jobs
for all
to public
using ((auth.jwt() ->> 'role') = 'service_role')
with check ((auth.jwt() ->> 'role') = 'service_role');

-- Admins can read crawl_jobs
create policy if not exists "Admins can read crawl_jobs"
on public.crawl_jobs
for select
to public
using (
  (exists (
    select 1 from public.user_profiles
    where user_profiles.id = auth.uid()
      and user_profiles.user_type in ('admin','super_admin')
  ))
  or (auth.jwt() ->> 'role') = 'service_role'
);

-- Service role can insert crawl_results
create policy if not exists "Service role can insert crawl_results"
on public.crawl_results
for insert
to public
with check ((auth.jwt() ->> 'role') = 'service_role');

-- Admins can read crawl_results
create policy if not exists "Admins can read crawl_results"
on public.crawl_results
for select
to public
using (
  (exists (
    select 1 from public.user_profiles
    where user_profiles.id = auth.uid()
      and user_profiles.user_type in ('admin','super_admin')
  ))
  or (auth.jwt() ->> 'role') = 'service_role'
);

-- 3) Make upserts reliable: dedupe declarations by AGRN + LGA
-- Note: partial unique index avoids NULL AGRN collisions
create unique index if not exists uniq_disaster_agrn_lga
on public.disaster_declarations (agrn_reference, lga_code)
where agrn_reference is not null;

-- Helpful read indexes for active lookups
create index if not exists idx_disaster_active
on public.disaster_declarations (declaration_status, expiry_date);

create index if not exists idx_disaster_lga_status
on public.disaster_declarations (lga_code, declaration_status);
