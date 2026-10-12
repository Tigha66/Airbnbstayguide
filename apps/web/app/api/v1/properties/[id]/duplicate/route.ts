import { auth } from "@/auth";
import { db } from "@/db";
import { properties } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [original] = await db
    .select()
    .from(properties)
    .where(eq(properties.id, id))
    .limit(1);

  if (!original) {
    return Response.json({ error: "Property not found" }, { status: 404 });
  }

  if (original.userId !== session.user.id) {
    return Response.json({ error: "Not your property" }, { status: 403 });
  }

  const duplicated = {
    ...original,
    id: crypto.randomUUID(),
    slug: `${original.slug}-${crypto.randomUUID().slice(0, 6)}`,
    name: `${original.name} (Copy)`,
    status: "draft" as const,
  };

  await db.insert(properties).values(duplicated);

  return Response.json({ id: duplicated.id, slug: duplicated.slug });
}
