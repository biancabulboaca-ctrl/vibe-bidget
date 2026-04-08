import Link from "next/link";
import Logo from "@/components/logo";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <div className="min-h-screen relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0f172a 0%, #1a1f2e 50%, #0f172a 100%)" }}>

      {/* Background glows */}
      <div className="fixed top-[-15%] left-[-10%] w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, #14b8a6, transparent)" }} />
      <div className="fixed bottom-[-10%] right-[-5%] w-80 h-80 rounded-full blur-3xl opacity-15 pointer-events-none"
        style={{ background: "radial-gradient(circle, #f97316, transparent)" }} />

      {/* Nav */}
      <header className="relative z-10"
        style={{
          background: "rgba(15,23,42,0.6)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size={32} />
            <span className="text-base font-bold" style={{ color: "#ffffff" }}>Vibe Budget</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login"
              className="px-3 py-2 rounded-xl text-sm font-bold"
              style={{ color: "rgba(255,255,255,0.7)" }}>
              Intră
            </Link>
            <Link href="/register"
              className="px-3 py-2 rounded-xl text-sm font-bold"
              style={{
                background: "linear-gradient(135deg, #14b8a6, #f97316)",
                color: "#ffffff",
              }}>
              Cont nou
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4">

        {/* Hero */}
        <div className="flex flex-col items-center text-center pt-16 pb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 text-sm font-bold"
            style={{
              background: "rgba(20,184,166,0.1)",
              border: "1px solid rgba(20,184,166,0.3)",
              color: "#2dd4bf",
            }}>
            ✨ Simplu. Inteligent. Al tău.
          </div>

          <h1 className="text-4xl md:text-7xl font-bold mb-5 leading-tight"
            style={{ color: "#ffffff" }}>
            Banii tăi.{" "}
            <br className="md:hidden" />
            <span style={{
              background: "linear-gradient(135deg, #14b8a6, #f97316)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              Regulile tale.
            </span>
          </h1>

          <p className="text-base md:text-xl max-w-2xl mb-8 leading-relaxed px-2"
            style={{ color: "rgba(255,255,255,0.55)" }}>
            Vibe Budget îți oferă o imagine completă a finanțelor personale —
            fără formule complicate, fără foi de calcul. Importi extrasul bancar,
            categorizezi automat și în câteva secunde știi exact unde îți merg banii.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <Link href="/register"
              className="w-full sm:w-auto text-center px-8 py-4 rounded-2xl text-base font-bold"
              style={{
                background: "linear-gradient(135deg, #14b8a6, #f97316)",
                color: "#ffffff",
                boxShadow: "0 8px 30px rgba(20,184,166,0.4)",
              }}>
              Începe gratuit →
            </Link>
            <Link href="/login"
              className="w-full sm:w-auto text-center px-8 py-4 rounded-2xl text-base font-bold"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.8)",
              }}>
              Am deja cont
            </Link>
          </div>
        </div>

        {/* Features grid */}
        <div className="mb-8">
          <p className="text-center text-xs font-bold uppercase mb-8"
            style={{ color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>
            Tot ce ai nevoie într-un singur loc
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            {[
              {
                icon: "🏦",
                title: "Multi-bancă",
                desc: "Adaugă toate conturile tale — Raiffeisen, ING, BCR, Revolut — și urmărește toate tranzacțiile dintr-un singur dashboard.",
              },
              {
                icon: "📊",
                title: "Dashboard financiar",
                desc: "Vizualizează soldul total, veniturile și cheltuielile lunare printr-o singură privire. Grafice clare, date reale.",
              },
              {
                icon: "🗂️",
                title: "Categorii personalizate",
                desc: "Organizează cheltuielile în categorii create de tine și descoperă unde poți face economii.",
              },
              {
                icon: "💱",
                title: "Multi-valută",
                desc: "Suport complet pentru RON, EUR, USD, GBP și orice altă valută. Tranzacțiile în valută afișate corect.",
              },
              {
                icon: "📥",
                title: "Import extrase bancare",
                desc: "Importă extrasele în format CSV sau Excel direct din aplicația băncii. Deduplicare automată inclusă.",
              },
              {
                icon: "🤖",
                title: "AI Financial Coach",
                desc: "Scor de sănătate financiară și sfaturi concrete de la Claude AI, bazate pe obiceiurile tale reale.",
              },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl p-5"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}>
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="text-sm font-bold mb-1" style={{ color: "#ffffff" }}>{f.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA bottom */}
        <div className="rounded-3xl p-8 md:p-12 mb-16 text-center"
          style={{
            background: "rgba(20,184,166,0.06)",
            border: "1px solid rgba(20,184,166,0.15)",
          }}>
          <h2 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: "#ffffff" }}>
            Gata să îți înțelegi banii?
          </h2>
          <p className="text-sm md:text-base mb-8 max-w-md mx-auto"
            style={{ color: "rgba(255,255,255,0.5)" }}>
            Creează un cont gratuit, importă primul extras bancar și ai rapoartele gata în mai puțin de 2 minute.
          </p>
          <Link href="/register"
            className="inline-block w-full sm:w-auto px-10 py-4 rounded-2xl text-base font-bold"
            style={{
              background: "linear-gradient(135deg, #14b8a6, #f97316)",
              color: "#ffffff",
              boxShadow: "0 8px 30px rgba(20,184,166,0.35)",
            }}>
            Creează cont gratuit →
          </Link>
        </div>
      </main>
    </div>
  );
}
