import { transaction } from "./db";

export type FoundingFiveReservationResult =
  | { reserved: true; reservationId: string; activeCustomers: number; maxCustomers: number }
  | { reserved: false; reason: "duplicate" | "limit"; activeCustomers: number; maxCustomers: number };

/**
 * Serializes claims for the five Founding Five places. The singleton row lock
 * and reservation insert run in one Neon transaction, so parallel requests
 * cannot reserve the same final place.
 */
export async function reserveFoundingFiveCustomer(ownerId: string, propertyId: string): Promise<FoundingFiveReservationResult> {
  const [, , , insertedRows, [summary]] = await transaction([
    { text: "SELECT id FROM founding_five_offer_capacity WHERE id=1 FOR UPDATE" },
    { text: "UPDATE commissioned_guide_orders SET status='cancelled', updated_at=now() WHERE status='pending' AND created_at <= now() - interval '25 hours'" },
    { text: "UPDATE founding_five_offer_reservations SET status='cancelled' WHERE status='pending' AND ((checkout_session_id IS NULL AND created_at <= now() - interval '10 minutes') OR (checkout_session_id IS NOT NULL AND expires_at <= now()))" },
    { text: `
      INSERT INTO founding_five_offer_reservations (property_id, owner_id)
      SELECT $1, $2
      WHERE NOT EXISTS (
        SELECT 1 FROM commissioned_guide_orders
        WHERE owner_id=$2 AND status IN ('pending','paid','fulfilled')
      )
      AND NOT EXISTS (
        SELECT 1 FROM founding_five_offer_reservations
        WHERE owner_id=$2 AND status IN ('pending','paid','fulfilled') AND expires_at > now()
      )
      AND (
        SELECT count(*) FROM (
          SELECT owner_id FROM commissioned_guide_orders
          WHERE status IN ('paid','fulfilled')
             OR (status='pending' AND created_at > now() - interval '25 hours')
          UNION
          SELECT owner_id FROM founding_five_offer_reservations
          WHERE status IN ('paid','fulfilled')
             OR (status='pending' AND expires_at > now())
        ) active_customers
      ) < (SELECT max_customers FROM founding_five_offer_capacity WHERE id=1)
      ON CONFLICT DO NOTHING
      RETURNING id
    `, params: [propertyId, ownerId] },
    { text: `
      SELECT
        EXISTS (
          SELECT 1 FROM commissioned_guide_orders
          WHERE owner_id=$1 AND status IN ('pending','paid','fulfilled')
        ) OR EXISTS (
          SELECT 1 FROM founding_five_offer_reservations
          WHERE owner_id=$1 AND status IN ('pending','paid','fulfilled') AND expires_at > now()
        ) AS already_reserved,
        (
          SELECT count(*) FROM (
            SELECT owner_id FROM commissioned_guide_orders
            WHERE status IN ('paid','fulfilled')
               OR (status='pending' AND created_at > now() - interval '25 hours')
            UNION
            SELECT owner_id FROM founding_five_offer_reservations
            WHERE status IN ('paid','fulfilled')
               OR (status='pending' AND expires_at > now())
          ) active_customers
        )::int AS active_customers,
        (SELECT max_customers::int FROM founding_five_offer_capacity WHERE id=1) AS max_customers
    `, params: [ownerId] },
  ]);
  const activeCustomers = Number(summary?.active_customers ?? 0);
  const maxCustomers = Number(summary?.max_customers ?? 5);
  if (insertedRows?.[0]?.id) {
    return { reserved: true, reservationId: String(insertedRows[0].id), activeCustomers, maxCustomers };
  }
  return {
    reserved: false,
    reason: summary?.already_reserved ? "duplicate" : "limit",
    activeCustomers,
    maxCustomers,
  };
}
