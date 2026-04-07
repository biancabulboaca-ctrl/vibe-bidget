import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

// GET - obține toate categoriile userului
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const categories = await db
      .select()
      .from(schema.categories)
      .where(eq(schema.categories.userId, authUser.id));

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("[CATEGORIES_GET] Error:", error);
    return NextResponse.json({ error: "Eroare internă server" }, { status: 500 });
  }
}

// POST - adaugă o categorie nouă
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, type, color, icon, description } = await request.json();

    if (!name || !type) {
      return NextResponse.json({ error: "Numele și tipul sunt obligatorii" }, { status: 400 });
    }

    if (type !== "income" && type !== "expense") {
      return NextResponse.json({ error: "Tipul trebuie să fie income sau expense" }, { status: 400 });
    }

    const [category] = await db
      .insert(schema.categories)
      .values({
        id: createId(),
        userId: authUser.id,
        name,
        type,
        color: color || "#14b8a6",
        icon: icon || "📁",
        description: description || null,
        isSystemCategory: false,
      })
      .returning();

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error("[CATEGORIES_POST] Error:", error);
    return NextResponse.json({ error: "Eroare internă server" }, { status: 500 });
  }
}
