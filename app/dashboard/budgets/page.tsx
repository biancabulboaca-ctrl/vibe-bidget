"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardNav from "@/app/dashboard/nav";

interface Budget {
  id: string;
  categoryId: string;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  amount: number;
  spent: number;
  percentage: number;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: string;
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat("ro-RO", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount) + " RON";
}

function getStatusColor(pct: number) {
  if (pct >= 100) return "#f87171";
  if (pct >= 80) return "#fbbf24";
  return "#4ade80";
}

function getStatusLabel(pct: number) {
  if (pct >= 100) return "⛔ Depășit";
  if (pct >= 80) return "⚠️ Aproape";
  return "✅ Ok";
}

export default function BudgetsPage() {
  const router = useRouter();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
      setBudgets(budgetsData.budgets || []);
      setCategories((catsData.categories || []).filter((c: Category) => c.type === "expense"));
    } finally {
      setLoading(false);
    }
  };

  const openModal = () => {
    setFormCategoryId(""); setFormAmount(""); setFormError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const amount = parseFloat(formAmount.replace(",", "."));
    if (!formCategoryId) { setFormError("Alege o categorie."); return; }
    if (isNaN(amount) || amount <= 0) { setFormError("Suma trebuie să fie un număr pozitiv."); return; }
    setFormLoading(true);
    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: formCategoryId, amount }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error); return; }
      setShowModal(false);
      await fetchAll();
      setSuccessMessage("Buget salvat!");
      setTimeout(() => setSuccessMessage(null), 4000);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch("/api/budgets", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setBudgets((prev) => prev.filter((b) => b.id !== id));
    setDeletingId(null);
    setSuccessMessage("Buget șters.");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Categorii fără buget setat
  const budgetedCategoryIds = new Set(budgets.map((b) => b.categoryId));
  const availableCategories = categories.filter((c) => !budgetedCategoryIds.has(c.id));

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const overBudget = budgets.filter((b) => b.percentage >= 100).length;
  const nearBudget = budgets.filter((b) => b.percentage >= 80 && b.percentage < 100).length;

  const now = new Date();
  const monthName = now.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });

  return (
    <div className="min-h-screen relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0f172a 0%, #1a1f2e 50%, #0f172a 100%)" }}>

      <div className="fixed top-[-15%] left-[-10%] w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, #14b8a6, transparent)" }} />
      <div className="fixed bottom-[-10%] right-[-5%] w-80 h-80 rounded-full blur-3xl opacity-15 pointer-events-none"
        style={{ background: "radial-gradient(circle, #f97316, transparent)" }} />

      <header className="relative z-10 sticky top-0"
        style={{ background: "rgba(15,23,42,0.8)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.5)" }}>← Dashboard</Link>
            <div className="flex items-center gap-2">
              <span className="text-xl">💰</span>
              <span className="text-lg font-bold" style={{ color: "#ffffff" }}>Bugete</span>
            </div>
          </div>
          {availableCategories.length > 0 && (
            <button onClick={openModal}
              className="px-4 py-2 rounded-xl text-sm font-bold"
              style={{ background: "linear-gradient(135deg, #14b8a6, #f97316)", color: "#ffffff", boxShadow: "0 4px 15px rgba(20,184,166,0.3)" }}>
              + Adaugă buget
            </button>
          )}
        </div>
      </header>
      <DashboardNav />

      {successMessage && (
        <div className="relative z-20 container mx-auto px-4 pt-4">
          <div className="rounded-xl px-4 py-3 flex items-center gap-3 text-sm font-bold"
            style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.35)", color: "#4ade80" }}>
            <span>✅</span><span>{successMessage}</span>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-6 relative z-10">

        {/* Sumar */}
        {budgets.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-xs font-bold uppercase mb-1" style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em" }}>Total bugetat</p>
              <p className="text-xl font-bold" style={{ color: "#ffffff" }}>{formatAmount(totalBudget)}</p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{monthName}</p>
            </div>
            <div className="rounded-2xl p-4" style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
              <p className="text-xs font-bold uppercase mb-1" style={{ color: "rgba(248,113,113,0.7)", letterSpacing: "0.08em" }}>Cheltuit</p>
              <p className="text-xl font-bold" style={{ color: "#f87171" }}>{formatAmount(totalSpent)}</p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{Math.round((totalSpent / totalBudget) * 100)}% din total</p>
            </div>
            <div className="rounded-2xl p-4" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
              <p className="text-xs font-bold uppercase mb-1" style={{ color: "rgba(251,191,36,0.7)", letterSpacing: "0.08em" }}>Aproape limită</p>
              <p className="text-xl font-bold" style={{ color: "#fbbf24" }}>{nearBudget}</p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>categorii la 80%+</p>
            </div>
            <div className="rounded-2xl p-4" style={{
              background: overBudget > 0 ? "rgba(248,113,113,0.08)" : "rgba(74,222,128,0.08)",
              border: `1px solid ${overBudget > 0 ? "rgba(248,113,113,0.2)" : "rgba(74,222,128,0.2)"}`,
            }}>
              <p className="text-xs font-bold uppercase mb-1" style={{ color: overBudget > 0 ? "rgba(248,113,113,0.7)" : "rgba(74,222,128,0.7)", letterSpacing: "0.08em" }}>Depășite</p>
              <p className="text-xl font-bold" style={{ color: overBudget > 0 ? "#f87171" : "#4ade80" }}>{overBudget}</p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>categorii peste limită</p>
            </div>
          </div>
        )}

        {/* Lista bugete */}
        {loading ? (
          <div className="py-24 text-center text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Se încarcă...</div>
        ) : budgets.length === 0 ? (
          <div className="py-24 text-center">
            <span className="text-5xl">💰</span>
            <p className="font-bold mt-4 text-lg" style={{ color: "#ffffff" }}>Nu ai bugete setate</p>
            <p className="text-sm mt-2 mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>
              Setează un plafon lunar pe categorie și primești avertizări când te apropii de limită.
            </p>
            <button onClick={openModal}
              className="px-6 py-3 rounded-xl text-sm font-bold"
              style={{ background: "linear-gradient(135deg, #14b8a6, #f97316)", color: "#ffffff" }}>
              + Adaugă primul buget
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {budgets
              .sort((a, b) => b.percentage - a.percentage)
              .map((b) => {
                const pct = Math.min(b.percentage, 100);
                const statusColor = getStatusColor(b.percentage);
                const remaining = Math.max(b.amount - b.spent, 0);

                return (
                  <div key={b.id} className="rounded-2xl p-5"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: b.percentage >= 100
                        ? "1px solid rgba(248,113,113,0.35)"
                        : b.percentage >= 80
                        ? "1px solid rgba(251,191,36,0.25)"
                        : "1px solid rgba(255,255,255,0.08)",
                    }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                          style={{ background: (b.categoryColor || "#6366f1") + "22", border: `1px solid ${(b.categoryColor || "#6366f1")}44` }}>
                          {b.categoryIcon || "📁"}
                        </div>
                        <div>
                          <p className="font-bold text-sm" style={{ color: "#ffffff" }}>{b.categoryName || "Categorie"}</p>
                          <span className="text-xs font-bold" style={{ color: statusColor }}>
                            {getStatusLabel(b.percentage)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                          <p className="text-sm font-bold" style={{ color: "#f87171" }}>{formatAmount(b.spent)}</p>
                          <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>din {formatAmount(b.amount)}</p>
                        </div>
                        <button onClick={() => setDeletingId(b.id)}
                          className="px-2 py-1 rounded-lg text-xs"
                          style={{ background: "rgba(239,68,68,0.1)", color: "#f87171" }}>
                          🗑️
                        </button>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-3 rounded-full overflow-hidden mb-2"
                      style={{ background: "rgba(255,255,255,0.08)" }}>
                      <div className="h-3 rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          background: b.percentage >= 100
                            ? "linear-gradient(90deg, #ef4444, #f87171)"
                            : b.percentage >= 80
                            ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                            : `linear-gradient(90deg, ${b.categoryColor || "#14b8a6"}, ${b.categoryColor || "#14b8a6"}cc)`,
                        }} />
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span style={{ color: statusColor }}>{b.percentage}% folosit</span>
                      {b.percentage < 100 ? (
                        <span style={{ color: "rgba(255,255,255,0.35)" }}>
                          Mai poți cheltui {formatAmount(remaining)}
                        </span>
                      ) : (
                        <span style={{ color: "#f87171" }}>
                          Depășit cu {formatAmount(b.spent - b.amount)}
                        </span>
                      )}
                    </div>

                    {/* Mobile: sumele */}
                    <div className="sm:hidden mt-2 flex justify-between text-xs">
                      <span style={{ color: "#f87171" }}>{formatAmount(b.spent)} cheltuit</span>
                      <span style={{ color: "rgba(255,255,255,0.35)" }}>din {formatAmount(b.amount)}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </main>

      {/* Modal adaugă buget */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6"
            style={{ background: "rgba(15,23,42,0.97)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 25px 50px rgba(0,0,0,0.5)" }}>
            <h2 className="text-lg font-bold mb-5" style={{ color: "#ffffff" }}>Buget lunar</h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: "#2dd4bf" }}>Categorie</label>
                <select value={formCategoryId} onChange={(e) => setFormCategoryId(e.target.value)}
                  required className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: formCategoryId ? "#ffffff" : "rgba(255,255,255,0.4)" }}>
                  <option value="" style={{ background: "#1e293b" }}>Alege categoria...</option>
                  {availableCategories.map((c) => (
                    <option key={c.id} value={c.id} style={{ background: "#1e293b", color: "#ffffff" }}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: "#2dd4bf" }}>Plafon lunar (RON)</label>
                <input type="text" value={formAmount} onChange={(e) => setFormAmount(e.target.value)}
                  required placeholder="ex: 2000"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#ffffff" }} />
              </div>

              {formError && (
                <div className="rounded-xl px-4 py-3 text-sm"
                  style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}>
                  {formError}
                </div>
              )}

              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold"
                  style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}>
                  Anulează
                </button>
                <button type="submit" disabled={formLoading}
                  className="flex-1 py-3 rounded-xl text-sm font-bold"
                  style={{ background: formLoading ? "rgba(20,184,166,0.4)" : "linear-gradient(135deg, #14b8a6, #f97316)", color: "#ffffff" }}>
                  {formLoading ? "Se salvează..." : "Salvează"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmare ștergere */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6"
            style={{ background: "rgba(15,23,42,0.97)", border: "1px solid rgba(239,68,68,0.3)", boxShadow: "0 25px 50px rgba(0,0,0,0.5)" }}>
            <h2 className="text-lg font-bold mb-2" style={{ color: "#ffffff" }}>Ștergi bugetul?</h2>
            <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>Cheltuielile nu se șterg, doar plafonul.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingId(null)}
                className="flex-1 py-3 rounded-xl text-sm font-bold"
                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}>
                Anulează
              </button>
              <button onClick={() => handleDelete(deletingId)}
                className="flex-1 py-3 rounded-xl text-sm font-bold"
                style={{ background: "#ef4444", color: "#ffffff" }}>
                Șterge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
