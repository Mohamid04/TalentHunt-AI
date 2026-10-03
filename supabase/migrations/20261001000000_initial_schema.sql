create extension if not exists pgcrypto;

create type public.user_role as enum ('candidate', 'admin');
create type public.application_status as enum ('Saved', 'Applied', 'Shortlisted', 'Interview', 'Selected', 'Rejected');
create type public.notification_kind as enum ('match', 'follow-up', 'interview', 'roadmap', 'resume');

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role public.user_role not null default 'candidate',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references public.users(id) on delete cascade,
  full_name text not null default '',
  target_role text not null default '',
  location text not null default '',
  summary text not null default '',
  preferred_workplace text,
  preferred_employment_type text,
  minimum_salary integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  file_name text not null,
  source_type text not null check (source_type in ('upload', 'paste')),
  storage_path text,
  extracted_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.resume_analysis (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  source text not null check (source in ('local', 'ai')),
  analysis jsonb not null default '{}'::jsonb,
  ats_score integer check (ats_score between 0 and 100),
  created_at timestamptz not null default now()
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'other',
  created_at timestamptz not null default now()
);

create unique index skills_name_lower_idx on public.skills (lower(name));

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  website text,
  description text,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  created_by uuid references public.users(id) on delete set null,
  title text not null,
  description text not null default '',
  location text not null default '',
  workplace text,
  employment_type text,
  experience_level text,
  salary_min integer,
  salary_max integer,
  apply_url text,
  category text,
  source_name text,
  verified boolean not null default false,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.job_skills (
  job_id uuid not null references public.jobs(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  required boolean not null default true,
  primary key (job_id, skill_id)
);

create table public.job_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  match_score numeric(5,2) check (match_score between 0 and 100),
  factors jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, job_id)
);

create table public.saved_jobs (
  user_id uuid not null references public.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  category text not null default 'Wishlist',
  favorite boolean not null default true,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, job_id)
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  company_name text not null default '',
  job_title text not null default '',
  job_url text not null default '',
  status public.application_status not null default 'Saved',
  application_date date,
  interview_date date,
  follow_up_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.application_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

create table public.career_roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  target_job_id uuid references public.jobs(id) on delete set null,
  title text not null,
  phases jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.roadmap_progress (
  roadmap_id uuid not null references public.career_roadmaps(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  phase_key text not null,
  completed boolean not null default false,
  completed_at timestamptz,
  primary key (roadmap_id, phase_key)
);

create table public.interview_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete cascade,
  category text not null,
  question text not null,
  source text not null default 'ai',
  created_at timestamptz not null default now()
);

create table public.mock_interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  status text not null default 'in_progress',
  transcript jsonb not null default '[]'::jsonb,
  feedback jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cover_letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  kind public.notification_kind not null,
  title text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index resumes_user_id_idx on public.resumes(user_id, created_at desc);
create index resume_analysis_user_id_idx on public.resume_analysis(user_id, created_at desc);
create index jobs_company_id_idx on public.jobs(company_id);
create index jobs_category_idx on public.jobs(category);
create index jobs_published_verified_idx on public.jobs(published, verified, created_at desc);
create index job_matches_user_id_idx on public.job_matches(user_id, match_score desc);
create index saved_jobs_user_category_idx on public.saved_jobs(user_id, category, updated_at desc);
create index applications_user_status_idx on public.applications(user_id, status, updated_at desc);
create index application_notes_user_id_idx on public.application_notes(user_id, created_at desc);
create index roadmaps_user_id_idx on public.career_roadmaps(user_id, updated_at desc);
create index interview_questions_job_category_idx on public.interview_questions(job_id, category);
create index mock_interviews_user_id_idx on public.mock_interviews(user_id, updated_at desc);
create index cover_letters_user_id_idx on public.cover_letters(user_id, updated_at desc);
create index notifications_user_read_idx on public.notifications(user_id, read_at, created_at desc);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.users where id = auth.uid() and role = 'admin');
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email) values (new.id, coalesce(new.email, '')) on conflict (id) do update set email = excluded.email, updated_at = now();
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', '')) on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

do $$
declare table_name text;
begin
  foreach table_name in array array['users','profiles','resumes','resume_analysis','skills','companies','jobs','job_skills','job_matches','saved_jobs','applications','application_notes','career_roadmaps','roadmap_progress','interview_questions','mock_interviews','cover_letters','notifications'] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

create trigger users_touch_updated_at before update on public.users for each row execute procedure public.touch_updated_at();
create trigger profiles_touch_updated_at before update on public.profiles for each row execute procedure public.touch_updated_at();
create trigger resumes_touch_updated_at before update on public.resumes for each row execute procedure public.touch_updated_at();
create trigger companies_touch_updated_at before update on public.companies for each row execute procedure public.touch_updated_at();
create trigger jobs_touch_updated_at before update on public.jobs for each row execute procedure public.touch_updated_at();
create trigger saved_jobs_touch_updated_at before update on public.saved_jobs for each row execute procedure public.touch_updated_at();
create trigger applications_touch_updated_at before update on public.applications for each row execute procedure public.touch_updated_at();
create trigger career_roadmaps_touch_updated_at before update on public.career_roadmaps for each row execute procedure public.touch_updated_at();
create trigger mock_interviews_touch_updated_at before update on public.mock_interviews for each row execute procedure public.touch_updated_at();
create trigger cover_letters_touch_updated_at before update on public.cover_letters for each row execute procedure public.touch_updated_at();

create policy users_select_own on public.users for select using (id = auth.uid() or public.is_admin());
create policy profiles_own on public.profiles for all using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
create policy users_admin_update on public.users for update using (public.is_admin()) with check (public.is_admin());

create policy resumes_own on public.resumes for all using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy resume_analysis_own on public.resume_analysis for all using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy skills_read on public.skills for select to authenticated using (true);
create policy skills_admin_write on public.skills for all using (public.is_admin()) with check (public.is_admin());
create policy companies_read on public.companies for select to authenticated using (verified or public.is_admin());
create policy companies_admin_write on public.companies for all using (public.is_admin()) with check (public.is_admin());
create policy jobs_read on public.jobs for select to authenticated using ((published and verified) or public.is_admin() or created_by = auth.uid());
create policy jobs_admin_write on public.jobs for all using (public.is_admin() or created_by = auth.uid()) with check (public.is_admin() or created_by = auth.uid());
create policy job_skills_read on public.job_skills for select to authenticated using (true);
create policy job_skills_admin_write on public.job_skills for all using (public.is_admin()) with check (public.is_admin());

create policy job_matches_own on public.job_matches for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy saved_jobs_own on public.saved_jobs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy applications_own on public.applications for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy application_notes_own on public.application_notes for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy roadmaps_own on public.career_roadmaps for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy roadmap_progress_own on public.roadmap_progress for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy interview_questions_read on public.interview_questions for select using (user_id = auth.uid() or user_id is null or public.is_admin());
create policy interview_questions_own_write on public.interview_questions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy mock_interviews_own on public.mock_interviews for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy cover_letters_own on public.cover_letters for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_own on public.notifications for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace view public.admin_job_reports with (security_invoker = true) as
select j.id, j.title, j.company_id, j.verified, j.created_at,
       count(*) over (partition by lower(j.title), j.company_id) as duplicate_count
from public.jobs j
where public.is_admin();
