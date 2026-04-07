import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";

// PUT - editează o bancă
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { name, color } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "Numele băncii este obligatoriu" }, { status: 400 });
    }

    const [bank] = await db
      .update(schema.banks)
      .set({ name, color, updatedAt: new Date() })
      .where(and(eq(schema.banks.id, id), eq(schema.banks.userId, authUser.id)))
      .returning();

    if (!bank) {
      return NextResponse.json({ error: "Banca nu a fost găsită" }, { status: 404 });
    }

    return NextResponse.json({ bank });
  } catch (error) {
    console.error("[BANKS_PUT] Error:", error);
    return NextResponse.json({ error: "Eroare internă server" }, { status: 500 });
  }
}

// DELETE - șterge o bancă
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await db
      .delete(schema.banks)
      .where(and(eq(schema.banks.id, id), eq(schema.banks.userId, authUser.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[BANKS_DELETE] Error:", error);
    return NextResponse.json({ error: "Eroare internă server" }, { status: 500 });
  }
}
