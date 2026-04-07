"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardNav from "@/app/dashboard/nav";
import { parseCSV, parseExcel, type ParsedTransaction } from "@/lib/utils/file-parser";

interface Bank { id: string; name: string; color: string; }

function formatAmount(amount: number, currency: string) {
  const formatted = new Intl.NumberFormat("ro-RO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
  return `${amount < 0 ? "-" : "+"}${formatted} ${currency}`;
}

export default function UploadPage() {
  const router = useRouter();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [selectedBankId, setSelectedBankId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stare parsare
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);

  // Stare import
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ imported: number; categorized: number; skipped: number } | null>(null);

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const res = await fetch("/api/banks");
        if (res.status === 401) { router.push("/login"); return; }
        const data = await res.json();
        setBanks(data.banks || []);
      } catch (err) {
        console.error("[UPLOAD] Failed to fetch banks:", err);
      }
    };
    fetchBanks();
  }, [router]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setParseError(null);
    setParsedTransactions([]);

    if (!file) return;

    setParsing(true);
    try {
      const isExcel = /\.(xlsx?|xls)$/i.test(file.name);
      const result = isExcel ? await parseExcel(file) : await parseCSV(file);

      if (!result.success) {
        setParseError(result.error || "Nu s-a putut citi fișierul.");
      } else if (result.transactions.length === 0) {
        setParseError("Fișierul nu conține tranzacții valide.");
      } else {
        setParsedTransactions(result.transactions);
      }
    } catch (err) {
      setParseError("Eroare neașteptată la citirea fișierului.");
      console.error("[UPLOAD] Parse error:", err);
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!parsedTransactions.length || !selectedBankId) return;
    setImporting(true);
    setImportError(null);
    setImportResult(null);

    try {
      const res = await fetch("/api/transactions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactions: parsedTransactions.map((t) => ({
            date: t.date,
            description: t.description,
            amount: t.amount,
            currency: t.currency || "RON",
            bankId: selectedBankId,
            type: t.type,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setImportError(data.error || "Eroare la import.");
        return;
      }

      setImportResult({ imported: data.imported, categorized: data.categorized, skipped: data.skipped ?? 0 });
    } catch {
      setImportError("Eroare de rețea. Încearcă din nou.");
    } finally {
      setImporting(false);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setParsedTransactions([]);
    setParseError(null);
    setImportResult(null);
    setImportError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
            <span className="text-xl">📤</span>
            <span className="text-lg font-bold" style={{ color: "#ffffff" }}>Import extras bancar</span>
          </div>
        </div>
      </header>
      <DashboardNav />

      <main className="container mx-auto px-4 py-8 relative z-10 max-w-3xl">

        {/* Form */}
        <div className="rounded-2xl p-6 mb-6"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}>
          <div className="flex flex-col gap-5">

            {/* File input */}
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: "#2dd4bf" }}>
                Fișier CSV sau Excel
              </label>
              <div
                onClick={() => !parsing && fileInputRef.current?.click()}
                className="rounded-xl px-4 py-3 flex items-center justify-between"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: parseError
                    ? "1px solid rgba(239,68,68,0.4)"
                    : parsedTransactions.length > 0
                    ? "1px solid rgba(20,184,166,0.4)"
                    : "1px solid rgba(255,255,255,0.15)",
                  cursor: parsing ? "wait" : "pointer",
                }}>
                <span className="text-sm" style={{ color: selectedFile ? "#ffffff" : "rgba(255,255,255,0.35)" }}>
                  {parsing
                    ? "Se procesează fișierul..."
                    : selectedFile
                    ? `${selectedFile.name} — ${formatSize(selectedFile.size)}`
                    : "Alege fișier..."}
                </span>
                {parsing ? (
                  <span className="text-xs px-3 py-1.5 rounded-lg font-bold animate-pulse"
                    style={{ background: "rgba(20,184,166,0.15)", color: "#2dd4bf" }}>
                    ⏳ Citire...
                  </span>
                ) : (
                  <span className="text-xs px-3 py-1.5 rounded-lg font-bold"
                    style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}>
                    Alege fișier
                  </span>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xls,.xlsx"
                onChange={handleFileChange}
                className="hidden"
              />
              <p className="text-xs mt-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                Formate acceptate: .csv, .xls, .xlsx
              </p>
            </div>

            {/* Loading indicator */}
            {parsing && (
              <div className="rounded-xl px-4 py-3 flex items-center gap-3 text-sm"
                style={{
                  background: "rgba(20,184,166,0.08)",
                  border: "1px solid rgba(20,184,166,0.2)",
                  color: "#2dd4bf",
                }}>
                <span className="animate-spin">⏳</span>
                <span>Se citește fișierul și se detectează coloanele...</span>
              </div>
            )}

            {/* Eroare parsare */}
            {parseError && (
              <div className="rounded-xl px-4 py-3 text-sm"
                style={{
                  background: "rgba(239,68,68,0.12)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: "#fca5a5",
                }}>
                ⚠ {parseError}
              </div>
            )}

            {/* Succes parsare */}
            {parsedTransactions.length > 0 && !parsing && (
              <div className="rounded-xl px-4 py-3 flex items-center gap-3 text-sm font-bold"
                style={{
                  background: "rgba(34,197,94,0.1)",
                  border: "1px solid rgba(34,197,94,0.25)",
                  color: "#4ade80",
                }}>
                <span>✅</span>
                <span>{parsedTransactions.length} tranzacții detectate — verifică preview-ul de mai jos</span>
              </div>
            )}

            {/* Dropdown bancă */}
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: "#2dd4bf" }}>
                Bancă
              </label>
              <select
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: selectedBankId ? "#ffffff" : "rgba(255,255,255,0.35)",
                }}>
                <option value="" style={{ background: "#1e293b", color: "rgba(255,255,255,0.5)" }}>— Selectează banca —</option>
                {banks.map((b) => (
                  <option key={b.id} value={b.id} style={{ background: "#1e293b", color: "#ffffff" }}>{b.name}</option>
                ))}
              </select>
              {banks.length === 0 && (
                <p className="text-xs mt-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                  Nu ai bănci adăugate.{" "}
                  <Link href="/dashboard/banks" style={{ color: "#2dd4bf" }}>Adaugă →</Link>
                </p>
              )}
            </div>

            {/* Eroare import */}
            {importError && (
              <div className="rounded-xl px-4 py-3 text-sm"
                style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}>
                ⚠ {importError}
              </div>
            )}

            {/* Buton Import */}
            <button
              type="button"
              onClick={handleImport}
              disabled={parsedTransactions.length === 0 || parsing || importing || !selectedBankId}
              className="w-full py-3.5 rounded-xl text-sm font-bold"
              style={{
                background: parsedTransactions.length > 0 && !parsing && !importing && selectedBankId
                  ? "linear-gradient(135deg, #14b8a6, #f97316)"
                  : "rgba(255,255,255,0.06)",
                color: parsedTransactions.length > 0 && !parsing && !importing && selectedBankId
                  ? "#ffffff" : "rgba(255,255,255,0.3)",
                cursor: parsedTransactions.length > 0 && !parsing && !importing && selectedBankId
                  ? "pointer" : "not-allowed",
                boxShadow: parsedTransactions.length > 0 && !parsing && !importing && selectedBankId
                  ? "0 4px 15px rgba(20,184,166,0.3)" : "none",
              }}>
              {importing
                ? "⏳ Se importă..."
                : `📤 Importă ${parsedTransactions.length > 0 ? `${parsedTransactions.length} tranzacții` : ""}`}
            </button>
            {parsedTransactions.length > 0 && !selectedBankId && (
              <p className="text-xs text-center -mt-2" style={{ color: "rgba(255,255,255,0.3)" }}>
                Selectează o bancă pentru a putea importa
              </p>
            )}
          </div>
        </div>

        {/* Rezultat import */}
        {importResult && (
          <div className="rounded-2xl p-6 mb-6"
            style={{
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.25)",
            }}>
            <div className="flex items-start gap-4">
              <span className="text-3xl">✅</span>
              <div className="flex-1">
                <p className="text-lg font-bold" style={{ color: "#4ade80" }}>
                  Import finalizat cu succes!
                </p>
                <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>
                  <span style={{ color: "#ffffff", fontWeight: "bold" }}>{importResult.imported} tranzacții</span> importate
                  {importResult.categorized > 0 && (
                    <>, <span style={{ color: "#2dd4bf", fontWeight: "bold" }}>{importResult.categorized} categorizate</span> automat</>
                  )}
                  {importResult.skipped > 0 && (
                    <>, <span style={{ color: "rgba(255,255,255,0.45)", fontWeight: "bold" }}>{importResult.skipped} duplicate ignorate</span></>
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={resetUpload}
                className="flex-1 py-3 rounded-xl text-sm font-bold"
                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}>
                📂 Încarcă alt fișier
              </button>
              <button onClick={() => router.push("/dashboard/transactions")}
                className="flex-1 py-3 rounded-xl text-sm font-bold"
                style={{
                  background: "linear-gradient(135deg, #14b8a6, #f97316)",
                  color: "#ffffff",
                  boxShadow: "0 4px 15px rgba(20,184,166,0.3)",
                }}>
                💳 Vezi tranzacțiile
              </button>
            </div>
          </div>
        )}

        {/* Preview tabel */}
        <div className="rounded-2xl overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}>
          <div className="px-5 py-3 flex items-center justify-between"
            style={{
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
            }}>
            <span className="text-xs font-bold uppercase"
              style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em" }}>
              Preview tranzacții
            </span>
            <span className="text-xs px-2 py-1 rounded-lg"
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)" }}>
              {parsedTransactions.length} rânduri
            </span>
          </div>

          {/* Header coloane */}
          <div className="grid px-5 py-3 text-xs font-bold uppercase"
            style={{
              gridTemplateColumns: "110px 1fr 130px 80px",
              color: "rgba(255,255,255,0.3)",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}>
            <span>Dată</span>
            <span>Descriere</span>
            <span className="text-right">Sumă</span>
            <span className="text-right">Valută</span>
          </div>

          {/* Rânduri */}
          {parsing ? (
            <div className="py-12 text-center text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
              Se procesează...
            </div>
          ) : parsedTransactions.length === 0 ? (
            <div className="py-16 text-center">
              <span className="text-4xl">📋</span>
              <p className="font-bold mt-3" style={{ color: "rgba(255,255,255,0.5)" }}>
                Nicio dată de afișat
              </p>
              <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>
                Selectează un fișier CSV sau Excel pentru a vedea preview-ul.
              </p>
            </div>
          ) : (
            <div>
              {parsedTransactions.slice(0, 10).map((t, i) => (
                <div key={i}
                  className="grid items-center px-5 py-3"
                  style={{
                    gridTemplateColumns: "110px 1fr 130px 80px",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}>
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{t.date}</span>
                  <span className="text-sm truncate pr-4" style={{ color: "#ffffff" }} title={t.description}>
                    {t.description}
                  </span>
                  <span className="text-sm font-bold text-right"
                    style={{ color: t.amount >= 0 ? "#2dd4bf" : "#f87171" }}>
                    {formatAmount(t.amount, t.currency || "RON")}
                  </span>
                  <span className="text-xs text-right" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {t.currency || "RON"}
                  </span>
                </div>
              ))}
              {/* Footer tabel */}
              <div className="px-5 py-3 flex items-center justify-between"
                style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Total: <span style={{ color: "#ffffff", fontWeight: "bold" }}>{parsedTransactions.length} tranzacții</span> găsite în fișier
                </span>
                {parsedTransactions.length > 10 && (
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                    ...și încă {parsedTransactions.length - 10} tranzacții
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
