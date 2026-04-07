import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

// GET - obține toate băncile userului
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const banks = await db
      .select()
      .from(schema.banks)
      .where(eq(schema.banks.userId, authUser.id));

    return NextResponse.json({ banks });
  } catch (error) {
    console.error("[BANKS_GET] Error:", error);
    return NextResponse.json({ error: "Eroare internă server" }, { status: 500 });
  }
}

// POST - adaugă o bancă nouă
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, color } = await request.json();
    if (!name) {
      return NextResponse.json({ error: "Numele băncii este obligatoriu" }, { status: 400 });
    }

    const [bank] = await db
      .insert(schema.banks)
      .values({
        id: createId(),
        userId: authUser.id,
        name,
        color: color || "#14b8a6",
      })
      .returning();

    return NextResponse.json({ bank }, { status: 201 });
  } catch (error) {
    console.error("[BANKS_POST] Error:", error);
    return NextResponse.json({ error: "Eroare internă server" }, { status: 500 });
  }
}
