import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

// GET - listează keyword-urile userului
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const keywords = await db
      .select({
        id: schema.userKeywords.id,
        keyword: schema.userKeywords.keyword,
        categoryId: schema.userKeywords.categoryId,
        categoryName: schema.categories.name,
        categoryIcon: schema.categories.icon,
      })
      .from(schema.userKeywords)
      .leftJoin(schema.categories, eq(schema.userKeywords.categoryId, schema.categories.id))
      .where(eq(schema.userKeywords.userId, authUser.id));

    return NextResponse.json({ keywords });
  } catch (error) {
    console.error("[KEYWORDS_GET] Error:", error);
    return NextResponse.json({ error: "Eroare internă server" }, { status: 500 });
  }
}

// POST - salvează un keyword nou
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { keyword, categoryId } = await request.json();

    if (!keyword || !categoryId) {
      return NextResponse.json({ error: "Keyword-ul și categoria sunt obligatorii" }, { status: 400 });
    }

    const normalizedKeyword = keyword.toLowerCase().trim();

    // Verificăm dacă keyword-ul există deja pentru acest user
    const existing = await db
      .select({ id: schema.userKeywords.id })
      .from(schema.userKeywords)
      .where(
        and(
          eq(schema.userKeywords.userId, authUser.id),
          eq(schema.userKeywords.keyword, normalizedKeyword)
        )
      );

    if (existing.length > 0) {
      return NextResponse.json({ error: "Acest keyword există deja" }, { status: 409 });
    }

    const [userKeyword] = await db
      .insert(schema.userKeywords)
      .values({
        id: createId(),
        userId: authUser.id,
        keyword: normalizedKeyword,
        categoryId,
      })
      .returning();

    return NextResponse.json({ keyword: userKeyword }, { status: 201 });
  } catch (error) {
    console.error("[KEYWORDS_POST] Error:", error);
    return NextResponse.json({ error: "Eroare internă server" }, { status: 500 });
  }
}

// DELETE - șterge un keyword
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "ID-ul este obligatoriu" }, { status: 400 });

    await db
      .delete(schema.userKeywords)
      .where(and(eq(schema.userKeywords.id, id), eq(schema.userKeywords.userId, authUser.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[KEYWORDS_DELETE] Error:", error);
    return NextResponse.json({ error: "Eroare internă server" }, { status: 500 });
  }
}
