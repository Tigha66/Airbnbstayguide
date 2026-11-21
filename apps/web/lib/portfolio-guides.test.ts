import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { query, setQueryOverride, splitStatements } from "./db";
import { createProperty, getOwnedProperty, propertyDataSchema, updateProperty, upsertUser } from "./repo";
import { bulkReplaceHouseRules, bulkRulesSchema, inspectGuide, listGuideReadiness } from "./portfolio-guides";

let managerId: string;
let outsiderId: string;
let first: string;
let second: string;
let third: string;

const sharedRules = {
  id: "rules", type: "rules", title: "House rules", icon: "heart",
  body: "Quiet hours begin at 10 pm. No smoking is permitted.",
};
const arrival = {
  id: "arrival", type: "arrival", title: "Arrival", icon: "key",
  body: "Please follow the approved instructions shared by your host.",
};

beforeAll(async () => {
  const pg = new PGlite();
  setQueryOverride(async (sql, params) => (await pg.query(sql, params as unknown[])).rows as Record<string, unknown>[]);
  for (const statement of splitStatements(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8")))
    await pg.exec(statement);
  const manager = await upsertUser("portfolio-owner@example.com", "Manager");
  const outsider = await upsertUser("portfolio-outsider@example.com", "Other Host");
  managerId = manager.id;
  outsiderId = outsider.id;
  await query("UPDATE users SET plan = 'manager' WHERE id = $1", [managerId]);
  const currentManager = { ...manager, plan: "manager" as const };
  const a = await createProperty(currentManager, { name: "North Lodge", location: "York, UK", description: "" });
  const b = await createProperty(currentManager, { name: "South Lodge", location: "York, UK", description: "" });
  const c = await createProperty(outsider, { name: "Other Owner", location: "Bath, UK", description: "" });
  first = a.id; second = b.id; third = c.id;
  for (const p of [a, b, c]) {
    const record = propertyDataSchema.parse({ ...p, sections: [sharedRules, arrival], status: p.id === first ? "published" : "draft" });
    await updateProperty(p.id === third ? outsiderId : managerId, p.id, record);
  }
});

describe("Manager portfolio guide controls", () => {
  it("audits only owned guides, without exposing passwords", async () => {
    const rows = await listGuideReadiness(managerId);
    expect(rows).toHaveLength(2);
    expect(rows.map(row => row.id).sort()).toEqual([first, second].sort());
    expect(rows[0].hasRules).toBe(true);
    expect(rows[0].missing).toContain("Checkout instructions");
    expect(JSON.stringify(rows)).not.toContain("wifiPassword");
    expect(await listGuideReadiness(outsiderId)).toHaveLength(0);
  });

  it("allows an explicit atomic edit of selected house rules only", async () => {
    const report = await listGuideReadiness(managerId);
    const newBody = "Quiet hours start at 11 pm. No smoking or parties.";
    const result = await bulkReplaceHouseRules(managerId, {
      targets: report.map(g => ({ id: g.id, version: g.version })),
      rulesBody: newBody,
      confirm: true,
    });
    expect(result?.sort()).toEqual([first, second].sort());
    for (const id of [first, second]) {
      const guide = await getOwnedProperty(managerId, id);
      expect(guide?.sections.find(s => s.type === "rules")?.body).toBe(newBody);
      expect(guide?.sections.find(s => s.type === "arrival")?.body).toBe(arrival.body);
      expect(guide?.status).toBe(id === first ? "published" : "draft");
    }
    const other = await getOwnedProperty(outsiderId, third);
    expect(other?.sections[0].body).toBe(sharedRules.body);
  });

  it("rejects a mixed-owned batch without changing any selected guide", async () => {
    const report = await listGuideReadiness(managerId);
    const target = report.find(g => g.id === first)!;
    const outsider = await getOwnedProperty(outsiderId, third);
    expect(outsider).not.toBeNull();
    const result = await bulkReplaceHouseRules(managerId, {
      targets: [
        { id: first, version: target.version },
        { id: third, version: "not-an-owned-version" },
      ],
      rulesBody: "These rules should never be published for mixed owners.",
      confirm: true,
    });
    expect(result).toBeNull();
    const after = await getOwnedProperty(managerId, first);
    expect(after?.sections.find(s => s.type === "rules")?.body).not.toContain("never be published");
  });

  it("rejects stale versions and preserves newer host edits", async () => {
    const target = (await listGuideReadiness(managerId)).find(g => g.id === second)!;
    await query("UPDATE properties SET updated_at = updated_at + interval '60 seconds' WHERE id = $1", [second]);
    const result = await bulkReplaceHouseRules(managerId, {
      targets: [{ id: second, version: target.version }],
      rulesBody: "Stale changes must not replace newer owner instructions.",
      confirm: true,
    });
    expect(result).toBeNull();
    expect((await getOwnedProperty(managerId, second))?.sections[0].body).toContain("Quiet hours start at 11");
  });

  it("validates explicit approval, length limits and duplicate selections", () => {
    const duplicate = {
      targets: [{ id: first, version: "old-1" }, { id: first, version: "old-1" }],
      rulesBody: "Quiet hours begin at 10 pm and end at 8 am.",
      confirm: true,
    };
    expect(bulkRulesSchema.safeParse(duplicate).success).toBe(false);
    expect(bulkRulesSchema.safeParse({ ...duplicate, targets: duplicate.targets.slice(0, 1), confirm: false }).success).toBe(false);
    expect(bulkRulesSchema.safeParse({ ...duplicate, targets: duplicate.targets.slice(0, 1), rulesBody: "No" }).success).toBe(false);
  });

  it("reports missing checklist sections without printing confidential guide values", () => {
    const model = inspectGuide({
      id: first, slug: "lodge", status: "draft", version: "now",
      data: {
        id: first, slug: "lodge", name: "Short Guide", location: "London",
        status: "draft", image: "", description: "", checkIn: "", checkOut: "",
        wifi: "Private", wifiPassword: "secret-password", hostPhone: "",
        sections: [], extras: [],
      },
    });
    expect(model.missing).toContain("Arrival instructions");
    expect(JSON.stringify(model)).not.toContain("secret-password");
  });
});
