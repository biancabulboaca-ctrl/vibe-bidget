import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const currencies = await db
      .select()
      .from(schema.currencies)
      .where(eq(schema.currencies.userId, authUser.id));

    return NextResponse.json({ currencies });
  } catch (error) {
    console.error("[CURRENCIES_GET] Error:", error);
    return NextResponse.json({ error: "Eroare internă server" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { code, name, symbol } = await request.json();
    if (!code || !name || !symbol) {
      return NextResponse.json({ error: "Codul, numele și simbolul sunt obligatorii" }, { status: 400 });
    }

    // Verifică dacă valuta există deja pentru acest user
    const existing = await db
      .select()
      .from(schema.currencies)
      .where(and(eq(schema.currencies.userId, authUser.id), eq(schema.currencies.code, code.toUpperCase())))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ error: `Valuta ${code.toUpperCase()} există deja` }, { status: 409 });
    }

    const [currency] = await db
      .insert(schema.currencies)
      .values({
        id: createId(),
        userId: authUser.id,
        code: code.toUpperCase(),
        name,
        symbol,
      })
      .returning();

    return NextResponse.json({ currency }, { status: 201 });
  } catch (error) {
    console.error("[CURRENCIES_POST] Error:", error);
    return NextResponse.json({ error: "Eroare internă server" }, { status: 500 });
  }
}
