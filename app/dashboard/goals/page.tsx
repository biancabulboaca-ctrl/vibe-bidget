"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardNav from "@/app/dashboard/nav";

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
  icon: string;
  color: string;
  savingsMethod: string | null;
}

const ICON_OPTIONS = ["🎯", "🏖️", "🚗", "🏠", "💍", "📱", "✈️", "🎓", "💪", "🐣", "🛡️", "💎"];
const COLOR_OPTIONS = [
  "#14b8a6", "#f97316", "#6366f1", "#ec4899",
  "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6",
];

const SAVINGS_METHODS = [
  { value: "fidelis", label: "Fidelis", icon: "🏛️", desc: "Titluri de stat Fidelis" },
  { value: "tezaur", label: "Tezaur", icon: "🏦", desc: "Titluri de stat Tezaur" },
  { value: "bursa", label: "Bursă", icon: "📈", desc: "Acțiuni și ETF-uri" },
  { value: "fond_mutual", label: "Fond mutual", icon: "🪙", desc: "Fonduri de investiții" },
  { value: "depozit", label: "Depozit bancar", icon: "🏧", desc: "Depozit la termen" },
  { value: "economii", label: "Cont economii", icon: "💰", desc: "Cont de economii cu dobândă" },
  { value: "crypto", label: "Crypto", icon: "₿", desc: "Bitcoin, Ethereum, etc." },
  { value: "numerar", label: "Numerar", icon: "💵", desc: "Cash la saltea" },
  { value: "aur", label: "Aur", icon: "🥇", desc: "Lingouri sau monede de aur" },
  { value: "imobiliar", label: "Imobiliare", icon: "🏗️", desc: "Investiții în proprietăți" },
  { value: "pensie", label: "Pensie privată", icon: "👴", desc: "Pilon 3 sau pensie facultativă" },
  { value: "altele", label: "Altele", icon: "✏️", desc: "Altă metodă" },
];

function formatAmount(amount: number) {
  return new Intl.NumberFormat("ro-RO", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount) + " RON";
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric" });
}

