-- StayGuide schema for Neon Postgres. Idempotent: safe to run on every deploy.
-- Access control is enforced in the API layer: every host query is scoped by owner_id.
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text,
  image text,
  plan text NOT NULL DEFAULT 'starter',
  created_at timestamptz NOT NULL DEFAULT now()
);
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
-- Billing (Stripe subscriptions) and payouts (Stripe Connect Express)
ALTER TABLE users ALTER COLUMN plan SET DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_account_id text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS payouts_ready boolean NOT NULL DEFAULT false;
-- Paid plans only come from an active Stripe subscription
-- (Hotel & Multi-Unit accounts are activated by the owner without a Stripe subscription, so they're kept.)
UPDATE users SET plan = 'free' WHERE plan NOT IN ('free', 'hotel') AND stripe_subscription_id IS NULL AND email <> 'demo@stayguide.app';
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

-- Property limit enforced atomically: each host's properties get a slot number, and two
-- simultaneous "create" requests can't take the same slot (the loser re-checks the limit).
ALTER TABLE properties ADD COLUMN IF NOT EXISTS slot integer;
CREATE UNIQUE INDEX IF NOT EXISTS properties_owner_slot_idx ON properties(owner_id, slot);
