import { ArrowLeft, Shield } from "lucide-react";
import Link from "next/link";

export default function PolitykaPrywatnosciPage() {
  return (
    <div className="min-h-dvh flex flex-col items-center py-12 px-6 relative" style={{ background: "var(--color-surface)", color: "var(--color-text-primary)" }}>
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-full h-96 bg-blue-500/5 blur-[100px] pointer-events-none" />
      
      <div className="w-full max-w-3xl relative z-10">
        <Link 
          href="/auth" 
          className="inline-flex items-center gap-2 mb-8 text-sm font-bold uppercase tracking-widest text-text-muted hover:text-brand-500 transition-colors"
        >
          <ArrowLeft size={16} /> Powrót
        </Link>
        
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
            <Shield size={24} />
          </div>
          <h1 className="text-4xl font-black tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Polityka Prywatności
          </h1>
        </div>
        
        <article className="prose prose-invert max-w-none space-y-6">
          <section className="p-6 rounded-2xl bg-surface-2 border border-border border-l-4 border-l-blue-500 mb-6">
            <h2 className="text-xl font-bold mb-4">1. Administrator Danych</h2>
            <p className="text-sm leading-relaxed text-text-secondary">
              Administratorem Twoich danych osobowych jest zespół Zakupsy. Dbamy o Twoją prywatność i stosujemy najnowsze standardy bezpieczeństwa (Supabase RLS).
            </p>
          </section>

          <section className="p-6 rounded-2xl bg-surface-2 border border-border mb-6">
            <h2 className="text-xl font-bold mb-4">2. Jakie dane zbieramy?</h2>
            <ul className="list-disc list-inside text-sm leading-relaxed text-text-secondary space-y-2">
              <li>Adres e-mail (służący do logowania)</li>
              <li>Podstawowe informacje z Twojego profilu (np. nazwa użytkownika, avatar)</li>
              <li>Treści Twoich list zakupów, kart, wiadomości (chronione przed innymi użytkownikami regułami RLS)</li>
            </ul>
          </section>

          <section className="p-6 rounded-2xl bg-surface-2 border border-border mb-6">
            <h2 className="text-xl font-bold mb-4">3. W jakim celu?</h2>
            <p className="text-sm leading-relaxed text-text-secondary mb-2">
              Przetwarzamy Twoje dane wyłącznie w celu udostępnienia działania aplikacji, w tym udostępniania na Twoją prośbę list lub wysyłania wiadomości w obrębie społeczności Zakupsy.
            </p>
          </section>
          
          <section className="p-6 rounded-2xl bg-surface-2 border border-border mb-6">
            <h2 className="text-xl font-bold mb-4">4. Twoje prawa</h2>
            <p className="text-sm leading-relaxed text-text-secondary mb-2">
              Masz pełne prawo do wglądu w swoje dane, ich edycji, a także całkowitego usunięcia konta oraz wszystkich wygenerowanych przez siebie treści.
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
