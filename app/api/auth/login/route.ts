import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email și parola sunt obligatorii" },
        { status: 400 }
      );
    }

    // Creăm response-ul înainte, ca să putem seta cookies pe el
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

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("[AUTH_LOGIN] Supabase error:", error.message);
      return NextResponse.json(
        { error: "Email sau parolă incorectă" },
        { status: 401 }
      );
    }

    // Returnăm response-ul cu cookies setate
    const successResponse = NextResponse.json({ user: data.user });
    response.cookies.getAll().forEach((cookie) => {
      successResponse.cookies.set(cookie.name, cookie.value);
    });

    return successResponse;
  } catch (error) {
    console.error("[AUTH_LOGIN] Error:", error);
    return NextResponse.json(
      { error: "Eroare internă server" },
      { status: 500 }
    );
  }
}
