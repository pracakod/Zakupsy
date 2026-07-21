import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function RegulaminPage() {
  return (
    <div className="min-h-dvh flex flex-col items-center py-12 px-6 relative" style={{ background: "var(--color-surface)", color: "var(--color-text-primary)" }}>
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-96 bg-brand-500/5 blur-[100px] pointer-events-none" />
      
      <div className="w-full max-w-3xl relative z-10">
        <Link 
          href="/auth" 
          className="inline-flex items-center gap-2 mb-8 text-sm font-bold uppercase tracking-widest text-text-muted hover:text-brand-500 transition-colors"
        >
          <ArrowLeft size={16} /> Powrót
        </Link>
        
        <h1 className="text-4xl font-black mb-8 tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Regulamin <span className="text-gradient">Zakupsy</span>
        </h1>
        
        <article className="prose prose-invert max-w-none prose-p:text-text-secondary prose-headings:text-text-primary prose-a:text-brand-500 space-y-6">
          <section className="p-6 rounded-2xl bg-surface-2 border border-border mb-6">
            <h2 className="text-xl font-bold mb-4">1. Postanowienia ogólne</h2>
            <p className="text-sm leading-relaxed text-text-secondary mb-2">
              1.1. Niniejszy regulamin określa zasady korzystania z aplikacji Zakupsy, dostępnej jako aplikacja webowa.
            </p>
            <p className="text-sm leading-relaxed text-text-secondary">
              1.2. Użytkowanie aplikacji oznacza akceptację niniejszego regulaminu.
            </p>
          </section>

          <section className="p-6 rounded-2xl bg-surface-2 border border-border mb-6">
            <h2 className="text-xl font-bold mb-4">2. Świadczone usługi</h2>
            <p className="text-sm leading-relaxed text-text-secondary mb-2">
              2.1. Aplikacja Zakupsy umożliwia tworzenie, edytowanie i udostępnianie list zakupowych w czasie rzeczywistym.
            </p>
            <p className="text-sm leading-relaxed text-text-secondary">
              2.2. Aplikacja udostępnia również moduły komunikatora, zarządzania kartami lojalnościowymi oraz przechowywania przepisów kulinarnych.
            </p>
          </section>

          <section className="p-6 rounded-2xl bg-surface-2 border border-border mb-6">
            <h2 className="text-xl font-bold mb-4">3. Prawa i obowiązki użytkownika</h2>
            <p className="text-sm leading-relaxed text-text-secondary mb-2">
              3.1. Użytkownik zobowiązany jest do korzystania z aplikacji zgodnie z jej przeznaczeniem oraz obowiązującym prawem.
            </p>
            <p className="text-sm leading-relaxed text-text-secondary">
              3.2. Zabrania się przesyłania w aplikacji treści o charakterze obraźliwym, niezgodnym z prawem lub łamiącym prawa własności intelektualnej.
            </p>
          </section>

          <p className="text-xs text-text-muted mt-12 text-center">
            Ostatnia aktualizacja: 19.04.2026
          </p>
        </article>
      </div>
    </div>
  );
}
