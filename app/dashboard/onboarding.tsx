"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/logo";

interface OnboardingProps {
  hasBanks: boolean;
  hasTransactions: boolean;
  userName: string;
}

const STEPS = [
  {
    id: "welcome",
    icon: "👋",
    title: "Bun venit în Vibe Budget!",
    description: "Îți configurăm contul în 3 pași simpli. Durează mai puțin de 2 minute.",
  },
  {
    id: "bank",
    icon: "🏦",
    title: "Adaugă prima bancă",
    description: "Adaugă banca de la care vei importa extrasele bancare. Poți adăuga oricâte bănci vrei mai târziu.",
  },
  {
    id: "import",
    icon: "📤",
    title: "Importă extrasul bancar",
    description: "Descarcă extrasul de cont din aplicația băncii (CSV sau Excel) și importă-l aici. Tranzacțiile vor fi categorizate automat.",
  },
  {
    id: "done",
    icon: "🎉",
    title: "Totul e pregătit!",
    description: "Ai finalizat configurarea. Acum poți vedea statistici, seta bugete și urmări obiective de economisire.",
  },
];

export default function Onboarding({ hasBanks, hasTransactions, userName }: OnboardingProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Arată onboarding-ul doar dacă nu a fost văzut și user-ul nu are date
    const seen = localStorage.getItem("onboarding_done");
    if (!seen && !hasBanks && !hasTransactions) {
      setVisible(true);
    }
  }, [hasBanks, hasTransactions]);

  const dismiss = () => {
    localStorage.setItem("onboarding_done", "1");
    setVisible(false);
  };

  const goToStep = (n: number) => setStep(n);

  const handleAction = () => {
    if (step === 0) { goToStep(1); return; }
    if (step === 1) { dismiss(); router.push("/dashboard/banks"); return; }
    if (step === 2) { dismiss(); router.push("/dashboard/upload"); return; }
    if (step === 3) { dismiss(); return; }
  };

  const actionLabel = () => {
    if (step === 0) return "Hai să începem →";
    if (step === 1) return "Adaugă bancă →";
    if (step === 2) return "Importă extras →";
    return "Mergi la Dashboard";
  };

  if (!visible) return null;

  const current = STEPS[step];
  const progressPct = (step / (STEPS.length - 1)) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}>
      <div className="w-full max-w-md rounded-3xl overflow-hidden"
        style={{
          background: "rgba(15,23,42,0.98)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 30px 60px rgba(0,0,0,0.6)",
        }}>

        {/* Progress bar */}
        <div className="h-1" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div className="h-1 transition-all duration-500"
            style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, #14b8a6, #f97316)" }} />
        </div>

        <div className="p-8">
          {/* Logo + skip */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <Logo size={28} />
              <span className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.6)" }}>Vibe Budget</span>
            </div>
            <button onClick={dismiss}
              className="text-xs px-3 py-1.5 rounded-lg font-bold"
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)" }}>
              Sari peste
            </button>
          </div>

          {/* Conținut pas */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-5">{current.icon}</div>
            <h2 className="text-xl font-bold mb-3" style={{ color: "#ffffff" }}>
              {step === 0 ? `Bună, ${userName}! 👋` : current.title}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
              {current.description}
            </p>
          </div>

          {/* Steps indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {STEPS.map((_, i) => (
              <button key={i} onClick={() => i < step && goToStep(i)}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === step ? "24px" : "8px",
                  height: "8px",
                  background: i === step
                    ? "linear-gradient(90deg, #14b8a6, #f97316)"
                    : i < step
                    ? "rgba(20,184,166,0.5)"
                    : "rgba(255,255,255,0.15)",
                  cursor: i < step ? "pointer" : "default",
                }} />
            ))}
          </div>

          {/* Lista pași (pas 0) */}
          {step === 0 && (
            <div className="flex flex-col gap-3 mb-6">
              {[
                { icon: "🏦", label: "Adaugă banca ta" },
                { icon: "📤", label: "Importă extrasul bancar" },
                { icon: "📊", label: "Analizează cheltuielile" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl px-4 py-3"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.75)" }}>{item.label}</span>
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-lg font-bold"
                    style={{ background: "rgba(20,184,166,0.15)", color: "#2dd4bf" }}>
                    Pas {i + 1}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Tips pentru fiecare pas */}
          {step === 1 && (
            <div className="rounded-xl px-4 py-3 mb-6 text-sm"
              style={{ background: "rgba(20,184,166,0.08)", border: "1px solid rgba(20,184,166,0.2)", color: "rgba(255,255,255,0.6)" }}>
              💡 Poți adăuga ING, BCR, BT, Raiffeisen, Revolut sau orice altă bancă. Numele e doar pentru tine.
            </div>
          )}
          {step === 2 && (
            <div className="rounded-xl px-4 py-3 mb-6 text-sm"
              style={{ background: "rgba(20,184,166,0.08)", border: "1px solid rgba(20,184,166,0.2)", color: "rgba(255,255,255,0.6)" }}>
              💡 Descarcă extrasul ca fișier Excel sau CSV din aplicația băncii. Selectează formatul băncii tale în pagina de import.
            </div>
          )}
          {step === 3 && (
            <div className="flex flex-col gap-3 mb-6">
              {[
                { icon: "💰", label: "Setează bugete pe categorie", href: "/dashboard/budgets" },
                { icon: "🎯", label: "Adaugă obiective de economisire", href: "/dashboard/goals" },
                { icon: "📊", label: "Vezi rapoarte și analize AI", href: "/dashboard/reports" },
              ].map((item, i) => (
                <button key={i} onClick={() => { dismiss(); router.push(item.href); }}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all hover:bg-white/5"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.75)" }}>{item.label}</span>
                  <span className="ml-auto text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>→</span>
                </button>
              ))}
            </div>
          )}

          {/* Buton acțiune */}
          <button onClick={handleAction}
            className="w-full py-4 rounded-2xl text-sm font-bold transition-all"
            style={{
              background: "linear-gradient(135deg, #14b8a6, #f97316)",
              color: "#ffffff",
              boxShadow: "0 4px 20px rgba(20,184,166,0.35)",
            }}>
            {actionLabel()}
          </button>

          {/* Navigare înapoi */}
          {step > 0 && step < STEPS.length - 1 && (
            <button onClick={() => goToStep(step - 1)}
              className="w-full mt-3 py-2 text-xs font-bold"
              style={{ color: "rgba(255,255,255,0.3)" }}>
              ← Înapoi
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
