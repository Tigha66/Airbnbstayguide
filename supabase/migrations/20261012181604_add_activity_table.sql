-- StayGuide: Add activity table for logging user actions
-- This table records activities within organizations for audit and analytics

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null, -- e.g., 'create_property', 'update_section', 'invite_member'
  details jsonb not null default '{}', -- additional context specific to the action
  created_at timestamptz not null default now()
);

-- Indexes for common queries
create index activities_organization_id_idx on public.activities(organization_id);
create index activities_user_id_idx on public.activities(user_id);
create index activities_created_at_idx on public.activities(created_at);

-- Enable Row Level Security
alter table public.activities enable row level security;

-- Policy: Users can view activities from their own organization
create policy activity_read_on_own_org on public.activities
  for select to authenticated
  using (public.is_member(organization_id));

-- Policy: Users can insert activities for their own organization (if they are a member)
create policy activity_insert_on_own_org on public.activities
  for insert to authenticated
  with check (public.is_member(organization_id));

-- No update or delete policies for activities (immutable log)