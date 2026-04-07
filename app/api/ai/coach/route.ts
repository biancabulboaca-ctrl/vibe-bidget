import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

interface CategorySummary {
  categoryName: string;
  categoryIcon: string;
  total: number;
  percentage: number;
}

interface MonthSummary {
  label: string;
  expenses: number;
  income: number;
}

interface CoachRequest {
  period: string;
  summary: {
    totalExpenses: number;
    totalIncome: number;
    balance: number;
    transactionCount: number;
  };
  byCategory: CategorySummary[];
  byMonth: MonthSummary[];
}

interface CoachResponse {
  healthScore: number;
  healthExplanation: string;
  tips: string[];
  positiveObservation: string;
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PERIOD_LABELS: Record<string, string> = {
  "current-month": "luna curentă",
  "3months": "ultimele 3 luni",
  "6months": "ultimele 6 luni",
  "all": "toată perioada",
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body: CoachRequest = await request.json();
    const { period, summary, byCategory, byMonth } = body;

    const periodLabel = PERIOD_LABELS[period] ?? period;

    // Construim rezumatul financiar pentru Claude — FĂRĂ date individuale
    const categoryLines = byCategory
      .map((c) => `  - ${c.categoryIcon} ${c.categoryName}: ${c.total.toFixed(2)} RON (${c.percentage}%)`)
      .join("\n");

    const monthLines = byMonth
      .map((m) => `  - ${m.label}: cheltuieli ${m.expenses.toFixed(2)} RON, venituri ${m.income.toFixed(2)} RON`)
      .join("\n");

    const savingsRate = summary.totalIncome > 0
      ? ((summary.balance / summary.totalIncome) * 100).toFixed(1)
      : "0";

    const prompt = `Ești un coach financiar personal pentru un utilizator din România. Analizează datele financiare agregate de mai jos și oferă feedback constructiv în limba română.

REZUMAT FINANCIAR (${periodLabel}):
- Total cheltuieli: ${summary.totalExpenses.toFixed(2)} RON
- Total venituri: ${summary.totalIncome.toFixed(2)} RON
- Balanță: ${summary.balance.toFixed(2)} RON
- Rata de economisire: ${savingsRate}%
- Număr tranzacții: ${summary.transactionCount}

CHELTUIELI PE CATEGORII:
${categoryLines || "  - Fără cheltuieli categorisite"}

TREND LUNAR:
${monthLines || "  - Date insuficiente pentru trend"}

Răspunde EXCLUSIV cu un JSON valid (fără markdown, fără text în afara JSON-ului) cu această structură exactă:
{
  "healthScore": <număr între 0 și 100>,
  "healthExplanation": "<1-2 propoziții care explică scorul, specifice datelor de mai sus>",
  "tips": [
    "<sfat 1 specific și acționabil bazat pe date>",
    "<sfat 2 specific și acționabil bazat pe date>",
    "<sfat 3 specific și acționabil bazat pe date>"
  ],
  "positiveObservation": "<un lucru concret pe care utilizatorul îl face bine, bazat pe date>"
}

Reguli:
- healthScore: 80-100 dacă economisește >20%, 60-79 dacă e pe plus, 40-59 dacă e pe minus mic, sub 40 dacă deficitul e mare
- Sfaturile trebuie să menționeze categorii sau sume concrete din date
- Fii încurajator dar realist
- Limba: română`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const rawText = message.content[0].type === "text" ? message.content[0].text : "";

    // Parsăm JSON-ul returnat de Claude
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[AI_COACH] No JSON in response:", rawText);
      return NextResponse.json({ error: "Răspuns invalid de la AI" }, { status: 500 });
    }

    const coachData: CoachResponse = JSON.parse(jsonMatch[0]);

    return NextResponse.json(coachData);
  } catch (error) {
    console.error("[AI_COACH] Error:", error);
    return NextResponse.json({ error: "Eroare internă server" }, { status: 500 });
  }
}
