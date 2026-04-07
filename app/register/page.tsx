"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Eroare la înregistrare");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Eroare de rețea. Încearcă din nou.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0f172a 0%, #1a1f2e 50%, #0f172a 100%)" }}>

      {/* Blob portocaliu */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 rounded-full blur-3xl opacity-25 pointer-events-none"
        style={{ background: "radial-gradient(circle, #f97316, transparent)" }} />

      {/* Blob teal */}
      <div className="absolute bottom-[-10%] left-[-5%] w-80 h-80 rounded-full blur-3xl opacity-30 pointer-events-none"
        style={{ background: "radial-gradient(circle, #14b8a6, transparent)" }} />

      {/* Blob mic */}
      <div className="absolute top-[50%] right-[20%] w-48 h-48 rounded-full blur-2xl opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, #f97316, transparent)" }} />

      {/* Card glassmorphism */}
      <div className="relative z-10 w-full max-w-sm mx-4 rounded-2xl p-8"
        style={{
          background: "rgba(255,255,255,0.07)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 25px 50px rgba(0,0,0,0.4)",
        }}>

        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-5xl">💰</span>
          <h1 className="text-2xl font-bold mt-3" style={{ color: "#ffffff" }}>Vibe Budget</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.55)" }}>
            Creează-ți contul gratuit
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Nume */}
          <div>
            <label className="block text-sm font-bold mb-1" style={{ color: "#2dd4bf" }}>
              Nume
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Numele tău"
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#ffffff",
              }}
              onFocus={(e) => e.target.style.borderColor = "#14b8a6"}
              onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.15)"}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-bold mb-1" style={{ color: "#2dd4bf" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="email@exemplu.com"
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#ffffff",
              }}
              onFocus={(e) => e.target.style.borderColor = "#14b8a6"}
              onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.15)"}
            />
          </div>

          {/* Parolă */}
          <div>
            <label className="block text-sm font-bold mb-1" style={{ color: "#2dd4bf" }}>
              Parolă
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Minim 6 caractere"
              minLength={6}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#ffffff",
              }}
              onFocus={(e) => e.target.style.borderColor = "#14b8a6"}
              onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.15)"}
            />
          </div>

          {/* Eroare */}
          {error && (
            <div className="rounded-xl px-4 py-3 text-sm"
              style={{
                background: "rgba(239,68,68,0.15)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#fca5a5",
              }}>
              {error}
            </div>
          )}

          {/* Buton */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-sm transition-all mt-2"
            style={{
              background: loading
                ? "rgba(249,115,22,0.4)"
                : "linear-gradient(135deg, #f97316, #14b8a6)",
              color: "#ffffff",
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : "0 4px 20px rgba(249,115,22,0.3)",
            }}
          >
            {loading ? "Se creează contul..." : "Creează cont gratuit"}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: "rgba(255,255,255,0.5)" }}>
          Ai deja cont?{" "}
          <Link href="/login"
            className="font-bold transition-colors"
            style={{ color: "#2dd4bf" }}>
            Autentifică-te
          </Link>
        </p>
      </div>
    </div>
  );
}
