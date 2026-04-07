import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, schema } from "@/lib/db";
import { eq, and, gte, lte, ilike, desc, isNull } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const bankId = searchParams.get("bankId") || "";
    const categoryId = searchParams.get("categoryId") || "";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";
    const uncategorized = searchParams.get("uncategorized") === "true";

    const conditions = [eq(schema.transactions.userId, authUser.id)];

    if (dateFrom) conditions.push(gte(schema.transactions.date, dateFrom));
    if (dateTo) conditions.push(lte(schema.transactions.date, dateTo));
    if (bankId) conditions.push(eq(schema.transactions.bankId, bankId));
    if (uncategorized) conditions.push(isNull(schema.transactions.categoryId));
    else if (categoryId) conditions.push(eq(schema.transactions.categoryId, categoryId));
    if (search) conditions.push(ilike(schema.transactions.description, `%${search}%`));

    const transactions = await db
      .select({
        id: schema.transactions.id,
        date: schema.transactions.date,
        description: schema.transactions.description,
        amount: schema.transactions.amount,
        currency: schema.transactions.currency,
        bankId: schema.transactions.bankId,
        categoryId: schema.transactions.categoryId,
        bankName: schema.banks.name,
        bankColor: schema.banks.color,
        categoryName: schema.categories.name,
        categoryIcon: schema.categories.icon,
        categoryColor: schema.categories.color,
      })
      .from(schema.transactions)
      .leftJoin(schema.banks, eq(schema.transactions.bankId, schema.banks.id))
      .leftJoin(schema.categories, eq(schema.transactions.categoryId, schema.categories.id))
      .where(and(...conditions))
      .orderBy(desc(schema.transactions.date));

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error("[TRANSACTIONS_GET] Error:", error);
    return NextResponse.json({ error: "Eroare internă server" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { date, description, amount, currency, bankId, categoryId } = await request.json();

    if (!date || !description || amount === undefined) {
      return NextResponse.json({ error: "Data, descrierea și suma sunt obligatorii" }, { status: 400 });
    }

    const [transaction] = await db
      .insert(schema.transactions)
      .values({
        id: createId(),
        userId: authUser.id,
        date,
        description,
        amount,
        currency: currency || "RON",
        bankId: bankId || null,
        categoryId: categoryId || null,
      })
      .returning();

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    console.error("[TRANSACTIONS_POST] Error:", error);
    return NextResponse.json({ error: "Eroare internă server" }, { status: 500 });
  }
}
