import { query } from "./db";

/**
 * Read-only status of a separately contracted, one-property commissioning service.
 * This record never alters the host's self-service plan, AI quota or WhatsApp access.
 * Grants must only be recorded after independent payment and agreement checks.
 */
export type CommissionedGuideHosting = {
  propertyId: string;
  startsAt: string;
  endsAt: string;
  status: "active" | "cancelled" | "refunded";
  withinTerm: boolean;
};

export async function getCommissionedGuideHosting(ownerId: string, propertyId: string): Promise<CommissionedGuideHosting | null> {
  const [row] = await query<{
    propertyId: string; startsAt: string | Date; endsAt: string | Date;
    status: "active" | "cancelled" | "refunded"; withinTerm: boolean;
  }>(`SELECT h.property_id AS "propertyId", h.starts_at AS "startsAt", h.ends_at AS "endsAt",
         h.status, (h.status = 'active' AND h.starts_at <= now() AND h.ends_at > now()) AS "withinTerm"
       FROM commissioned_guide_hosting h
       JOIN properties p ON p.id = h.property_id AND p.owner_id = h.owner_id
       WHERE h.owner_id = $1 AND h.property_id = $2 LIMIT 1`, [ownerId, propertyId]);
  if (!row) return null;
  return {
    propertyId: row.propertyId,
    startsAt: new Date(row.startsAt).toISOString(),
    endsAt: new Date(row.endsAt).toISOString(),
    status: row.status,
    withinTerm: Boolean(row.withinTerm),
  };
}
