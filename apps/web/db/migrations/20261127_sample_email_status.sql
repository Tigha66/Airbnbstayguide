-- Additive migration. Preserve enquiries and record transactional mail outcomes.
ALTER TABLE property_walkthrough_enquiries
  ADD COLUMN IF NOT EXISTS customer_email_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS internal_email_status text NOT NULL DEFAULT 'pending';
