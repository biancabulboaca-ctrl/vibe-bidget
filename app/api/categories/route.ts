import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

// Categorii predefinite — create automat la primul login
const DEFAULT_CATEGORIES = [
  // Cheltuieli
  { name: "Mâncare", type: "expense", icon: "🛒", color: "#22c55e", description: "Supermarket, restaurante, livrări mâncare" },
  { name: "Transport", type: "expense", icon: "🚗", color: "#3b82f6", description: "Benzină, taxi, metrou, parcări" },
  { name: "Locuință", type: "expense", icon: "🏠", color: "#f97316", description: "Chirie, întreținere, utilități, rate" },
  { name: "Sănătate", type: "expense", icon: "💊", color: "#ef4444", description: "Medicamente, consultații, analize" },
  { name: "Divertisment", type: "expense", icon: "🎬", color: "#8b5cf6", description: "Cinema, concerte, ieșiri, hobby" },
  { name: "Subscripții", type: "expense", icon: "📱", color: "#6366f1", description: "Netflix, Spotify, software, abonamente" },
  { name: "Educație", type: "expense", icon: "🎓", color: "#f59e0b", description: "Cursuri, cărți, materiale de studiu" },
  { name: "Haine", type: "expense", icon: "👗", color: "#ec4899", description: "Îmbrăcăminte, încălțăminte, accesorii" },
  { name: "Cash", type: "expense", icon: "💵", color: "#64748b", description: "Retrageri numerar, plăți cash" },
  { name: "Taxe și Impozite", type: "expense", icon: "🏛️", color: "#6b7280", description: "Impozit pe venit, taxe auto, amenzi" },
  // Venituri
  { name: "Salariu", type: "income", icon: "💰", color: "#14b8a6", description: "Salariu lunar net" },
  { name: "Freelance", type: "income", icon: "💼", color: "#f97316", description: "Venituri din proiecte freelance" },
];

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

    // Auto-seed: dacă utilizatorul nu are nicio categorie, creăm cele predefinite
    if (categories.length === 0) {
      const values = DEFAULT_CATEGORIES.map((c) => ({
        id: createId(),
        userId: authUser.id,
        name: c.name,
        type: c.type,
        color: c.color,
        icon: c.icon,
        description: c.description,
        isSystemCategory: true,
      }));

      await db.insert(schema.categories).values(values);

      const seeded = await db
        .select()
        .from(schema.categories)
        .where(eq(schema.categories.userId, authUser.id));

      return NextResponse.json({ categories: seeded, seeded: true });
    }

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
