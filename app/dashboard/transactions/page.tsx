"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardNav from "@/app/dashboard/nav";

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  bankId: string | null;
  categoryId: string | null;
  bankName: string | null;
  bankColor: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
}

interface Bank { id: string; name: string; color: string; }
interface Category { id: string; name: string; icon: string; type: string; }

function formatAmount(amount: number, currency: string) {
  const formatted = new Intl.NumberFormat("ro-RO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
  return `${amount < 0 ? "-" : "+"}${formatted} ${currency}`;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("ro-RO", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

export default function TransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtre
  const [search, setSearch] = useState("");
  const [bankId, setBankId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Modal adăugare
  const [showModal, setShowModal] = useState(false);
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formType, setFormType] = useState<"expense" | "income">("expense");
  const [formCurrency, setFormCurrency] = useState("RON");
  const [formBankId, setFormBankId] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Filtru necategorizate
  const [uncategorized, setUncategorized] = useState(false);

  // Editare / ștergere / succes
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Re-categorizare bulk
  const [recategorizing, setRecategorizing] = useState(false);

  const handleRecategorize = async () => {
    setRecategorizing(true);
    try {
      const res = await fetch("/api/transactions/recategorize", { method: "POST" });
      const data = await res.json();
      await fetchTransactions();
      setSuccessMessage(
        data.updated > 0
          ? `${data.updated} tranzacții au fost categorisite automat!`
          : data.message || "Nicio tranzacție potrivită găsită."
      );
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch {
      // ignor eroarea de rețea silently
    } finally {
      setRecategorizing(false);
    }
  };

  // Prompt keyword după categorizare
  const [keywordPrompt, setKeywordPrompt] = useState<{
    description: string;
    categoryId: string;
    categoryName: string;
    categoryIcon: string;
  } | null>(null);
  const [keywordInput, setKeywordInput] = useState("");
  const [keywordSaving, setKeywordSaving] = useState(false);

  useEffect(() => {
    fetchBanks();
    fetchCategories();
  }, []);

  // Search debounsat — celelalte filtre sunt instant
  const [searchDebounced, setSearchDebounced] = useState(search);
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchDebounced) params.set("search", searchDebounced);
      if (bankId) params.set("bankId", bankId);
      if (uncategorized) params.set("uncategorized", "true");
      else if (categoryId) params.set("categoryId", categoryId);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(`/api/transactions?${params}`);
      if (res.status === 401) { router.push("/login"); return; }
      const data = await res.json();
      setTransactions(data.transactions || []);
    } finally {
      setLoading(false);
    }
  }, [searchDebounced, bankId, categoryId, uncategorized, dateFrom, dateTo, router]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const fetchBanks = async () => {
    const res = await fetch("/api/banks");
    const data = await res.json();
    setBanks(data.banks || []);
  };

  const fetchCategories = async () => {
    const res = await fetch("/api/categories");
    const data = await res.json();
    setCategories(data.categories || []);
  };

  const clearFilters = () => {
    setSearch(""); setBankId(""); setCategoryId(""); setDateFrom(""); setDateTo(""); setUncategorized(false);
  };

  const openEdit = (t: Transaction) => {
    setEditingTransaction(t);
    setFormDate(t.date);
    setFormDescription(t.description);
    setFormAmount(String(Math.abs(t.amount)));
    setFormType(t.amount >= 0 ? "income" : "expense");
    setFormCurrency(t.currency);
    setFormBankId(t.bankId || "");
    setFormCategoryId(t.categoryId || "");
    setFormError(null);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    setDeletingId(null);
  };

  const hasFilters = search || bankId || categoryId || dateFrom || dateTo || uncategorized;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);
    try {
      const numericAmount = parseFloat(formAmount.replace(",", "."));
      if (isNaN(numericAmount)) { setFormError("Suma trebuie să fie un număr valid."); return; }

      const finalAmount = formType === "expense" ? -Math.abs(numericAmount) : Math.abs(numericAmount);
      const url = editingTransaction ? `/api/transactions/${editingTransaction.id}` : "/api/transactions";
      const method = editingTransaction ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: formDate,
          description: formDescription,
          amount: finalAmount,
          currency: formCurrency,
          bankId: formBankId || null,
          categoryId: formCategoryId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) { setFormError(data.error); return; }

      const isEdit = !!editingTransaction;
      const editedId = editingTransaction?.id ?? null;
      const wasUncategorized = !editingTransaction?.categoryId;
      const gotCategory = !!formCategoryId;
      const savedCategoryId = formCategoryId;
      const savedDescription = formDescription;

      setShowModal(false);
      setEditingTransaction(null);
      setFormDescription(""); setFormAmount(""); setFormBankId(""); setFormCategoryId("");

      // Update optimist: dacă eram în view-ul Necategorizate și am adăugat o categorie,
      // scoatem tranzacția din listă imediat fără să așteptăm fetch-ul
      if (uncategorized && isEdit && wasUncategorized && gotCategory && editedId) {
        setTransactions((prev) => prev.filter((t) => t.id !== editedId));
      }

      await fetchTransactions();

      const msg = isEdit ? "Tranzacție actualizată!" : "Tranzacție adăugată!";
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(null), 4000);

      // Dacă am adăugat o categorie la o tranzacție fără categorie → propunem keyword
      if (isEdit && wasUncategorized && gotCategory) {
        const cat = categories.find((c) => c.id === savedCategoryId);
        if (cat) {
          setKeywordInput(savedDescription.toLowerCase().trim());
          setKeywordPrompt({
            description: savedDescription,
            categoryId: savedCategoryId,
            categoryName: cat.name,
            categoryIcon: cat.icon,
          });
        }
      }
    } catch {
      setFormError("Eroare de rețea.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleSaveKeyword = async () => {
    if (!keywordPrompt || !keywordInput.trim()) return;
    setKeywordSaving(true);
    try {
      await fetch("/api/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keywordInput.trim(), categoryId: keywordPrompt.categoryId }),
      });
    } finally {
      setKeywordSaving(false);
      setKeywordPrompt(null);
    }
  };

  const filteredCategories = categories.filter((c) =>
    formType === "expense" ? c.type === "expense" : c.type === "income"
  );

  const inputStyle = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#ffffff",
    borderRadius: "10px",
    padding: "8px 12px",
    fontSize: "13px",
    outline: "none",
    width: "100%",
  };

  const selectStyle = { ...inputStyle };

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
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-bold"
              style={{ color: "rgba(255,255,255,0.5)" }}>← Dashboard</Link>
            <div className="flex items-center gap-2">
              <span className="text-xl">💳</span>
              <span className="text-lg font-bold" style={{ color: "#ffffff" }}>Tranzacții</span>
            </div>
          </div>
          <button onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-xl text-sm font-bold"
            style={{
              background: "linear-gradient(135deg, #14b8a6, #f97316)",
              color: "#ffffff",
              boxShadow: "0 4px 15px rgba(20,184,166,0.3)",
            }}>
            + Adaugă tranzacție
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

        {/* Filtre */}
        <div className="rounded-2xl p-4 mb-6"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase"
                style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em" }}>
                Filtre
              </span>
              <button
                onClick={() => { setUncategorized(!uncategorized); setCategoryId(""); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={uncategorized ? {
                  background: "rgba(251,191,36,0.2)",
                  border: "1px solid rgba(251,191,36,0.4)",
                  color: "#fbbf24",
                } : {
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.45)",
                }}>
                ⚠ Necategorizate
              </button>
              <button
                onClick={handleRecategorize}
                disabled={recategorizing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: recategorizing ? "rgba(20,184,166,0.1)" : "rgba(20,184,166,0.15)",
                  border: "1px solid rgba(20,184,166,0.3)",
                  color: recategorizing ? "rgba(45,212,191,0.5)" : "#2dd4bf",
                  cursor: recategorizing ? "not-allowed" : "pointer",
                }}>
                {recategorizing ? "Se procesează..." : "⚡ Re-categorizeaza"}
              </button>
            </div>
            {hasFilters && (
              <button onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}>
                ✕ Resetează filtrele
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Căutare */}
            <input
              type="text"
              placeholder="🔍 Caută descriere..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={inputStyle}
            />

            {/* Bancă */}
            <select value={bankId} onChange={(e) => setBankId(e.target.value)} style={selectStyle}>
              <option value="" style={{ background: "#1e293b", color: "rgba(255,255,255,0.5)" }}>🏦 Toate băncile</option>
              {banks.map((b) => (
                <option key={b.id} value={b.id} style={{ background: "#1e293b", color: "#ffffff" }}>{b.name}</option>
              ))}
            </select>

            {/* Categorie */}
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={selectStyle}>
              <option value="" style={{ background: "#1e293b", color: "rgba(255,255,255,0.5)" }}>📁 Toate categoriile</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id} style={{ background: "#1e293b", color: "#ffffff" }}>{c.icon} {c.name}</option>
              ))}
            </select>

            {/* Dată de */}
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              style={inputStyle} title="De la data" />

            {/* Dată până */}
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              style={inputStyle} title="Până la data" />
          </div>
        </div>

        {/* Tabel */}
        <div className="rounded-2xl overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}>
          {/* Header tabel */}
          <div className="grid items-center px-5 py-3 text-xs font-bold uppercase"
            style={{
              gridTemplateColumns: "110px 1fr 130px 140px 120px 170px",
              color: "rgba(255,255,255,0.4)",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
            }}>
            <span>Dată</span>
            <span>Descriere</span>
            <span>Bancă</span>
            <span>Categorie</span>
            <span className="text-right">Sumă</span>
            <span></span>
          </div>

          {/* Rânduri */}
          {loading ? (
            <div className="py-16 text-center text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
              Se încarcă...
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-16 text-center">
              <span className="text-4xl">💳</span>
              <p className="font-bold mt-3" style={{ color: "#ffffff" }}>
                {hasFilters ? "Nicio tranzacție găsită" : "Nu ai tranzacții încă"}
              </p>
              <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                {hasFilters ? "Încearcă alte filtre." : "Adaugă prima tranzacție sau importă un extras bancar."}
              </p>
            </div>
          ) : (
            transactions.map((t, i) => (
              <div key={t.id}
                className="grid items-center px-5 py-4"
                style={{
                  gridTemplateColumns: "110px 1fr 130px 140px 120px 170px",
                  borderBottom: i < transactions.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                }}>
                {/* Dată */}
                <span className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {formatDate(t.date)}
                </span>

                {/* Descriere */}
                <span className="text-sm font-bold pr-4 truncate" style={{ color: "#ffffff" }}
                  title={t.description}>
                  {t.description}
                </span>

                {/* Bancă */}
                <div>
                  {t.bankName ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold"
                      style={{
                        background: (t.bankColor || "#6366f1") + "22",
                        border: `1px solid ${(t.bankColor || "#6366f1")}44`,
                        color: t.bankColor || "#6366f1",
                      }}>
                      <span className="w-2 h-2 rounded-full inline-block"
                        style={{ background: t.bankColor || "#6366f1" }} />
                      {t.bankName}
                    </span>
                  ) : (
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>—</span>
                  )}
                </div>

                {/* Categorie */}
                <div>
                  {t.categoryName ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold"
                      style={{
                        background: (t.categoryColor || "#6366f1") + "22",
                        color: t.categoryColor || "#6366f1",
                      }}>
                      {t.categoryIcon} {t.categoryName}
                    </span>
                  ) : (
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>—</span>
                  )}
                </div>

                {/* Sumă */}
                <span className="text-sm font-bold text-right"
                  style={{ color: t.amount >= 0 ? "#2dd4bf" : "#f87171" }}>
                  {formatAmount(t.amount, t.currency)}
                </span>

                {/* Acțiuni */}
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => openEdit(t)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{ background: "rgba(20,184,166,0.15)", color: "#2dd4bf", border: "1px solid rgba(20,184,166,0.3)" }}>
                    Editează
                  </button>
                  <button onClick={() => setDeletingId(t.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}>
                    Șterge
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sumar */}
        {transactions.length > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm"
            style={{ color: "rgba(255,255,255,0.4)" }}>
            <span>{transactions.length} tranzacții</span>
            <span>
              Total:{" "}
              <span style={{
                color: transactions.reduce((s, t) => s + Number(t.amount), 0) >= 0 ? "#2dd4bf" : "#f87171",
                fontWeight: "bold",
              }}>
                {formatAmount(transactions.reduce((s, t) => s + Number(t.amount), 0), transactions[0]?.currency || "RON")}
              </span>
            </span>
          </div>
        )}
      </main>

      {/* Modal adăugare */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
            style={{
              background: "rgba(15,23,42,0.97)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
            }}>
            <h2 className="text-lg font-bold mb-5" style={{ color: "#ffffff" }}>
              {editingTransaction ? "Editează tranzacție" : "Adaugă tranzacție"}
            </h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Tip cheltuială/venit */}
              <div className="flex gap-2">
                <button type="button" onClick={() => { setFormType("expense"); setFormCategoryId(""); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                  style={{
                    background: formType === "expense" ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.05)",
                    border: formType === "expense" ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(255,255,255,0.1)",
                    color: formType === "expense" ? "#f87171" : "rgba(255,255,255,0.5)",
                  }}>
                  📉 Cheltuială
                </button>
                <button type="button" onClick={() => { setFormType("income"); setFormCategoryId(""); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                  style={{
                    background: formType === "income" ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.05)",
                    border: formType === "income" ? "1px solid rgba(34,197,94,0.4)" : "1px solid rgba(255,255,255,0.1)",
                    color: formType === "income" ? "#4ade80" : "rgba(255,255,255,0.5)",
                  }}>
                  📈 Venit
                </button>
              </div>

              {/* Dată */}
              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: "#2dd4bf" }}>Dată</label>
                <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)}
                  required className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#ffffff" }} />
              </div>

              {/* Descriere */}
              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: "#2dd4bf" }}>Descriere</label>
                <input type="text" value={formDescription} onChange={(e) => setFormDescription(e.target.value)}
                  required placeholder="ex: Cumpărături Mega Image"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#ffffff" }} />
              </div>

              {/* Sumă + valută */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-bold mb-1" style={{ color: "#2dd4bf" }}>Sumă</label>
                  <input type="text" value={formAmount} onChange={(e) => setFormAmount(e.target.value)}
                    required placeholder="0.00"
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#ffffff" }} />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1" style={{ color: "#2dd4bf" }}>Valută</label>
                  <select value={formCurrency} onChange={(e) => setFormCurrency(e.target.value)}
                    className="rounded-xl px-4 py-3 text-sm outline-none"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#ffffff" }}>
                    <option value="RON" style={{ background: "#1e293b", color: "#ffffff" }}>RON</option>
                    <option value="EUR" style={{ background: "#1e293b", color: "#ffffff" }}>EUR</option>
                    <option value="USD" style={{ background: "#1e293b", color: "#ffffff" }}>USD</option>
                    <option value="GBP" style={{ background: "#1e293b", color: "#ffffff" }}>GBP</option>
                  </select>
                </div>
              </div>

              {/* Bancă */}
              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: "#2dd4bf" }}>Bancă <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: "normal" }}>(opțional)</span></label>
                <select value={formBankId} onChange={(e) => setFormBankId(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#ffffff" }}>
                  <option value="" style={{ background: "#1e293b", color: "rgba(255,255,255,0.5)" }}>— Fără bancă —</option>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id} style={{ background: "#1e293b", color: "#ffffff" }}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Categorie */}
              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: "#2dd4bf" }}>Categorie <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: "normal" }}>(opțional)</span></label>
                <select value={formCategoryId} onChange={(e) => setFormCategoryId(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#ffffff" }}>
                  <option value="" style={{ background: "#1e293b", color: "rgba(255,255,255,0.5)" }}>— Fără categorie —</option>
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.id} style={{ background: "#1e293b", color: "#ffffff" }}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>

              {formError && (
                <div className="rounded-xl px-4 py-3 text-sm"
                  style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}>
                  {formError}
                </div>
              )}

              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => { setShowModal(false); setEditingTransaction(null); }}
                  className="flex-1 py-3 rounded-xl text-sm font-bold"
                  style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}>
                  Anulează
                </button>
                <button type="submit" disabled={formLoading}
                  className="flex-1 py-3 rounded-xl text-sm font-bold"
                  style={{
                    background: formLoading ? "rgba(20,184,166,0.4)" : "linear-gradient(135deg, #14b8a6, #f97316)",
                    color: "#ffffff",
                  }}>
                  {formLoading ? "Se salvează..." : editingTransaction ? "Salvează" : "Adaugă"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Prompt salvare keyword pentru auto-categorizare */}
      {keywordPrompt && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-md rounded-2xl p-5"
            style={{
              background: "rgba(15,23,42,0.98)",
              border: "1px solid rgba(251,191,36,0.3)",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
            }}>
            <div className="flex items-start gap-3 mb-4">
              <span className="text-2xl">🏷</span>
              <div>
                <p className="font-bold text-sm" style={{ color: "#ffffff" }}>
                  Salvează pentru auto-categorizare?
                </p>
                <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Data viitoare când importi tranzacții cu acest cuvânt cheie, vor fi categorisite automat ca{" "}
                  <span style={{ color: "#fbbf24" }}>{keywordPrompt.categoryIcon} {keywordPrompt.categoryName}</span>.
                </p>
              </div>
            </div>
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              placeholder="Cuvânt cheie (ex: kaufland, netflix)"
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none mb-4"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#ffffff",
              }}
            />
            <div className="flex gap-3">
              <button onClick={() => setKeywordPrompt(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
                Nu, mulțumesc
              </button>
              <button onClick={handleSaveKeyword} disabled={keywordSaving || !keywordInput.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                style={{
                  background: keywordInput.trim() ? "linear-gradient(135deg, #f59e0b, #f97316)" : "rgba(255,255,255,0.06)",
                  color: keywordInput.trim() ? "#ffffff" : "rgba(255,255,255,0.3)",
                }}>
                {keywordSaving ? "Se salvează..." : "🏷 Salvează keyword"}
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
            style={{
              background: "rgba(15,23,42,0.97)",
              border: "1px solid rgba(239,68,68,0.3)",
              boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
            }}>
            <h2 className="text-lg font-bold mb-2" style={{ color: "#ffffff" }}>Ștergi tranzacția?</h2>
            <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>
              Această acțiune este ireversibilă.
            </p>
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
