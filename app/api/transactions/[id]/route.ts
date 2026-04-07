import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { date, description, amount, currency, bankId, categoryId } = await request.json();

    if (!date || !description || amount === undefined) {
      return NextResponse.json({ error: "Data, descrierea și suma sunt obligatorii" }, { status: 400 });
    }

    const [transaction] = await db
      .update(schema.transactions)
      .set({
        date,
        description,
        amount,
        currency: currency || "RON",
        bankId: bankId || null,
        categoryId: categoryId || null,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.transactions.id, id), eq(schema.transactions.userId, authUser.id)))
      .returning();

    if (!transaction) {
      return NextResponse.json({ error: "Tranzacția nu a fost găsită" }, { status: 404 });
    }

    return NextResponse.json({ transaction });
  } catch (error) {
    console.error("[TRANSACTIONS_PUT] Error:", error);
    return NextResponse.json({ error: "Eroare internă server" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    await db
      .delete(schema.transactions)
      .where(and(eq(schema.transactions.id, id), eq(schema.transactions.userId, authUser.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[TRANSACTIONS_DELETE] Error:", error);
    return NextResponse.json({ error: "Eroare internă server" }, { status: 500 });
  }
}
