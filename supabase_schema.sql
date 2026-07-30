-- ============================================================
-- Supabase Database Schema for NexJobs
-- ============================================================
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. PROFILES TABLE — User profiles (linked to auth.users)
-- ============================================================
create table profiles (
    id            uuid references auth.users on delete cascade primary key,
    name          text,
    email         text,
    avatar_url    text,
    created_at    timestamptz default now(),
    updated_at    timestamptz default now()
);

-- Only the user can see/edit their own profile
alter table profiles enable row level security;

create policy "Users can view own profile"
    on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
    on profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
    on profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
    insert into profiles (id, name, email, avatar_url)
    values (new.id, new.raw_user_meta_data->>'name', new.email, new.raw_user_meta_data->>'avatar_url');
    return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure handle_new_user();

-- ============================================================
-- 2. SEARCHES TABLE — Search history
-- ============================================================
create table searches (
    id              uuid default uuid_generate_v4() primary key,
    user_id         uuid references auth.users on delete cascade not null,
    skills          text[] default '{}',
    location        text default '',
    categories      text[] default '{}',
    experience_level text default 'all',
    results_count   int default 0,
    created_at      timestamptz default now()
);

alter table searches enable row level security;

create policy "Users can view own searches"
    on searches for select using (auth.uid() = user_id);

create policy "Users can insert own searches"
    on searches for insert with check (auth.uid() = user_id);

create policy "Users can delete own searches"
    on searches for delete using (auth.uid() = user_id);

-- Index for fast queries
create index idx_searches_user_id on searches (user_id);
create index idx_searches_created_at on searches (created_at desc);

-- ============================================================
-- 3. SAVED_JOBS TABLE — Bookmarked jobs
-- ============================================================
create table saved_jobs (
    id              uuid default uuid_generate_v4() primary key,
    user_id         uuid references auth.users on delete cascade not null,
    title           text not null,
    company         text default '',
    location        text default '',
    url             text default '',
    portal          text default '',
    match_score     numeric(5,2) default 0,
    description     text default '',
    saved_at        timestamptz default now()
);

alter table saved_jobs enable row level security;

create policy "Users can view own saved jobs"
    on saved_jobs for select using (auth.uid() = user_id);

create policy "Users can insert own saved jobs"
    on saved_jobs for insert with check (auth.uid() = user_id);

create policy "Users can delete own saved jobs"
    on saved_jobs for delete using (auth.uid() = user_id);

create policy "Users can update own saved jobs"
    on saved_jobs for update using (auth.uid() = user_id);

-- Index for fast queries
create index idx_saved_jobs_user_id on saved_jobs (user_id);
create index idx_saved_jobs_saved_at on saved_jobs (saved_at desc);

-- ============================================================
-- 4. RESUMES TABLE — Resume metadata
-- ============================================================
create table resumes (
    id              uuid default uuid_generate_v4() primary key,
    user_id         uuid references auth.users on delete cascade not null,
    filename        text not null,
    file_size       bigint default 0,
    parsed_data     jsonb default '{}',
    uploaded_at     timestamptz default now()
);

alter table resumes enable row level security;

create policy "Users can view own resumes"
    on resumes for select using (auth.uid() = user_id);

create policy "Users can insert own resumes"
    on resumes for insert with check (auth.uid() = user_id);

create policy "Users can update own resumes"
    on resumes for update using (auth.uid() = user_id);

create policy "Users can delete own resumes"
    on resumes for delete using (auth.uid() = user_id);

create index idx_resumes_user_id on resumes (user_id);
create index idx_resumes_uploaded_at on resumes (uploaded_at desc);

-- ============================================================
-- 5. NOTIFICATIONS TABLE — Optional: job alerts
-- ============================================================
create table notifications (
    id              uuid default uuid_generate_v4() primary key,
    user_id         uuid references auth.users on delete cascade not null,
    title           text not null,
    message         text default '',
    url             text default '',
    read            boolean default false,
    created_at      timestamptz default now()
);

alter table notifications enable row level security;

create policy "Users can view own notifications"
    on notifications for select using (auth.uid() = user_id);

create policy "Users can update own notifications"
    on notifications for update using (auth.uid() = user_id);

create policy "Users can delete own notifications"
    on notifications for delete using (auth.uid() = user_id);

create index idx_notifications_user_id on notifications (user_id);
create index idx_notifications_created_at on notifications (created_at desc);

-- ============================================================
-- DONE! Your database is ready.
-- ============================================================
-- Next steps:
-- 1. Enable Google OAuth in Supabase:
--    Dashboard → Authentication → Providers → Google
--    Add your Google Client ID & Secret
--    Add redirect URL: https://your-app.vercel.app/auth_callback.html
--
-- 2. Copy your Supabase URL and anon key to:
--    static/supabase_client.js
--
-- 3. Deploy and test!
-- ============================================================