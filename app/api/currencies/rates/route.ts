import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

interface FrankfurterResponse {
  base: string;
  date: string;
  rates: Record<string, number>;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch valutele utilizatorului
    const currencies = await db
      .select()
      .from(schema.currencies)
      .where(eq(schema.currencies.userId, authUser.id));

    if (currencies.length === 0) {
      return NextResponse.json({ rates: {}, date: null, base: "EUR" });
    }

    // Colectăm codurile unice, eliminăm EUR (e baza)
    const codes = [...new Set(currencies.map((c) => c.code).filter((c) => c !== "EUR"))];

    if (codes.length === 0) {
      // Doar EUR — rate vs EUR este 1
      return NextResponse.json({ rates: { EUR: 1 }, date: new Date().toISOString().slice(0, 10), base: "EUR" });
    }

    const url = `https://api.frankfurter.app/latest?from=EUR&to=${codes.join(",")}`;
    const res = await fetch(url, { next: { revalidate: 3600 } }); // cache 1h
    if (!res.ok) throw new Error(`Frankfurter API error ${res.status}`);

    const data: FrankfurterResponse = await res.json();

    // Include EUR = 1 în răspuns
    const rates: Record<string, number> = { EUR: 1, ...data.rates };

    return NextResponse.json({ rates, date: data.date, base: "EUR" });
  } catch (error) {
    console.error("[CURRENCIES_RATES] Error:", error);
    return NextResponse.json({ error: "Eroare la obținerea cursurilor" }, { status: 500 });
  }
}
