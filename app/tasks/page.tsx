"use client";

import { ArrowLeft, CheckSquare, Plus, ShoppingBag } from "lucide-react";
import Link from "next/link";

export default function TasksPage() {
  return (
    <div className="flex-1 pb-48 animate-fade-in px-6 pt-12">
      <header className="mb-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/home" className="p-2 -ml-2 text-muted hover:text-white transition-colors cursor-pointer">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Zadania
          </h1>
        </div>
      </header>

      <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
        <div className="w-20 h-20 rounded-3xl bg-surface-3 flex items-center justify-center mb-6">
          <CheckSquare size={32} />
        </div>
        <h2 className="text-xl font-bold mb-2">Moduł w przygotowaniu</h2>
        <p className="text-sm max-w-[200px]">Już wkrótce będziesz mógł tutaj zarządzać swoimi zadaniami domowymi!</p>
      </div>

      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-2xl px-5">
        <button className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-sm text-white gradient-brand opacity-50 cursor-not-allowed">
          <Plus size={20} />
          Dodaj zadanie (Wkrótce)
        </button>
      </div>
    </div>
  );
}
