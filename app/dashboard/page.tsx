import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db, schema } from "@/lib/db";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import LogoutButton from "./logout-button";
import Link from "next/link";
import Logo from "@/components/logo";
import Onboarding from "./onboarding";

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat("ro-RO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + " " + currency;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const users = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, authUser.id))
    .limit(1);

  const user = users[0];
  if (!user) redirect("/login");

  // Intervalul lunii curente
  const now = new Date();
  const primaZiLuna = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const ultimaZiLuna = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const ultimaZiStr = `${ultimaZiLuna.getFullYear()}-${String(ultimaZiLuna.getMonth() + 1).padStart(2, "0")}-${String(ultimaZiLuna.getDate()).padStart(2, "0")}`;
  const lunaNumeRo = now.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });

  // Sold curent (toate tranzacțiile)
  const soldResult = await db
    .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
    .from(schema.transactions)
    .where(eq(schema.transactions.userId, user.id));
  const soldCurent = Number(soldResult[0]?.total ?? 0);

  // Venituri luna asta
  const venituriResult = await db
    .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
    .from(schema.transactions)
    .where(and(
      eq(schema.transactions.userId, user.id),
      gte(schema.transactions.date, primaZiLuna),
      lte(schema.transactions.date, ultimaZiStr),
      sql`amount > 0`
    ));
  const venituriLuna = Number(venituriResult[0]?.total ?? 0);

  // Cheltuieli luna asta
  const cheltuieliResult = await db
    .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
    .from(schema.transactions)
    .where(and(
      eq(schema.transactions.userId, user.id),
      gte(schema.transactions.date, primaZiLuna),
      lte(schema.transactions.date, ultimaZiStr),
      sql`amount < 0`
    ));
  const cheltuieliLuna = Math.abs(Number(cheltuieliResult[0]?.total ?? 0));

  const totalTranzactiiResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(schema.transactions)
    .where(eq(schema.transactions.userId, user.id));
  const totalTranzactii = Number(totalTranzactiiResult[0]?.count ?? 0);

  // Bănci (pentru onboarding)
  const banksResult = await db
    .select({ id: schema.banks.id })
    .from(schema.banks)
    .where(eq(schema.banks.userId, user.id))
    .limit(1);
  const hasBanks = banksResult.length > 0;

  // Ultimele 5 tranzacții
  const ultimeleTranzactii = await db
    .select({
      id: schema.transactions.id,
      date: schema.transactions.date,
      description: schema.transactions.description,
      amount: schema.transactions.amount,
      currency: schema.transactions.currency,
      categoryName: schema.categories.name,
      categoryIcon: schema.categories.icon,
      categoryColor: schema.categories.color,
    })
    .from(schema.transactions)
    .leftJoin(schema.categories, eq(schema.transactions.categoryId, schema.categories.id))
    .where(eq(schema.transactions.userId, user.id))
    .orderBy(desc(schema.transactions.date))
    .limit(5);

  return (
    <div className="min-h-screen relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0f172a 0%, #1a1f2e 50%, #0f172a 100%)" }}>

      <Onboarding
        hasBanks={hasBanks}
        hasTransactions={totalTranzactii > 0}
        userName={user.name}
      />

      {/* Blobs fundal */}
      <div className="fixed top-[-15%] left-[-10%] w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, #14b8a6, transparent)" }} />
      <div className="fixed bottom-[-10%] right-[-5%] w-80 h-80 rounded-full blur-3xl opacity-15 pointer-events-none"
        style={{ background: "radial-gradient(circle, #f97316, transparent)" }} />

      {/* Header */}
      <header className="relative z-10 sticky top-0"
        style={{
          background: "rgba(15,23,42,0.8)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}>
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size={32} />
            <span className="text-lg font-bold" style={{ color: "#ffffff" }}>Vibe Budget</span>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <span className="hidden md:inline text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
              Bună, <span className="font-bold" style={{ color: "#2dd4bf" }}>{user.name}</span>!
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Conținut */}
      <main className="container mx-auto px-4 py-8 relative z-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: "#ffffff" }}>Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
            Rezumat financiar — {lunaNumeRo}
          </p>
        </div>

        {/* Carduri statistici */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Sold curent */}
          <div className="rounded-2xl p-6"
            style={{
              background: "rgba(255,255,255,0.07)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.6)" }}>Sold curent</p>
              <span className="text-xl">💳</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: soldCurent >= 0 ? "#2dd4bf" : "#f87171" }}>
              {formatAmount(soldCurent, user.nativeCurrency)}
            </p>
            <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.35)" }}>Total acumulat</p>
          </div>

          {/* Venituri */}
          <div className="rounded-2xl p-6"
            style={{
              background: "rgba(20,184,166,0.1)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(20,184,166,0.2)",
            }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.6)" }}>Venituri luna aceasta</p>
              <span className="text-xl">📈</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: "#2dd4bf" }}>
              +{formatAmount(venituriLuna, user.nativeCurrency)}
            </p>
            <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.35)" }}>Încasări în {lunaNumeRo}</p>
          </div>

          {/* Cheltuieli */}
          <div className="rounded-2xl p-6"
            style={{
              background: "rgba(249,115,22,0.1)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(249,115,22,0.2)",
            }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.6)" }}>Cheltuieli luna aceasta</p>
              <span className="text-xl">📉</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: "#fb923c" }}>
              -{formatAmount(cheltuieliLuna, user.nativeCurrency)}
            </p>
            <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.35)" }}>Plăți în {lunaNumeRo}</p>
          </div>
        </div>

        {/* Navigare rapidă */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <Link href="/dashboard/banks"
            className="rounded-2xl p-4 flex items-center gap-3 transition-all hover:scale-105"
            style={{
              background: "rgba(20,184,166,0.1)",
              border: "1px solid rgba(20,184,166,0.2)",
            }}>
            <span className="text-2xl">🏦</span>
            <span className="text-sm font-bold" style={{ color: "#2dd4bf" }}>Bănci</span>
          </Link>
          <Link href="/dashboard/categories"
            className="rounded-2xl p-4 flex items-center gap-3 transition-all hover:scale-105"
            style={{
              background: "rgba(249,115,22,0.1)",
              border: "1px solid rgba(249,115,22,0.2)",
            }}>
            <span className="text-2xl">📁</span>
            <span className="text-sm font-bold" style={{ color: "#fb923c" }}>Categorii</span>
          </Link>
          <Link href="/dashboard/transactions"
            className="rounded-2xl p-4 flex items-center gap-3 transition-all hover:scale-105"
            style={{
              background: "rgba(99,102,241,0.1)",
              border: "1px solid rgba(99,102,241,0.2)",
            }}>
            <span className="text-2xl">💳</span>
            <span className="text-sm font-bold" style={{ color: "#818cf8" }}>Tranzacții</span>
          </Link>
          <Link href="/dashboard/upload"
            className="rounded-2xl p-4 flex items-center gap-3 transition-all hover:scale-105"
            style={{
              background: "rgba(236,72,153,0.1)",
              border: "1px solid rgba(236,72,153,0.2)",
            }}>
            <span className="text-2xl">📤</span>
            <span className="text-sm font-bold" style={{ color: "#f472b6" }}>Import</span>
          </Link>
          <Link href="/dashboard/currencies"
            className="rounded-2xl p-4 flex items-center gap-3 transition-all hover:scale-105"
            style={{
              background: "rgba(234,179,8,0.1)",
              border: "1px solid rgba(234,179,8,0.2)",
            }}>
            <span className="text-2xl">💱</span>
            <span className="text-sm font-bold" style={{ color: "#facc15" }}>Valute</span>
          </Link>
          <Link href="/dashboard/reports"
            className="rounded-2xl p-4 flex items-center gap-3 transition-all hover:scale-105"
            style={{
              background: "rgba(20,184,166,0.07)",
              border: "1px solid rgba(20,184,166,0.15)",
            }}>
            <span className="text-2xl">📊</span>
            <span className="text-sm font-bold" style={{ color: "#5eead4" }}>Rapoarte</span>
          </Link>
          <Link href="/dashboard/goals"
            className="rounded-2xl p-4 flex items-center gap-3 transition-all hover:scale-105"
            style={{
              background: "rgba(20,184,166,0.1)",
              border: "1px solid rgba(20,184,166,0.2)",
            }}>
            <span className="text-2xl">🎯</span>
            <span className="text-sm font-bold" style={{ color: "#2dd4bf" }}>Obiective</span>
          </Link>
          <Link href="/dashboard/budgets"
            className="rounded-2xl p-4 flex items-center gap-3 transition-all hover:scale-105"
            style={{
              background: "rgba(34,197,94,0.1)",
              border: "1px solid rgba(34,197,94,0.2)",
            }}>
            <span className="text-2xl">💰</span>
            <span className="text-sm font-bold" style={{ color: "#4ade80" }}>Bugete</span>
          </Link>
        </div>

        {/* Activitate recentă */}
        <div className="rounded-2xl overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}>
          {totalTranzactii === 0 ? (
            <div className="p-8 text-center">
              <span className="text-5xl">📊</span>
              <p className="font-bold mt-4" style={{ color: "#ffffff" }}>Nu ai tranzacții încă</p>
              <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.45)" }}>
                Importă un extras bancar pentru a vedea statisticile financiare.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <h2 className="text-sm font-bold" style={{ color: "#ffffff" }}>Activitate recentă</h2>
                <Link href="/dashboard/transactions"
                  className="text-xs font-bold"
                  style={{ color: "#2dd4bf" }}>
                  Vezi toate ({totalTranzactii}) →
                </Link>
              </div>
              {ultimeleTranzactii.map((t, i) => (
                <div key={t.id}
                  className="flex items-center gap-3 px-5 py-3"
                  style={{ borderBottom: i < ultimeleTranzactii.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  {/* Icon categorie */}
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                    style={{
                      background: (t.categoryColor || "#6366f1") + "22",
                      border: `1px solid ${(t.categoryColor || "#6366f1")}33`,
                    }}>
                    {t.categoryIcon || "💳"}
                  </div>
                  {/* Descriere + dată */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: "#ffffff" }}>{t.description}</p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                      {new Date(t.date).toLocaleDateString("ro-RO", { day: "2-digit", month: "short" })}
                      {t.categoryName && (
                        <span style={{ color: t.categoryColor || "#6366f1" }}> · {t.categoryName}</span>
                      )}
                    </p>
                  </div>
                  {/* Sumă */}
                  <span className="text-sm font-bold shrink-0"
                    style={{ color: Number(t.amount) >= 0 ? "#2dd4bf" : "#f87171" }}>
                    {Number(t.amount) >= 0 ? "+" : "-"}{formatAmount(Math.abs(Number(t.amount)), t.currency)}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
