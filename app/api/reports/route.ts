import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, schema } from "@/lib/db";
import { eq, and, gte, lte } from "drizzle-orm";

const MONTH_NAMES = ["Ian","Feb","Mar","Apr","Mai","Iun","Iul","Aug","Sep","Oct","Nov","Dec"];

function getDateFrom(period: string): string | null {
  const now = new Date();
  if (period === "current-month") {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  }
  if (period === "3months") {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().split("T")[0];
  }
  if (period === "6months") {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().split("T")[0];
  }
  return null; // "all" — fără filtru
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "current-month";
    const dateFrom = getDateFrom(period);

    // Fetch tranzacții cu join la categories
    const conditions = [eq(schema.transactions.userId, authUser.id)];
    if (dateFrom) conditions.push(gte(schema.transactions.date, dateFrom));

    const rows = await db
      .select({
        amount: schema.transactions.amount,
        date: schema.transactions.date,
        categoryId: schema.transactions.categoryId,
        categoryName: schema.categories.name,
        categoryIcon: schema.categories.icon,
        categoryColor: schema.categories.color,
      })
      .from(schema.transactions)
      .leftJoin(schema.categories, eq(schema.transactions.categoryId, schema.categories.id))
      .where(and(...conditions));

    // --- Agregare byCategory (doar cheltuieli) ---
    const categoryMap = new Map<string, {
      categoryId: string | null;
      categoryName: string;
      categoryIcon: string;
      categoryColor: string;
      total: number;
    }>();

    let totalExpenses = 0;
    let totalIncome = 0;

    for (const row of rows) {
      const amount = Number(row.amount);
      // Excludem transferurile din analiză
      if (row.categoryName === "Transferuri") continue;
      if (amount < 0) {
        totalExpenses += Math.abs(amount);
        const key = row.categoryId ?? "__uncategorized__";
        const existing = categoryMap.get(key);
        if (existing) {
          existing.total += Math.abs(amount);
        } else {
          categoryMap.set(key, {
            categoryId: row.categoryId,
            categoryName: row.categoryName ?? "Necategorizate",
            categoryIcon: row.categoryIcon ?? "❓",
            categoryColor: row.categoryColor ?? "#6b7280",
            total: Math.abs(amount),
          });
        }
      } else {
        totalIncome += amount;
      }
    }

    // Rotunjim totalurile la 2 zecimale pentru a evita floating point drift
    totalExpenses = Math.round(totalExpenses * 100) / 100;
    totalIncome = Math.round(totalIncome * 100) / 100;

    const byCategory = Array.from(categoryMap.values())
      .sort((a, b) => b.total - a.total)
      .map((c) => ({
        ...c,
        total: Math.round(c.total * 100) / 100,
        percentage: totalExpenses > 0 ? Math.round((c.total / totalExpenses) * 100) : 0,
      }));

    // --- Agregare byMonth ---
    const monthMap = new Map<string, { label: string; expenses: number; income: number }>();

    for (const row of rows) {
      const amount = Number(row.amount);
      if (row.categoryName === "Transferuri") continue;
      const [year, month] = row.date.split("-");
      const key = `${year}-${month}`;
      const label = `${MONTH_NAMES[parseInt(month, 10) - 1]} ${year}`;

      const existing = monthMap.get(key);
      if (existing) {
        if (amount < 0) existing.expenses += Math.abs(amount);
        else existing.income += amount;
      } else {
        monthMap.set(key, {
          label,
          expenses: amount < 0 ? Math.abs(amount) : 0,
          income: amount >= 0 ? amount : 0,
        });
      }
    }

    const byMonth = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        label: data.label,
        expenses: Math.round(data.expenses * 100) / 100,
        income: Math.round(data.income * 100) / 100,
      }));

    // --- Comparație luna curentă vs luna precedentă ---
    const now = new Date();
    const curFirst = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const curLast = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const curLastStr = `${curLast.getFullYear()}-${String(curLast.getMonth() + 1).padStart(2, "0")}-${String(curLast.getDate()).padStart(2, "0")}`;

    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevFirst = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}-01`;
    const prevLast = new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 0);
    const prevLastStr = `${prevLast.getFullYear()}-${String(prevLast.getMonth() + 1).padStart(2, "0")}-${String(prevLast.getDate()).padStart(2, "0")}`;
    const prevLabel = `${MONTH_NAMES[prevDate.getMonth()]} ${prevDate.getFullYear()}`;
    const curLabel = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;

    const [curRows, prevRows] = await Promise.all([
      db.select({ amount: schema.transactions.amount, categoryId: schema.transactions.categoryId, categoryName: schema.categories.name })
        .from(schema.transactions)
        .leftJoin(schema.categories, eq(schema.transactions.categoryId, schema.categories.id))
        .where(and(eq(schema.transactions.userId, authUser.id), gte(schema.transactions.date, curFirst), lte(schema.transactions.date, curLastStr))),
      db.select({ amount: schema.transactions.amount, categoryId: schema.transactions.categoryId, categoryName: schema.categories.name })
        .from(schema.transactions)
        .leftJoin(schema.categories, eq(schema.transactions.categoryId, schema.categories.id))
        .where(and(eq(schema.transactions.userId, authUser.id), gte(schema.transactions.date, prevFirst), lte(schema.transactions.date, prevLastStr))),
    ]);

    const sumExpenses = (r: typeof curRows) => r
      .filter((x) => Number(x.amount) < 0 && x.categoryName !== "Transferuri")
      .reduce((s, x) => s + Math.abs(Number(x.amount)), 0);
    const sumIncome = (r: typeof curRows) => r
      .filter((x) => Number(x.amount) >= 0 && x.categoryName !== "Transferuri")
      .reduce((s, x) => s + Number(x.amount), 0);

    const curExpenses = Math.round(sumExpenses(curRows) * 100) / 100;
    const prevExpenses = Math.round(sumExpenses(prevRows) * 100) / 100;
    const curIncome = Math.round(sumIncome(curRows) * 100) / 100;
    const prevIncome = Math.round(sumIncome(prevRows) * 100) / 100;

    const expenseDiff = prevExpenses > 0 ? Math.round(((curExpenses - prevExpenses) / prevExpenses) * 100) : null;
    const incomeDiff = prevIncome > 0 ? Math.round(((curIncome - prevIncome) / prevIncome) * 100) : null;

    return NextResponse.json({
      byCategory,
      byMonth,
      summary: {
        totalExpenses,
        totalIncome,
        balance: totalIncome - totalExpenses,
        transactionCount: rows.length,
      },
      comparison: {
        currentLabel: curLabel,
        previousLabel: prevLabel,
        current: { expenses: curExpenses, income: curIncome },
        previous: { expenses: prevExpenses, income: prevIncome },
        expenseDiff,
        incomeDiff,
      },
    });
  } catch (error) {
    console.error("[REPORTS_GET] Error:", error);
    return NextResponse.json({ error: "Eroare internă server" }, { status: 500 });
  }
}
