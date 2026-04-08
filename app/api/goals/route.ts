import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const goals = await db
      .select()
      .from(schema.goals)
      .where(eq(schema.goals.userId, authUser.id))
      .orderBy(schema.goals.createdAt);

    return NextResponse.json({ goals });
  } catch (error) {
    console.error("[GOALS_GET] Error:", error);
    return NextResponse.json({ error: "Eroare internă server" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, targetAmount, currentAmount, deadline, icon, color, savingsMethod } = await request.json();

    if (!name || !targetAmount) {
      return NextResponse.json({ error: "Numele și suma țintă sunt obligatorii" }, { status: 400 });
    }

    const [goal] = await db
      .insert(schema.goals)
      .values({
        id: createId(),
        userId: authUser.id,
        name,
        targetAmount: Number(targetAmount),
        currentAmount: Number(currentAmount ?? 0),
        deadline: deadline || null,
        icon: icon || "🎯",
        color: color || "#14b8a6",
        savingsMethod: savingsMethod || null,
      })
      .returning();

    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    console.error("[GOALS_POST] Error:", error);
    return NextResponse.json({ error: "Eroare internă server" }, { status: 500 });
  }
}
