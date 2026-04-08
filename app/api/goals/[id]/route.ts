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
    const { name, targetAmount, currentAmount, deadline, icon, color, savingsMethod } = await request.json();

    const [goal] = await db
      .update(schema.goals)
      .set({
        name,
        targetAmount: Number(targetAmount),
        currentAmount: Number(currentAmount),
        deadline: deadline || null,
        icon,
        color,
        savingsMethod: savingsMethod || null,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.goals.id, id), eq(schema.goals.userId, authUser.id)))
      .returning();

    if (!goal) return NextResponse.json({ error: "Goal negăsit" }, { status: 404 });

    return NextResponse.json({ goal });
  } catch (error) {
    console.error("[GOALS_PUT] Error:", error);
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
      .delete(schema.goals)
      .where(and(eq(schema.goals.id, id), eq(schema.goals.userId, authUser.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[GOALS_DELETE] Error:", error);
    return NextResponse.json({ error: "Eroare internă server" }, { status: 500 });
  }
}
