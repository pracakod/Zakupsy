"use client";

import React from 'react';

export default function ShoppingListLoading() {
  return (
    <div className="min-h-dvh flex flex-col w-full animate-fade-in" style={{ background: "var(--color-surface)" }}>
      {/* Header Skeleton */}
      <header className="px-5 pt-10 pb-6 border-b border-border/10">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-full bg-surface-3 animate-pulse" />
          <div className="w-10 h-10 rounded-full bg-surface-3 animate-pulse" />
        </div>
        <div className="space-y-3">
          <div className="h-8 w-2/3 bg-surface-3 rounded-xl animate-pulse" />
          <div className="h-3 w-1/3 bg-surface-3 rounded-full animate-pulse opacity-40" />
        </div>
      </header>

      {/* Progress Skeleton */}
      <div className="px-5 py-4">
        <div className="h-6 w-full rounded-2xl bg-surface-2 animate-pulse" />
      </div>

      {/* List Items Skeleton */}
      <main className="flex-1 px-5 pt-4">
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-surface-2 border border-border/30 animate-pulse flex items-center px-4 gap-4">
              <div className="w-6 h-6 rounded-lg bg-surface-3 border border-white/5" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-3/4 bg-surface-3 rounded-full" />
                <div className="h-2 w-1/4 bg-surface-3 rounded-full opacity-50" />
              </div>
              <div className="w-6 h-6 rounded-full bg-surface-3 opacity-20" />
            </div>
          ))}
        </div>
      </main>

      {/* Input Field Skeleton */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-2xl px-5 py-6 bg-surface-1/80 backdrop-blur-md border-t border-border/20">
        <div className="h-14 w-full rounded-[2rem] bg-surface-2 animate-pulse" />
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
