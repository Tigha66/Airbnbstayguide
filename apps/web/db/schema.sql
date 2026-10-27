-- StayGuide schema for Neon Postgres. Apply explicitly after backup review.
-- Access control is enforced in the API layer: every host query is scoped by owner_id.
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text,
  image text,
  plan text NOT NULL DEFAULT 'starter',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization text NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS account_email_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purpose text NOT NULL CHECK (purpose IN ('verify_email','reset_password')),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS account_email_tokens_email_idx ON account_email_tokens(email, purpose, expires_at);
CREATE TABLE IF NOT EXISTS properties (
  id text PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'published',
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS properties_owner_idx ON properties(owner_id);
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id text NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  thread_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('guest','assistant','host')),
  content text NOT NULL,
  language text NOT NULL DEFAULT 'en',
  citations jsonb NOT NULL DEFAULT '[]',
  escalated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chat_messages_thread_idx ON chat_messages(thread_id, created_at);
CREATE INDEX IF NOT EXISTS chat_messages_property_idx ON chat_messages(property_id, created_at);
CREATE TABLE IF NOT EXISTS extra_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id text NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  extra_id text NOT NULL,
  extra_name text NOT NULL,
  price integer NOT NULL,
  guest_name text NOT NULL,
  guest_contact text NOT NULL,
  note text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','declined','paid')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS extra_requests_property_idx ON extra_requests(property_id, created_at);
CREATE TABLE IF NOT EXISTS guide_views (
  property_id text NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  day date NOT NULL,
  views integer NOT NULL DEFAULT 0,
  PRIMARY KEY (property_id, day)
);
CREATE TABLE IF NOT EXISTS usage_counters (
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month text NOT NULL,
  messages integer NOT NULL DEFAULT 0,
  PRIMARY KEY (owner_id, month)
);
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  count integer NOT NULL
);
CREATE TABLE IF NOT EXISTS email_login_codes (
  email text PRIMARY KEY,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Billing (Stripe subscriptions) and payouts (Stripe Connect Express)
ALTER TABLE users ALTER COLUMN plan SET DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_account_id text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS payouts_ready boolean NOT NULL DEFAULT false;
-- Paid plans only come from an active Stripe subscription
-- (Hotel & Multi-Unit accounts are activated by the owner without a Stripe subscription, so they're kept.)
-- Extras paid through Stripe Checkout
ALTER TABLE extra_requests ADD COLUMN IF NOT EXISTS checkout_session_id text;
ALTER TABLE extra_requests ADD COLUMN IF NOT EXISTS payment_intent_id text;
ALTER TABLE extra_requests DROP CONSTRAINT IF EXISTS extra_requests_status_check;
ALTER TABLE extra_requests ADD CONSTRAINT extra_requests_status_check CHECK (status IN ('awaiting_payment','pending','approved','declined','paid','refunded','expired'));
CREATE UNIQUE INDEX IF NOT EXISTS extra_requests_checkout_idx ON extra_requests(checkout_session_id);
-- Insertion order for chat messages (a guest question and its answer can share a timestamp)
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS seq bigserial;
-- AI translations of guide content for guests, reused until the host edits the guide
CREATE TABLE IF NOT EXISTS guide_translations (
  property_key text NOT NULL,
  language text NOT NULL,
  source_hash text NOT NULL,
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (property_key, language)
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_event_created bigint NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS users_stripe_customer_idx ON users(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS stripe_webhook_events (id text PRIMARY KEY, event_type text NOT NULL, created bigint NOT NULL, processed_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS billing_alerts (event_id text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, event_type text NOT NULL, object_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz);

-- Manager-plan portfolio inbox triage. No outbound guest messages are sent by these rules.
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
