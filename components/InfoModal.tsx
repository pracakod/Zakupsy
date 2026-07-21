"use client";

import { useState } from "react";
import { X, Shield, FileText, ArrowLeft } from "lucide-react";

interface InfoModalProps {
  type: "regulamin" | "polityka" | null;
  onClose: () => void;
}

export default function InfoModal({ type, onClose }: InfoModalProps) {
  if (!type) return null;

  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl max-h-[85vh] bg-surface-1 border border-white/10 rounded-[2.5rem] p-6 md:p-8 flex flex-col shadow-2xl animate-pop-in relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${type === 'polityka' ? 'bg-blue-500/10 text-blue-500' : 'bg-brand-500/10 text-brand-500'}`}>
              {type === 'polityka' ? <Shield size={20} /> : <FileText size={20} />}
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                {type === 'polityka' ? 'Polityka Prywatności' : 'Regulamin Aplikacji'}
              </h2>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Informacja wewnątrz aplikacji</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary active:scale-90 transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-6 space-y-6 pr-1 custom-scrollbar">
          {type === 'regulamin' ? (
            <>
              <section className="p-5 rounded-2xl bg-surface-2/60 border border-border/40 space-y-2">
                <h3 className="text-sm font-bold text-text-primary">1. Postanowienia ogólne</h3>
                <p className="text-xs leading-relaxed text-text-muted">
                  1.1. Niniejszy regulamin określa zasady korzystania z aplikacji Zakupsy, dostępnej jako aplikacja webowa PWA.
                </p>
                <p className="text-xs leading-relaxed text-text-muted">
                  1.2. Użytkowanie aplikacji oznacza akceptację niniejszego regulaminu.
                </p>
              </section>

              <section className="p-5 rounded-2xl bg-surface-2/60 border border-border/40 space-y-2">
                <h3 className="text-sm font-bold text-text-primary">2. Świadczone usługi</h3>
                <p className="text-xs leading-relaxed text-text-muted">
                  2.1. Aplikacja Zakupsy umożliwia tworzenie, edytowanie i udostępnianie list zakupowych w czasie rzeczywistym.
                </p>
                <p className="text-xs leading-relaxed text-text-muted">
                  2.2. Aplikacja udostępnia również moduły komunikatora, zarządzania kartami lojalnościowymi oraz przechowywania przepisów kulinarnych.
                </p>
              </section>

              <section className="p-5 rounded-2xl bg-surface-2/60 border border-border/40 space-y-2">
                <h3 className="text-sm font-bold text-text-primary">3. Prawa i obowiązki użytkownika</h3>
                <p className="text-xs leading-relaxed text-text-muted">
                  3.1. Użytkownik zobowiązany jest do korzystania z aplikacji zgodnie z jej przeznaczeniem oraz obowiązującym prawem.
                </p>
                <p className="text-xs leading-relaxed text-text-muted">
                  3.2. Zabrania się przesyłania w aplikacji treści o charakterze obraźliwym, niezgodnym z prawem lub łamiącym prawa własności intelektualnej.
                </p>
              </section>
            </>
          ) : (
            <>
              <section className="p-5 rounded-2xl bg-surface-2/60 border border-border/40 border-l-4 border-l-blue-500 space-y-2">
                <h3 className="text-sm font-bold text-text-primary">1. Administrator Danych</h3>
                <p className="text-xs leading-relaxed text-text-muted">
                  Administratorem Twoich danych osobowych jest zespół Zakupsy. Dbamy o Twoją prywatność i stosujemy najnowsze standardy bezpieczeństwa (Supabase RLS).
                </p>
              </section>

              <section className="p-5 rounded-2xl bg-surface-2/60 border border-border/40 space-y-2">
                <h3 className="text-sm font-bold text-text-primary">2. Jakie dane zbieramy?</h3>
                <ul className="list-disc list-inside text-xs leading-relaxed text-text-muted space-y-1">
                  <li>Adres e-mail (służący do logowania i identyfikacji)</li>
                  <li>Podstawowe informacje z Twojego profilu (np. nazwa użytkownika, avatar)</li>
                  <li>Treści Twoich list zakupów, kart i wiadomości (chronione przed innymi użytkownikami regułami RLS)</li>
                </ul>
              </section>

              <section className="p-5 rounded-2xl bg-surface-2/60 border border-border/40 space-y-2">
                <h3 className="text-sm font-bold text-text-primary">3. W jakim celu?</h3>
                <p className="text-xs leading-relaxed text-text-muted">
                  Przetwarzamy Twoje dane wyłącznie w celu udostępnienia działania aplikacji, w tym udostępniania na Twoją prośbę list lub wysyłania wiadomości w obrębie społeczności Zakupsy.
                </p>
              </section>

              <section className="p-5 rounded-2xl bg-surface-2/60 border border-border/40 space-y-2">
                <h3 className="text-sm font-bold text-text-primary">4. Twoje prawa</h3>
                <p className="text-xs leading-relaxed text-text-muted">
                  Masz pełne prawo do wglądu w swoje dane, ich edycji, a także całkowitego usunięcia konta oraz wszystkich wygenerowanych przez siebie treści.
                </p>
              </section>
            </>
          )}

          <div className="pt-2 text-center">
            <p className="text-[10px] text-text-muted opacity-60">Ostatnia aktualizacja: 2026 r.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-border/40 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl bg-brand-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-brand-500/20 active:scale-95 transition-all"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
}
