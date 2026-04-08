"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠", exact: true },
  { href: "/dashboard/transactions", label: "Tranzacții", icon: "💳" },
  { href: "/dashboard/banks", label: "Bănci", icon: "🏦" },
  { href: "/dashboard/categories", label: "Categorii", icon: "📁" },
  { href: "/dashboard/currencies", label: "Valute", icon: "💱" },
  { href: "/dashboard/upload", label: "Import", icon: "📤" },
  { href: "/dashboard/reports", label: "Rapoarte", icon: "📊" },
  { href: "/dashboard/goals", label: "Obiective", icon: "🎯" },
  { href: "/dashboard/budgets", label: "Bugete", icon: "💰" },
];

interface SearchResult {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
}

function formatAmount(amount: number, currency: string) {
  const abs = new Intl.NumberFormat("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(amount));
  return `${amount < 0 ? "-" : "+"}${abs} ${currency}`;
}

export default function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Caută când query se schimbă
  useEffect(() => {
    if (!query.trim()) { setResults([]); setOpen(false); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/transactions?search=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setResults((data.transactions || []).slice(0, 8));
        setOpen(true);
      } catch { /* ignorăm */ }
      finally { setSearching(false); }
    }, 300);
  }, [query]);

  // Închide dropdown la click în afară
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleSelect = (id: string) => {
    setQuery("");
    setOpen(false);
    router.push(`/dashboard/transactions?highlight=${id}`);
  };

  const handleSearchAll = () => {
    if (!query.trim()) return;
    setOpen(false);
    router.push(`/dashboard/transactions?search=${encodeURIComponent(query.trim())}`);
    setQuery("");
  };

  return (
    <nav className="relative z-10"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-1">

          {/* Nav items — scrollabil pe mobile */}
          <div className="flex items-center gap-1 overflow-x-auto flex-1"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {NAV_ITEMS.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href}
                  className="flex items-center gap-1.5 px-3 py-3 text-xs font-bold whitespace-nowrap transition-all"
                  style={{
                    color: active ? "#2dd4bf" : "rgba(255,255,255,0.45)",
                    borderBottom: active ? "2px solid #14b8a6" : "2px solid transparent",
                  }}>
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Search global */}
          <div ref={containerRef} className="relative shrink-0 ml-2">
            <div className="flex items-center gap-2 rounded-xl px-3 py-1.5"
              style={{
                background: open ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.06)",
                border: open ? "1px solid rgba(20,184,166,0.4)" : "1px solid rgba(255,255,255,0.1)",
                transition: "all 0.15s",
              }}>
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                {searching ? "⏳" : "🔍"}
              </span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSearchAll(); }}
                onFocus={() => { if (results.length > 0) setOpen(true); }}
                placeholder="Caută... (Ctrl+K)"
                className="outline-none bg-transparent text-xs w-36 sm:w-48"
                style={{ color: "#ffffff" }}
              />
              {query && (
                <button onClick={() => { setQuery(""); setResults([]); setOpen(false); }}
                  className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>✕</button>
              )}
            </div>

            {/* Dropdown rezultate */}
            {open && (
              <div className="absolute right-0 top-full mt-1 w-80 rounded-2xl overflow-hidden z-50"
                style={{
                  background: "rgba(15,23,42,0.98)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
                }}>
                {results.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Nicio tranzacție găsită
                  </div>
                ) : (
                  <>
                    {results.map((r, i) => (
                      <button key={r.id} onClick={() => handleSelect(r.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-white/5"
                        style={{ borderBottom: i < results.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                          style={{ background: (r.categoryColor || "#6366f1") + "22" }}>
                          {r.categoryIcon || "💳"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate" style={{ color: "#ffffff" }}>{r.description}</p>
                          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                            {new Date(r.date).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric" })}
                            {r.categoryName && <span style={{ color: r.categoryColor || "#6366f1" }}> · {r.categoryName}</span>}
                          </p>
                        </div>
                        <span className="text-xs font-bold shrink-0"
                          style={{ color: r.amount >= 0 ? "#2dd4bf" : "#f87171" }}>
                          {formatAmount(r.amount, r.currency)}
                        </span>
                      </button>
                    ))}
                    <button onClick={handleSearchAll}
                      className="w-full px-4 py-3 text-xs font-bold text-center transition-all hover:bg-white/5"
                      style={{ color: "#2dd4bf", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      Vezi toate rezultatele pentru "{query}" →
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
}
