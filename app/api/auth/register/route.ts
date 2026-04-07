import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { db, schema } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Toate câmpurile sunt obligatorii" },
        { status: 400 }
      );
    }

    const response = NextResponse.json({ success: true });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    // 1. Creează userul în Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (error) {
      console.error("[AUTH_REGISTER] Supabase error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data.user) {
      return NextResponse.json({ error: "Eroare la crearea contului" }, { status: 400 });
    }

    // 2. Inserează în public.users direct (fără a depinde de trigger)
    await db
      .insert(schema.users)
      .values({
        id: data.user.id,
        email: email,
        name: name,
        nativeCurrency: "RON",
      })
      .onConflictDoNothing();

    // 3. Returnează cu cookies de sesiune
    const successResponse = NextResponse.json({ user: data.user }, { status: 201 });
    response.cookies.getAll().forEach((cookie) => {
      successResponse.cookies.set(cookie.name, cookie.value);
    });

    return successResponse;
  } catch (error) {
    console.error("[AUTH_REGISTER] Error:", error);
    return NextResponse.json(
      { error: "Eroare internă server" },
      { status: 500 }
    );
  }
}
