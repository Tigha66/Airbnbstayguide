import { z } from "zod";
import type { Property } from "@stayguide/shared";
import { query } from "./db";
import { managerAccessSql } from "./manager-access";

/** A snapshot for an authenticated Manager. Never include Wi-Fi passwords, access codes or guest details. */
export type GuideReadiness = {
  id: string;
  slug: string;
  name: string;
  status: "draft" | "published";
  version: string;
  missing: string[];
  hasRules: boolean;
  rulesBody: string | null;
};

type OwnedGuideRow = {
  id: string;
  slug: string;
  status: "draft" | "published";
  data: Property;
  version: string;
};

export function inspectGuide(row: OwnedGuideRow): GuideReadiness {
  const p = row.data;
  const sections = Array.isArray(p.sections) ? p.sections : [];
  const meaningful = (type: string) =>
    sections.some(s => s.type === type && typeof s.body === "string" && s.body.trim().length >= 20);
  const rules = sections.filter(s => s.type === "rules");
  const missing: string[] = [];
  if (!meaningful("arrival")) missing.push("Arrival instructions");
  if (!meaningful("checkout")) missing.push("Checkout instructions");
  if (!meaningful("rules")) missing.push("House rules");
  if (!meaningful("parking")) missing.push("Parking or transport information");
  if (!p.checkIn?.trim() || !p.checkOut?.trim()) missing.push("Check-in/out times");
  if (!p.hostPhone?.trim()) missing.push("Host contact (optional, review privately)");
  return {
    id: row.id,
    slug: row.slug,
    name: p.name,
    status: row.status,
    version: row.version,
    missing,
    hasRules: rules.length === 1,
    rulesBody: rules.length === 1 ? rules[0].body : null,
  };
}

/** Manager-only and owner-scoped even if called without an API gate. */
export async function listGuideReadiness(ownerId: string): Promise<GuideReadiness[]> {
  const rows = await query<OwnedGuideRow>(
    `SELECT p.id, p.slug, p.status, p.data, p.updated_at::text AS version
       FROM properties p JOIN users u ON u.id = p.owner_id
       WHERE p.owner_id = $1 AND ${managerAccessSql()}
       ORDER BY p.data->>'name' LIMIT 50`, [ownerId],
  );
  return rows.map(inspectGuide);
}

export const bulkRulesSchema = z.object({
  targets: z.array(z.object({
    id: z.uuid(),
    version: z.string().min(6).max(100),
  }).strict()).min(1).max(25),
  rulesBody: z.string().trim().min(20).max(6000),
  confirm: z.literal(true),
}).strict().superRefine((value, context) => {
  const ids = value.targets.map(target => target.id);
  if (new Set(ids).size !== ids.length)
    context.addIssue({ code: "custom", message: "Select each property once", path: ["targets"] });
});

/**
 * One all-or-nothing statement. Eligible rows are locked and must match the
 * Manager, exact last-seen versions, and exactly one rules section.
 * If any selection is stale, unowned or missing a rules section, update none.
 * Other fields, status, slug and section ordering are preserved.
 */
export async function bulkReplaceHouseRules(
  ownerId: string,
  input: z.infer<typeof bulkRulesSchema>,
): Promise<string[] | null> {
  const data = bulkRulesSchema.parse(input);
  const updated = await query<{ id: string }>(
    `WITH requested AS (
       SELECT target.id, target.version
       FROM jsonb_to_recordset($2::jsonb) AS target(id text, version text)
     ),
     eligible AS MATERIALIZED (
       SELECT p.id
       FROM properties p
       JOIN requested r ON r.id = p.id
       JOIN users u ON u.id = p.owner_id
       WHERE p.owner_id = $1 AND ${managerAccessSql()}
         AND p.updated_at::text = r.version
         AND (SELECT count(*) FROM jsonb_array_elements(COALESCE(p.data->'sections','[]'::jsonb)) s
              WHERE s->>'type' = 'rules') = 1
       FOR UPDATE OF p
     )
     UPDATE properties p
       SET data = jsonb_set(p.data, '{sections}',
         (SELECT jsonb_agg(
            CASE WHEN elem->>'type' = 'rules'
              THEN jsonb_set(elem, '{body}', to_jsonb($3::text))
              ELSE elem END ORDER BY ord)
          FROM jsonb_array_elements(p.data->'sections') WITH ORDINALITY AS s(elem, ord)),
         false),
           updated_at = now()
       FROM eligible e
       WHERE p.id = e.id AND (SELECT count(*) FROM eligible) = $4
       RETURNING p.id`,
    [ownerId, JSON.stringify(data.targets), data.rulesBody, data.targets.length],
  );
  return updated.length === data.targets.length ? updated.map(row => row.id) : null;
}
