-- Additive migration. Existing orders and hosting grants remain unchanged.
CREATE TABLE IF NOT EXISTS founding_five_offer_capacity (
  id smallint PRIMARY KEY CHECK (id = 1),
  max_customers smallint NOT NULL DEFAULT 5 CHECK (max_customers = 5)
);
INSERT INTO founding_five_offer_capacity(id, max_customers) VALUES (1, 5)
  ON CONFLICT (id) DO NOTHING;
CREATE TABLE IF NOT EXISTS founding_five_offer_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id text NOT NULL,
  owner_id uuid NOT NULL,
  checkout_session_id text UNIQUE,
  payment_reference text UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'fulfilled', 'cancelled', 'refunded')),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '25 hours',
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (property_id, owner_id) REFERENCES properties(id, owner_id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS founding_five_offer_active_customer_idx
  ON founding_five_offer_reservations(owner_id)
  WHERE status IN ('pending', 'paid', 'fulfilled');
CREATE INDEX IF NOT EXISTS founding_five_offer_reservations_status_idx
  ON founding_five_offer_reservations(status, expires_at);