function daysLeft(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function GoalsPage() {
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Add money modal
  const [addMoneyGoal, setAddMoneyGoal] = useState<Goal | null>(null);
  const [addMoneyAmount, setAddMoneyAmount] = useState("");
  const [addMoneyLoading, setAddMoneyLoading] = useState(false);

  // Form
  const [formName, setFormName] = useState("");
  const [formTarget, setFormTarget] = useState("");
  const [formCurrent, setFormCurrent] = useState("0");
  const [formDeadline, setFormDeadline] = useState("");
  const [formIcon, setFormIcon] = useState("🎯");
  const [formColor, setFormColor] = useState("#14b8a6");
  const [formMethod, setFormMethod] = useState("");
  const [showMethodPicker, setShowMethodPicker] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/goals");
      if (res.status === 401) { router.push("/login"); return; }
      const data = await res.json();
      setGoals(data.goals || []);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditingGoal(null);
    setFormName(""); setFormTarget(""); setFormCurrent("0");
    setFormDeadline(""); setFormIcon("🎯"); setFormColor("#14b8a6"); setFormMethod("");
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (g: Goal) => {
    setEditingGoal(g);
    setFormName(g.name);
    setFormTarget(String(g.targetAmount));
    setFormCurrent(String(g.currentAmount));
    setFormDeadline(g.deadline || "");
    setFormIcon(g.icon);
    setFormColor(g.color);
    setFormMethod(g.savingsMethod || "");
    setFormError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);
    try {
      const target = parseFloat(formTarget.replace(",", "."));
      const current = parseFloat(formCurrent.replace(",", ".") || "0");
      if (isNaN(target) || target <= 0) { setFormError("Suma țintă trebuie să fie un număr pozitiv."); return; }

      const url = editingGoal ? `/api/goals/${editingGoal.id}` : "/api/goals";
      const method = editingGoal ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          targetAmount: target,
          currentAmount: current,
          deadline: formDeadline || null,
          icon: formIcon,
          color: formColor,
          savingsMethod: formMethod || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) { setFormError(data.error); return; }

      setShowModal(false);
      await fetchGoals();
      setSuccessMessage(editingGoal ? "Goal actualizat!" : "Goal adăugat!");
      setTimeout(() => setSuccessMessage(null), 4000);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
    setGoals((prev) => prev.filter((g) => g.id !== id));
    setDeletingId(null);
    setSuccessMessage("Goal șters.");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleAddMoney = async () => {
    if (!addMoneyGoal) return;
    const amount = parseFloat(addMoneyAmount.replace(",", "."));
    if (isNaN(amount) || amount <= 0) return;
    setAddMoneyLoading(true);
    try {
      const newCurrent = Math.min(
        Number(addMoneyGoal.currentAmount) + amount,
        Number(addMoneyGoal.targetAmount)
      );
      await fetch(`/api/goals/${addMoneyGoal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addMoneyGoal.name,
          targetAmount: addMoneyGoal.targetAmount,
          currentAmount: newCurrent,
          deadline: addMoneyGoal.deadline,
          icon: addMoneyGoal.icon,
          color: addMoneyGoal.color,
        }),
      });
      setAddMoneyGoal(null);
      setAddMoneyAmount("");
      await fetchGoals();
      setSuccessMessage(`+${formatAmount(amount)} adăugat la "${addMoneyGoal.name}"!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } finally {
      setAddMoneyLoading(false);
    }
  };

  const inputStyle = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#ffffff",
    borderRadius: "10px",
    padding: "10px 12px",
    fontSize: "14px",
    outline: "none",
    width: "100%",
  };

  const totalSaved = goals.reduce((s, g) => s + Number(g.currentAmount), 0);
  const totalTarget = goals.reduce((s, g) => s + Number(g.targetAmount), 0);
  const completedGoals = goals.filter((g) => Number(g.currentAmount) >= Number(g.targetAmount)).length;

  return (
    <div className="min-h-screen relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0f172a 0%, #1a1f2e 50%, #0f172a 100%)" }}>

      <div className="fixed top-[-15%] left-[-10%] w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, #14b8a6, transparent)" }} />
      <div className="fixed bottom-[-10%] right-[-5%] w-80 h-80 rounded-full blur-3xl opacity-15 pointer-events-none"
        style={{ background: "radial-gradient(circle, #f97316, transparent)" }} />

      {/* Header */}
      <header className="relative z-10 sticky top-0"
        style={{ background: "rgba(15,23,42,0.8)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.5)" }}>← Dashboard</Link>
            <div className="flex items-center gap-2">
              <span className="text-xl">🎯</span>
              <span className="text-lg font-bold" style={{ color: "#ffffff" }}>Obiective</span>
            </div>
          </div>
          <button onClick={openAdd}
            className="px-4 py-2 rounded-xl text-sm font-bold"
            style={{ background: "linear-gradient(135deg, #14b8a6, #f97316)", color: "#ffffff", boxShadow: "0 4px 15px rgba(20,184,166,0.3)" }}>
            + Adaugă obiectiv
          </button>
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
        {goals.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="rounded-2xl p-5" style={{ background: "rgba(20,184,166,0.08)", border: "1px solid rgba(20,184,166,0.2)" }}>
              <p className="text-xs font-bold uppercase mb-2" style={{ color: "rgba(45,212,191,0.7)", letterSpacing: "0.08em" }}>Total economisit</p>
              <p className="text-2xl font-bold" style={{ color: "#2dd4bf" }}>{formatAmount(totalSaved)}</p>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>din {formatAmount(totalTarget)}</p>
            </div>
            <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-xs font-bold uppercase mb-2" style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em" }}>Obiective active</p>
              <p className="text-2xl font-bold" style={{ color: "#ffffff" }}>{goals.length - completedGoals}</p>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>în progres</p>
            </div>
            <div className="rounded-2xl p-5" style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)" }}>
              <p className="text-xs font-bold uppercase mb-2" style={{ color: "rgba(74,222,128,0.7)", letterSpacing: "0.08em" }}>Finalizate</p>
              <p className="text-2xl font-bold" style={{ color: "#4ade80" }}>{completedGoals}</p>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>obiective atinse</p>
            </div>
          </div>
        )}

        {/* Goals grid */}
        {loading ? (
          <div className="py-24 text-center text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Se încarcă...</div>
        ) : goals.length === 0 ? (
          <div className="py-24 text-center">
            <span className="text-5xl">🎯</span>
            <p className="font-bold mt-4 text-lg" style={{ color: "#ffffff" }}>Nu ai obiective încă</p>
            <p className="text-sm mt-2 mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>
              Setează un obiectiv de economisire și urmărește progresul.
            </p>
            <button onClick={openAdd}
              className="px-6 py-3 rounded-xl text-sm font-bold"
              style={{ background: "linear-gradient(135deg, #14b8a6, #f97316)", color: "#ffffff" }}>
              + Adaugă primul obiectiv
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {goals.map((g) => {
              const pct = Math.min(Math.round((Number(g.currentAmount) / Number(g.targetAmount)) * 100), 100);
              const done = pct >= 100;
              const remaining = Number(g.targetAmount) - Number(g.currentAmount);
              const days = g.deadline ? daysLeft(g.deadline) : null;

              return (
                <div key={g.id} className="rounded-2xl p-5 flex flex-col gap-4"
                  style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${done ? "rgba(74,222,128,0.3)" : "rgba(255,255,255,0.08)"}` }}>

                  {/* Header goal */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{ background: g.color + "22", border: `1px solid ${g.color}44` }}>
                        {g.icon}
                      </div>
                      <div>
                        <p className="font-bold text-sm" style={{ color: "#ffffff" }}>{g.name}</p>
                        {done ? (
                          <span className="text-xs font-bold" style={{ color: "#4ade80" }}>✅ Atins!</span>
                        ) : g.deadline && days !== null ? (
                          <span className="text-xs" style={{ color: days < 30 ? "#fbbf24" : "rgba(255,255,255,0.4)" }}>
                            {days > 0 ? `${days} zile rămase` : "Termen expirat"}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(g)}
                        className="px-2 py-1 rounded-lg text-xs font-bold"
                        style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
                        ✏️
                      </button>
                      <button onClick={() => setDeletingId(g.id)}
                        className="px-2 py-1 rounded-lg text-xs font-bold"
                        style={{ background: "rgba(239,68,68,0.1)", color: "#f87171" }}>
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Progress */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold" style={{ color: g.color }}>{pct}%</span>
                      <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                        {formatAmount(Number(g.currentAmount))} / {formatAmount(Number(g.targetAmount))}
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                      <div className="h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: done ? "#4ade80" : g.color }} />
                    </div>
                    {!done && (
                      <p className="text-xs mt-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                        Mai ai nevoie de {formatAmount(remaining)}
                      </p>
                    )}
                    {g.savingsMethod && (
                      (() => {
                        const m = SAVINGS_METHODS.find((s) => s.value === g.savingsMethod);
                        return m ? (
                          <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg text-xs font-bold"
                            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}>
                            {m.icon} {m.label}
                          </span>
                        ) : null;
                      })()
                    )}
                  </div>

                  {/* Buton adaugă bani */}
                  {!done && (
                    <button onClick={() => { setAddMoneyGoal(g); setAddMoneyAmount(""); }}
                      className="w-full py-2 rounded-xl text-xs font-bold"
                      style={{ background: g.color + "20", border: `1px solid ${g.color}40`, color: g.color }}>
                      + Adaugă bani
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal adaugă/editează */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
            style={{ background: "rgba(15,23,42,0.97)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 25px 50px rgba(0,0,0,0.5)" }}>
            <h2 className="text-lg font-bold mb-5" style={{ color: "#ffffff" }}>
              {editingGoal ? "Editează obiectiv" : "Obiectiv nou"}
            </h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Nume */}
              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: "#2dd4bf" }}>Nume obiectiv</label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                  required placeholder="ex: Vacanță Grecia, Fond urgență"
                  style={inputStyle} />
              </div>

              {/* Suma țintă */}
              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: "#2dd4bf" }}>Suma țintă (RON)</label>
                <input type="text" value={formTarget} onChange={(e) => setFormTarget(e.target.value)}
                  required placeholder="5000" style={inputStyle} />
              </div>

              {/* Economisit deja */}
              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: "#2dd4bf" }}>
                  Deja economisit (RON) <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: "normal" }}>(opțional)</span>
                </label>
                <input type="text" value={formCurrent} onChange={(e) => setFormCurrent(e.target.value)}
                  placeholder="0" style={inputStyle} />
              </div>

              {/* Deadline */}
              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: "#2dd4bf" }}>
                  Dată limită <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: "normal" }}>(opțional)</span>
                </label>
                <input type="date" value={formDeadline} onChange={(e) => setFormDeadline(e.target.value)}
                  style={inputStyle} />
              </div>

              {/* Metodă economisire */}
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: "#2dd4bf" }}>
                  Metodă economisire <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: "normal" }}>(opțional)</span>
                </label>
                <button type="button" onClick={() => setShowMethodPicker(!showMethodPicker)}
                  className="w-full rounded-xl px-4 py-3 text-sm text-left flex items-center justify-between"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: formMethod ? "#ffffff" : "rgba(255,255,255,0.35)" }}>
                  <span>
                    {formMethod ? (
                      (() => {
                        const m = SAVINGS_METHODS.find((s) => s.value === formMethod);
                        return m ? `${m.icon} ${m.label}` : formMethod;
                      })()
                    ) : "Alege metoda de economisire..."}
                  </span>
                  <span style={{ color: "rgba(255,255,255,0.3)" }}>{showMethodPicker ? "▲" : "▼"}</span>
                </button>

                {showMethodPicker && (
                  <div className="mt-2 rounded-xl overflow-hidden"
                    style={{ background: "rgba(15,23,42,0.98)", border: "1px solid rgba(255,255,255,0.12)" }}>
                    {/* Opțiunea "Fără metodă" */}
                    <button type="button"
                      onClick={() => { setFormMethod(""); setShowMethodPicker(false); }}
                      className="w-full px-4 py-3 text-sm text-left flex items-center gap-3 transition-all"
                      style={{
                        background: !formMethod ? "rgba(20,184,166,0.1)" : "transparent",
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                        color: "rgba(255,255,255,0.4)",
                      }}>
                      <span>—</span>
                      <span>Fără metodă specificată</span>
                    </button>
                    {SAVINGS_METHODS.map((m) => (
                      <button key={m.value} type="button"
                        onClick={() => { setFormMethod(m.value); setShowMethodPicker(false); }}
                        className="w-full px-4 py-3 text-sm text-left flex items-center gap-3 transition-all"
                        style={{
                          background: formMethod === m.value ? "rgba(20,184,166,0.1)" : "transparent",
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                          color: "#ffffff",
                        }}>
                        <span className="text-lg w-7">{m.icon}</span>
                        <div>
                          <p className="font-bold text-sm">{m.label}</p>
                          <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{m.desc}</p>
                        </div>
                        {formMethod === m.value && (
                          <span className="ml-auto text-xs font-bold" style={{ color: "#2dd4bf" }}>✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Icon */}
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: "#2dd4bf" }}>Icon</label>
                <div className="flex flex-wrap gap-2">
                  {ICON_OPTIONS.map((icon) => (
                    <button key={icon} type="button" onClick={() => setFormIcon(icon)}
                      className="w-10 h-10 rounded-xl text-xl flex items-center justify-center"
                      style={{
                        background: formIcon === icon ? "rgba(20,184,166,0.2)" : "rgba(255,255,255,0.05)",
                        border: formIcon === icon ? "1px solid rgba(20,184,166,0.5)" : "1px solid rgba(255,255,255,0.08)",
                      }}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Culoare */}
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: "#2dd4bf" }}>Culoare</label>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_OPTIONS.map((color) => (
                    <button key={color} type="button" onClick={() => setFormColor(color)}
                      className="w-8 h-8 rounded-full"
                      style={{
                        background: color,
                        outline: formColor === color ? `3px solid ${color}` : "none",
                        outlineOffset: "2px",
                      }} />
                  ))}
                </div>
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
                  {formLoading ? "Se salvează..." : editingGoal ? "Salvează" : "Adaugă"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal adaugă bani */}
      {addMoneyGoal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-md rounded-2xl p-5"
            style={{ background: "rgba(15,23,42,0.98)", border: `1px solid ${addMoneyGoal.color}40`, boxShadow: "0 -8px 40px rgba(0,0,0,0.5)" }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{addMoneyGoal.icon}</span>
              <div>
                <p className="font-bold text-sm" style={{ color: "#ffffff" }}>Adaugă bani — {addMoneyGoal.name}</p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {formatAmount(Number(addMoneyGoal.currentAmount))} din {formatAmount(Number(addMoneyGoal.targetAmount))}
                </p>
              </div>
            </div>
            <input type="text" value={addMoneyAmount} onChange={(e) => setAddMoneyAmount(e.target.value)}
              placeholder="Sumă (RON)"
              className="w-full rounded-xl px-4 py-3 text-sm outline-none mb-4"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#ffffff" }} />
            <div className="flex gap-3">
              <button onClick={() => setAddMoneyGoal(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
                Anulează
              </button>
              <button onClick={handleAddMoney} disabled={addMoneyLoading || !addMoneyAmount.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: addMoneyAmount.trim() ? `linear-gradient(135deg, ${addMoneyGoal.color}, #f97316)` : "rgba(255,255,255,0.06)", color: addMoneyAmount.trim() ? "#ffffff" : "rgba(255,255,255,0.3)" }}>
                {addMoneyLoading ? "Se salvează..." : "💰 Adaugă"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmare ștergere */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6"
            style={{ background: "rgba(15,23,42,0.97)", border: "1px solid rgba(239,68,68,0.3)", boxShadow: "0 25px 50px rgba(0,0,0,0.5)" }}>
            <h2 className="text-lg font-bold mb-2" style={{ color: "#ffffff" }}>Ștergi obiectivul?</h2>
            <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>Această acțiune este ireversibilă.</p>
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
