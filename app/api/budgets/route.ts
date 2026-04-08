import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, schema } from "@/lib/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch bugete cu info categorie
    const budgets = await db
      .select({
        id: schema.budgets.id,
        amount: schema.budgets.amount,
        categoryId: schema.budgets.categoryId,
        categoryName: schema.categories.name,
        categoryIcon: schema.categories.icon,
        categoryColor: schema.categories.color,
      })
      .from(schema.budgets)
      .leftJoin(schema.categories, eq(schema.budgets.categoryId, schema.categories.id))
      .where(eq(schema.budgets.userId, authUser.id));

    // Calculează cheltuielile lunii curente per categorie
    const now = new Date();
    const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const lastDayStr = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;

    const spending = await db
      .select({
        categoryId: schema.transactions.categoryId,
        total: sql<number>`COALESCE(SUM(ABS(amount)), 0)`,
      })
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.userId, authUser.id),
          gte(schema.transactions.date, firstDay),
          lte(schema.transactions.date, lastDayStr),
          sql`amount < 0`
        )
      )
      .groupBy(schema.transactions.categoryId);

    const spendingMap = new Map(spending.map((s) => [s.categoryId, Number(s.total)]));

    const result = budgets.map((b) => ({
      ...b,
      amount: Number(b.amount),
      spent: spendingMap.get(b.categoryId) ?? 0,
      percentage: Math.round(((spendingMap.get(b.categoryId) ?? 0) / Number(b.amount)) * 100),
    }));

    return NextResponse.json({ budgets: result });
  } catch (error) {
    console.error("[BUDGETS_GET] Error:", error);
    return NextResponse.json({ error: "Eroare internă server" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { categoryId, amount } = await request.json();
    if (!categoryId || !amount) {
      return NextResponse.json({ error: "Categoria și suma sunt obligatorii" }, { status: 400 });
    }

    // Upsert — dacă există deja buget pentru categoria asta, îl actualizează
    const existing = await db
      .select({ id: schema.budgets.id })
      .from(schema.budgets)
      .where(and(eq(schema.budgets.userId, authUser.id), eq(schema.budgets.categoryId, categoryId)));

    if (existing.length > 0) {
      const [budget] = await db
        .update(schema.budgets)
        .set({ amount: Number(amount), updatedAt: new Date() })
        .where(eq(schema.budgets.id, existing[0].id))
        .returning();
      return NextResponse.json({ budget });
    }

    const [budget] = await db
      .insert(schema.budgets)
      .values({ id: createId(), userId: authUser.id, categoryId, amount: Number(amount) })
      .returning();

    return NextResponse.json({ budget }, { status: 201 });
  } catch (error) {
    console.error("[BUDGETS_POST] Error:", error);
    return NextResponse.json({ error: "Eroare internă server" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await request.json();
    await db.delete(schema.budgets).where(and(eq(schema.budgets.id, id), eq(schema.budgets.userId, authUser.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[BUDGETS_DELETE] Error:", error);
    return NextResponse.json({ error: "Eroare internă server" }, { status: 500 });
  }
}
