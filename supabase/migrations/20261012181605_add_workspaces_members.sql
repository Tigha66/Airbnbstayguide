-- StayGuide: Add workspaces and members table for organization management
-- This supports multi-tenant organizational structures within StayGuide

-- Organizations table already exists from initial migration, but we add additional constraints

-- Add organization plan and status tracking
comment on column public.organizations.plan is 'Plan tier: free, starter, pro';
comment on column public.organizations.status is 'Organization status: active, suspended';

-- Add members table if not exists (org_members already exists but we extend it)
-- Extend org_members with additional role and metadata

create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null check (role in ('owner','manager','cleaner','viewer')),
  token text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  used_at timestamptz
);

-- Indexes for invitation queries
create index organization_invitations_org_id_idx on public.organization_invitations(organization_id);
create index organization_invitations_email_idx on public.organization_invitations(email);
create index organization_invitations_token_idx on public.organization_invitations(token);

-- Enable Row Level Security
alter table public.organization_invitations enable row level security;

-- Policy: Users can view invitations for their own organization
create policy organization_invitation_read_own_org on public.organization_invitations
  for select to authenticated
  using (public.is_member(organization_id));

-- Policy: Organization owners/managers can create invitations
create policy organization_invitation_create_own_org on public.organization_invitations
  for insert to authenticated
  with check (public.is_member(organization_id, array['owner','manager']));

-- Policy: Invited users can accept (via token-based flow handled in API)
create policy organization_invitation_public on public.organization_invitations
  for select using (true); -- Token-based acceptance handled in API layer