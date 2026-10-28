-- Applied only to stayguide_qa after a verified recovery copy and rollback rehearsal.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SELECT pg_advisory_xact_lock(20261028);
DO $$ BEGIN
  IF current_database() <> 'stayguide_qa' THEN RAISE EXCEPTION 'QA database required'; END IF;
END $$;

CREATE TABLE IF NOT EXISTS portfolio_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  keyword text NOT NULL CHECK (char_length(keyword) BETWEEN 2 AND 50),
  label text NOT NULL CHECK (char_length(label) BETWEEN 2 AND 50),
  priority text NOT NULL CHECK (priority IN ('normal', 'urgent')),
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS portfolio_rules_owner_keyword_idx ON portfolio_rules(owner_id, lower(keyword));
CREATE TABLE IF NOT EXISTS portfolio_triage (
  thread_id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id text NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  label text NOT NULL,
  priority text NOT NULL CHECK (priority IN ('normal', 'urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS portfolio_triage_owner_idx ON portfolio_triage(owner_id, updated_at DESC);

-- Manager-only human-reviewed quick replies. These are never sent automatically.
CREATE TABLE IF NOT EXISTS portfolio_reply_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 60),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS portfolio_reply_templates_owner_title_idx
  ON portfolio_reply_templates(owner_id, lower(title));

-- GuestPulse provider webhook inbox (transport metadata only). No guest PII is
-- stored here; events require authenticated provider reconciliation and
-- property ownership checks before any user can see messages or create drafts.
-- No external delivery is enabled by this table.
CREATE TABLE IF NOT EXISTS pms_webhook_events (
  event_id text PRIMARY KEY,
  provider text NOT NULL CHECK (provider = 'guesty'),
  event_type text NOT NULL CHECK (event_type IN ('reservation.messageReceived','reservation.messageSent')),
  external_reservation_id text NOT NULL,
  payload_sha256 text NOT NULL CHECK (char_length(payload_sha256) = 64),
  status text NOT NULL DEFAULT 'awaiting_reconciliation'
    CHECK (status IN ('awaiting_reconciliation','reconciled','discarded')),
  received_at timestamptz NOT NULL DEFAULT now(),
  reconciled_at timestamptz
);
CREATE INDEX IF NOT EXISTS pms_webhook_events_pending_idx
  ON pms_webhook_events(received_at) WHERE status = 'awaiting_reconciliation';

-- PMS connections are provisioned only by authorised provider onboarding.
-- Credentials are never returned by Manager APIs or stored in these tables.
CREATE TABLE IF NOT EXISTS pms_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('guesty','hospitable')),
  provider_account_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','revoked')),
  paused boolean NOT NULL DEFAULT true,
  delivery_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_account_id),
  UNIQUE(id, owner_id)
);
CREATE TABLE IF NOT EXISTS pms_property_links (
  connection_id uuid NOT NULL REFERENCES pms_connections(id) ON DELETE CASCADE,
  property_id text NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  external_property_id text NOT NULL,
  PRIMARY KEY(connection_id, property_id),
  UNIQUE(connection_id, external_property_id)
);
CREATE TABLE IF NOT EXISTS pms_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id text NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL,
  reservation_id text NOT NULL,
  conversation_id text NOT NULL,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  scheduled_at timestamptz NOT NULL,
  available_at timestamptz NOT NULL DEFAULT now(),
  time_zone text NOT NULL,
  content_hash text NOT NULL CHECK (content_hash ~ '^[a-f0-9]{64}$'),
  approved_hash text,
  approved_at timestamptz,
  idempotency_key uuid NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','sending','sent','cancelled','failed','unknown')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 3),
  lease_token uuid,
  claimed_at timestamptz,
  last_error text,
  provider_message_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(connection_id, owner_id) REFERENCES pms_connections(id, owner_id) ON DELETE CASCADE,
  UNIQUE(owner_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS pms_outbox_due_idx ON pms_outbox(scheduled_at) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS pms_outbox_owner_idx ON pms_outbox(owner_id, created_at DESC);
CREATE TABLE IF NOT EXISTS pms_delivery_audit (
  message_id uuid NOT NULL REFERENCES pms_outbox(id) ON DELETE CASCADE,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(message_id, action)
);

-- Scheduler heartbeat and crash-recoverable lease. Contains no guest content.
CREATE TABLE IF NOT EXISTS pms_scheduler_state (
  job text PRIMARY KEY CHECK (job = 'delivery'),
  lease_token uuid NOT NULL,
  lease_until timestamptz NOT NULL,
  started_at timestamptz NOT NULL,
  finished_at timestamptz,
  last_success_at timestamptz,
  status text NOT NULL CHECK (status IN ('running','ok','disabled','provider_not_connected','failed')),
  processed integer NOT NULL DEFAULT 0
);

COMMIT;
