import Link from "next/link";

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
      <div className="fixed top-[40%] right-[20%] w-64 h-64 rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, #6366f1, transparent)" }} />

      {/* Nav */}
      <header className="relative z-10"
        style={{
          background: "rgba(15,23,42,0.6)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl"
              style={{ background: "linear-gradient(135deg, #14b8a6, #f97316)" }}>
              💰
            </div>
            <span className="text-lg font-bold" style={{ color: "#ffffff" }}>Vibe Budget</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login"
              className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
              style={{ color: "rgba(255,255,255,0.7)" }}>
              Autentifică-te
            </Link>
            <Link href="/register"
              className="px-4 py-2 rounded-xl text-sm font-bold"
              style={{
                background: "linear-gradient(135deg, #14b8a6, #f97316)",
                color: "#ffffff",
                boxShadow: "0 4px 15px rgba(20,184,166,0.3)",
              }}>
              Creează cont
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 container mx-auto px-6">
        <div className="flex flex-col items-center text-center pt-24 pb-16">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-sm font-bold"
            style={{
              background: "rgba(20,184,166,0.1)",
              border: "1px solid rgba(20,184,166,0.3)",
              color: "#2dd4bf",
            }}>
            ✨ Simplu. Inteligent. Al tău.
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
            style={{ color: "#ffffff" }}>
            Banii tăi.{" "}
            <span style={{
              background: "linear-gradient(135deg, #14b8a6, #f97316)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              Regulile tale.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl max-w-2xl mb-10 leading-relaxed"
            style={{ color: "rgba(255,255,255,0.55)" }}>
            Vibe Budget te ajută să înțelegi exact unde îți merg banii —
            fără foi de calcul, fără bătăi de cap. Importă extrasele bancare
            și în câteva secunde ai o imagine clară a finanțelor tale.
          </p>

          {/* CTA */}
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <Link href="/register"
              className="px-8 py-4 rounded-2xl text-base font-bold transition-all"
              style={{
                background: "linear-gradient(135deg, #14b8a6, #f97316)",
                color: "#ffffff",
                boxShadow: "0 8px 30px rgba(20,184,166,0.4)",
              }}>
              Începe gratuit →
            </Link>
            <Link href="/login"
              className="px-8 py-4 rounded-2xl text-base font-bold"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.8)",
              }}>
              Am deja cont
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-24">
          {[
            {
              icon: "📊",
              title: "Rapoarte vizuale",
              desc: "Grafice clare cu cheltuielile pe categorii și evoluția lunară a bugetului tău.",
            },
            {
              icon: "🏦",
              title: "Import bancar",
              desc: "Importă extrase de la Raiffeisen, ING, BCR sau orice altă bancă în câteva click-uri.",
            },
            {
              icon: "🤖",
              title: "AI Financial Coach",
              desc: "Primești sfaturi personalizate de la Claude AI bazate pe obiceiurile tale financiare.",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl p-6"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}>
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="text-base font-bold mb-2" style={{ color: "#ffffff" }}>{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
