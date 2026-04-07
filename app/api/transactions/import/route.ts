import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, schema } from "@/lib/db";
import { eq, and, gte, lte } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { autoCategorize } from "@/lib/auto-categorization";

interface ImportTransaction {
  date: string;
  description: string;
  amount: number;
  currency?: string;
  bankId?: string;
  type?: "debit" | "credit";
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { transactions } = body as { transactions: ImportTransaction[] };

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json(
        { error: "Lista de tranzacții este obligatorie și nu poate fi goală" },
        { status: 400 }
      );
    }

    // Deduplicare: calculăm intervalul de date din fișier
    const dates = transactions.map((t) => t.date).filter(Boolean).sort();
    const minDate = dates[0];
    const maxDate = dates[dates.length - 1];

    // Fetch tranzacțiile existente din același interval
    const existing = await db
      .select({
        date: schema.transactions.date,
        description: schema.transactions.description,
        amount: schema.transactions.amount,
      })
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.userId, authUser.id),
          gte(schema.transactions.date, minDate),
          lte(schema.transactions.date, maxDate)
        )
      );

    const existingKeys = new Set(
      existing.map((t) => `${t.date}|${t.description}|${t.amount}`)
    );

    const uniqueTransactions = transactions.filter(
      (t) => !existingKeys.has(`${t.date}|${t.description}|${t.amount}`)
    );

    const skipped = transactions.length - uniqueTransactions.length;

    if (uniqueTransactions.length === 0) {
      return NextResponse.json({
        message: "Toate tranzacțiile există deja — nicio tranzacție nouă importată",
        imported: 0,
        categorized: 0,
        skipped,
      });
    }

    // Fetch keyword-urile userului pentru auto-categorizare
    const userKeywords = await db
      .select({ keyword: schema.userKeywords.keyword, categoryId: schema.userKeywords.categoryId })
      .from(schema.userKeywords)
      .where(eq(schema.userKeywords.userId, authUser.id));

    // Construiește valorile pentru insert în batch
    let categorizedCount = 0;

    const values = uniqueTransactions.map((t) => {
      const categoryId = autoCategorize(t.description, userKeywords);
      if (categoryId) categorizedCount++;

      return {
        id: createId(),
        userId: authUser.id,
        date: t.date,
        description: t.description,
        amount: t.amount,
        currency: t.currency || "RON",
        bankId: t.bankId || null,
        categoryId,
      };
    });

    // Insert în batch
    await db.insert(schema.transactions).values(values);

    return NextResponse.json({
      message: `${values.length} tranzacții importate cu succes${skipped > 0 ? `, ${skipped} duplicate ignorate` : ""}`,
      imported: values.length,
      categorized: categorizedCount,
      skipped,
    }, { status: 201 });
  } catch (error) {
    console.error("[TRANSACTIONS_IMPORT] Error:", error);
    return NextResponse.json({ error: "Eroare internă server" }, { status: 500 });
  }
}
