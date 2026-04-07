import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";

// PUT - editează o categorie
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { name, color, icon, description } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "Numele este obligatoriu" }, { status: 400 });
    }

    const [category] = await db
      .update(schema.categories)
      .set({ name, color, icon, description, updatedAt: new Date() })
      .where(and(
        eq(schema.categories.id, id),
        eq(schema.categories.userId, authUser.id)
      ))
      .returning();

    if (!category) {
      return NextResponse.json({ error: "Categoria nu a fost găsită" }, { status: 404 });
    }

    return NextResponse.json({ category });
  } catch (error) {
    console.error("[CATEGORIES_PUT] Error:", error);
    return NextResponse.json({ error: "Eroare internă server" }, { status: 500 });
  }
}

// DELETE - șterge o categorie (doar cele non-system)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verifică că nu e categorie de sistem
    const existing = await db
      .select()
      .from(schema.categories)
      .where(and(
        eq(schema.categories.id, id),
        eq(schema.categories.userId, authUser.id)
      ))
      .limit(1);

    if (!existing[0]) {
      return NextResponse.json({ error: "Categoria nu a fost găsită" }, { status: 404 });
    }

    if (existing[0].isSystemCategory) {
      return NextResponse.json({ error: "Categoriile predefinite nu pot fi șterse" }, { status: 403 });
    }

    await db
      .delete(schema.categories)
      .where(and(
        eq(schema.categories.id, id),
        eq(schema.categories.userId, authUser.id)
      ));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CATEGORIES_DELETE] Error:", error);
    return NextResponse.json({ error: "Eroare internă server" }, { status: 500 });
  }
}
