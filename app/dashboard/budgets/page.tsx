"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardNav from "@/app/dashboard/nav";

interface CategoryBudget {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  budgetId: string | null;
  amount: number; // 0 = fără buget
  spent: number;
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat("ro-RO", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

function getBarColor(pct: number, color: string) {
  if (pct >= 100) return "linear-gradient(90deg, #ef4444, #f87171)";
  if (pct >= 80) return "linear-gradient(90deg, #f59e0b, #fbbf24)";
  return `linear-gradient(90deg, ${color}, ${color}cc)`;
}

export default function BudgetsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<CategoryBudget[]>([]);
  const [loading, setLoading] = useState(true);
  // inputValues: categoryId → string (ce scrie userul în input)
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const now = new Date();
  const monthName = now.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [budgetsRes, catsRes] = await Promise.all([
        fetch("/api/budgets"),
        fetch("/api/categories"),
      ]);
      if (budgetsRes.status === 401) { router.push("/login"); return; }
      const budgetsData = await budgetsRes.json();
      const catsData = await catsRes.json();

      const budgets: Array<{
        id: string; categoryId: string; categoryName: string | null;
        categoryIcon: string | null; categoryColor: string | null;
        amount: number; spent: number;
      }> = budgetsData.budgets || [];

      const allCategories: Array<{
        id: string; name: string; icon: string; color: string; type: string;
      }> = (catsData.categories || []).filter((c: { type: string }) => c.type === "expense");

      const budgetMap = new Map(budgets.map((b) => [b.categoryId, b]));

      const combined: CategoryBudget[] = allCategories.map((cat) => {
        const b = budgetMap.get(cat.id);
        return {
          categoryId: cat.id,
          categoryName: cat.name,
          categoryIcon: cat.icon || "📁",
          categoryColor: cat.color || "#6366f1",
          budgetId: b?.id ?? null,
          amount: b ? b.amount : 0,
          spent: b ? b.spent : 0,
        };
      });

      setRows(combined);

      // Inițializează inputurile cu valorile existente
      const initValues: Record<string, string> = {};
      for (const row of combined) {
        initValues[row.categoryId] = row.amount > 0 ? String(row.amount) : "";
      }
      setInputValues(initValues);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (categoryId: string, value: string) => {
    setInputValues((prev) => ({ ...prev, [categoryId]: value }));

    // Debounce save cu 800ms
    if (saveTimers.current[categoryId]) clearTimeout(saveTimers.current[categoryId]);
    saveTimers.current[categoryId] = setTimeout(() => {
      saveLimit(categoryId, value);
    }, 800);
  };

  const handleBlur = (categoryId: string) => {
    // Salvează imediat la blur (anulează debounce-ul)
    if (saveTimers.current[categoryId]) clearTimeout(saveTimers.current[categoryId]);
    saveLimit(categoryId, inputValues[categoryId] ?? "");
  };

  const saveLimit = async (categoryId: string, rawValue: string) => {
    const amount = parseFloat(rawValue.replace(",", "."));
    const row = rows.find((r) => r.categoryId === categoryId);
    if (!row) return;

    const isClearing = !rawValue.trim() || isNaN(amount) || amount <= 0;
    const prevAmount = row.amount;

    // Dacă valoarea e identică cu ce e deja salvat, nu facem nimic
    if (!isClearing && amount === prevAmount) return;
    if (isClearing && prevAmount === 0) return;

    setSavingId(categoryId);
    try {
      if (isClearing && row.budgetId) {
        // Șterge bugetul existent
        await fetch("/api/budgets", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: row.budgetId }),
        });
        setRows((prev) => prev.map((r) =>
          r.categoryId === categoryId ? { ...r, budgetId: null, amount: 0, spent: 0 } : r
        ));
      } else if (!isClearing) {
        // Upsert
        const res = await fetch("/api/budgets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categoryId, amount }),
        });
        const data = await res.json();
        if (res.ok && data.budget) {
          setRows((prev) => prev.map((r) =>
            r.categoryId === categoryId ? { ...r, budgetId: data.budget.id, amount } : r
          ));
        }
      }
      setSavedId(categoryId);
      setTimeout(() => setSavedId(null), 2000);
    } finally {
      setSavingId(null);
    }
  };

  const budgetedRows = rows.filter((r) => r.amount > 0);
  const totalBudget = budgetedRows.reduce((s, r) => s + r.amount, 0);
  const totalSpent = budgetedRows.reduce((s, r) => s + r.spent, 0);
  const overCount = budgetedRows.filter((r) => r.spent > r.amount).length;

  const [notifying, setNotifying] = useState(false);
  const [notifyMsg, setNotifyMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const handleNotify = async () => {
    setNotifying(true);
    setNotifyMsg(null);
    try {
      const res = await fetch("/api/budgets/notify", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setNotifyMsg({ ok: false, text: data.error || "Eroare la trimitere." }); return; }
      if (data.message) { setNotifyMsg({ ok: true, text: data.message }); return; }
      setNotifyMsg({ ok: true, text: `Email trimis! ${data.exceeded} depășite, ${data.nearLimit} aproape de limită.` });
    } catch { setNotifyMsg({ ok: false, text: "Eroare de rețea." }); }
    finally { setNotifying(false); setTimeout(() => setNotifyMsg(null), 6000); }
  };

  return (
    <div className="min-h-screen relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0f172a 0%, #1a1f2e 50%, #0f172a 100%)" }}>

      <div className="fixed top-[-15%] left-[-10%] w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, #14b8a6, transparent)" }} />
      <div className="fixed bottom-[-10%] right-[-5%] w-80 h-80 rounded-full blur-3xl opacity-15 pointer-events-none"
        style={{ background: "radial-gradient(circle, #f97316, transparent)" }} />

      <header className="relative z-10 sticky top-0"
        style={{ background: "rgba(15,23,42,0.8)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.5)" }}>← Dashboard</Link>
          <div className="flex items-center gap-2">
            <span className="text-xl">💰</span>
            <span className="text-lg font-bold" style={{ color: "#ffffff" }}>Bugete lunare</span>
          </div>
          <span className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>— {monthName}</span>
          {budgetedRows.length > 0 && (
            <button onClick={handleNotify} disabled={notifying}
              className="ml-auto px-4 py-2 rounded-xl text-sm font-bold"
              style={{
                background: notifying ? "rgba(20,184,166,0.1)" : "rgba(20,184,166,0.15)",
                border: "1px solid rgba(20,184,166,0.3)",
                color: notifying ? "rgba(45,212,191,0.5)" : "#2dd4bf",
                cursor: notifying ? "not-allowed" : "pointer",
              }}>
              {notifying ? "Se trimite..." : "📧 Trimite alertă email"}
            </button>
          )}
        </div>
      </header>
      <DashboardNav />

      <main className="container mx-auto px-4 py-6 relative z-10 max-w-3xl">

        {/* Total general — mereu vizibil */}
        <div className="rounded-2xl p-5 mb-4 flex items-center justify-between"
          style={{ background: "rgba(20,184,166,0.08)", border: "1px solid rgba(20,184,166,0.2)" }}>
          <div>
            <p className="text-xs font-bold uppercase mb-1" style={{ color: "rgba(20,184,166,0.7)", letterSpacing: "0.08em" }}>Total bugete lunare</p>
            <p className="text-3xl font-bold" style={{ color: "#2dd4bf" }}>
              {formatAmount(totalBudget)} <span className="text-lg font-normal" style={{ color: "rgba(45,212,191,0.6)" }}>RON</span>
            </p>
          </div>
          {totalBudget > 0 && (
            <div className="text-right">
              <p className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Cheltuit până acum</p>
              <p className="text-xl font-bold" style={{ color: totalSpent > totalBudget ? "#f87171" : "#ffffff" }}>
                {formatAmount(totalSpent)} <span className="text-sm font-normal" style={{ color: "rgba(255,255,255,0.4)" }}>RON</span>
              </p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                {Math.round((totalSpent / totalBudget) * 100)}% din total
              </p>
            </div>
          )}
        </div>

        {/* Sumar pe categorii */}
        {budgetedRows.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-xs font-bold uppercase mb-1" style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em" }}>Buget total</p>
              <p className="text-xl font-bold" style={{ color: "#ffffff" }}>{formatAmount(totalBudget)} <span className="text-sm font-normal" style={{ color: "rgba(255,255,255,0.4)" }}>RON</span></p>
            </div>
            <div className="rounded-2xl p-4" style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.15)" }}>
              <p className="text-xs font-bold uppercase mb-1" style={{ color: "rgba(248,113,113,0.7)", letterSpacing: "0.08em" }}>Cheltuit</p>
              <p className="text-xl font-bold" style={{ color: "#f87171" }}>{formatAmount(totalSpent)} <span className="text-sm font-normal" style={{ color: "rgba(248,113,113,0.5)" }}>RON</span></p>
            </div>
            <div className="rounded-2xl p-4" style={{
              background: overCount > 0 ? "rgba(248,113,113,0.08)" : "rgba(74,222,128,0.08)",
              border: `1px solid ${overCount > 0 ? "rgba(248,113,113,0.2)" : "rgba(74,222,128,0.15)"}`,
            }}>
              <p className="text-xs font-bold uppercase mb-1" style={{ color: overCount > 0 ? "rgba(248,113,113,0.7)" : "rgba(74,222,128,0.7)", letterSpacing: "0.08em" }}>Depășite</p>
              <p className="text-xl font-bold" style={{ color: overCount > 0 ? "#f87171" : "#4ade80" }}>{overCount} <span className="text-sm font-normal" style={{ color: "rgba(255,255,255,0.3)" }}>categorii</span></p>
            </div>
          </div>
        )}

        {notifyMsg && (
          <div className="rounded-xl px-4 py-3 mb-4 flex items-center gap-2 text-sm font-bold"
            style={notifyMsg.ok ? {
              background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.35)", color: "#4ade80",
            } : {
              background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5",
            }}>
            <span>{notifyMsg.ok ? "✅" : "⚠"}</span>
            <span>{notifyMsg.text}</span>
          </div>
        )}

        <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>
          Setează un plafon pentru fiecare categorie. Lasă gol dacă nu vrei limită.
        </p>

        {/* Lista categorii */}
        {loading ? (
          <div className="py-24 text-center text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Se încarcă...</div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
            {rows.map((row, i) => {
              const pct = row.amount > 0 ? Math.round((row.spent / row.amount) * 100) : 0;
              const clampedPct = Math.min(pct, 100);
              const isSaving = savingId === row.categoryId;
              const isSaved = savedId === row.categoryId;
              const hasLimit = row.amount > 0;

              return (
                <div key={row.categoryId}
                  style={{
                    borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                    background: pct >= 100 && hasLimit
                      ? "rgba(248,113,113,0.04)"
                      : pct >= 80 && hasLimit
                      ? "rgba(251,191,36,0.03)"
                      : "transparent",
                  }}>

                  {/* Rând principal */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    {/* Icon categorie */}
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                      style={{ background: row.categoryColor + "22", border: `1px solid ${row.categoryColor}33` }}>
                      {row.categoryIcon}
                    </div>

                    {/* Nume */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: "#ffffff" }}>{row.categoryName}</p>
                      {hasLimit && (
                        <p className="text-xs" style={{ color: pct >= 100 ? "#f87171" : pct >= 80 ? "#fbbf24" : "rgba(255,255,255,0.35)" }}>
                          {formatAmount(row.spent)} / {formatAmount(row.amount)} RON
                          {pct >= 100 && " · ⛔ depășit"}
                          {pct >= 80 && pct < 100 && " · ⚠ aproape"}
                        </p>
                      )}
                    </div>

                    {/* Input limită */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={inputValues[row.categoryId] ?? ""}
                        onChange={(e) => handleInputChange(row.categoryId, e.target.value)}
                        onBlur={() => handleBlur(row.categoryId)}
                        placeholder="—"
                        className="text-right rounded-lg px-3 py-1.5 text-sm font-bold outline-none w-28 transition-all"
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          border: isSaving
                            ? "1px solid rgba(20,184,166,0.5)"
                            : isSaved
                            ? "1px solid rgba(74,222,128,0.5)"
                            : hasLimit
                            ? `1px solid ${row.categoryColor}44`
                            : "1px solid rgba(255,255,255,0.1)",
                          color: hasLimit ? "#ffffff" : "rgba(255,255,255,0.4)",
                        }}
                      />
                      <span className="text-xs w-8" style={{ color: "rgba(255,255,255,0.35)" }}>
                        {isSaving ? "💾" : isSaved ? "✓" : "RON"}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {hasLimit && (
                    <div className="px-4 pb-3">
                      <div className="h-1.5 rounded-full overflow-hidden"
                        style={{ background: "rgba(255,255,255,0.07)" }}>
                        <div className="h-1.5 rounded-full transition-all duration-500"
                          style={{
                            width: `${clampedPct}%`,
                            background: getBarColor(pct, row.categoryColor),
                          }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
