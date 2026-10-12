// Add these types to the existing shared/index.ts file (append to the end)

export interface Activity {
  id: string;
  organization_id: string;
  user_id: string;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface OrganizationInvitation {
  id: string;
  organization_id: string;
  email: string;
  role: 'owner' | 'manager' | 'cleaner' | 'viewer';
  token: string;
  expires_at: string;
  created_at: string;
  used_at: string | null;
}

export interface Organization {
  id: string;
  name: string;
  plan: Plan;
  status: 'active' | 'suspended';
  created_by: string;
  stripe_connect_id?: string;
  custom_domain?: string;
  branding: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  organization_id: string;
  user_id: string;
  role: 'owner' | 'manager' | 'cleaner' | 'viewer';
  joined_at: string;
  left_at: string | null;
}

export interface ActivityLog {
  id: string;
  organization_id: string;
  user_id: string;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

export type OrganizationRoles = 'owner' | 'manager' | 'cleaner' | 'viewer';