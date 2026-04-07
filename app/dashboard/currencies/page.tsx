"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardNav from "@/app/dashboard/nav";

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
}

const PRESETS = [
  { code: "RON", name: "Leu românesc", symbol: "lei" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "USD", name: "Dolar american", symbol: "$" },
  { code: "GBP", name: "Liră sterlină", symbol: "£" },
];

export default function CurrenciesPage() {
  const router = useRouter();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingPreset, setAddingPreset] = useState<string | null>(null);

  // Formular adăugare manuală
  const [showForm, setShowForm] = useState(false);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formSymbol, setFormSymbol] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const fetchCurrencies = async () => {
    try {
      const res = await fetch("/api/currencies");
      if (res.status === 401) { router.push("/login"); return; }
      const data = await res.json();
      setCurrencies(data.currencies || []);
    } finally {
      setLoading(false);
    }
  };

  const addCurrency = async (code: string, name: string, symbol: string) => {
    const res = await fetch("/api/currencies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, name, symbol }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.currency;
  };

  const handlePreset = async (preset: typeof PRESETS[0]) => {
    const exists = currencies.some((c) => c.code === preset.code);
    if (exists) return;
    setAddingPreset(preset.code);
    try {
      const currency = await addCurrency(preset.code, preset.name, preset.symbol);
      setCurrencies((prev) => [...prev, currency]);
      showSuccess(`Valută ${preset.code} adăugată!`);
    } finally {
      setAddingPreset(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);
    try {
      const currency = await addCurrency(formCode, formName, formSymbol);
      setCurrencies((prev) => [...prev, currency]);
      setShowForm(false);
      setFormCode(""); setFormName(""); setFormSymbol("");
      showSuccess(`Valută ${currency.code} adăugată!`);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Eroare de rețea.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/currencies/${id}`, { method: "DELETE" });
    setCurrencies((prev) => prev.filter((c) => c.id !== id));
    setDeletingId(null);
  };

  const existingCodes = new Set(currencies.map((c) => c.code));

  return (
    <div className="min-h-screen relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0f172a 0%, #1a1f2e 50%, #0f172a 100%)" }}>

      {/* Blobs */}
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
              style={{ color: "rgba(255,255,255,0.5)" }}>
              ← Dashboard
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-xl">💱</span>
              <span className="text-lg font-bold" style={{ color: "#ffffff" }}>Valute</span>
            </div>
          </div>
          <button onClick={() => setShowForm(true)}
            className="px-4 py-2 rounded-xl text-sm font-bold"
            style={{
              background: "linear-gradient(135deg, #14b8a6, #f97316)",
              color: "#ffffff",
              boxShadow: "0 4px 15px rgba(20,184,166,0.3)",
            }}>
            + Adaugă valută
          </button>
        </div>
      </header>
      <DashboardNav />

      {successMessage && (
        <div className="relative z-20 container mx-auto px-4 pt-4 max-w-2xl">
          <div className="rounded-xl px-4 py-3 flex items-center gap-3 text-sm font-bold"
            style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.35)", color: "#4ade80" }}>
            <span>✅</span><span>{successMessage}</span>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-8 relative z-10 max-w-2xl">

        {/* Preseturi */}
        <div className="rounded-2xl p-5 mb-6"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}>
          <p className="text-sm font-bold mb-4" style={{ color: "rgba(255,255,255,0.6)" }}>
            Preset — valute populare
          </p>
          <div className="flex flex-wrap gap-3">
            {PRESETS.map((preset) => {
              const exists = existingCodes.has(preset.code);
              const isAdding = addingPreset === preset.code;
              return (
                <button key={preset.code}
                  onClick={() => handlePreset(preset)}
                  disabled={exists || isAdding}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                  style={{
                    background: exists
                      ? "rgba(20,184,166,0.1)"
                      : "rgba(255,255,255,0.08)",
                    border: exists
                      ? "1px solid rgba(20,184,166,0.3)"
                      : "1px solid rgba(255,255,255,0.15)",
                    color: exists ? "#2dd4bf" : "rgba(255,255,255,0.85)",
                    cursor: exists ? "default" : "pointer",
                  }}>
                  <span>{preset.symbol}</span>
                  <span>{preset.code}</span>
                  {exists && <span style={{ color: "#2dd4bf" }}>✓</span>}
                  {isAdding && <span style={{ color: "rgba(255,255,255,0.5)" }}>...</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tabel valute */}
        <div className="rounded-2xl overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}>
          {/* Header tabel */}
          <div className="grid grid-cols-4 px-5 py-3 text-xs font-bold uppercase"
            style={{
              color: "rgba(255,255,255,0.4)",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
            }}>
            <span>Cod</span>
            <span>Simbol</span>
            <span className="col-span-2">Nume</span>
          </div>

          {loading ? (
            <div className="px-5 py-8 text-center text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
              Se încarcă...
            </div>
          ) : currencies.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <span className="text-4xl">💱</span>
              <p className="font-bold mt-3" style={{ color: "#ffffff" }}>Nu ai valute adăugate</p>
              <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                Folosește butoanele Preset sau adaugă manual.
              </p>
            </div>
          ) : (
            currencies.map((c, index) => (
              <div key={c.id}
                className="grid grid-cols-4 items-center px-5 py-4"
                style={{
                  borderBottom: index < currencies.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                }}>
                <span className="font-bold text-sm" style={{ color: "#2dd4bf" }}>{c.code}</span>
                <span className="font-bold text-sm" style={{ color: "#ffffff" }}>{c.symbol}</span>
                <span className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>{c.name}</span>
                <div className="flex justify-end">
                  <button onClick={() => setDeletingId(c.id)}
                    className="p-2 rounded-lg text-sm"
                    style={{ background: "rgba(239,68,68,0.1)", color: "#f87171" }}>
                    🗑️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Modal adăugare manuală */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6"
            style={{
              background: "rgba(15,23,42,0.97)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
            }}>
            <h2 className="text-lg font-bold mb-5" style={{ color: "#ffffff" }}>Adaugă valută</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: "#2dd4bf" }}>Cod</label>
                <input type="text" value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  required maxLength={5} placeholder="ex: CHF"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#ffffff",
                  }} />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: "#2dd4bf" }}>Simbol</label>
                <input type="text" value={formSymbol}
                  onChange={(e) => setFormSymbol(e.target.value)}
                  required maxLength={5} placeholder="ex: CHF"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#ffffff",
                  }} />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: "#2dd4bf" }}>Nume</label>
                <input type="text" value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required placeholder="ex: Franc elvețian"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#ffffff",
                  }} />
              </div>
              {formError && (
                <div className="rounded-xl px-4 py-3 text-sm"
                  style={{
                    background: "rgba(239,68,68,0.15)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    color: "#fca5a5",
                  }}>
                  {formError}
                </div>
              )}
              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setShowForm(false)}
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
                  {formLoading ? "Se adaugă..." : "Adaugă"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmare ștergere */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6"
            style={{
              background: "rgba(15,23,42,0.97)",
              border: "1px solid rgba(239,68,68,0.3)",
              boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
            }}>
            <h2 className="text-lg font-bold mb-2" style={{ color: "#ffffff" }}>Ștergi valuta?</h2>
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
