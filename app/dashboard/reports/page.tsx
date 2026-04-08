"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardNav from "@/app/dashboard/nav";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";

type Period = "current-month" | "3months" | "6months" | "all";

interface CategoryData {
  categoryId: string | null;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  total: number;
  percentage: number;
}

interface MonthData {
  month: string;
  label: string;
  expenses: number;
  income: number;
}

interface ReportData {
  byCategory: CategoryData[];
  byMonth: MonthData[];
  summary: {
    totalExpenses: number;
    totalIncome: number;
    balance: number;
    transactionCount: number;
  };
}

interface CoachData {
  healthScore: number;
  healthExplanation: string;
  tips: string[];
  positiveObservation: string;
  budgetAdvice?: string[];
}

const PERIODS: { value: Period; label: string }[] = [
  { value: "current-month", label: "Luna curentă" },
  { value: "3months", label: "3 luni" },
  { value: "6months", label: "6 luni" },
  { value: "all", label: "Tot" },
];

function formatAmount(amount: number) {
  return new Intl.NumberFormat("ro-RO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + " RON";
}

function formatShort(amount: number) {
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}k`;
  return amount.toFixed(0);
}

interface PieTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: CategoryData }>;
}

function PieTooltipContent({ active, payload }: PieTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl px-3 py-2 text-xs"
      style={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.12)", color: "#ffffff" }}>
      <p className="font-bold">{d.categoryIcon} {d.categoryName}</p>
      <p style={{ color: "#f87171" }}>{formatAmount(d.total)}</p>
      <p style={{ color: "rgba(255,255,255,0.5)" }}>{d.percentage}%</p>
    </div>
  );
}

interface BarTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function BarTooltipContent({ active, payload, label }: BarTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2 text-xs"
      style={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.12)", color: "#ffffff" }}>
      <p className="font-bold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {formatAmount(p.value)}</p>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("3months");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const [coachData, setCoachData] = useState<CoachData | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState<string | null>(null);

  interface BudgetRow {
    categoryId: string;
    categoryName: string | null;
    categoryIcon: string | null;
    categoryColor: string | null;
    amount: number;
    spent: number;
    percentage: number;
  }
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);

  useEffect(() => {
    fetch("/api/budgets")
      .then((r) => r.json())
      .then((d) => setBudgets(d.budgets || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setCoachData(null);
      setCoachError(null);
      try {
        const res = await fetch(`/api/reports?period=${period}`);
        if (res.status === 401) { router.push("/login"); return; }
        const json = await res.json();
        setData(json);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [period, router]);

  const handleAnalyze = async () => {
    if (!data) return;
    setCoachLoading(true);
    setCoachError(null);
    setCoachData(null);
    try {
      const res = await fetch("/api/ai/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period,
          summary: data.summary,
          byCategory: data.byCategory.map((c) => ({
            categoryName: c.categoryName,
            categoryIcon: c.categoryIcon,
            total: c.total,
            percentage: c.percentage,
          })),
          byMonth: data.byMonth.map((m) => ({
            label: m.label,
            expenses: m.expenses,
            income: m.income,
          })),
          budgetOverruns: budgets
            .filter((b) => b.spent > b.amount)
            .map((b) => ({
              categoryName: b.categoryName || "Necunoscută",
              categoryIcon: b.categoryIcon || "📁",
              amount: b.amount,
              spent: b.spent,
              overBy: b.spent - b.amount,
              percentage: Math.round((b.spent / b.amount) * 100),
            })),
        }),
      });
      const json = await res.json();
      if (!res.ok) { setCoachError(json.error || "Eroare la analiză."); return; }
      setCoachData(json);
    } catch {
      setCoachError("Eroare de rețea. Încearcă din nou.");
    } finally {
      setCoachLoading(false);
    }
  };

  const cardStyle = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0f172a 0%, #1a1f2e 50%, #0f172a 100%)" }}>

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
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="text-sm font-bold"
            style={{ color: "rgba(255,255,255,0.5)" }}>← Dashboard</Link>
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <span className="text-lg font-bold" style={{ color: "#ffffff" }}>Rapoarte</span>
          </div>
        </div>
      </header>
      <DashboardNav />

      <main className="container mx-auto px-4 py-6 relative z-10 max-w-6xl">

        {/* Filtre + buton AI */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex flex-wrap gap-2">
            {PERIODS.map((p) => (
              <button key={p.value} onClick={() => setPeriod(p.value)}
                className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
                style={period === p.value ? {
                  background: "linear-gradient(135deg, #14b8a6, #f97316)",
                  color: "#ffffff",
                  boxShadow: "0 4px 15px rgba(20,184,166,0.3)",
                } : {
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.5)",
                }}>
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handlePrint}
              className="px-4 py-2 rounded-xl text-sm font-bold no-print"
              style={{
                background: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.7)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}>
              🖨️ Printează / PDF
            </button>
          {data && data.summary.transactionCount > 0 && (
            <button onClick={handleAnalyze} disabled={coachLoading}
              className="px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
              style={{
                background: coachLoading ? "rgba(139,92,246,0.2)" : "linear-gradient(135deg, #7c3aed, #4f46e5)",
                color: "#ffffff",
                boxShadow: coachLoading ? "none" : "0 4px 15px rgba(124,58,237,0.35)",
                opacity: coachLoading ? 0.7 : 1,
              }}>
              {coachLoading ? <><span className="animate-spin inline-block">⏳</span><span>Analizez...</span></>
                : <><span>🤖</span><span>Analizează cheltuielile</span></>}
            </button>
          )}
          </div>
        </div>

        {loading ? (
          <div className="py-24 text-center text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            Se încarcă rapoartele...
          </div>
        ) : !data || data.summary.transactionCount === 0 ? (
          <div className="py-24 text-center">
            <span className="text-5xl">📊</span>
            <p className="font-bold mt-4 text-lg" style={{ color: "rgba(255,255,255,0.6)" }}>Fără date disponibile</p>
            <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.3)" }}>
              Nu există tranzacții pentru perioada selectată.
            </p>
          </div>
        ) : (
          <>
            {/* Carduri sumar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="rounded-2xl p-5" style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)" }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase" style={{ color: "rgba(248,113,113,0.7)", letterSpacing: "0.08em" }}>Cheltuieli totale</span>
                  <span className="text-xl">💸</span>
                </div>
                <p className="text-2xl font-bold" style={{ color: "#f87171" }}>-{formatAmount(data.summary.totalExpenses)}</p>
                <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>{data.byCategory.length} categorii</p>
              </div>
              <div className="rounded-2xl p-5" style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.25)" }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase" style={{ color: "rgba(74,222,128,0.7)", letterSpacing: "0.08em" }}>Venituri totale</span>
                  <span className="text-xl">💰</span>
                </div>
                <p className="text-2xl font-bold" style={{ color: "#4ade80" }}>+{formatAmount(data.summary.totalIncome)}</p>
                <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>{data.summary.transactionCount} tranzacții</p>
              </div>
              {(() => {
                const positive = data.summary.balance >= 0;
                return (
                  <div className="rounded-2xl p-5" style={{
                    background: positive ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)",
                    border: `1px solid ${positive ? "rgba(74,222,128,0.25)" : "rgba(248,113,113,0.25)"}`,
                  }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase" style={{ color: positive ? "rgba(74,222,128,0.7)" : "rgba(248,113,113,0.7)", letterSpacing: "0.08em" }}>Balanță</span>
                      <span className="text-xl">{positive ? "📈" : "📉"}</span>
                    </div>
                    <p className="text-2xl font-bold" style={{ color: positive ? "#4ade80" : "#f87171" }}>
                      {positive ? "+" : ""}{formatAmount(data.summary.balance)}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                      {positive ? "Economii nete" : "Deficit net"}
                    </p>
                  </div>
                );
              })()}
            </div>

            {/* Depășiri buget — doar dacă există bugete setate */}
            {budgets.length > 0 && (() => {
              const exceeded = budgets.filter((b) => b.spent > b.amount);
              const nearLimit = budgets.filter((b) => b.spent / b.amount >= 0.8 && b.spent <= b.amount);
              if (exceeded.length === 0 && nearLimit.length === 0) return null;
              const totalOverrun = exceeded.reduce((s, b) => s + (b.spent - b.amount), 0);
              const alertList = [...exceeded, ...nearLimit];
              const maxVal = Math.max(...alertList.map((b) => b.spent));
              return (
                <div className="rounded-2xl p-5 mb-6"
                  style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)" }}>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">⚠️</span>
                      <div>
                        <p className="font-bold" style={{ color: "#ffffff" }}>Alerte bugete — luna curentă</p>
                        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                          Categorii unde ai depășit sau ești aproape de limită
                        </p>
                      </div>
                    </div>
                    {exceeded.length > 0 && (
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold uppercase" style={{ color: "rgba(248,113,113,0.6)", letterSpacing: "0.06em" }}>Total depășit</p>
                        <p className="text-xl font-bold" style={{ color: "#f87171" }}>
                          {new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 0 }).format(totalOverrun)} RON
                        </p>
                        <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{exceeded.length} {exceeded.length === 1 ? "categorie" : "categorii"}</p>
                      </div>
                    )}
                  </div>

                  {/* Grafic depășiri — bar chart manual */}
                  <div className="flex flex-col gap-4">
                    {alertList.map((b) => {
                      const pct = Math.round((b.spent / b.amount) * 100);
                      const over = b.spent > b.amount;
                      const barWidthBudget = (b.amount / maxVal) * 100;
                      const barWidthSpent = (b.spent / maxVal) * 100;
                      return (
                        <div key={b.categoryId}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{b.categoryIcon || "📁"}</span>
                              <span className="text-sm font-bold" style={{ color: "#ffffff" }}>{b.categoryName}</span>
                            </div>
                            <span className="text-xs font-bold" style={{ color: over ? "#f87171" : "#fbbf24" }}>
                              {over
                                ? `⛔ +${new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 0 }).format(b.spent - b.amount)} RON depășit`
                                : `⚠ ${pct}% din limită`}
                            </span>
                          </div>
                          {/* Buget (linie de referință) */}
                          <div className="relative h-6 rounded-lg overflow-hidden mb-1"
                            style={{ background: "rgba(255,255,255,0.05)" }}>
                            {/* Bar buget */}
                            <div className="absolute top-0 left-0 h-full rounded-lg opacity-30"
                              style={{ width: `${barWidthBudget}%`, background: "#6b7280" }} />
                            {/* Bar cheltuit */}
                            <div className="absolute top-0 left-0 h-full rounded-lg transition-all duration-500"
                              style={{
                                width: `${barWidthSpent}%`,
                                background: over
                                  ? "linear-gradient(90deg, #ef4444cc, #f87171cc)"
                                  : "linear-gradient(90deg, #f59e0bcc, #fbbf24cc)",
                              }} />
                            {/* Label */}
                            <div className="absolute inset-0 flex items-center justify-between px-2">
                              <span className="text-xs font-bold" style={{ color: "#ffffff", fontSize: "10px" }}>
                                Cheltuit: {new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 0 }).format(b.spent)} RON
                              </span>
                              <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)", fontSize: "10px" }}>
                                Limită: {new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 0 }).format(b.amount)} RON
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Top Spending Categories */}
            <div className="rounded-2xl p-5 mb-6" style={cardStyle}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="font-bold" style={{ color: "#ffffff" }}>Top categorii cheltuieli</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                    Unde se duc cei mai mulți bani
                  </p>
                </div>
              </div>

              {data.byCategory.length === 0 ? (
                <div className="py-10 text-center text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
                  Nicio cheltuială în această perioadă
                </div>
              ) : (
                <div className="flex flex-col lg:flex-row gap-6 items-start">
                  {/* Pie chart */}
                  <div className="w-full lg:w-64 flex-shrink-0">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={data.byCategory as unknown as Record<string, unknown>[]}
                          cx="50%" cy="50%"
                          outerRadius={90} innerRadius={45}
                          dataKey="total" nameKey="categoryName"
                          labelLine={false}>
                          {data.byCategory.map((entry, index) => (
                            <Cell key={index} fill={entry.categoryColor} />
                          ))}
                        </Pie>
                        <Tooltip content={<PieTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Lista categorii */}
                  <div className="flex-1 flex flex-col gap-2 w-full">
                    {data.byCategory.slice(0, 8).map((cat, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: cat.categoryColor }} />
                        <span className="text-sm flex-1" style={{ color: "rgba(255,255,255,0.75)" }}>
                          {cat.categoryIcon} {cat.categoryName}
                        </span>
                        <div className="flex-1 mx-2 hidden sm:block">
                          <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                            <div className="h-1.5 rounded-full"
                              style={{ width: `${cat.percentage}%`, background: cat.categoryColor, opacity: 0.8 }} />
                          </div>
                        </div>
                        <span className="text-xs font-bold shrink-0" style={{ color: "rgba(255,255,255,0.4)" }}>
                          {cat.percentage}%
                        </span>
                        <span className="text-sm font-bold shrink-0" style={{ color: "#f87171" }}>
                          -{formatAmount(cat.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Grafice separate: Venituri | Cheltuieli */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">

              {/* Venituri pe luni */}
              <div className="rounded-2xl p-5" style={cardStyle}>
                <div className="mb-4">
                  <p className="font-bold" style={{ color: "#ffffff" }}>Venituri</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Evoluție lunară</p>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.byMonth} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                      axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                      axisLine={false} tickLine={false}
                      tickFormatter={formatShort} width={38} />
                    <Tooltip content={<BarTooltipContent />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                    <Bar dataKey="income" name="Venituri" fill="#2dd4bf" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Cheltuieli pe luni */}
              <div className="rounded-2xl p-5" style={cardStyle}>
                <div className="mb-4">
                  <p className="font-bold" style={{ color: "#ffffff" }}>Cheltuieli</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Evoluție lunară</p>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.byMonth} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                      axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                      axisLine={false} tickLine={false}
                      tickFormatter={formatShort} width={38} />
                    <Tooltip content={<BarTooltipContent />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                    <Bar dataKey="expenses" name="Cheltuieli" fill="#f87171" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* AI Coach */}
            {coachError && (
              <div className="mb-5 rounded-2xl px-5 py-4 text-sm"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#fca5a5" }}>
                ⚠ {coachError}
              </div>
            )}

            {coachLoading && (
              <div className="rounded-2xl p-8 text-center"
                style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}>
                <span className="text-4xl animate-pulse">🤖</span>
                <p className="mt-3 font-bold" style={{ color: "#a78bfa" }}>Claude analizează cheltuielile tale...</p>
                <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>Durează câteva secunde</p>
              </div>
            )}

            {coachData && (
              <div className="rounded-2xl p-6"
                style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.25)" }}>
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-3xl">🤖</span>
                  <div>
                    <p className="font-bold text-lg" style={{ color: "#ffffff" }}>AI Financial Coach</p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Analiză bazată pe datele tale reale</p>
                  </div>
                </div>

                {/* Health Score */}
                <div className="rounded-xl p-4 mb-4"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold uppercase"
                      style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em" }}>Health Score</span>
                    <span className="text-3xl font-bold"
                      style={{ color: coachData.healthScore >= 70 ? "#4ade80" : coachData.healthScore >= 50 ? "#fbbf24" : "#f87171" }}>
                      {coachData.healthScore}<span className="text-lg">/100</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full mb-3" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div className="h-2 rounded-full" style={{
                      width: `${coachData.healthScore}%`,
                      background: coachData.healthScore >= 70
                        ? "linear-gradient(90deg, #22c55e, #4ade80)"
                        : coachData.healthScore >= 50
                        ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                        : "linear-gradient(90deg, #ef4444, #f87171)",
                    }} />
                  </div>
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>{coachData.healthExplanation}</p>
                </div>

                {/* Observație pozitivă */}
                <div className="rounded-xl p-4 mb-4 flex gap-3"
                  style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)" }}>
                  <span className="text-xl flex-shrink-0">✅</span>
                  <div>
                    <p className="text-xs font-bold uppercase mb-1"
                      style={{ color: "rgba(74,222,128,0.7)", letterSpacing: "0.08em" }}>Ce faci bine</p>
                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.75)" }}>{coachData.positiveObservation}</p>
                  </div>
                </div>

                {/* Strategii depășiri buget */}
                {coachData.budgetAdvice && coachData.budgetAdvice.length > 0 && (
                  <div className="mb-5">
                    <p className="text-xs font-bold uppercase mb-3"
                      style={{ color: "rgba(248,113,113,0.7)", letterSpacing: "0.08em" }}>⛔ Strategii pentru depășiri de buget</p>
                    <div className="flex flex-col gap-3">
                      {coachData.budgetAdvice.map((advice, i) => (
                        <div key={i} className="flex gap-3 rounded-xl p-3"
                          style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)" }}>
                          <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ background: "rgba(239,68,68,0.25)", color: "#f87171" }}>{i + 1}</span>
                          <p className="text-sm" style={{ color: "rgba(255,255,255,0.75)" }}>{advice}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sfaturi */}
                <p className="text-xs font-bold uppercase mb-3"
                  style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em" }}>Sfaturi personalizate</p>
                <div className="flex flex-col gap-3">
                  {coachData.tips.map((tip, i) => (
                    <div key={i} className="flex gap-3 rounded-xl p-3"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: "rgba(124,58,237,0.3)", color: "#a78bfa" }}>{i + 1}</span>
                      <p className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
