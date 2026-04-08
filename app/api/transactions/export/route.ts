import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, schema } from "@/lib/db";
import { eq, and, gte, lte, ilike, desc, isNull } from "drizzle-orm";

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
    const recurring = searchParams.get("recurring") === "true";

    const conditions = [eq(schema.transactions.userId, authUser.id)];

    if (dateFrom) conditions.push(gte(schema.transactions.date, dateFrom));
    if (dateTo) conditions.push(lte(schema.transactions.date, dateTo));
    if (bankId) conditions.push(eq(schema.transactions.bankId, bankId));
    if (recurring) conditions.push(eq(schema.transactions.isRecurring, true));
    else if (uncategorized) conditions.push(isNull(schema.transactions.categoryId));
    else if (categoryId) conditions.push(eq(schema.transactions.categoryId, categoryId));
    if (search) conditions.push(ilike(schema.transactions.description, `%${search}%`));

    const transactions = await db
      .select({
        date: schema.transactions.date,
        description: schema.transactions.description,
        amount: schema.transactions.amount,
        currency: schema.transactions.currency,
        bankName: schema.banks.name,
        categoryName: schema.categories.name,
        isRecurring: schema.transactions.isRecurring,
      })
      .from(schema.transactions)
      .leftJoin(schema.banks, eq(schema.transactions.bankId, schema.banks.id))
      .leftJoin(schema.categories, eq(schema.transactions.categoryId, schema.categories.id))
      .where(and(...conditions))
      .orderBy(desc(schema.transactions.date));

    // Construiește CSV
    const headers = ["Data", "Descriere", "Suma", "Valuta", "Banca", "Categorie", "Recurenta"];
    const rows = transactions.map((t) => [
      t.date,
      `"${(t.description || "").replace(/"/g, '""')}"`,
      t.amount,
      t.currency,
      `"${(t.bankName || "").replace(/"/g, '""')}"`,
      `"${(t.categoryName || "").replace(/"/g, '""')}"`,
      t.isRecurring ? "Da" : "Nu",
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const today = new Date().toISOString().split("T")[0];
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="tranzactii-${today}.csv"`,
      },
    });
  } catch (error) {
    console.error("[TRANSACTIONS_EXPORT] Error:", error);
    return NextResponse.json({ error: "Eroare internă server" }, { status: 500 });
  }
}
