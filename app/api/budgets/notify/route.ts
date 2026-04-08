import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, schema } from "@/lib/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";

interface BudgetAlert {
  categoryName: string;
  categoryIcon: string;
  amount: number;
  spent: number;
  percentage: number;
}

async function sendBudgetEmail(
  toEmail: string,
  toName: string,
  exceeded: BudgetAlert[],
  nearLimit: BudgetAlert[],
  monthLabel: string
) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 0 }).format(n);

  const exceededRows = exceeded
    .map(
      (b) => `
      <tr>
        <td style="padding:10px;border-bottom:1px solid #f1f5f9;">${b.categoryIcon} ${b.categoryName}</td>
        <td style="padding:10px;border-bottom:1px solid #f1f5f9;text-align:right;color:#ef4444;font-weight:bold;">${fmt(b.spent)} RON</td>
        <td style="padding:10px;border-bottom:1px solid #f1f5f9;text-align:right;">${fmt(b.amount)} RON</td>
        <td style="padding:10px;border-bottom:1px solid #f1f5f9;text-align:right;color:#ef4444;font-weight:bold;">+${fmt(b.spent - b.amount)} RON</td>
      </tr>`
    )
    .join("");

  const nearRows = nearLimit
    .map(
      (b) => `
      <tr>
        <td style="padding:10px;border-bottom:1px solid #f1f5f9;">${b.categoryIcon} ${b.categoryName}</td>
        <td style="padding:10px;border-bottom:1px solid #f1f5f9;text-align:right;color:#f59e0b;font-weight:bold;">${fmt(b.spent)} RON</td>
        <td style="padding:10px;border-bottom:1px solid #f1f5f9;text-align:right;">${fmt(b.amount)} RON</td>
        <td style="padding:10px;border-bottom:1px solid #f1f5f9;text-align:right;color:#f59e0b;font-weight:bold;">${b.percentage}%</td>
      </tr>`
    )
    .join("");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#14b8a6,#f97316);padding:32px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:bold;">💰 Vibe Budget</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Alertă bugete — ${monthLabel}</p>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
      <p style="color:#374151;font-size:15px;">Bună, <strong>${toName}</strong>!</p>
      <p style="color:#6b7280;font-size:14px;">Iată un rezumat al bugetelor tale pentru luna curentă:</p>

      ${
        exceeded.length > 0
          ? `
      <!-- Depășite -->
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px;margin:24px 0;">
        <h2 style="margin:0 0 16px;color:#dc2626;font-size:16px;">⛔ Bugete depășite (${exceeded.length})</h2>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="color:#6b7280;">
              <th style="padding:8px;text-align:left;">Categorie</th>
              <th style="padding:8px;text-align:right;">Cheltuit</th>
              <th style="padding:8px;text-align:right;">Limită</th>
              <th style="padding:8px;text-align:right;">Depășit cu</th>
            </tr>
          </thead>
          <tbody>${exceededRows}</tbody>
        </table>
      </div>`
          : ""
      }

      ${
        nearLimit.length > 0
          ? `
      <!-- Aproape de limită -->
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:20px;margin:24px 0;">
        <h2 style="margin:0 0 16px;color:#d97706;font-size:16px;">⚠️ Aproape de limită (${nearLimit.length})</h2>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="color:#6b7280;">
              <th style="padding:8px;text-align:left;">Categorie</th>
              <th style="padding:8px;text-align:right;">Cheltuit</th>
              <th style="padding:8px;text-align:right;">Limită</th>
              <th style="padding:8px;text-align:right;">Folosit</th>
            </tr>
          </thead>
          <tbody>${nearRows}</tbody>
        </table>
      </div>`
          : ""
      }

      <div style="text-align:center;margin-top:32px;">
        <a href="https://vibe-bidget.vercel.app/dashboard/budgets"
          style="display:inline-block;background:linear-gradient(135deg,#14b8a6,#f97316);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:bold;font-size:14px;">
          Vezi bugete →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:20px;text-align:center;background:#f8fafc;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">Vibe Budget · notificare automată lunară</p>
    </div>
  </div>
</body>
</html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Vibe Budget <onboarding@resend.dev>",
      to: toEmail,
      subject: `⚠️ Alertă bugete ${monthLabel} — ${exceeded.length > 0 ? `${exceeded.length} depășite` : `${nearLimit.length} aproape de limită`}`,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[RESEND] Error response:", res.status, err);
    throw new Error(`Resend error ${res.status}: ${err}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch user info
    const users = await db.select().from(schema.users).where(eq(schema.users.id, authUser.id)).limit(1);
    const user = users[0];
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Calculează luna curentă
    const now = new Date();
    const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const lastDayStr = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;
    const monthLabel = now.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });

    // Fetch bugete
    const budgets = await db
      .select({
        id: schema.budgets.id,
        amount: schema.budgets.amount,
        categoryId: schema.budgets.categoryId,
        categoryName: schema.categories.name,
        categoryIcon: schema.categories.icon,
      })
      .from(schema.budgets)
      .leftJoin(schema.categories, eq(schema.budgets.categoryId, schema.categories.id))
      .where(eq(schema.budgets.userId, authUser.id));

    if (budgets.length === 0) {
      return NextResponse.json({ message: "Niciun buget setat." });
    }

    // Fetch cheltuieli luna curentă
    const spending = await db
      .select({
        categoryId: schema.transactions.categoryId,
        total: sql<number>`COALESCE(SUM(ABS(amount)), 0)`,
      })
      .from(schema.transactions)
      .where(and(
        eq(schema.transactions.userId, authUser.id),
        gte(schema.transactions.date, firstDay),
        lte(schema.transactions.date, lastDayStr),
        sql`amount < 0`
      ))
      .groupBy(schema.transactions.categoryId);

    const spendingMap = new Map(spending.map((s) => [s.categoryId, Number(s.total)]));

    const alerts: BudgetAlert[] = budgets.map((b) => {
      const spent = spendingMap.get(b.categoryId) ?? 0;
      const amount = Number(b.amount);
      return {
        categoryName: b.categoryName ?? "Necunoscută",
        categoryIcon: b.categoryIcon ?? "📁",
        amount,
        spent,
        percentage: Math.round((spent / amount) * 100),
      };
    });

    const exceeded = alerts.filter((a) => a.spent > a.amount);
    const nearLimit = alerts.filter((a) => a.percentage >= 80 && a.spent <= a.amount);

    if (exceeded.length === 0 && nearLimit.length === 0) {
      return NextResponse.json({ message: "Toate bugetele sunt în regulă.", alerts: 0 });
    }

    // Resend free tier permite trimitere doar către emailul înregistrat pe resend.com
    // NOTIFY_EMAIL = emailul cu care ești înregistrată pe resend.com
    const toEmail = process.env.NOTIFY_EMAIL || authUser.email!;
    await sendBudgetEmail(toEmail, user.name, exceeded, nearLimit, monthLabel);

    return NextResponse.json({
      success: true,
      emailSent: authUser.email,
      exceeded: exceeded.length,
      nearLimit: nearLimit.length,
    });
  } catch (error) {
    console.error("[BUDGETS_NOTIFY] Error:", error);
    return NextResponse.json({ error: "Eroare internă server" }, { status: 500 });
  }
}
