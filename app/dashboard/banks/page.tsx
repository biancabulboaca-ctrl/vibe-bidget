"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardNav from "@/app/dashboard/nav";

interface Bank {
  id: string;
  name: string;
  color: string;
}

const COLORS = [
  { value: "#14b8a6", label: "Teal" },
  { value: "#f97316", label: "Portocaliu" },
  { value: "#6366f1", label: "Indigo" },
  { value: "#ec4899", label: "Roz" },
  { value: "#22c55e", label: "Verde" },
  { value: "#eab308", label: "Galben" },
  { value: "#ef4444", label: "Roșu" },
  { value: "#8b5cf6", label: "Violet" },
];

export default function BanksPage() {
  const router = useRouter();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal adăugare/editare
  const [showModal, setShowModal] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [formName, setFormName] = useState("");
  const [formColor, setFormColor] = useState("#14b8a6");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Validare inline + mesaj succes
  const [nameError, setNameError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Confirmare ștergere
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchBanks();
  }, []);

  const fetchBanks = async () => {
    try {
      const res = await fetch("/api/banks");
      if (res.status === 401) { router.push("/login"); return; }
      const data = await res.json();
      setBanks(data.banks || []);
    } catch {
      setError("Nu s-au putut încărca băncile.");
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditingBank(null);
    setFormName("");
    setFormColor("#14b8a6");
    setFormError(null);
    setNameError(null);
    setShowModal(true);
  };

  const openEdit = (bank: Bank) => {
    setEditingBank(bank);
    setFormName(bank.name);
    setFormColor(bank.color || "#14b8a6");
    setFormError(null);
    setNameError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingBank(null);
    setFormError(null);
    setNameError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validare inline
    if (!formName.trim()) {
      setNameError("Numele este obligatoriu");
      return;
    }
    setNameError(null);
    setFormLoading(true);

    try {
      const url = editingBank ? `/api/banks/${editingBank.id}` : "/api/banks";
      const method = editingBank ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName.trim(), color: formColor }),
      });

      const data = await res.json();
      if (!res.ok) { setFormError(data.error); return; }

      const savedName = formName.trim();
      await fetchBanks();
      closeModal();

      // Mesaj succes
      const msg = editingBank
        ? `Bancă "${savedName}" actualizată!`
        : `Bancă "${savedName}" adăugată!`;
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch {
      setFormError("Eroare de rețea.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/banks/${id}`, { method: "DELETE" });
      setBanks((prev) => prev.filter((b) => b.id !== id));
    } catch {
      setError("Eroare la ștergere.");
    } finally {
      setDeletingId(null);
    }
  };

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
            <Link href="/dashboard" className="text-sm font-bold transition-colors"
              style={{ color: "rgba(255,255,255,0.5)" }}>
              ← Dashboard
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-xl">🏦</span>
              <span className="text-lg font-bold" style={{ color: "#ffffff" }}>Băncile mele</span>
            </div>
          </div>
          <button onClick={openAdd}
            className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
            style={{
              background: "linear-gradient(135deg, #14b8a6, #f97316)",
              color: "#ffffff",
              boxShadow: "0 4px 15px rgba(20,184,166,0.3)",
            }}>
            + Adaugă bancă
          </button>
        </div>
      </header>
      <DashboardNav />

      {/* Mesaj succes */}
      {successMessage && (
        <div className="relative z-20 container mx-auto px-4 pt-4">
          <div className="rounded-xl px-4 py-3 flex items-center gap-3 text-sm font-bold"
            style={{
              background: "rgba(34,197,94,0.15)",
              border: "1px solid rgba(34,197,94,0.35)",
              color: "#4ade80",
            }}>
            <span>✅</span>
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {/* Conținut */}
      <main className="container mx-auto px-4 py-8 relative z-10">
        {loading ? (
          <div className="text-center py-16" style={{ color: "rgba(255,255,255,0.5)" }}>
            Se încarcă...
          </div>
        ) : error ? (
          <div className="text-center py-16" style={{ color: "#f87171" }}>{error}</div>
        ) : banks.length === 0 ? (
          <div className="rounded-2xl p-12 text-center"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}>
            <span className="text-5xl">🏦</span>
            <p className="font-bold mt-4 text-lg" style={{ color: "#ffffff" }}>
              Nu ai bănci adăugate
            </p>
            <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.45)" }}>
              Adaugă prima ta bancă pentru a gestiona tranzacțiile.
            </p>
            <button onClick={openAdd} className="mt-6 px-6 py-3 rounded-xl text-sm font-bold"
              style={{
                background: "linear-gradient(135deg, #14b8a6, #f97316)",
                color: "#ffffff",
              }}>
              + Adaugă bancă
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {banks.map((bank) => (
              <div key={bank.id} className="rounded-2xl p-6 flex items-center justify-between"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  backdropFilter: "blur(16px)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}>
                <div className="flex items-center gap-4">
                  {/* Bulă culoare */}
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold"
                    style={{ background: bank.color + "33", border: `2px solid ${bank.color}` }}>
                    <span style={{ color: bank.color }}>
                      {bank.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-bold" style={{ color: "#ffffff" }}>{bank.name}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <div className="w-3 h-3 rounded-full" style={{ background: bank.color }} />
                      <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{bank.color}</span>
                    </div>
                  </div>
                </div>

                {/* Acțiuni */}
                <div className="flex items-center gap-2">
                  <button onClick={() => openEdit(bank)}
                    className="p-2 rounded-lg text-sm transition-all"
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      color: "rgba(255,255,255,0.7)",
                    }}>
                    ✏️
                  </button>
                  <button onClick={() => setDeletingId(bank.id)}
                    className="p-2 rounded-lg text-sm transition-all"
                    style={{
                      background: "rgba(239,68,68,0.1)",
                      color: "#f87171",
                    }}>
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal adăugare/editare */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6"
            style={{
              background: "rgba(15,23,42,0.95)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
            }}>
            <h2 className="text-lg font-bold mb-6" style={{ color: "#ffffff" }}>
              {editingBank ? "Editează banca" : "Adaugă bancă nouă"}
            </h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: "#2dd4bf" }}>
                  Numele băncii
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => { setFormName(e.target.value); if (nameError) setNameError(null); }}
                  placeholder="ex: ING, BCR, Revolut"
                  autoFocus
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: nameError ? "1px solid rgba(239,68,68,0.6)" : "1px solid rgba(255,255,255,0.15)",
                    color: "#ffffff",
                  }}
                />
                {nameError && (
                  <p className="text-xs mt-1.5" style={{ color: "#f87171" }}>⚠ {nameError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: "#2dd4bf" }}>
                  Culoare
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button key={c.value} type="button"
                      onClick={() => setFormColor(c.value)}
                      className="w-8 h-8 rounded-full transition-all"
                      style={{
                        background: c.value,
                        outline: formColor === c.value ? `3px solid white` : "none",
                        outlineOffset: "2px",
                      }}
                      title={c.label}
                    />
                  ))}
                </div>
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
                <button type="button" onClick={closeModal}
                  className="flex-1 py-3 rounded-xl text-sm font-bold"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.7)",
                  }}>
                  Anulează
                </button>
                <button type="submit" disabled={formLoading}
                  className="flex-1 py-3 rounded-xl text-sm font-bold"
                  style={{
                    background: formLoading ? "rgba(20,184,166,0.4)" : "linear-gradient(135deg, #14b8a6, #f97316)",
                    color: "#ffffff",
                  }}>
                  {formLoading ? "Se salvează..." : editingBank ? "Salvează" : "Adaugă"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmare ștergere */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6"
            style={{
              background: "rgba(15,23,42,0.95)",
              border: "1px solid rgba(239,68,68,0.3)",
              boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
            }}>
            <h2 className="text-lg font-bold mb-2" style={{ color: "#ffffff" }}>Ștergi banca?</h2>
            <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>
              Această acțiune este ireversibilă. Tranzacțiile asociate nu vor fi șterse.
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
