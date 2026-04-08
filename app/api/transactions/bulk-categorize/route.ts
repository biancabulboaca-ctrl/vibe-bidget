import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, schema } from "@/lib/db";
import { eq, and, inArray } from "drizzle-orm";

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { ids, categoryId } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Lista de ID-uri este obligatorie" }, { status: 400 });
    }

    await db
      .update(schema.transactions)
      .set({
        categoryId: categoryId || null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.transactions.userId, authUser.id),
          inArray(schema.transactions.id, ids)
        )
      );

    return NextResponse.json({ updated: ids.length });
  } catch (error) {
    console.error("[TRANSACTIONS_BULK_CATEGORIZE] Error:", error);
    return NextResponse.json({ error: "Eroare internă server" }, { status: 500 });
  }
}
