import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, schema } from "@/lib/db";
import { eq, and, isNull } from "drizzle-orm";
import { autoCategorize } from "@/lib/auto-categorization";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch toate keyword-urile userului
    const keywords = await db
      .select({ keyword: schema.userKeywords.keyword, categoryId: schema.userKeywords.categoryId })
      .from(schema.userKeywords)
      .where(eq(schema.userKeywords.userId, authUser.id));

    if (keywords.length === 0) {
      return NextResponse.json({ updated: 0, message: "Nu ai keyword-uri salvate." });
    }

    // Fetch toate tranzacțiile necategorizate ale userului
    const uncategorized = await db
      .select({ id: schema.transactions.id, description: schema.transactions.description })
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.userId, authUser.id),
          isNull(schema.transactions.categoryId)
        )
      );

    let updated = 0;

    for (const tx of uncategorized) {
      const categoryId = autoCategorize(tx.description, keywords);
      if (categoryId) {
        await db
          .update(schema.transactions)
          .set({ categoryId })
          .where(eq(schema.transactions.id, tx.id));
        updated++;
      }
    }

    return NextResponse.json({ updated });
  } catch (error) {
    console.error("[RECATEGORIZE] Error:", error);
    return NextResponse.json({ error: "Eroare internă server" }, { status: 500 });
  }
}
