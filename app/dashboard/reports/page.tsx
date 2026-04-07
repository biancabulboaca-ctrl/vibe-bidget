"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardNav from "@/app/dashboard/nav";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
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
      <p style={{ color: "rgba(255,255,255,0.5)" }}>{d.percentage}% din cheltuieli</p>
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
  const [period, setPeriod] = useState<Period>("current-month");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/reports?period=${period}`);
        if (res.status === 401) { router.push("/login"); return; }
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("[REPORTS] Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [period, router]);

  const cardStyle = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
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
            style={{ color: "rgba(255,255,255,0.5)" }}>
            ← Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <span className="text-lg font-bold" style={{ color: "#ffffff" }}>Rapoarte</span>
          </div>
        </div>
      </header>
      <DashboardNav />

      <main className="container mx-auto px-4 py-8 relative z-10 max-w-6xl">

        {/* Filtre perioadă */}
        <div className="flex flex-wrap gap-2 mb-6">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
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

        {loading ? (
          <div className="py-24 text-center text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            Se încarcă rapoartele...
          </div>
        ) : !data || data.summary.transactionCount === 0 ? (
          <div className="py-24 text-center">
            <span className="text-5xl">📊</span>
            <p className="font-bold mt-4 text-lg" style={{ color: "rgba(255,255,255,0.6)" }}>
              Fără date disponibile
            </p>
            <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.3)" }}>
              Nu există tranzacții pentru perioada selectată.
            </p>
          </div>
        ) : (
          <>
            {/* Carduri summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {/* Cheltuieli */}
              <div className="rounded-2xl p-5" style={{
                background: "rgba(248,113,113,0.08)",
                border: "1px solid rgba(248,113,113,0.25)",
              }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase"
                    style={{ color: "rgba(248,113,113,0.7)", letterSpacing: "0.08em" }}>
                    Total cheltuieli
                  </span>
                  <span className="text-xl">💸</span>
                </div>
                <p className="text-3xl font-bold" style={{ color: "#f87171" }}>
                  -{formatAmount(data.summary.totalExpenses)}
                </p>
                <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {data.byCategory.length} {data.byCategory.length === 1 ? "categorie" : "categorii"}
                </p>
              </div>

              {/* Venituri */}
              <div className="rounded-2xl p-5" style={{
                background: "rgba(74,222,128,0.08)",
                border: "1px solid rgba(74,222,128,0.25)",
              }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase"
                    style={{ color: "rgba(74,222,128,0.7)", letterSpacing: "0.08em" }}>
                    Total venituri
                  </span>
                  <span className="text-xl">💰</span>
                </div>
                <p className="text-3xl font-bold" style={{ color: "#4ade80" }}>
                  +{formatAmount(data.summary.totalIncome)}
                </p>
                <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {data.summary.transactionCount} tranzacții totale
                </p>
              </div>

              {/* Balanță */}
              {(() => {
                const positive = data.summary.balance >= 0;
                return (
                  <div className="rounded-2xl p-5" style={{
                    background: positive ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)",
                    border: `1px solid ${positive ? "rgba(74,222,128,0.25)" : "rgba(248,113,113,0.25)"}`,
                  }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase"
                        style={{ color: positive ? "rgba(74,222,128,0.7)" : "rgba(248,113,113,0.7)", letterSpacing: "0.08em" }}>
                        Balanță
                      </span>
                      <span className="text-xl">{positive ? "📈" : "📉"}</span>
                    </div>
                    <p className="text-3xl font-bold"
                      style={{ color: positive ? "#4ade80" : "#f87171" }}>
                      {positive ? "+" : ""}{formatAmount(data.summary.balance)}
                    </p>
                    <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.3)" }}>
                      {positive ? "Economii nete" : "Deficit net"}
                    </p>
                  </div>
                );
              })()}
            </div>

            {/* Grafice */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Pie Chart — cheltuieli pe categorii */}
              <div className="rounded-2xl p-6" style={cardStyle}>
                <div className="mb-4">
                  <p className="font-bold" style={{ color: "#ffffff" }}>Cheltuieli pe categorii</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                    Distribuția cheltuielilor pe categorii
                  </p>
                </div>

                {data.byCategory.length === 0 ? (
                  <div className="py-16 text-center text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
                    Nicio cheltuială în această perioadă
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={data.byCategory}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          innerRadius={40}
                          dataKey="total"
                          nameKey="categoryName"
                          label={({ percentage }) => percentage > 3 ? `${percentage}%` : ""}
                          labelLine={false}>
                          {data.byCategory.map((entry, index) => (
                            <Cell key={index} fill={entry.categoryColor} />
                          ))}
                        </Pie>
                        <Tooltip content={<PieTooltipContent />} />
                        <Legend
                          formatter={(value) => (
                            <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "12px" }}>{value}</span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Lista categorii */}
                    <div className="mt-2 flex flex-col gap-2">
                      {data.byCategory.map((cat, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ background: cat.categoryColor }} />
                            <span style={{ color: "rgba(255,255,255,0.7)" }}>
                              {cat.categoryIcon} {cat.categoryName}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span style={{ color: "rgba(255,255,255,0.4)" }}>{cat.percentage}%</span>
                            <span className="font-bold" style={{ color: "#f87171" }}>
                              -{formatAmount(cat.total)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Bar Chart — evoluție lunară */}
              <div className="rounded-2xl p-6" style={cardStyle}>
                <div className="mb-4">
                  <p className="font-bold" style={{ color: "#ffffff" }}>Evoluție lunară</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                    Cheltuieli și venituri pe luni
                  </p>
                </div>

                {data.byMonth.length === 0 ? (
                  <div className="py-16 text-center text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
                    Nicio dată pentru această perioadă
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={data.byMonth} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                        axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                        width={40}
                      />
                      <Tooltip content={<BarTooltipContent />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                      <Legend
                        formatter={(value) => (
                          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "12px" }}>{value}</span>
                        )}
                      />
                      <Bar dataKey="expenses" name="Cheltuieli" fill="#f87171" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="income" name="Venituri" fill="#2dd4bf" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

            </div>
          </>
        )}
      </main>
    </div>
  );
}
