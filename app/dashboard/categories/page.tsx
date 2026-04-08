"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardNav from "@/app/dashboard/nav";

interface Category {
  id: string;
  name: string;
  type: string;
  color: string;
  icon: string;
  description: string | null;
  isSystemCategory: boolean | null;
}

const COLORS = [
  "#14b8a6", "#f97316", "#6366f1", "#ec4899",
  "#22c55e", "#eab308", "#ef4444", "#8b5cf6",
  "#0ea5e9", "#64748b",
];

const ICONS_INCOME = ["💰", "💵", "💼", "📈", "🏠", "🎁", "💳", "🏦", "💹", "🤝"];
const ICONS_EXPENSE = ["🛒", "🍔", "🍽️", "🚗", "🏠", "💊", "🎬", "✈️", "👗", "📱", "⚡", "🎓", "🏫", "🎒", "🖍️", "🐾", "💪", "🎮", "☕", "🎭", "🎪", "🎵", "🎤", "🍿", "🎻"];

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"expense" | "income">("expense");

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<"expense" | "income">("expense");
  const [formColor, setFormColor] = useState("#14b8a6");
  const [formIcon, setFormIcon] = useState("📁");
  const [formDescription, setFormDescription] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Mesaj succes + validare inline + eroare ștergere
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Confirmare ștergere
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.status === 401) { router.push("/login"); return; }
      const data = await res.json();
      setCategories(data.categories || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const openAdd = (type: "expense" | "income") => {
    setEditingCategory(null);
    setFormName("");
    setFormType(type);
    setFormColor(type === "income" ? "#22c55e" : "#ef4444");
    setFormIcon(type === "income" ? "💰" : "🛒");
    setFormDescription("");
    setFormError(null);
    setNameError(null);
    setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormType(cat.type as "expense" | "income");
    setFormColor(cat.color || "#14b8a6");
    setFormIcon(cat.icon || "📁");
    setFormDescription(cat.description || "");
    setFormError(null);
    setNameError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormError(null);
    setNameError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim()) {
      setNameError("Numele este obligatoriu");
      return;
    }
    setNameError(null);
    setFormLoading(true);

    try {
      const url = editingCategory ? `/api/categories/${editingCategory.id}` : "/api/categories";
      const method = editingCategory ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          type: formType,
          color: formColor,
          icon: formIcon,
          description: formDescription || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) { setFormError(data.error); return; }

      const savedName = formName.trim();
      await fetchCategories();
      closeModal();

      const msg = editingCategory
        ? `Categorie "${savedName}" actualizată!`
        : `Categorie "${savedName}" adăugată!`;
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
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setDeletingId(null);
        setDeleteError(data.error);
        setTimeout(() => setDeleteError(null), 4000);
        return;
      }
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const incomeCategories = categories.filter((c) => c.type === "income");
  const currentList = activeTab === "expense" ? expenseCategories : incomeCategories;
  const currentIcons = activeTab === "income" ? ICONS_INCOME : ICONS_EXPENSE;

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
              <span className="text-xl">📁</span>
              <span className="text-lg font-bold" style={{ color: "#ffffff" }}>Categorii</span>
            </div>
          </div>
          <button onClick={() => openAdd(activeTab)}
            className="px-4 py-2 rounded-xl text-sm font-bold"
            style={{
              background: "linear-gradient(135deg, #14b8a6, #f97316)",
              color: "#ffffff",
              boxShadow: "0 4px 15px rgba(20,184,166,0.3)",
            }}>
            + Adaugă categorie
          </button>
        </div>
      </header>
      <DashboardNav />

      {/* Mesaje feedback */}
      {successMessage && (
        <div className="relative z-20 container mx-auto px-4 pt-4">
          <div className="rounded-xl px-4 py-3 flex items-center gap-3 text-sm font-bold"
            style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.35)", color: "#4ade80" }}>
            <span>✅</span><span>{successMessage}</span>
          </div>
        </div>
      )}
      {deleteError && (
        <div className="relative z-20 container mx-auto px-4 pt-4">
          <div className="rounded-xl px-4 py-3 flex items-center gap-3 text-sm font-bold"
            style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}>
            <span>⚠</span><span>{deleteError}</span>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-8 relative z-10">

        {/* Tab-uri Cheltuieli / Venituri */}
        <div className="flex gap-2 mb-8 p-1 rounded-xl w-fit"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <button
            onClick={() => setActiveTab("expense")}
            className="px-6 py-2 rounded-lg text-sm font-bold transition-all"
            style={{
              background: activeTab === "expense" ? "rgba(239,68,68,0.2)" : "transparent",
              color: activeTab === "expense" ? "#f87171" : "rgba(255,255,255,0.5)",
              border: activeTab === "expense" ? "1px solid rgba(239,68,68,0.3)" : "1px solid transparent",
            }}>
            📉 Cheltuieli ({expenseCategories.length})
          </button>
          <button
            onClick={() => setActiveTab("income")}
            className="px-6 py-2 rounded-lg text-sm font-bold transition-all"
            style={{
              background: activeTab === "income" ? "rgba(34,197,94,0.2)" : "transparent",
              color: activeTab === "income" ? "#4ade80" : "rgba(255,255,255,0.5)",
              border: activeTab === "income" ? "1px solid rgba(34,197,94,0.3)" : "1px solid transparent",
            }}>
            📈 Venituri ({incomeCategories.length})
          </button>
        </div>

        {/* Lista categorii */}
        {loading ? (
          <div className="text-center py-16" style={{ color: "rgba(255,255,255,0.5)" }}>Se încarcă...</div>
        ) : currentList.length === 0 ? (
          <div className="rounded-2xl p-12 text-center"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}>
            <span className="text-5xl">{activeTab === "expense" ? "📉" : "📈"}</span>
            <p className="font-bold mt-4 text-lg" style={{ color: "#ffffff" }}>
              Nu ai categorii de {activeTab === "expense" ? "cheltuieli" : "venituri"}
            </p>
            <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.45)" }}>
              Adaugă categorii pentru a organiza tranzacțiile.
            </p>
            <button onClick={() => openAdd(activeTab)}
              className="mt-6 px-6 py-3 rounded-xl text-sm font-bold"
              style={{ background: "linear-gradient(135deg, #14b8a6, #f97316)", color: "#ffffff" }}>
              + Adaugă categorie
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentList.map((cat) => (
              <div key={cat.id} className="rounded-2xl p-5 flex items-center justify-between"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  backdropFilter: "blur(16px)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}>
                <div className="flex items-center gap-4">
                  {/* Icon + culoare */}
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{ background: cat.color + "22", border: `2px solid ${cat.color}` }}>
                    {cat.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold" style={{ color: "#ffffff" }}>{cat.name}</p>
                      {cat.isSystemCategory && (
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}>
                          sistem
                        </span>
                      )}
                    </div>
                    {cat.description && (
                      <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                        {cat.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Acțiuni */}
                <div className="flex items-center gap-2">
                  <button onClick={() => openEdit(cat)}
                    className="p-2 rounded-lg transition-all"
                    style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}>
                    ✏️
                  </button>
                  <button
                    onClick={() => !cat.isSystemCategory && setDeletingId(cat.id)}
                    disabled={!!cat.isSystemCategory}
                    title={cat.isSystemCategory ? "Categoriile predefinite nu pot fi șterse" : "Șterge categoria"}
                    className="p-2 rounded-lg transition-all"
                    style={{
                      background: cat.isSystemCategory ? "rgba(255,255,255,0.03)" : "rgba(239,68,68,0.1)",
                      color: cat.isSystemCategory ? "rgba(255,255,255,0.2)" : "#f87171",
                      cursor: cat.isSystemCategory ? "not-allowed" : "pointer",
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
          <div className="w-full max-w-sm rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
            style={{
              background: "rgba(15,23,42,0.97)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
            }}>
            <h2 className="text-lg font-bold mb-5" style={{ color: "#ffffff" }}>
              {editingCategory ? "Editează categoria" : "Categorie nouă"}
            </h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Tip (doar la adăugare) */}
              {!editingCategory && (
                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color: "#2dd4bf" }}>Tip</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setFormType("expense"); setFormIcon("🛒"); setFormColor("#ef4444"); }}
                      className="flex-1 py-2 rounded-xl text-sm font-bold transition-all"
                      style={{
                        background: formType === "expense" ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.05)",
                        border: formType === "expense" ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(255,255,255,0.1)",
                        color: formType === "expense" ? "#f87171" : "rgba(255,255,255,0.5)",
                      }}>
                      📉 Cheltuială
                    </button>
                    <button type="button" onClick={() => { setFormType("income"); setFormIcon("💰"); setFormColor("#22c55e"); }}
                      className="flex-1 py-2 rounded-xl text-sm font-bold transition-all"
                      style={{
                        background: formType === "income" ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.05)",
                        border: formType === "income" ? "1px solid rgba(34,197,94,0.4)" : "1px solid rgba(255,255,255,0.1)",
                        color: formType === "income" ? "#4ade80" : "rgba(255,255,255,0.5)",
                      }}>
                      📈 Venit
                    </button>
                  </div>
                </div>
              )}

              {/* Nume */}
              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: "#2dd4bf" }}>Nume</label>
                <input type="text" value={formName}
                  onChange={(e) => { setFormName(e.target.value); if (nameError) setNameError(null); }}
                  autoFocus placeholder="ex: Mâncare, Salariu, Transport"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: nameError ? "1px solid rgba(239,68,68,0.6)" : "1px solid rgba(255,255,255,0.15)",
                    color: "#ffffff",
                  }} />
                {nameError && <p className="text-xs mt-1.5" style={{ color: "#f87171" }}>⚠ {nameError}</p>}
              </div>

              {/* Descriere */}
              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: "#2dd4bf" }}>
                  Descriere <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: "normal" }}>(opțional)</span>
                </label>
                <input type="text" value={formDescription} onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="ex: Supermarket, restaurant, livrare"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#ffffff",
                  }} />
              </div>

              {/* Icon */}
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: "#2dd4bf" }}>Icon</label>
                <div className="flex flex-wrap gap-2">
                  {currentIcons.map((icon) => (
                    <button key={icon} type="button" onClick={() => setFormIcon(icon)}
                      className="w-10 h-10 rounded-xl text-xl transition-all"
                      style={{
                        background: formIcon === icon ? "rgba(20,184,166,0.2)" : "rgba(255,255,255,0.05)",
                        border: formIcon === icon ? "2px solid #14b8a6" : "2px solid transparent",
                      }}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Culoare */}
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: "#2dd4bf" }}>Culoare</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setFormColor(c)}
                      className="w-8 h-8 rounded-full transition-all"
                      style={{
                        background: c,
                        outline: formColor === c ? "3px solid white" : "none",
                        outlineOffset: "2px",
                      }} />
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
                  style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}>
                  Anulează
                </button>
                <button type="submit" disabled={formLoading}
                  className="flex-1 py-3 rounded-xl text-sm font-bold"
                  style={{
                    background: formLoading ? "rgba(20,184,166,0.4)" : "linear-gradient(135deg, #14b8a6, #f97316)",
                    color: "#ffffff",
                  }}>
                  {formLoading ? "Se salvează..." : editingCategory ? "Salvează" : "Adaugă"}
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
              background: "rgba(15,23,42,0.97)",
              border: "1px solid rgba(239,68,68,0.3)",
              boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
            }}>
            <h2 className="text-lg font-bold mb-2" style={{ color: "#ffffff" }}>Ștergi categoria?</h2>
            <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>
              Tranzacțiile asociate nu vor fi șterse, doar categoria va fi eliminată.
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
